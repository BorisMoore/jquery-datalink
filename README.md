# jQuery Data Link plugin v1.0.0pre.

_Note: This plugin is currently in beta form and may change significantly before version 1.0 is released. See tagged versions for stable Beta releases. Requires jquery version 1.4.2._

Documentation for the _jQuery Data Link_ plugin can be found on the jQuery documentation site:
<a href="http://api.jquery.com/category/plugins/data-link/">http://api.jquery.com/category/plugins/data-link</a>

<p>
==================================== WARNING ====================================<br/>
<i><b>Breaking change:</b>
<br />In jQuery 1.5, the behavior of $(plainObject).data() has been modified. In order to work against all versions of jQuery including jQuery 1.5, 
current builds of jquery-datalink have therefore been modified as follows:
<ul>
<li>The API to modify field values is now .setField( name, value ), rather than .data( name, value ). (Examples below).</li>
<li>The events associated with the modified field are now "setField" and "changeField", rather than "setData" and changeData".</li>
</ul></i>
Note: This plugin currently depends on jQuery version 1.4.3.<br/>
=================================================================================
</p>
</p>


<h1>Introduction</h1>
<p>
This is the official jQuery DataLink plugin. The term "data linking" is used here to mean "automatically linking the field of an object to another field of another object." That is to say, the two objects are "linked" to each other, where changing the value of one object (the 'source') automatically updates the value in the other object (the 'target').
</p>

<h2>jQuery(..).link() API</h2>

<p>
The link API allows you to very quickly and easily link fields of a form to an object. Any changes to the form fields are automatically pushed onto the object, saving you from writing retrieval code. By default, changes to the object are also automatically pushed back onto the corresponding form field, saving you from writing even more code. Furthermore, converters lets you modify the format or type of the value as it flows between the two sides (for example, formatting a phone number, or parsing a string to a number).
</p>

<pre>
&lt;script>
$().ready(function() {
	var person = {};
	$("form").link(person);

	$("[name=name]").val("NewValue"); // Set firstName to a value.
	alert(person.name); // NewValue
	
	$(person).setField("name", "NewValue");
	alert($("[name=name]").val()); // NewValue
	
	// ... user changes value ...
	$("form").change(function() {
		// &lt;user typed value&gt;
		alert(person.name); 
	});	
});
&lt;/script>

&lt;form name="person">
	&lt;label for="name">Name:&lt;/label>
	&lt;input type="text" name="name" id="name" />
&lt;/form>
</pre>

<p>
The jQuery selector serves as a container for the link. Any change events received by that container are processed. So linking with $("form") for example would hookup all input elements. You may also target a specific element, such as with $("#name").link(..).

<h2>Customizing the Mapping</h2>

<p>
It is not always that case that the field of an object and the name of a form input are the same. You might want the "first-name" input to set the obj.firstName field, for example. Or you may only want specific fields mapped rather than all inputs.
</p>
<pre>
var person = {};
$("form").link(person, {
	firstName: "first-name",
	lastName: "last-name",
});
</pre>
<p>
This links only the input with name "first-name" to obj.firstName, and the input with name "last-name" to obj.lastName.
</p>


<h2>Converters and jQuery.convertFn</h2>

<p>
Often times, it is necessary to modify the value as it flows from one side of a link to the other. For example, to convert null to "None", to format or parse a date, or parse a string to a number. The link APIs support specifying a converter function, either as a name of a function defined on jQuery.convertFn, or as a function itself.
</p>
<p>
The plugin comes with one converter named "!" which negates the value.
</p>

<pre>
&lt;script>
$().ready(function() {
	var person = {};

	$.convertFn.round = function(value) {
		return Math.round( parseFloat( value ) );
	}

	$("#age").link(person, {
		age: {
			convert: "round"
		}
	});
	
	/* Once the user enters their age, the change event will fire which, in turn, will
	 * cause the round function to be called. This will then round the age up or down, 
	 * set the rounded value on the object which will then cause the input field to be 
	 * updated with the new value.
	 */
	$("#age").change(function() {
		alert(person.age);
	});
});
&lt;/script>

&lt;form name="person">
	&lt;label for="age">Age:&lt;/label>
	&lt;input type="text" name="age" id="age" />
&lt;/form>
</pre>

<p>
It is convenient to reuse converters by naming them this way. But you may also specify the converter directly as a function.
</p>

<pre>
var person = {};
$("#age").link(person, {
	age: {
		convert: function(value) {
			return Math.round( Math.parseFloat( value ) );
		}
	}
});

$("#name").val("7.5");
alert(person.age); // 8
</pre>

<p>
Converter functions receive the value that came from the source, the source object, and the target object. If a converter does not return a value or it returns undefined, the update does not occur. This allows you to not only be able to convert the value as it is updated, but to customize how the value is assigned.
</p>
<pre>
var person = {};
$("#age").link(person, {
	age: {
		convert: function(value, source, target) {
			var age = Math.round( Math.parseFloat( value ) );
			target.age = age;
			target.canVote = age >= 18;
		}
	}
});
$("#name").val("7.5");
alert(person.age); // 8
alert(person.canVote); // false
$("#name").val("18");
alert(person.canVote); // true
</pre>
<p>
In this example, the converter sets two fields on the target, and neglects to return a value to cancel the default operation of setting the age field. 
</p>
<p>
Converters can also be specified for the reverse process of updating the source from a change to the target. You can use this to customize the attribute used to represent the value, rather than the default of setting the 'value'.
</p>
<pre>
var product = { };
$("#rank").link(product, {
	salesRank: {
		convertBack: function(value, source, target) {
			$(target).height(value * 2);
		}
	}
});
$(product).setField("salesRank", 12);
alert($("#rank").height()); // 24
</pre>
<p>
This example links the height of the element with id "rank" to the salesRank field of the product object. When the salesRank changes, so does the height of the element. Note in this case there is no linking in the opposite direction. Changing the height of the rank element will not update the product.salesRank field.
</p>


<h2>Updating immediately</h2>
<p>
Sometimes it is desired that the target of a link reflect the source value immediately, even before the source is changed. Currently there is no built-in API for this, but you can force by triggering a change event.
</p>

<pre>
$(source)
	.link(target)
	.trigger("change");

alert(target.input1); // value

// or in reverse
$(source)
	.link(target);

$(target)
	.trigger("changeField");

alert($("[name=age]").val()); // target.age
</pre>

<h2>jQuery(..).unlink() API</h2>
<p>
This removes a link previously established with link.
</p>

<pre>
$(source)
	.link(target) // create link
	.unlink(target); // cancel link
</pre>

<strong>Automatic unlinking</strong><br/>

<p>
Links are cleaned up when its target or source is a DOM element that is being destroyed. For example, the following setups a link between an input and a span, then destroys the span by clearing it's parent html. The link is automatically removed.
</p>

<pre>
$("#input1").link("#span1", {
	text: "input1"
});
$("#span1").parent().html("");
</pre>
