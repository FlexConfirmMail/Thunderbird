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
          domain:    'example.com' },
        { recipient: 'My Nickname <with-nick@example.com>',
          address:   'with-nick@example.com',
          domain:    'example.com' },
        { recipient: 'address-like-nickname@clear-code.com <address-like-nick@example.com>',
          address:   'address-like-nick@example.com',
          domain:    'example.com' },
        { recipient: 'domain-must-be-lower-cased@EXAMPLE.com',
          address:   'domain-must-be-lower-cased@EXAMPLE.com',
          domain:    'example.com' }
      ],
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
    }
  },
  'support comment in domains list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.net',
      'ccc@#example.net',
    ],
    internalDomains: [
      'example.com',
      '#example.net',
    ],
    expected: {
      internals: [
        'aaa@example.com',
      ],
      externals: [
        'bbb@example.net',
        'ccc@#example.net',
      ],
    }
  },
  'support negative modifier in domains list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.net',
    ],
    internalDomains: [
      'example.com',
      '-@example.com',
      'example.net',
      '-example.net',
    ],
    expected: {
      internals: [
      ],
      externals: [
        'aaa@example.com',
        'bbb@example.net',
      ],
    }
  },
  'support wildcards': {
    recipients: [
      'aaa@.example.com',
      'aaa@X.example.com',
      'aaa@XX.example.com',
      'bbb@.example.net',
      'bbb@X.example.net',
      'bbb@XX.example.net',
    ],
    internalDomains: [
      '*.example.com',
      '?.example.net',
    ],
    expected: {
      internals: [
        'aaa@.example.com',
        'aaa@X.example.com',
        'aaa@XX.example.com',
        'bbb@X.example.net',
      ],
      externals: [
        'bbb@.example.net',
        'bbb@XX.example.net',
      ],
    }
  },
  'support local part': {
    recipients: [
      'aaa.xx@example.com',
      'bbb.yy@example.com',
      'ccc.zz@example.com',
      'ddd@example.com',
    ],
    internalDomains: [
      '*.xx@example.com',
      '*.yy@example.com',
    ],
    expected: {
      internals: [
        'aaa.xx@example.com',
        'bbb.yy@example.com',
      ],
      externals: [
        'ccc.zz@example.com',
        'ddd@example.com',
      ],
    }
  },
  'local part with negative modifier': {
    recipients: [
      'aaa.xx@example.com',
      'bbb.xx@example.com',
    ],
    internalDomains: [
      '*.xx@example.com',
      '-*.xx@example.com',
    ],
    expected: {
      internals: [
      ],
      externals: [
        'aaa.xx@example.com',
        'bbb.xx@example.com',
      ],
    }
  },
  'wildcards in both local part and domain part': {
    recipients: [
      'aaa.xx@foo.example.com',
      'bbb.xx@bar.example.com',
      'ccc.zz@bar.example.com',
    ],
    internalDomains: [
      '*.xx@*example.com',
    ],
    expected: {
      internals: [
        'aaa.xx@foo.example.com',
        'bbb.xx@bar.example.com',
      ],
      externals: [
        'ccc.zz@bar.example.com',
      ],
    }
  },
};
export function test_classifyAddresses({ recipients, internalDomains, expected }) {
  const classifier = new RecipientClassifier({ internalDomains });
  const classified = classifier.classify(recipients);
  is(
    expected,
    {
      internals: classified.internals.map(recipient => recipient.address),
      externals: classified.externals.map(recipient => recipient.address),
    }
  );
}
