/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export function parse(recipient) {
  if (/\s*([^<@]+)\s*<(?:\1|"\1"|[^>@]+)>\s*$/.test(recipient)) { // list like "list-name <list-name>"
    return {
      recipient,
      address: '',
      domain: '',
    };
  }

  const address = /<([^@]+@[^>]+)>\s*$/.test(recipient) ? RegExp.$1 : recipient;
  const parts = address.split('@');
  const domain = parts.length > 1 ? parts[1].toLowerCase() : '';
  return {
    recipient,
    address,
    domain,
  };
}
