/*
* "The contents of this file are subject to the Mozilla Public Licenske
* Version 1.1 (the "License"); you may not use this file except in
* compliance with the License. You may obtain a copy of the License at
* http://www.mozilla.org/MPL/
* 
* Software distributed under the License is distributed on an "AS IS"
* basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
* License for the specific language governing rights and limitations
* under the License.
* 
* The Original Code is confirm-address.
* 
* The Initial Developers of the Original Code are kentaro.matsumae and Meatian.
* Portions created by Initial Developers are 
* Copyright (C) 2007-2011 the Initial Developer.All Rights Reserved.
* 
* Contributor(s): tanabec
*/ 

var Cc = Components.classes;
var Ci = Components.interfaces;

function getLocaleString(id, parameters) {
	var bundle = document.getElementById("strings");
	if (arguments.length > 1 && parameters.length)
		return bundle.getFormattedString(id, parameters);
	return bundle.getString(id);
}

function startup() {
	function setupOKButton() {
		var okBtn = document.documentElement.getButton("accept");
		okBtn.disabled = true;
		// set button label
		var strbundle = document.getElementById("strings");
		var BtnLabel = strbundle.getString("confirm.dialog.acceptbtn.label");
		okBtn.label = BtnLabel;
	}

	function createRecipientLabel(recipient) {
		var typePrefix = recipient.type + ": ";
		if (recipient.name && recipient.name != recipient.address)
			return typePrefix + recipient.name + " <" + recipient.address + ">";
		return typePrefix + (recipient.fullName || recipient.address);
	}

	function setupInternalDestinationList(internals) {
		// create internal-domain list
		var internalList = document.getElementById("yourDomainsList");

		for (var i = 0; i < internals.length; i++) {
			var listitem = createListItemWithCheckbox(createRecipientLabel(internals[i]));
			listitem.addEventListener("click", updateCheckAllCheckBox, false);
			internalList.appendChild(listitem);
		}

		// if internal-domain was empty, "select all" checkbox set checked.
		// when internalList is empty, internalList.length equals 0.
		var checkAllCheckbox = document.getElementById("check_all");
		if (internals.length == 0) {
			checkAllCheckbox.checked = true;
			checkAllCheckbox.disabled = true;
		}

		// listheader for internal domains
		checkAllCheckbox.addEventListener("command", function(event) {
			switchInternalCheckBox();
			checkAllChecked();
		}, false);
	}

	function setupExternalDomainList(externals) {
		function createGroupHeader(domain) {
			var headerItem = document.createElement("richlistitem");
			headerItem.setAttribute("class", "confirm-mail-list-separator");
			headerItem.setAttribute("data-domain-name", domain);
			var headerLabelItem = document.createElement("label");
			headerLabelItem.setAttribute("value", "@" + domain);
			headerItem.appendChild(headerLabelItem);
			return headerItem;
		}

		function setHeaderStarIconVisible(groupHeaderItem, groupAllChecked) {
			if (groupAllChecked)
				groupHeaderItem.classList.add("all-checked");
			else
				groupHeaderItem.classList.remove("all-checked");
		}

		let groupedExternalAddressItems = {};
		function isGroupAllChecked(domain) {
			return groupedExternalAddressItems[domain]
				.every(function (addressItem) {
					return addressItem.querySelector("checkbox").checked;
				});
		}
		function recordItemInGroup(domain, item) {
			if (!groupedExternalAddressItems[domain])
				groupedExternalAddressItems[domain] = [];
			groupedExternalAddressItems[domain].push(item);
		}

		function getGroupHeaderForItem(originItem) {
			var cursorItem = originItem;
			while (cursorItem &&
				!cursorItem.classList.contains("confirm-mail-list-separator")) {
				cursorItem = cursorItem.previousSibling;
			}
			return cursorItem;
		}

		var externalList = document.getElementById("otherDomainsList");
		externalList.addEventListener("click", function (event) {
			let target = event.target;
			while (target && target.localName !== "richlistitem") {
				target = target.parentNode;
			}
			if (!target || target.classList.contains("confirm-mail-list-separator"))
				return;

			let groupHeaderItem = getGroupHeaderForItem(target);
			let groupDomain = groupHeaderItem.getAttribute("data-domain-name");
			setHeaderStarIconVisible(
				groupHeaderItem,
				isGroupAllChecked(groupDomain)
			);
		}, false);

		// external domains
		function createExternalDomainsListItems(externals) {
			var groupedExternalRecipients = AddressUtil.groupDestinationsByDomain(externals);
			for (let [domainForThisGroup, destinationsForThisGroup] in Iterator(groupedExternalRecipients)) {
				let shouldBeColored = ExceptionManager.isExceptionalDomain(domainForThisGroup) &&
					AttachmentManager.hasAttachments();

				// header for this group
				let groupHeaderItem = createGroupHeader(domainForThisGroup);
				if (shouldBeColored)
					groupHeaderItem.setAttribute("data-exceptional", "true");
				setHeaderStarIconVisible(groupHeaderItem, false);
				externalList.appendChild(groupHeaderItem);

				// destinations in this group
				for (let [, destination] in Iterator(destinationsForThisGroup)) {
					let listitem = createListItemWithCheckbox(createRecipientLabel(destination));
					if (shouldBeColored) {
						listitem.setAttribute("data-exceptional", "true");
					}
					externalList.appendChild(listitem);
					recordItemInGroup(domainForThisGroup, listitem);
				}
			}
		}

		var exceptionalExternals = [];
		externals = externals.filter(function(destination) {
			var domain = AddressUtil.extractDomainFromAddress(destination);
			if (ExceptionManager.isExceptionalDomain(domain)) {
				exceptionalExternals.push(destination);
				return false;
			}
			return true;
		});
		if (exceptionalExternals.length)
			createExternalDomainsListItems(exceptionalExternals);
		createExternalDomainsListItems(externals);
	}

	function setupBodyField() {
		if (ConfirmMailDialog.requireCheckBody()) {
			var body = window.arguments[4];
			var field = document.getElementById("bodyField");
			(field.contentDocument.body || field.contentDocument.documentElement).appendChild(body);
		} else {
			var check = document.getElementById("checkbox_body");
			var box = document.getElementById("body");
			check.hidden = box.hidden = box.previousSibling.hidden = true;
		}
	}

	function setupAttachmentList(fileNames) {
		//attachments list
		var fileNamesList = document.getElementById("fileNamesList");

		var requireReinputFilename = DestinationManager.getExternalDestinationList().length > 0 &&
										ConfirmMailDialog.requireReinputAttachmentNames();
		var exceptionalItems = [];
		var normalItems = [];
		for (var i = 0; i < fileNames.length; i++) {
			let fileName = fileNames[i];
			let attachmentFileItem = createListItemWithCheckbox(fileName, {
				requireReinput: requireReinputFilename
			});
			if (ExceptionManager.fileHasExceptionalSuffix(fileName)) {
				attachmentFileItem.setAttribute("data-exceptional", "true");
				exceptionalItems.push(attachmentFileItem);
			} else {
				normalItems.push(attachmentFileItem);
			}
		}
		exceptionalItems.concat(normalItems).forEach(function(attachmentFileItem) {
			fileNamesList.appendChild(attachmentFileItem);
		});
	}

	setupOKButton();
	setupInternalDestinationList(DestinationManager.getInternalDestinationList());
	setupExternalDomainList(DestinationManager.getExternalDestinationList());
	setupBodyField();
	setupAttachmentList(AttachmentManager.getAttachmentList());
}

