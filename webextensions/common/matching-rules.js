/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Constants from './constants.js';
import * as RecipientParser from './recipient-parser.js';

const BASE_RULE = {
  id:             '', // arbitrary unique string (auto generated)
  name:           '', // arbitrary visible name in the UI
  enabled:        true, // true (enabled) or false (disabled),
  matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN, // | Constants.MATCH_TO_ATTACHMENT_NAME | Constants.MATCH_TO_ATTACHMENT_SUFFIX
  highlight:      Constants.HIGHLIGHT_NEVER, // | Constants.HIGHLIGHT_ALWAYS | Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS
  action:         Constants.ACTION_NONE, // | Constants.ACTION_RECONFIRM_ALWAYS | Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS | Constants.ACTION_BLOCK
  itemsSource:    Constants.SOURCE_LOCAL_CONFIG, // | Constants.SOURCE_FILE
  itemsLocal:     [], // array of strings
  itemsFile:      '', // path to a text file: UTF-8, LF separated
  confirmTitle:   '', // string
  confirmMessage: '', // string
};

export class MatchingRules {
  constructor({ base, baseRules, user, userRules, override, overrideRules } = {}) {
    this.$baseRules     = base     || baseRules     || [];
    this.$userRules     = user     || userRules     || [];
    this.$overrideRules = override || overrideRules || [];
    this.$load();
  }

  $load() {
    const mergedRules     = [];
    const mergedRulesById = {};
    for (const rules of [this.$baseRules, this.$userRules, this.$overrideRules]) {
      const locked = rules === this.$overrideRules;
      for (const rule of rules) {
        const id = rule.id;
        if (!id)
          continue;
        let merged = mergedRulesById[id];
        if (!merged) {
          merged = mergedRulesById[id] = {
            ...JSON.parse(JSON.stringify(BASE_RULE)),
            id,
            $lockedKeys: [],
          };
          mergedRules.push(merged);
        }
        Object.assign(merged, rule);
        if (locked) {
          merged.$lockedKeys.push(...Object.keys(rule).filter(key => key != 'id'));
        }
      }
    }
    this.$rules     = mergedRules;
    this.$rulesById = mergedRulesById;
  }

  get $matchedDomainSets() {
    if (!this._$matchedDomainSets)
      this.$prepareMatchers();
    return this._$matchedDomainSets;
  }

  get $attachmentMatchers() {
    if (!this._$attachmentMatchers)
      this.$prepareMatchers();
    return this._$attachmentMatchers;
  }

  $prepareMatchers() {
    this._$matchedDomainSets = {};
    this._$attachmentMatchers = {};
    for (const rule of this.$rules) {
      switch (rule.matchTarget) {
        case Constants.MATCH_TO_RECIPIENT_DOMAIN:
          this._$matchedDomainSets[rule.id] = new Set((rule.items || []).map(domain => domain.toLowerCase().replace(/^@/, '')));
          break;

        case Constants.MATCH_TO_ATTACHMENT_NAME:
          this._$attachmentMatchers[rule.id] = new RegExp(`(${rule.items.join('|')})`, 'i');
          break;

        case Constants.MATCH_TO_ATTACHMENT_SUFFIX:
          this._$attachmentMatchers[rule.id] = new RegExp(`\\.(${rule.items.map(suffix => suffix.replace(/^\./, '')).join('|')})$`, 'i');
          break;

        default:
          break;
      }
    }
  }

  get all() {
    return this.$rules.slice(0);
  }

  get(id) {
    return this.$rulesById[id];
  }

  add(params = {}) {
    const rule = {
      id: `rule-${Date.now()}-${parseInt(Math.random() * 56632)}`,
      ...JSON.parse(JSON.stringify(BASE_RULE)),
      ...params,
      enabled: true,
      $lockedKeys: [],
    };
    this.$rules.push(rule);
    this.$rulesById[rule.id] = rule;

    return rule;
  }

  remove(id) {
    delete this.$rulesById[id];
    const index = this.$rules.findIndex(rule => rule.id == id);
    if (index > -1)
      this.$rules.splice(index, 1);
  }

