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
const { is, ok, ng } = assert;


export async function test_load_and_export() {
  const matchingRules = new MatchingRules({
    baseRules: [
      { id:          'base',
        itemsLocal:  ['base'] },
      { id:          'user',
        itemsLocal:  ['base'] },
    ],
    overrideBaseRules: [
      { id:          'base',
        itemsLocal:  ['overrideBase'] }
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
        itemsLocal:     ['overrideBase'],
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
  await matchingRules.populate(async path => {
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


const NO_REACTION_RULES = [
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
  { id:          'nothing matched to subject',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    highlight:   Constants.HIGHLIGHT_NEVER,
    action:      Constants.ACTION_NONE,
    itemsLocal:  ['never'] },
  { id:          'nothing matched to body',
    matchTarget: Constants.MATCH_TO_BODY,
    highlight:   Constants.HIGHLIGHT_NEVER,
    action:      Constants.ACTION_NONE,
    itemsLocal:  ['never'] },
  { id:          'nothing matched to subject and body',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    highlight:   Constants.HIGHLIGHT_NEVER,
    action:      Constants.ACTION_NONE,
    itemsLocal:  ['never'] },
];

const DISABLED_RULES = [
  { id:          'nothing matched to recipient domain',
    enabled:     false,
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['none.example.com', '@none.clear-code.com'] },
  { id:          'nothing matched to attachment name',
    enabled:     false,
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['nowhere'] },
  { id:          'nothing matched to attachment suffix',
    enabled:     false,
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['none-without-dot', '.none-with-dot'] },
  { id:          'nothing matched to subject',
    enabled:     false,
    matchTarget: Constants.MATCH_TO_SUBJECT,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['never'] },
  { id:          'nothing matched to body',
    enabled:     false,
    matchTarget: Constants.MATCH_TO_BODY,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['never'] },
  { id:          'nothing matched to subject and body',
    enabled:     false,
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['never'] },
];

const RECIPIENT_DOMAIN_RULES = [
  { id:          'highlighted by recipient domain always',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlighted-always.example.com', '@highlighted-always.clear-code.com'] },
  { id:          'highlighted by recipient domain only with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-attachment.example.com', '@highlighted-attachment.clear-code.com'] },
  { id:          'highlighted by recipient domain only external',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS,
    itemsLocal:  ['highlighted-external.example.com', '@highlighted-external.clear-code.com'] },
  { id:          'highlighted by recipient domain only external with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-external-attachment.example.com', '@highlighted-external-attachment.clear-code.com'] },
  { id:          'reconfirmed by recipient domain always',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-always.example.com', '@reconfirmed-always.clear-code.com'] },
  { id:          'reconfirmed by recipient domain only with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-attachment.example.com', '@reconfirmed-attachment.clear-code.com'] },
  { id:          'reconfirmed by recipient domain only external',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
    itemsLocal:  ['reconfirmed-external.example.com', '@reconfirmed-external.clear-code.com'] },
  { id:          'reconfirmed by recipient domain only external with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-external-attachment.example.com', '@reconfirmed-external-attachment.clear-code.com'] },
  { id:          'blocked by recipient domain always',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['blocked-always.example.com', '@blocked-always.clear-code.com'] },
  { id:          'blocked by recipient domain only with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-attachment.example.com', '@blocked-attachment.clear-code.com'] },
  { id:          'blocked by recipient domain only external',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS,
    itemsLocal:  ['blocked-external.example.com', '@blocked-external.clear-code.com'] },
  { id:          'blocked by recipient domain only external with attachment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-external-attachment.example.com', '@blocked-external-attachment.clear-code.com'] },
  { id:          'highlighted by recipient domain always, but disabled by comment',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['#never-highlighted-with-comment.example.com'] },
  { id:          'highlighted by recipient domain always, but disabled by negative modifier',
    matchTarget: Constants.MATCH_TO_RECIPIENT_DOMAIN,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  [
      'never-highlighted-with-negative-modifier.example.com',
      '@never-highlighted-with-negative-modifier.clear-code.com',
      '-never-highlighted-with-negative-modifier.clear-code.com',
    ] },
];

const ATTACHMENT_NAME_RULES = [
  { id:          'highlighted by attachment name',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlighted-name'] },
  { id:          'highlighted by attachment name only external',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS,
    itemsLocal:  ['highlighted-external-name'] },
  { id:          'reconfirmed by attachment name',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-name'] },
  { id:          'reconfirmed by attachment name only external',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
    itemsLocal:  ['reconfirmed-external-name'] },
  { id:          'blocked by attachment name',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['blocked-name'] },
  { id:          'blocked by attachment name only external',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_NAME,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS,
    itemsLocal:  ['blocked-external-name'] },
];

const ATTACHMENT_SUFFIX_RULES = [
  { id:          'highlighted by attachment suffix',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlighted-ext'] },
  { id:          'highlighted by attachment suffix only external',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS,
    itemsLocal:  ['highlighted-external-ext'] },
  { id:          'reconfirmed by attachment suffix',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-ext'] },
  { id:          'reconfirmed by attachment suffix only external',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
    itemsLocal:  ['reconfirmed-external-ext'] },
  { id:          'blocked by attachment suffix',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['.blocked-ext'] },
  { id:          'blocked by attachment suffix only external',
    matchTarget: Constants.MATCH_TO_ATTACHMENT_SUFFIX,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS,
    itemsLocal:  ['.blocked-external-ext'] },
];

const SUBJECT_RULES = [
  { id:          'highlighted by subject always',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlight-always'] },
  { id:          'highlighted by subject only with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    highlight:   Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-attachment'] },
  { id:          'highlighted by subject only external',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS,
    itemsLocal:  ['highlighted-external'] },
  { id:          'highlighted by subject only external with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-both-external-attachment'] },
  { id:          'reconfirmed by subject always',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-always'] },
  { id:          'reconfirmed by subject only with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    action:      Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-attachment'] },
  { id:          'reconfirmed by subject only external',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
    itemsLocal:  ['reconfirmed-external'] },
  { id:          'reconfirmed by subject only external with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-both-external-attachment'] },
  { id:          'blocked by subject always',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['blocked-always'] },
  { id:          'blocked by subject only with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    action:      Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-attachment'] },
  { id:          'blocked by subject only external',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS,
    itemsLocal:  ['blocked-external'] },
  { id:          'blocked by subject only external with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-both-external-attachment'] },
];

const BODY_RULES = [
  { id:          'highlighted by body always',
    matchTarget: Constants.MATCH_TO_BODY,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlight-always'] },
  { id:          'highlighted by body only with attachment',
    matchTarget: Constants.MATCH_TO_BODY,
    highlight:   Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-attachment'] },
  { id:          'highlighted by body only external',
    matchTarget: Constants.MATCH_TO_BODY,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS,
    itemsLocal:  ['highlighted-external'] },
  { id:          'highlighted by body only external with attachment',
    matchTarget: Constants.MATCH_TO_BODY,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-both-external-attachment'] },
  { id:          'reconfirmed by body always',
    matchTarget: Constants.MATCH_TO_BODY,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-always'] },
  { id:          'reconfirmed by body only with attachment',
    matchTarget: Constants.MATCH_TO_BODY,
    action:      Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-attachment'] },
  { id:          'reconfirmed by body only external',
    matchTarget: Constants.MATCH_TO_BODY,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
    itemsLocal:  ['reconfirmed-external'] },
  { id:          'reconfirmed by body only external with attachment',
    matchTarget: Constants.MATCH_TO_BODY,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-both-external-attachment'] },
  { id:          'blocked by body always',
    matchTarget: Constants.MATCH_TO_BODY,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['blocked-always'] },
  { id:          'blocked by body only with attachment',
    matchTarget: Constants.MATCH_TO_BODY,
    action:      Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-attachment'] },
  { id:          'blocked by body only external',
    matchTarget: Constants.MATCH_TO_BODY,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS,
    itemsLocal:  ['blocked-external'] },
  { id:          'blocked by body only external with attachment',
    matchTarget: Constants.MATCH_TO_BODY,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-both-external-attachment'] },
];

const SUBJECT_OR_BODY_RULES = [
  { id:          'highlighted by subject or body always',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    highlight:   Constants.HIGHLIGHT_ALWAYS,
    itemsLocal:  ['highlight-always'] },
  { id:          'highlighted by subject or body only with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    highlight:   Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-attachment'] },
  { id:          'highlighted by subject or body only external',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS,
    itemsLocal:  ['highlighted-external'] },
  { id:          'highlighted by subject or body only external with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    highlight:   Constants.HIGHLIGHT_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['highlighted-both-external-attachment'] },
  { id:          'reconfirmed by subject or body always',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    action:      Constants.ACTION_RECONFIRM_ALWAYS,
    itemsLocal:  ['reconfirmed-always'] },
  { id:          'reconfirmed by subject or body only with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    action:      Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-attachment'] },
  { id:          'reconfirmed by subject or body only external',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
    itemsLocal:  ['reconfirmed-external'] },
  { id:          'reconfirmed by subject or body only external with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    action:      Constants.ACTION_RECONFIRM_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['reconfirmed-both-external-attachment'] },
  { id:          'blocked by subject or body always',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    action:      Constants.ACTION_BLOCK_ALWAYS,
    itemsLocal:  ['blocked-always'] },
  { id:          'blocked by subject or body only with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    action:      Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-attachment'] },
  { id:          'blocked by subject or body only external',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS,
    itemsLocal:  ['blocked-external'] },
  { id:          'blocked by subject or body only external with attachment',
    matchTarget: Constants.MATCH_TO_SUBJECT_OR_BODY,
    action:      Constants.ACTION_BLOCK_ONLY_EXTERNALS_WITH_ATTACHMENTS,
    itemsLocal:  ['blocked-both-external-attachment'] },
];

const RULES = [
  ...NO_REACTION_RULES,
  ...DISABLED_RULES,
  ...RECIPIENT_DOMAIN_RULES,
  ...ATTACHMENT_NAME_RULES,
  ...ATTACHMENT_SUFFIX_RULES,
  ...SUBJECT_RULES,
  ...BODY_RULES,
  ...SUBJECT_OR_BODY_RULES,
];

const RECONFIRM_ACTIONS = new Set([
  Constants.ACTION_RECONFIRM_ALWAYS,
  Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
  Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS,
  Constants.ACTION_RECONFIRM_ONLY_EXTERNALS_WITH_ATTACHMENTS,
]);
const RECONFIRM_RULES = [
  ...RECIPIENT_DOMAIN_RULES,
  ...ATTACHMENT_NAME_RULES,
  ...ATTACHMENT_SUFFIX_RULES,
  ...SUBJECT_RULES,
  ...BODY_RULES,
  ...SUBJECT_OR_BODY_RULES,
].filter(rule => RECONFIRM_ACTIONS.has(rule.action));

/*
const BLOCK_ACTIONS = new Set([
  Constants.ACTION_BLOCK_ALWAYS,
  Constants.ACTION_BLOCK_ONLY_EXTERNALS,
  Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS,
  Constants.ACTION_BLOCK_ONLY_EXTERNALS_WITH_ATTACHMENTS,
]);
const BLOCK_RULES = [
  ...RECIPIENT_DOMAIN_RULES,
  ...ATTACHMENT_NAME_RULES,
  ...ATTACHMENT_SUFFIX_RULES,
  ...SUBJECT_RULES,
  ...BODY_RULES,
  ...SUBJECT_OR_BODY_RULES,
].filter(rule => BLOCK_ACTIONS.has(rule.action));
*/


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
const RECIPIENTS_HIGHLIGHTED_EXTERNALS = [
  'lowercase@highlighted-external.example.com',
  'uppercase@HIGHLIGHTED-EXTERNAL.CLEAR-CODE.COM',
  'mixedcase@HiGhLiGhTeD-eXtErNaL.ExAmPlE.cOm',
];
const RECIPIENTS_HIGHLIGHTED_EXTERNALS_WITH_ATTACHMENTS = [
  'lowercase@highlighted-external-attachment.example.com',
  'uppercase@HIGHLIGHTED-EXTERNAL-ATTACHMENT.CLEAR-CODE.COM',
  'mixedcase@HiGhLiGhTeD-eXtErNaL-aTtAcHmEnT.ExAmPlE.cOm',
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
const RECIPIENTS_RECONFIRMED_EXTERNALS = [
  'lowercase@reconfirmed-external.example.com',
  'uppercase@RECONFIRMED-EXTERNAL.CLEAR-CODE.COM',
  'mixedcase@ReCoNfIrMeD-eXtErNaL.ExAmPlE.cOm',
];
const RECIPIENTS_RECONFIRMED_EXTERNALS_WITH_ATTACHMENTS = [
  'lowercase@reconfirmed-external-attachment.example.com',
  'uppercase@RECONFIRMED-EXTERNAL-ATTACHMENT.CLEAR-CODE.COM',
  'mixedcase@ReCoNfIrMeD-eXtErNaL-aTtAcHmEnT.ExAmPlE.cOm',
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
const RECIPIENTS_BLOCKED_EXTERNALS = [
  'lowercase@blocked-external.example.com',
  'uppercase@BLOCKED-EXTERNAL.CLEAR-CODE.COM',
  'mixedcase@BlOcKeD-eXtErNaL.ExAmPlE.cOm',
];
const RECIPIENTS_BLOCKED_EXTERNALS_WITH_ATTACHMENTS = [
  'lowercase@blocked-external-attachment.example.com',
  'uppercase@BLOCKED-EXTERNAL-ATTACHMENT.CLEAR-CODE.COM',
  'mixedcase@BlOcKeD-eXtErNaL-aTtAcHmEnT.ExAmPlE.cOm',
];
const RECIPIENTS_NOT_HIGHLIGHTED_WITH_COMMENT = [
  'address@never-highlighted-with-comment.example.com',
];
const RECIPIENTS_NOT_HIGHLIGHTED_WITH_NEGATIVE_MODIFIER = [
  'address@never-highlighted-with-negative-modifier.clear-code.com',
];

const RECIPIENTS = [
  'none@example.com',
  'none@clear-code.com',
  'lowercase@none.example.com',
  'uppercase@NONE.CLEAR-CODE.COM',
  'mixedcase@NoNe.ExAmPlE.cOm',
  ...RECIPIENTS_HIGHLIGHTED_ALWAYS,
  ...RECIPIENTS_HIGHLIGHTED_WITH_ATTACHMENTS,
  ...RECIPIENTS_HIGHLIGHTED_EXTERNALS,
  ...RECIPIENTS_HIGHLIGHTED_EXTERNALS_WITH_ATTACHMENTS,
  ...RECIPIENTS_RECONFIRMED_ALWAYS,
  ...RECIPIENTS_RECONFIRMED_WITH_ATTACHMENTS,
  ...RECIPIENTS_RECONFIRMED_EXTERNALS,
  ...RECIPIENTS_RECONFIRMED_EXTERNALS_WITH_ATTACHMENTS,
  ...RECIPIENTS_BLOCKED_ALWAYS,
  ...RECIPIENTS_BLOCKED_WITH_ATTACHMENTS,
  ...RECIPIENTS_BLOCKED_EXTERNALS,
  ...RECIPIENTS_BLOCKED_EXTERNALS_WITH_ATTACHMENTS,
  ...RECIPIENTS_NOT_HIGHLIGHTED_WITH_COMMENT,
  ...RECIPIENTS_NOT_HIGHLIGHTED_WITH_NEGATIVE_MODIFIER,
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
const ATTACHMENTS_HIGHLIGHTED_NAME_EXTERNALS = [
  'HiGhLiGhTeD-external-name-start',
  'middle-hIgHlIgHtEd-external-name-middle',
  'end-HIGHlighted-external-name',
];
const ATTACHMENTS_RECONFIRMED_NAME = [
  'ReCoNfIrMeD-name-attachment-start',
  'middle-rEcOnFiRmEd-name-middle',
  'end-REconfirmed-name',
];
const ATTACHMENTS_RECONFIRMED_NAME_EXTERNALS = [
  'ReCoNfIrMeD-external-name-attachment-start',
  'middle-rEcOnFiRmEd-external-name-middle',
  'end-REconfirmed-external-name',
];
const ATTACHMENTS_BLOCKED_NAME = [
  'bLoCkEd-name-start',
  'middle-BlOcKeD-name-middle',
  'end-blockED-name',
];
const ATTACHMENTS_BLOCKED_NAME_EXTERNALS = [
  'bLoCkEd-external-name-start',
  'middle-BlOcKeD-external-name-middle',
  'end-blockED-external-name',
];
const ATTACHMENTS_HIGHLIGHTED_SUFFIX = [
  'basename.HiGhLiGhTeD-ext',
];
const ATTACHMENTS_HIGHLIGHTED_SUFFIX_EXTERNALS = [
  'basename.HiGhLiGhTeD-external-ext',
];
const ATTACHMENTS_RECONFIRMED_SUFFIX = [
  'basename.rEcOnFiRmEd-ext',
];
const ATTACHMENTS_RECONFIRMED_SUFFIX_EXTERNALS = [
  'basename.rEcOnFiRmEd-external-ext',
];
const ATTACHMENTS_BLOCKED_SUFFIX = [
  'basename.blockED-ext',
];
const ATTACHMENTS_BLOCKED_SUFFIX_EXTERNALS = [
  'basename.blockED-external-ext',
];

const ATTACHMENTS = [
  'not-contain',

  'nOwHeRe-start',
  'middle-NoWhErE-middle',
  'end-NOwhere',

  ...ATTACHMENTS_HIGHLIGHTED_NAME,
  ...ATTACHMENTS_HIGHLIGHTED_NAME_EXTERNALS,
  ...ATTACHMENTS_RECONFIRMED_NAME,
  ...ATTACHMENTS_RECONFIRMED_NAME_EXTERNALS,
  ...ATTACHMENTS_BLOCKED_NAME,
  ...ATTACHMENTS_BLOCKED_NAME_EXTERNALS,

  ...ATTACHMENTS_HIGHLIGHTED_SUFFIX,
  'hIgHlIgHtEd-ext.ext',
  'basename.HIGHlighted-ext.ext',
  ...ATTACHMENTS_HIGHLIGHTED_SUFFIX_EXTERNALS,

  ...ATTACHMENTS_RECONFIRMED_SUFFIX,
  'ReCoNfIrMeD-ext.ext',
  'REconfirmed-ext.ext',
  ...ATTACHMENTS_RECONFIRMED_SUFFIX_EXTERNALS,

  ...ATTACHMENTS_BLOCKED_SUFFIX,
  'basename.bLoCkEd-ext-start.ext',
  'BlOcKeD-ext-middle.ext',
  ...ATTACHMENTS_BLOCKED_SUFFIX_EXTERNALS,
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
      ...RECIPIENTS_HIGHLIGHTED_EXTERNALS,
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
      ...RECIPIENTS_HIGHLIGHTED_EXTERNALS,
      ...RECIPIENTS_HIGHLIGHTED_EXTERNALS_WITH_ATTACHMENTS,
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
      'reconfirmed by recipient domain only external': RECIPIENTS_RECONFIRMED_EXTERNALS,
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
      'reconfirmed by recipient domain only external': RECIPIENTS_RECONFIRMED_EXTERNALS,
      'reconfirmed by recipient domain only external with attachment': RECIPIENTS_RECONFIRMED_EXTERNALS_WITH_ATTACHMENTS,
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
      'blocked by recipient domain only external': RECIPIENTS_BLOCKED_EXTERNALS,
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
      'blocked by recipient domain only external': RECIPIENTS_BLOCKED_EXTERNALS,
      'blocked by recipient domain only external with attachment': RECIPIENTS_BLOCKED_EXTERNALS_WITH_ATTACHMENTS,
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
    [...matchingRules.getHighlightedAttachmentNames({
      attachments: ATTACHMENTS,
      hasExternal: false,
    })]
  );
  is(
    [
      ...ATTACHMENTS_HIGHLIGHTED_NAME,
      ...ATTACHMENTS_HIGHLIGHTED_NAME_EXTERNALS,
      ...ATTACHMENTS_HIGHLIGHTED_SUFFIX,
      ...ATTACHMENTS_HIGHLIGHTED_SUFFIX_EXTERNALS,
    ],
    [...matchingRules.getHighlightedAttachmentNames({
      attachments: ATTACHMENTS,
      hasExternal: true,
    })]
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
      hasExternal: false,
    }))
  );
  is(
    {
      'reconfirmed by attachment name': [
        ...ATTACHMENTS_RECONFIRMED_NAME,
      ],
      'reconfirmed by attachment name only external': [
        ...ATTACHMENTS_RECONFIRMED_NAME_EXTERNALS,
      ],
      'reconfirmed by attachment suffix': [
        ...ATTACHMENTS_RECONFIRMED_SUFFIX,
      ],
      'reconfirmed by attachment suffix only external': [
        ...ATTACHMENTS_RECONFIRMED_SUFFIX_EXTERNALS,
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
      hasExternal: false,
    }))
  );
  is(
    {
      'blocked by attachment name': [
        ...ATTACHMENTS_BLOCKED_NAME,
      ],
      'blocked by attachment name only external': [
        ...ATTACHMENTS_BLOCKED_NAME_EXTERNALS,
      ],
      'blocked by attachment suffix': [
        ...ATTACHMENTS_BLOCKED_SUFFIX,
      ],
      'blocked by attachment suffix only external': [
        ...ATTACHMENTS_BLOCKED_SUFFIX_EXTERNALS,
      ],
    },
    attachmentsToNames(matchingRules.classifyBlockAttachments({
      attachments: ATTACHMENTS,
      hasExternal: true,
    }))
  );
}


export async function test_tryReconfirm_confirmed() {
  const matchingRules = new MatchingRules({ base: RULES });
  await matchingRules.populate();

  let confirmationCount = 0;
  const confirmed = await matchingRules.tryReconfirm({
    externals: RECIPIENTS,
    attachments: ATTACHMENTS,
    subject: 'reconfirmed-always reconfirmed-attachment reconfirmed-external reconfirmed-both-external-attachment',
    body: 'reconfirmed-always reconfirmed-attachment reconfirmed-external reconfirmed-both-external-attachment',
    confirm: () => {
      confirmationCount++;
      return true;
    },
  });
  ok(confirmed);
  is(RECONFIRM_RULES.length,
     confirmationCount);
}

export async function test_tryReconfirm_notConfirmed() {
  const matchingRules = new MatchingRules({ base: RULES });
  await matchingRules.populate();

  let confirmationCount = 0;
  const confirmed = await matchingRules.tryReconfirm({
    externals: RECIPIENTS,
    attachments: ATTACHMENTS,
    subject: 'reconfirmed-always reconfirmed-attachment reconfirmed-external reconfirmed-both-external-attachment',
    body: 'reconfirmed-always reconfirmed-attachment reconfirmed-external reconfirmed-both-external-attachment',
    confirm: () => {
      confirmationCount++;
      return false;
    },
  });
  ng(confirmed);
  is(1,
     confirmationCount);
}


export async function test_tryBlock_blocked() {
  const matchingRules = new MatchingRules({ base: RULES });
  await matchingRules.populate();

  let alertCount = 0;
  const blocked = await matchingRules.tryBlock({
    externals: RECIPIENTS,
    attachments: ATTACHMENTS,
    subject: 'blocked-always blocked-attachment blocked-external blocked-both-external-attachment',
    body: 'blocked-always blocked-attachment blocked-external blocked-both-external-attachment',
    alert: () => {
      alertCount++;
    },
  });
  ok(blocked);
  is(1,
     alertCount);
}

export async function test_tryBlock_notBlocked() {
  const matchingRules = new MatchingRules({ base: RULES });
  await matchingRules.populate();

  let alertCount = 0;
  const blocked = await matchingRules.tryBlock({
    alert: () => {
      alertCount++;
    },
  });
  ng(blocked);
  is(0,
     alertCount);
}


export async function test_shouldHighlightSubject() {
  const matchingRules = new MatchingRules({ base: RULES });
  await matchingRules.populate();

  ok(await matchingRules.shouldHighlightSubject(
    'highlighted-always highlighted-attachment highlighted-external highlighted-both-external-attachment',
    { hasExternal: true, hasAttachment: true }
  ));

  ng(await matchingRules.shouldHighlightSubject(
    '',
    { hasExternal: true, hasAttachment: true }
  ));
}

export async function test_shouldHighlightBody() {
  const matchingRules = new MatchingRules({ base: RULES });
  await matchingRules.populate();

  ok(await matchingRules.shouldHighlightBody(
    'highlighted-always highlighted-attachment highlighted-external highlighted-both-external-attachment',
    { hasExternal: true, hasAttachment: true }
  ));

  ng(await matchingRules.shouldHighlightBody(
    '',
    { hasExternal: true, hasAttachment: true }
  ));
}
