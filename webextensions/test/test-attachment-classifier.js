/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { AttachmentClassifier } from '../common/attachment-classifier.js';
import { assert } from 'tiny-esm-test-runner';
const { is } = assert;

test_hasAttentionSuffix.parameters = {
  'without period': {
    files: [
      'filename.png',
      'filename.zip'
    ],
    attentionSuffixes: ['png'],
    expected: [
      true,
      false
    ]
  },
  'with period': {
    files: [
      'filename.png',
      'filename.zip'
    ],
    attentionSuffixes: ['.png'],
    expected: [
      true,
      false
    ]
  },
  'mistakable filename': {
    files: [
      'filename.png',
      'filename.png.zip'
    ],
    attentionSuffixes: ['.png'],
    expected: [
      true,
      false
    ]
  },
  'must ignore cases': {
    files: [
      'lowercase.png',
      'uppercase.PNG'
    ],
    attentionSuffixes: ['.png'],
    expected: [
      true,
      true
    ]
  },
  'mixed': {
    files: [
      'filename.png',
      'filename.zip',
      'filename.txt',
      'filename.xpi'
    ],
    attentionSuffixes: ['.png', 'txt'],
    expected: [
      true,
      false,
      true,
      false
    ]
  }
};
export function test_hasAttentionSuffix({ files, attentionSuffixes, expected }) {
  const classifier = new AttachmentClassifier(attentionSuffixes);
  const actual = files.map(classifier.hasAttentionSuffix);
  is(expected, actual);
}
