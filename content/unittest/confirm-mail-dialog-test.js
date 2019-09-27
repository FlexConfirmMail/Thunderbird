// Helper

function recipient(address) {
	return {
		address: address
	};
}

function setInternalDestinations(internalDomains) {
	if (!window.arguments)
		window.arguments = [];
	window.arguments[1] = internalDomains;
}

function setExternalDestinations(externalDomains) {
	if (!window.arguments)
		window.arguments = [];
	window.arguments[2] = externalDomains;
}

function setAttachments(attachments) {
	if (!window.arguments)
		window.arguments = [];
	window.arguments[3] = attachments;
}

function setExceptionalDomains(domains) {
	delete ExceptionManager.domains;
	ExceptionManager.domains = domains;
}

function setExceptionalSuffixes(suffixes) {
	delete ExceptionManager.suffixes;
	ExceptionManager.suffixes = suffixes;
}

// Tests

function test_FilenameUtil_extractSuffix() {
	assertEquals("txt", FilenameUtil.extractSuffix("foo.txt"));
	assertEquals("", FilenameUtil.extractSuffix("README"));
	assertEquals("js", FilenameUtil.extractSuffix("test.foo.js"));
	assertEquals("", FilenameUtil.extractSuffix("a."));
}

function test_AddressUtil_extractDomainFromAddress() {
	assertEquals("example.com", AddressUtil.extractDomainFromAddress("foo@example.com"));
	assertEquals("foo.example.com", AddressUtil.extractDomainFromAddress("mooo@foo.example.com"));
	assertEquals(null, AddressUtil.extractDomainFromAddress("foo.example.com"));
}

function test_AddressUtil_groupDestinationsByDomain() {
	var destinations = [recipient("foo@example.com"), recipient("bar@example.org"), recipient("baz@example.com"), recipient("qux@test.example.com")];
	var expected = {
		"example.com": [recipient("foo@example.com"), recipient("baz@example.com")],
		"example.org": [recipient("bar@example.org")],
		"test.example.com": [recipient("qux@test.example.com")]
	};
	assertEquals(JSON.stringify(expected), JSON.stringify(AddressUtil.groupDestinationsByDomain(destinations)));
}

function test_AttachmentManager_getAttachmentList() {
	var attachments = ["foo.txt", "bar.xpi", "baz.txt"];
	setAttachments(["foo.txt", "bar.xpi", "baz.txt"]);
	assertEquals(attachments, AttachmentManager.getAttachmentList());
}

function test_AttachmentManager_hasAttachments() {
	setAttachments(["foo.txt", "bar.xpi", "baz.txt"]);
	assertEquals(true, AttachmentManager.hasAttachments());

	setAttachments([]);
	assertEquals(false, AttachmentManager.hasAttachments());

	setAttachments(void 0);
	assertEquals(false, AttachmentManager.hasAttachments());
}

function test_DestinationManager_getInternalDestinationList() {
	var internalDestinations = [recipient("foo@example.com"), recipient("bar@example.org")];
	setInternalDestinations(internalDestinations);
	assertEquals(internalDestinations, DestinationManager.getInternalDestinationList());
}

function test_DestinationManager_getExternalDestinationList() {
	var externalDestinations = [recipient("foo@example.com"), recipient("bar@example.org")];
	setExternalDestinations(externalDestinations);
	assertEquals(externalDestinations, DestinationManager.getExternalDestinationList());
}

function test_DestinationManager_getExternalDomainList() {
	var externalDestinations = [recipient("foo@example.com"), recipient("bar@example.org")];
	setExternalDestinations(externalDestinations);
	assertEquals(["example.com", "example.org"], DestinationManager.getExternalDomainList());
}

function test_ExceptionManager() {
	setExceptionalDomains(["example.com", "example.org"]);
	assertEquals(true, ExceptionManager.isExceptionalDomain("example.com"));
	assertEquals(false, ExceptionManager.isExceptionalDomain("example.net"));

	setExceptionalSuffixes(["txt", "xpi"]);
	assertEquals(true, ExceptionManager.isExceptionalSuffix("txt"));
	assertEquals(true, ExceptionManager.isExceptionalSuffix("xpi"));
	assertEquals(false, ExceptionManager.isExceptionalSuffix("jpg"));

	assertEquals(true, ExceptionManager.fileHasExceptionalSuffix("foo.txt"));
	assertEquals(true, ExceptionManager.fileHasExceptionalSuffix("bar.xpi"));
	assertEquals(false, ExceptionManager.fileHasExceptionalSuffix("baz.jpg"));
	assertEquals(false, ExceptionManager.fileHasExceptionalSuffix("txt"));
	assertEquals(true, ExceptionManager.fileHasExceptionalSuffix(".txt"));
}


var tempPrefs = {};
ConfirmMailDialog.__original__getPref = ConfirmMailDialog.getPref;
ConfirmMailDialog.getPref = function(key, defaultValue) {
	if (key in tempPrefs)
		return tempPrefs[key];
	return this.__original__getPref(key, defaultValue);
};

