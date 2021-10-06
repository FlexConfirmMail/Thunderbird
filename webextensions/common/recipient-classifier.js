/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Constants from './constants.js';

export class RecipientClassifier {
  constructor({ internalDomains, rules, attentionDomains, blockedDomains } = {}) {
    this.$internalDomainsSet = new Set((internalDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));
    this.$matchedDomainsSets = {};
    if (rules) {
      for (const rule of rules) {
        if (rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN)
          continue;
        this.$matchedDomainsSets[rule.id] = new Set((rule.items || []).map(domain => domain.toLowerCase().replace(/^@/, '')));
      }
    }

    this.$attentionDomainsSet = new Set((attentionDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));
    this.$blockedDomainsSet = new Set((blockedDomains || []).map(domain => domain.toLowerCase().replace(/^@/, '')));

    this.classify = this.classify.bind(this);
  }

  classify(recipients) {
    const internals = [];
    const matched   = {};

    const externals = [];
    const blocked   = [];

    for (const recipient of recipients) {
      const address = /<([^@]+@[^>]+)>\s*$/.test(recipient) ? RegExp.$1 : recipient;
      const domain = address.split('@')[1].toLowerCase();
      const classifiedRecipient = {
        recipient,
        address,
        domain,
        matchedRules: [],

        isAttentionDomain: this.$attentionDomainsSet.has(domain)
      };
      for (const [id, itemsSet] of Object.entries(this.$matchedDomainsSets)) {
        if (!itemsSet.has(domain))
          continue;

        classifiedRecipient.matchedRules.push(id);
        const recipients = matched[id] || [];
        recipients.push(classifiedRecipient);
        matched[id] = recipients;
      }
      if (classifiedRecipient.matchedRules.length > 0)
        continue;

      if (this.$blockedDomainsSet.has(domain))
        blocked.push(classifiedRecipient);
      else if (this.$internalDomainsSet.has(domain))
        internals.push(classifiedRecipient);
      else
        externals.push(classifiedRecipient);
    }

    return { internals, matched, externals, blocked };
  }
}
