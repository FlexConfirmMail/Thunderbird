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

const mOriginalDetails = new Map();

browser.runtime.onMessage.addListener((message, sender) => {
  switch (message && message.type) {
    case Constants.TYPE_COMPOSE_STARTED:
      browser.compose.getComposeDetails(sender.tab.id).then(details => {
        mOriginalDetails.set(sender.tab.id, details);
      });
      break;
  }
});

browser.compose.onBeforeSend.addListener(async (tab, details) => {
  switch (configs.confirmationMode) {
    case Constants.CONFIRMATION_MODE_NEVER:
      log('skip confirmation');
      break;

    default:
    case Constants.CONFIRMATION_MODE_ONLY_MODIFIED: {
      const originalDetails = mOriginalDetails.get(tab.id) || { to: [], cc: [], bcc: [] };
      const initialRecipients = JSON.stringify({
        to: originalDetails.to.sort(),
        cc: originalDetails.cc.sort(),
        bcc: originalDetails.bcc.sort()
      });

      const mailTabs = await browser.mailTabs.query({});
      const isDrafts = await Promise.all(mailTabs.map(async mailTab => {
        const displayMessage = await browser.messageDisplay.getDisplayedMessage(mailTab.id);
        if (!displayMessage)
          return false;
        if (!displayMessage.folder || displayMessage.folder.type != 'drafts')
          return false;
        const recipients = JSON.stringify({
          to: displayMessage.recipients.sort(),
          cc: displayMessage.ccList.sort(),
          bcc: displayMessage.bccList.sort()
        });
        log(`mailTab ${mailTab.id} is the draft folder. `, {
          editing: recipients == initialRecipients,
          recipients,
          initialRecipients
        });
        return recipients == initialRecipients;
      }));
        log('isDrafts ', isDrafts);

      if (isDrafts.length == 0) {
        log('need confirmation because it can be a draft');
      }
      else if (isDrafts.some(isDraft => !!isDraft)) {
        log('need confirmation because it is a draft');
      }
      else {
        const currentRecipients = JSON.stringify({
          to: details.to.sort(),
          cc: details.cc.sort(),
          bcc: details.bcc.sort()
        });
        if (initialRecipients == currentRecipients) {
          log('skip confirmation because recipients are not modified');
          break;
        }
        log('recipients are modified');
      }
    };
    case Constants.CONFIRMATION_MODE_ALWAYS: {
      const [to, cc, bcc] = await Promise.all([
        ListUtils.populateListAddresses(details.to),
        ListUtils.populateListAddresses(details.cc),
        ListUtils.populateListAddresses(details.bcc)
      ]);
      details.to = RecipientClassifier.classify(to, configs.internalDomains);
      details.cc = RecipientClassifier.classify(cc, configs.internalDomains);
      details.bcc = RecipientClassifier.classify(bcc, configs.internalDomains);
      log('show confirmation ', tab, details);
    }; break;
  }

  if (configs.showCountdown) {
    log('show countdown');
    try {
      await Dialog.open('/dialog/countdown/countdown.html');
    }
    catch(error) {
      log('countdown canceled ', error);
      return { cancel: true };
    }
  }

  log('confirmed: OK to send');
  mOriginalDetails.delete(tab.id);
  return;
});

browser.composeScripts.register({
  js: [
    { file: '/resources/compose.js' }
  ]
});
