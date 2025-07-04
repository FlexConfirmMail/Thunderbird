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

Prepare Windows 10 + WSL and macOS environments.
On Windows:

1. [Install and setup Golang](https://golang.org/doc/install) on your Linux environment.
   * On Ubuntu 22.04LTS: you may just run `sudo apt install golang-go gox gcc-aarch64-linux-gnu`
2. Install go-msi https://github.com/mh-cbon/go-msi *via an MSI to your Windows environment*.
3. Install WiX Toolset https://wixtoolset.org/releases/ to your Windows environment.
4. Set PATH to go-msi (ex. `C:\Program Files\go-msi`) and WiX Toolset (ex. `C:\Program Files (x86)\WiX Toolset v3.11\bin`).
5. Run `make host`.
   Then `.exe` files and a batch file to build MSI will be generated.
6. Double-click the generated `webextensions\native-messaging-host\build_msi.bat` on your Windows environment.
   Then two MSIs will be generated.

And, on macOS:

1. If you need to distribute notarized pkg, prepare these things:
   * Install XCode. (You may need to update the macOS before that.)
   * Create your personal Apple ID (assume it is `myname@example.com`) and join to the Apple Developer Program. (*Payment required)
   * Create an application password named as `Pkg Signing`. Assume that the generated password.
   * Create a cerficate signing request.
     1. Open "Keychain Access (キーチェーンアクセス)": "Finder" => "Application (アプリケーション)" => "Utilities (ユーティリティ)" => "Keychain Access (キーチェーンアクセス)"
     2. In the menubar: "Keychain Access (キーチェーンアクセス)" => "Certificate Assistant (証明書アシスタント)" => "Request a Certificate From a Certificate Authority (認証局に証明書を要求)"
     3. Fill fields with your Apple ID (email addressm) and your company name (assume it is `My Company`). The email field of the CA can be blank.
     4. Click "Save to Disk (ディスクに保存)" and "Continue (続ける)".
     5. A file named as `CertificateSigningRequest.certSign` will be saved. Store it somewhere.
   * Create a certificate for code signing.
     1. Go to the [Apple Developer Portal](https://developer.apple.com/) and transit to the [Certificates, IDs, & Profiles](https://developer.apple.com/account/resources/certificates/list).
     2. Click `Create a certificate`.
     3. Choose `Developer ID Application - This certificate is used to code sign your app for distribution outside of the Mac App Store.` and click `Continue`.
     4. Choose `Previous Sub-CA`.
     5. Click `Choose File`, choose `CertificateSigningRequest.certSign` you've created and click `Continue`.
     6. Click `Download Your Certificate` to download the certificate file `developerID_application.cer`.
     7. Double-click downloaded `developerID_application.cer` to import it to the Keychain Access.
     8. In a terminal, run `security find-identity -v | grep -E -o '(Developer ID Application:[^"]+")` to get the certificate name. Assume that it is `Developer ID Application: My Company (XXXXXXXXXXX)`. The part "XXXXXXXXXX" is your team ID.
   * Create a certificate for signing to installer packages.
     1. Go to the [Certificates, IDs, & Profiles](https://developer.apple.com/account/resources/certificates/list) again.
     2. Click `Create a certificate`.
     3. Choose `Developer ID Installer - This certificate is used to sign your app's Installer Package for distribution outside of the Mac App Store.` and click `Continue`.
     4. Choose `Previous Sub-CA`.
     5. Click `Choose File`, choose `CertificateSigningRequest.certSign` you've created and click `Continue`.
     6. Click `Download Your Certificate` to download the certificate file `developerID_installer.cer`.
     7. Double-click downloaded `developerID_installer.cer` to import it to the Keychain Access.
     8. In a terminal, run `security find-identity -v | grep -E -o '(Developer ID Installer:[^"]+")` to get the certificate name. Assume that it is `Developer ID Installer: My Company (XXXXXXXXXXX)`.
   * Configure your shell (with `~/.bashrc` or `~/.zshrc`) as:
     ```
     export APPLE_ID="myname@example.com"
     export APP_CERT_NAME="Developer ID Application: My Company (XXXXXXXXXXX)"
     export PKG_CERT_NAME="Developer ID Installer: My Company (XXXXXXXXXXX)"
     ```
1. Copy built `darwin` directory to the local storage of your macOS environment.
2. Open a terminal window.
3. `cd` to the copied `darwin` directory.
4. Run `build_pkg.sh`.
   Then a `.pkg` file will be generated.
   * You'll see some authentication dialogs to access the Keychain Access or login as `Pkg Signing`, if you prepared `APPLE_ID`, `APP_CERT_NAME` and `PKG_CERT_NAME` as described above and you ran the `build_pkg.sh` on a macOS desktop environment.
     The built file `.signed.pkg` is notarized, so you should distribute it instead of the unsigned version.


### How to release a new version?

1. `cd %temp% && git clone https://github.com/FlexConfirmMail/Thunderbird.git flex-confirm-mail-thunderbird && cd flex-confirm-mail-thunderbird` to prepare working repository with clean state.
2. `git switch master && git submodule update --init --recursive`
3. `git log` (or `tig`) to confirm there is no needless/unexpected change from the last release.
4. Run the [QA test before release](doc/PreReleaseVerification.md).
5. Bump the version if the version number has not incremented yet.
   1. `git switch -c release-x.x.x` to create a branch for the release.
   2. Bump the version in the file [`manifest.json`](webextensions/manifest.json).
   3. `make host` to update `host.go` with the updated version number.
   4. Commit changes of [`manifest.json`](webextensions/manifest.json) and [`host.go`](webextensions/native-messaging-host/host.go) around the version.
   5. `git push --set-upstream origin release-x.x.x`
   6. Create a new pull request for the release.
   7. Wait until it is reviewed and merged.
   8. `git switch master`
   9. `git pull origin master`
   10. `git submodule update --init --recursive`
6. Prepare packages.
   1. `make` to build XPI and `make host` to build the native messaging host.
   2. Run `cd webextensions` and `./make_msi.bat` on `cmd.exe` to build MSI packages.
   3. Build the package for macOS.
   4. Rename built packages with the version number, like as:
      * `flex-confirm-mail-we-x.x.x.xpi`
      * `flex-confirm-mail-nmh-without-installer-x.x.x.zip`
      * `flex-confirm-mail-nmh-386-x.x.x.msi`
      * `flex-confirm-mail-nmh-amd64-x.x.x.msi`
      * `com.clear_code.flexible_confirm_mail_we_host.signed-x.x.x.pkg`
7. Create a tag for the new release.
   1. List changes from the last release.
   2. `git tag -a x.x.x`
   3. `git push --tags`
8. Create a GitHub release from the new tag.
   1. Go to the [list of tags](https://github.com/FlexConfirmMail/Thunderbird/tags).
   2. Click the title of the latest tag.
   3. Create a new release from the tag.
   4. Upload packages to the release.
   5. Publish the release.
9. Publish XPI to the addons store.
   1. Go to the [dashboard](https://addons.thunderbird.net/developers/).
   2. Log in with the account `firefox-support@clear-code.com`.
   3. Go to the [edit page of the FlexConfirmMail](https://addons.thunderbird.net/developers/addon/flex-confirm-mail/edit).
   4. Click the link "Upload New Version".
   5. Upload the built XPI.
   6. Check to "Thunderbird" and continue.
   7. Upload the downloaded zip from the repository as the source code.
   8. Enter developer information to the reviewer as:
      ```
      Here is descriptions how to build the native messaging host from the source.
      https://github.com/FlexConfirmMail/Thunderbird/blob/master/README.md#how-to-build-the-native-messaging-host-and-its-installer
      ```
   9. Register a new release for the version.
   10. Edit the listing information of the version.
       * Copy the release notes from the GitHub page to the default locale `en-US`.
       * Fill the release notes for locales `ja-JP` (and `zh-CN` if possible).
10. Wait until the uploaded version is reviewed and published.
