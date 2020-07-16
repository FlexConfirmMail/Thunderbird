/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  sendToHost
} from '/common/common.js';
import Options from '/extlib/Options.js';
import '/extlib/l10n.js';

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
*/

function deactivateField(field) {
  field.classList.add('disabled');
  field.disabled = true;
  for (const subField of field.querySelectorAll('input, textarea, button, select')) {
    subField.classList.add('disabled');
    subField.disabled = true;
  }
}

function initArrayTypeTextArea(textarea) {
  textarea.value = configs[textarea.dataset.configKey].join('\n');
  textarea.addEventListener('input', () => {
    const value = textarea.value.trim().split(/[\s,|]+/).filter(part => !!part);
    configs[textarea.dataset.configKey] = value;
  });
}


window.addEventListener('DOMContentLoaded', async () => {
  const [response, ] = await Promise.all([
    sendToHost({ command: 'echo' }),
    configs.$loaded
  ]);

  if (!response) {
    for (const field of document.querySelectorAll('.require-native-messaging-host')) {
      deactivateField(field);
    }
  }

  for (const textarea of document.querySelectorAll('textarea.array-type-config')) {
    initArrayTypeTextArea(textarea);
  }

  options.buildUIForAllConfigs(document.querySelector('#debug-configs'));
  onConfigChanged('debug');

  document.documentElement.classList.add('initialized');
}, { once: true });
