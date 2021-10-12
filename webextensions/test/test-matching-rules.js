/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Constants from '../common/constants.js';
import { MatchingRules } from '../common/matching-rules.js';
import * as RecipientParser from '../common/recipient-parser.js';
import { assert } from 'tiny-esm-test-runner';
const { is } = assert;


export async function test_load_and_export() {
  const matchingRules = new MatchingRules({
    baseRules: [
      { id:          'base',
        itemsLocal:  ['base'] },
      { id:          'user',
        itemsLocal:  ['base'] },
    ],
    userRules: [
      { id:          'user',
        itemsLocal:  ['user'] },
    ],
    overrideRules: [
      { id:          'base',
        itemsFile:   '/path/fo/base/overridden' },
      { id:          'override',
        itemsLocal:  ['override'] },
    ],
  });
  is(
    [
      { id:             'base',
        name:           '',
        enabled:        true,
        matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
        highlight:      Constants.HIGHLIGHT_NEVER,
        action:         Constants.ACTION_NONE,
        itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
        itemsLocal:     ['base'],
        itemsFile:      '/path/fo/base/overridden',
        confirmTitle:   '',
        confirmMessage: '',
        $lockedKeys:    ['itemsFile'] },
      { id:             'user',
        name:           '',
        enabled:        true,
        matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
        highlight:      Constants.HIGHLIGHT_NEVER,
        action:         Constants.ACTION_NONE,
        itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
        itemsLocal:     ['user'],
        itemsFile:      '',
        confirmTitle:   '',
        confirmMessage: '',
        $lockedKeys:    [] },
      { id:             'override',
        name:           '',
        enabled:        true,
        matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
        highlight:      Constants.HIGHLIGHT_NEVER,
        action:         Constants.ACTION_NONE,
        itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
        itemsLocal:     ['override'],
        itemsFile:      '',
        confirmTitle:   '',
        confirmMessage: '',
        $lockedKeys:    ['itemsLocal'] },
    ],
    matchingRules.all
  );
}

export function test_add() {
  const matchingRules = new MatchingRules();
  matchingRules.add({ id: 'one' });
  matchingRules.add({ id: 'two' });
  matchingRules.add({ id: 'three' });
  is(['one', 'two', 'three'],
     matchingRules.all.map(rule => rule.id));
}

export function test_remove() {
  const matchingRules = new MatchingRules({
    base: [
      { id: 'one' },
      { id: 'two' },
      { id: 'three' },
    ],
  });
  matchingRules.remove('two');
  is(['one', 'three'],
     matchingRules.all.map(rule => rule.id));
}

export function test_moveUp() {
  const matchingRules = new MatchingRules({
    base: [
      { id: 'one' },
      { id: 'two' },
      { id: 'three' },
    ],
  });
  matchingRules.moveUp('three');
  is(['one', 'three', 'two'],
     matchingRules.all.map(rule => rule.id));
  matchingRules.moveUp('three');
  is(['three', 'one', 'two'],
     matchingRules.all.map(rule => rule.id));
  matchingRules.moveUp('three');
  is(['three', 'one', 'two'],
     matchingRules.all.map(rule => rule.id));
}

export function test_moveDown() {
  const matchingRules = new MatchingRules({
    base: [
      { id: 'one' },
      { id: 'two' },
      { id: 'three' },
    ],
  });
  matchingRules.moveDown('one');
  is(['two', 'one', 'three'],
     matchingRules.all.map(rule => rule.id));
  matchingRules.moveDown('one');
  is(['two', 'three', 'one'],
     matchingRules.all.map(rule => rule.id));
  matchingRules.moveDown('one');
  is(['two', 'three', 'one'],
     matchingRules.all.map(rule => rule.id));
}


