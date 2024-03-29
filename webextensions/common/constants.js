/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const TYPE_COMPOSE_STARTED = 'compose-started';
export const TYPE_COMPOSE_SOMETHING_COPIED = 'compose-something-copied';
export const TYPE_COMPOSE_SOMETHING_PASTED = 'compose-something-pasted';
export const TYPE_MESSAGE_DISPLAY_SOMETHING_COPIED = 'message-display-something-copied';

export const HOST_ID = 'com.clear_code.flexible_confirm_mail_we_host';
export const HOST_COMMAND_FETCH = 'fetch';
export const HOST_COMMAND_CHOOSE_FILE = 'choose-file';
export const HOST_COMMAND_FETCH_OUTLOOK_GPO_CONFIGS = 'outlook-gpo-configs';

export const CONFIRMATION_MODE_NEVER = 0;
export const CONFIRMATION_MODE_ALWAYS = 1;
export const CONFIRMATION_MODE_ONLY_MODIFIED = 2;

export const CLIPBOARD_STATE_SAFE = 0;
export const CLIPBOARD_STATE_PASTED_TO_DIFFERENT_SIGNATURE_MAIL = 1 << 0;
export const CLIPBOARD_STATE_PASTED_TOO_LARGE_TEXT = 1 << 1;
export const CLIPBOARD_STATE_UNSAFE = (1 << 0) | (1 << 1);

export const MATCH_TO_RECIPIENT_DOMAIN  = 0;
export const MATCH_TO_ATTACHMENT_NAME   = 1;
export const MATCH_TO_ATTACHMENT_SUFFIX = 2;
export const MATCH_TO_SUBJECT           = 3;
export const MATCH_TO_BODY              = 4;
export const MATCH_TO_SUBJECT_OR_BODY   = 5;

export const HIGHLIGHT_NEVER                           = 0;
export const HIGHLIGHT_ALWAYS                          = 1;
export const HIGHLIGHT_ONLY_WITH_ATTACHMENTS           = 2;
export const HIGHLIGHT_ONLY_EXTERNALS                  = 3;
export const HIGHLIGHT_ONLY_EXTERNALS_WITH_ATTACHMENTS = 4;

export const ACTION_NONE                                      = 0;
export const ACTION_RECONFIRM_ALWAYS                          = 1;
export const ACTION_RECONFIRM_ONLY_WITH_ATTACHMENTS           = 2;
export const ACTION_RECONFIRM_ONLY_EXTERNALS                  = 3;
export const ACTION_RECONFIRM_ONLY_EXTERNALS_WITH_ATTACHMENTS = 4;
export const ACTION_BLOCK_ALWAYS                              = 10;
export const ACTION_BLOCK_ONLY_WITH_ATTACHMENTS               = 20;
export const ACTION_BLOCK_ONLY_EXTERNALS                      = 30;
export const ACTION_BLOCK_ONLY_EXTERNALS_WITH_ATTACHMENTS     = 40;

export const SOURCE_LOCAL_CONFIG = 0;
export const SOURCE_FILE = 1;

export const CONFIRMATION_FIELD_INTERNALS   = 'internals';
export const CONFIRMATION_FIELD_EXTERNALS   = 'externals';
export const CONFIRMATION_FIELD_SUBJECT     = 'subject';
export const CONFIRMATION_FIELD_BODY        = 'body';
export const CONFIRMATION_FIELD_ATTACHMENTS = 'attachments';
