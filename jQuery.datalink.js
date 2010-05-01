/*
 * jQuery live links plugin
 * http://github.com/nje
 */
(function($){

var oldattr = $.attr,
    oldval = $.fn.val,
    olddata = $.data;

function attr( obj, name, value, pass ) {
    // an attr that supports plain objects (won't look for .style, nodeType, etc)
    return $.isPlainObject( obj )
        ? ( value === undefined ? obj[ name ] : ( obj[ name ] = value ) )
        : oldattr( obj, name, value, pass );
}

function raiseEvents(type, context, change, setValue) {
    // todo: peek if there are any listeners to avoid extra work
    var ret,
        event = $.Event( type + "Changing" ),
        isArray =  type === "array";
    event.newValue = isArray ? change.arguments : change.newValue;
    $.event.trigger( event, [ change ], context );
    if (!event.isDefaultPrevented()) {
        var newvalue = isArray ? change.arguments : event.newValue;
        ret = setValue(newvalue);
        var oldvalue = change.oldValue;
        if ( isArray || typeof oldvalue === "undefined" || newvalue !== oldvalue ) {
            isArray ? (change.arguments = newvalue) : (change.newValue = newvalue);
            $.event.trigger( type + "Change", [ change ], context );
        }
    }
    return ret;
}

$.attr = function( elem, name, value, pass ) {
    var ret = this;
    if (value === undefined) 
        ret = attr( elem, name, value, pass );
    else {
        raiseEvents( "attr", elem, { attrName: name, oldValue: attr( elem, name ), newValue: value },
            function(newvalue) {
                attr( elem, name, value, pass );
            });
    }
    return ret;
}

$.fn.val = function( value ) {
    var ret = this;
    if ( value === undefined )
        ret = oldval.call( this );
    else {
        this.each(function() {
            var self = $(this);
            raiseEvents( "attr", this, { attrName: "val", oldValue: oldval.call( self ), newValue: value },
                function(newvalue) {
                    oldval.call( self, newvalue );
                });
        });
    }
    return ret;
}

$.data = function( elem, name, data ) {
    var ret;
    if ( typeof data === "undefined" ) {
        ret = olddata( elem, name );
    }
    else {
        var oldvalue,
            newvalue = data,
            attrName;
        if ( typeof name === "object" ) {
            attrName = "data:!";
            newvalue = name;
        }
        else {
            attrName = "data:" + name;
            oldvalue = olddata( elem, name );
        }
        ret = raiseEvents( "attr", elem, { attrName: attrName, oldValue: oldvalue, newValue: newvalue },
            function(newvalue) {
                return olddata( elem, name, newvalue );
            });
    }
    return ret;
}

$.each( "pop push reverse shift sort splice unshift".split(" "), function( i, name ) {
    $[ name ] = function( arr ) {
        var args = $.makeArray( arguments );
        args.splice( 0, 1 );
        return raiseEvents( "array", arr, { change: name, arguments: args }, function(arguments) {
            arr[ name ].apply( arr, arguments );
        });
    }
});

var special = $.event.special,
    formElems = /textarea|input|select/i;

$.each( ["attrChanging", "attrChange", "arrayChanging", "arrayChange"], function( i, name ) {
    var isattr = i < 2;
    
    $.fn[ name ] = function(filter, fn) {
        if ( arguments.length === 1 ) {
            fn = filter;
            filter = null;
        }
        return fn ? this.bind( name, filter, fn ) : this.trigger( name );
    }
    
    special[ name ] = {
        add: function( handleObj ) {
            var old_handler = handleObj.handler;
            handleObj.handler = function( event, change ) {
                var data = handleObj.data,
                    attrName = change ? (isattr ? change.attrName : change.change) : null;
                if ( !change || !data || data === attrName || $.inArray( attrName, data ) > -1 ) {
                    $.extend( event, change );
                    // todo: support extra parameters passed to trigger as
                    // trigger('attrChange', [<change>, extra1, extra2]).
                    old_handler.call( this, event );
                }
            }
        }
    }
});
$.extend(special.attrChange, {
        setup: function() {
            // when a form element's val() changes, it raises the attrChange
            // event where attrName is "val". There is no attrChanging event
            // in this case.
            if ( formElems.test( this.nodeName ) ) {
                $(this).bind( "change.attrChange", function(ev) {
                    var self = $( this );
                    self.trigger( "attrChange", { attrName: "val", newValue: self.val() } );
                } );
            }
        },
        teardown: function() {
            $(this).unbind( "change.attrChange" );
        }
});

// "live" link bindings

var setter_lookup = {
    val: "val",
    html: "html",
    text: "text"
}

$.link = function( settings ) {
    var source = settings.source,
        target = settings.target,
        sourceAttr = settings.sourceAttr,
        targetAttr = settings.targetAttr,
        convert = settings.convert;
    // wrap arrays in another array because $([]) is treatment of
    // the contents, not the array itself
    source = $($.isArray( source ) ? [ source ] : source);
    target = $($.isArray( target ) ? [ target ] : target);
    convert = $.convertFn[ convert ] || convert;
    var isVal = sourceAttr === "val",
        targetFn = setter_lookup[targetAttr];
    function update(ev) {
        var newValue;
        if ( ev ) {
            newValue = ev.newValue;
        }
        else if ( sourceAttr && sourceAttr.indexOf( "data:" ) === 0 ) {
            newValue = source.data( sourceAttr.substr( 5 ) );
        }
        else if ( sourceAttr ) {
            newValue = sourceAttr === "val" ? source.val() : source.attr( sourceAttr );
        }
        if ( convert ) {
            newValue = convert( newValue, settings );
        }
        if ( newValue !== undefined ) {
            if (targetFn) {
                target[ targetFn ].call( target, newValue );
            }
            else if ( targetAttr.indexOf( "data:" ) === 0 ) {
                target.data( targetAttr.substr( 5 ), newValue );
            }
            else {
                target.attr( targetAttr, newValue );
            }
        }
    }
    source.attrChange( sourceAttr, update );
    // force an update immediately, before the first change
    update();
}

$.convertFn = {
    "!": function(value) {
        return !value;
    }
};

$.fn.extend({
    linkFrom: function( targetAttr, source, sourceAttr, convert ) {
        var settings = {
            target: this
        };
        if ( $.isPlainObject( targetAttr ) ) {
            $.extend( settings, targetAttr );
        }
        else {
            settings.source = source;
            settings.sourceAttr = sourceAttr;
            settings.targetAttr = targetAttr;
            settings.convert = convert;
        }
        $.link( settings );
        return this;
    },
    linkTo: function( sourceAttr, target, targetAttr, convert ) {
        var settings = {
            source: this
        };
        if ( $.isPlainObject( sourceAttr ) ) {
            $.extend( settings, sourceAttr );
        }
        else {
            settings.target = target;
            settings.targetAttr = targetAttr;
            settings.sourceAttr = sourceAttr;
            settings.convert = convert;
        }
        $.link( settings );
        return this;
    },
    linkBoth: function( targetAttr, source, sourceAttr ) {
        return this.linkTo( targetAttr, source, sourceAttr )
            .linkFrom( targetAttr, source, sourceAttr );
    }
});

})(jQuery);
