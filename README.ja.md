# FlexConfirmMail

このアドオンは「Confirm Mail」の改造版です。メール送信時の確認の「例外」を定義する事ができます。

## 例外のドメイン

設定ダイアログ、もしくは設定項目の `net.nyail.tanabec.confirm-mail.exceptional-domains` を使って組織外のドメインの例外を定義する事ができます。
このリストにドメインを登録しておくと、そのリストに含まれる例外のドメイン宛のメールを送ろうとした場合に、追加の確認ダイアログが表示されるようになります。
確認のメッセージは文字列型の設定 `net.nyail.tanabec.confirm-mail.exceptionalDomain.title` と `net.nyail.tanabec.confirm-mail.exceptionalDomain.message` で変更できます。
これは、SMTPサーバが常に外部ドメイン宛のメールを暗号化するが、希に暗号化せずに送らなければならない例外のドメインがある、といった場合に利用できます。

## 例外の拡張子

設定ダイアログ、もしくは設定項目の `net.nyail.tanabec.confirm-mail.exceptional-suffixes` を使って添付ファイルの拡張子の例外を定義する事ができます。
このリストに拡張子を登録しておくと、そのリストに含まれる拡張子のファイルを添付したメールを送ろうとした場合に、追加の確認ダイアログが表示されるようになります。
確認のメッセージは文字列型の設定 `net.nyail.tanabec.confirm-mail.exceptionalSuffix.title` と `net.nyail.tanabec.confirm-mail.exceptionalSuffix.message` で変更できます。
これは、SMTPサーバが常に添付ファイルを暗号化するが、希に暗号化せずに送らなければならない例外のドメインがある、といった場合に利用できます。
