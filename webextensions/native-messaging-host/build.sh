#!/usr/bin/env bash

#set -x

dist_dir="$(cd "$(dirname "$0")" && pwd)"
temp_src="src/temp_flexible_confirm_mail"

host_name="$(ls *.windows.json | sed -E -e 's/.windows.json$//')"
msi_basename=flex-confirm-mail-nmh

if go version 2>&1 >/dev/null
then
  echo "using $(go version)"
else
  echo 'ERROR: golang is missing.' 1>&2
  exit 1
fi

main() {
  build_host
  prepare_msi_sources
}

build_host() {
  cd "$dist_dir"
  addon_version="$(cat "$dist_dir/../manifest.json" | jq -r .version)"
  echo "version is ${addon_version}"
  sed -i.bak -E -e "s/^(const VERSION = \")[^\"]*(\")/\1${addon_version}\2/" "$dist_dir/host.go"

  gox -osarch="windows/386 windows/amd64 darwin/amd64 darwin/arm64"
  # On my environment gox unexpectedly fails to build arm64 binary for darwin... why?
  if [ ! -f ./host_darwin_arm64 ]; then
    GOOS=darwin GOARCH=arm64 CC=aarch64-linux-gnu-gcc go build -o host_darwin_arm64
  fi

  local arch
  for binary in host_windows_*.exe
  do
    arch="$(basename "$binary" '.exe' | sed 's/.\+_windows_//')"
    mkdir -p "$dist_dir/$arch"
    mv "$binary" "$dist_dir/$arch/host.exe"
  done

  prepare_macos_host_kit

  echo "done."
}

prepare_dependency() {
  local path="$1"
  [ -d "src/$path" ] || go get "$path"
}

prepare_msi_sources() {
  cd "$dist_dir"

  product_name="$(cat wix.json | jq -r .product)"
  vendor_name="$(cat wix.json | jq -r .company)"
  addon_version="$(cat ../manifest.json | jq -r .version)"
  upgrade_code_guid="$(cat wix.json | jq -r '."upgrade-code"')"
  files_guid="$(cat wix.json | jq -r .files.guid)"
  env_guid="$(cat wix.json | jq -r .env.guid)"

  cat templates/product.wxs.template |
    sed -E -e "s/%PRODUCT%/${product_name}/g" \
           -e "s/%NAME%/${host_name}/g" \
           -e "s/%VENDOR%/${vendor_name}/g" \
           -e "s/%VERSION%/${addon_version}/g" \
           -e "s/%UPGRADE_CODE_GUID%/${upgrade_code_guid}/g" \
           -e "s/%FILES_GUID%/${files_guid}/g" \
           -e "s/%ENV_GUID%/${env_guid}/g" \
      > templates/product.wxs

  cat "build_msi.bat.template" |
    sed -E -e "s/\\$\{host_name\}/${host_name}/g" \
           -e "s/\\$\{msi_basename\}/${msi_basename}/g" \
           -e "s/\\$\{addon_version\}/${addon_version}/g" \
      > "build_msi.bat"
}

prepare_macos_host_kit() {
  mkdir -p "$dist_dir/darwin/"
  mv host_darwin_* "$dist_dir/darwin/"
  cp $host_name.macos.json "$dist_dir/darwin/$host_name.json"

  cat "build_pkg.sh.template" |
    sed -E -e "s/\\$\{host_name\}/${host_name}/g" \
      > "$dist_dir/darwin/build_pkg.sh"
}

main
