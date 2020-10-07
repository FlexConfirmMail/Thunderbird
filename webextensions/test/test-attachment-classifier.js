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
  const classifier = new AttachmentClassifier({ attentionSuffixes });
  const actual = files.map(classifier.hasAttentionSuffix);
  is(expected, actual);
}

test_hasAttentionTerm.parameters = {
  'same case': {
    files: [
      'filenamedanger.png',
      'filenamesafe.zip'
    ],
    attentionTerms: ['danger'],
    expected: [
      true,
      false
    ]
  },
  'must ignore cases': {
    files: [
      'filenamedanger.png',
      'filenamedAnGeR.png',
      'filename.png'
    ],
    attentionTerms: ['DaNgEr'],
    expected: [
      true,
      true,
      false
    ]
  },
  'mixed': {
    files: [
      'filename-danger.png',
      'filename-unsafe.zip',
      'filename-DAnGEr.txt',
      'filename-unSAFE.xpi',
      'filename-safe.png',
      'filename-Safe.zip',
      'filename-sAFE.txt',
      'filename-SAFE.xpi'
    ],
    attentionTerms: ['danger', 'unsafe'],
    expected: [
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false
    ]
  }
};
export function test_hasAttentionTerm({ files, attentionTerms, expected }) {
  const classifier = new AttachmentClassifier({ attentionTerms });
  const actual = files.map(classifier.hasAttentionTerm);
  is(expected, actual);
}
