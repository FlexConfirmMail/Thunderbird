/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Constants from './constants.js';
import * as RecipientParser from './recipient-parser.js';

function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

const BASE_RULE = {
  id:             '', // arbitrary unique string (auto generated)
  name:           '', // arbitrary visible name in the UI
  enabled:        true, // true (enabled) or false (disabled),
  matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
  highlight:      Constants.HIGHLIGHT_NEVER,
  action:         Constants.ACTION_NONE,
  itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
  itemsLocal:     [], // array of strings
  itemsFile:      '', // path to a text file: UTF-8, LF separated
  confirmTitle:   '', // string
  confirmMessage: '', // string
};

export class MatchingRules {
  constructor({ base, baseRules, overrideBase, overrideBaseRules, user, userRules, override, overrideRules } = {}) {
    this.$baseRules     = clone(base     || baseRules     || []);
    this.$overrideBaseRules = clone(overrideBase || overrideBaseRules || []);
    this.$mergedBaseRulesById = {};
    this.$userRules     = clone(user     || userRules     || []);
    this.$overrideRules = clone(override || overrideRules || []);
    this.$load();
  }

  $load() {
    const mergedRules     = [];
    const mergedRulesById = {};
    for (const rules of [this.$baseRules, this.$overrideBaseRules, this.$userRules, this.$overrideRules]) {
      const locked = rules === this.$overrideRules;
      for (const rule of rules) {
        const id = rule.id;
        if (!id)
          continue;
        let merged = mergedRulesById[id];
        if (!merged) {
          merged = mergedRulesById[id] = {
            ...clone(BASE_RULE),
            id,
            $lockedKeys: [],
          };
          mergedRules.push(merged);
        }
        Object.assign(merged, clone(rule));
        if (rules === this.$baseRules ||
            rules === this.$overrideBaseRules)
          this.$mergedBaseRulesById[id] = clone(merged);
        if (locked) {
          merged.$lockedKeys.push(...Object.keys(rule).filter(key => key != 'id'));
        }
      }
    }
    this.$rules     = mergedRules;
    this.$rulesById = mergedRulesById;
  }

  get $addressMatchers() {
    if (!this._$addressMatchers)
      this.$prepareMatchers();
    return this._$addressMatchers;
  }

  get $attachmentMatchers() {
    if (!this._$attachmentMatchers)
      this.$prepareMatchers();
    return this._$attachmentMatchers;
  }

  get $subjectMatchers() {
    if (!this._$subjectMatchers)
      this.$prepareMatchers();
    return this._$subjectMatchers;
  }

  get $bodyMatchers() {
    if (!this._$bodyMatchers)
      this.$prepareMatchers();
    return this._$bodyMatchers;
  }

  $prepareMatchers() {
    this._$addressMatchers = {};
    this._$attachmentMatchers = {};
    this._$subjectMatchers = {};
    this._$bodyMatchers = {};
    for (const rule of this.$rules) {
      switch (rule.matchTarget) {
        case Constants.MATCH_TO_RECIPIENT_DOMAIN:
          const uniquePatterns = new Set(
            (rule.items || [])
              .map(
                pattern => pattern.toLowerCase()
                  .replace(/^(-?)@/, '$1') // delete needless "@" from domain only patterns: "@example.com" => "example.com"
                  .replace(/^(-?)(?![^@]+@)/, '$1*@') // normalize to full address patterns: "foo@example.com" => "foo@example.com", "example.com" => "*@example.com"
              )
              .filter(pattern => !pattern.startsWith('#')) // reject commented out items
          );
          const negativeItems = new Set(
            [...uniquePatterns]
              .filter(pattern => pattern.startsWith('-'))
              .map(pattern => pattern.replace(/^-/, ''))
          );
          for (const negativeItem of negativeItems) {
            uniquePatterns.delete(negativeItem);
            uniquePatterns.delete(`-${negativeItem}`);
          }
          this._$addressMatchers[rule.id] = new RegExp(`^(${[...uniquePatterns].map(this.$toRegExpSource).join('|')})$`, 'i');
          break;

        case Constants.MATCH_TO_ATTACHMENT_NAME:
          this._$attachmentMatchers[rule.id] = new RegExp(`(${rule.items.map(this.$toRegExpSource).join('|')})`, 'i');
          break;

        case Constants.MATCH_TO_ATTACHMENT_SUFFIX:
          this._$attachmentMatchers[rule.id] = new RegExp(`\\.(${rule.items.map(suffix => this.$toRegExpSource(suffix.replace(/^\./, ''))).join('|')})$`, 'i');
          break;

        case Constants.MATCH_TO_SUBJECT:
          this._$subjectMatchers[rule.id] = new RegExp(`(${rule.items.map(this.$toRegExpSource).join('|')})`, 'gi');
          break;

        case Constants.MATCH_TO_BODY:
          this._$bodyMatchers[rule.id] = new RegExp(`(${rule.items.map(this.$toRegExpSource).join('|')})`, 'gi');
          break;

        case Constants.MATCH_TO_SUBJECT_OR_BODY: {
          const sanitizedItems = rule.items.map(this.$toRegExpSource).join('|');
          this._$subjectMatchers[rule.id] = new RegExp(`(${sanitizedItems})`, 'gi');
          this._$bodyMatchers[rule.id] = new RegExp(`(${sanitizedItems})`, 'gi');
        }; break;

        default:
          break;
      }
    }
  }
  $toRegExpSource(source) {
    // https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
    const sanitized = source.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');

    const wildcardAccepted = sanitized.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');

    return wildcardAccepted;
  }