  moveUp(id) {
    const index = this.$rules.findIndex(rule => rule.id == id);
    if (index == 0)
      return;
    const toBeMoved = this.$rules.splice(index, 1);
    this.$rules.splice(index - 1, 0, ...toBeMoved);
  }

  moveDown(id) {
    const index = this.$rules.findIndex(rule => rule.id == id);
    if (index == this.$rules.length - 1)
      return;
    const toBeMoved = this.$rules.splice(index, 1);
    this.$rules.splice(index + 1, 0, ...toBeMoved);
  }

  async populate(fileReader) {
    if (this.$populated)
      return;

    await Promise.all(this.all.map(async rule => {
      let items = [];
      switch (rule.itemsSource) {
        default:
        case Constants.SOURCE_LOCAL_CONFIG:
          items = rule.itemsLocal || [];
          break;

        case Constants.SOURCE_FILE: {
          if (!rule.itemsFile) {
            items = [];
          }
          else {
            const contents = fileReader(rule.itemsFile);
            items = contents ? contents.trim().split(/[\s,|]+/).filter(part => !!part) : [];
          }
          break;
        };
      }
      this.$rulesById[rule.id].items = items;
    }));

    this.$populated = true;
  }

  exportUserRules() {
    const baseRulesById = {};
    for (const rule of this.$baseRules) {
      baseRulesById[rule.id] = rule;
    }

    const toBeSavedRules = [];
    const toBeSavedRulesById = {};
    for (const rule of this.all) {
      const toBeSaved = toBeSavedRulesById[rule.id] = {};
      Object.assign(toBeSaved, rule);
      delete toBeSaved.$lockedKeys;

      const baseRule = baseRulesById[rule.id];
      if (baseRule) {
        for (const [key, value] of Object.entries(baseRule)) {
          if (key == 'id')
            continue;
          if (JSON.stringify(toBeSaved[key]) == JSON.stringify(value))
            delete toBeSaved[key];
        }
      }

      if (Object.keys(toBeSaved).length > 1)
        toBeSavedRules.push(toBeSaved);
    }

    return toBeSavedRules;
  }

  $classifyRecipients(recipients, filter) {
    const classified = {};
    for (const recipient of recipients) {
      const parsedRecipient = typeof recipient == 'string' ? RecipientParser.parse(recipient) : recipient;

      for (const [id, domains] of Object.entries(this.$matchedDomainSets)) {
        if (!domains.has(parsedRecipient.domain))
          continue;

        const rule = this.get(id);
        if (!filter(rule))
          continue;

        const classifiedRecipients = classified[id] || new Set();
        classifiedRecipients.add(parsedRecipient);
        classified[id] = classifiedRecipients;
      }
    }
    return Object.fromEntries(
      Object.entries(classified)
        .map(([id, recipients]) => [id, Array.from(recipients)])
    );
  }

  getHighlightedRecipientAddresses(recipients, attachments = []) {
    const classified = this.$classifyRecipients(
      recipients,
      rule => (
        rule.highlight == Constants.HIGHLIGHT_ALWAYS ||
        (rule.highlight == Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS &&
         attachments.length > 0)
      )
    );
    return new Set(Object.entries(classified).map(([_ruleId, recipients]) => recipients.map(recipient => recipient.address)).flat());
  }

  classifyReconfirmRecipients(recipients, attachments = []) {
    return this.$classifyRecipients(
      recipients,
      rule => (
        rule.action == Constants.ACTION_RECONFIRM_ALWAYS ||
        (rule.action == Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS &&
         attachments.length > 0)
      )
    );
  }

  classifyBlockRecipients(recipients, attachments = []) {
    return this.$classifyRecipients(
      recipients,
      rule => (
        rule.action == Constants.ACTION_BLOCK_ALWAYS ||
        (rule.action == Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS &&
         attachments.length > 0)
      )
    );
  }

