#!/usr/bin/env bash

#set -x

dist_dir="$(cd "$(dirname "$0")" && pwd)"
temp_src="src/temp_flexible_confirm_mail"

host_name="$(ls *.windows.json | sed -E -e 's/.windows.json$//')"

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
  cd $dist_dir
  addon_version="$(cat "$dist_dir/../manifest.json" | jq -r .version)"
  echo "version is ${addon_version}"
  sed -i -E -e "s/^(const VERSION = \")[^\"]*(\")/\1${addon_version}\2/" $dist_dir/host.go

  gox -osarch="windows/386 windows/amd64 darwin/amd64 darwin/arm64"

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

  build_msi_bat="build_msi.bat"
  msi_basename="flex-confirm-mail-nmh"

  rm -f "$build_msi_bat"
  touch "$build_msi_bat"
  echo -e "set MSITEMP=%USERPROFILE%\\\\temp%RANDOM%\r" >> "$build_msi_bat"
  echo -e "set SOURCE=%~dp0\r" >> "$build_msi_bat"
  echo -e "xcopy \"%SOURCE%*\" \"%MSITEMP%\" /S /I \r" >> "$build_msi_bat"
  echo -e "cd /d \"%MSITEMP%\" \r" >> "$build_msi_bat"
  echo -e "copy 386\\host.exe \"%cd%\\\" \r" >> "$build_msi_bat"
  echo -e "go-msi.exe make --msi ${msi_basename}-386.msi --version ${addon_version} --src templates --out \"%cd%\\outdir\" --arch 386 \r" >> "$build_msi_bat"
  echo -e "del host.exe \r" >> "$build_msi_bat"
  echo -e "copy amd64\\host.exe \"%cd%\\\" \r" >> "$build_msi_bat"
  echo -e "go-msi.exe make --msi ${msi_basename}-amd64.msi --version ${addon_version} --src templates --out \"%cd%\\outdir\" --arch amd64 \r" >> "$build_msi_bat"
  echo -e "xcopy *.msi \"%SOURCE%\" /I /Y \r" >> "$build_msi_bat"
  echo -e "cd /d \"%SOURCE%\" \r" >> "$build_msi_bat"
  echo -e "rd /S /Q \"%MSITEMP%\" \r" >> "$build_msi_bat"
}

prepare_macos_host_kit() {
  mkdir -p "$dist_dir/darwin/"
  mv host_darwin_* "$dist_dir/darwin/"
  cp $host_name.macos.json "$dist_dir/darwin/$host_name.json"

  local build_script="$dist_dir/darwin/build_universal_binary.sh"
  rm -f "$build_script"
  touch "$build_script"
  chmod +x "$build_script"
  echo "#!/bin/sh" >> "$build_script"
  echo "lipo -create -output host host_darwin_*" >> "$build_script"
}

main
