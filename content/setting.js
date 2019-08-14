/* "The contents of this file are subject to the Mozilla Public Licenske
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

var { prefs } = Components.utils.import('resource://confirm-mail-modules/lib/prefs.js', {});
function getPref(name, defaultValue) {
	var value = prefs.getPref(name);
	return value === null ? defaultValue : value;
}

class ListBox {
	constructor(listbox, prefKey) {
		this.listbox = listbox;
		this.prefKey = prefKey;

		const values = this.values;
		if (values.length > 0) {
			for (let value of values) {
				value = value.trim();
				if (!value)
					continue;
				this.addItem(value);
			}
		}
		else {
			prefs.setPref(this.prefKey, "");
			this.addItem("");
		}

		this.onKeyDown = this.onKeyDown.bind(this);

		listbox.addEventListener("keydown", this.onKeyDown, true);
		listbox.addEventListener("dblclick", event => this.edit(event));
	}

	onKeyDown(event) {
		const item = this.listbox.selectedItem || this.listbox.querySelector("richlistitem.editing");
		console.log({ key: event.key, item });
		if (!item)
			return;
		switch (event.key) {
			case "Escape":
				item.field.setAttribute("value", item.field.value = item.getAttribute("value"));
			case "Enter":
				if (!item.classList.contains("editing")) {
					this.edit(event);
				}
				else {
					item.field.onDetermined();
				}
				event.stopImmediatePropagation();
				event.preventDefault();
				return false;
			case "Delete":
				item.clear();
				return false;
		}
	}

	addItem(value) {
		const item = this.listbox.appendItem(value || "", value || "");

		item.field = item.appendChild(document.createXULElement("textbox"));
		item.field.setAttribute("flex", 1);
		item.field.setAttribute("value", item.field.value = value || "");
		item.field.onDetermined = () => {
			let value = item.field.value.trim();
			console.log("[add/edit?] " + value + "\n");
			if (!value) {
				item.clear();
				return;
			}
			if (value != item.getAttribute("value")) {
				const values = this.values;
				console.log("[add/edit?] check duplication: ", values, values.indexOf(value));
				if (values.includes(value)) {
					item.clear();
					return;
				}
				console.log("[add/edit!] " + value + "\n");
				item.setAttribute("value", value);
				item.firstChild.setAttribute("value", value);
			}
			item.classList.remove("editing");
			this.save();
		};
		item.field.addEventListener("blur", item.field.onDetermined, true);

		item.deleteButton = item.appendChild(document.createXULElement("toolbarbutton"));
		item.deleteButton.setAttribute("label", "×");

		item.clear = () => {
			item.setAttribute("value", "");
			item.firstChild.setAttribute("value", "");
			item.classList.remove("editing");
			if (this.listbox.childNodes.length > 1)
				this.removeItem(item);
			this.save();
		};
		item.deleteButton.addEventListener("command", () => {
			item.clear();
		});

		return item;
	}

	removeItem(item) {
		item.field.removeEventListener("blur", item.field.onDetermined, true);
		this.listbox.selectedItem = item.nextSibling || item.previousSibling;
		this.listbox.removeChild(item);
	}

	get values() {
		return getPref(this.prefKey, "")
			.split(/[,\s\|;]+/)
			.filter(value => !!value);
	}

	save() {
		const values = Array.from(this.listbox.childNodes, item => item.getAttribute("value").trim());
		prefs.setPref(this.prefKey, values.filter(value => !!value).join(" "));
	}

	enterEdit(item) {
		item.classList.add("editing");
		item.field.setAttribute("value", item.field.value = item.getAttribute("value"));
		item.field.select();
		item.field.focus();
	}

	add(event) {
		if (this.listbox.lastChild.getAttribute("value") != "")
			this.listbox.selectedItem = this.addItem("");
		this.enterEdit(this.listbox.selectedItem);
	}

	edit(event) {
		this.enterEdit(this.listbox.selectedItem);
	}
}

var internalDomains;
var exceptionalDomains;
var exceptionalSuffixes;

function startup(){
	internalDomains = new ListBox(document.getElementById("group-list"), CA_CONST.INTERNAL_DOMAINS);
	exceptionalDomains = new ListBox(document.getElementById("exceptional-domains"), CA_CONST.EXCEPTIONAL_DOMAINS);
	exceptionalSuffixes = new ListBox(document.getElementById("exceptional-suffixes"), CA_CONST.EXCEPTIONAL_SUFFIXES);

	//init checkbox [not dispaly when only my domain mail]
	document.getElementById("enable-confirmation").checked = getPref(CA_CONST.ENABLE_CONFIRMATION, true);
	document.getElementById("not-display").checked = getPref(CA_CONST.ALLOW_SKIP_CONFIRMATION, false);

	var minRecipientsCount = getPref(CA_CONST.MIN_RECIPIENTS_COUNT, 0);
	var minRecipientsCountBox = document.getElementById("min-recipients-count");
	minRecipientsCountBox.value = minRecipientsCount;

	document.getElementById("exceptional-domains-highlight").checked=getPref(CA_CONST.EXCEPTIONAL_DOMAINS_HIGHLIGHT, false);
	document.getElementById("exceptional-domains-attachment").checked=getPref(CA_CONST.EXCEPTIONAL_DOMAINS_ONLY_WITH_ATTACHMENT, false);

	document.getElementById("exceptional-suffixes-confirm").checked=getPref(CA_CONST.EXCEPTIONAL_SUFFIXES_CONFIRM, false);

	//init checkbox [countdown]
	var cdBox = document.getElementById("countdown");
	var cdTimeBox = document.getElementById("countdown-time");

	cdBox.addEventListener('command',
		function(event){
			cdTimeBox.disabled = !cdBox.checked;
		},
		true);

	var isCountDown = getPref(CA_CONST.ENABLE_COUNTDOWN, false);
	if(isCountDown == null || isCountDown == false){
		cdBox.checked = false;
		cdTimeBox.disabled = true;
	}else{
		cdBox.checked = true;
		cdTimeBox.disable = false;
	}

	var countDonwTime = getPref(CA_CONST.COUNT_DOWN_TIME);
	var oldCountDownTime = getPref(CA_CONST.COUNT_DOWN_TIME_OLD);
	if (oldCountDownTime) {
		countDonwTime = oldCountDownTime;
		prefs.clearPref(CA_CONST.COUNT_DOWN_TIME_OLD);
	}
	cdTimeBox.value = countDonwTime;

	var countdownAllowSkipBox = document.getElementById("countdownAllowSkip");
	if(getPref(CA_CONST.COUNT_DOWN_ALLOW_SKIP_ALWAYS)){
		countdownAllowSkipBox.hidden = true;
	}else{
		countdownAllowSkipBox.checked = getPref(CA_CONST.COUNT_DOWN_ALLOW_SKIP, false);
	}

	var allCheckInternals = document.getElementById("allowCheckAll.yourDomains");
	if(getPref(CA_CONST.ALLOW_CHECK_ALL_INTERNALS_ALWAYS)){
		allCheckInternals.hidden = true;
	}else{
		allCheckInternals.checked = getPref(CA_CONST.ALLOW_CHECK_ALL_INTERNALS, false);
	}
	var allCheckExternals = document.getElementById("allowCheckAll.otherDomains");
	if(getPref(CA_CONST.ALLOW_CHECK_ALL_EXTERNALS_ALWAYS)){
		allCheckExternals.hidden = true;
	}else{
		allCheckExternals.checked = getPref(CA_CONST.ALLOW_CHECK_ALL_EXTERNALS, false);
	}
	var allCheckAttachments = document.getElementById("allowCheckAll.fileNames");
	if(getPref(CA_CONST.ALLOW_CHECK_ALL_ATTACHMENTS_ALWAYS)){
		allCheckAttachments.hidden = true;
	}else{
		allCheckAttachments.checked = getPref(CA_CONST.ALLOW_CHECK_ALL_ATTACHMENTS, false);
	}

	var bodyBox = document.getElementById("requireCheckBody");
	if(getPref(CA_CONST.REQUIRE_CHECK_BODY_ALWAYS)){
		bodyBox.hidden = true;
	}else{
		bodyBox.checked = getPref(CA_CONST.REQUIRE_CHECK_BODY, false);
	}

	var highlightDomainsBox = document.getElementById("highlightUnmatchedDomains");
	if(getPref(CA_CONST.HIGHLIGHT_UNMATCHED_DOMAINS_ALWAYS)){
		highlightDomainsBox.hidden = true;
	}else{
		highlightDomainsBox.checked = getPref(CA_CONST.HIGHLIGHT_UNMATCHED_DOMAINS, false);
	}

	var largeFontSizeBox = document.getElementById("largeFontSizeForAddresses");
	if(getPref(CA_CONST.LARGE_FONT_SIZE_FOR_ADDRESSES_ALWAYS)){
		largeFontSizeBox.hidden = true;
	}else{
		largeFontSizeBox.checked = getPref(CA_CONST.LARGE_FONT_SIZE_FOR_ADDRESSES, false);
	}

	var alwaysLargeDialogBox = document.getElementById("alwaysLargeDialog");
	if(getPref(CA_CONST.ALWAYS_LARGE_DIALOG_ALWAYS)){
		alwaysLargeDialogBox.hidden = true;
	}else{
		alwaysLargeDialogBox.checked = getPref(CA_CONST.ALWAYS_LARGE_DIALOG, false);
	}

	var requireReinputAttachmentNamesBox = document.getElementById("requireReinputAttachmentNames");
	requireReinputAttachmentNamesBox.checked = getPref(CA_CONST.REQUIRE_REINPUT_ATTACHMENT_NAMES, false);
}

function doOK(){
	console.log("[OK]\n");

	//チェックボックス設定保存
	prefs.setPref(CA_CONST.ENABLE_CONFIRMATION, document.getElementById("enable-confirmation").checked);
	prefs.setPref(CA_CONST.ALLOW_SKIP_CONFIRMATION, document.getElementById("not-display").checked);

	var minRecipientsCount = parseInt(document.getElementById("min-recipients-count").value);
	if (isNaN(minRecipientsCount))
		minRecipientsCount = 0;
	prefs.setPref(CA_CONST.MIN_RECIPIENTS_COUNT, minRecipientsCount);

	var isCountdown = document.getElementById("countdown").checked;
	prefs.setPref(CA_CONST.ENABLE_COUNTDOWN, isCountdown);

	prefs.setPref(CA_CONST.EXCEPTIONAL_DOMAINS_HIGHLIGHT, document.getElementById("exceptional-domains-highlight").checked);
	prefs.setPref(CA_CONST.EXCEPTIONAL_DOMAINS_ONLY_WITH_ATTACHMENT, document.getElementById("exceptional-domains-attachment").checked);

	prefs.setPref(CA_CONST.EXCEPTIONAL_SUFFIXES_CONFIRM, document.getElementById("exceptional-suffixes-confirm").checked);

	var cdTime = document.getElementById("countdown-time").value;
	
	//Error check 
	if(/^(?:0|[1-9][0-9]*)$/.test(cdTime.toString())==false && isCountdown){
		alert("カウントダウン時間には整数を入力してください。\nPlease input integer.");
		return false;
	}
	
	if((Number(cdTime) < 1 || Number(cdTime) >= 3000) && isCountdown){
		alert("カウントダウン時間には1から3000までの範囲で整数を入力してください。\nplease input integer 1 to 3000.");
		return false;
	}

	prefs.setPref(CA_CONST.COUNT_DOWN_TIME, String(cdTime));

	var countdownAllowSkipBox = document.getElementById("countdownAllowSkip");
	if (!countdownAllowSkipBox.hidden)
		prefs.setPref(CA_CONST.COUNT_DOWN_ALLOW_SKIP, countdownAllowSkipBox.checked);

	var allCheckInternals = document.getElementById("allowCheckAll.yourDomains");
	if (!allCheckInternals.hidden)
		prefs.setPref(CA_CONST.ALLOW_CHECK_ALL_INTERNALS, allCheckInternals.checked);
	var allCheckExternals = document.getElementById("allowCheckAll.otherDomains");
	if (!allCheckExternals.hidden)
		prefs.setPref(CA_CONST.ALLOW_CHECK_ALL_EXTERNALS, allCheckExternals.checked);
	var allCheckAttachments = document.getElementById("allowCheckAll.fileNames");
	if (!allCheckAttachments.hidden)
		prefs.setPref(CA_CONST.ALLOW_CHECK_ALL_ATTACHMENTS, allCheckAttachments.checked);

	var bodyBox = document.getElementById("requireCheckBody");
	if (!bodyBox.hidden)
		prefs.setPref(CA_CONST.REQUIRE_CHECK_BODY, bodyBox.checked);

	var highlightDomainsBox = document.getElementById("highlightUnmatchedDomains");
	if (!highlightDomainsBox.hidden)
		prefs.setPref(CA_CONST.HIGHLIGHT_UNMATCHED_DOMAINS, highlightDomainsBox.checked);

	var largeFontSizeBox = document.getElementById("largeFontSizeForAddresses");
	if (!largeFontSizeBox.hidden)
		prefs.setPref(CA_CONST.LARGE_FONT_SIZE_FOR_ADDRESSES, largeFontSizeBox.checked);

	var alwaysLargeDialogBox = document.getElementById("alwaysLargeDialog");
	if (!alwaysLargeDialogBox.hidden)
		prefs.setPref(CA_CONST.ALWAYS_LARGE_DIALOG, alwaysLargeDialogBox.checked);

	var requireReinputAttachmentNamesBox = document.getElementById("requireReinputAttachmentNames");
	prefs.setPref(CA_CONST.REQUIRE_REINPUT_ATTACHMENT_NAMES, requireReinputAttachmentNamesBox.checked);

	return true;
}

function doCancel(){
	console.log("[cancel]\n");
	return true;
}
