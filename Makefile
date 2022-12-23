PACKAGE_NAME = flex-confirm-mail

.PHONY: xpi lint host

all: xpi

xpi:
	cd webextensions && make && cp ./*.xpi ../

host:
	cd webextensions && make host && cp ./*.zip ../

unittest:
	cd webextensions && make test

lint:
	cd webextensions && make lint
