/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  log
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import * as Dialog from '/common/dialog.js';

import * as ListUtils from './list-utils.js';
import * as RecipientClassifier from './recipient-classifier.js';


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


async function tryConfirm(tab, details) {
  const [to, cc, bcc] = await Promise.all([
    ListUtils.populateListAddresses(details.to),
    ListUtils.populateListAddresses(details.cc),
    ListUtils.populateListAddresses(details.bcc)
  ]);
  const classifiedTo = RecipientClassifier.classify(to, configs.internalDomains);
  const classifiedCc = RecipientClassifier.classify(cc, configs.internalDomains);
  const classifiedBcc = RecipientClassifier.classify(bcc, configs.internalDomains);

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
  if (configs.confirmInternalMail &&
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
  return Dialog.open(
    {
      url: '/dialog/confirm/confirm.html'
    },
    {
      details,
      internals: [
        ...classifiedTo.internals.map(address => ({ type: 'To', address })),
        ...classifiedCc.internals.map(address => ({ type: 'Cc', address })),
        ...classifiedBcc.internals.map(address => ({ type: 'Bcc', address }))
      ],
      externals: [
        ...classifiedTo.externals.map(address => ({ type: 'To', address })),
        ...classifiedCc.externals.map(address => ({ type: 'Cc', address })),
        ...classifiedBcc.externals.map(address => ({ type: 'Bcc', address }))
      ]
    }
  );
}


browser.compose.onBeforeSend.addListener(async (tab, details) => {
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
        await tryConfirm(tab, details);
      }
      catch(error) {
        log('confirmation canceled ', error);
        return { cancel: true };
      }
    }; break;
  }

  if (configs.showCountdown) {
    log('show countdown');
    try {
      await Dialog.open({
        url: '/dialog/countdown/countdown.html'
      });
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
