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

var selectedItem;

function startup(){

	//init domain list.
	document.getElementById("add").addEventListener('command', add, true);
	document.getElementById("edit").addEventListener('command', edit, true);
	document.getElementById("remove").addEventListener('command', remove, true);
	var groupList = document.getElementById("group-list");

	var domains = prefs.getPref(CA_CONST.DOMAIN_LIST);
	dump("[registed domains] " + domains + "\n");


	if(domains != null && domains != "" ){
		var domainList = domains.split(",");

		for(var i=0; i < domainList.length; i++){
			var listitem = document.createElement("listitem");
			listitem.setAttribute("label", domainList[i]);
			listitem.setAttribute("id", Math.random());
			groupList.appendChild(listitem);
		}
	}else{
		prefs.setPref(CA_CONST.DOMAIN_LIST,"");
	}

	//init checkbox [not dispaly when only my domain mail]
	var isNotDisplay = prefs.getPref(CA_CONST.IS_NOT_DISPLAY, false);
	var noDisplayBox = document.getElementById("not-display");
	noDisplayBox.checked=isNotDisplay;

	document.getElementById("exceptional-domains-highlight").checked=prefs.getPref(CA_CONST.EXCEPTIONAL_DOMAINS_HIGHLIGHT, false);
	document.getElementById("exceptional-domains-attachment").checked=prefs.getPref(CA_CONST.EXCEPTIONAL_DOMAINS_ONLY_WITH_ATTACHMENT, false);
	var exceptionalDomains = document.getElementById("exceptional-domains");
	exceptionalDomains.value = prefs.getPref(CA_CONST.EXCEPTIONAL_DOMAINS)
		.replace(/^\s+|\s+$/g, '')
		.replace(/\s+/g, '\n');

	document.getElementById("exceptional-suffixes-confirm").checked=prefs.getPref(CA_CONST.EXCEPTIONAL_SUFFIXES_CONFIRM, false);
	var exceptionalSuffixes = document.getElementById("exceptional-suffixes");
	exceptionalSuffixes.value = prefs.getPref(CA_CONST.EXCEPTIONAL_SUFFIXES)
		.replace(/^\s+|\s+$/g, '')
		.replace(/\s+/g, '\n');

	//init checkbox [countdown]
	var cdBox = document.getElementById("countdown");
	var cdTimeBox = document.getElementById("countdown-time");

	cdBox.addEventListener('command',
		function(event){
			cdTimeBox.disabled = !cdBox.checked;
		},
		true);

	var isCountDown = prefs.getPref(CA_CONST.IS_COUNT_DOWN, false);
	if(isCountDown == null || isCountDown == false){
		cdBox.checked = false;
		cdTimeBox.disabled = true;
	}else{
		cdBox.checked = true;
		cdTimeBox.disable = false;
	}

	var countDonwTime = prefs.getPref(CA_CONST.COUNT_DOWN_TIME);
	cdTimeBox.value = countDonwTime;

	var bodyBox = document.getElementById("requireCheckBody");
	if(prefs.getPref(CA_CONST.REQUIRE_CHECK_BODY_ALWAYS)){
		bodyBox.hidden = true;
	}else{
		bodyBox.checked = prefs.getPref(CA_CONST.REQUIRE_CHECK_BODY, false);
	}

	var highlightDomainsBox = document.getElementById("highlightUnmatchedDomains");
	if(prefs.getPref(CA_CONST.HIGHLIGHT_UNMATCHED_DOMAINS_ALWAYS)){
		highlightDomainsBox.hidden = true;
	}else{
		highlightDomainsBox.checked = prefs.getPref(CA_CONST.HIGHLIGHT_UNMATCHED_DOMAINS, false);
	}

	var largeFontSizeBox = document.getElementById("largeFontSizeForAddresses");
	if(prefs.getPref(CA_CONST.LARGE_FONT_SIZE_FOR_ADDRESSES_ALWAYS)){
		largeFontSizeBox.hidden = true;
	}else{
		largeFontSizeBox.checked = prefs.getPref(CA_CONST.LARGE_FONT_SIZE_FOR_ADDRESSES, false);
	}

	var alwaysLargeDialogBox = document.getElementById("alwaysLargeDialog");
	if(prefs.getPref(CA_CONST.ALWAYS_LARGE_DIALOG_ALWAYS)){
		alwaysLargeDialogBox.hidden = true;
	}else{
		alwaysLargeDialogBox.checked = prefs.getPref(CA_CONST.ALWAYS_LARGE_DIALOG, false);
	}

	var requireReinputAttachmentNamesBox = document.getElementById("requireReinputAttachmentNames");
	requireReinputAttachmentNamesBox.checked = prefs.getPref(CA_CONST.REQUIRE_REINPUT_ATTACHMENT_NAMES, false);
}

