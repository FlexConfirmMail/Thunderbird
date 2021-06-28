/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { RecipientClassifier } from '../common/recipient-classifier.js';
import { assert } from 'tiny-esm-test-runner';
const { is } = assert;

export function test_format() {
  const recipients = [
    'without-nick@example.com',
    'My Nickname <with-nick@example.com>',
    'address-like-nickname@clear-code.com <address-like-nick@example.com>',
    'domain-must-be-lower-cased@EXAMPLE.com'
  ];
  const classifier = new RecipientClassifier();
  const classified = classifier.classify(recipients);
  is(
    {
      internals: [],
      externals: [
        { recipient: 'without-nick@example.com',
          address:   'without-nick@example.com',
          domain:    'example.com',
          isAttentionDomain: false },
        { recipient: 'My Nickname <with-nick@example.com>',
          address:   'with-nick@example.com',
          domain:    'example.com',
          isAttentionDomain: false },
        { recipient: 'address-like-nickname@clear-code.com <address-like-nick@example.com>',
          address:   'address-like-nick@example.com',
          domain:    'example.com',
          isAttentionDomain: false },
        { recipient: 'domain-must-be-lower-cased@EXAMPLE.com',
          address:   'domain-must-be-lower-cased@EXAMPLE.com',
          domain:    'example.com',
          isAttentionDomain: false }
      ],
      blocked: [],
    },
    classified
  );
}

test_classifyAddresses.parameters = {
  'all recipients must be classified as externals for blank list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.com'
    ],
    internalDomains: [],
    expected: {
      internals: [],
      externals: [
        'aaa@example.com',
        'bbb@example.com'
      ],
      blocked: [],
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
        'aaa@clear-code.com',
        'bbb@clear-code.com'
      ],
      externals: [],
      blocked: [],
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
        'aaa@example.com',
        'bbb@example.com'
      ],
      blocked: [],
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
        'aaa@clear-code.com',
        'ccc@clear-code.com'
      ],
      externals: [
        'zzz@exmaple.com',
        'bbb@example.org'
      ],
      blocked: [],
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
        'aaa@CLEAR-code.com',
        'bbb@clear-CODE.com'
      ],
      externals: [],
      blocked: [],
    }
  },
  'mistakable recipients must be detected as externals': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@unclear-code.com',
      'clear-code.com@example.com',
      'address-like-nick@clear-code.com <ccc@example.com>',
      'address-like-nick@example.com <ddd@clear-code.com>'
    ],
    internalDomains: ['clear-code.com'],
    expected: {
      internals: [
        'aaa@clear-code.com',
        'ddd@clear-code.com'
      ],
      externals: [
        'bbb@unclear-code.com',
        'clear-code.com@example.com',
        'ccc@example.com'
      ],
      blocked: [],
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
        'aaa@clear-code.com'
      ],
      externals: [
        'bbb@un.clear-code.com'
      ],
      blocked: [],
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
        'bbb@un.clear-code.com'
      ],
      externals: [
        'aaa@clear-code.com'
      ],
      blocked: [],
    }
  },
  'accept "@" in domain list': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@example.com'
    ],
    internalDomains: ['@clear-code.com'],
    expected: {
      internals: [
        'aaa@clear-code.com'
      ],
      externals: [
        'bbb@example.com'
      ],
      blocked: [],
    }
  },
  'blocked internal domains': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@example.com'
    ],
    internalDomains: ['@clear-code.com'],
    blockedDomains: ['@clear-code.com'],
    expected: {
      internals: [
      ],
      externals: [
        'bbb@example.com',
      ],
      blocked: [
        'aaa@clear-code.com',
      ],
    }
  },
  'blocked external domains': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@example.com'
    ],
    internalDomains: ['@clear-code.com'],
    blockedDomains: ['@example.com'],
    expected: {
      internals: [
        'aaa@clear-code.com',
      ],
      externals: [
      ],
      blocked: [
        'bbb@example.com',
      ],
    }
  },
  'blocked domains with attention domains': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@example.com'
    ],
    attentionDomains: ['@clear-code.com'],
    blockedDomains: ['@clear-code.com'],
    expected: {
      internals: [
      ],
      externals: [
        'bbb@example.com',
      ],
      blocked: [
        'aaa@clear-code.com',
      ],
    }
  },
};
export function test_classifyAddresses({ recipients, internalDomains, attentionDomains, blockedDomains, expected }) {
  const classifier = new RecipientClassifier({ internalDomains, attentionDomains, blockedDomains });
  const classified = classifier.classify(recipients);
  is(
    expected,
    {
      internals: classified.internals.map(recipient => recipient.address),
      externals: classified.externals.map(recipient => recipient.address),
      blocked:   classified.blocked.map(recipient => recipient.address)
    }
  );
}

test_classifyAttentionDomains.parameters = {
  'must detect difference of subdomains': {
    recipients: [
      'aaa@un.example.com',
      'bbb@example.com',
      'ccc@completely.un.example.com'
    ],
    attentionDomains: ['un.example.com'],
    expected: {
      internals: [],
      externals: [
        true,
        false,
        false
      ]
    }
  },
  'must ignore cases': {
    recipients: [
      'aaa@example.com',
      'bbb@EXAMPLE.com',
      'ccc@example.org'
    ],
    attentionDomains: ['example.com'],
    expected: {
      internals: [],
      externals: [
        true,
        true,
        false
      ]
    }
  }
};
export function test_classifyAttentionDomains({ recipients, attentionDomains, expected }) {
  const classifier = new RecipientClassifier({ attentionDomains });
  const classified = classifier.classify(recipients);
  is(
    expected,
    {
      internals: classified.internals.map(recipient => recipient.isAttentionDomain),
      externals: classified.externals.map(recipient => recipient.isAttentionDomain)
    }
  );
}
