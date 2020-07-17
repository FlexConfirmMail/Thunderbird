/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const TYPE_FETCH_PARAMS = 'dialog-fetch-params';
export const TYPE_RESPOND_PARAMS = 'dialog-respond-params';
export const TYPE_READY = 'dialog-ready';
export const TYPE_FOCUS = 'dialog-focus';
export const TYPE_MOVED = 'dialog-moved';
export const TYPE_ACCEPT = 'dialog-accept';
export const TYPE_CANCEL = 'dialog-cancel';

function generateId() {
  return `${Date.now()}-${Math.round(Math.random() * 65000)}`;
}

const DEFAULT_LOGGER = () => {};
let mLogger = DEFAULT_LOGGER;

export function setLogger(logger) {
  if (typeof logger == 'function')
    mLogger = (message, ...args) => logger(`[dialog] ${message}`, ...args);
  else
    mLogger = DEFAULT_LOGGER;
}


const DEFAULT_WIDTH_OFFSET  = 30; /* left window frame + right window frame + scrollbar (for failsafe) */
const DEFAULT_HEIGHT_OFFSET = 40; /* top title bar + bottom window frame */
let lastWidthOffset  = null;
let lastHeightOffset = null;

export async function open({ url, left, top, width, height, modal } = {}, dialogContentsParams = {}) {
  const id = generateId();
  mLogger('open ', { id, url, left, top, width, height, modal, dialogContentsParams });

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
          const onFetchParams = () => {
            mLogger(`onFetchParams at ${id}`);
            loader.contentDocument.dispatchEvent(new loader.contentWindow.CustomEvent(TYPE_RESPOND_PARAMS, {
              detail:     dialogContentsParams,
              bubbles:    true,
              cancelable: false,
              composed:   true
            }));
          };
          loader.contentDocument.addEventListener(TYPE_FETCH_PARAMS, onFetchParams);
          const [readyEvent, ] = await Promise.all([
            new Promise(resolveReady => loader.contentDocument.addEventListener(TYPE_READY, event => {
              loader.contentDocument.removeEventListener(TYPE_FETCH_PARAMS, onFetchParams);
              resolveReady(event);
            }, { once: true })),
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
    mLogger('dialogContentSize ', dialogContentSize);

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

    const onMessage = (message, _sender) => {
      if (!message || message.id != id)
        return;

      mLogger(`onMessage at ${id}`, message);
      switch (message.type) {
        case TYPE_FETCH_PARAMS:
          return Promise.resolve(dialogContentsParams);

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
          return Promise.resolve(win.id);
        }; break;

        case TYPE_ACCEPT:
          browser.runtime.onMessage.removeListener(onMessage);
          browser.windows.onRemoved.removeListener(onRemoved); // eslint-disable-line no-use-before-define
          browser.windows.remove(win.id);
          resolve(message);
          break;

        case TYPE_CANCEL:
          browser.runtime.onMessage.removeListener(onMessage);
          browser.windows.onRemoved.removeListener(onRemoved); // eslint-disable-line no-use-before-define
          browser.windows.remove(win.id);
          reject(message);
          break;
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    const onFocusChanged = windowId => {
      if (!win || windowId == win.id)
        return;

      mLogger(`onFocusChanged at ${id}: raise the window`);
      // setting "focused=true" fails on Thunderbird...
      //browser.windows.update(win.id, { focused: true });
      browser.runtime.sendMessage({
        type: TYPE_FOCUS,
        id
      });
    };
    if (modal)
      browser.windows.onFocusChanged.addListener(onFocusChanged);

    const onUpdated = (windowId, updateInfo) => {
      if (!win ||
          windowId != win.id)
        return;

      mLogger(`onUpdated at ${id} `, windowId, updateInfo);
      const left = updateInfo.left;
      const top = updateInfo.top;
      if (typeof left == 'number' ||
          typeof top == 'number') {
        if (typeof left == 'number')
          win.left = left;
        if (typeof top == 'number')
          win.top = top;
        mLogger(`window is moved: `, { left: win.left, top: win.top });
        browser.runtime.sendMessage({
          type: TYPE_MOVED,
          id,
          left: win.left,
          top:  win.top
        });
      }
    };
    if (browser.windows.onUpdated)
      browser.windows.onUpdated.addListener(onUpdated);
    else
      onUpdated.timer = setInterval(async () => {
        try {
          const updatedWin = await browser.windows.get(win.id);
          const updateInfo = {};
          if (updatedWin.left != win.left)
            updateInfo.left = updatedWin.left;
          if (updatedWin.top != win.top)
            updateInfo.top = updatedWin.top;
          mLogger(`Periodical check for onUpdated: ${JSON.stringify(updateInfo)}`); // output as a string to reduce needless log lines
          if (Object.keys(updateInfo) == 0)
            return;
          onUpdated(win.id, updateInfo);
        }
        catch(error) {
          mLogger('Failed to do periodical check for onUpdated: ', error);
          if (onUpdated.timer) {
            window.clearInterval(onUpdated.timer);
            onUpdated.timer = null;
          }
        }
      }, 500);

    const onRemoved = windowId => {
      if (!win || windowId != win.id)
        return;
      mLogger(`onRemoved on ${id}`);
      browser.runtime.onMessage.removeListener(onMessage);
      browser.windows.onRemoved.removeListener(onRemoved);
      if (modal)
        browser.windows.onFocusChanged.removeListener(onFocusChanged);
      if (browser.windows.onUpdated)
        browser.windows.onUpdated.removeListener(onUpdated);
      if (onUpdated.timer)
        window.clearInterval(onUpdated.timer);
      browser.windows.remove(win.id);
      reject();
    };
    browser.windows.onRemoved.addListener(onRemoved);

    // step 2: open real dialog window
    const positionParams = {};
    if (typeof left == 'number')
      positionParams.left = left;
    if (typeof top == 'number')
      positionParams.top = top;
    win = await browser.windows.create({
      type:   'popup',
      url:    url.replace(/(dialog-offscreen)=true/, '$1=false'),
      width:  Math.ceil(width + widthOffset),
      height: Math.ceil(height + heightOffset),
      ...positionParams,
      allowScriptsToClose: true
    });
    // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
    browser.windows.get(win.id).then(openedWin => {
      if ((typeof left == 'number' && openedWin.left != left) ||
          (typeof top == 'number' && openedWin.top != top))
        browser.windows.update(win.id, { left, top });
    });

    if (!('windowId' in dialogContentsParams))
      dialogContentsParams.windowId = win.id;
  });
}



// utilities for dialog itself

function getCurrentId() {
  const params = new URLSearchParams(location.search);
  return params.get('dialog-id');
}

export async function getParams() {
  const params = new URLSearchParams(location.search);
  const id = params.get('dialog-id');

  if (params.get('dialog-offscreen') != 'true')
    return browser.runtime.sendMessage({
      type: TYPE_FETCH_PARAMS,
      id
    });
  else
    return new Promise((resolve, _reject) => {
      document.addEventListener(TYPE_RESPOND_PARAMS, event => resolve(event.detail), { once: true });
      document.dispatchEvent(new CustomEvent(TYPE_FETCH_PARAMS, {
        detail:     null,
        bubbles:    true,
        cancelable: false,
        composed:   true
      }));
    });
}

let mCurrentWindowId;

export function notifyReady() {
  const params = new URLSearchParams(location.search);
  const id = params.get('dialog-id');

  initDialogListener(id);

  const detail = {
    id,
    windowWidthOffset:  Math.max(0, window.outerWidth - window.innerWidth),
    windowHeightOffset: Math.max(0, window.outerHeight - window.innerHeight)
  };

  if (params.get('dialog-offscreen') != 'true')
    browser.runtime.sendMessage({
      type: TYPE_READY,
      ...detail
    }).then(windowId => mCurrentWindowId = windowId);
  else
    document.dispatchEvent(new CustomEvent(TYPE_READY, {
      detail,
      bubbles:    true,
      cancelable: false,
      composed:   true
    }));

  setTimeout(() => {
    document.documentElement.classList.add('ready');
  }, 0);
}

function initDialogListener(id) {
  const onMessage = (message, _sender) => {
    if (!message || message.id != id)
      return;

    switch (message.type) {
      case TYPE_FOCUS:
        window.focus();
        break;

      case TYPE_MOVED:
        document.dispatchEvent(new CustomEvent(TYPE_MOVED, {
          detail: {
            left: message.left,
            top:  message.top
          },
          bubbles:    true,
          cancelable: false,
          composed:   true
        }));
        break;
    }
  };
  browser.runtime.onMessage.addListener(onMessage);

  const onRemoved = windowId => {
    if (!mCurrentWindowId ||
        windowId != mCurrentWindowId)
      return;
    browser.runtime.onMessage.removeListener(onMessage);
    browser.windows.onRemoved.removeListener(onRemoved);
  };
  browser.windows.onRemoved.addListener(onRemoved);
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

export function initButton(button, onCommand) {
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