  $classifyAttachments(attachments, filter) {
    const classified = {};
    for (const attachment of attachments) {
      for (const [id, matcher] of Object.entries(this.$attachmentMatchers)) {
        if (!matcher.test(attachment.name))
          continue;

        const rule = this.get(id);
        if (!filter(rule))
          continue;

        const classifiedAttachments = classified[id] || new Set();
        classifiedAttachments.add(attachment);
        classified[id] = classifiedAttachments;
      }
    }
    return Object.fromEntries(
      Object.entries(classified)
        .map(([id, attachments]) => [id, Array.from(attachments)])
    );
  }

  getHighlightedAttachmentNames(attachments) {
    const classified = this.$classifyAttachments(
      attachments,
      rule => (
        rule.highlight == Constants.HIGHLIGHT_ALWAYS ||
        (rule.highlight == Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS &&
         attachments.length > 0)
      )
    );
    return new Set(Object.entries(classified).map(([_ruleId, attachments]) => attachments.map(attachment => attachment.name)).flat());
  }

  classifyReconfirmAttachments(attachments) {
    return this.$classifyAttachments(
      attachments,
      rule => (
        rule.action == Constants.ACTION_RECONFIRM_ALWAYS ||
        (rule.action == Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS &&
         attachments.length > 0)
      )
    );
  }

  classifyBlockAttachments(attachments) {
    return this.$classifyAttachments(
      attachments,
      rule => (
        rule.action == Constants.ACTION_BLOCK_ALWAYS ||
        (rule.action == Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS &&
         attachments.length > 0)
      )
    );
  }

  async tryReconfirm({ recipients, attachments, confirm }) {
    for (const [ruleId, classifiedRecipients] of Object.entries(this.classifyReconfirmRecipients(recipients, attachments))) {
      const rule = this.get(ruleId);
      if (!rule ||
          classifiedRecipients.length == 0)
        continue;

      let confirmed;
      try {
        confirmed = await confirm({
          title:      rule.confirmTitle,
          message:    rule.confirmMessage.replace(/[\%\$]s/i, classifiedRecipients.map(recipient => recipient.address).join('\n')),
          recipients: classifiedRecipients,
        });
      }
      catch(error) {
        console.error(error);
        confirmed = false;
      }
      if (!confirmed)
        return false;
    }

    for (const [ruleId, classifiedAttachments] of Object.entries(this.classifyReconfirmAttachments(attachments))) {
      const rule = this.get(ruleId);
      if (!rule ||
          classifiedAttachments.length == 0)
        continue;

      let confirmed;
      try {
        confirmed = await confirm({
          title:       rule.confirmTitle,
          message:     rule.confirmMessage.replace(/[\%\$]s/i, classifiedAttachments.map(attachment => attachment.name).join('\n')),
          attachments: classifiedAttachments,
        });
      }
      catch(error) {
        console.error(error);
        confirmed = false;
      }
      if (!confirmed)
        return false;
    }

    return false;
  }

  async tryBlock({ recipients, attachments, alert }) {
    for (const [ruleId, classifiedRecipients] of Object.entries(this.classifyBlockRecipients(recipients, attachments))) {
      const rule = this.get(ruleId);
      if (!rule ||
          classifiedRecipients.length == 0)
        continue;

      try {
        await alert({
          title:      rule.confirmTitle,
          message:    rule.confirmMessage.replace(/[\%\$]s/i, classifiedRecipients.map(recipient => recipient.address).join('\n')),
          recipients: classifiedRecipients,
        });
      }
      catch(error) {
        console.error(error);
      }
      return true;
    }

    for (const [ruleId, classifiedAttachments] of Object.entries(this.classifyBlockAttachments(attachments))) {
      const rule = this.get(ruleId);
      if (!rule ||
          classifiedAttachments.length == 0)
        continue;

      try {
        await alert({
          title:       rule.confirmTitle,
          message:     rule.confirmMessage.replace(/[\%\$]s/i, classifiedAttachments.map(attachment => attachment.name).join('\n')),
          attachments: classifiedAttachments,
        });
      }
      catch(error) {
        console.error(error);
      }
      return true;
    }

    return false;
  }
}