// Util

var FilenameUtil = {
	extractSuffix: function (fileName) {
		if (/\.([^\.]*)$/.exec(fileName)) {
			return RegExp.$1;
		} else {
			return "";
		}
	}
};

var AddressUtil = {
	trim: function (string) {
		return (string || "").replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
	},

	extractDomainFromAddress: function (address) {
		if (address && typeof address != "string")
			address = address.address || "";
		return this.trim(address.split("@")[1]) || null;
	},

	destinationListToDomains: function (destinationList) {
		return destinationList
			.map(this.extractDomainFromAddress, this);
	},

	groupDestinationsByDomain: function (recipients) {
		var recipientGroups = {};			   // domain -> [recipients]

		for (var i = 0, len = recipients.length; i < len; ++i) {
			var recipient = recipients[i];
			var domain = this.extractDomainFromAddress(recipient.address);
			if (domain) {
				if (!recipientGroups[domain]) {
					recipientGroups[domain] = [];
				}
				recipientGroups[domain].push(recipient);
			}
		}

		return recipientGroups;
	}
};

// Manager

var AttachmentManager = {
	getAttachmentList: function () {
		return window.arguments[3] || [];
	},

	hasAttachments: function () {
		let attachments = this.getAttachmentList();
		if (!attachments)
			return false;
		return attachments.length > 0;
	}
};

