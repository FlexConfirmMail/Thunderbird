/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Constants from './constants.js';

export class MatchingRules {
  constructor({ base, baseRules, user, userRules, override, overrideRules }) {
    this.$baseRules     = base     || baseRules;
    this.$userRules     = user     || userRules;
    this.$overrideRules = override || overrideRules;
    this.$load();
    this.$prepareRuleMatchers();
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
            ...JSON.parse(JSON.stringify(Constants.BASE_RULE)),
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

  $prepareRuleMatchers() {
    const highlightRecipientsRulesAll           = [];
    const highlightRecipientsRulesNoAttachment  = [];
    const highlightAttachmentsRulesAll          = [];

    for (const rule of this.all) {
      if (rule.highlight == Constants.HIGHLIGHT_NEVER)
        continue;

      switch (rule.matchTarget) {
        case Constants.MATCH_TO_RECIPIENT_DOMAIN:
          highlightRecipientsRulesAll.push(rule.id);
          if (rule.highlight != Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS)
            highlightRecipientsRulesNoAttachment.push(rule.id);
          break;

        case Constants.MATCH_TO_ATTACHMENT_NAME:
        case Constants.MATCH_TO_ATTACHMENT_SUFFIX:
          highlightAttachmentsRulesAll.push(rule.id);
          break;
      }
    }
    this.$highlightRecipientsRulesMatcherAll = highlightRecipientsRulesAll.length > 0 &&
      new RegExp(`^(${highlightRecipientsRulesAll.map(sanitizeRegExpSource).join('|')})$`, 'm');
    this.$highlightRecipientsRulesNoAttachment = highlightRecipientsRulesNoAttachment.length > 0 &&
      new RegExp(`^(${highlightRecipientsRulesNoAttachment.map(sanitizeRegExpSource).join('|')})$`, 'm');
    this.$highlightAttachmentsRulesMatcher = highlightAttachmentsRulesAll.length > 0 &&
      new RegExp(`^(${highlightAttachmentsRulesAll.map(sanitizeRegExpSource).join('|')})$`, 'm');
  }

  get all() {
    return this.$rules.slice(0);
  }

  get(id) {
    return this.$rulesById[id];
  }

  add(params = {}) {
    const rule = {
      ...JSON.parse(JSON.stringify(Constants.BASE_RULE)),
      ...params,
      id: `rule-${Date.now()}-${parseInt(Math.random() * 56632)}`,
      enabled: true,
      $lockedKeys: [],
    };
    this.$rules.push(rule);
    this.$rulesById[rule.id] = rule;

    return rule;
  }

  remove(id) {
    delete this.$rulesById[id];
    this.$rules = this.$rules.filter(rule => rule.id != id);
  }

  moveUp(id) {
    const index = this.$rules.findIndex(rule => rule.id == id);
    const toBeMoved = this.$rules.splice(index, 1);
    this.$rules.splice(index - 1, 0, ...toBeMoved);
  }

  moveDown(id) {
    const index = this.$rules.findIndex(rule => rule.id == id);
    const toBeMoved = this.$rules.splice(index, 1);
    this.$rules.splice(index + 1, 0, ...toBeMoved);
  }

  async populate(fileReader) {
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

  hasHighlightRecipientRule(ruleIds, attachments = []) {
    if (attachments.length == 0)
      return this.$highlightRecipientsRulesNoAttachment && this.$highlightRecipientsRulesNoAttachment.test(ruleIds.join('\n'));

    return this.$highlightRecipientsRulesMatcherAll && this.$highlightRecipientsRulesMatcherAll.test(ruleIds.join('\n'));
  }

  hasHighlightAttachmentRule(ruleIds) {
    return this.$highlightAttachmentsRulesMatcher && this.$highlightAttachmentsRulesMatcher.test(ruleIds.join('\n'));
  }

  shouldReconfirm(ruleId, attachments = []) {
    const rule = this.get(ruleId);
    if (!rule)
      return false;

    if (rule.action == Constants.ACTION_RECONFIRM_ALWAYS)
      return true;

    if (rule.action == Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS)
      return attachments.length > 0;

    return false;
  }

  async tryConfirm(ruleId, { targets, confirm, attachments }) {
    const rule = this.get(ruleId);
    if (!rule ||
        targets.length == 0 ||
        !this.shouldReconfirm(ruleId, attachments)) {
      return true;
    }

    try {
      return confirm({
        title:   rule.confirmTitle,
        message: rule.confirmMessage.replace(/[\%\$]s/i, targets.map(target => target.address || target.name).join('\n')),
      });
    }
    catch(error) {
      console.error(error);
    }
    return false;
  }

  shouldBlock(ruleId, attachments = []) {
    const rule = this.get(ruleId);
    if (!rule)
      return false;

    if (rule.action == Constants.ACTION_BLOCK_ALWAYS)
      return true;

    if (rule.action == Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS)
      return attachments.length > 0;

    return false;
  }

  async tryBlock(ruleId, { targets, alert, attachments }) {
    const rule = this.get(ruleId);
    if (!rule ||
        targets.length == 0 ||
        !this.shouldBlock(ruleId, attachments)) {
      return false;
    }

    try {
      await alert({
        title:   rule.confirmTitle,
        message: rule.confirmMessage.replace(/[\%\$]s/i, targets.map(target => target.address || target.name || target).join('\n')),
      });
    }
    catch(error) {
      console.error(error);
    }
    return true;
  }
}

function sanitizeRegExpSource(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
