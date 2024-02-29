/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';
import * as Constants from './constants.js';
import * as Dialog from '/extlib/dialog.js';

const OVERRIDE_DEFAULT_CONFIGS = {}; /* Replace this for more customization on an enterprise use. */

export const configs = new Configs({
  confirmationMode: Constants.CONFIRMATION_MODE_ALWAYS,
  lastClipboardData: null,
  acceptablePastedTextLength: 100,
  internalDomains: [],
  fixedInternalDomains: [],

  /*
    Items of "baseRules", "overrideBaseRules", and "overrideRules" should have properties same to
    items of "userRules".
    FCM should work as:
      1. Load "baseRules" to a "merged object".
      2. Merge items and properties of "overrideBaseRules" to the merged object.
      3. Merge items and properties of "userRules" to the merged object.
      4. Merge items and properties of "overrideRules" to the merged object.
      5. Build options UI / do confirmation based on rules described in the merged object.
      6. Save values only changed from the baseRule to "userRules".
    So, company users (system admins) may lock "baseRules", "overrideBaseRules" and "overrideRules"
    with partial properties to provide fixed fields.
    For more detailed behaviors, see "matching-rules.js".
  */
  allowAddRules: true, // don't expose this to the options UI!
  allowRemoveRules: true, // don't expose this to the options UI!
  allowRearrangeRules: true, // don't expose this to the options UI!
  baseRules: [ // don't expose this to the options UI!
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
      highlight:      Constants.HIGHLIGHT_ONLY_EXTERNALS,
      action:         Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
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
      highlight:      Constants.HIGHLIGHT_ONLY_EXTERNALS,
      action:         Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
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
      highlight:      Constants.HIGHLIGHT_ONLY_EXTERNALS,
      action:         Constants.ACTION_RECONFIRM_ONLY_EXTERNALS,
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
  overrideBaseRules: [], // don't expose this to the options UI!
  overrideRules: [ // don't expose this to the options UI!
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
  ],
  userRules: [],

  attentionDomainsHighlightMode: null,
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
  minConfirmMultipleRecipientDomainsCount: 2,
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
  emphasizeNewDomainRecipients: true,

  showCountdown: false,
  countdownSeconds: 5,
  countdownAllowSkip: true,

  showLastNameFirst: browser.i18n.getMessage('showLastNameFirst') == 'true', // simulates mail.addr_book.lastnamefirst

  confirmDialogFields: [
    Constants.CONFIRMATION_FIELD_INTERNALS,
    Constants.CONFIRMATION_FIELD_EXTERNALS,
    Constants.CONFIRMATION_FIELD_SUBJECT,
    Constants.CONFIRMATION_FIELD_BODY,
    Constants.CONFIRMATION_FIELD_ATTACHMENTS,
  ],

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
  const timestamp = new Date().toLocaleString();
  console.log(`${timestamp} flex-confirm-mail: ${indent}${message}`, ...args);
}

Dialog.setLogger(log);

export async function sendToHost(message) {
  try {
    message.logging = message.logging && configs.debug;
    message.debug = message.debug && configs.debug;
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


function applyOutlookGPOConfig(response, key) {
  const defaultValue = response.Default || {};
  const lockedValue = response.Locked || {};
  const remoteKey = `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const localKey = `${key.charAt(0).toLowerCase()}${key.slice(1)}`;
  log(`applyOutlookGPOConfigRuleItems: ${localKey} from ${remoteKey}`, {
    default:    defaultValue[remoteKey],
    hasDefault: defaultValue[`Has${remoteKey}`],
    locked:     lockedValue[remoteKey],
    hasLocked:  lockedValue[`Has${remoteKey}`],
  });
  if (defaultValue[`Has${remoteKey}`]) {
    configs.$default[localKey] = defaultValue[remoteKey];
    log(`=> setting as default value: ${localKey} = `, defaultValue[remoteKey]);
  }
  if (lockedValue[`Has${remoteKey}`]) {
    configs[localKey] = lockedValue[remoteKey];
    configs.$lock(localKey);
    log(`=> setting as locked value: ${localKey} = `, lockedValue[remoteKey]);
  }
}

function applyOutlookGPOConfigRuleItems(response, id) {
  const defaultValue = response.Default || {};
  const lockedValue = response.Locked || {};
  const remoteKey = `${id.charAt(0).toUpperCase()}${id.slice(1)}Items`;
  log(`applyOutlookGPOConfigRuleItems: ${id} from ${remoteKey}`, {
    default:    defaultValue[remoteKey],
    hasDefault: defaultValue[`Has${remoteKey}`],
    locked:     lockedValue[remoteKey],
    hasLocked:  lockedValue[`Has${remoteKey}`],
  });
  if (defaultValue[`Has${remoteKey}`]) {
    const overrideBaseRules = clone(configs.overrideBaseRules || []);
    const overrideBaseRule  = overrideBaseRules.find(rule => rule && rule.id == id);
    const baseRules = clone(configs.baseRules || []);
    const baseRule  = baseRules.find(rule => rule && rule.id == id);
    const userRules = clone(configs.userRules || []);
    const userRule  = userRules.find(rule => rule && rule.id == id);
    const itemsLocal = defaultValue[remoteKey] || [];
    const stringifiedItemsLocal = itemsLocal;
    log('overrideBaseRule = ', overrideBaseRule);
    log('baseRule = ', baseRule);
    log('userRule = ', userRule);
    const userRuleItems = userRule ? JSON.stringify(userRule.itemsLocal) : [];
    const userRuleSameToOldDefault = (
      userRule &&
      ((baseRule &&
        userRuleItems == JSON.stringify(baseRule.itemsLocal) ||
       (overrideBaseRule &&
        userRuleItems == JSON.stringify(overrideBaseRule.itemsLocal))))
    );
    log('userRuleSameToOldDefault = ', userRuleSameToOldDefault);
    let needUpdateUserRule = false;
    if (overrideBaseRule) {
      log('apply to overrideBaseRule');
      needUpdateUserRule = userRule && stringifiedItemsLocal != JSON.stringify(overrideBaseRule.itemsLocal);
      overrideBaseRule.itemsLocal = itemsLocal;
      overrideBaseRule.enabled = true;
      configs.overrideBaseRules = overrideBaseRules;
    }
    else if (baseRule) {
      log('apply to baseRule');
      needUpdateUserRule = userRule && stringifiedItemsLocal != JSON.stringify(baseRule.itemsLocal);
      baseRule.itemsLocal = itemsLocal;
      baseRule.enabled = true;
      configs.baseRules = baseRules;
    }
    else {
      log('apply to overrideBaseRules');
      configs.overrideBaseRules = [
        ...overrideBaseRules,
        {
          id:      id,
          enabled: true,
          itemsLocal,
        },
      ];
    }
    log('needUpdateUserRule: ', needUpdateUserRule);
    if (userRule &&
        userRuleSameToOldDefault &&
        needUpdateUserRule) {
      log('updating userRule');
      userRule.itemsLocal = itemsLocal;
      if (itemsLocal.length > 0)
        userRule.enabled = true;
      configs.userRules = userRules;
    }
  }
  if (lockedValue[`Has${remoteKey}`]) {
    const overrideRules = clone(configs.overrideRules || []);
    const overrideRule = configs.overrideRules.find(rule => rule && rule.id == id);
    const itemsLocal = lockedValue[remoteKey] || [];
    log('overrideRule = ', overrideRule);
    if (overrideRule) {
      overrideRule.itemsLocal = itemsLocal;
      overrideRule.enabled = true;
      configs.overrideRules = overrideRules;
    }
    else {
      configs.overrideRules = [
        ...overrideRules,
        {
          id:      id,
          enabled: true,
          itemsLocal,
        },
      ];
    }
  }
}

export async function applyOutlookGPOConfigs() {
  const response = await sendToHost({
    command: Constants.HOST_COMMAND_FETCH_OUTLOOK_GPO_CONFIGS,
  });
  log('applyOutlookGPOConfigs ', response);
  if (!response)
    return;

  applyOutlookGPOConfig(response, 'countdownAllowSkip');
  applyOutlookGPOConfig(response, 'showCountdown');
  applyOutlookGPOConfig(response, 'countdownSeconds');
  applyOutlookGPOConfig(response, 'skipConfirmationForInternalMail');
  applyOutlookGPOConfig(response, 'confirmMultipleRecipientDomains');
  applyOutlookGPOConfig(response, 'minConfirmMultipleRecipientDomainsCount');
  applyOutlookGPOConfig(response, 'fixedInternalDomains');
  applyOutlookGPOConfigRuleItems(response, 'builtInAttentionDomains');
  applyOutlookGPOConfigRuleItems(response, 'builtInAttentionTerms');
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
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function clone(object) {
  return JSON.parse(JSON.stringify(object));
}
