NPM_MOD_DIR := $(CURDIR)/node_modules
NPM_BIN_DIR := $(NPM_MOD_DIR)/.bin

.PHONY: xpi install_dependency install_hook lint format update_extlib test

all: xpi

install_dependency:
	[ -e "$(NPM_BIN_DIR)/eslint" -a -e "$(NPM_BIN_DIR)/jsonlint-cli" ] || npm install

install_hook:
	echo '#!/bin/sh\nmake lint' > "$(CURDIR)/../.git/hooks/pre-commit" && chmod +x "$(CURDIR)/../.git/hooks/pre-commit"

lint: install_dependency
	"$(NPM_BIN_DIR)/eslint" . --ext=.js --report-unused-disable-directives
	find . -type d -name node_modules -prune -o -type f -name '*.json' -print | xargs "$(NPM_BIN_DIR)/jsonlint-cli"

format: install_dependency
	"$(NPM_BIN_DIR)/eslint" . --ext=.js --report-unused-disable-directives --fix

xpi: update_extlib lint
	rm -f ./*.xpi
	zip -r -9 flex-confirm-mail-we.xpi manifest.json -x '*/.*' >/dev/null 2>/dev/null

update_extlib:
	git submodule update --init

test:
	npm run test
