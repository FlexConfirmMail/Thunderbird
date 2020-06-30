/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs
} from '/common/common.js';

browser.compose.onBeforeSend.addListener(async (tab, details) => {
  console.log({ tab, details });

  if (!configs.showCountdown)
    return;

  const win = await browser.windows.create({
    type: 'popup',
    url: '/dialog/countdown/countdown.html'
  });
  const activeTab = win.tabs[0];

  return Promise.resolve({
    cancel: true
  });
});
