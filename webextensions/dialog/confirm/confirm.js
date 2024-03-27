/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import l10n from '/extlib/l10n.js';
import RichConfirm from '/extlib/RichConfirm.js';
import * as Dialog from '/extlib/dialog.js';

import {
  configs,
  log,
  toDOMDocumentFragment,
  readFile,
} from '/common/common.js';
import * as Constants from '/common/constants.js';

import * as ResizableBox from '/common/resizable-box.js';
import { MatchingRules } from '/common/matching-rules.js';

let mParams;
let mMatchingRules;
let mBodyText;
let mBodyHTML;
let mNewRecipientDomains;

let mTopMessage;
let mInternalsAllCheck;
let mInternalsList;
let mExternalsAllCheck;
let mExternalsList;
let mSubjectCheck;
let mSubjectField;
//let mBodyCheck;
let mBodyField;
let mAttachmentsAllCheck;
let mAttachmentsList;
let mAcceptButton;
let mCancelButton;

function onConfigChange(key) {
  const value = configs[key];
  switch (key) {
    case 'highlightExternalDomains':
      document.documentElement.classList.toggle('highlight-external-domains', value);
      break;

    case 'largeFontSizeForAddresses':
      document.documentElement.classList.toggle('large-font-size-for-addresses', value);
      break;

    case 'emphasizeRecipientType':
      document.documentElement.classList.toggle('emphasize-recipient-type', value);
      break;

    case 'emphasizeTopMessage':
      document.documentElement.classList.toggle('emphasize-top-message', value);
      break;

    case 'topMessage':
      mTopMessage.textContent = value;
      mTopMessage.classList.toggle('hidden', !value);
      break;

    case 'debug':
      document.documentElement.classList.toggle('debug', value);
      break;
  }
}
configs.$addObserver(onConfigChange);

const FIELDS_SOURCE = {};
FIELDS_SOURCE[Constants.CONFIRMATION_FIELD_INTERNALS] = `
  <fieldset id="internalsContainer" class="flex-box"
    ><legend><label><input id="internalsAll" type="checkbox" class="all-checkbox">__MSG_confirmDialogInternalsCaption__</label></legend
    ><div id="internals" class="flex-box listbox"></div
  ></fieldset>
`.trim();
FIELDS_SOURCE[Constants.CONFIRMATION_FIELD_EXTERNALS] = `
  <fieldset id="externalsContainer" class="flex-box"
    ><legend><label><input id="externalsAll" type="checkbox" class="all-checkbox">__MSG_confirmDialogExternalsCaption__</label></legend
    ><div id="externals" class="flex-box listbox"></div
  ></fieldset>
`.trim();
FIELDS_SOURCE[Constants.CONFIRMATION_FIELD_SUBJECT] = `
  <div id="subjectContainer"><label><input id="subject" type="checkbox">__MSG_confirmDialogSubjectCaption__<span id="subjectField"></span></label></div>
`.trim();
FIELDS_SOURCE[Constants.CONFIRMATION_FIELD_BODY] = `
  <div id="bodyContainer" class="flex-box"
    ><div><label><input id="body" type="checkbox">__MSG_confirmDialogBodyCaption__</label></div
    ><iframe id="bodyField"
             class="flex-box"></iframe
  ></div>
`.trim();
FIELDS_SOURCE[Constants.CONFIRMATION_FIELD_ATTACHMENTS] = `
  <fieldset id="attachmentsContainer" class="flex-box"
    ><legend><label><input id="attachmentsAll" type="checkbox" class="all-checkbox">__MSG_confirmDialogAttachmentsCaption__</label></legend
    ><div id="attachments" class="flex-box listbox"></div
  ></fieldset>
`.trim();

function buildFields() {
  const sources = [];
  for (const key of new Set([...configs.confirmDialogFields, ...Object.keys(FIELDS_SOURCE)])) {
    const source = FIELDS_SOURCE[key];
    if (!source)
      continue;
    sources.push(source);
  }
  const container = document.querySelector('#fields');
  container.appendChild(toDOMDocumentFragment(sources.join('<hr class="splitter">'), container));

  mTopMessage          = document.querySelector('#top-message');
  mInternalsAllCheck   = document.querySelector('#internalsAll');
  mInternalsList       = document.querySelector('#internals');
  mExternalsAllCheck   = document.querySelector('#externalsAll');
  mExternalsList       = document.querySelector('#externals');
  mSubjectCheck        = document.querySelector('#subject');
  mSubjectField        = document.querySelector('#subjectField');
  //mBodyCheck           = document.querySelector('#body');
  mBodyField           = document.querySelector('#bodyField');
  mAttachmentsAllCheck = document.querySelector('#attachmentsAll');
  mAttachmentsList     = document.querySelector('#attachments');
  mAcceptButton        = document.querySelector('#accept');
  mCancelButton        = document.querySelector('#cancel');

  l10n.updateDocument();
}

configs.$loaded.then(async () => {
  buildFields();

  mParams = await Dialog.getParams();
  log('confirmation dialog initialize ', mParams);

  mMatchingRules = new MatchingRules(configs);
  await mMatchingRules.populate(readFile);

  // The given message source has a "meta" tag with charset, but the body is already decoded.
  // We need to extract only its body part and render it with a Unicode encoding.
  const tree = (new DOMParser()).parseFromString(mParams.details.body, 'text/html');
  mBodyText = tree.querySelector('body').textContent;
  mBodyHTML = tree.querySelector('body').outerHTML;

  onConfigChange('highlightExternalDomains');
  onConfigChange('largeFontSizeForAddresses');
  onConfigChange('emphasizeRecipientType');
  onConfigChange('emphasizeTopMessage');
  onConfigChange('topMessage');
  onConfigChange('debug');

  mNewRecipientDomains = new Set(mParams.newRecipientDomains);

  initInternals();
  initExternals();
  initSubjectBlock();
  initBodyBlock();
  initAttachments();

  ResizableBox.init(configs.confirmDialogBoxSizes);

  mAcceptButton.disabled = !isAllChecked();
  document.addEventListener('change', _event => {
    mAcceptButton.disabled = !isAllChecked();
  });

  Dialog.initButton(mAcceptButton, async _event => {
    if (!isAllChecked() ||
        !(await confirmedMultipleRecipientDomains()) ||
        !(await confirmedNewDomainRecipients()) ||
        !(await confirmedWithRules()))
      return;

    Dialog.accept();
  });
  Dialog.initCancelButton(mCancelButton);

  await Dialog.notifyReady();

  window.addEventListener('resize', () => {
    configs.confirmDialogWidth = window.outerWidth;
    configs.confirmDialogHeight = window.outerHeight;
  });
  window.addEventListener(Dialog.TYPE_MOVED, event => {
    configs.confirmDialogLeft = event.detail.left;
    configs.confirmDialogTop = event.detail.top;
  });

  window.addEventListener(ResizableBox.TYPE_RESIZED, event => {
    configs.confirmDialogBoxSizes = event.detail;
  });
  log('confirmation dialog initialize done');
});


function initInternals() {
  log('initInternals ', mParams.internals);
  mInternalsAllCheck.disabled = mParams.internals.length == 0;
  mInternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllInternals);
  mInternalsAllCheck.addEventListener('change', _event => {
    checkAll(mInternalsList, mInternalsAllCheck.checked);
  });
  mInternalsList.addEventListener('change', _event => {
    mInternalsAllCheck.checked = isAllChecked(mInternalsList);
  });
  const highlightedAddresses = mMatchingRules.getHighlightedRecipientAddresses({
    internals:   mParams.internals,
    attachments: mParams.attachments,
  });
  for (const recipient of mParams.internals) {
    const row = createRecipientRow(recipient);
    if (highlightedAddresses.has(recipient.address))
      row.classList.add('attention');
    mInternalsList.appendChild(row);
  }
}

