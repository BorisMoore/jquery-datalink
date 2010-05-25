/*
 * jQuery live links plugin
 * http://github.com/nje
 */
(function($){

var oldattr = $.attr,
    oldval = $.fn.val,
    olddata = $.data,
    oldcleandata = $.cleanData,
    linkId = 0;

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

$.cleanData = function( elems ) {
    for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
        if ( $.data( elem, "links" ) ) {
            // remove any links that target this element
            // as the source may not be being cleaned up
            $.unlink( { target: elem } );
        }
    }
    oldcleandata( elems );
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

$.each( "attrChanging attrChange arrayChanging arrayChange".split(' '), function( i, name ) {
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

var setter_lookup = {
    val: "val",
    html: "html",
    text: "text"
}

$.link = function( settings, context ) {
    if ( settings.from && settings.to ) {
        var from = settings.from,
            sources = from.sources || from.targets,
            sourceAttrs = from.attr,
            converts = from.convert,
            to = settings.to,
            targets = to.targets || to.sources,
            targetAttrs = to.attr;
        sources = $.isArray( sources ) ? sources : [sources];
        targets = $.isArray( targets ) ? targets : [targets];
        sourceAttrs = typeof sourceAttrs === "undefined" ? null : ($.isArray( sourceAttrs ) ? sourceAttrs : [sourceAttrs]),
        targetAttrs = typeof targetAttrs === "undefined" ? null : ($.isArray( targetAttrs ) ? targetAttrs : [targetAttrs]),
        converts = $.isArray( converts ) ? converts : [converts];
        $.each(sources, function(i, source) {
            var target = targets[ Math.min( targets.length - 1, i ) ],
                sourceAttr = sourceAttrs ? sourceAttrs[ Math.min( sourceAttrs.length - 1, i ) ] : "val",
                targetAttr = targetAttrs ? targetAttrs[ Math.min( targetAttrs.length - 1, i ) ] : (source.name || source.id),
                convert = converts[ Math.min( converts.length - 1, i ) ];
            $.link({
                source: source,
                target: target,
                sourceAttr: sourceAttr,
                targetAttr: targetAttr,
                convert: convert
            }, context);
        });
        if ( settings.twoWay ) {
            $.link({ from: to, to: from }, context);
        }
        return;
    }
    
    var source = settings.source,
        target = settings.target,
        sourceAttr = settings.sourceAttr || "",
        targetAttr = settings.targetAttr || "",
        convert = settings.convert;
    // wrap arrays in another array because $([]) is treatment of
    // the contents, not the array itself
    source = $($.isArray( source ) ? [ source ] : source, context);
    target = $($.isArray( target ) ? [ target ] : target, context);
    convert = $.convertFn[ convert ] || convert;
    var isVal = sourceAttr === "val",
        targetFn = setter_lookup[targetAttr];
        
    target.each(function(i, target) {
        var _target = $(target);
        source.each(function(i, source) {
            var _source = $(source);
            var handler = function(ev) {
                var newValue;
                if ( ev ) {
                    newValue = ev.newValue;
                }
                else if ( sourceAttr && sourceAttr.indexOf( "data:" ) === 0 ) {
                    newValue = _source.data( sourceAttr.substr( 5 ) );
                }
                else if ( sourceAttr ) {
                    newValue = sourceAttr === "val" ? _source.val() : _source.attr( sourceAttr );
                }
                if ( convert ) {
                    newValue = convert( newValue, settings );
                }
                if ( newValue !== undefined ) {
                    if (targetFn) {
                        _target[ targetFn ].call( _target, newValue );
                    }
                    else if ( targetAttr.indexOf( "data:" ) === 0 ) {
                        _target.data( targetAttr.substr( 5 ), newValue );
                    }
                    else {
                        _target.attr( targetAttr, newValue );
                    }
                }
            };
            var id = linkId++,
                link = {
                    source: source,
                    sourceAttr: sourceAttr,
                    target: target,
                    targetAttr: targetAttr,
                    handler: handler
                };
            // register this link with the target
            var data = $.data( target ),
                links = data.links || (data.links = { targets: {}, sources: {} }),
                index = links.targets;
            index[ id ] = link;
            // register this link with the source
            data = $.data( source );
            links = data.links || (data.links = { targets: {}, sources: {} });
            index = links.sources;
            index[ id ] = link;
            // listen to changes on the source
            _source.attrChange( sourceAttr, handler );
            // force an update immediately, before the first change
            handler();
        });
    });
}

/*
Links are individually remembered via data() in order to facillitate
removing them individually. For example, you might all at once link
a single source to several targets, then remove the linking to one of
the targets.

Each link object looks like this:

link = { source: source, sourceAttr: sourceAttr,
         target: target, targetAttr: targetAttr,
         handler: handler }

And they are indexed per element like this:
         
elem.data.links = {
    // index of links that have this element as the source
    sources: {
        linkId1: link1,
        linkId2: link2,
        ...
    },
    // index of links that have this element as the target
    targets: {
        linkId1: link1,
        linkId2: link2,
        ...
    }
}

The links are stored by a unique link id rather than array
in order to make removing them upon unlinking faster.
*/

function getLinksFor(obj, attr, isSource) {
    var links = $.data( obj, "links" ),
        index = links ? (links[ isSource ? "sources" : "targets" ]) : null;
    if ( !index ) {
        return {};
    }
    else if ( attr ) {
        var matched = {};
        $.each(index, function(linkId, link) {
            if ( link[ isSource ? "sourceAttr" : "targetAttr" ] === attr ) {
                matched[ linkId ] = link;
            }
        });
        index = matched;
    }
    return index;
}
function filterBy(links, obj, objAttr, isSource) {
    var matched = {},
        objField = isSource ? "source" : "target",
        objAttrField = isSource ? "sourceAttr" : "targetAttr";
    $.each(links, function(linkId, link) {
        if ( link[objField] === obj && ( !objAttr || link[objAttrField] === objAttr ) ) {
            matched[ linkId ] = link;
        }
    });
    return matched;
}

function getLinks( source, sourceAttr, target, targetAttr ) {
    var matched;
    if ( source ) {
        matched = getLinksFor( source, sourceAttr, true );
        if ( target ) {
            // filter by target
            matched = filterBy( matched, target, targetAttr );
        }
    }
    else if ( target ) {
        matched = getLinksFor( target, targetAttr );
        if ( source ) {
            // filter by source
            matched = filterBy( matched, source, sourceAttr, true );
        }
    }
    else {
        matched = {};
    }
    return matched;
}

function unlink( link ) {
    // unbind handler
    $( link.source ).unbind( "attrChange", link.handler );
    // remove link from sources and targets list in each side's data cache
    var links = $.data( link.source, "links" );
    delete links.sources[ link.id ];
    links = $.data( link.target, "links");
    delete links.targets[ link.id ];
    // remove references to help ensure no circular references
    link.source = null;
    link.target = null;
}

$.unlink = function( settings ) {
    var source = settings.source,
        target = settings.target,
        sourceAttr = settings.sourceAttr || "",
        targetAttr = settings.targetAttr || "";
    source = source ? $($.isArray( source ) ? [ source ] : source) : null;
    target = target ? $($.isArray( target ) ? [ target ] : target) : null;
    function remove(source, target) {
        var links = getLinks( source, sourceAttr, target, targetAttr );
        $.each(links, function(linkId, link) {
            unlink( link );
        });
    }
    
    if ( source && target ) {
        source.each(function(i, source) {
            target.each(function(i, target) {
                remove( source, target );
            });
        });
    }
    else if ( source ) {
        source.each(function(i, source) {
            remove( source );
        });
    }
    else if ( target ) {
        target.each(function(i, target) {
            remove( null, target );
        });
    }
}

$.convertFn = {
    "!": function(value) {
        return !value;
    }
};

})(jQuery);
