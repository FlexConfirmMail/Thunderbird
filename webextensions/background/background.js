/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Dialog from '/extlib/dialog.js';

import {
  configs,
  log,
  sendToHost
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import { RecipientClassifier } from '/common/recipient-classifier.js';

import * as ListUtils from './list-utils.js';

Dialog.setLogger(log);


const BLANK_SIGNATURE = getMessageSignature({ to: [], cc: [], bcc: [] });

function getMessageSignature(message) {
  return JSON.stringify({
    to: (message.to || message.recipients).sort(),
    cc: (message.cc || message.ccList).sort(),
    bcc: (message.bcc || message.bccList).sort()
  });
}


// There is no API to detect starting of a message composition,
// so we now wait for a message from a new composition content.
const mInitialSignatureForTab = new Map();
browser.runtime.onMessage.addListener((message, sender) => {
  switch (message && message.type) {
    case Constants.TYPE_COMPOSE_STARTED:
      log('TYPE_COMPOSE_STARTED received');
      browser.compose.getComposeDetails(sender.tab.id).then(details => {
        mInitialSignatureForTab.set(sender.tab.id, getMessageSignature(details));
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

// There is no API to detect that the compositing message was a draft or not,
// so we now find active tabs displaying a draft with a signature same to the compositing message.
async function hasDraftWithSignature(signature) {
  const mailTabs = await browser.mailTabs.query({});
  const isDrafts = await Promise.all(mailTabs.map(async mailTab => {
    const displayMessage = await browser.messageDisplay.getDisplayedMessage(mailTab.id);
    if (!displayMessage)
      return false;
    if (!displayMessage.folder || displayMessage.folder.type != 'drafts')
      return false;
    const displaySignature = getMessageSignature(displayMessage);
    log(`mailTab ${mailTab.id} is the draft folder. `, {
      editing: displaySignature == signature
    });
    return displaySignature == signature;
  }));
  return [
    isDrafts.some(isDraft => !!isDraft),
    isDrafts.length > 0
  ];
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
  const initialSignature = mInitialSignatureForTab.get(tab.id) || BLANK_SIGNATURE;
  const hasSavedDraft = hasRecentlySavedDraftWithSignature(initialSignature);
  if (hasSavedDraft) {
    log('need confirmation because it is a recently saved draft');
    return true;
  }

  const [hasDraft, hasAnyDraftFolder] = await hasDraftWithSignature(initialSignature);
  if (!hasAnyDraftFolder) {
    log('need confirmation because it can be a draft');
    return true;
  }
  else if (hasDraft) {
    log('need confirmation because it is a draft');
    return true;
  }

  const currentSignature = getMessageSignature(details);
  if (currentSignature == initialSignature) {
    log('skip confirmation because recipients are not modified');
    return false;
  }

  log('recipients are modified');
  return true;
}


async function tryConfirm(tab, details, opener) {
  log('tryConfirm: ', tab, details, opener);
  const [
    to, cc, bcc,
    attentionDomains, attentionSuffixes, attentionNames
  ] = await Promise.all([
    ListUtils.populateListAddresses(details.to),
    ListUtils.populateListAddresses(details.cc),
    ListUtils.populateListAddresses(details.bcc),
    getAttentionDomains(),
    getAttentionSuffixes(),
    getAttentionNames()
  ]);
  log('attention list: ', { attentionDomains, attentionSuffixes, attentionNames });
  const classifier = new RecipientClassifier({
    internalDomains: configs.internalDomains || [],
    attentionDomains
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
      attachments: await browser.compose.listAttachments(tab.id),
      attentionDomains,
      attentionSuffixes,
      attentionNames
    }
  );
}

async function getAttentionDomains() {
  switch (configs.attentionDomainsSource) {
    default:
    case Constants.SOURCE_CONFIG:
      return configs.attentionDomains || [];

    case Constants.SOURCE_FILE: {
      if (!configs.attentionDomainsFile)
        return [];
      const response = await sendToHost({
        command: Constants.HOST_COMMAND_FETCH,
        params: {
          path: configs.attentionDomainsFile
        }
      });
      return response ? response.contents.trim().split(/[\s,|]+/).filter(part => !!part) : [];
    };
  }
}

async function getAttentionSuffixes() {
  switch (configs.attentionSuffixesSource) {
    default:
    case Constants.SOURCE_CONFIG:
      return configs.attentionSuffixes || [];

    case Constants.SOURCE_FILE: {
      if (!configs.attentionSuffixesFile)
        return [];
      const response = await sendToHost({
        command: Constants.HOST_COMMAND_FETCH,
        params: {
          path: configs.attentionSuffixesFile
        }
      });
      return response ? response.contents.trim().split(/[\s,|]+/).filter(part => !!part) : [];
    };
  }
}

async function getAttentionNames() {
  switch (configs.attentionNamesSource) {
    default:
    case Constants.SOURCE_CONFIG:
      return configs.attentionNames || [];

    case Constants.SOURCE_FILE: {
      if (!configs.attentionNamesFile)
        return [];
      const response = await sendToHost({
        command: Constants.HOST_COMMAND_FETCH,
        params: {
          path: configs.attentionNamesFile
        }
      });
      return response ? response.contents.trim().split(/[\s,|]+/).filter(part => !!part) : [];
    };
  }
}


browser.compose.onBeforeSend.addListener(async (tab, details) => {
  await configs.$loaded;
  const composeWin = await browser.windows.get(tab.windowId);

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
  mInitialSignatureForTab.delete(tab.id);
  mRecentlySavedDraftSignatures.clear();
  return;
});