function initExternals() {
  log('initExternals ', mParams.externals);
  mExternalsAllCheck.disabled = mParams.externals.length == 0;
  mExternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllExternals);
  mExternalsAllCheck.addEventListener('change', _event => {
    checkAll(mExternalsList, mExternalsAllCheck.checked);
    for (const domainRow of mExternalsList.querySelectorAll('.row.domain')) {
      domainRow.classList.toggle('checked', mExternalsAllCheck.checked);
    }
  });
  mExternalsList.addEventListener('change', event => {
    const row = event.target.closest('.row');
    const domainRow = mExternalsList.querySelector(`.row.domain[data-domain="${row.dataset.domain}"]`);
    const recipientCheckboxes = mExternalsList.querySelectorAll(`.row.recipient[data-domain="${row.dataset.domain}"] input[type="checkbox"]`);
    domainRow.classList.toggle('checked', [...recipientCheckboxes].every(checkbox => checkbox.checked));
    mExternalsAllCheck.checked = isAllChecked(mExternalsList);
  });

  const recipientsOfDomain = new Map();
  for (const recipient of mParams.externals) {
    const recipients = recipientsOfDomain.get(recipient.domain) || [];
    recipients.push(recipient);
    recipientsOfDomain.set(recipient.domain, recipients);
  }


  let groupCount = 0;
  for (const [domain, recipients] of recipientsOfDomain.entries()) {
    groupCount++;

    const highlightedAddresses = mMatchingRules.getHighlightedRecipientAddresses({
      externals:   recipients,
      attachments: mParams.attachments,
    });
    const domainRow = createDomainRow(domain);
    if (recipients.some(recipient => highlightedAddresses.has(recipient.address)) ||
        (configs.emphasizeNewDomainRecipients && mNewRecipientDomains.has(domain)))
      domainRow.classList.add('attention');
    mExternalsList.appendChild(domainRow);

    const domainClass = groupCount % 2 ? 'domain-odd' : 'domain-even';
    for (const recipient of recipients) {
      const row = createRecipientRow(recipient);
      row.dataset.domain = domain;
      row.classList.add(domainClass);
      if (highlightedAddresses.has(recipient.address) ||
          (configs.emphasizeNewDomainRecipients && mNewRecipientDomains.has(recipient.domain)))
        row.classList.add('attention');
      mExternalsList.appendChild(row);
    }
  }
}

function initSubjectBlock() {
  log('initSubjectBlock ', mParams.details.subject);
  mSubjectCheck.closest('div').classList.toggle('hidden', !configs.requireCheckSubject);
  if (configs.requireCheckSubject) {
    mSubjectField.textContent = mParams.details.subject;
    const highlighted = mMatchingRules.shouldHighlightSubject(mParams.details.subject, {
      hasExternal:   mParams.externals.length > 0,
      hasAttachment: mParams.attachments.length > 0,
    });
    mSubjectField.classList.toggle('attention', highlighted);
  }
}

function initBodyBlock() {
  log('initSubjectBlock ', mParams.details.body);
  document.querySelector('#bodyContainer').classList.toggle('hidden', !configs.requireCheckBody);
  if (configs.requireCheckBody) {
    const highlighted = mMatchingRules.shouldHighlightBody(mBodyText, {
      hasExternal:   mParams.externals.length > 0,
      hasAttachment: mParams.attachments.length > 0,
    });
    const styles = highlighted ? '<style type="text/css">:root { color: red; font-weight: bold; }</style>' : '';
    const source = `<!DOCTYPE html><html><meta charset="UTF-8">${styles}${mBodyHTML}</html>`;
    mBodyField.src = `data:text/html,${encodeURIComponent(source)}`;
  }
}

