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
var ConfirmMail = {

  checkAddress: function(){
try { // DEBUG
  	var msgCompFields = gMsgCompose.compFields;
  	Recipients2CompFields(msgCompFields);
  	gMsgCompose.checkAndPopulateRecipients(true, false, {});
  	var toList = [];
  	var ccList = [];
  	var bccList = [];
  	this.collectAddress(msgCompFields, toList, ccList, bccList)
  	//dump("[TO] "+ toList + "\n");
  	//dump("[CC] "+ ccList + "\n");
  	//dump("[BCC] "+ bccList + "\n");
  
    var domainList = this.getDomainList();
  	//dump("[DOMAINLIST] "+ domainList + "\n");

  	var internalList = [];
  	var externalList = [];
  	this.judge(toList, domainList, internalList, externalList);
  	this.judge(ccList, domainList, internalList, externalList);
  	this.judge(bccList, domainList, internalList, externalList);
  	//dump("[INTERNAL] "+ internalList + "\n");
  	//dump("[EXTERNAL] "+ externalList + "\n");
    
	var fileNamesList = [];
    	this.collectFileName(msgCompFields,fileNamesList);
    	//dump("[FILENAME]" + fileNamesList + "\n");

  	var isNotDisplay = nsPreferences.getBoolPref(CA_CONST.IS_NOT_DISPLAY, false);


  	if(isNotDisplay && externalList.length == 0 && internalList.length > 0){
  		window.confmail_confirmOK = true;
  	}else{
      		window.confmail_confirmOK = false;
      		window.openDialog("chrome://confirm-mail/content/confirm-mail-dialog.xul",
        			"ConfirmAddressDialog", "resizable,chrome,modal,titlebar,centerscreen", 
        			window, internalList, externalList,fileNamesList);
    	}
    
  	if(window.confmail_confirmOK){
  		var isCountDown = nsPreferences.getBoolPref(CA_CONST.IS_COUNT_DOWN, false);
  		
  		if(isCountDown){
  			var countDownTime = nsPreferences.copyUnicharPref(CA_CONST.COUNT_DOWN_TIME);
  			
  			window.confmail_countDownComplete = false;
  			window.openDialog("chrome://confirm-mail/content/countdown.xul", "CountDown Dialog", 
  			"resizable,chrome,modal,titlebar,centerscreen",window, countDownTime);

  			if(window.confmail_countDownComplete){
  				return true;
  			}else{
  				//dump("cancel");
  				return false;
  			}
  		}else{
  			return true;
  		}
  	}else{
  		return false;
  	}
} catch(error) { alert(e+'\n'+e.stack); } // DEBUG
  },

  splitRecipients: function(addressesSource, type){
  	var gMimeHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
	var addresses = {};
	var names = {};
	var fullNames = {};
	var numAddresses = gMimeHeaderParser.parseHeadersWithArray(
	                     addressesSource, addresses, names, fullNames);
	var recipients = [];
	for (let i = 0; i < numAddresses; i++) {
		recipients.push({
			address:  addresses.value[i],
			name:     names.value[i],
			fullName: fullNames.value[i],
			type:     type
		});
	}
	return recipients;
  },

  collectAddress : function(msgCompFields, toList, ccList, bccList){
	if (msgCompFields == null){
		return;
	}
	this.splitRecipients(msgCompFields.to, "To").forEach(function(recipient) {
		toList.push(recipient);
	});
	this.splitRecipients(msgCompFields.cc, "Cc").forEach(function(recipient) {
		ccList.push(recipient);
	});
	this.splitRecipients(msgCompFields.bcc, "Bcc").forEach(function(recipient) {
		bccList.push(recipient);
	});
  },
  
collectFileName: function(msgCompFields,fileNamesList) {

    if (msgCompFields == null) {
        return;
    }

    try {
        
        var attachmentList = document.getElementById('attachmentBucket');
        
        for (var i = 0; i < attachmentList.getRowCount(); i++) {
       

            var attachmentItem = attachmentList.childNodes[i];
            var fileName = attachmentItem.getAttribute("label") || attachmentItem.getAttribute("name");
            fileNamesList.push(fileName);
	
        }
      
    } catch (e) {
        //ignore
        //dump(e);
    }
        
},
    
/**
 * recipientsに含まれるアドレスを判定し、組織外、組織内に振り分けます
 */
judge : function(recipients, domainList, yourDomainRecipients, otherDomainRecipients){
  	//dump("[JUDGE] "+JSON.stringify(recipients)+"\n");
  	
  	//if domainList is empty, all recipients are external.
  	if(domainList.length == 0){
  		for(var i = 0; i < recipients.length; i++){
  			otherDomainRecipients.push(recipients[i]);
  		}
  		return;
  	}
  	
  	//compare recipients with registered domain lists.
  	for(var i = 0; i < recipients.length; i++){
  		var recipient = recipients[i];
  		var address = recipient;
  		if (recipient && typeof recipient != "string")
  			address = recipient.address;
  		if(address.length == 0){
  			continue;
  		}
		
		var domain = address.substring(1+address.indexOf("@")).toLowerCase();
		var match = false;

		 if(domain.search(/>$/)!=-1){
	            //address end with ">"
	            domain = domain.substring(0,domain.length-1);
	        }

  		for(var j = 0; j < domainList.length; j++){
  			var insiderDomain = domainList[j].toLowerCase();
  			if(domain == insiderDomain){
				match = true;
  			}
  		}
		
		if(match){
  			yourDomainRecipients.push(recipient);
		}else{
 			otherDomainRecipients.push(recipient);
		}
  	}

  },

  getDomainList : function(){
  	var domains = nsPreferences.copyUnicharPref(CA_CONST.DOMAIN_LIST);
  	if(domains == null || domains.length == 0){
  		return new Array();
  	}
  	return domains.split(",");
  }
}

