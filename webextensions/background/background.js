/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Dialog from '/extlib/dialog.js';
import RichConfirm from '/extlib/RichConfirm.js';

import {
  configs,
  log,
  readFile,
  clone,
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import { MatchingRules } from '/common/matching-rules.js';
import { RecipientClassifier } from '/common/recipient-classifier.js';

import * as ListUtils from './list-utils.js';

Dialog.setLogger(log);

const TYPE_NEWLY_COMPOSED   = 'new-message';
const TYPE_REPLY            = 'reply';
const TYPE_DRAFT            = 'draft';
const TYPE_TEMPLATE         = 'template';
const TYPE_EXISTING_MESSAGE = 'edit-as-new-message';

function getMessageSignature(message) {
  const author = message.from || message.author || '';
  const authorAddressMatched = author.match(/<([^>]+)>$/);
  return JSON.stringify({
    subject: message.subject || null,
    from: (authorAddressMatched ? authorAddressMatched[1] : author) || null,
    to: (message.to || message.recipients || []).sort(),
    cc: (message.cc || message.ccList || []).sort(),
    bcc: (message.bcc || message.bccList || []).sort()
  });
}


// There is no API to detect starting of a message composition,
// so we now wait for a message from a new composition content.
const mDetectedMessageTypeForTab = new Map();
const mDetectedClipboardStateForTab = new Map();
const mInitialSignatureForTab = new Map();
const mInitialSignatureForTabWithoutSubject = new Map();
const mLastContextMessagesForTab = new Map();
browser.runtime.onMessage.addListener((message, sender) => {
  switch (message && message.type) {
    case Constants.TYPE_COMPOSE_STARTED:
      log('TYPE_COMPOSE_STARTED received ', message, sender);
      browser.compose.getComposeDetails(sender.tab.id).then(async details => {
        const author = await getAddressFromIdentity(details.identityId);
        const signature = getMessageSignature({
          author,
          ...details
        });
        const signatureWithoutSubject = getMessageSignature({
          author,
          ...details,
          subject: null
        });
        const blankSignature = getMessageSignature({ author, subject: null, to: [], cc: [], bcc: [] });
        log('signature: ', signature);
        mInitialSignatureForTab.set(sender.tab.id, signature);
        mInitialSignatureForTabWithoutSubject.set(sender.tab.id, signatureWithoutSubject);
        const types = new Set(await getContainerFolderTypesFromSignature(signature));
        log('message types: ', types);
        const detectedType = (types.has('drafts') && !hasRecentlySavedDraftWithSignature(signature)) ?
          TYPE_DRAFT :
          types.has('templates') ?
            TYPE_TEMPLATE :
            (types.size > 0) ?
              TYPE_EXISTING_MESSAGE :
              (signature == blankSignature) ?
                TYPE_NEWLY_COMPOSED :
                TYPE_REPLY;
        log('detected type: ', detectedType)
        mDetectedMessageTypeForTab.set(sender.tab.id , detectedType);
        mLastContextMessagesForTab.delete(sender.tab.id);
      });
      break;

    case Constants.TYPE_COMPOSE_SOMETHING_COPIED:
      Promise.all([
        browser.compose.getComposeDetails(sender.tab.id),
        navigator.clipboard.readText(),
      ]).then(async results => {
        const [details, text] = results;
        const author = await getAddressFromIdentity(details.identityId);
        const messageSignature = getMessageSignature({author, ...details});
        configs.lastClipboardData = { messageSignature, text };
        log('configs.lastClipboardData updated by TYPE_COMPOSE_SOMETHING_COPIED: ', configs.lastClipboardData);
      });
      break;

    case Constants.TYPE_MESSAGE_DISPLAY_SOMETHING_COPIED:
      Promise.all([
        browser.messageDisplay.getDisplayedMessage(sender.tab.id),
        navigator.clipboard.readText(),
      ]).then(async results => {
        const [details, text] = results;
        const author = await getAddressFromIdentity(details.identityId);
        const messageSignature = getMessageSignature({author, ...details});
        configs.lastClipboardData = { messageSignature, text };
        log('configs.lastClipboardData updated by TYPE_MESSAGE_DISPLAY_SOMETHING_COPIED: ', configs.lastClipboardData);
      });
      break;

    case Constants.TYPE_COMPOSE_SOMETHING_PASTED:
      Promise.all([
        browser.compose.getComposeDetails(sender.tab.id),
        navigator.clipboard.readText(),
      ]).then(async results => {
        const [details, text] = results;
        const author = await getAddressFromIdentity(details.identityId);
        const messageSignature = getMessageSignature({author, ...details});
        const lastState = mDetectedClipboardStateForTab.get(sender.tab.id) || Constants.CLIPBOARD_STATE_SAFE;
        if (configs.lastClipboardData &&
            messageSignature != configs.lastClipboardData.messageSignature &&
            text == configs.lastClipboardData.text)
          mDetectedClipboardStateForTab.set(sender.tab.id, lastState | Constants.CLIPBOARD_STATE_PASTED_TO_DIFFERENT_SIGNATURE_MAIL);
        else if (configs.acceptablePastedTextLength >= 0 && text.length > configs.acceptablePastedTextLength)
          mDetectedClipboardStateForTab.set(sender.tab.id, lastState | Constants.CLIPBOARD_STATE_PASTED_TOO_LARGE_TEXT);
        log('pasted: new state => ', mDetectedClipboardStateForTab.get(sender.tab.id));
      });
      break;
  }
});
browser.composeScripts.register({
  js: [
    // This sends a Constants.TYPE_COMPOSE_STARTED message on load.
    { file: '/resources/compose.js' }
  ]
});
browser.messageDisplayScripts.register({
  js: [
    { file: '/resources/message-display.js' }
  ]
});

async function getAddressFromIdentity(id) {
  const accounts = await browser.accounts.list();
  for (const account of accounts) {
    for (const identity of account.identities) {
      if (identity.id == id)
        return identity.email;
    }
  }
  return null;
}

browser.menus.onShown.addListener((info, tab) => {
  const messages = info.selectedMessages && info.selectedMessages.messages;
  if (messages && messages.length > 0)
    mLastContextMessagesForTab.set(tab.id, messages);
  else
    mLastContextMessagesForTab.delete(tab.id);
});

// There is no API to detect that the compositing message was a draft, template or not,
// so we now find active tabs displaying messages with a signature same to the compositing message.
async function getContainerFolderTypesFromSignature(signature) {
  log('getContainerFolderTypesFromSignature: signature = ', signature);
  const mailTabs = await browser.mailTabs.query({});
  const results = await Promise.all(mailTabs.map(async mailTab => {
    const folder = mailTab.displayedFolder;
    log('getContainerFolderTypesFromSignature: mailTab = ', mailTab, folder);
    if (!folder)
      return false;

    const [displayMessage, selectedMessagesList] = await Promise.all([
      browser.messageDisplay.getDisplayedMessage(mailTab.id),
      browser.mailTabs.getSelectedMessages(mailTab.id).catch(_error => ({ messages: [] }))
    ]);
    const messages = [
      ...selectedMessagesList.messages,
      ...(mLastContextMessagesForTab.get(mailTab.id) || [])
    ];
    if (displayMessage)
      messages.push(displayMessage);
    log('getContainerFolderTypesFromSignature: messages = ', messages);
    for (const message of messages) {
      const testingSignature = getMessageSignature(message);
      if (testingSignature != signature)
        continue;
      log('message is found in the folder: ', folder, message);
      return folder.type;
    }
    return false;
  }));
  return results.filter(found => !!found);
}


// There is no API to detect that the compositing message was a draft or not,
// so we now check there is any recently saved draft with a signature same to the compositing message.
const mRecentlySavedDraftSignatures = new Set();
browser.messages.onNewMailReceived.addListener((folder, messages) => {
  if (folder.type != 'drafts')
    return;
  log('draft saved: ', messages);
  mRecentlySavedDraftSignatures.clear();
  for (const message of messages.messages) {
    mRecentlySavedDraftSignatures.add(getMessageSignature(message));
  }
});
function hasRecentlySavedDraftWithSignature(signature) {
  for (const savedSignature of mRecentlySavedDraftSignatures) {
    if (savedSignature == signature) {
      log('recently saved draft is matched to the editing message');
      return true;
    }
  }
  return false;
}


async function needConfirmationOnModified(tab, details) {
  const type = mDetectedMessageTypeForTab.get(tab.id);
  switch (type) {
    case TYPE_NEWLY_COMPOSED:
    case TYPE_DRAFT:
    case TYPE_TEMPLATE:
    case TYPE_EXISTING_MESSAGE:
      log('need confirmation: ', TYPE_NEWLY_COMPOSED);
      return true;

    default:
      break;
  }

  const clipboardState = mDetectedClipboardStateForTab.get(tab.id) || Constants.CLIPBOARD_STATE_SAFE;
  if (clipboardState & Constants.CLIPBOARD_STATE_UNSAFE) {
    log('need confirmation because unsafe text is pasted');
    return true;
  }

  const initialSignature = mInitialSignatureForTabWithoutSubject.get(tab.id);
  const author           = await getAddressFromIdentity(details.identityId);
  const currentSignature = getMessageSignature({ ...details, author, subject: null });
  log('signature check: ', { initialSignature, currentSignature });
  if (initialSignature &&
      currentSignature == initialSignature) {
    log('skip confirmation because recipients are not modified');
    return false;
  }

  log('need confirmation because recipients are modified');
  return true;
}


async function tryConfirm(tab, details, opener) {
  log('tryConfirm: ', tab, details, opener);
  const [
    to, cc, bcc,
  ] = await Promise.all([
    ListUtils.populateListAddresses(details.to),
    ListUtils.populateListAddresses(details.cc),
    ListUtils.populateListAddresses(details.bcc),
  ]);
  const classifier = new RecipientClassifier({
    internalDomains: configs.internalDomains || [],
  });
  const classifiedTo = classifier.classify(to);
  const classifiedCc = classifier.classify(cc);
  const classifiedBcc = classifier.classify(bcc);
  log('classified results: ', { classifiedTo, classifiedCc, classifiedBcc });

  const allInternals = new Set([
    ...classifiedTo.internals,
    ...classifiedCc.internals,
    ...classifiedBcc.internals
  ]);
  const allExternals = new Set([
    ...classifiedTo.externals,
    ...classifiedCc.externals,
    ...classifiedBcc.externals
  ]);
  if (configs.skipConfirmationForInternalMail &&
      allExternals.size == 0) {
    log('skip confirmation because there is no external recipient');
    return;
  }
  if (allInternals.size + allExternals.size <= configs.minConfirmationRecipientsCount) {
    log('skip confirmation because there is too few recipients ',
        allInternals.size + allExternals.size,
        '<=',
        configs.minRecipientsCount);
    return;
  }

  log('show confirmation ', tab, details);

  const dialogParams = {
    url:    '/dialog/confirm/confirm.html',
    modal:  !configs.debug,
    opener,
    width:  configs.confirmDialogWidth,
    height: configs.confirmDialogWidth
  };
  if (configs.alwaysLargeDialog) {
    dialogParams.width = Math.max(
      configs.alwaysLargeDialogMinWidth,
      Math.ceil(parseInt(screen.availWidth * 0.9) / 2)
    );
    dialogParams.height = parseInt(screen.availHeight * 0.9);
    dialogParams.left = parseInt((screen.availWidth - dialogParams.width) / 2);
    dialogParams.top = parseInt((screen.availHeight - dialogParams.height) / 2);
  }
  else {
    if (typeof configs.confirmDialogLeft == 'number')
      dialogParams.left = configs.confirmDialogLeft;
    if (typeof configs.confirmDialogTop == 'number')
      dialogParams.top = configs.confirmDialogTop;
  }

  return Dialog.open(
    dialogParams,
    {
      details,
      internals: [
        ...classifiedTo.internals.map(recipient => ({ ...recipient, type: 'To' })),
        ...classifiedCc.internals.map(recipient => ({ ...recipient, type: 'Cc' })),
        ...classifiedBcc.internals.map(recipient => ({ ...recipient, type: 'Bcc' }))
      ],
      externals: [
        ...classifiedTo.externals.map(recipient => ({ ...recipient, type: 'To' })),
        ...classifiedCc.externals.map(recipient => ({ ...recipient, type: 'Cc' })),
        ...classifiedBcc.externals.map(recipient => ({ ...recipient, type: 'Bcc' }))
      ],
      attachments: details.attachments || await browser.compose.listAttachments(tab.id),
    }
  );
}

async function shouldBlock(tab, details) {
  const matchingRules = new MatchingRules(configs);
  const [
    to, cc, bcc, attachments,
  ] = await Promise.all([
    ListUtils.populateListAddresses(details.to),
    ListUtils.populateListAddresses(details.cc),
    ListUtils.populateListAddresses(details.bcc),
    details.attachments || browser.compose.listAttachments(tab.id),
    matchingRules.populate(readFile),
  ]);

  const blocked = await matchingRules.tryBlock({
    recipients: [...to, ...cc, ...bcc],
    attachments,
    alert: async ({ title, message }) => {
      return RichConfirm.showInPopup(tab.windowId, {
        modal: !configs.debug,
        type:  'common-dialog',
        url:   '/resources/blank.html',
        title,
        message,
        buttons: [
          browser.i18n.getMessage('alertBlockedAccept'),
        ],
      });
    },
  });
  return blocked;
}


browser.compose.onBeforeSend.addListener(async (tab, details) => {
  await configs.$loaded;
  const composeWin = await browser.windows.get(tab.windowId);

  if (await shouldBlock(tab, details))
    return { cancel: true };

  switch (configs.confirmationMode) {
    case Constants.CONFIRMATION_MODE_NEVER:
      log('skip confirmation');
      break;

    default:
    case Constants.CONFIRMATION_MODE_ONLY_MODIFIED:
      if (!(await needConfirmationOnModified(tab, details)))
        break;
    case Constants.CONFIRMATION_MODE_ALWAYS: {
      try {
        await tryConfirm(tab, details, composeWin);
      }
      catch(error) {
        log('confirmation canceled ', error);
        return { cancel: true };
      }
    }; break;
  }

  if (configs.showCountdown) {
    log('show countdown');

    const dialogParams = {
      url:    '/dialog/countdown/countdown.html',
      modal:  !configs.debug,
      opener: composeWin,
      width:  configs.countdownDialogWidth,
      height: configs.countdownDialogHeight
    }
    if (typeof configs.countdownDialogLeft == 'number')
      dialogParams.left = configs.countdownDialogLeft;
    if (typeof configs.countdownDialogTop == 'number')
      dialogParams.top = configs.countdownDialogTop;

    try {
      await Dialog.open(dialogParams);
    }
    catch(error) {
      log('countdown canceled ', error);
      return { cancel: true };
    }
  }

  log('confirmed: OK to send');
  mDetectedMessageTypeForTab.delete(tab.id)
  mInitialSignatureForTab.delete(tab.id);
  mInitialSignatureForTabWithoutSubject.delete(tab.id);
  mRecentlySavedDraftSignatures.clear();
  mLastContextMessagesForTab.clear();
  return;
});


const CONFIGS_VERSION = 3;

configs.$loaded.then(async () => {
  switch (configs.configsVersion) {
    case 0:
      if (configs.blockedDomainDialogTitle && !configs.blockedDomainsDialogTitle)
        configs.blockedDomainsDialogTitle = configs.blockedDomainDialogTitle;
      if (configs.blockedDomainDialogMessage && !configs.blockedDomainsDialogMessage)
        configs.blockedDomainsDialogMessage = configs.blockedDomainDialogMessage;
      if (configs.attentionDomainDialogTitle && !configs.attentionDomainsDialogTitle)
        configs.attentionDomainsDialogTitle = configs.attentionDomainDialogTitle;
      if (configs.attentionDomainDialogMessage && !configs.attentionDomainsDialogMessage)
        configs.attentionDomainsDialogMessage = configs.attentionDomainDialogMessage;
      if (configs.attentionSuffixDialogTitle && !configs.attentionSuffixesDialogTitle)
        configs.attentionSuffixesDialogTitle = configs.attentionSuffixDialogTitle;
      if (configs.attentionSuffixDialogMessage && !configs.attentionSuffixesDialogMessage)
        configs.attentionSuffixesDialogMessage = configs.attentionSuffixDialogMessage;

    case 1: {
      const allLocalData = await browser.storage.local.get(null);
      if (!('attentionSuffixesConfirm' in allLocalData) &&
          (configs.attentionSuffixes.length > 0 ||
           configs.attentionSuffixesFile))
        configs.attentionSuffixesConfirm = true;
      if (!('attentionSuffixes2Confirm' in allLocalData) &&
          (configs.attentionSuffixes2.length > 0 ||
           configs.attentionSuffixes2File))
        configs.attentionSuffixes2Confirm = true;
      if (!('attentionTermsConfirm' in allLocalData) &&
          (configs.attentionTerms.length > 0 ||
           configs.attentionTermsFile))
        configs.attentionTermsConfirm = true;
      if (!('blockedDomainsEnabled' in allLocalData) &&
          (configs.blockedDomains.length > 0 ||
           configs.blockedDomainsFile))
        configs.blockedDomainsEnabled = true;
    }

    case 2: {
      const matchingRules = new MatchingRules(configs);
      const beforeUserRules = clone(matchingRules.exportUserRules());
      const migratedRules = {
        builtInAttentionDomains: {},
        builtInAttentionSuffixes: {},
        builtInAttentionSuffixes2: {},
        builtInAttentionTerms: {},
        builtInBlockedDomains: {},
      };

      if (configs.attentionDomainsHighlightMode !== null)
        migratedRules.builtInAttentionDomains.highlight = configs.attentionDomainsHighlightMode;
      if (configs.attentionDomainsConfirmationMode !== null)
        migratedRules.builtInAttentionDomains.action = configs.attentionDomainsConfirmationMode;
      if (configs.attentionDomains !== null)
        migratedRules.builtInAttentionDomains.itemsLocal = configs.attentionDomains;
      if (configs.attentionDomainsSource !== null)
        migratedRules.builtInAttentionDomains.itemsSource = configs.attentionDomainsSource;
      if (configs.attentionDomainsFile !== null)
        migratedRules.builtInAttentionDomains.itemsFile = configs.attentionDomainsFile;
      if (configs.attentionDomainsDialogTitle !== null)
        migratedRules.builtInAttentionDomains.dialogTitle = configs.attentionDomainsDialogTitle;
      if (configs.attentionDomainsDialogMessage !== null)
        migratedRules.builtInAttentionDomains.dialogMessage = configs.attentionDomainsDialogMessage;

      if (configs.attentionSuffixesConfirm !== null) {
        migratedRules.builtInAttentionSuffixes.enabled = true;
        migratedRules.builtInAttentionSuffixes.action = configs.attentionSuffixesConfirm ? Constants.ACTION_RECONFIRM_ONLY_EXTERNALS : Constants.ACTION_NONE;
      }
      if (configs.attentionSuffixes !== null)
        migratedRules.builtInAttentionSuffixes.itemsLocal = configs.attentionSuffixes;
      if (configs.attentionDomainsSource !== null)
        migratedRules.builtInAttentionSuffixes.itemsSource = configs.attentionSuffixesSource;
      if (configs.attentionDomainsFile !== null)
        migratedRules.builtInAttentionSuffixes.itemsFile = configs.attentionSuffixesFile;
      if (configs.attentionDomainsDialogTitle !== null)
        migratedRules.builtInAttentionSuffixes.dialogTitle = configs.attentionSuffixesDialogTitle;
      if (configs.attentionDomainsDialogMessage !== null)
        migratedRules.builtInAttentionSuffixes.dialogMessage = configs.attentionSuffixesDialogMessage;

      if (configs.attentionSuffixes2Confirm !== null) {
        migratedRules.builtInAttentionSuffixes2.enabled = true;
        migratedRules.builtInAttentionSuffixes2.action = configs.attentionSuffixes2Confirm ? Constants.ACTION_RECONFIRM_ONLY_EXTERNALS : Constants.ACTION_NONE;
      }
      if (configs.attentionSuffixes2 !== null)
        migratedRules.builtInAttentionSuffixes2.itemsLocal = configs.attentionSuffixes2;
      if (configs.attentionSuffixes2Source !== null)
        migratedRules.builtInAttentionSuffixes2.itemsSource = configs.attentionSuffixes2Source;
      if (configs.attentionSuffixes2File !== null)
        migratedRules.builtInAttentionSuffixes2.itemsFile = configs.attentionSuffixes2File;
      if (configs.attentionSuffixes2DialogTitle !== null)
        migratedRules.builtInAttentionSuffixes2.dialogTitle = configs.attentionSuffixes2DialogTitle;
      if (configs.attentionSuffixes2DialogMessage !== null)
        migratedRules.builtInAttentionSuffixes2.dialogMessage = configs.attentionSuffixes2DialogMessage;

      if (configs.attentionTermsConfirm !== null) {
        migratedRules.builtInAttentionTerms.enabled = true;
        migratedRules.builtInAttentionTerms.action = configs.attentionTermsConfirm ? Constants.ACTION_RECONFIRM_ONLY_EXTERNALS : Constants.ACTION_NONE;
      }
      if (configs.attentionTerms !== null)
        migratedRules.builtInAttentionTerms.itemsLocal = configs.attentionTerms;
      if (configs.attentionTermsSource !== null)
        migratedRules.builtInAttentionTerms.itemsSource = configs.attentionTermsSource;
      if (configs.attentionTermsFile !== null)
        migratedRules.builtInAttentionTerms.itemsFile = configs.attentionTermsFile;
      if (configs.attentionTermsDialogTitle !== null)
        migratedRules.builtInAttentionTerms.dialogTitle = configs.attentionTermsDialogTitle;
      if (configs.attentionTermsDialogMessage !== null)
        migratedRules.builtInAttentionTerms.dialogMessage = configs.attentionTermsDialogMessage;

      if (configs.blockedDomainsEnabled !== null) {
        migratedRules.builtInBlockedDomains.enabled = true;
        migratedRules.builtInBlockedDomains.action = configs.blockedDomainsEnabled ? Constants.ACTION_RECONFIRM_ALWAYS : Constants.ACTION_NONE;
      }
      if (configs.blockedDomains !== null)
        migratedRules.builtInBlockedDomains.itemsLocal = configs.blockedDomains;
      if (configs.blockedDomainsSource !== null)
        migratedRules.builtInBlockedDomains.itemsSource = configs.blockedDomainsSource;
      if (configs.blockedDomainsFile !== null)
        migratedRules.builtInBlockedDomains.itemsFile = configs.blockedDomainsFile;
      if (configs.blockedDomainsDialogTitle !== null)
        migratedRules.builtInBlockedDomains.dialogTitle = configs.blockedDomainsDialogTitle;
      if (configs.blockedDomainsDialogMessage !== null)
        migratedRules.builtInBlockedDomains.dialogMessage = configs.blockedDomainsDialogMessage;

      for (const [id, migratedProperties] of Object.entries(migratedRules)) {
        const rule = matchingRules.get(id);
        for (const [key, value] of Object.entries(migratedProperties)) {
          rule[key] = value;
        }
      }

      const exported = matchingRules.exportUserRules();
      if (JSON.stringify(beforeUserRules) != JSON.stringify(exported))
        configs.userRules = exported;
    }

    default:
      break;
  }

  if (configs.configsVersion != CONFIGS_VERSION)
    configs.configsVersion = CONFIGS_VERSION;
});
