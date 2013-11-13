#!/bin/sh

appname=flex-confirm-mail

cp buildscript/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

