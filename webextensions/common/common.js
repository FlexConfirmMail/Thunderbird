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
    Elements of "baseRules" and "overrideRules" should have properties same to
    elements of "userRules".
    FCM should work as:
      1. Load "baseRules" to a "merged object".
      2. Merge items and properties of "userRules" to the merged object.
      3. Merge items and properties of "overrideRules" to the merged object.
      4. Build options UI / do confirmation based on rules described in the merged object.
      5. Save values only changed from the baseRule to "userRules".
    So, company users (system admins) may lock "baseRules" and "overrideRules"
    with partial properties to provide fixed fields.
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
      confirmMessage: browser.i18n.getMessage('confirmAttentionSuffixesTitle', ['$S']),
    },
    {
      id:             'builtInAttentionSuffixes2',
      name:           browser.i18n.getMessage('config_attentionSuffixes2Confirm_label'),
      enabled:        false,
      matchTarget:    Constants.MATCH_TO_ATTACHMENT_SUFFIX,
      confirmMessage: browser.i18n.getMessage('confirmAttentionSuffixes2Message', ['$S']),
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
      confirmMessage: browser.i18n.getMessage('alertBlockedDomainsMessage', ['$S']),
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
      confirmMessage: browser.i18n.getMessage('confirmAttentionDomainsMessage', ['$S']),
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
      confirmMessage: browser.i18n.getMessage('confirmAttentionSuffixesMessage', ['$S']),
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
      confirmMessage: browser.i18n.getMessage('confirmAttentionSuffixes2Message', ['$S']),
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
      confirmMessage: browser.i18n.getMessage('confirmAttentionTermsMessage', ['$S']),
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
      confirmMessage: browser.i18n.getMessage('alertBlockedDomainsMessage', ['$S']),
    },
  ],

  attentionDomainsHighlightMode: Constants.HIGHLIGHT_ALWAYS,
  attentionDomainsConfirmationMode: Constants.ACTION_RECONFIRM_ALWAYS,
  attentionDomains: [],
  attentionDomainsSource: Constants.SOURCE_LOCAL_CONFIG,
  attentionDomainsFile: '',
  attentionDomainsDialogTitle: '',
  attentionDomainsDialogMessage: '',

  attentionSuffixesConfirm: false,
  attentionSuffixes: [],
  attentionSuffixesSource: Constants.SOURCE_LOCAL_CONFIG,
  attentionSuffixesFile: '',
  attentionSuffixesDialogTitle: '',
  attentionSuffixesDialogMessage: '',

  attentionSuffixes2Confirm: false,
  attentionSuffixes2: [],
  attentionSuffixes2Source: Constants.SOURCE_LOCAL_CONFIG,
  attentionSuffixes2File: '',
  attentionSuffixes2DialogTitle: '',
  attentionSuffixes2DialogMessage: '',

  attentionTermsConfirm: false,
  attentionTerms: [],
  attentionTermsSource: Constants.SOURCE_LOCAL_CONFIG,
  attentionTermsFile: '',
  attentionTermsDialogTitle: '',
  attentionTermsDialogMessage: '',

  blockedDomainsEnabled: false,
  blockedDomains: [],
  blockedDomainsSource: Constants.SOURCE_LOCAL_CONFIG,
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

export function loadUserRules() {
  const mergedRules     = [];
  const mergedRulesById = {};
  for (const rules of [configs.baseRules, configs.userRules, configs.overrideRules]) {
    const locked = rules === configs.overrideRules;
    for (const rule of rules) {
      const id = rule.id;
      if (!id)
        continue;
      let merged = mergedRulesById[id];
      if (!merged) {
        merged = mergedRulesById[id] = {
          ...JSON.parse(JSON.stringify(Constants.BASE_RULE)),
          id,
          $lockedKeys: [],
        };
        mergedRules.push(merged);
      }
      Object.assign(merged, rule);
      if (locked) {
        merged.$lockedKeys.push(...Object.keys(rule).filter(key => key != 'id'));
      }
    }
  }
  return [mergedRules, mergedRulesById];
}

export async function loadPopulatedUserRules() {
  const [userRules, userRulesById] = loadUserRules();
  await Promise.all(userRules.map(async rule => {
    let items = [];
    switch (rule.itemsSource) {
      default:
      case Constants.SOURCE_LOCAL_CONFIG:
        items = rule.itemsLocal || [];
        break;

      case Constants.SOURCE_FILE: {
        if (!rule.itemsFile) {
          items = [];
        }
        else {
          const response = await sendToHost({
            command: Constants.HOST_COMMAND_FETCH,
            params: {
              path: rule.itemsFile
            }
          });
          items = response ? response.contents.trim().split(/[\s,|]+/).filter(part => !!part) : [];
        }
        break;
      };
    }
    userRulesById[rule.id].items = items;
  }));
  return [userRules, userRulesById];
}

export function saveUserRules(rules) {
  const baseRulesById = {};
  for (const rule of configs.baseRules) {
    baseRulesById[rule.id] = rule;
  }

  const toBeSavedRules = [];
  const toBeSavedRulesById = {};
  for (const rule of rules) {
    const toBeSaved = toBeSavedRulesById[rule.id] = {};
    Object.assign(toBeSaved, rule);
    delete toBeSaved.$lockedKeys;

    const baseRule = baseRulesById[rule.id];
    if (baseRule) {
      for (const [key, value] of Object.entries(baseRule)) {
        if (key == 'id')
          continue;
        if (JSON.stringify(toBeSaved[key]) == JSON.stringify(value))
          delete toBeSaved[key];
      }
    }

    if (Object.keys(toBeSaved).length > 1)
      toBeSavedRules.push(toBeSaved);
  }

  configs.userRules = toBeSavedRules;
}

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

export function sanitizeRegExpSource(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function clone(object) {
  return JSON.parse(JSON.stringify(object));
}
