PACKAGE_NAME = flex-confirm-mail

all: xpi

xpi: buildscript/makexpi.sh
	cp buildscript/makexpi.sh ./
	rm -r content/unittest/
	./makexpi.sh -n $(PACKAGE_NAME) -o
	rm ./makexpi.sh
	git checkout content/unittest/

buildscript/makexpi.sh:
	git submodule update --init