function test_ConfirmMailDialog_confirm_exceptionalDomains_highlight_always() {
	setExceptionalSuffixes([]);
	setExceptionalDomains(["danger.example.com"]);
	tempPrefs[CA_CONST.EXCEPTIONAL_DOMAINS_HIGHLIGHT] = 1;

	// has attachments && danger domain -> highlight
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@danger.example.com")]);
	setAttachments(["some.txt"]);
	assertEquals(true, ConfirmMailDialog.highlightForExceptionalOtherDomains());
	assertEquals(["bar@danger.example.com"], ConfirmMailDialog.getExceptionalRecipients());

	// has no attachments && danger domain -> highlight
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@danger.example.com")]);
	setAttachments([]);
	assertEquals(true, ConfirmMailDialog.highlightForExceptionalOtherDomains());
	assertEquals(["bar@danger.example.com"], ConfirmMailDialog.getExceptionalRecipients());

	// has attachments && not danger domain -> don't highlight
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);
	setAttachments(["some.txt"]);
	assertEquals(false, ConfirmMailDialog.highlightForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());

	// has no attachments && not danger domain -> don't highlight
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);
	setAttachments([]);
	assertEquals(false, ConfirmMailDialog.highlightForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());
}

function test_ConfirmMailDialog_confirm_exceptionalDomains_highlight_onlyWithAttachments() {
	setExceptionalSuffixes([]);
	setExceptionalDomains(["danger.example.com"]);
	tempPrefs[CA_CONST.EXCEPTIONAL_DOMAINS_HIGHLIGHT] = 2;

	// has attachments && danger domain -> highlight
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@danger.example.com")]);
	setAttachments(["some.txt"]);
	assertEquals(true, ConfirmMailDialog.highlightForExceptionalOtherDomains());
	assertEquals(["bar@danger.example.com"], ConfirmMailDialog.getExceptionalRecipients());

	// has no attachments && danger domain -> don't highlight
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@danger.example.com")]);
	setAttachments([]);
	assertEquals(false, ConfirmMailDialog.highlightForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());

	// has attachments && not danger domain -> don't highlight
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);
	setAttachments(["some.txt"]);
	assertEquals(false, ConfirmMailDialog.highlightForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());

	// has no attachments && not danger domain -> don't highlight
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);
	setAttachments([]);
	assertEquals(false, ConfirmMailDialog.highlightForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());
}

function test_ConfirmMailDialog_confirm_exceptionalDomains_reconfirm_always() {
	setExceptionalSuffixes([]);
	setExceptionalDomains(["danger.example.com"]);
	tempPrefs[CA_CONST.EXCEPTIONAL_DOMAINS_CONFIRM] = 1;

	// has attachments && danger domain -> warn
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@danger.example.com")]);
	setAttachments(["some.txt"]);
	assertEquals(true, ConfirmMailDialog.reconfirmForExceptionalOtherDomains());
	assertEquals(["bar@danger.example.com"], ConfirmMailDialog.getExceptionalRecipients());

	// has no attachments && danger domain -> warn
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@danger.example.com")]);
	setAttachments([]);
	assertEquals(true, ConfirmMailDialog.reconfirmForExceptionalOtherDomains());
	assertEquals(["bar@danger.example.com"], ConfirmMailDialog.getExceptionalRecipients());

	// has attachments && not danger domain -> don't warn
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);
	setAttachments(["some.txt"]);
	assertEquals(false, ConfirmMailDialog.reconfirmForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());

	// has no attachments && not danger domain -> don't warn
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);
	setAttachments([]);
	assertEquals(false, ConfirmMailDialog.reconfirmForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());
}

function test_ConfirmMailDialog_confirm_exceptionalDomains_reconfirm_onlyWithAttachments() {
	setExceptionalSuffixes([]);
	setExceptionalDomains(["danger.example.com"]);
	tempPrefs[CA_CONST.EXCEPTIONAL_DOMAINS_CONFIRM] = 2;

	// has attachments && danger domain -> warn
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@danger.example.com")]);
	setAttachments(["some.txt"]);
	assertEquals(true, ConfirmMailDialog.reconfirmForExceptionalOtherDomains());
	assertEquals(["bar@danger.example.com"], ConfirmMailDialog.getExceptionalRecipients());

	// has no attachments && danger domain -> don't warn
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@danger.example.com")]);
	setAttachments([]);
	assertEquals(false, ConfirmMailDialog.reconfirmForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());

	// has attachments && not danger domain -> don't warn
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);
	setAttachments(["some.txt"]);
	assertEquals(false, ConfirmMailDialog.reconfirmForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());

	// has no attachments && not danger domain -> don't warn
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);
	setAttachments([]);
	assertEquals(false, ConfirmMailDialog.reconfirmForExceptionalOtherDomains());
	assertEquals([], ConfirmMailDialog.getExceptionalRecipients());
}

function test_ConfirmMailDialog_confirm_shouldConfirmExceptionalSuffixes() {
	setExternalDestinations([recipient("foo@safe.example.com"), recipient("bar@safe.example.com")]);

	setExceptionalDomains(["danger.example.com"]);
	setExceptionalSuffixes(["txt"]);

	setAttachments(["some.txt"]);
	assertEquals(["some.txt"], ConfirmMailDialog.getExceptionalAttachments());

	setAttachments([]);
	assertEquals([], ConfirmMailDialog.getExceptionalAttachments());

	setAttachments(["foo.txt.js"]);
	assertEquals([], ConfirmMailDialog.getExceptionalAttachments());

	setAttachments(["foo.txt.js", "foo.txt", "foo.jpeg"]);
	assertEquals(["foo.txt"], ConfirmMailDialog.getExceptionalAttachments());

	setExceptionalSuffixes(["png", "pdf", "xls"]);

	setAttachments(["foo.txt.js", "foo.txt", "foo.jpeg"]);
	assertEquals([], ConfirmMailDialog.getExceptionalAttachments());

	setAttachments(["foo.txt.js", "foo.txt", "foo.pdf"]);
	assertEquals(["foo.pdf"], ConfirmMailDialog.getExceptionalAttachments());
}