function initAttachments() {
  log('initAttachments ', mParams.attachments);
  const container = mAttachmentsList.closest('fieldset');
  container.classList.toggle('hidden', !configs.requireCheckAttachment);
  container.previousElementSibling.classList.toggle('hidden', container.classList.contains('hidden')); // splitter
  if (!configs.requireCheckAttachment)
    return;

  mAttachmentsAllCheck.disabled = configs.requireReinputAttachmentNames || (mParams.attachments.length == 0);
  mAttachmentsAllCheck.classList.toggle('hidden', !configs.allowCheckAllAttachments);
  mAttachmentsAllCheck.addEventListener('change', _event => {
    checkAll(mAttachmentsList, mAttachmentsAllCheck.checked);
  });
  mAttachmentsList.addEventListener('change', _event => {
    mAttachmentsAllCheck.checked = isAllChecked(mAttachmentsList);
  });
  const highlightedAttachmentNames = mMatchingRules.getHighlightedAttachmentNames({
    attachments: mParams.attachments,
    hasExternal: mParams.externals.length > 0,
  });
  for (const attachment of mParams.attachments) {
    const row = createAttachmentRow(attachment);
    if (highlightedAttachmentNames.has(attachment.name))
      row.classList.add('attention');
    mAttachmentsList.appendChild(row);
  }
}

function createRecipientRow(recipient) {
  const row = createCheckableRow([`${recipient.type}:`, recipient.recipient]);
  row.setAttribute('title', foldLongTooltipText(`${recipient.type}: ${recipient.recipient}`));
  row.classList.add('recipient');
  row.lastChild.classList.add('flexible');
  return row;
}

function createDomainRow(domain) {
  const row = createRow([domain]);
  row.setAttribute('title', foldLongTooltipText(domain));
  row.classList.add('domain');
  row.dataset.domain = domain;
  row.lastChild.classList.add('flexible');
  return row;
}

let mCreatedInputFieldCount = 0;

function createAttachmentRow(attachment) {
  const row = createCheckableRow([attachment.name]);
  row.setAttribute('title', foldLongTooltipText(attachment.name));
  row.classList.add('attachment');
  row.lastChild.classList.add('flexible');

  if (configs.requireReinputAttachmentNames) {
    const checkbox = row.querySelector('input[type="checkbox"]');
    checkbox.disabled = true;

    const column = row.insertBefore(document.createElement('span'), row.querySelector('label'));
    column.classList.add('column');
    column.classList.add('flexible');

    const field = column.appendChild(document.createElement('input'));
    field.id = `input-field-created-${mCreatedInputFieldCount++}`;
    field.type = 'text';
    field.placeholder = browser.i18n.getMessage('confirmDialogAttachmentNameReinputPlaceholder');
    field.addEventListener('input', () => {
      if (checkbox.checked == (field.value == attachment.name))
        return;

      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new CustomEvent('change', {
        detail:     checkbox.checked,
        bubbles:    true,
        cancelable: false,
        composed:   true
      }));
    });

    for (const label of row.querySelectorAll('label')) {
      label.setAttribute('for', field.id);
    }
  }

  return row;
}

let mCreatedCheckboxCount = 0;

function createCheckableRow(columns) {
  const row = createRow(columns);
  const checkbox = row.insertBefore(document.createElement('input'), row.firstChild);
  checkbox.id = `checkbox-created-${mCreatedCheckboxCount++}`;
  checkbox.type = 'checkbox';
  for (const label of row.querySelectorAll('label')) {
    label.setAttribute('for', checkbox.id);
  }
  return row;
}

function createRow(columns) {
  const row = document.createElement('div');
  row.classList.add('row');
  for (const column of columns) {
    const label = row.appendChild(document.createElement('label'));
    label.classList.add('column');
    const container = label.appendChild(document.createElement('span'));
    container.classList.add('flexible-container');
    container.appendChild(document.createElement('span')).textContent = column;
  }
  return row;
}

function foldLongTooltipText(text) {
  const max = configs.maxTooltipTextLength;
  const folded = [];
  while (text.length > 0) {
    folded.push(text.substring(0, max));
    text = text.substring(max);
  }
  return folded.join('\n');
}

function checkAll(container, checked) {
  for (const checkbox of container.querySelectorAll('input[type="checkbox"]')) {
    checkbox.checked = checked;
  }
}

