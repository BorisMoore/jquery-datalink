<h1>Introduction</h1>

This proposal describes how support for "data linking" can be added to the jQuery core library. The term "data linking" is used here to mean "automatically linking the field of an object to another field of another object." That is to say, the two objects are "linked" to each other, where changing the value of one object (the 'source') automatically updates the value in the other object (the 'target').

<h2>Mutation Events</h2>
In order to link a source to a target, it is necessary to be notified when a data associated with the source object changes, so that it can be pushed onto the target object. This plugin adds some special events to jQuery to facilitiate this, which are also useful on their own.

<h3>attrChange</h3>

The 'attrChange' event fires when an attribute of a DOM element or object is changed through the jQuery.fn.attr or jQuery.attr methods. An interesting feature of this plugin is that it specifically allows for jQuery.fn.attr to be usable on plain objects or arrays. The data(), bind(), and trigger() methods all work with plain objects, so this is a natural extension which already mostly works. However, a small change was necessary to jQuery.attr to avoid the special cases applied when the target is a plain object, like class->className, and readonly->readOnly, and that negative values of "width" are ignored, etc. So this plugin also makes it officially possible to use attr() to set fields of an object as you would expect.

<pre>
function report(ev) {
    alert("Change attr '" + ev.attrName + "' from '" +
        ev.oldValue + "' to '" + ev.newValue + "'.");
}

$("#el").attrChange(report)
    // Change attr 'foo' from 'undefined' to 'bar'
    .attr("foo", "bar").
    // Change attr 'foo' from 'bar' to 'baz'
    .attr("foo", "baz");

//restricted scope can be thought of as a filter
//only attributes changed exactly matching (===) will trigger the event
    
// restricted scope
$("#el").attrChange("x", report)
    // Change attr 'x' from 'undefined' to '1'
    // Note no event for 'y' because the scope of 'x' was passed in
    .attr( { x: "1", y: "2" } );
    
$("#el").attrChange([ "x", "y" ], report)
    // Change attr 'x' from 'undefined' to '1'
    // Change attr 'y' from 'undefined' to '2'
    // Note no event for 'z' because the scope of 'x' and 'y' was passed in
    .attr( { x: "1", y: "2", z: "3" } );
</pre>

The attrChange event can also be used to capture changes made through the val() and data() methods. Notice that special treatment is given to how the change is represented by the event. This consolidation of the different mutation methods causing the same event makes it simpler to handle and prevents the need for separate "dataChange" and "valChange" events. It would be nice, actually, if attr() was thought of as a general purpose mutation method and also supported this construct. For example, $(..).attr("data:foo", "bar") or $(..).attr("val", "123"). However, that is not implemented and open to discussion.

<pre>
// works with data()
$("#el").attrChange("data:foo", report)
    // Change attr 'data:foo' from 'undefined' to 'bar'
    .data( "foo", "bar" )
    // Change attr 'data:!' from '[Object object]' to '[Object object]'
    .data( { } );

// works with val()
$("#el").attrChange("val", report)
    // Change attr 'val' from 'hi' to 'bye'
    .val( 'bye' );
</pre>

<h3>attrChanging</h3>

The 'attrChanging' event fires when an attribute of a DOM element or object is about to be changed. The ev.preventDefault() method may be called in order to prevent the change from occuring.

<pre>
$("#el")
    .attrChanging(function(ev) {
        if (!confirm("Allow changing attr '" + ev.attrName + "' from '" +
            ev.oldValue + "' to '" + ev.newValue + "'?")) {
            
            ev.preventDefault();
        }
    });
    // Allow changing attr 'foo' from 'undefined' to 'bar'?
    // yes: value set, attrChange event raised
    // no: value not set, attrChange event not raised
    .attr("foo", "bar");
</pre>

<h3>arrayChange</h3>

Like the attrChange event, but fires when an Array is mutated through any of the new array mutation APIs. Information about what the mutation was is available on the event object.

<pre>
var arr = [1,2,3];
$([arr])
    .arrayChange(function(ev) {
        alert("Array operation " + ev.change + " executed with args " + ev.arguments);
    });
// Array operation push executed with args 4,5
$.push(arr, 4, 5);
</pre>

The following array mutation events are available as static methods on the jQuery object: push, pop, splice, shift, unshift, reverse, sort. The arguments supported for each are exactly like their built-ins, except the array is passed as the first parameter.

Like 'attrChange', the 'arrayChange' event supports filtering by the operation.

<pre>
$([arr])
    .arrayChange(["push", "pop", "splice"], function(ev) {
        alert("Array operation " + ev.change + " executed with args " + ev.arguments);
    });
