/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as RecipientParser from './recipient-parser.js';

export class RecipientClassifier {
  constructor({ internalDomains, attentionDomains, blockedDomains } = {}) {
    this.$internalDomainsSet = new Set((internalDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));
    this.$attentionDomainsSet = new Set((attentionDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));
    this.$blockedDomainsSet = new Set((blockedDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));

    this.classify = this.classify.bind(this);
  }

  classify(recipients) {
    const internals = new Set();
    const externals = new Set();
    const blocked   = new Set();

    for (const recipient of recipients) {
      const classifiedRecipient = {
        ...RecipientParser.parse(recipient),
        highlighted: false,
      };
      const domain = classifiedRecipient.domain;
      classifiedRecipient.isAttentionDomain = this.$attentionDomainsSet.has(domain);

      if (this.$blockedDomainsSet.has(domain))
        blocked.add(classifiedRecipient);
      else if (this.$internalDomainsSet.has(domain))
        internals.add(classifiedRecipient);
      else
        externals.add(classifiedRecipient);
    }

    return {
      internals: Array.from(internals),
      externals: Array.from(externals),
      blocked: Array.from(blocked),
    };
  }
}
