# How to build the native messaging host and its installer?

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