// Array operation pop executed with args undefined
$.pop(arr);
// Array operation push executed with args 4,5
$.push(arr, 4, 5);
// nothing
$.splice(arr, 0, 1);
</pre>

<h3>arrayChanging</h3>

Exactly like the attrChanging event, but for arrays. Operation can be cancelled via the ev.preventDefault() method.


<h2>Linking Objects<h2>

When objects are linked, changes to one are automatically forwarded to another. For example, this allows you to very quickly and easily link fields of a form to an object. Any changes to the form fields are automatically pushed onto the object, saving you from writing retrieval code. Furthermore, built-in support for converters lets you modify the format or type of the value as it flows between objects (for example, formatting a phone number, or parsing a string to a number).

<h3>jQuery.link</h3>

Sets up a link that pushes changes to any of the source objects to all target objects.

<pre>
var person = {};
$.link({
    source: "#name", sourceAttr: "val",
    target: person, targetAttr: "name"
});
$("#name").val("foo");
alert(person.name); // foo
// ... user changes value ...
alert(person.name); // <user typed value>
</pre>

The 'source' may be an object, DOM element, or string selector. 
<strong>object</strong>
Changes to that object through a jQuery set wrapping it will trigger the link. e.g.:
<code>$(obj).attr("foo", "bar");</code>

<strong>DOM element or selector</strong>
This sets up a link from all the matching elements (if it is a selector) to all matching targets. For example, if there are 3 inputs and 3 spans on the page, 9 links are created, one from each input to each span.

<pre>
$.link({
    source: "input",
    target: "span"
});
</pre>

<strong>Attributes and Microdata</strong>
The 'sourceAttr' and 'targetAttr' fields are optional. If omitted, the attribute is determined automatically:

The source attribute is determined as follows:
input, textarea, or select: "val"
any other dom element: "text"

The target attribute is determined as follows:
Source is a DOM element, and has 'itemprop' microdata attribute? Use the value.
Otherwise, use source.name or source.id.
If source is not a DOM element, use the same rules as source attribute.

This allows for simple links that target complex scenarios. For example, the following creates a link from all input elements inside #form1 to a single target object. The field set on the object is determined by first seeing if the input causing the event has an 'itemprop' attribute. If not, the input's name or id is used. In this example, the target's 'fullName' and 'birthday' fields would be set.

<pre>
$.link({ source: "#form1 input", target: contact });

<input type="text" itemprop="fullName" name="name" />
<input type="text" name="birthday" />
</pre>

For example, the following sets up a link that activates whenever the val() of the input changes, and reacts by setting the text() of the span.

<pre>
$.link( { source: "#input1", target: "#span1" } );
</pre>

<strong>From/To Syntax</strong>

$.link supports creating multiple links with different rules at the same time. In this example, two form elements are mapped to two different fields of the same object.

<pre>
$.link({
    from: {
        sources: "#input-first", "#input-last"
    },
    to: {
        targets: contact,
        attr: ["firstName", "lastName"]
    }
});
</pre>

Each value specified can be an array, or not. If not, the one value is applied to all cases. If an array, corresponding indexes of each array are used to create each link. Note that each source may also still match multiple elements if it is a selector. The full syntax is:

<pre>
$.link({
    from: {
        sources: [source1, source2, ...] | sourceForAll,
        attr: [attr1, attr2, ...] | attrForAll,
        convert: [converter1, converter2, ...] | converterForAll,
        update: true | false
    },
    to: {
        targets: [target1, target2, ...] | targetForAll,
        attr: [attr1, attr2, ...] | attrForAll,
        convert: [converter1, converter2, ...] | converterForAll,
        update: true | false
    },
    twoWay: true | false
});
</pre>

<strong>twoWay</strong>

The twoWay option sets up links in both directions -- from source to target, and target to source. Changes in either will be reflected in the other. This is the reason for the 'convert' option on the 'to' settings -- those converters would be used when pushing changes from a target to a source (reverse).

<strong>Updating immediately</strong>

Sometimes it is desired that the target of a link reflect the source value immediately, even before the source is changed. You can tell link() to update the target immediately using the 'update' setting:

<pre>
$.link({ source: source, target: target, update: true });
$.link({
    from: {
        sources: source
    },
    to: {
        targets: target,
        update: true
    }
});
</pre>

Note that this is particularly useful when relying on the automatic target attribute determination. You can quickly populate an object with a form's current values by relying on <code>itemprop</code> attributes or input <code>name</code>, and setting update to true to force an immediate update.

Note that if you put 'update' on the 'from' settings, the source is updated with the target value, even though the link usually flows from the source to the target. This allows you, for example, to setup a link from an input to an object, but have the input initially reflect the value already in the target.

