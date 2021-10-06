/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  loadUserRules,
  saveUserRules,
  sendToHost,
  sanitizeForHTMLText,
  toDOMDocumentFragment,
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import Options from '/extlib/Options.js';
import '/extlib/l10n.js';
import * as Dialog from '/extlib/dialog.js';
import { DOMUpdater } from '/extlib/dom-updater.js';

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


let mUserRules;
let mUserRulesById;

function safeAttrValue(value) {
  return JSON.stringify(sanitizeForHTMLText(String(value)));
}

function safeLocalizedValue(key) {
  return safeAttrValue(browser.i18n.getMessage(key));
}

function safeLocalizedText(key) {
  return sanitizeForHTMLText(browser.i18n.getMessage(key));
}

function getMatchTargetSuffix(target) {
  switch (target) {
    case Constants.MATCH_TO_RECIPIENT_DOMAIN:
      return 'recipientDomain';
    case Constants.MATCH_TO_ATTACHMENT_NAME:
      return 'attachmentName';
    case Constants.MATCH_TO_ATTACHMENT_SUFFIX:
      return 'attachmentSuffix';
  }
  return 'unknown';
}

function getMatchTargetTypeSuffix(target) {
  switch (target) {
    case Constants.MATCH_TO_RECIPIENT_DOMAIN:
      return 'recipient';
    case Constants.MATCH_TO_ATTACHMENT_NAME:
    case Constants.MATCH_TO_ATTACHMENT_SUFFIX:
      return 'attachment';
  }
  return 'unknown';
}

function setUserRuleFieldValue(query, value) {
  const field = document.querySelector(query);
  if (!field)
    return;

  if (field.matches('input[type="radio"]')) {
    if (value)
      field.checked = true;
    return;
  }

  if (!('$lastValue' in field) ||
      field.value != value) {
    field.value = value;
    return;
  }
}

