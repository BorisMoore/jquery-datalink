
function SingleElementTest(name, id)
{
  	var fdata = {}, 
		$elem = $(id? "#"+id : "#datalinktest [name='"+name+"']");
    $("#datalinktest").link(fdata);
	equals(fdata[name], undefined, "no change after initial .link()");
    $elem.trigger("change");
 	equals(fdata[name], $elem.val(), "data is synchronized after form update");
	$(fdata).data(name, "spud-like");
 	equals(fdata[name], $elem.val(), "data is synchronized after object update");
	$("#datalinktest").unlink(fdata);
 	equals(fdata[name], $elem.val(), "data still synchronized after unlink");
    $elem.val("wiggly").trigger("change");
	equals(fdata[name], "spud-like", "object data unsynchronized after unlink change");
	$(fdata).data(name, "world");
 	equals($elem.val(), "wiggly", "element data unsynchronized after unlink change");
	
	//TODO: test one-way links and other options
}

test("Hidden fields", 6, function() {
	SingleElementTest("hidey");
});

test("Text fields", 12, function() {
	SingleElementTest("firstName");
	SingleElementTest("last-name");
});

test("Textareas", 12, function() {
	SingleElementTest("roomy");
	SingleElementTest("no-name", "no-name");
});

test("Select-one, default selected", 6, function() {
	SingleElementTest("select1");
});

test("Select-one, specified selected", 6, function() {
	SingleElementTest("select2", "secondSelect");
});

test("Single check box", 5, function() {
  	var fdata = {}, 
		$elem = $("#datalinktest [name='loneCheck']");
    $("#datalinktest").link(fdata);
	equals(fdata[name], undefined, "no change after initial .link()");
    $elem.attr("checked", true).trigger("change");
 	equals(fdata[name], $elem.attr("value"), "checkbox value synced with object");
 	// Intuitively it seems like the value should follow the checked state,
	// not just the value attr. Otherwise linking checkboxes makes no sense!
	// Does that mean the data value for a checkbox should be a boolean,
	// or simply that the value reflected is either the value attr or undefined?
	// Proposed here: An undefined/null object value implies unchecked and the
	// checkbox is checked (as well as the value attr being set) if a 
	// non-null/undefined value is assigned to the object.
    $elem.attr("checked", false).trigger("change");
	equals(fdata[name], undefined, "object value changed when box is unchecked");
	$(fdata).data(name, "Anton Checkov");
 	equals(fdata[name], $elem.attr("value"), "form attribute changed with object");
	equals($elem.attr("checked"), true, "checkbox was checked when assigned a non-undefined value");
	$("#datalinktest").unlink(fdata);
});

test("Multi-checkbox, identical names", 1, function() {
	//TODO
});

test("Select-multiple", 1, function() {
	//TODO
});

test("Select-multiple (disabled options, nothing selected)", 1, function() {
	//TODO
});

test("Push all data out of the form", 1, function() {
	var fdata = {};
    $("#datalinktest").link(fdata);
	// Trigger change on all descendants of the form to load data
	$("#datalinktest :input").trigger("change");
	// Make sure everything was loaded; checkbox/radio is tricky
	$.each($("#datalinktest")[0].elements, function(){
		// TODO: adjust for multi-checkbox and multi-select
		if ( this.value === fdata[this.name||this.id] ) {
			delete fdata[this.name||this.id];
		}
	});
	// Any fields left either didn't match the real value or weren't off the form
	var list = [];
	for ( var f in fdata ) {
		if ( !$.isFunction(fdata[f]) ) {	// skip the __events__ object
			list.push(f+"="+fdata[f]);
		}
	}
	// This is mainly a test to show what's left in the object,
	// also as a placeholder to determine how to handle multiple
	// selects and same-named check boxes.
	equals(list.join("; "), "", "remaining object fields");
});



