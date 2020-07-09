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
      const currentRecipients = JSON.stringify({
        to: details.to.sort(),
        cc: details.cc.sort(),
        bcc: details.bcc.sort()
      });
      if (initialRecipients == currentRecipients) {
        log('skip confirmation because recipients are not modified');
        break;
      }
      console.log('recipients are modified');
    };
    case Constants.CONFIRMATION_MODE_ALWAYS:
      details.to = await ListUtils.populateListAddresses(details.to);
      details.cc = await ListUtils.populateListAddresses(details.cc);
      details.bcc = await ListUtils.populateListAddresses(details.bcc);
      log('show confirmation ', tab, details);
      break;
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