function isAllChecked(container = document) {
  for (const checkbox of container.querySelectorAll('input[type="checkbox"]:not(.all-checkbox)')) {
    if (checkbox.classList.contains('hidden') ||
        checkbox.closest('.hidden'))
      continue;
    if (!checkbox.checked)
      return false;
  }
  return true;
}


async function confirmedMultipleRecipientDomains() {
  log('confirmedMultipleRecipientDomains shouldConfirm = ', configs.confirmMultipleRecipientDomains);
  if (!configs.confirmMultipleRecipientDomains)
    return true;

  const domains = new Set(mParams.externals.filter(recipient => recipient.type != 'Bcc').map(recipient => recipient.domain));
  log('confirmedMultipleRecipientDomains domains = ', domains);
  if (domains.size < configs.minConfirmMultipleRecipientDomainsCount)
    return true;

  const message = (
    configs.confirmMultipleRecipientDomainsDialogMessage.replace(/[\%\$]s/i, [...domains].join('\n')) ||
    browser.i18n.getMessage('confirmMultipleRecipientDomainsMessage', [[...domains].join('\n')])
  );
  let result;
  try {
    result = await RichConfirm.show({
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      title: configs.confirmMultipleRecipientDomainsDialogTitle || browser.i18n.getMessage('confirmMultipleRecipientDomainsTitle'),
      content: message,
      buttons: [
        browser.i18n.getMessage('confirmMultipleRecipientDomainsAccept'),
        browser.i18n.getMessage('confirmMultipleRecipientDomainsCancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  log('confirmedMultipleRecipientDomains result.buttonIndex = ', result.buttonIndex);
  switch (result.buttonIndex) {
    case 0:
      return true;
    default:
      return false;
  }
}

async function confirmedNewDomainRecipients() {
  log('confirmedNewDomainRecipients shouldConfirm = ', configs.confirmNewDomainRecipients);
  if (!configs.confirmNewDomainRecipients)
    return true;

  const newDomainRecipients = [...new Set(mParams.externals.filter(recipient => mNewRecipientDomains.has(recipient.domain)))].map(recipient => recipient.address);
  log('newDomainRecipients domains = ', newDomainRecipients);
  if (newDomainRecipients.length == 0)
    return true;

  const message = (
    configs.confirmNewDomainRecipientsDialogMessage.replace(/[\%\$]s/i, newDomainRecipients.join('\n')) ||
    browser.i18n.getMessage('confirmNewDomainRecipientsDialogMessage', [newDomainRecipients.join('\n')])
  );
  let result;
  try {
    result = await RichConfirm.show({
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      title: configs.confirmNewDomainRecipientsDialogTitle || browser.i18n.getMessage('confirmNewDomainRecipientsDialogTitle'),
      content: message,
      buttons: [
        browser.i18n.getMessage('confirmNewDomainRecipientsAccept'),
        browser.i18n.getMessage('confirmNewDomainRecipientsCancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  log('confirmedNewDomainRecipients result.buttonIndex = ', result.buttonIndex);
  switch (result.buttonIndex) {
    case 0:
      return true;
    default:
      return false;
  }
}

async function confirmedWithRules() {
  log('confirmedWithRules');
  const confirmed = await mMatchingRules.tryReconfirm({
    internals:   mParams.internals,
    externals:   mParams.externals,
    attachments: mParams.attachments,
    subject:     mParams.details.subject,
    body:        mBodyText,
    async confirm({ title, message }) {
      let result;
      try {
        result = await RichConfirm.show({
          modal: true,
          type:  'common-dialog',
          url:   '/resources/blank.html',
          title,
          content: message,
          buttons: [
            browser.i18n.getMessage('reconfirmAccept'),
            browser.i18n.getMessage('reconfirmCancel'),
          ],
        });
      }
      catch(_error) {
        result = { buttonIndex: -1 };
      }
      log('confirmedWithRules: result.buttonIndex = ', result.buttonIndex);
      switch (result.buttonIndex) {
        case 0:
          return true;;
        default:
          log(' => canceled');
          return false;
      }
    },
  });
  log('confirmedWithRules confirmed = ', confirmed);
  return confirmed;
}
