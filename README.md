# FlexConfirmMail

This is an extended version of the addon "Confirm Mail". You can define "exceptions" for confirmation.

## For Regular Users

You can define "exceptions" and "extra conditions" for confirmation of message sending operation. Some features depend on the native messaging host, please download/install it from [the latest release page for 3.x and later](https://github.com/clear-code/flex-confirm-mail/releases/latest) ([4.0.2](https://github.com/clear-code/flex-confirm-mail/releases/tag/4.0.2) for example).

This has an intelligent reconfirmation mode: *reconfirms only on cases with higher risk of miss-sending *, for example; there are added recipients, message body is copied from another existing message sent to different recipients, very long text is copied from external application, and so on.
Moreover this has ability to show more reconfirmations with various conditions.

And, this has a "delayed send" feature also, like "send after 5 seconds after confirmation". This will give you one more chance to cancel sending.

### Exceptional Domains

If you put some domains to the "exceptional domains" list and you try to send a mail to an address in the list, an extra confirmation dialog will be shown. It will be useful in a case like: your SMTP server always encrypts your mail automatically but there are some exceptions.

### Exceptional Attachment Suffixes

If you put some "file extension"s to the "exceptional attachment suffixes" list and you try to send a mail with an attachment including a suffix in the list, an extra confirmation dialog will be shown. It will be useful in a case like: your SMTP server always encrypts attachments but there are some exception file types.

### Exceptional Keywords for Attachment Filenames

If you put some notifiable keywords to the "exceptional attachment names" list and you try to send a mail with an attachment including a term in the list, an extra confirmation dialog will be shown. It will be useful in a case like: your company has a policy to use special terms like "confidential" for some special attachemnt files.

### Blocked domains

If you put some dangerous domains to the "blocked domains" list and you try to send a mail with an attachment including a term in the list, the operation will be canceled always. It will be useful in a case like: your company maintains a list of dangerous recipient domains.

## For System Administrators

This addon supports [Managed Storage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#managed_storage_manifests).
You can override any [configs](https://github.com/clear-code/flex-confirm-mail/blob/08d59d82f282ac86bb809ab11d560f2107c59fde/webextensions/common/common.js#L14-L233) via GPO, [`policies.json`](https://github.com/mozilla/policy-templates) and/or managed storage manifest.
For example, if you use the `policies.json`:

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "flexible-confirm-mail-progressive@clear-code.com": {
          "internalDomains": [
            "clear-code.com"
          ],
          "skipConfirmationForInternalMail": true
        }
      }
    }
  }
}
```

It will help you to create such an managed storage manifest with exported configs: FlexConfirmMail options => "Development" => Check "Debug mode" => "All Configs" => "Export".
(Please remind that you should remove `"debug":true` from the managed manifest.)

`itemsFile` under `overrideBaseRules` or other configs will contain path to a pattern file.
It is regularly a complete file path on the platform, but you can use environment variables with formats `%VAR%` or `${VAR}`.
For example:

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "flexible-confirm-mail-progressive@clear-code.com": {
          "overrideBaseRules": [
            { "id": "builtInAttentionDomains" },
            { "id": "builtInAttentionSuffixes" },
            { "id": "builtInAttentionSuffixes2" },
            {
               "id": "builtInAttentionTerms",
               "enabled": true,
               "itemsSource": 1,
               "itemsFile": "${ParentProcessDir}\\distribution\\attention_terms.csv"
            },
            { "id": "builtInBlockedDomains" }
          ]
        }
      }
    }
  }
}
```

`ParentProcessDir` is a special variable which will be expanded to the path to the directory Thunderbird is installed.
`"%VAR%"` style is available only at the beginning of the path, for safety.


## For Developers

### How to run automated unittest?

1. Install Node.js including npm to your local machine.
2. Clone this repository to your local machine.
3. In the cloned repository directory, run `cd webextensions && npm install` to insatll dependencies.
4, In the cloned repository, run `make unittest`.

### How to do manual test?

1. Download "Assets" from [any CI result's artifacts](https://github.com/FlexConfirmMail/Thunderbird/actions/workflows/build-release.yaml).
2. Extract XPI and native messaging host from the downloaded Assets.
3. Run `install.bat` to Install native messaging host extracted at the step 2, if it is not installed.
4. Start Thunderbird.
5. Open the Add-ons Manager.
6. Drag downloaded XPI file and drop it to the Add-ons Manager.
7. Accept installation of the new FlexConfirmMail.
8. Open `sample.eml` with Thunderbird.
9. Hit Ctrl-E to edit the mail as a new message.
10. Try to send it.

### How to build the native messaging host and its installer?

See `doc/HowToBuild.md`.
