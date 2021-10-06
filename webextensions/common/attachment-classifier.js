/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export class AttachmentClassifier {
  constructor({ rules, attentionSuffixes, attentionSuffixes2, attentionTerms } = {}) {
     // TBD: build matcher from rules

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