export async function test_populate() {
  const matchingRules = new MatchingRules({
    base: [
      { id:          'local',
        itemsSource: Constants.SOURCE_LOCAL_CONFIG,
        itemsLocal:  ['local'],
        itemsFile:   '/path/to/local' },
      { id:          'file',
        itemsSource: Constants.SOURCE_FILE,
        itemsLocal:  ['file'],
        itemsFile:   '/path/to/file' },
    ],
  });
  const requestedFiles = [];
  await matchingRules.populate(path => {
    requestedFiles.push(path);
    return 'file';
  });
  is(
    {
      local: ['local'],
      file:  ['file'],
      requestedFiles: ['/path/to/file'],
    },
    {
      local: matchingRules.get('local').items,
      file:  matchingRules.get('file').items,
      requestedFiles,
    }
  );
}


const RULES = [
  { id:          'nothing matched to recipient domain',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_NEVER,
    action:      Constants.ACTION_NONE,
    itemsLocal:  ['none.example.com', '@none.clear-code.com'] },
  { id:          'nothing matched to attachment name',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    highlight:   Constants.HIGHLIGHT_NEVER,
    action:      Constants.ACTION_NONE,
    itemsLocal:  ['nowhere'] },
  { id:          'nothing matched to attachment suffix',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    highlight:   Constants.HIGHLIGHT_NEVER,
    action:      Constants.ACTION_NONE,
    itemsLocal:  ['none-without-dot', '.none-with-dot'] },

  { id:          'highlighted by recipient domain always',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlighted-always.example.com', '@highlighted-always.clear-code.com'] },
  { id:          'highlighted by recipient domain only with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-attachment.example.com', '@highlighted-attachment.clear-code.com'] },
  { id:          'reconfirmed by recipient domain always',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-always.example.com', '@reconfirmed-always.clear-code.com'] },
  { id:          'reconfirmed by recipient domain only with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-attachment.example.com', '@reconfirmed-attachment.clear-code.com'] },
  { id:          'blocked by recipient domain always',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['blocked-always.example.com', '@blocked-always.clear-code.com'] },
  { id:          'blocked by recipient domain only with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-attachment.example.com', '@blocked-attachment.clear-code.com'] },

  { id:          'highlighted by attachment name',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlighted-name'] },
  { id:          'reconfirmed by attachment name',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-name'] },
  { id:          'blocked by attachment name',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['blocked-name'] },

  { id:          'highlighted by attachment suffix',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlighted-ext'] },
  { id:          'reconfirmed by attachment suffix',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-ext'] },
  { id:          'blocked by attachment suffix',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['.blocked-ext'] },
];

const RECIPIENTS_HIGHLIGHTED_ALWAYS = [
  'lowercase@highlighted-always.example.com',
  'uppercase@HIGHLIGHTED-ALWAYS.CLEAR-CODE.COM',
  'mixedcase@HiGhLiGhTeD-aLwAyS.ExAmPlE.cOm',
];
const RECIPIENTS_HIGHLIGHTED_WITH_ATTACHMENTS = [
  'lowercase@highlighted-attachment.example.com',
  'uppercase@HIGHLIGHTED-ATTACHMENT.CLEAR-CODE.COM',
  'mixedcase@HiGhLiGhTeD-aTtAcHmEnT.ExAmPlE.cOm',
];
const RECIPIENTS_RECONFIRMED_ALWAYS = [
  'lowercase@reconfirmed-always.example.com',
  'uppercase@RECONFIRMED-ALWAYS.CLEAR-CODE.COM',
  'mixedcase@ReCoNfIrMeD-aLwAyS.ExAmPlE.cOm',
];
const RECIPIENTS_RECONFIRMED_WITH_ATTACHMENTS = [
  'lowercase@reconfirmed-attachment.example.com',
  'uppercase@RECONFIRMED-ATTACHMENT.CLEAR-CODE.COM',
  'mixedcase@ReCoNfIrMeD-aTtAcHmEnT.ExAmPlE.cOm',
];
const RECIPIENTS_BLOCKED_ALWAYS = [
  'lowercase@blocked-always.example.com',
  'uppercase@BLOCKED-ALWAYS.CLEAR-CODE.COM',
  'mixedcase@BlOcKeD-aLwAyS.ExAmPlE.cOm',
];
const RECIPIENTS_BLOCKED_WITH_ATTACHMENTS = [
  'lowercase@blocked-attachment.example.com',
  'uppercase@BLOCKED-ATTACHMENT.CLEAR-CODE.COM',
  'mixedcase@BlOcKeD-aTtAcHmEnT.ExAmPlE.cOm',
];

const RECIPIENTS = [
  'none@example.com',
  'none@clear-code.com',
  'lowercase@none.example.com',
  'uppercase@NONE.CLEAR-CODE.COM',
  'mixedcase@NoNe.ExAmPlE.cOm',
  ...RECIPIENTS_HIGHLIGHTED_ALWAYS,
  ...RECIPIENTS_HIGHLIGHTED_WITH_ATTACHMENTS,
  ...RECIPIENTS_RECONFIRMED_ALWAYS,
  ...RECIPIENTS_RECONFIRMED_WITH_ATTACHMENTS,
  ...RECIPIENTS_BLOCKED_ALWAYS,
  ...RECIPIENTS_BLOCKED_WITH_ATTACHMENTS,
  'address-like@highlighted-always.clear-code.com <address-like@exmaple.com>',
  'address-like@reconfirm-alwaysc.lear-code.com <address-like@example.org>',
  'address-like@blocked-always.com <address-like@clear-code.com>',
  'address-like@example.org <address-like@highlighted-always.CLEAR-code.com>',
  'address-like@exmaple.com <address-like@reconfirmed-always.CLEAR-code.com>',
  'address-like@clear-code.com <address-like@blocked-always.example.com>',
].map(RecipientParser.parse);

const ATTACHMENTS_HIGHLIGHTED_NAME = [
  'HiGhLiGhTeD-name-start',
  'middle-hIgHlIgHtEd-name-middle',
  'end-HIGHlighted-name',
];
const ATTACHMENTS_RECONFIRMED_NAME = [
  'ReCoNfIrMeD-name-attachment-start',
  'middle-rEcOnFiRmEd-name-middle',
  'end-REconfirmed-name',
];
const ATTACHMENTS_BLOCKED_NAME = [
  'bLoCkEd-name-start',
  'middle-BlOcKeD-name-middle',
  'end-blockED-name',
];
const ATTACHMENTS_HIGHLIGHTED_SUFFIX = [
  'basename.HiGhLiGhTeD-ext',
];
const ATTACHMENTS_RECONFIRMED_SUFFIX = [
  'basename.rEcOnFiRmEd-ext',
];
const ATTACHMENTS_BLOCKED_SUFFIX = [
  'basename.blockED-ext',
];

const ATTACHMENTS = [
  'not-contain',

  'nOwHeRe-start',
  'middle-NoWhErE-middle',
  'end-NOwhere',

  ...ATTACHMENTS_HIGHLIGHTED_NAME,
  ...ATTACHMENTS_RECONFIRMED_NAME,
  ...ATTACHMENTS_BLOCKED_NAME,

  ...ATTACHMENTS_HIGHLIGHTED_SUFFIX,
  'hIgHlIgHtEd-ext.ext',
  'basename.HIGHlighted-ext.ext',

  ...ATTACHMENTS_RECONFIRMED_SUFFIX,
  'ReCoNfIrMeD-ext.ext',
  'REconfirmed-ext.ext',

  ...ATTACHMENTS_BLOCKED_SUFFIX,
  'basename.bLoCkEd-ext-start.ext',
  'BlOcKeD-ext-middle.ext',
].map(attachment => ({ name: attachment }));

function recipientsToAddresses(classified) {
  return Object.fromEntries(
    Object.entries(classified)
      .map(([id, recipients]) => [id, recipients.map(recipient => recipient.address)])
  );
}

function attachmentsToNames(classified) {
  return Object.fromEntries(
    Object.entries(classified)
      .map(([id, attachments]) => [id, attachments.map(attachment => attachment.name)])
  );
}

export async function test_classifyRecipients() {
  const matchingRules = new MatchingRules({ base: RULES });
  await matchingRules.populate();

  is(
    [
      ...RECIPIENTS_HIGHLIGHTED_ALWAYS,
      'address-like@highlighted-always.CLEAR-code.com',
    ],
    [...matchingRules.getHighlightedRecipientAddresses({
      externals:   RECIPIENTS,
      attachments: [],
    })]
  );
  is(
    [
      ...RECIPIENTS_HIGHLIGHTED_ALWAYS,
      'address-like@highlighted-always.CLEAR-code.com',
      ...RECIPIENTS_HIGHLIGHTED_WITH_ATTACHMENTS,
    ],
    [...matchingRules.getHighlightedRecipientAddresses({
      externals:   RECIPIENTS,
      attachments: ATTACHMENTS,
    })]
  );

  is(
    {
      'reconfirmed by recipient domain always': [
        ...RECIPIENTS_RECONFIRMED_ALWAYS,
        'address-like@reconfirmed-always.CLEAR-code.com',
      ],
    },
    recipientsToAddresses(matchingRules.classifyReconfirmRecipients({
      externals:   RECIPIENTS,
      attachments: [],
    }))
  );
  is(
    {
      'reconfirmed by recipient domain always': [
        ...RECIPIENTS_RECONFIRMED_ALWAYS,
        'address-like@reconfirmed-always.CLEAR-code.com',
      ],
      'reconfirmed by recipient domain only with attachment': RECIPIENTS_RECONFIRMED_WITH_ATTACHMENTS,
    },
    recipientsToAddresses(matchingRules.classifyReconfirmRecipients({
      externals:   RECIPIENTS,
      attachments: ATTACHMENTS,
    }))
  );

  is(
    {
      'blocked by recipient domain always': [
        ...RECIPIENTS_BLOCKED_ALWAYS,
        'address-like@blocked-always.example.com',
      ],
    },
    recipientsToAddresses(matchingRules.classifyBlockRecipients({
      externals:   RECIPIENTS,
      attachments: [],
    }))
  );
  is(
    {
      'blocked by recipient domain always': [
        ...RECIPIENTS_BLOCKED_ALWAYS,
        'address-like@blocked-always.example.com',
      ],
      'blocked by recipient domain only with attachment': RECIPIENTS_BLOCKED_WITH_ATTACHMENTS,
    },
    recipientsToAddresses(matchingRules.classifyBlockRecipients({
      externals:   RECIPIENTS,
      attachments: ATTACHMENTS,
    }))
  );
}

export async function test_classifyAttachments() {
  const matchingRules = new MatchingRules({ base: RULES });
  await matchingRules.populate();

  is(
    [
      ...ATTACHMENTS_HIGHLIGHTED_NAME,
      ...ATTACHMENTS_HIGHLIGHTED_SUFFIX,
    ],
    [...matchingRules.getHighlightedAttachmentNames(ATTACHMENTS)]
  );

  is(
    {
      'reconfirmed by attachment name': [
        ...ATTACHMENTS_RECONFIRMED_NAME,
      ],
      'reconfirmed by attachment suffix': [
        ...ATTACHMENTS_RECONFIRMED_SUFFIX,
      ],
    },
    attachmentsToNames(matchingRules.classifyReconfirmAttachments({
      attachments: ATTACHMENTS,
      hasExternal: true,
    }))
  );

  is(
    {
      'blocked by attachment name': [
        ...ATTACHMENTS_BLOCKED_NAME,
      ],
      'blocked by attachment suffix': [
        ...ATTACHMENTS_BLOCKED_SUFFIX,
      ],
    },
    attachmentsToNames(matchingRules.classifyBlockAttachments({
      attachments: ATTACHMENTS,
      hasExternal: true,
    }))
  );
}