function rebuildUserRulesUI() {
  const sections = [];
  for (const rule of mUserRules) {
    const id = rule.id;
    if (!id)
      continue;

    const matchTargetSuffix = getMatchTargetSuffix(rule.matchTarget);
    const matchTargetTypeSuffix = getMatchTargetTypeSuffix(rule.matchTarget);
    sections.push(`
      <fieldset id=${safeAttrValue('userRule-ui-group:' + id)}
                class="userRule-ui-group collapsible ${rule.enabled ? '' : 'collapsed'}">
        <legend id=${safeAttrValue('userRule-ui-legend:' + id)}
               ><label id=${safeAttrValue('userRule-ui-legend-label:' + id)}
                      ><input id=${safeAttrValue('userRule-ui-enabled:' + id)}
                              class="userRule-ui-enabled"
                              type="checkbox"
                              title=${safeLocalizedValue('config_userRule_enabled_tooltiptext')}
                              ${rule.enabled ? 'checked' : ''}>
                       <span id=${safeAttrValue('userRule-ui-name-display:' + id)}
                             class="userRule-ui-name-display"
                            >${sanitizeForHTMLText(rule.name)}</span>
                       <button id=${safeAttrValue('userRule-ui-name-editButton:' + id)}
                              class="userRule-ui-name-editButton"
                              >${safeLocalizedText('config_userRule_name_button_label')}</button>
                       <input id=${safeAttrValue('userRule-ui-name:' + id)}
                              class="userRule-ui-name"
                              type="text"
                              placeholder=${safeLocalizedValue('config_userRule_name_placeholder')}
                             ></label></legend>
        <div id=${safeAttrValue('userRule-ui-matchTarget-row:' + id)}
             class="userRule-buttons flex-box row">
          <p id=${safeAttrValue('userRule-ui-matchTarget-column:' + id)}
             class="flex-box column"
            ><label id=${safeAttrValue('userRule-ui-matchTarget-label:' + id)}
                   >${safeLocalizedText('config_userRule_matchTarget_caption')}
                    <select id=${safeAttrValue('userRule-ui-matchTarget:' + id)}
                            class="userRule-ui-matchTarget">
                      <option id=${safeAttrValue('userRule-ui-matchTarget-option-recipientDomain:' + id)}
                              value="${Constants.MATCH_TO_RECIPIENT_DOMAIN}"
                             >${safeLocalizedText('config_userRule_matchTarget_recipientDomain')}</option>
                      <option id=${safeAttrValue('userRule-ui-matchTarget-option-attachmentName:' + id)}
                              value="${Constants.MATCH_TO_ATTACHMENT_NAME}"
                             >${safeLocalizedText('config_userRule_matchTarget_attachmentName')}</option>
                      <option id=${safeAttrValue('userRule-ui-matchTarget-option-attachmentSuffix:' + id)}
                              value="${Constants.MATCH_TO_ATTACHMENT_SUFFIX}"
                             >${safeLocalizedText('config_userRule_matchTarget_attachmentSuffix')}</option>
                    </select></label></p>
          <button id=${safeAttrValue('userRule-ui-button-moveUp:' + id)}
                  class="userRule-button-moveUp"
                  title="config_userRules_moveUp_tooltiptext"
                 >${safeLocalizedText('config_userRules_moveUp_label')}</button>
          <button id=${safeAttrValue('userRule-ui-button-moveDown:' + id)}
                  class="userRule-button-moveDown"
                  title="config_userRules_moveDown_tooltiptext"
                 >${safeLocalizedText('config_userRules_moveDown_label')}</button>
          <button id=${safeAttrValue('userRule-ui-button-remove:' + id)}
                  class="userRule-button-remove"
                  title="config_userRules_remove_tooltiptext"
                 >${safeLocalizedText('config_userRules_remove_label')}</button>
        </div>
        <ul id=${safeAttrValue('userRule-ui-itemsSource-group:' + id)}>
          <li id=${safeAttrValue('userRule-ui-itemsSource-container-items:' + id)}
             ><label id=${safeAttrValue('userRule-ui-itemsSource-container-label-items:' + id)}
                    ><input id=${safeAttrValue('userRule-ui-itemsSource-items:' + id)}
                            name=${safeAttrValue('userRule-ui-itemsSource:' + id)}
                            type="radio"
                            value="${Constants.SOURCE_CONFIG}">
                     ${safeLocalizedText('config_userRule_items_caption')}</label>
              <textarea id=${safeAttrValue('userRule-ui-items:' + id)}
                        class="userRule-ui-items"
                        placeholder=${safeLocalizedValue('config_userRule_items_placeholder_' + matchTargetSuffix)}></textarea>
              </li>
          <li id=${safeAttrValue('userRule-ui-itemsSource-container-itemsFile:' + id)}
             ><label id=${safeAttrValue('userRule-ui-itemsSource-container-label-itemsFile:' + id)}
                     class="require-native-messaging-host"
                    ><input id=${safeAttrValue('userRule-ui-itemsSource-itemsFile:' + id)}
                            name=${safeAttrValue('userRule-ui-itemsSource:' + id)}
                            type="radio"
                            value="${Constants.SOURCE_FILE}">
                     ${safeLocalizedText('config_userRule_itemsFile_caption')}</label>
              <br id=${safeAttrValue('userRule-ui-itemsSource-br-itemsFile:' + id)}
                 ><label id=${safeAttrValue('userRule-ui-itemsSource-label-itemsFile:' + id)}
                         class="require-native-messaging-host flex-box row"
                        ><input id=${safeAttrValue('userRule-ui-itemsFile:' + id)}
                                class="filepath flex-box column"
                                type="text"
                                placeholder=${safeLocalizedValue('config_userRule_itemsFile_input_placeholder_' + matchTargetSuffix)}>
                         <button id=${safeAttrValue('userRule-ui-itemsSource-chooseFileButton-itemsFile:' + id)}
                                 class="flex-box column"
                                >${safeLocalizedText('config_userRule_itemsFile_button_label')}</button></label></li>
        </ul>

        <p id=${safeAttrValue('userRule-ui-highlight-container:' + id)}
          ><label id=${safeAttrValue('userRule-ui-highlight-label:' + id)}
                 >${safeLocalizedText('config_userRule_highlight_caption_' + matchTargetTypeSuffix)}
                  <select id=${safeAttrValue('userRule-ui-highlight:' + id)}
                          class="userRule-ui-highlight">
                    <option id=${safeAttrValue('userRule-ui-highlight-option-never:' + id)}
                            value="${Constants.HIGHLIGHT_NEVER}"
                           >${safeLocalizedText('config_userRule_applyAction_never')}</option>
                    <option id=${safeAttrValue('userRule-ui-highlight-option-always:' + id)}
                            value="${Constants.HIGHLIGHT_ALWAYS}"
                           >${safeLocalizedText('config_userRule_applyAction_always')}</option>
                    <option id=${safeAttrValue('userRule-ui-highlight-option-withAttachments:' + id)}
                            value="${Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS}"
                           >${safeLocalizedText('config_userRule_applyAction_withAttachments')}</option>
                  </select></label></p>

        <p id=${safeAttrValue('userRule-ui-confirmation-container:' + id)}
          ><label id=${safeAttrValue('userRule-ui-confirmation-label:' + id)}
                 >${safeLocalizedText('config_userRule_confirmation_caption_' + matchTargetTypeSuffix)}
                  <select id=${safeAttrValue('userRule-ui-confirmation:' + id)}
                          class="userRule-ui-confirmation">
                    <option id=${safeAttrValue('userRule-ui-confirmation-option-never:' + id)}
                            value="${Constants.CONFIRM_NEVER}"
                           >${safeLocalizedText('config_userRule_applyAction_never')}</option>
                    <option id=${safeAttrValue('userRule-ui-confirmation-option-always:' + id)}
                            value="${Constants.CONFIRM_ALWAYS}"
                           >${safeLocalizedText('config_userRule_applyAction_always')}</option>
                    <option id=${safeAttrValue('userRule-ui-confirmation-option-withAttachments:' + id)}
                            value="${Constants.CONFIRM_ONLY_WITH_ATTACHMENTS}"
                           >${safeLocalizedText('config_userRule_applyAction_withAttachments')}</option>
                  </select></label></p>
        <p id=${safeAttrValue('userRule-ui-confirmMessage-container:' + id)}
           class="sub ${rule.confirmation == Constants.CONFIRM_NEVER ? 'hidden' : ''}"
          ><label id=${safeAttrValue('userRule-ui-confirmMessage-label:' + id)}
                 >${safeLocalizedText('config_userRule_confirmMessage_caption_' + matchTargetSuffix)}
                  <textarea id=${safeAttrValue('userRule-ui-confirmMessage:' + id)}
                            class="userRule-ui-confirmMessage"></textarea></label></p>

        <p id=${safeAttrValue('userRule-ui-block-container:' + id)}
          ><label id=${safeAttrValue('userRule-ui-block-label:' + id)}
                 >${safeLocalizedText('config_userRule_block_caption_' + matchTargetTypeSuffix)}
                  <select id=${safeAttrValue('userRule-ui-block:' + id)}
                          class="userRule-ui-block">
                    <option id=${safeAttrValue('userRule-ui-block-option-never:' + id)}
                            value="${Constants.BLOCK_NEVER}"
                           >${safeLocalizedText('config_userRule_applyAction_never')}</option>
                    <option id=${safeAttrValue('userRule-ui-block-option-always:' + id)}
                            value="${Constants.BLOCK_ALWAYS}"
                           >${safeLocalizedText('config_userRule_applyAction_always')}</option>
                    <option id=${safeAttrValue('userRule-ui-block-option-withAttachments:' + id)}
                            value="${Constants.BLOCK_ONLY_WITH_ATTACHMENTS}"
                           >${safeLocalizedText('config_userRule_applyAction_withAttachments')}</option>
                  </select></label></p>
      </fieldset>
    `.trim());
  }

  const container = document.querySelector('#userRulesContainer');
  DOMUpdater.update(container, toDOMDocumentFragment(sections.join(''), container));

  for (const rule of mUserRules) {
    const id = rule.id;
    if (!id)
      continue;

    setUserRuleFieldValue(`#userRule-ui-name\\:${id}`,           rule.name);
    setUserRuleFieldValue(`#userRule-ui-matchTarget\\:${id}`,    rule.matchTarget);
    setUserRuleFieldValue(`#userRule-ui-itemsSource-group\\:${id} input[type="radio"][value="${rule.itemsSource}"]`, true);
    setUserRuleFieldValue(`#userRule-ui-items\\:${id}`,          rule.items.join('\n'));
    setUserRuleFieldValue(`#userRule-ui-itemsFile\\:${id}`,      rule.itemsFile);
    setUserRuleFieldValue(`#userRule-ui-highlight\\:${id}`,      rule.highlight);
    setUserRuleFieldValue(`#userRule-ui-confirmation\\:${id}`,   rule.confirmation);
    setUserRuleFieldValue(`#userRule-ui-confirmMessage\\:${id}`, rule.confirmMessage);
    setUserRuleFieldValue(`#userRule-ui-block\\:${id}`,          rule.block);
  }
}

function throttledRebuildUserRulesUI() {
  if (throttledRebuildUserRulesUI.timer)
    clearTimeout(throttledRebuildUserRulesUI.timer);
  throttledRebuildUserRulesUI.timer = setTimeout(() => {
    throttledRebuildUserRulesUI.timer = null;
    rebuildUserRulesUI();
  }, 250);
}
throttledRebuildUserRulesUI.timer = null;

function enterUserRuleNameEdit(field) {
  field.closest('legend').classList.add('editing');
  field.$lastNameBeforeEdit = field.value;
  field.select();
  field.focus();
}

function exitUserRuleNameEdit(field) {
  field.closest('legend').classList.remove('editing');
  if (field.$lastNameBeforeEdit == field.value)
    return;
  reserveToSaveUserRuleChange(field);
  rebuildUserRulesUI();
}

function onUserRuleClick(event) {
  const editNameButton = event.target.closest('.userRule-ui-name-editButton');
  if (editNameButton) {
    enterUserRuleNameEdit(editNameButton.parentNode.querySelector('.userRule-ui-name'));
    return;
  }

  const legend = event.target.closest('legend');
  if (legend) {
    if (event.target.closest('label'))
      return;
    const enabledCheck = legend.querySelector('.userRule-ui-enabled');
    enabledCheck.checked = !enabledCheck.checked;
    legend.closest('fieldset').classList.toggle('collapsed', !enabledCheck.checked);
    return;
  }
}