var DestinationManager = {
	getInternalDestinationList: function () {
		return window.arguments[1];
	},

	getExternalDestinationList: function () {
		return window.arguments[2];
	},

	getExternalDomainList: function () {
		return AddressUtil.destinationListToDomains(
			DestinationManager.getExternalDestinationList()
		);
	}
};

var ExceptionManager = {
	PREF_DOMAINS : "net.nyail.tanabec.confirm-mail.exceptional-domains",
	PREF_SUFFIXES : "net.nyail.tanabec.confirm-mail.exceptional-suffixes",

	get prefs() {
		delete this.prefs;
		let { prefs } = Components.utils.import('resource://confirm-mail-modules/lib/prefs.js', {});
		return this.prefs = prefs;
	},

	_splitToItems: function (list) {
		return list.replace(/^\s+|\s+$/g, '').split(/[,\s\|;]+/).filter(function(item) {
			return item;
		});
	},

	// Exceptional Domain

	get domains () {
		delete this.domains;
		var domains = this.prefs.getPref(this.PREF_DOMAINS) || "";
		return this.domains = this._splitToItems(domains);
	},

	isExceptionalDomain: function (domain) {
		return this.domains.indexOf(domain) >= 0;
	},

	// Exceptional Suffix

	get suffixes () {
		delete this.suffixes;
		var suffixes = this.prefs.getPref(this.PREF_SUFFIXES) || "";
		return this.suffixes = this._splitToItems(suffixes).map(function(suffix) {
			return suffix.replace(/^\*?\./g, '');
		});
	},

	isExceptionalSuffix: function (suffix) {
		return this.suffixes.indexOf(suffix) >= 0;
	},

	fileHasExceptionalSuffix: function (fileName) {
		return this.isExceptionalSuffix(FilenameUtil.extractSuffix(fileName));
	}
};

var maxTooltipTextLength = 60;
function foldLongTooltipText(text) {
	var folded = [];
	while (text.length > 0) {
		folded.push(text.substring(0, maxTooltipTextLength));
		text = text.substring(maxTooltipTextLength);
	}
	return folded.join("\n");
}

function createListItemWithCheckbox(itemLabel, aOptions) {
	aOptions = aOptions || {};
	var listitem = document.createElement("richlistitem");

	var checkboxCell = document.createElement("hbox");
	checkboxCell.classList.add("checkbox");
	var checkbox = document.createElement("checkbox");
	listitem.appendChild(checkboxCell);

	checkboxCell.appendChild(checkbox);
		let label = document.createElement("label");
		label.setAttribute("flex", 1);
		label.setAttribute("crop", "end");
		label.setAttribute("value", itemLabel);
		label.setAttribute("tooltiptext", foldLongTooltipText(itemLabel));
		listitem.appendChild(label);

	if (aOptions.requireReinput) {
		checkbox.setAttribute("disabled", true);
		let field = document.createElement("textbox");
		field.setAttribute("placeholder", getLocaleString("confirm.dialog.attachmentName.reinput.placeholder"));
		field.addEventListener("input", function(event) {
			checkbox.setAttribute("checked", event.target.value == itemLabel);
			checkAllChecked();
		}, false);
		field.onresize = function() {
			field.width = parseInt(window.outerWidth * 0.45);
		};
		window.addEventListener("resize", function() {
			field.onresize();
		});
		listitem.appendChild(field);
	} else {
		listitem.setAttribute("tooltiptext", foldLongTooltipText(itemLabel));
		listitem.onclick = function(event){
			if (event.target.localName == "checkbox") {
				setTimeout(checkAllChecked, 0);
			} else {
				var checked = checkbox.checked;
				checkbox.setAttribute("checked", !checked);
				checkAllChecked();
			}
		};
	}

	return listitem;
}

function checkAllChecked(){
	//すべてのチェックボックスの状況確認
	var complete = true;
	var checkboxes = document.getElementsByTagName("checkbox");
	for(var i = 0; i < checkboxes.length; i++){
		var cb = checkboxes[i];
		if (cb.id == "check_all" ||
			cb.hidden)
			continue;
		// don't use element.checked, because it doesn't work on out of screen elements.
		if(cb.getAttribute("checked") != "true"){
			complete = false;
			break;
		}
	}

	//送信ボタンのdisable切り替え
	var okBtn = document.documentElement.getButton("accept");
	if(complete){
		okBtn.disabled = false;
	}else{
		okBtn.disabled = true;
	}
}

