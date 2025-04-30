/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as RecipientParser from '../common/recipient-parser.js';
import { assert } from 'tiny-esm-test-runner';
const { is } = assert;


test_parse.parameters = {
  addressOnly: {
    input: 'mail@example.com',
    expected: {
      recipient: 'mail@example.com',
      address:   'mail@example.com',
      domain:    'example.com',
    },
  },
  withComment: {
    input: '氏名 <mail@example.com>',
    expected: {
      recipient: '氏名 <mail@example.com>',
      address:   'mail@example.com',
      domain:    'example.com',
    },
  },
  withCommentLikeAddress: {
    input: '氏名@所属 <mail@example.com>',
    expected: {
      recipient: '氏名@所属 <mail@example.com>',
      address:   'mail@example.com',
      domain:    'example.com',
    },
  },
  withAddressComment: {
    input: 'mail@example.com <mail@example.com>',
    expected: {
      recipient: 'mail@example.com <mail@example.com>',
      address:   'mail@example.com',
      domain:    'example.com',
    },
  },
  list: {
    input: '組織 <組織>',
    expected: {
      recipient: '組織 <組織>',
      address:   '',
      domain:    '',
    },
  },
  list: {
    input: '組 織 <組 織>',
    expected: {
      recipient: '組 織 <組 織>',
      address:   '',
      domain:    '',
    },
  },
};
export async function test_parse({ input, expected }) {
  is(expected, RecipientParser.parse(input));
}
