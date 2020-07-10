/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const TYPE_READY = 'dialog-ready';
export const TYPE_ACCEPT = 'dialog-accept';
export const TYPE_CANCEL = 'dialog-cancel';

function generateId() {
  return `${Date.now()}-${Math.round(Math.random() * 65000)}`;
}


const DEFAULT_WIDTH_OFFSET  = 30; /* left window frame + right window frame + scrollbar (for failsafe) */
const DEFAULT_HEIGHT_OFFSET = 40; /* top title bar + bottom window frame */
let lastWidthOffset  = null;
let lastHeightOffset = null;

export async function open({ url, left, top, width, height } = {}) {
  const id = generateId();

  const extraParams = `dialog-id=${id}&dialog-offscreen=true`;
  if (url.includes('?'))
    url = url.replace(/\?/, `?${extraParams}&`);
  if (url.includes('#'))
    url = url.replace(/#/, `?${extraParams}#`);
  else
    url = `${url}?${extraParams}`;

  const widthOffset  = lastWidthOffset === null ? DEFAULT_WIDTH_OFFSET : lastWidthOffset;
  const heightOffset = lastHeightOffset === null ? DEFAULT_HEIGHT_OFFSET : lastHeightOffset;

  if (width === undefined || height === undefined) {
    // step 1: render dialog in a hidden iframe to determine its content size
    const dialogContentSize = await new Promise((resolve, _reject) => {
      const loader = document.body.appendChild(document.createElement('iframe'));
      loader.addEventListener(
        'load',
        async () => {
          loader.contentDocument.documentElement.classList.add('offscreen');
          const [readyEvent, ] = await Promise.all([
            new Promise(resolveReady => loader.contentDocument.addEventListener(TYPE_READY, resolveReady, { once: true })),
            new Promise(resolveNextTick => setTimeout(resolveNextTick, 0))
          ]);
          const dialogContent = loader.contentDocument.querySelector('.dialog-content') || loader.contentDocument.body;
          const rect = dialogContent.getBoundingClientRect();
          resolve({
            ...readyEvent.detail,
            width:  rect.width,
            height: rect.height
          });
          loader.parentNode.removeChild(loader);
        },
        {
          once:    true,
          capture: true
        }
      );
      loader.src = url;
    });

    if (width === undefined)
      width = dialogContentSize.width - widthOffset;
    else
      width -= widthOffset;

    if (height === undefined)
      height = dialogContentSize.height - heightOffset;
    else
      height -= heightOffset;
  }
  else {
    width -= widthOffset;
    height -= heightOffset;
  }


  return new Promise(async (resolve, reject) => {
    let win; // eslint-disable-line prefer-const

    const onMessage = async (message, _sender) => {
      if (!message || message.id != id)
        return;

      switch (message.type) {
        case TYPE_READY: {
          // step 3: shrink or expand the dialog window if the offset is changed
          lastWidthOffset  = message.windowWidthOffset;
          lastHeightOffset = message.windowHeightOffset;
          if (lastWidthOffset != widthOffset ||
              lastHeightOffset != heightOffset) {
            browser.windows.update(win.id, {
              width:  Math.ceil(width + lastWidthOffset),
              height: Math.ceil(height + lastHeightOffset)
            });
          }
        }; break;

        case TYPE_ACCEPT:
          browser.runtime.onMessage.removeListener(onMessage);
          browser.windows.onRemoved.removeListener(onClosed); // eslint-disable-line no-use-before-define
          browser.windows.remove(win.id);
          resolve(message);
          break;

        case TYPE_CANCEL:
          browser.runtime.onMessage.removeListener(onMessage);
          browser.windows.onRemoved.removeListener(onClosed); // eslint-disable-line no-use-before-define
          browser.windows.remove(win.id);
          reject(message);
          break;
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    const onClosed = windowId => {
      if (windowId != win.id)
        return;
      browser.runtime.onMessage.removeListener(onMessage);
      browser.windows.onRemoved.removeListener(onClosed);
      browser.windows.remove(win.id);
      reject();
    };
    browser.windows.onRemoved.addListener(onClosed);

    // step 2: open real dialog window
    const positionParams = {};
    if (left !== undefined)
      positionParams.left = left;
    if (top !== undefined)
      positionParams.top = top;
    win = await browser.windows.create({
      type:   'popup',
      url:    url.replace(/(dialog-offscreen)=true/, '$1=false'),
      width:  Math.ceil(width + widthOffset),
      height: Math.ceil(height + heightOffset),
      ...positionParams,
      allowScriptsToClose: true
    });
  });
}



// utilities for dialog itself

function getCurrentId() {
  const params = new URLSearchParams(location.search);
  return params.get('dialog-id');
}

export function notifyReady() {
  const params = new URLSearchParams(location.search);
  const id = params.get('dialog-id');

  const detail = {
    id,
    windowWidthOffset:  Math.max(0, window.outerWidth - window.innerWidth),
    windowHeightOffset: Math.max(0, window.outerHeight - window.innerHeight)
  };
  const event = new CustomEvent(TYPE_READY, {
    detail,
    bubbles:    true,
    cancelable: false,
    composed:   true
  });
  document.dispatchEvent(event);

  if (params.get('dialog-offscreen') != 'true')
    browser.runtime.sendMessage({
      type: TYPE_READY,
      ...detail
    });
}

export function accept(detail = null) {
  browser.runtime.sendMessage({
    type: TYPE_ACCEPT,
    id:   getCurrentId(),
    detail
  });
}

export function cancel() {
  browser.runtime.sendMessage({
    type: TYPE_CANCEL,
    id:   getCurrentId()
  });
}

function initButton(button, onCommand) {
  button.addEventListener('click', event => {
    if (event.button == 0 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey)
      onCommand(event);
  });
  button.addEventListener('keyup', event => {
    if (event.key == 'Enter' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey)
      onCommand(event);
  });
}

export function initAcceptButton(button, onCommand) {
  initButton(button, async event => {
    accept(typeof onCommand == 'function' ? (await onCommand(event)) : null);
  });
}

export function initCancelButton(button) {
  initButton(button, _event => {
    cancel();
  });
}
