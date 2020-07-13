/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export function classify(recipients, {internalDomains, attentionDomains } = {}) {
  const internals = [];
  const externals = [];

  if (internalDomains.length == 0) {
    externals.push(...recipients);
    return { internals, externals };
  }

  const internalDomainsSet = new Set((internalDomains || []).map(domain => domain.toLowerCase()));
  const attentionDomainsSet = new Set(attentionDomains || []);
  for (const recipient of recipients) {
    const address = /<([^@]+@[^>]+)>\s*$/.test(recipient) ? RegExp.$1 : recipient;
    const domain = address.split('@')[1].toLowerCase();
    const classifiedRecipient = {
      recipient,
      address,
      domain,
      isAttentionDomain: attentionDomainsSet.has(domain)
    };
    if (internalDomainsSet.has(domain))
      internals.push(classifiedRecipient);
    else
      externals.push(classifiedRecipient);
  }

  return { internals, externals };
}
