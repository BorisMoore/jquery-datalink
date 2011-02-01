jQuery( function( $ ){

// define some basic default data to start with
var contacts = [
	{ firstName: "Dave", lastName: "Reed", age: 32, phones: [
		{ type: "Mobile", number: "(555) 121-2121" },
		{ type: "Home", number: "(555) 123-4567" } ]  },
	{ firstName: "John", lastName: "Doe", age: 87, phones: [
		{ type: "Mobile", number: "(555) 444-2222" },
		{ type: "Home", number: "(555) 999-1212" } ]  }
];

$.extend( $.convertFn, {
	// linking converter that normalizes phone numbers
	phone: function( value ) {// turn a string phone number into a normalized one with dashes
		// and parens
		value = (parseInt( value.replace( /[\(\)\- ]/g, "" ), 10 ) || 0 ).toString();
		value = "0000000000" + value;
		value = value.substr( value.length - 10 );
		value = "(" + value.substr( 0, 3 ) + ") " + value.substr( 3, 3 ) + "-" + value.substr( 6 );
		return value;
	},
	fullname: function( value, source, target ) {
		return source.firstName + " " + source.lastName;
	}
});

// show the results of the linking -- object graph is already full of the data
$( "#save" ).click( function() {
	$( "#results" ).html( JSON.stringify( contacts, null, 4 ));
});

// add a new contact when clicking the insert button.
// notice that no code here exists that explicitly redraws
// the template.
$( "#insert" ).click( function() {
	contacts.push({ firstName: "first", lastName: "last", phones: [], age:20 });
	refresh();
});

$( "#sort" ).click( function() {
	contacts.sort( function( a, b ) {
		return a.lastName < b.lastName ? -1 : 1;
	});
	refresh();
});

// function that clears the current template and renders it with the
// current state of the global contacts variable.
function refresh() {
	$( ".contacts" ).empty();
	$( "#contacttmpl" ).tmpl( {contacts:contacts} ).appendTo( ".contacts" );
	// bind inputs to the data items
	$( "tr.contact" ).each( function(i) {
		var contact = contacts[i];
		$( "input.contact", this ).link( contact );
		$( '.agebar', this ).link( contact, {
			age: {
				convertBack: function( value, source, target ) {
					$( target ).width( value + "px" );
				}
			}
		});
		$( contact ).trigger( "changeField", ["age", contact.age] );
		
		// todo: "update" feature
		
		$( ".contact-remove", this ).click( function() {
			contacts.splice( i, 1 );
			refresh();
		});
		var original_firstName = contact.firstName,
			original_lastName = contact.lastName;
		$( ".contact-reset", this ).click( function() {
			$( contact )
				.setField( "firstName", original_firstName )
				.setField( "lastName", original_lastName );
		});
		
		$( "tr.phone", this ).each( function(i) {
			var phone = contact.phones[i];
			$( this ).link( phone, {
				type: "type",
				number: {
					name: "number",
					convert: "phone"
				}
			});
			$( ".phone-remove", this ).click( function() {
				// note: I'd like to only redraw the phones portion of the
				// template, but jquery.tmpl.js does not support nested templates
				// very easily. So here I am triggering an arrayChange event on
				// the main contacts array to force the entire thing to refresh.
				// Note that user input is not lost since the live linking has
				// already stored the values in the object graph.
				contact.phones.splice( i, 1 );
				refresh();
			});
		});
		$( ".newphone", this ).click( function() {
			contact.phones.push({ type: "", number: "" });
			refresh();
		});
	});
}

// initial view on load
refresh();

});

