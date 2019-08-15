PACKAGE_NAME = flex-confirm-mail

all: xpi

xpi: makexpi/makexpi.sh copy-extlib
	git stash
	rm -rf content/unittest/
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o
	git checkout content/unittest/
	git stash pop

unittest: makexpi/makexpi.sh copy-extlib
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o

makexpi/makexpi.sh:
	git submodule update --init

copy-extlib:
	mkdir -p modules/lib/
	cp extlib/**/*.js* modules/lib/
	rm -f modules/lib/*.test.js

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi
