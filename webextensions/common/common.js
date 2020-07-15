/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';
import * as Constants from './constants.js';

export const configs = new Configs({
  confirmationMode: Constants.CONFIRMATION_MODE_ALWAYS,
  internalDomains: [],

  attentionDomainsHighlightMode: Constants.ATTENTION_HIGHLIGHT_MODE_ALWAYS,
  attentionDomainsConfirmationMode: Constants.ATTENTION_CONFIRMATION_MODE_ALWAYS,
  attentionDomains: [],
  attentionDomainsSource: Constants.SOURCE_CONFIG,
  attentionDomainsFile: '',

  attentionSuffixesConfirm: true,
  attentionSuffixes: [],
  attentionSuffixesSource: Constants.SOURCE_CONFIG,
  attentionSuffixesFile: '',

  confirmInternalMail: true,
  confirmMultipleRecipientDomains: false,
  minConfirmationRecipientsCount: 0,

  attentionDomainDialogTitle: '',
  attentionDomainDialogMessage: '',
  attentionSuffixDialogTitle: '',
  attentionSuffixDialogMessage: '',
  confirmMultipleRecipientDomainsDialogTitle: '',
  confirmMultipleRecipientDomainsDialogMessage: '',

  allowCheckAllInternals: true,
  allowCheckAllExternals: false,
  allowCheckAllAttachments: false,
  requireCheckSubject: false,
  requireCheckBody: false,
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
  debug: false
}, {
  localKeys: [
    'configsVersion',
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
