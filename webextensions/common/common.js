/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';
import * as Constants from './constants.js';

export const configs = new Configs({
  configsVersion: 0,
  debug: false
}, {
  localKeys: [
    'configsVersion',
    'debug'
  ]
});
