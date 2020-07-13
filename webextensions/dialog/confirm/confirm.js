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
const mInternalsList       = document.querySelector('#internals');
const mExternalsAllCheck   = document.querySelector('#externalsAll');
const mExternalsList       = document.querySelector('#externals');
const mSubjectCheck        = document.querySelector('#subject');
const mSubjectField        = document.querySelector('#subjectField');
const mBodyCheck           = document.querySelector('#body');
const mBodyField           = document.querySelector('#bodyField');
const mAttachmentsAllCheck = document.querySelector('#attachmentsAll');
const mAttachmentsList     = document.querySelector('#attachments');
const mAcceptButton        = document.querySelector('#accept');
const mCancelButton        = document.querySelector('#cancel');

configs.$loaded.then(async () => {
  mParams = await Dialog.getParams();

  mTopMessage.textContent = configs.topMessage;
  mTopMessage.classList.toggle('hidden', !configs.topMessage);

  initInternals();
  initExternals();
  initBodyBlock();
  initAttachments();

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

function initInternals() {
  mInternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllInternals);
  mInternalsAllCheck.addEventListener('change', _event => {
    checkAll(mInternalsList, mInternalsAllCheck.checked);
  });
  mInternalsList.addEventListener('change', _event => {
    mInternalsAllCheck.checked = isAllChecked(mInternalsList);
  });
  for (const recipient of mParams.internals) {
    mInternalsList.appendChild(createRecipientRow(recipient.type, recipient.address));
  }
}

function initExternals() {
  mExternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllExternals);
  mExternalsAllCheck.addEventListener('change', _event => {
    checkAll(mExternalsList, mExternalsAllCheck.checked);
  });
  mExternalsList.addEventListener('change', _event => {
    mExternalsAllCheck.checked = isAllChecked(mExternalsList);
  });
  for (const recipient of mParams.externals) {
    mExternalsList.appendChild(createRecipientRow(recipient.type, recipient.address));
  }
}

function initBodyBlock() {
  mSubjectCheck.closest('p').classList.toggle('hidden', !configs.requireCheckSubject);
  mSubjectField.textContent = mParams.details.subject;

  mBodyCheck.closest('div').classList.toggle('hidden', !configs.requireCheckBody);
  mBodyField.src = `data:text/html,${encodeURIComponent(mParams.details.body)}`;

  for (const bodyBlockElements of document.querySelectorAll('#bodyAndSubjectContainer, #bodyAndSubjectContainer + hr')) {
    bodyBlockElements.classList.toggle('hidden', !configs.requireCheckSubject && !configs.requireCheckBody);
  }
}

function initAttachments() {
  mAttachmentsAllCheck.classList.toggle('hidden', !configs.allowCheckAllAttachments);
  mAttachmentsAllCheck.addEventListener('change', _event => {
    checkAll(mAttachmentsList, mAttachmentsAllCheck.checked);
  });
  mAttachmentsList.addEventListener('change', _event => {
    mAttachmentsAllCheck.checked = isAllChecked(mAttachmentsList);
  });
}

function createRecipientRow(type, address) {
  const row = createCheckableRow([`${type}:`, address]);
  row.setAttribute('title', `${type}: ${address}`);
  return row;
}

let mCreatedCheckboxCount = 0;

function createCheckableRow(columns) {
  const row = document.createElement('div');
  const checkbox = row.appendChild(document.createElement('input'));
  checkbox.id = `checkbox-created-${mCreatedCheckboxCount++}`;
  checkbox.type = 'checkbox';
  for (const column of columns) {
    const label = row.appendChild(document.createElement('label'));
    label.appendChild(document.createElement('span')).textContent = column;
    label.setAttribute('for', checkbox.id);
  }
  return row;
}

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
