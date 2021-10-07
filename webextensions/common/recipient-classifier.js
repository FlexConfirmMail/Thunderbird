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
    const internals = new Set();
    const externals = new Set();
    const matched   = {};
    const blocked   = new Set();

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
        const recipients = matched[id] || new Set();
        recipients.add(classifiedRecipient);
        matched[id] = recipients;

        if (this.$internalDomainsSet.has(domain))
          internals.add(classifiedRecipient);
        else
          externals.add(classifiedRecipient);
      }
      if (classifiedRecipient.matchedRules.length > 0)
        continue;

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
      matched: Object.fromEntries(
        Object.entries(matched)
          .map(([id, recipients]) => [id, Array.from(recipients)])
      ),
      blocked: Array.from(blocked),
    };
  }
}
