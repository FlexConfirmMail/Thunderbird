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
        "flexible-confirm-mail@clear-code.com": {
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

## For Developers

### How to run automated unittest?

1. Create an XPI including unittest, with the command `make unittest`.
2. Install the built XPI.
3. Open the browser console or the developer tool for the Thunderbird itself.
4. Run `openDialog('chrome://confirm-mail/content/unittest/testRunner.html', '_blank', 'chrome,all')`.

### How to do manual test?

1. Open `sample.eml` with Thunderbird.
2. Hit Ctrl-E to edit the mail as a new message.
3. Try to send it.

### How to build the native messaging host and its installer?

On Windows 10 + WSL:

1. [Install and setup Golang](https://golang.org/doc/install) on your Linux environment.
2. Install go-msi https://github.com/mh-cbon/go-msi *via an MSI to your Windows environment*.
3. Install WiX Toolset https://wixtoolset.org/releases/ to your Windows environment.
4. Set PATH to go-msi (ex. `C:\Program Files\go-msi`) and WiX Toolse (ex. `C:\Program Files (x86)\WiX Toolset v3.11\bin`).
5. Run `make host`.
   Then `.exe` files and a batch file to build MSI will be generated.
6. Double-click the generated `webextensions\native-messaging-host\build_msi.bat` on your Windows environment.
   Then two MSIs will be generated.

