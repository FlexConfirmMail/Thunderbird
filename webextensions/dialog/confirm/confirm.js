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
const mSubjectField        = document.querySelector('#subjectField');
const mBodyCheck           = document.querySelector('#body');
const mBodyField           = document.querySelector('#bodyField');
const mAttachmentsAllCheck = document.querySelector('#attachmentsAll');
const mAttachmentsTable    = document.querySelector('#attachments');
const mAcceptButton        = document.querySelector('#accept');
const mCancelButton        = document.querySelector('#cancel');

configs.$loaded.then(async () => {
  mParams = await Dialog.getParams();

  mTopMessage.textContent = configs.topMessage;
  mTopMessage.classList.toggle('hidden', !configs.topMessage);

  mInternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllInternals);
  mInternalsAllCheck.addEventListener('change', _event => {
    checkAll(mInternalsTable, mInternalsAllCheck.checked);
  });
  mInternalsTable.addEventListener('change', _event => {
    mInternalsAllCheck.checked = isAllChecked(mInternalsTable);
  });

  mExternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllExternals);
  mExternalsAllCheck.addEventListener('change', _event => {
    checkAll(mExternalsTable, mExternalsAllCheck.checked);
  });
  mExternalsTable.addEventListener('change', _event => {
    mExternalsAllCheck.checked = isAllChecked(mExternalsTable);
  });

  mSubjectCheck.closest('p').classList.toggle('hidden', !configs.requireCheckSubject);
  mSubjectField.textContent = mParams.details.subject;

  mBodyCheck.closest('div').classList.toggle('hidden', !configs.requireCheckBody);
  mBodyField.src = `data:text/html,${encodeURIComponent(mParams.details.body)}`;

  mAttachmentsAllCheck.classList.toggle('hidden', !configs.allowCheckAllAttachments);
  mAttachmentsAllCheck.addEventListener('change', _event => {
    checkAll(mAttachmentsTable, mAttachmentsAllCheck.checked);
  });
  mAttachmentsTable.addEventListener('change', _event => {
    mAttachmentsAllCheck.checked = isAllChecked(mAttachmentsTable);
  });

  mAcceptButton.disabled = !isAllChecked();
  document.addEventListener('change', _event => {
    mAcceptButton.disabled = !isAllChecked();
  });

  Dialog.initButton(mAcceptButton, _event => {
    if (!isAllChecked())
      return;
    Dialog.accept();
  });
  Dialog.initCancelButton(mCancelButton);

  Dialog.notifyReady();
});

function checkAll(container, checked) {
  for (const checkbox of container.querySelectorAll('input[type="checkbox"]')) {
    checkbox.checked = checked;
  }
}

function isAllChecked(container = document) {
  for (const checkbox of container.querySelectorAll('input[type="checkbox"]')) {
    if (checkbox.classList.contains('hidden') ||
        checkbox.closest('.hidden'))
      continue;
    if (!checkbox.checked)
      return false;
  }
  return true;
}
