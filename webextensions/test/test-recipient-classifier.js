/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as RecipientClassifier from '../background/recipient-classifier.js';
import { assert } from 'tiny-esm-test-runner';
const { is } = assert;

test_classify.parameters = {
  'all recipients must be classified as externals for blank list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.com'
    ],
    internalDomains: [],
    expected: {
      internals: [],
      externals: [
        { recipient: 'aaa@example.com',
          address:   'aaa@example.com',
          domain:    'example.com',
          isAttentionDomain: false },
        { recipient: 'bbb@example.com',
          address:   'bbb@example.com',
          domain:    'example.com',
          isAttentionDomain: false }
      ]
    }
  },
  'all recipients must be classified as internals based on the list': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@clear-code.com'
    ],
    internalDomains: ['clear-code.com'],
    expected: {
      internals: [
        { recipient: 'aaa@clear-code.com',
          address:   'aaa@clear-code.com',
          domain:    'clear-code.com',
          isAttentionDomain: false },
        { recipient: 'bbb@clear-code.com',
          address:   'bbb@clear-code.com',
          domain:    'clear-code.com',
          isAttentionDomain: false }
      ],
      externals: []
    }
  },
  'all recipients must be classified as externals based on the list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.com'
    ],
    internalDomains: ['clear-code.com'],
    expected: {
      internals: [],
      externals: [
        { recipient: 'aaa@example.com',
          address:   'aaa@example.com',
          domain:    'example.com',
          isAttentionDomain: false },
        { recipient: 'bbb@example.com',
          address:   'bbb@example.com',
          domain:    'example.com',
          isAttentionDomain: false }
      ]
    }
  },
  'mixed recipients must be classified to internals and externals': {
    recipients: [
      'zzz@exmaple.com',
      'aaa@clear-code.com',
      'bbb@example.org',
      'ccc@clear-code.com'
    ],
    internalDomains: ['clear-code.com'],
    expected: {
      internals: [
        { recipient: 'aaa@clear-code.com',
          address:   'aaa@clear-code.com',
          domain:    'clear-code.com',
          isAttentionDomain: false },
        { recipient: 'ccc@clear-code.com',
          address:   'ccc@clear-code.com',
          domain:    'clear-code.com',
          isAttentionDomain: false }
      ],
      externals: [
        { recipient: 'zzz@exmaple.com',
          address:   'zzz@exmaple.com',
          domain:    'exmaple.com',
          isAttentionDomain: false },
        { recipient: 'bbb@example.org',
          address:   'bbb@example.org',
          domain:    'example.org',
          isAttentionDomain: false }
      ]
    }
  },
  'difference of cases in domains must be ignored': {
    recipients: [
      'aaa@CLEAR-code.com',
      'bbb@clear-CODE.com'
    ],
    internalDomains: ['clear-code.com'],
    expected: {
      internals: [
        { recipient: 'aaa@CLEAR-code.com',
          address:   'aaa@CLEAR-code.com',
          domain:    'clear-code.com',
          isAttentionDomain: false },
        { recipient: 'bbb@clear-CODE.com',
          address:   'bbb@clear-CODE.com',
          domain:    'clear-code.com',
          isAttentionDomain: false }
      ],
      externals: []
    }
  },
  'mistakable local parts and domains must be detected as externals': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@unclear-code.com',
      'clear-code.com@example.com'
    ],
    internalDomains: ['clear-code.com'],
    expected: {
      internals: [
        { recipient: 'aaa@clear-code.com',
          address:   'aaa@clear-code.com',
          domain:    'clear-code.com',
          isAttentionDomain: false }
      ],
      externals: [
        { recipient: 'bbb@unclear-code.com',
          address:   'bbb@unclear-code.com',
          domain:    'unclear-code.com',
          isAttentionDomain: false },
        { recipient: 'clear-code.com@example.com',
          address:   'clear-code.com@example.com',
          domain:    'example.com',
          isAttentionDomain: false }
      ]
    }
  },
  'sub domain must not detected as internal': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@un.clear-code.com'
    ],
    internalDomains: ['clear-code.com'],
    expected: {
      internals: [
        { recipient: 'aaa@clear-code.com',
          address:   'aaa@clear-code.com',
          domain:    'clear-code.com',
          isAttentionDomain: false }
      ],
      externals: [
        { recipient: 'bbb@un.clear-code.com',
          address:   'bbb@un.clear-code.com',
          domain:    'un.clear-code.com',
          isAttentionDomain: false }
      ]
    }
  },
  'upper domain must not detected as internal': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@un.clear-code.com'
    ],
    internalDomains: ['un.clear-code.com'],
    expected: {
      internals: [
        { recipient: 'bbb@un.clear-code.com',
          address:   'bbb@un.clear-code.com',
          domain:    'un.clear-code.com',
          isAttentionDomain: false }
      ],
      externals: [
        { recipient: 'aaa@clear-code.com',
          address:   'aaa@clear-code.com',
          domain:    'clear-code.com',
          isAttentionDomain: false }
      ]
    }
  }
};
export function test_classify({ recipients, internalDomains, expected }) {
  const classified = RecipientClassifier.classify(recipients, {
    internalDomains
  });
  is(expected, classified);
}
