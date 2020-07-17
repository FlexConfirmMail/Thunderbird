/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export class AttachmentClassifier {
  constructor(attentionSuffixes = []) {
    if (attentionSuffixes.length == 0)
      this.$attentionSuffixMatcher = /[^\w\W]/;
    else
      this.$attentionSuffixMatcher = new RegExp(`\\.(${attentionSuffixes.map(suffix => suffix.replace(/^\./, '')).join('|')})$`, 'i');
  }

  hasAttentionSuffix(filename) {
    return this.$attentionSuffixMatcher.test(filename);
  }
}
