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

