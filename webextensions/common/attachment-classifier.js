/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Constants from './constants.js';

export class AttachmentClassifier {
  constructor({ rules, attentionSuffixes, attentionSuffixes2, attentionTerms } = {}) {
    this.$ruleMatchers = {};
    if (rules) {
      for (const rule of rules) {
        switch (rule.matchTarget) {
          case Constants.MATCH_TO_ATTACHMENT_NAME:
            this.$ruleMatchers[rule.id] = new RegExp(`(${rule.items.join('|')})`, 'i');
            break;

          case Constants.MATCH_TO_ATTACHMENT_SUFFIX:
            this.$ruleMatchers[rule.id] = new RegExp(`\\.(${rule.items.map(suffix => suffix.replace(/^\./, '')).join('|')})$`, 'i');
            break;

          default:
            break;
        }
      }
    }

    this.getMatchedRules = this.getMatchedRules.bind(this);


    if (!attentionSuffixes)
      attentionSuffixes = [];
    if (attentionSuffixes.length == 0)
      this.$attentionSuffixMatcher = /[^\w\W]/;
    else
      this.$attentionSuffixMatcher = new RegExp(`\\.(${attentionSuffixes.map(suffix => suffix.replace(/^\./, '')).join('|')})$`, 'i');

    if (!attentionSuffixes2)
      attentionSuffixes2 = [];
    if (attentionSuffixes2.length == 0)
      this.$attentionSuffix2Matcher = /[^\w\W]/;
    else
      this.$attentionSuffix2Matcher = new RegExp(`\\.(${attentionSuffixes2.map(suffix => suffix.replace(/^\./, '')).join('|')})$`, 'i');

    if (!attentionTerms)
      attentionTerms = [];
    if (attentionTerms.length == 0)
      this.$attentionTermMatcher = /[^\w\W]/;
    else
      this.$attentionTermMatcher = new RegExp(`(${attentionTerms.join('|')})`, 'i');

    this.hasAttentionSuffix = this.hasAttentionSuffix.bind(this);
    this.hasAttentionSuffix2 = this.hasAttentionSuffix2.bind(this);
    this.hasAttentionTerm = this.hasAttentionTerm.bind(this);
  }

  getMatchedRules(filename) {
    return Object.entries(this.$ruleMatchers)
      .filter(([_id, matcher]) => matcher.test(filename))
      .map(([id, _matcher]) => id);
  }

  hasAttentionSuffix(filename) {
    return this.$attentionSuffixMatcher.test(filename);
  }

  hasAttentionSuffix2(filename) {
    return this.$attentionSuffix2Matcher.test(filename);
  }

  hasAttentionTerm(filename) {
    return this.$attentionTermMatcher.test(filename);
  }
}
