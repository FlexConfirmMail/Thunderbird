#!/bin/sh

[ ! -f ./build_pkg_configs.sh ] || exit 1
. ./build_pkg_configs.sh

# build universal binary and sign
lipo -create -output host host_darwin_*
if [ "$APP_CERT_NAME" != "" ]; then
  codesign --force --options runtime --sign "$APP_CERT_NAME" ./host
fi

# build .pkg and sign
rm -rf staging
mkdir -p 'staging/$NMH_NAME'
cp *.json staging/
cp host 'staging/$NMH_NAME/'
chmod 644 staging/*.json
chmod 755 staging/*/host
pkgbuild --root staging --identifier $NMH_NAME --install-location '/Library/Application Support/Mozilla/NativeMessagingHosts/' --version $(./host -v) "$NMH_NAME.pkg"
if [ "$PKG_CERT_NAME" != "" ]; then
  productsign --sign "$PKG_CERT_NAME" "./$NMH_NAME.pkg" "./$NMH_NAME.signed.pkg"
fi

# notarization
if codesign -dvvv ./host 2>&1 | grep "Authority=$APP_CERT_NAME" > /dev/null &&
   pkgutil --check-signature "./$NMH_NAME.signed.pkg" > /dev/null; then
  xcrun notarytool submit "$PWD/$NMH_NAME.signed.pkg" --keychain-profile "Pkg Signing" --wait
  xcrun stapler staple "$PWD/$NMH_NAME.signed.pkg"
fi
