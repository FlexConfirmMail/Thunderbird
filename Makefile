PACKAGE_NAME = flex-confirm-mail

all: xpi

xpi: makexpi/makexpi.sh
	rm -r content/unittest/
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o
	git checkout content/unittest/

makexpi/makexpi.sh:
	git submodule update --init

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi
