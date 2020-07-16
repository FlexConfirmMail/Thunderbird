/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs
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


function initArrayTypeTextArea(textarea) {
  textarea.value = configs[textarea.dataset.configKey].join('\n');
  textarea.addEventListener('input', () => {
    const value = textarea.value.trim().split(/[\s,|]+/).filter(part => !!part);
    configs[textarea.dataset.configKey] = value;
  });
}


window.addEventListener('DOMContentLoaded', async () => {
  await configs.$loaded;

  for (const textarea of document.querySelectorAll('textarea.array-type-config')) {
    initArrayTypeTextArea(textarea);
  }

  options.buildUIForAllConfigs(document.querySelector('#debug-configs'));
  onConfigChanged('debug');

  document.documentElement.classList.add('initialized');
}, { once: true });
