NAME = com.clear_code.flexible_confirm_mail_we_host
.PHONY: host

all: host

host:
	./build.sh
	cp $(NAME).windows.json $(NAME).json
	zip -r -9 ./flex-confirm-mail-nmh-without-installer.zip 386 amd64 *.bat $(NAME).json
	rm $(NAME).json