function onUserRuleKeyDown(event) {
  const nameField = event.target.closest('.userRule-ui-name');
  if (nameField) {
    switch (event.key) {
      case 'Escape':
        nameField.value = nameField.$lastNameBeforeEdit;
      case 'Enter':
        exitUserRuleNameEdit(nameField);
        break;
    }
    return;
  }

  const editNameButton = event.target.closest('.userRule-ui-name-editButton');
  if (editNameButton) {
    switch (event.key) {
      case 'Space':
      case ' ':
      case 'Enter':
        enterUserRuleNameEdit(editNameButton.parentNode.querySelector('.userRule-ui-name'));
        break;
    }
    return;
  }
}

function onUserRuleChange(event) {
  const legend = event.target.closest('legend');
  if (legend) {
    const enabledCheck = event.target.closest('.userRule-ui-enabled');
    if (enabledCheck)
      legend.closest('fieldset').classList.toggle('collapsed', !enabledCheck.checked);
    return;
  }

  const field = event.target.closest('input, textarea, select');
  throttledSaveUserRuleChange(field);

  const needRebuildUIField = event.target.closest('.userRule-ui-matchTarget, .userRule-ui-confirmation');
  if (needRebuildUIField) {
    throttledRebuildUserRulesUI();
  }
}

function onUserRuleInput(event) {
  const field = event.target.closest('input, textarea, select');
  if (field.matches('.userRule-ui-name'))
    return;
  throttledSaveUserRuleChange(field);
}

function onUserRuleBlur(event) {
  const nameField = event.target.closest('.userRule-ui-name');
  if (nameField) {
    exitUserRuleNameEdit(nameField);
    return;
  }
}

function reserveToSaveUserRuleChange(field) {
  const id  = field.id.split(':')[1];
  const key = (field.name || field.id).split(':')[0].split('-').pop();
  let value;
  if (field.matches('input[type="checkbox"]')) {
    value = field.checked;
  }
  else if (field.matches('input[type="radio"], select')) {
    value = Number(field.value);
  }
  else if (field.matches('.userRule-ui-items')) {
    value = field.value.trim().split(/[\s,|]+/).filter(part => !!part);
  }
  else {
    value = field.value;
  }
  mUserRulesById[id][key] = value;
  throttledSaveUserRules();
}

function throttledSaveUserRuleChange(field) {
  if (throttledSaveUserRuleChange.timers.has(field.id))
    clearTimeout(throttledSaveUserRuleChange.timers.get(field.id));
  throttledSaveUserRuleChange.timers.set(field.id, setTimeout(() => {
    throttledSaveUserRuleChange.timers.delete(field.id);
    reserveToSaveUserRuleChange(field);
  }, 250));
}
throttledSaveUserRuleChange.timers = new Map();

function throttledSaveUserRules() {
  if (throttledSaveUserRules.timer)
    clearTimeout(throttledSaveUserRules.timer);
  throttledSaveUserRules.timer = setTimeout(() => {
    throttledSaveUserRules.timer = null;
    console.log('SAVE: ', mUserRules);
    //saveUserRules(mUserRules);
  }, 50);
}
throttledSaveUserRules.timer = null;


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


  const [userRules, userRulesById] = loadUserRules();
  mUserRules     = userRules;
  mUserRulesById = userRulesById;

  const userRulesContainer = document.querySelector('#userRulesContainer');
  userRulesContainer.addEventListener('click',   onUserRuleClick);
  userRulesContainer.addEventListener('keydown', onUserRuleKeyDown);
  userRulesContainer.addEventListener('change',  onUserRuleChange);
  userRulesContainer.addEventListener('input',   onUserRuleInput);
  userRulesContainer.addEventListener('blur',    onUserRuleBlur, true);

  rebuildUserRulesUI();


  options.buildUIForAllConfigs(document.querySelector('#debug-configs'));
  onConfigChanged('debug');

  for (const container of document.querySelectorAll('section, fieldset, p, div')) {
    const allFields = container.querySelectorAll('input, textarea, select');
    const lockedFields = container.querySelectorAll('.locked input, .locked textarea, .locked select, input.locked, textarea.locked, select.locked');
    container.classList.toggle('locked', allFields.length == lockedFields.length);
  }

  document.documentElement.classList.add('initialized');
}, { once: true });
