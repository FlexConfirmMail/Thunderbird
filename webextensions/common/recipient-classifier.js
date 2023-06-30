/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as RecipientParser from './recipient-parser.js';

export class RecipientClassifier {
  constructor({ internalDomains } = {}) {
    const uniqueDomains = new Set(
      (internalDomains || [])
        .map(domain => domain.toLowerCase().replace(/^(-?)@/, '$1'))
        .filter(domain => !domain.startsWith('#')) // reject commented out items
    );
    const negativeItems = new Set(
      [...uniqueDomains]
        .filter(domain => domain.startsWith('-'))
        .map(domain => domain.replace(/^-/, ''))
    );
    for (const negativeItem of negativeItems) {
      uniqueDomains.delete(negativeItem);
      uniqueDomains.delete(`-${negativeItem}`);
    }
    this.$internalDomainsMatcher = new RegExp(`^(${[...uniqueDomains].map(domain => this.$toRegExpSource(domain)).join('|')})$`, 'i');
    this.classify = this.classify.bind(this);
  }

  $toRegExpSource(source) {
    // https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
    const sanitized = source.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');

    const wildcardAccepted = sanitized.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');

    return wildcardAccepted;
  }

  classify(recipients) {
    const internals = new Set();
    const externals = new Set();

    for (const recipient of recipients) {
      const classifiedRecipient = {
        ...RecipientParser.parse(recipient),
      };
      const domain = classifiedRecipient.domain;
      if (this.$internalDomainsMatcher.test(domain))
        internals.add(classifiedRecipient);
      else
        externals.add(classifiedRecipient);
    }

    return {
      internals: Array.from(internals),
      externals: Array.from(externals),
    };
  }
}
