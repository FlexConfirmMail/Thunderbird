# How to release a new version?

1. `cd /tmp && git clone git@github.com:FlexConfirmMail/Thunderbird.git flex-confirm-mail-thunderbird && cd flex-confirm-mail-thunderbird` to prepare working repository with clean state.
2. `git switch stable && git checkout (the revision to release) && git submodule update --init --recursive`
3. `git log` (or `tig`) to confirm there is no needless/unexpected change from the last release.
4. Run the [QA test before release](doc/PreReleaseVerification.md).
5. Bump the version if the version number has not incremented yet.
   1. `git switch -c release-x.x.x` to create a branch for the release.
   2. Bump the version in the file [`manifest.json`](webextensions/manifest.json).
   3. `make host` to update `host.go` with the updated version number.
   4. Commit changes of [`manifest.json`](webextensions/manifest.json) and [`host.go`](webextensions/native-messaging-host/host.go) around the version.
   5. `git push --set-upstream origin release-x.x.x`
   6. Create a new pull request for the release. It need to be merged to the branch `stable`.
   7. Wait until it is reviewed and merged.
   8. `git switch stable`
   9. `git pull origin stable`
   10. `git submodule update --init --recursive`
6. Prepare packages.
   1. `make` to build XPI and `make host` to build the native messaging host.
   2. Copy `webextensions/native-messaging-host` to a Windows local folder, and run `make_msi.bat` on `cmd.exe` to build MSI packages.
      * Note: a version with segments over 3 will block to build MSI packages, thus you may need to edit the version number to 3 segments with extra after hyphen like `x.x.x-x` in the generated `make_msi_config.bat` manually.
   3. Build the package for macOS.
   4. Rename built packages with the version number, like as:
      * `flex-confirm-mail-stable-we-x.x.x.xpi`
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
   5. Mark the release as "None".
   6. Publish the release.
9. Publish XPI to the addons store.
   1. Go to the [dashboard](https://addons.thunderbird.net/developers/).
   2. Log in with the account `firefox-support@clear-code.com`.
   3. Go to the [edit page of the FlexConfirmMail Stable](https://addons.thunderbird.net/developers/addon/flex-confirm-mail-stable/edit).
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
