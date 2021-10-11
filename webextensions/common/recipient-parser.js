/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export function parse(recipient) {
  const address = /<([^@]+@[^>]+)>\s*$/.test(recipient) ? RegExp.$1 : recipient;
  const domain = address.split('@')[1].toLowerCase();
  return {
    recipient,
    address,
    domain,
  };
}
