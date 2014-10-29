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
var CountDown = {
	/**
	 * カウントダウンを開始します
	 */
	onLoad : function(){
		var time = window.arguments[0];
		var countDownComplete = window.arguments[1];
		var limit = time;
		var label = document.getElementById("counter");
		
		label.value = limit;
		
		var timer = this.timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		   
		timer.initWithCallback( {notify: function(timer) {
			limit--;
			if(limit<0){
				countDownComplete.value = true;
				window.close();
				
		 	}else{
				label.value=limit;
			}
		    }},1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	},

	onUnload : function(){
		this.timer.cancel();
		delete this.timer;
	}
 	   
};
