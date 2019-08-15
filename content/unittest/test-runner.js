function TestRunner() {
	this.pass = 0;
	this.success = 0;
	this.fail = 0;
}

TestRunner.prototype.execute = function () {};

TestRunner.prototype.assertEquals = function (expected, actual) {
	expected = JSON.stringify(expected);
	actual = JSON.stringify(actual);
	if (expected === actual) {
		this.pass++;
	} else {
		throw new Error("FAIL expected=" + expected + ", but actual=" + actual);
	}
};

TestRunner.prototype.assertSame = function (expected, actual) {
	if (expected === actual) {
		this.pass++;
	} else {
		throw new Error("FAIL expected=" + expected + ", but actual=" + actual);
	}
};

var runner = new TestRunner();

function assertEquals(expected, actual) {
	runner.assertEquals(expected, actual);
}

function assertSame(expected, actual) {
	runner.assertSame(expected, actual);
}

function dump(obj) {}

function run() {
	var successList = new Array();
	var failList = new Array();

	for (var globalVariableName in this) {
		if (globalVariableName.indexOf("test") !== 0) continue;
		var testCaseFunction = this[globalVariableName];
		try {
			testCaseFunction();
			successList.push([globalVariableName]);
		} catch (e) {
			failList.push([globalVariableName, e]);
		}
	}
	var result = document.getElementById("result");
	successList.forEach(function (elm, idx, ary) {
		var testCaseName = elm[0];
		var div = document.createElement("div");
		div.innerHTML = "OK .... " + testCaseName;
		div.setAttribute('style', 'color: green;');
		result.appendChild(div);
	});
	failList.forEach(function (elm, idx, ary) {
		var testCaseName = elm[0];
		var testFailureException = elm[1];

		var div = document.createElement("div");
		div.innerHTML = "FAIL .. " + testCaseName + ": " + testFailureException
			+ (testFailureException.stack || "")
			.split("\n")
			.map(function (line) {
			  return "<p style='padding-left: 20px;margin:2px;'>" + line + "</p>";
			})
			.join("");
		div.setAttribute('style', 'color: red;');
		result.appendChild(div);
	});
}
