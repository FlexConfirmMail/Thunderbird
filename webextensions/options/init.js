/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  sendToHost,
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import Options from '/extlib/Options.js';
import '/extlib/l10n.js';
import * as Dialog from '/extlib/dialog.js';

const CONFIRMATION_TYPES = [
  'attentionDomains',
  'attentionSuffixes',
  'attentionSuffixes2',
  'attentionTerms',
  'blockedDomains',
];

const options = new Options(configs);

function onConfigChanged(key) {
  switch (key) {
    case 'debug':
      document.documentElement.classList.toggle('debugging', configs.debug);
      break;
  }
}
configs.$addObserver(onConfigChanged);


/*
function activateField(field) {
  field.classList.remove('disabled');
  field.disabled = false;
  for (const subField of field.querySelectorAll('input, textarea, button, select')) {
    subField.classList.remove('disabled');
    subField.disabled = false;
  }
}

function deactivateField(field) {
  field.classList.add('disabled');
  field.disabled = true;
  for (const subField of field.querySelectorAll('input, textarea, button, select')) {
    subField.classList.add('disabled');
    subField.disabled = true;
  }
}
*/

function initArrayTypeTextArea(textarea) {
  // Use dataset.arrayConfigKey instead of dataset.configKey,
  // to prevent handling of input field by Ootions.js itself
  textarea.value = (configs[textarea.dataset.arrayConfigKey] || []).join('\n');
  textarea.addEventListener('input', () => {
    throttledUpdateArrayTypeTextArea(textarea);
  });
  textarea.addEventListener('change', () => {
    throttledUpdateArrayTypeTextArea(textarea);
  });
}

function throttledUpdateArrayTypeTextArea(textarea) {
  const key = textarea.dataset.arrayConfigKey;
  if (throttledUpdateArrayTypeTextArea.timers.has(key))
    clearTimeout(throttledUpdateArrayTypeTextArea.timers.get(key));
  textarea.dataset.configValueUpdating = true;
  throttledUpdateArrayTypeTextArea.timers.set(key, setTimeout(() => {
    throttledUpdateArrayTypeTextArea.timers.delete(key);
    const value = textarea.value.trim().split(/[\s,|]+/).filter(part => !!part);
    configs[key] = value;
    setTimeout(() => {
      textarea.dataset.configValueUpdating = false;
    }, 50);
  }, 250));
}
throttledUpdateArrayTypeTextArea.timers = new Map();

async function chooseFile({ title, role, displayName, pattern, fileName }) {
  const response = await sendToHost({
    command: Constants.HOST_COMMAND_CHOOSE_FILE,
    params: { title, role, displayName, pattern, fileName }
  });
  return response ? response.path.trim() : '';
}


window.addEventListener('DOMContentLoaded', async () => {
  await configs.$loaded;

  /* This always fails even if the native messaging host is available...
  const response = await sendToHost({ command: 'echo' });
  if (!response) {
    for (const field of document.querySelectorAll('.require-native-messaging-host')) {
      deactivateField(field);
    }
  }
  */

  for (const textarea of document.querySelectorAll('textarea.array-type-config')) {
    initArrayTypeTextArea(textarea);
  }

  for (const base of CONFIRMATION_TYPES) {
    const capitalizedBase = base.replace(/^./, matched => matched.toUpperCase());

    const section = document.querySelector(`#${base}Fields`);
    const heading = section.querySelector('legend');
    const checkbox = heading.querySelector('input[type="checkbox"]');
    if (checkbox) {
      section.classList.add('collapsible');
      if (!checkbox.checked)
        section.classList.add('collapsed');
      heading.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        section.classList.toggle('collapsed', !checkbox.checked);
      });
      checkbox.addEventListener('change', () => {
        section.classList.toggle('collapsed', !checkbox.checked);
      });
    }

    const listField = document.querySelector(`#${base}Field`);
    listField.classList.toggle(
      'locked',
      configs.$isLocked(base) ||
      (configs.$isLocked(`${base}Soruce`) &&
       configs[`${base}Soruce`] == Constants.SOURCE_FILE)
    );
    if (listField.classList.contains('locked'))
      listField.disabled = true;

    const fileField = document.querySelector(`#${base}File`);
    fileField.classList.toggle(
      'locked',
      configs.$isLocked(`#${base}File`) ||
      (configs.$isLocked(`${base}Soruce`) &&
       configs[`${base}Soruce`] == Constants.SOURCE_CONFIG)
    );
    Dialog.initButton(document.querySelector(`#${base}FileChoose`), async _event => {
      const path = await chooseFile({
        title:       browser.i18n.getMessage(`config_${base}File_button_dialogTitle`),
        role:        `${capitalizedBase}FileChoose`,
        displayName: `${browser.i18n.getMessage(`config_${base}File_button_dialogDisplayName`)} (*.*)`,
        pattern:     '*.*',
        fileName:    fileField.value || ''
      });
      if (path)
        configs[`${base}File`] = fileField.value = path;
    });
    if (fileField.classList.contains('locked'))
      fileField.disabled = true;

    const messageField = document.querySelector(`#${base}DialogMessage`);
    messageField.placeholder = browser.i18n.getMessage(messageField.dataset.defaultMessageKey, ['$S']);
  }

  options.buildUIForAllConfigs(document.querySelector('#debug-configs'));
  onConfigChanged('debug');

  for (const container of document.querySelectorAll('section, fieldset, p, div')) {
    const allFields = container.querySelectorAll('input, textarea, select');
    const lockedFields = container.querySelectorAll('.locked input, .locked textarea, .locked select, input.locked, textarea.locked, select.locked');
    container.classList.toggle('locked', allFields.length == lockedFields.length);
  }

  document.documentElement.classList.add('initialized');
}, { once: true });
