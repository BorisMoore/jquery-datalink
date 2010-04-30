jQuery(function($){

// define some basic default data to start with
var contacts = [
    { firstName: "Dave", lastName: "Reed", phones: [
        { type: "Mobile", number: "(555) 121-2121" },
        { type: "Home", number: "(555) 123-4567" } ]  },
    { firstName: "John", lastName: "Doe", phones: [
        { type: "Mobile", number: "(555) 444-2222" },
        { type: "Home", number: "(555) 999-1212" } ]  }
];

// enable using 'contacts' as the name of the template
$.templates.contacts = $.tmpl($("#contacttmpl").html());

$.extend($.convertFn, {
    // linking converter that normalizes phone numbers
    phone: function(value) {
        // turn a string phone number into a normalized one with dashes
        // and parens
        value = (parseInt(value.replace(/[\(\)\- ]/g, ""), 10) || 0).toString();
        value = "0000000000" + value;
        value = value.substr(value.length - 10);
        value = "(" + value.substr(0,3) + ") " + value.substr(3,3) + "-" + value.substr(6);
        return value;
    },
    fullname: function(value, settings) {
        return settings.source.firstName + " " + settings.source.lastName;
    }
});

// show the results of the linking -- object graph is already full of the data
$("#save").click(function() {
    $("#results").html(JSON.stringify(contacts, null, 4));
});

// add a new contact when clicking the insert button.
// notice that no code here exists that explicitly redraws
// the template.
$("#insert").click(function() {
    $.push(contacts, { firstName: "", lastName: "", phones: [] });
});

$("#sort").click(function() {
    $.sort(contacts, function(a,b) {
        return a.lastName < b.lastName ? -1 : 1;
    });
});

// function that clears the current template and renders it with the
// current state of the global contacts variable.
function refresh() {
    $(".contacts").empty().append("contacts", {contacts:contacts});
    // bind inputs to the data items
    $(".contact").each(function(i) {
        var contact = contacts[i];
        $(".firstname", this).linkTo("val", contact, "firstName");
        $(".lastname", this).linkTo("val", contact, "lastName");
        $(".contact-fullname", this).linkFrom("text", contact, null, "fullname");
        $(".contact-remove", this).click(function() {
            $.splice(contacts, i, 1);
        });
        $(".phone", this).each(function(i) {
            var phone = contact.phones[i];
            $(".phone-type", this).linkTo("val", phone, "type");
            $(".phone-number", this).linkTo("val", phone, "number", "phone");
            $(".phone-remove", this).click(function() {
                // note: I'd like to only redraw the phones portion of the
                // template, but jquery.tmpl.js does not support nested templates
                // very easily. So here I am triggering an arrayChange event on
                // the main contacts array to force the entire thing to refresh.
                // Note that user input is not lost since the live linking has
                // already stored the values in the object graph.
                $.splice(contact.phones, i, 1);
                $([contacts]).trigger("arrayChange");
            });
        });
        $(".newphone", this).click(function() {
            $.push(contact.phones, { type: "", number: "" });
            $([contacts]).trigger("arrayChange");
        });
    });
}

// subscribe to changes to the contact array, automatically refreshing
// the rendering of the template
$([contacts]).arrayChange(refresh);

// initial view on load
refresh();

});
