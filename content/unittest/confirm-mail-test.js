DUMP = false;

/*
 * ドメインリストが空なら全員部外者
 */
function testJudge_domainListIsNull() {
	addressList = new Array("aaa@me.com", "bbb@me.com");
	domainList = new Array();
	insiders = new Array();
	outsiders = new Array();
	r = ConfirmMail.judge(addressList, domainList, insiders, outsiders);
	assertEquals(0, insiders.length);
	assertEquals(2, outsiders.length);
}

/*
 * 同僚だけ
 */
function testJudge_onlyInSiders() {
	addressList = new Array("aaa@me.com", "bbb@me.com");
	domainList = new Array("me.com");
	insiders = new Array();
	outsiders = new Array();
	r = ConfirmMail.judge(addressList, domainList, insiders, outsiders);
	assertEquals(2, insiders.length);
	assertEquals(0, outsiders.length);
}

/*
 * 部外者だけ
 */
function testJudge_onlyOutSiders() {
	addressList = new Array("aaa@out.com", "bbb@out.com");
	domainList = new Array("me.com");
	insiders = new Array();
	outsiders = new Array();
	r = ConfirmMail.judge(addressList, domainList, insiders, outsiders);
	assertEquals(0, insiders.length);
	assertEquals(2, outsiders.length);
}

/*
 * 部外者、同僚いりまじり
 */
function testJudge_InOutSiders() {
	addressList = new Array("zzz@me.com", "aaa@out.com", "bbb@out.com", "ccc@me.com");
	domainList = new Array("me.com");
	insiders = new Array();
	outsiders = new Array();
	r = ConfirmMail.judge(addressList, domainList, insiders, outsiders);
	assertEquals(2, insiders.length);
	assertEquals(2, outsiders.length);
}

/*
 * 大文字でもOK
 */
function testJudge_UpperCase() {
	addressList = new Array("TARO@ME.COM");
	domainList = new Array("me.com");
	insiders = new Array();
	outsiders = new Array();
	r = ConfirmMail.judge(addressList, domainList, insiders, outsiders);
	assertEquals(1, insiders.length);
	assertEquals(0, outsiders.length);
}

/*
 * 組織外メールアドレスのユーザ名部が、組織内ドメイン名と同様の文字列を含んでいる
 * 場合に、ただしくそのアドレスを組織外として認識するか 
 */
function testJudge_OutSiderNameLooksLikeInSiderDomainName() {
	addressList = new Array("me.com@outsider.com", "bbb@me.com");
	domainList = new Array("me.com");
	insiders = new Array();
	outsiders = new Array();
	r = ConfirmMail.judge(addressList, domainList, insiders, outsiders);
	assertEquals(1, insiders.length);
	assertEquals(1, outsiders.length);
}
/*
 * 追加1：組織内ドメインのサブドメインが指定されたとき、
 * ただしくそのアドレスを組織外として認識するか 
 */
function testJudge_InSiderDomainName_SubDomain() {
	addressList = new Array("aaa@me.com","bbb@sub.me.com","ccc@sub2.sub.me.com");
	domainList = new Array("me.com");
	insiders = new Array();
	outsiders = new Array();
	r = ConfirmMail.judge(addressList, domainList, insiders, outsiders);
	assertEquals(1, insiders.length);
	assertEquals(2, outsiders.length);
}

/*
 * 追加2：組織内ドメインのサブドメインが指定されたとき、
 * ただしくそのアドレスを組織外として認識するか 
 */
function testJudge_InSiderDomainName_SubDomain2() {
	addressList = new Array("aaa@me.com","bbb@sub.me.com","ccc@other.com");
	domainList = new Array("sub.me.com");
	insiders = new Array();
	outsiders = new Array();
	r = ConfirmMail.judge(addressList, domainList, insiders, outsiders);
	assertEquals(1, insiders.length);
	assertEquals(2, outsiders.length);
}


/*
 * ドメインリストの取得ができるか
 */
function testGetDomainList(){
	CA_CONST = {
		INTERNAL_DOMAINS : 0
	};
	nsPreferences = {
		copyUnicharPref : function(arg){
			return "gmail.com,me.com";
		}
	};
	list = ConfirmMail.getDomainList();
	assertEquals(2, list.length);
}

/*
 * ドメインリストが空文字のときに、
 * 空の配列を取得できるか
 */
function testGetDomainList_listInEmpty(){
	CA_CONST = {
		INTERNAL_DOMAINS : 0
	};
	nsPreferences = {
		copyUnicharPref : function(arg){
			return "";
		}
	};

	list = ConfirmMail.getDomainList();
	assertEquals(0, list.length);
}

/*
 * ドメインリストがnullのときに、
 * 空の配列を取得できるか
 */
function testGetDomainList_listInNull(){
	CA_CONST = {
		INTERNAL_DOMAINS : 0
	};
	nsPreferences = {
		copyUnicharPref : function(arg){
			return null;
		}
	};

	list = ConfirmMail.getDomainList();
	assertEquals(0, list.length);
}