  get all() {
    return this.$rules.slice(0);
  }

  get(id) {
    return this.$rulesById[id];
  }

  add(params = {}) {
    const id = `rule-${Date.now()}-${parseInt(Math.random() * 56632)}`;
    const rule = {
      id,
      ...clone(BASE_RULE),
      ...params,
      enabled: true,
      $lockedKeys: [],
    };
    if (!rule.id)
      rule.id = id;
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
          if (!rule.itemsFile ||
              typeof fileReader != 'function') {
            items = [];
          }
          else {
            const contents = await fileReader(rule.itemsFile);
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
    const toBeSavedRules = [];
    const toBeSavedRulesById = {};
    for (const rule of this.all) {
      const toBeSaved = toBeSavedRulesById[rule.id] = {};
      Object.assign(toBeSaved, rule);
      delete toBeSaved.$lockedKeys;

      const baseRule = this.$mergedBaseRulesById[rule.id];
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


  $shouldHighlight(rule, { hasAttachment, hasExternal } = {}) {
    return (
      rule.highlight == Constants.HIGHLIGHT_ALWAYS ||
      (rule.highlight == Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS &&
       hasAttachment) ||
      (rule.highlight == Constants.HIGHLIGHT_ONLY_EXTERNALS &&
       hasExternal) ||
      (rule.highlight == Constants.HIGHLIGHT_ONLY_EXTERNALS_WITH_ATTACHMENTS &&
       hasExternal &&
       hasAttachment)
    );
  }

  $shouldReconfirm(rule, { hasAttachment, hasExternal } = {}) {
    return (
      rule.action == Constants.ACTION_RECONFIRM_ALWAYS ||
      (rule.action == Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS &&
       hasAttachment) ||
      (rule.action == Constants.ACTION_RECONFIRM_ONLY_EXTERNALS &&
       hasExternal) ||
      (rule.action == Constants.ACTION_RECONFIRM_ONLY_EXTERNALS_WITH_ATTACHMENTS &&
       hasExternal &&
       hasAttachment)
    );
  }

  $shouldBlock(rule, { hasAttachment, hasExternal } = {}) {
    return (
      rule.action == Constants.ACTION_BLOCK_ALWAYS ||
      (rule.action == Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS &&
       hasAttachment) ||
      (rule.action == Constants.ACTION_BLOCK_ONLY_EXTERNALS &&
       hasExternal) ||
      (rule.action == Constants.ACTION_BLOCK_ONLY_EXTERNALS_WITH_ATTACHMENTS &&
       hasExternal &&
       hasAttachment)
    );
  }


  $classifyRecipients(internals, externals, filter) {
    const classified = {};
    for (const recipients of [internals, externals]) {
      if (!recipients || recipients.length == 0)
        continue;
      for (const recipient of recipients) {
        const parsedRecipient = typeof recipient == 'string' ? RecipientParser.parse(recipient) : recipient;

        for (const [id, matcher] of Object.entries(this.$addressMatchers)) {
          if (!matcher.test(parsedRecipient.address))
            continue;

          const rule = this.get(id);
          if (!rule.enabled ||
              !filter(rule, recipients === externals))
            continue;

          const classifiedRecipients = classified[id] || new Set();
          classifiedRecipients.add(parsedRecipient);
          classified[id] = classifiedRecipients;
        }
      }
    }
    return Object.fromEntries(
      Object.entries(classified)
        .map(([id, recipients]) => [id, Array.from(recipients)])
    );
  }

  getHighlightedRecipientAddresses({ internals, externals, attachments } = {}) {
    const hasAttachment = attachments && attachments.length > 0;
    const classified = this.$classifyRecipients(
      internals,
      externals,
      (rule, isExternal) =>
        this.$shouldHighlight(rule, {
          hasAttachment,
          hasExternal: isExternal,
        })
    );
    return new Set(Object.entries(classified).map(([_ruleId, recipients]) => recipients.map(recipient => recipient.address)).flat());
  }

  classifyReconfirmRecipients({ internals, externals, attachments } = {}) {
    const hasAttachment = attachments && attachments.length > 0;
    return this.$classifyRecipients(
      internals,
      externals,
      (rule, isExternal) =>
        this.$shouldReconfirm(rule, {
          hasAttachment,
          hasExternal: isExternal,
        })
    );
  }

  classifyBlockRecipients({ internals, externals, attachments } = {}) {
    const hasAttachment = attachments && attachments.length > 0;
    return this.$classifyRecipients(
      internals,
      externals,
      (rule, isExternal) =>
        this.$shouldBlock(rule, {
          hasAttachment,
          hasExternal: isExternal,
        })
    );
  }


  $classifyAttachments(attachments, filter) {
    if (!attachments)
      return {};
    const classified = {};
    for (const attachment of attachments) {
      for (const [id, matcher] of Object.entries(this.$attachmentMatchers)) {
        if (!matcher.test(attachment.name))
          continue;

        const rule = this.get(id);
        if (!rule.enabled ||
            !filter(rule))
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

  getHighlightedAttachmentNames({ attachments, hasExternal } = {}) {
    const classified = this.$classifyAttachments(
      attachments,
      rule =>
        this.$shouldHighlight(rule, {
          hasAttachment: attachments && attachments.length > 0,
          hasExternal,
        }),
    );
    return new Set(Object.entries(classified).map(([_ruleId, attachments]) => attachments.map(attachment => attachment.name)).flat());
  }

  classifyReconfirmAttachments({ attachments, hasExternal } = {}) {
    return this.$classifyAttachments(
      attachments,
      rule =>
        this.$shouldReconfirm(rule, {
          hasAttachment: true,
          hasExternal,
        })
    );
  }

  classifyBlockAttachments({ attachments, hasExternal } = {}) {
    return this.$classifyAttachments(
      attachments,
      rule =>
        this.$shouldBlock(rule, {
          hasAttachment: true,
          hasExternal,
        })
    );
  }


  async tryReconfirm({ internals, externals, attachments, subject, body, confirm }) {
    for (const [ruleId, classifiedRecipients] of Object.entries(this.classifyReconfirmRecipients({ internals, externals, attachments }))) {
      const rule = this.get(ruleId);
      if (!rule ||
          !rule.enabled ||
          classifiedRecipients.length == 0)
        continue;

      let confirmed;
      try {
        confirmed = await confirm({
          rule,
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

    const hasExternal = externals && externals.length > 0;
    for (const [ruleId, classifiedAttachments] of Object.entries(this.classifyReconfirmAttachments({ attachments, hasExternal }))) {
      const rule = this.get(ruleId);
      if (!rule ||
          !rule.enabled ||
          classifiedAttachments.length == 0)
        continue;

      let confirmed;
      try {
        confirmed = await confirm({
          rule,
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

    const processedRules = new Set();

    if (subject) {
      for (const [ruleId, matcher] of Object.entries(this.$subjectMatchers)) {
        const rule = this.get(ruleId);
        if (!rule ||
            processedRules.has(rule) ||
            !rule.enabled ||
            !this.$shouldReconfirm(rule, { hasAttachment: attachments && attachments.length > 0, hasExternal }))
          continue;

        const matched = subject.match(matcher);
        if (!matched || matched.length == 0)
          continue;

        processedRules.add(rule);

        let confirmed;
        try {
          const terms = [...new Set(matched)];
          confirmed = await confirm({
            rule,
            title:   rule.confirmTitle,
            message: rule.confirmMessage.replace(/[\%\$]s/i, terms.join('\n')),
            terms,
          });
        }
        catch(error) {
          console.error(error);
          confirmed = false;
        }
        if (!confirmed)
          return false;
      }
    }

    if (body) {
      for (const [ruleId, matcher] of Object.entries(this.$bodyMatchers)) {
        const rule = this.get(ruleId);
        if (!rule ||
            processedRules.has(rule) ||
            !rule.enabled ||
            !this.$shouldReconfirm(rule, { hasAttachment: attachments && attachments.length > 0, hasExternal }))
          continue;

        const matched = body.match(matcher);
        if (!matched || matched.length == 0)
          continue;

        processedRules.add(rule);

        let confirmed;
        try {
          const terms = [...new Set(matched)];
          confirmed = await confirm({
            rule,
            title:   rule.confirmTitle,
            message: rule.confirmMessage.replace(/[\%\$]s/i, terms.join('\n')),
            terms,
          });
        }
        catch(error) {
          console.error(error);
          confirmed = false;
        }
        if (!confirmed)
          return false;
      }
    }

    return true;
  }

  async tryBlock({ internals, externals, attachments, subject, body, alert }) {
    for (const [ruleId, classifiedRecipients] of Object.entries(this.classifyBlockRecipients({ internals, externals, attachments }))) {
      const rule = this.get(ruleId);
      if (!rule ||
          !rule.enabled ||
          classifiedRecipients.length == 0)
        continue;

      try {
        await alert({
          rule,
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

    const hasExternal = externals && externals.length > 0;
    for (const [ruleId, classifiedAttachments] of Object.entries(this.classifyBlockAttachments({ attachments, hasExternal }))) {
      const rule = this.get(ruleId);
      if (!rule ||
          !rule.enabled ||
          classifiedAttachments.length == 0)
        continue;

      try {
        await alert({
          rule,
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

    const processedRules = new Set();

    if (subject) {
      for (const [ruleId, matcher] of Object.entries(this.$subjectMatchers)) {
        const rule = this.get(ruleId);
        if (!rule ||
            processedRules.has(rule) ||
            !rule.enabled ||
            !this.$shouldBlock(rule, { hasAttachment: attachments && attachments.length > 0, hasExternal }))
          continue;

        processedRules.add(rule);

        const matched = subject.match(matcher);
        if (!matched || matched.length == 0)
          continue;

        try {
          const terms = [...new Set(matched)];
          await alert({
            rule,
            title:   rule.confirmTitle,
            message: rule.confirmMessage.replace(/[\%\$]s/i, terms.join('\n')),
            terms,
          });
        }
        catch(error) {
          console.error(error);
        }
        return true;
      }
    }

    if (body) {
      for (const [ruleId, matcher] of Object.entries(this.$bodyMatchers)) {
        const rule = this.get(ruleId);
        if (!rule ||
            processedRules.has(rule) ||
            !rule.enabled ||
            !this.$shouldBlock(rule, { hasAttachment: attachments && attachments.length > 0, hasExternal }))
          continue;

        processedRules.add(rule);

        const matched = body.match(matcher);
        if (!matched || matched.length == 0)
          continue;

        try {
          const terms = [...new Set(matched)];
          await alert({
            rule,
            title:   rule.confirmTitle,
            message: rule.confirmMessage.replace(/[\%\$]s/i, terms.join('\n')),
            terms,
          });
        }
        catch(error) {
          console.error(error);
        }
        return true;
      }
    }

    return false;
  }

  shouldHighlightSubject(subject, { hasExternal, hasAttachment } = {}) {
    if (!subject)
      return false;

    for (const [ruleId, matcher] of Object.entries(this.$subjectMatchers)) {
      const rule = this.get(ruleId);
      if (!rule ||
          !rule.enabled ||
          !this.$shouldHighlight(rule, { hasExternal, hasAttachment }))
        continue;
      const matched = subject.match(matcher);
      if (!matched || matched.length == 0)
        continue;

      return true;
    }

    return false;
  }

  shouldHighlightBody(body, { hasExternal, hasAttachment } = {}) {
    if (!body)
      return false;

    for (const [ruleId, matcher] of Object.entries(this.$bodyMatchers)) {
      const rule = this.get(ruleId);
      if (!rule ||
          !rule.enabled ||
          !this.$shouldHighlight(rule, { hasExternal, hasAttachment }))
        continue;
      const matched = body.match(matcher);
      if (!matched || matched.length == 0)
        continue;

      return true;
    }

    return false;
  }
}