//[すべて確認]チェックボックスがONなら、すべての自ドメインアドレスの確認ボックスをONにする。

function switchInternalCheckBox(){

	var checkAll = document.getElementById("check_all");
	var isChecked = checkAll.checked;
	var yourdomains = document.getElementById("yourDomainsList");
	var checkboxes = yourdomains.getElementsByTagName("checkbox");
	for(var i=0; i<checkboxes.length; i++){
		// don't use element.checked=true, because hidden (out of screen) elements are not checked.
		checkboxes[i].setAttribute("checked", isChecked);
	}

}

function updateCheckAllCheckBox(){
	setTimeout(function() {
	var checkAll = document.getElementById("check_all");
	var allItems = document.querySelectorAll("#yourDomainsList checkbox");
	var checkedItems = document.querySelectorAll("#yourDomainsList checkbox[checked='true']");
	checkAll.setAttribute("checked", allItems.length === checkedItems.length);
	}, 0);
}

var ConfirmMailDialog = {
	get prefs() {
		delete this.prefs;
		let { prefs } = Components.utils.import('resource://confirm-mail-modules/lib/prefs.js', {});
		return this.prefs = prefs;
	},

	getExceptionalRecipients: function () {
		if (!this.prefs.getPref("net.nyail.tanabec.confirm-mail.exceptional-domains.confirm"))
			return [];
		if (this.prefs.getPref("net.nyail.tanabec.confirm-mail.exceptional-domains.onlyWithAttachment") &&
			!AttachmentManager.hasAttachments())
			return [];

		return DestinationManager.getExternalDomainList()
			.filter(function (recipient) {
				var domain = AddressUtil.extractDomainFromAddress(recipient);
				return ExceptionManager.isExceptionalDomain(domain);
			});
	},

	getExceptionalAttachments: function () {
		if (!this.prefs.getPref("net.nyail.tanabec.confirm-mail.exceptional-suffixes.confirm") ||
			!AttachmentManager.hasAttachments())
			return [];

		return AttachmentManager.getAttachmentList()
			.filter(function (attachment) {
				var suffix = FilenameUtil.extractSuffix(attachment);
				return ExceptionManager.isExceptionalSuffix(suffix);
			});
	},

	requireCheckBody: function () {
		return this.prefs.getPref("net.nyail.tanabec.confirm-mail.requireCheckBody");
	},

	requireReinputAttachmentNames: function () {
		return this.prefs.getPref("net.nyail.tanabec.confirm-mail.requireReinputAttachmentNames");
	},

	confirmExceptionalDomains: function (exceptions) {
		return this.confirm("exceptionalDomain", exceptions);
	},

	confirmExceptionalSuffixes: function (exceptions) {
		return this.confirm("exceptionalSuffix", exceptions);
	},

	confirm: function (messageType, exceptions) {
		let promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);
		let flags = (promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0)
			+ (promptService.BUTTON_TITLE_CANCEL * promptService.BUTTON_POS_1);
		return promptService.confirmEx(window,
			this.prefs.getLocalizedPref("net.nyail.tanabec.confirm-mail." + messageType + ".title"),
			this.prefs.getLocalizedPref("net.nyail.tanabec.confirm-mail." + messageType + ".message")
				.replace(/\%s/i, exceptions),
			flags,
			getLocaleString("confirm.dialog.acceptbtn.label"),
			"",
			"",
			null,
			{}
		) === 0;
	}
};

function doOK(){
	let recipients = ConfirmMailDialog.getExceptionalRecipients();
	if (recipients.length > 0) {
		if (!ConfirmMailDialog.confirmExceptionalDomains(recipients.join('\n'))) {
			return false;
		}
	}

	let attachments = ConfirmMailDialog.getExceptionalAttachments();
	if (attachments.length > 0) {
		if (!ConfirmMailDialog.confirmExceptionalSuffixes(attachments.join('\n'))) {
			return false;
		}
	}

	var parentWindow = window.arguments[0];
	parentWindow.confmail_confirmOK = true;

	return true;
}

function doCancel(){

	var parentWindow = window.arguments[0];
	parentWindow.confmail_confirmOK = false;
	return true;
}
