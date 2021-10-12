/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  sendToHost,
  sanitizeForHTMLText,
  toDOMDocumentFragment,
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import Options from '/extlib/Options.js';
import '/extlib/l10n.js';
import * as Dialog from '/extlib/dialog.js';
import { DOMUpdater } from '/extlib/dom-updater.js';
import RichConfirm from '/extlib/RichConfirm.js';
import { MatchingRules } from '/common/matching-rules.js';

let mMatchingRules;

const options = new Options(configs);

function onConfigChanged(key) {
  switch (key) {
    case 'debug':
      document.documentElement.classList.toggle('debugging', configs.debug);
      break;

    case 'baseRules':
    case 'userRules':
    case 'overrideRules':
      mMatchingRules = new MatchingRules(configs);
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

  if (field.localName == 'select') {
    // if it is disabled, fallback to the nearest preceding sibling available option.
    let selectedOption = field.querySelector(`option[value="${value}"]`);
    if (selectedOption.disabled) {
      while (selectedOption.previousElementSibling) {
        value = selectedOption.previousElementSibling.value;
        if (value)
          break;
        selectedOption = selectedOption.previousElementSibling;
      }
    }
  }

  if (!('$lastValue' in field) ||
      field.value != value) {
    field.value = value;
    return;
  }
}

function hiddenIfLocked(rule, key) {
  return rule.$lockedKeys.includes(key) ? 'hidden' : '';
}

function rebuildUserRulesUI() {
  const sections = [];
  for (const rule of mMatchingRules.all) {
    const id = rule.id;
    if (!id)
      continue;

    const matchTargetSuffix = getMatchTargetSuffix(rule.matchTarget);
    const matchTargetTypeSuffix = getMatchTargetTypeSuffix(rule.matchTarget);
    sections.push(`
      <fieldset id=${safeAttrValue('userRule-ui-group:' + id)}
                class="userRule-ui-group
                       ${rule.$lockedKeys.includes('enabled') ? '' : 'collapsible'}
                       ${rule.enabled ? '' : 'collapsed'}
                       ${rule.$lockedKeys.includes('enabled') && !rule.enabled ? 'hidden' : ''}">
        <legend id=${safeAttrValue('userRule-ui-legend:' + id)}
                ${!rule.name ? ' class="editing"' : ''}
               ><label id=${safeAttrValue('userRule-ui-legend-label:' + id)}
                      ><input id=${safeAttrValue('userRule-ui-enabled:' + id)}
                              class="userRule-ui-enabled ${hiddenIfLocked(rule, 'enabled')}"
                              type="checkbox"
                              title=${safeLocalizedValue('config_userRule_enabled_tooltiptext')}
                              ${rule.enabled ? 'checked' : ''}>
                       <span id=${safeAttrValue('userRule-ui-name-display:' + id)}
                             class="userRule-ui-name-display"
                            >${sanitizeForHTMLText(rule.name)}</span>
                       <button id=${safeAttrValue('userRule-ui-name-editButton:' + id)}
                              class="userRule-ui-name-editButton ${hiddenIfLocked(rule, 'name')}"
                              >${safeLocalizedText('config_userRule_name_button_label')}</button>
                       <input id=${safeAttrValue('userRule-ui-name:' + id)}
                              class="userRule-ui-name"
                              type="text"
                              placeholder=${safeLocalizedValue('config_userRule_name_placeholder')}
                             ></label></legend>
        <div id=${safeAttrValue('userRule-ui-matchTarget-row:' + id)}
             class="userRule-buttons flex-box row
                    ${rule.$lockedKeys.includes('matchTarget') && !configs.allowRearrangeRules && !configs.allowRemoveRules ? 'hidden' : ''}">
          <p id=${safeAttrValue('userRule-ui-matchTarget-column:' + id)}
             class="flex-box column"
            ><label id=${safeAttrValue('userRule-ui-matchTarget-label:' + id)}
                    class="${hiddenIfLocked(rule, 'matchTarget')}"
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
                  class="userRule-button-moveUp ${configs.allowRearrangeRules ? '' : 'hidden'}"
                  title="config_userRules_moveUp_tooltiptext"
                 >${safeLocalizedText('config_userRules_moveUp_label')}</button>
          <button id=${safeAttrValue('userRule-ui-button-moveDown:' + id)}
                  class="userRule-button-moveDown ${configs.allowRearrangeRules ? '' : 'hidden'}"
                  title="config_userRules_moveDown_tooltiptext"
                 >${safeLocalizedText('config_userRules_moveDown_label')}</button>
          <button id=${safeAttrValue('userRule-ui-button-remove:' + id)}
                  class="userRule-button-remove ${configs.allowRemoveRules ? '' : 'hidden'}"
                  title="config_userRules_remove_tooltiptext"
                 >${safeLocalizedText('config_userRules_remove_label')}</button>
        </div>
        <ul id=${safeAttrValue('userRule-ui-itemsSource-group:' + id)}>
          <li id=${safeAttrValue('userRule-ui-itemsSource-container-itemsLocal:' + id)}
              class="${rule.$lockedKeys.includes('itemsSource') && rule.itemsSource != Constants.SOURCE_LOCAL_CONFIG ? 'hidden' : ''}"
             ><label id=${safeAttrValue('userRule-ui-itemsSource-container-label-itemsLocal:' + id)}
                     class="${hiddenIfLocked(rule, 'itemsSource')}"
                    ><input id=${safeAttrValue('userRule-ui-itemsSource-itemsLocal:' + id)}
                            name=${safeAttrValue('userRule-ui-itemsSource:' + id)}
                            type="radio"
                            value="${Constants.SOURCE_LOCAL_CONFIG}">
                     ${safeLocalizedText('config_userRule_itemsLocal_caption')}</label>
              <textarea id=${safeAttrValue('userRule-ui-itemsLocal:' + id)}
                        class="userRule-ui-itemsLocal ${hiddenIfLocked(rule, 'itemsLocal')}"
                        placeholder=${safeLocalizedValue('config_userRule_itemsLocal_placeholder_' + matchTargetSuffix)}></textarea>
              </li>
          <li id=${safeAttrValue('userRule-ui-itemsSource-container-itemsFile:' + id)}
              class="${rule.$lockedKeys.includes('itemsSource') && rule.itemsSource != Constants.SOURCE_FILE ? 'hidden' : ''}"
             ><label id=${safeAttrValue('userRule-ui-itemsSource-container-label-itemsFile:' + id)}
                     class="require-native-messaging-host ${hiddenIfLocked(rule, 'itemsSource')}"
                    ><input id=${safeAttrValue('userRule-ui-itemsSource-itemsFile:' + id)}
                            name=${safeAttrValue('userRule-ui-itemsSource:' + id)}
                            type="radio"
                            value="${Constants.SOURCE_FILE}">
                     ${safeLocalizedText('config_userRule_itemsFile_caption')}</label>
              <br id=${safeAttrValue('userRule-ui-itemsSource-br-itemsFile:' + id)}
                 ><label id=${safeAttrValue('userRule-ui-itemsSource-label-itemsFile:' + id)}
                         class="require-native-messaging-host flex-box row"
                        ><input id=${safeAttrValue('userRule-ui-itemsFile:' + id)}
                                class="filepath flex-box column ${hiddenIfLocked(rule, 'itemsFile')}"
                                type="text"
                                placeholder=${safeLocalizedValue('config_userRule_itemsFile_input_placeholder_' + matchTargetSuffix)}>
                         <button id=${safeAttrValue('userRule-ui-itemsSource-chooseFileButton-itemsFile:' + id)}
                                 class="userRule-ui-itemsSource-chooseFileButton flex-box column ${hiddenIfLocked(rule, 'itemsFile')}"
                                >${safeLocalizedText('config_userRule_itemsFile_button_label')}</button></label></li>
        </ul>

        <p id=${safeAttrValue('userRule-ui-highlight-container:' + id)}
           class="${hiddenIfLocked(rule, 'highlight')}"
          ><label id=${safeAttrValue('userRule-ui-highlight-label:' + id)}
                 >${safeLocalizedText('config_userRule_highlight_caption_' + matchTargetTypeSuffix)}
                  <select id=${safeAttrValue('userRule-ui-highlight:' + id)}
                          class="userRule-ui-highlight">
                    <option id=${safeAttrValue('userRule-ui-highlight-option-never:' + id)}
                            value="${Constants.HIGHLIGHT_NEVER}"
                           >${safeLocalizedText('config_userRule_highlight_never')}</option>
                    <option id=${safeAttrValue('userRule-ui-highlight-option-always:' + id)}
                            value="${Constants.HIGHLIGHT_ALWAYS}"
                           >${safeLocalizedText('config_userRule_highlight_always')}</option>
                    <option id=${safeAttrValue('userRule-ui-highlight-option-withAttachments:' + id)}
                            value="${Constants.HIGHLIGHT_ONLY_WITH_ATTACHMENTS}"
                            ${rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN ? 'disabled class="hidden"' : ''}
                           >${safeLocalizedText('config_userRule_highlight_withAttachments')}</option>
                    <option id=${safeAttrValue('userRule-ui-highlight-option-externals:' + id)}
                            value="${Constants.HIGHLIGHT_ONLY_EXTERNALS}"
                           >${safeLocalizedText('config_userRule_highlight_externals')}</option>
                    <option id=${safeAttrValue('userRule-ui-highlight-option-externalsWithAttachments:' + id)}
                            value="${Constants.HIGHLIGHT_ONLY_EXTERNALS_WITH_ATTACHMENTS}"
                            ${rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN ? 'disabled class="hidden"' : ''}
                           >${safeLocalizedText('config_userRule_highlight_externalsWithAttachments')}</option>
                  </select></label></p>

        <p id=${safeAttrValue('userRule-ui-action-container:' + id)}
           class="${hiddenIfLocked(rule, 'action')}"
          ><label id=${safeAttrValue('userRule-ui-action-label:' + id)}
                 >${safeLocalizedText('config_userRule_action_caption_' + matchTargetTypeSuffix)}
                  <select id=${safeAttrValue('userRule-ui-action:' + id)}
                          class="userRule-ui-action">
                    <option id=${safeAttrValue('userRule-ui-action-option-none:' + id)}
                            value="${Constants.ACTION_NONE}"
                           >${safeLocalizedText('config_userRule_action_none')}</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-separator1:' + id)}
                            ${rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN ? 'class="hidden"' : ''}
                            disabled="true">-------------------------------------</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-reconfirmAlways:' + id)}
                            value="${Constants.ACTION_RECONFIRM_ALWAYS}"
                           >${safeLocalizedText('config_userRule_action_reconfirmAlways')}</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-reconfirmWithAttachments:' + id)}
                            value="${Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS}"
                            ${rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN ? 'disabled class="hidden"' : ''}
                           >${safeLocalizedText('config_userRule_action_reconfirmWithAttachments')}</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-reconfirmExternals:' + id)}
                            value="${Constants.ACTION_RECONFIRM_ONLY_EXTERNALS}"
                           >${safeLocalizedText('config_userRule_action_reconfirmExternals')}</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-blockExternalsWithAttachments:' + id)}
                            value="${Constants.ACTION_RECONFIRM_ONLY_EXTERNALS_WITH_ATTACHMENTS}"
                            ${rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN ? 'disabled class="hidden"' : ''}
                           >${safeLocalizedText('config_userRule_action_blockExternalsWithAttachments')}</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-separator2:' + id)}
                            ${rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN ? 'class="hidden"' : ''}
                            disabled="true">-------------------------------------</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-blockAlways:' + id)}
                            value="${Constants.ACTION_BLOCK_ALWAYS}"
                           >${safeLocalizedText('config_userRule_action_blockAlways')}</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-blockWithAttachments:' + id)}
                            value="${Constants.ACTION_BLOCK_ONLY_WITH_ATTACHMENTS}"
                            ${rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN ? 'disabled class="hidden"' : ''}
                           >${safeLocalizedText('config_userRule_action_blockWithAttachments')}</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-blockExternals:' + id)}
                            value="${Constants.ACTION_BLOCK_ONLY_EXTERNALS}"
                           >${safeLocalizedText('config_userRule_action_blockExternals')}</option>
                    <option id=${safeAttrValue('userRule-ui-action-option-blockExternalsWithAttachments:' + id)}
                            value="${Constants.ACTION_BLOCK_ONLY_EXTERNALS_WITH_ATTACHMENTS}"
                            ${rule.matchTarget != Constants.MATCH_TO_RECIPIENT_DOMAIN ? 'disabled class="hidden"' : ''}
                           >${safeLocalizedText('config_userRule_action_blockExternalsWithAttachments')}</option>
                  </select></label></p>
        <p id=${safeAttrValue('userRule-ui-confirmTitle-container:' + id)}
           class="sub ${rule.action == Constants.ACTION_NONE ||
                        rule.action == Constants.ACTION_RECONFIRM_ALWAYS ||
                        rule.action == Constants.ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS ||
                        rule.$lockedKeys.includes('confirmTitle') ? 'hidden' : ''}"
          ><label id=${safeAttrValue('userRule-ui-confirmTitle-label:' + id)}
                 >${safeLocalizedText('config_userRule_confirmTitle_caption')}
                  <br id=${safeAttrValue('userRule-ui-confirmTitle-br:' + id)}
                     ><input id=${safeAttrValue('userRule-ui-confirmTitle:' + id)}
                             type="text"
                             class="userRule-ui-confirmTitle"></label></p>
        <p id=${safeAttrValue('userRule-ui-confirmMessage-container:' + id)}
           class="sub ${rule.action == Constants.ACTION_NONE || rule.$lockedKeys.includes('confirmMessage') ? 'hidden' : ''}"
          ><label id=${safeAttrValue('userRule-ui-confirmMessage-label:' + id)}
                 >${safeLocalizedText('config_userRule_confirmMessage_caption_' + matchTargetSuffix)}
                  <textarea id=${safeAttrValue('userRule-ui-confirmMessage:' + id)}
                            class="userRule-ui-confirmMessage"></textarea></label></p>
      </fieldset>
    `.trim());
  }

  const container = document.querySelector('#userRulesContainer');
  DOMUpdater.update(container, toDOMDocumentFragment(sections.join(''), container));

  for (const rule of mMatchingRules.all) {
    const id = rule.id;
    if (!id)
      continue;

    setUserRuleFieldValue(`#userRule-ui-name\\:${id}`,           rule.name);
    setUserRuleFieldValue(`#userRule-ui-matchTarget\\:${id}`,    rule.matchTarget);
    setUserRuleFieldValue(`#userRule-ui-itemsSource-group\\:${id} input[type="radio"][value="${rule.itemsSource}"]`, true);
    setUserRuleFieldValue(`#userRule-ui-itemsLocal\\:${id}`,     rule.itemsLocal.join('\n'));
    setUserRuleFieldValue(`#userRule-ui-itemsFile\\:${id}`,      rule.itemsFile);
    setUserRuleFieldValue(`#userRule-ui-highlight\\:${id}`,      rule.highlight);
    setUserRuleFieldValue(`#userRule-ui-action\\:${id}`,         rule.action);
    setUserRuleFieldValue(`#userRule-ui-confirmTitle\\:${id}`,   rule.confirmTitle);
    setUserRuleFieldValue(`#userRule-ui-confirmMessage\\:${id}`, rule.confirmMessage);
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

function moveUpRule(id) {
  if (!configs.allowRearrangeRules)
    return;
  mMatchingRules.moveUp(id);
  configs.userRules = mMatchingRules.exportUserRules();
  rebuildUserRulesUI();
}

function moveDownRule(id) {
  if (!configs.allowRearrangeRules)
    return;
  mMatchingRules.moveDown(id);
  configs.userRules = mMatchingRules.exportUserRules();
  rebuildUserRulesUI();
}

async function removeRule(id) {
  if (!configs.allowRemoveRules)
    return;

  let result;
  try {
    result = await RichConfirm.show({
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      message: browser.i18n.getMessage('config_userRules_remove_confirmMessage', [mMatchingRules.get(id).name]),
      buttons: [
        browser.i18n.getMessage('config_userRules_remove_accept'),
        browser.i18n.getMessage('config_userRules_remove_cancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  if (result.buttonIndex != 0)
    return;

  mMatchingRules.remove(id);
  rebuildUserRulesUI();
}

async function chooseItemsFile(id) {
  const rule = mMatchingRules.get(id);
  const path = await chooseFile({
    title:       browser.i18n.getMessage(`config_userRule_itemsFile_button_dialogTitle_${getMatchTargetSuffix(rule.matchTarget)}`),
    role:        `${id}FileChoose`,
    displayName: `${browser.i18n.getMessage('config_userRule_itemsFile_button_dialogDisplayName')} (*.*)`,
    pattern:     '*.*',
    fileName:    rule.itemsFile || ''
  });
  const field = document.querySelector(`#userRule-ui-itemsFile\\:${id}`);
  field.value = path;
  reserveToSaveUserRuleChange(field);
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

  const moveUpButton = event.target.closest('.userRule-button-moveUp');
  if (moveUpButton) {
    moveUpRule(moveUpButton.id.split(':')[1]);
    return;
  }

  const moveDownButton = event.target.closest('.userRule-button-moveDown');
  if (moveDownButton) {
    moveDownRule(moveDownButton.id.split(':')[1]);
    return;
  }

  const removeButton = event.target.closest('.userRule-button-remove');
  if (removeButton) {
    removeRule(removeButton.id.split(':')[1]);
    return;
  }

  const chooseFileButton = event.target.closest('.userRule-ui-itemsSource-chooseFileButton');
  if (chooseFileButton) {
    chooseItemsFile(chooseFileButton.id.split(':')[1]);
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

  const chooseFileButton = event.target.closest('.userRule-ui-itemsSource-chooseFileButton');
  if (chooseFileButton) {
    switch (event.key) {
      case 'Space':
      case ' ':
      case 'Enter':
        chooseItemsFile(chooseFileButton.id.split(':')[1]);
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

  const needRebuildUIField = event.target.closest('.userRule-ui-matchTarget, .userRule-ui-action');
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
  else if (field.matches('.userRule-ui-itemsLocal')) {
    value = field.value.trim().split(/[\s,|]+/).filter(part => !!part);
  }
  else {
    value = field.value;
  }
  mMatchingRules.get(id)[key] = value;
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
    configs.userRules = mMatchingRules.exportUserRules();
  }, 50);
}
throttledSaveUserRules.timer = null;

function onUserRuleAdded(_event) {
  const newRule = mMatchingRules.add();

  rebuildUserRulesUI();

  document.querySelector(`#userRule-ui-name\\:${newRule.id}`).focus();
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

  mMatchingRules = new MatchingRules(configs);

  const userRulesContainer = document.querySelector('#userRulesContainer');
  userRulesContainer.addEventListener('click',   onUserRuleClick);
  userRulesContainer.addEventListener('keydown', onUserRuleKeyDown);
  userRulesContainer.addEventListener('change',  onUserRuleChange);
  userRulesContainer.addEventListener('input',   onUserRuleInput);
  userRulesContainer.addEventListener('blur',    onUserRuleBlur, true);
  Dialog.initButton(document.querySelector('#userRulesAddButton'), onUserRuleAdded);

  rebuildUserRulesUI();


  options.buildUIForAllConfigs(document.querySelector('#debug-configs'));
  onConfigChanged('debug');

  for (const container of document.querySelectorAll('section, fieldset, p, div')) {
    const buttons = container.querySelectorAll('button');
    const allFields = container.querySelectorAll('input, textarea, select');
    const lockedFields = container.querySelectorAll('.locked input, .locked textarea, .locked select, input.locked, textarea.locked, select.locked');
    if (allFields.length == 0)
      container.classList.toggle('locked', buttons.length == 0);
    else
      container.classList.toggle('locked', allFields.length == lockedFields.length);
  }

  document.documentElement.classList.add('initialized');
}, { once: true });
