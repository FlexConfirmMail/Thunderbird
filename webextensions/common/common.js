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
    Items of "baseRules" and "overrideRules" should have properties same to
    items of "userRules".
    FCM should work as:
      1. Load "baseRules" to a "merged object".
      2. Merge items and properties of "userRules" to the merged object.
      3. Merge items and properties of "overrideRules" to the merged object.
      4. Build options UI / do confirmation based on rules described in the merged object.
      5. Save values only changed from the baseRule to "userRules".
    So, company users (system admins) may lock "baseRules" and "overrideRules"
    with partial properties to provide fixed fields.
    For more detailed behaviors, see "matching-rules.js".
  */
  allowAddRules: true, // don't expose this to the options UI!
  allowRemoveRules: true, // don't expose this to the options UI!
  allowRearrangeRules: true, // don't expose this to the options UI!
  baseRules: [], // don't expose this to the options UI!
  overrideRules: [
    /*
    {
      id:             'builtInAttentionDomains',
      name:           browser.i18n.getMessage('config_attentionDomains_caption'),
      enabled:        true,
      matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
      itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
    },
    {
      id:             'builtInAttentionSuffixes',
      name:           browser.i18n.getMessage('config_attentionSuffixesConfirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_SUFFIX,
      itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
      confirmMessage: browser.i18n.getMessage('confirmAttentionSuffixesTitle', ['%S']),
    },
    {
      id:             'builtInAttentionSuffixes2',
      name:           browser.i18n.getMessage('config_attentionSuffixes2Confirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_SUFFIX,
      confirmMessage: browser.i18n.getMessage('confirmAttentionSuffixes2Message', ['%S']),
    },
    {
      id:             'builtInAttentionTerms',
      name:           browser.i18n.getMessage('config_attentionTermsConfirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_NAME,
      highlight:      Constants.HIGHLIGHT_NEVER,
    },
    {
      id:             'builtInBlockedDomains',
      name:           browser.i18n.getMessage('config_blockedDomains_caption'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
      action:         Constants.ACTION_BLOCK,
      confirmMessage: browser.i18n.getMessage('alertBlockedDomainsMessage', ['%S']),
    },
    */
  ], // don't expose this to the options UI!
  userRules: [
    {
      id:             'builtInAttentionDomains',
      name:           browser.i18n.getMessage('config_attentionDomains_caption'),
      enabled:        true,
      matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
      highlight:      Constants.HIGHLIGHT_ALWAYS,
      action:         Constants.ACTION_RECONFIRM_ALWAYS,
      itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
      itemsLocal:     [],
      itemsFile:      '',
      confirmTitle:   browser.i18n.getMessage('confirmAttentionDomainsTitle'),
      confirmMessage: browser.i18n.getMessage('confirmAttentionDomainsMessage', ['%S']),
    },
    {
      id:             'builtInAttentionSuffixes',
      name:           browser.i18n.getMessage('config_attentionSuffixesConfirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_SUFFIX,
      highlight:      Constants.HIGHLIGHT_NEVER,
      action:         Constants.ACTION_RECONFIRM_ALWAYS,
      itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
      itemsLocal:     [],
      itemsFile:      '',
      confirmTitle:   browser.i18n.getMessage('confirmAttentionSuffixesTitle'),
      confirmMessage: browser.i18n.getMessage('confirmAttentionSuffixesMessage', ['%S']),
    },
    {
      id:             'builtInAttentionSuffixes2',
      name:           browser.i18n.getMessage('config_attentionSuffixes2Confirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_SUFFIX,
      highlight:      Constants.HIGHLIGHT_NEVER,
      action:         Constants.ACTION_RECONFIRM_ALWAYS,
      itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
      itemsLocal:     [],
      itemsFile:      '',
      confirmTitle:   browser.i18n.getMessage('confirmAttentionSuffixes2Title'),
      confirmMessage: browser.i18n.getMessage('confirmAttentionSuffixes2Message', ['%S']),
    },
    {
      id:             'builtInAttentionTerms',
      name:           browser.i18n.getMessage('config_attentionTermsConfirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_NAME,
      highlight:      Constants.HIGHLIGHT_NEVER,
      action:         Constants.ACTION_RECONFIRM_ALWAYS,
      itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
      itemsLocal:     [],
      itemsFile:      '',
      confirmTitle:   browser.i18n.getMessage('confirmAttentionTermsTitle'),
      confirmMessage: browser.i18n.getMessage('confirmAttentionTermsMessage', ['%S']),
    },
    {
      id:             'builtInBlockedDomains',
      name:           browser.i18n.getMessage('config_blockedDomains_caption'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_RECIPIENT_DOMAIN,
      highlight:      Constants.HIGHLIGHT_NEVER,
      action:         Constants.ACTION_BLOCK_ALWAYS,
      itemsSource:    Constants.SOURCE_LOCAL_CONFIG,
      itemsLocal:     [],
      itemsFile:      '',
      confirmTitle:   browser.i18n.getMessage('alertBlockedDomainsTitle'),
      confirmMessage: browser.i18n.getMessage('alertBlockedDomainsMessage', ['%S']),
    },
  ],

  c: null,
  attentionDomainsConfirmationMode: null,
  attentionDomains: null,
  attentionDomainsSource: null,
  attentionDomainsFile: null,
  attentionDomainsDialogTitle: null,
  attentionDomainsDialogMessage: null,

  attentionSuffixesConfirm: null,
  attentionSuffixes: null,
  attentionSuffixesSource: null,
  attentionSuffixesFile: null,
  attentionSuffixesDialogTitle: null,
  attentionSuffixesDialogMessage: null,

  attentionSuffixes2Confirm: null,
  attentionSuffixes2: null,
  attentionSuffixes2Source: null,
  attentionSuffixes2File: null,
  attentionSuffixes2DialogTitle: null,
  attentionSuffixes2DialogMessage: null,

  attentionTermsConfirm: null,
  attentionTerms: null,
  attentionTermsSource: null,
  attentionTermsFile: null,
  attentionTermsDialogTitle: null,
  attentionTermsDialogMessage: null,

  blockedDomainsEnabled: null,
  blockedDomains: null,
  blockedDomainsSource: null,
  blockedDomainsFile: null,
  blockedDomainsDialogTitle: null,
  blockedDomainsDialogMessage: null,

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

export async function readFile(path) {
  const response = await sendToHost({
    command: Constants.HOST_COMMAND_FETCH,
    params: { path },
  });
  return response && response.contents;
}


export function toDOMDocumentFragment(source, parent) {
  const range = document.createRange();
  range.selectNodeContents(parent);
  range.collapse(false);
  const fragment = range.createContextualFragment(source.trim());
  range.detach();
  return fragment;
}

export function sanitizeForHTMLText(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function clone(object) {
  return JSON.parse(JSON.stringify(object));
}
