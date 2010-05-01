A jQuery data linking plugin - created for demonstration purposes.
Adds 'attrChanging', 'attrChange', 'arrayChanging', 'arrayChange' events.
Adds jQuery.x array operations: pop, push, splice, sort, reverse, shift, unshift
Adds linkTo, linkFrom, and linkBoth plugins.

'attrChange' event -- be notified when an attribute is changed.

    function report(ev) {
        alert("Change attr '" + ev.attrName + "' from '" +
            ev.oldValue + "' to '" + ev.newValue + "'.");
    }
    
    $("#el").attrChange(report)
        // Change attr 'foo' from 'undefined' to 'bar'
        .attr("foo", "bar").
        // Change attr 'foo' from 'bar' to 'baz'
        .attr("foo", "baz");
        
     // restricted scope
     $("#el").attrChange("x", report)
        // Change attr 'x' from 'undefined' to '1'
        .attr( { x: "1", y: "2" } );
        
     $("#el").attrChange([ "x", "y" ], report)
        // Change attr 'x' from 'undefined' to '1'
        // Change attr 'y' from 'undefined' to '2'
        .attr( { x: "1", y: "2", z: "3" } );
       
     // consolidating different mutation operations
     // rather than a 'dataChange' event for data() operations
     
     $("#el").attrChange("data:foo", report)
        // Change attr 'data:foo' from 'undefined' to 'bar'
        .data( "foo", "bar" )
        // Change attr 'data:!' from '[Object object]' to '[Object object]'
        .data( { } );

     // works with val()
     $("#el").attrChange("val", report)
        // Change attr 'val' from 'hi' to 'bye'
        .val( 'bye' );

'attrChanging' event -- be notified before an attribute changes

    $("#el")
        .attrChanging(function(ev) {
            if (!confirm("Allow changing attr '" + ev.attrName + "' from '" +
                ev.oldValue + "' to '" + ev.newValue + "'?")) {
                
                ev.preventDefault();
            }
            
        })
        // Allow changing attr 'foo' from 'undefined' to 'bar'?
        // yes: value set, attrChange event raised
        // no: value not set, attrChange event not raised
        .attr("foo", "bar");
        
'arrayChange' event -- be notified when an array is modified

    var arr = [1,2,3];
    $([arr])
        .arrayChange(function(ev) {
            alert("Array operation " + ev.change + " executed with args " + ev.arguments);
        });
    // Array operation push executed with args 4,5
    $.push(arr, 4, 5);
    
    // restricted scope
    $([arr])
        .arrayChange("push", function(ev) {
            alert("Array operation " + ev.change + " executed with args " + ev.arguments);
        });
    // nothing
    $.pop(arr);
    // Array operation push executed with args 4,5
    $.push(arr, 4, 5);
    
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
    
'arrayChanging' event -- be notified before an array is modified
    // works just like 'attrChange', can cancel operation
    
'linkTo' plugin -- bind the value of the current object to the value of another

    var person = {};
    $("#name").linkTo("val", person, "name");
    alert(person.name); // $("#name").val()
    $("#name").val("foo");
    alert(person.name); // foo
    // ... user changes value ...
    alert(person.name); // <user typed value>
 
Support for converters -- modify the value as it flows across the link

    var person = {};
    $.convertFn.round = function(value) {
        return Math.round( Math.parseFloat( value ) );
    }
    $("#name").linkTo("val", person, "age", "round");
    $("#name").val("7.5");
    alert(person.age); // 8
    
'linkFrom' plugin -- bind the value of the current object from the value of another

    var person = {};
    $(person).linkFrom("name", "#name", "val");
    alert(person.name); // $("#name").val()
    $("#name").val("foo");
    alert(person.name); // foo
    // ... user changes value ...
    alert(person.name); // <user typed value>

'linkBoth' plugin -- links the values of two objects to each other
    var person = {};
    $(person).linkBoth("name", "#name", "val");
    alert(person.name); // $("#name").val()
    $("#name").val("foo");
    alert(person.name); // foo
    $(person).attr("name", "bob");
    alert($("#name").val()); // bob