function add(event){
	window.confmail_confirmOK = false;
	window.domainName = null;
	window.openDialog("chrome://confirm-mail/content/setting-add-domain.xul",
		"ConfirmAddressDialog", "chrome,modal,titlebar,centerscreen", window);

	if(window.confmail_confirmOK){
		var domainName = window.domainName;
		
		// check duplication
		if(domainName.length > 0  
			&& prefs.getPref(CA_CONST.DOMAIN_LIST).indexOf(domainName) == -1){

			dump("[add!] " + domainName + "\n");
			var groupList = document.getElementById("group-list");
			var listitem = document.createElement("listitem");
			listitem.setAttribute("label", domainName);
			listitem.setAttribute("id", Math.random());
			groupList.appendChild(listitem);
		
			saveDomainName();	
		
		}else{
			alert("入力されたドメイン名は既に登録されています。\nThe domain name already registered.");
		}
	}
}
function edit(event){
	window.confmail_confirmOK = false;
	window.domainName = selectedItem.label;
	window.openDialog("chrome://confirm-mail/content/setting-add-domain.xul",
		"ConfirmAddressDialog", "chrome,modal,titlebar,centerscreen", window);
		
	if(window.confmail_confirmOK){
		var domainName = window.domainName;
		
		//check duplication
		if(selectedItem.label==domainName 
			|| (domainName.length > 0 
				&& prefs.getPref(CA_CONST.DOMAIN_LIST).indexOf(domainName) == -1)){

			dump("[edit!] " + domainName + "\n");
			selectedItem.setAttribute("label", domainName);
			saveDomainName();	

		}else{
			alert("入力されたドメイン名は既に登録されています。\nThe domain name already registered.");
		}
	}
}
function remove(event){
	var groupList = document.getElementById("group-list");
	dump("[remove] "+selectedItem + "\n");
	groupList.removeChild(selectedItem);
	saveDomainName();
}

function selectList(item){
	selectedItem = item;
}

function saveDomainName(){
	
	//ドメイン設定保存
	var groupList = document.querySelectorAll("#group-list listitem");
	var domainList = Array.map(groupList, function(item) {
		return item.getAttribute('label');
	});
	var domainListStr = domainList.join(",");
	prefs.setPref(CA_CONST.DOMAIN_LIST, domainListStr);
}

function doOK(){
	dump("[OK]\n");

	//チェックボックス設定保存
    
	var notDisplay = document.getElementById("not-display").checked;
	prefs.setPref(CA_CONST.IS_NOT_DISPLAY, notDisplay);

	var isCountdown = document.getElementById("countdown").checked;
	prefs.setPref(CA_CONST.IS_COUNT_DOWN, isCountdown);

	prefs.setPref(CA_CONST.EXCEPTIONAL_DOMAINS_HIGHLIGHT, document.getElementById("exceptional-domains-highlight").checked);
	prefs.setPref(CA_CONST.EXCEPTIONAL_DOMAINS_ONLY_WITH_ATTACHMENT, document.getElementById("exceptional-domains-attachment").checked);
	var exceptionalDomains = document.getElementById("exceptional-domains").value;
	prefs.setPref(CA_CONST.EXCEPTIONAL_DOMAINS, exceptionalDomains.replace(/\s+/g, ' '));

	prefs.setPref(CA_CONST.EXCEPTIONAL_SUFFIXES_CONFIRM, document.getElementById("exceptional-suffixes-confirm").checked);
	var exceptionalSuffixes = document.getElementById("exceptional-suffixes").value;
	prefs.setPref(CA_CONST.EXCEPTIONAL_SUFFIXES, exceptionalSuffixes.replace(/\s+/g, ' '));

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
	dump("[cancel]\n");
	return true;
}
