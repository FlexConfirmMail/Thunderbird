PACKAGE_NAME = flex-confirm-mail

.PHONY: xpi lint host

all: xpi

xpi: makexpi/makexpi.sh copy-extlib
	rm -f .need-stash-pop
	git stash | grep 'No local changes to save' || touch .need-stash-pop
	rm -rf content/unittest/
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o
	git checkout content/unittest/
	[ -f .need-stash-pop ] && git stash pop || true
	rm -f .need-stash-pop
	cd webextensions && make && cp ./*.xpi ../

host:
	cd webextensions && make host && cp ./*host.zip ../

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

lint:
	cd webextensions && make lint
