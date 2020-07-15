/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const TYPE_RESIZED = 'resizable-box-resized';

let mResizableBoxCount = 0;
const mResizableBoxes = new Map();

export function init(sizes) {
  for (const splitter of document.querySelectorAll('hr.splitter')) {
    if (!splitter.previousElementSibling ||
        !splitter.nextElementSibling)
      continue;

    const previousBox = splitter.previousElementSibling;
    const nextBox = splitter.nextElementSibling;

    if (!previousBox.id)
      previousBox.id = `resizable-box-${mResizableBoxCount++}`;
    if (!nextBox.id)
      nextBox.id = `resizable-box-${mResizableBoxCount++}`;

    mResizableBoxes.set(previousBox.id, previousBox);
    mResizableBoxes.set(nextBox.id, nextBox);
    splitter.addEventListener('mousedown', onMouseDown);
    splitter.addEventListener('mouseup', onMouseUp);
  }

  if (sizes && typeof sizes == 'object') {
    for (const id of Object.keys(sizes)) {
      const size = sizes[id];
      const box = mResizableBoxes.get(id);
      if (!box || typeof size != 'number')
        continue;
      box.style.height = `${size}px`;
    }
  }
}

let mStartY;
let mStartPreviousHeight;
let mStartNextHeight;
let mResizingSplitter;

function onMouseDown(event) {
  mResizingSplitter = event.currentTarget;
  mStartY = event.screenY;
  mStartPreviousHeight = mResizingSplitter.previousElementSibling.offsetHeight;
  mStartNextHeight = mResizingSplitter.nextElementSibling.offsetHeight;
  mResizingSplitter.setCapture(false);
  window.addEventListener('mousemove', onResizing);
}

function resizeBoxesFor(splitter, event) {
  const delta = event.screenY - mStartY;
  const result = {};
  splitter.previousElementSibling.style.height = `${mStartPreviousHeight + delta}px`;
  splitter.nextElementSibling.style.height = `${mStartNextHeight - delta}px`;
  for (const box of mResizableBoxes.values()) {
    if (box != splitter.previousElementSibling &&
        box != splitter.nextElementSibling) {
      box.style.height = `${box.offsetHeight}px`;
    }
    result[box.id] = box.offsetHeight;
  }
  return result;
}

let mThrottledResize;

function onMouseUp(event) {
  if (mThrottledResize) {
    clearTimeout(mThrottledResize);
    mThrottledResize = null;
  }
  const resizeResult = resizeBoxesFor(mResizingSplitter, event);
  document.releaseCapture();
  window.removeEventListener('mousemove', onResizing);
  mStartY = null;
  mStartPreviousHeight = null;
  mStartNextHeight = null;
  mResizingSplitter = null;
  event.currentTarget.dispatchEvent(new CustomEvent(TYPE_RESIZED, {
    detail:     resizeResult,
    bubbles:    true,
    cancelable: false,
    composed:   true
  }));
}

function onResizing(event) {
  if (mThrottledResize)
    clearTimeout(mThrottledResize);
  mThrottledResize = setTimeout(() => {
    mThrottledResize = null;
    resizeBoxesFor(mResizingSplitter, event);
  }, 25);
}
