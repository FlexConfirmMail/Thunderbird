/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as RecipientParser from './recipient-parser.js';

export class RecipientClassifier {
  constructor({ internalDomains } = {}) {
    const uniquePatterns = new Set(
      (internalDomains || [])
        .filter(pattern => !pattern.startsWith('#')) // reject commented out items
        .map(
          pattern => pattern.toLowerCase()
            .replace(/^(-?)@/, '$1') // delete needless "@" from domain only patterns: "@example.com" => "example.com"
            .replace(/^(-?)(?![^@]+@)/, '$1*@') // normalize to full address patterns: "foo@example.com" => "foo@example.com", "example.com" => "*@example.com"
        )
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
    this.$internalDomainsMatcher = new RegExp(`^(${[...uniquePatterns].map(pattern => this.$toRegExpSource(pattern)).join('|')})$`, 'i');
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
      const address = classifiedRecipient.address;
      if (this.$internalDomainsMatcher.test(address))
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
