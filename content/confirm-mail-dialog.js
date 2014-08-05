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
		var internalList = document.getElementById("yourDomains");

		for (var i = 0; i < internals.length; i++) {
			var listitem = createListItemWithCheckbox(createRecipientLabel(internals[i]));
			listitem.addEventListener("click", updateCheckAllCheckBox, false);
			internalList.appendChild(listitem);
		}

		// if internal-domain was empty, "select all" checkbox set checked.
		// when internalList is empty, internalList.length equals 0.
		if (internals.length == 0) {
			document.getElementById("check_all").checked = true;
			document.getElementById("check_all").disabled = true;
		}

		// listheader for internal domains
		var checkboxHeader = document.getElementById("checkbox_header");
		checkboxHeader.addEventListener("click", function(event) {
			switchInternalCheckBox();
			checkAllChecked();
		}, false);
	}

	function setupExternalDomainList(externals) {
		function createGroupHeader(domain) {
			var headerItem = document.createElement("listitem");
			headerItem.setAttribute("class", "confirm-mail-list-separator");
			headerItem.setAttribute("data-domain-name", domain);

			var headerIconItem = document.createElement("listcell");
			headerIconItem.setAttribute("class", "listcell-iconic");

			var headerLabelItem = document.createElement("listcell");
			headerLabelItem.setAttribute("label", "@" + domain);

			headerItem.appendChild(headerIconItem);
			headerItem.appendChild(headerLabelItem);

			return headerItem;
		}

		function setHeaderStarIconVisible(groupHeaderItem, groupAllChecked) {
			// TODO: Use CSS
			var icon = groupAllChecked ?
				"chrome://confirm-mail/skin/icon/star16.png" :
				"chrome://confirm-mail/skin/icon/blank16.png"
			groupHeaderItem.firstChild.setAttribute("image", icon);
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
				cursorItem.getAttribute("class") !== "confirm-mail-list-separator") {
				cursorItem = cursorItem.previousSibling;
			}
			return cursorItem;
		}

		var externalList = document.getElementById("otherDomains");
		externalList.addEventListener("click", function (ev) {
			let listitem = ev.originalTarget;
			if (listitem.localName !== "listitem") return;

			let groupHeaderItem = getGroupHeaderForItem(listitem);
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
					let listitem = createListItemWithCheckbox(createRecipientLabel(destination), true);
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

	function setupAttachmentList(fileNames) {
		//attachments list
		var fileNamesList = document.getElementById("fileNames");

		var exceptionalItems = [];
		var normalItems = [];
		for (var i = 0; i < fileNames.length; i++) {
			let fileName = fileNames[i];
			let attachmentFileItem = createListItemWithCheckbox(fileName);
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
		var recipientGroups = {};               // domain -> [recipients]

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

	_splitToItems: function (list) {
		return list.replace(/^\s+|\s+$/g, '').split(/[,\s\|;]+/).filter(function(item) {
			return item;
		});
	},

	// Exceptional Domain

	get domains () {
		delete this.domains;
		var domains = nsPreferences.copyUnicharPref(this.PREF_DOMAINS) || "";
		return this.domains = this._splitToItems(domains);
	},

	isExceptionalDomain: function (domain) {
		return this.domains.indexOf(domain) >= 0;
	},

	// Exceptional Suffix

	get suffixes () {
		delete this.suffixes;
		var suffixes = nsPreferences.copyUnicharPref(this.PREF_SUFFIXES) || "";
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

function createListItemWithCheckbox(itemLabel, onlyRightColumn) {
	var listitem = document.createElement("listitem");
	listitem.setAttribute("tooltiptext", foldLongTooltipText(itemLabel));

	var cell1 = document.createElement("listcell");
	var checkbox = document.createElement("checkbox");
	listitem.appendChild(cell1);

	listitem.onclick = function(event){
		var checked = checkbox.checked;
		checkbox.setAttribute("checked", !checked);
		checkAllChecked();
	};

	var cell2 = document.createElement("listcell");
	listitem.appendChild(cell2);

	if (onlyRightColumn) {
		cell2.appendChild(checkbox);
		checkbox.setAttribute("label", itemLabel);
	} else {
		cell1.appendChild(checkbox);
		cell2.setAttribute("label", itemLabel);
	}

	return listitem;
}

function checkAllChecked(){
	//すべてのチェックボックスの状況確認
	var complete = true;
	var checkboxes = document.getElementsByTagName("checkbox");
	for(var i = 0; i < checkboxes.length; i++){
		var cb = checkboxes[i];
		if(cb.id == "check_all") continue;
		// don't use element.checked, because it doesn't work on hidden (out of screen) elements.
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
	var yourdomains = document.getElementById("yourDomains");
	var checkboxes = yourdomains.getElementsByTagName("checkbox");
    for(var i=0; i<checkboxes.length; i++){
        // don't use element.checked=true, because hidden (out of screen) elements are not checked.
        checkboxes[i].setAttribute("checked", isChecked);
	}

}

function updateCheckAllCheckBox(){
	var checkAll = document.getElementById("check_all");
	var allItems = document.querySelectorAll("#yourDomains listitem checkbox");
	var checkedItems = document.querySelectorAll("#yourDomains listitem checkbox[checked='true']");
	checkAll.setAttribute("checked", allItems.length === checkedItems.length);
}

var ConfirmMailDialog = {
	getExceptionalRecipients: function () {
		if (!nsPreferences.getBoolPref("net.nyail.tanabec.confirm-mail.exceptional-domains.confirm"))
			return [];
		if (nsPreferences.getBoolPref("net.nyail.tanabec.confirm-mail.exceptional-domains.onlyWithAttachment") &&
			!AttachmentManager.hasAttachments())
			return [];

		return DestinationManager.getExternalDomainList()
			.filter(function (recipient) {
				var domain = AddressUtil.extractDomainFromAddress(recipient);
				return ExceptionManager.isExceptionalDomain(domain);
			});
	},

	getExceptionalAttachments: function () {
		if (!nsPreferences.getBoolPref("net.nyail.tanabec.confirm-mail.exceptional-suffixes.confirm") ||
			!AttachmentManager.hasAttachments())
			return [];

		return AttachmentManager.getAttachmentList()
			.filter(function (attachment) {
				var suffix = FilenameUtil.extractSuffix(attachment);
				return ExceptionManager.isExceptionalSuffix(suffix);
			});
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
			nsPreferences.getLocalizedUnicharPref("net.nyail.tanabec.confirm-mail." + messageType + ".title"),
			nsPreferences.getLocalizedUnicharPref("net.nyail.tanabec.confirm-mail." + messageType + ".message")
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