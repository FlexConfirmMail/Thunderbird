/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import '/extlib/l10n.js';

import {
  configs
} from '/common/common.js';

import * as Dialog from '/common/dialog.js';

let mParams;

const mTopMessage          = document.querySelector('#top-message');
const mInternalsAllCheck   = document.querySelector('#internalsAll');
const mInternalsTable      = document.querySelector('#internals');
const mExternalsAllCheck   = document.querySelector('#externalsAll');
const mExternalsTable      = document.querySelector('#externals');
const mSubjectCheck        = document.querySelector('#subject');
const mBodyCheck           = document.querySelector('#body');
const mBodyField           = document.querySelector('#bodyField');
const mAttachmentsAllCheck = document.querySelector('#attachmentsAll');
const mAttachmentsTable    = document.querySelector('#attachments');

configs.$loaded.then(async () => {
  mParams = await Dialog.getParams();

  mTopMessage.textContent = configs.topMessage;
  mTopMessage.classList.toggle('hidden', !configs.topMessage);

  mInternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllInternals);
  mExternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllExternals);
  mAttachmentsAllCheck.classList.toggle('hidden', !configs.allowCheckAllAttachments);
  mSubjectCheck.closest('p').classList.toggle('hidden', !configs.requireCheckSubject);
  mBodyCheck.closest('div').classList.toggle('hidden', !configs.requireCheckBody);

  Dialog.notifyReady();
});
