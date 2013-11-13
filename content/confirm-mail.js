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
  	var msgCompFields = gMsgCompose.compFields;
  	
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
  },

  collectAddress : function(msgCompFields, toList, ccList, bccList){

  	if (msgCompFields == null){
  		return;
  	}
  	var gMimeHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
  	
  	var row = 1;
  	while(true){
  		var inputField = document.getElementById("addressCol2#" + row);
  		
  		if(inputField == null){
  			break;
  		}else{
  			row++;
  		}
  		var fieldValue = inputField.value;
  		if (fieldValue == null){
  			fieldValue = inputField.getAttribute("value");
  		}
  		
  		if (fieldValue != ""){
  			
  			var recipient = null;

  			try {
  				recipient = gMimeHeaderParser.reformatUnquotedAddresses(fieldValue);
  			} catch (ex) {
  				recipient = fieldValue;
  			}

  			var recipientType = "";
  			var popupElement = document.getElementById("addressCol1#" + row);
  			if(popupElement != null){
  				recipientType = popupElement.selectedItem.getAttribute("value");
  			}

  			switch (recipientType){
  			case "addr_to":
  				toList.push(recipient);
  				break;
  			case "addr_cc":
  				ccList.push(recipient);
  				break;
  			case "addr_bcc":
  				bccList.push(recipient);
  				break;
  			default:
  				toList.push(recipient);
  				break;
  			}
  		}
  	}
  },
  
collectFileName: function(msgCompFields,fileNamesList) {

    if (msgCompFields == null) {
        return;
    }

    try {
        
        var attachmentList = document.getElementById('attachmentBucket');
        
        for (var i = 0; i < attachmentList.getRowCount(); i++) {
       
            var fileName = attachmentList.childNodes[i].getAttribute("label");
            fileNamesList.push(fileName);
	
        }
      
    } catch (e) {
        //ignore
        //dump(e);
    }
        
},
    
/**
 * addressArrayに含まれるアドレスを判定し、組織外、組織内に振り分けます
 */
judge : function(addressArray, domainList, yourDomainAddress, otherDomainAddress){
  	//dump("[JUDGE] "+addressArray+"\n");
  	
  	//if domainList is empty, all addresses are external.
  	if(domainList.length == 0){
  		for(var i = 0; i < addressArray.length; i++){
  			otherDomainAddress.push(addressArray[i]);
  		}
  		return;
  	}
  	
  	//compare addresses with registered domain lists.
  	for(var i = 0; i < addressArray.length; i++){
  		var address = addressArray[i];
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
  			yourDomainAddress.push(address);
		}else{
 			otherDomainAddress.push(address);
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

