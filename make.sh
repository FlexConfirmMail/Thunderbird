#!/bin/sh

appname=flex-confirm-mail

cp buildscript/makexpi.sh ./
rm -r content/unittest/
./makexpi.sh -n $appname -o
rm ./makexpi.sh
git checkout content/unittest/