<strong>Context</strong>

$.link in both direct and from/to forms allows a 2nd jQuery context parameter. This context is used if any selectors are given. For example, these are equivalent:

<pre>
$.link({
    from: {
        sources: $(selector, context).get()
    },
    to: {
        targets: target
    }
});

$.link({
    from: {
        sources: selector
    },
    to: {
        targets: target
    }
}, context);

</pre>

<h3>jQuery.unlink</h3>

This removes a link previously established with $.link. The syntax is exactly like $.link, including the from/to syntax, except that the 'convert' and 'update' parameters are not used. A link is identified by four pieces of data: source, sourceAttr, target, and targetAttr. Note that it is possible to remove only a portion of a link previously created. For example, assuming there are two elements on the page with css class "foo" (#foo1 and #foo2), the following creates two links -- one from each, then removes only one of them.

<pre>
$.link( { source: ".foo", target: target, targetAttr: "field" } );
$.unlink( { source: "#foo1", target: target, targetAttr: "field" } );
</pre>

<strong>Automatic unlinking</strong>

Links are cleaned up when its target or source is a DOM element that is being destroyed. For example, the following setups a link between an input and a span, then destroys the span by clearing it's parent html. The link is automatically removed.

<pre>
$.link( { source: "#input1", target: "#span1" } );
$("#span1").parent().html("");
</pre>

<h3>jQuery.linkLive</h3>

$.liveLink is a powerful tool that links multiple elements now or in the future. For example, to map all the input fields of a form to an object, even when form fields are dynamically added in the future:

<pre>
$.liveLink({
    from: {
        source: "#form1 *"
    },
    to: {
        targets: contact
    }
});
</pre>

Note however that currently you cannot use 'twoWay' on a live link. You may use 'update'.

<h3>jQuery.unlinkLive</h3>

Removes a live link previously created with $.linkLive. Syntax is the same as unlink. Note that unlike regular links, live links do not expand into all the possible sources and targets when they are created. This means you cannot 'unliveLink' a portion of a live link, you may only remove the entire live link.

<h3>Conversion and jQuery.convertFn</h3>

Often times, it is necessary to modify the value as it flows from one side of a link to the other. For example, to convert null to "None", to format or parse a date, or parse a string to a number. The link APIs support specifying a converter function, either as a name of a function defined on jQuery.convertFn, or as a function itself.

The plugin comes with one converter named "!" which negates the value.

<pre>
var person = {};
$.convertFn.round = function(value) {
    return Math.round( Math.parseFloat( value ) );
}
$.link( { source: "#age", target: person, convert: "round" } );
$("#name").val("7.5");
alert(person.age); // 8
</pre>

It is nice to reuse converters by naming them this way. But you may also specified the converter directly as a function.

<pre>
var person = {};
$.link( { source: "#age", target: person, convert: function(value) {
    return Math.round( Math.parseFloat( value ) );
} });
$("#name").val("7.5");
alert(person.age); // 8
</pre>

Converter functions receive the value that came from the source as the first parameter. They also receive a settings object which corresponds to the parameters given to the link API (if the from/to syntax was used, the settings are expanded into the more granular source/target form). This allows you to easily parameterize a converter.

<pre>
var person = {};
$.convertFn.map = function(value, settings) {
    return settings.map[ value ] || value;
}
$.link( { source: "#color",
          target: person, targetAttr: "favoriteColor", convert: "map",
          map: { red: "#FF0000", blue: "#0000FF" } } );
$("#name").val("red");
alert(person.age); // #FF0000
</pre>

The settings object also contains the source and target parameters. Say you wanted to link two different fields on the source to one field the target, as in combining the first and last name fields of an object onto a single "full name" span.

<pre>
var person = { firstName: "Some", lastName: "User" };
$.convertFn.fullName = function(value, settings) {
    return settings.source.firstName + " " + settings.source.lastName;
}
$.link( { source: person, sourceAttr: "firstName lastName",
          target: "#fullname", targetAttr: "text", convert: "fullName" } );
alert($("#fullname").text()); // "Some User"
// update either field...
$(person).attr("firstName", "jQuery");
// and the target is updated
alert($("#fullname").text()); // "jQuery User"
</pre>


<h1>Revision History</h1>

* 5/26/2010 -- Completely revised the API based on forum feedback.
* 5/01/2010 -- Corrected comments about restricted scope -- event is suppressed, not the change.
* 5/01/2010 -- Fixed glitches in comments and added info about restricted scope.
* 4/29/2010 -- Expanded on converter samples.
* 4/28/2010 -- Initial proposal published
