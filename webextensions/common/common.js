/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';
import * as Constants from './constants.js';

const OVERRIDE_DEFAULT_CONFIGS = {}; /* Replace this for more customization on an enterprise use. */

export const configs = new Configs({
  confirmationMode: Constants.CONFIRMATION_MODE_ALWAYS,
  lastClipboardData: null,
  acceptablePastedTextLength: 100,
  internalDomains: [],

  /*
    Elements of "baseRules" should have properties same to elements of "rules".
    FCM should work as:
      1. Load "baseRules" to a staging object.
      2. Merge items and properties of "rules" to the staging object.
      3. Build options UI / do confirmation based on rules described in the staging object.
      4. Save values only changed from the baseRule to "rules".
    So, company users (system admins) may lock "baseRules" with partial rules to provide fixed fields.
  */
  allowAddRules: true, // don't expose this to the options UI!
  allowRemoveRules: true, // don't expose this to the options UI!
  allowRearrangeRules: true, // don't expose this to the options UI!
  baseRules: [], // don't expose this to the options UI!
  rules: [
    /*
    {
      id:             'arbitrary unique string',
      name:           'arbitrary visible name in the UI',
      enabled:        true (enabled) or false (disabled),
      matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN | Constants.MATCH_TO_ATTACHMENT_NAME | Constants.MATCH_TO_ATTACHMENT_SUFFIX,
      highlight:      Constants.HIGHLIGHT_NEVER | Constants.HIGHLIGHT_ALWAYS | Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS,
      confirmation:   Constants.CONFIRM_NEVER | Constants.CONFIRM_ALWAYS | Constants.CONFIRM_ONLY_WITH_ATTACHMENTS,
      block:          Constants.BLOCK_NEVER | Constants.BLOCK_ALWAYS | Constants.BLOCK_ONLY_WITH_ATTACHMENTS,
      itemsSource:    Constants.SOURCE_CONFIG | Constants.SOURCE_FILE,
      items:          [(strings)],
      itemsFile:      '(path to a text file: UTF-8, LF separated)',
      confirmTitle:   '(string)',
      confirmMessage: '(string)',
    },
    */
    {
      id:             'builtInAttentionDomains',
      name:           browser.i18n.getMessage('config_attentionDomains_caption'),
      enabled:        true,
      matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
      highlight:      Constants.HIGHLIGHT_ALWAYS,
      confirmation:   Constants.CONFIRM_ALWAYS,
      block:          Constants.BLOCK_NEVER,
      itemsSource:    Constants.SOURCE_CONFIG,
      items:          [],
      itemsFile:      '',
      confirmTitle:   '',
      confirmMessage: '',
    },
    {
      id:             'builtInAttentionSuffixes',
      name:           browser.i18n.getMessage('config_attentionSuffixesConfirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_SUFFIX,
      highlight:      Constants.HIGHLIGHT_NEVER,
      confirmation:   Constants.CONFIRM_ALWAYS,
      block:          Constants.BLOCK_NEVER,
      itemsSource:    Constants.SOURCE_CONFIG,
      items:          [],
      itemsFile:      '',
      confirmTitle:   '',
      confirmMessage: '',
    },
    {
      id:             'builtInAttentionSuffixes2',
      name:           browser.i18n.getMessage('config_attentionSuffixesConfirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_SUFFIX,
      highlight:      Constants.HIGHLIGHT_NEVER,
      confirmation:   Constants.CONFIRM_ALWAYS,
      block:          Constants.BLOCK_NEVER,
      itemsSource:    Constants.SOURCE_CONFIG,
      items:          [],
      itemsFile:      '',
      confirmTitle:   '',
      confirmMessage: '',
    },
    {
      id:             'builtInAttentionTerms',
      name:           browser.i18n.getMessage('config_attentionSuffixesConfirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_NAME,
      highlight:      Constants.HIGHLIGHT_NEVER,
      confirmation:   Constants.CONFIRM_ALWAYS,
      block:          Constants.BLOCK_NEVER,
      itemsSource:    Constants.SOURCE_CONFIG,
      items:          [],
      itemsFile:      '',
      confirmTitle:   '',
      confirmMessage: '',
    },
    {
      id:             'builtInBlockedDomains',
      name:           browser.i18n.getMessage('config_blockedDomains_caption'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
      highlight:      Constants.HIGHLIGHT_NEVER,
      confirmation:   Constants.CONFIRM_NEVER,
      block:          Constants.BLOCK_ALWAYS,
      itemsSource:    Constants.SOURCE_CONFIG,
      items:          [],
      itemsFile:      '',
      confirmTitle:   '',
      confirmMessage: '',
    },
  ],

  attentionDomainsHighlightMode: Constants.HIGHLIGHT_ALWAYS,
  attentionDomainsConfirmationMode: Constants.CONFIRM_ALWAYS,
  attentionDomains: [],
  attentionDomainsSource: Constants.SOURCE_CONFIG,
  attentionDomainsFile: '',
  attentionDomainsDialogTitle: '',
  attentionDomainsDialogMessage: '',

  attentionSuffixesConfirm: false,
  attentionSuffixes: [],
  attentionSuffixesSource: Constants.SOURCE_CONFIG,
  attentionSuffixesFile: '',
  attentionSuffixesDialogTitle: '',
  attentionSuffixesDialogMessage: '',

  attentionSuffixes2Confirm: false,
  attentionSuffixes2: [],
  attentionSuffixes2Source: Constants.SOURCE_CONFIG,
  attentionSuffixes2File: '',
  attentionSuffixes2DialogTitle: '',
  attentionSuffixes2DialogMessage: '',

  attentionTermsConfirm: false,
  attentionTerms: [],
  attentionTermsSource: Constants.SOURCE_CONFIG,
  attentionTermsFile: '',
  attentionTermsDialogTitle: '',
  attentionTermsDialogMessage: '',

  blockedDomainsEnabled: false,
  blockedDomains: [],
  blockedDomainsSource: Constants.SOURCE_CONFIG,
  blockedDomainsFile: '',
  blockedDomainsDialogTitle: '',
  blockedDomainsDialogMessage: '',

  skipConfirmationForInternalMail: false,

  confirmMultipleRecipientDomains: false,
  minConfirmationRecipientsCount: 0,
  confirmMultipleRecipientDomainsDialogTitle: '',
  confirmMultipleRecipientDomainsDialogMessage: '',

  allowCheckAllInternals: true,
  allowCheckAllExternals: false,
  allowCheckAllAttachments: false,
  requireCheckSubject: false,
  requireCheckBody: false,
  requireCheckAttachment: true,
  requireReinputAttachmentNames: false,
  highlightExternalDomains: false,
  largeFontSizeForAddresses: false,
  alwaysLargeDialog: false,
  alwaysLargeDialogMinWidth: 680,
  emphasizeTopMessage: false,
  topMessage: '',
  emphasizeRecipientType: false,

  showCountdown: false,
  countdownSeconds: 5,
  countdownAllowSkip: true,

  showLastNameFirst: browser.i18n.getMessage('showLastNameFirst') == 'true', // simulates mail.addr_book.lastnamefirst

  confirmDialogWidth: 680,
  confirmDialogHeight: 600,
  confirmDialogLeft: null,
  confirmDialogTop: null,
  confirmDialogBoxSizes: null,

  countdownDialogWidth: 300,
  countdownDialogHeight: 130,
  countdownDialogLeft: null,
  countdownDialogTop: null,

  maxTooltipTextLength: 60,

  configsVersion: 0,
  debug: false,

  // obsolete keys (already migrated)
  blockedDomainDialogTitle:     null,
  blockedDomainDialogMessage:   null,
  attentionDomainDialogTitle:   null,
  attentionDomainDialogMessage: null,
  attentionSuffixDialogTitle:   null,
  attentionSuffixDialogMessage: null,

  ...OVERRIDE_DEFAULT_CONFIGS
}, {
  localKeys: [
    'debug'
  ]
});

export function log(message, ...args) {
  if (!configs || !configs.debug)
    return;

  const nest   = (new Error()).stack.split('\n').length;
  let indent = '';
  for (let i = 0; i < nest; i++) {
    indent += ' ';
  }
  console.log(`flex-confirm-mail: ${indent}${message}`, ...args);
}

export async function sendToHost(message) {
  try {
    const response = await browser.runtime.sendNativeMessage(Constants.HOST_ID, message);
    if (!response || typeof response != 'object')
      throw new Error(`invalid response: ${String(response)}`);
    return response;
  }
  catch(error) {
    log('Error: failed to get response for message', message, error);
    return null;
  }
}
