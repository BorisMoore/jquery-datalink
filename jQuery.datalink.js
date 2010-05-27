/*
 * jQuery live links plugin
 * http://github.com/nje
 */
(function($){

var oldattr = $.attr,
    oldval = $.fn.val,
    olddata = $.data,
    oldcleandata = $.cleanData,
    linkId = 0,
    liveLinks = {};

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
    formElems = /^(textarea|input|select)$/i;

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

special.attrChange.teardown = function() { };

$(document).bind("change.attrChange", function(ev) {
    var self = $(ev.target);
    self.trigger( "attrChange", { attrName: "val", newValue: self.val() } );
});

var setter_lookup = {
    val: "val",
    html: "html",
    text: "text"
}

function processFromTo( settings, context, fn ) {
    var from = settings.from,
        to = settings.to,
        sources = from.sources || from.targets,
        sourceAttrs = from.attr,
        converts = from.convert,
        targets = to.targets || to.sources,
        targetAttrs = to.attr,
        updates = to.update;
    sources = $.isArray( sources ) ? sources : [sources];
    targets = $.isArray( targets ) ? targets : [targets];
    updates = typeof updates === "undefined" ? null : ($.isArray( updates ) ? updates : [updates]),
    sourceAttrs = typeof sourceAttrs === "undefined" ? null : ($.isArray( sourceAttrs ) ? sourceAttrs : [sourceAttrs]),
    targetAttrs = typeof targetAttrs === "undefined" ? null : ($.isArray( targetAttrs ) ? targetAttrs : [targetAttrs]),
    converts = $.isArray( converts ) ? converts : [converts];
    $.each(sources, function(i, source) {
        var target = targets[ Math.min( targets.length - 1, i ) ],
            sourceAttr = sourceAttrs ? sourceAttrs[ Math.min( sourceAttrs.length - 1, i ) ] : null,
            targetAttr = targetAttrs ? targetAttrs[ Math.min( targetAttrs.length - 1, i ) ] : null,
            convert = converts[ Math.min( converts.length - 1, i ) ],
            update = updates ? updates[ Math.min( updates.length - 1, i ) ] : null;
        fn({
            source: source,
            target: target,
            sourceAttr: sourceAttr,
            targetAttr: targetAttr,
            convert: convert,
            update: update
        }, context);
    });
    if ( settings.twoWay ) {
        var update = to.update;
        delete to.update;
        fn({ from: to, to: from }, context);
        to.update = update;
    }
}

function getValue(elem, attr) {
    var value = ( attr && attr.indexOf( "data:" ) === 0 )
        ? elem.data( attr.substr( 5 ) )
        : (attr === "val" ? elem.val() : elem.attr( attr ));
    return value;
}

function setValue(sourceElem, targetElem, attr, value) {
    var defaultAttr = sourceElem.attr( "itemprop" );
    if ( !defaultAttr ) {
        var e = sourceElem.get( 0 );
        defaultAttr = e.name || e.id;
    }
    targetElem.each(function() {
        var a = attr;
        if ( !attr ) {
            if ( this.nodeType ) {
                // val for inputs, text for everything else
                var nodeName = this.nodeName;
                a = formElems.test( nodeName ) ? "val" : "text";
            }
            else {
                a = defaultAttr;
            }
        }
        var fn = setter_lookup[ a ];
        if ( fn ) {
            $(this)[ fn ]( value );
        }
        else if ( a.indexOf( "data:" ) === 0 ) {
            $.data( this, a.substr( 5 ), value );
        }
        else {
            $(this).attr( a, value );
        }
    });
}

$.linkLive = function( settings, context ) {
    if ( settings.from && settings.to ) {
        processFromTo( settings, context, $.linkLive );
        return;
    }
    var source = settings.source,
        target = settings.target,
        sourceAttr = settings.sourceAttr || "",
        targetAttr = settings.targetAttr || "",
        convert = settings.convert;
        
    // wrap arrays in another array because $([]) is treatment of
    // the contents, not the array itself
    source = $.isArray( source ) ? [ source ] : source;
    target = $.isArray( target ) ? [ target ] : target;
        
    var handler = function(ev, forceSource) {
        var source = ev ? ev.target : forceSource;
        var attr = sourceAttr;
        if ( !attr ) {
            // val for inputs, text for everything else
            if ( source.nodeType ) {
                var nodeName = source.nodeName;
                attr = formElems.test( nodeName ) ? "val" : "text";
            }
        }
        var _source = $(source),
            newValue = ev ? ev.newValue : getValue( _source, attr ),
            cv = convert ? ($.convertFn[ convert ] || convert) : null;
        if ( cv ) {
            newValue = cv( newValue, settings );
        }
        if ( typeof newValue !== "undefined" ) {
            setValue( _source, $(target, context), targetAttr, newValue );
        }
    }
    
    $(source, context).live( "attrChange", handler );

    var list = liveLinks[ source ] || (liveLinks[ source ] = []);
    list.push({
            source: source,
            sourceAttr: sourceAttr,
            target: target,
            targetAttr: targetAttr,
            context: context,
            handler: handler
    });
    
    if ( settings.update ) {
        $(source).each(function() {
            handler(null, this);
        });
        
    }
}

$.unlinkLive = function( settings, context ) {
    if ( settings.from && settings.to ) {
        processFromTo( settings, context, $.unlinkLive );
        return;
    }
    var source = settings.source,
        target = settings.target,
        sourceAttr = settings.sourceAttr || "",
        targetAttr = settings.targetAttr || "";
    var links = liveLinks[ source ];
    if ( links ) {
        $.each(links, function(i, link) {
            if (link.context === context && link.sourceAttr === sourceAttr && link.target === target && link.targetAttr === targetAttr) {
                $(link.source, context).die("attrChange", link.handler);
                delete links[ link.source ];
                link.source = null;
                link.target = null;
                link.handler = null;
                link.context = null;
                return false;
            }
        });
    }
}

$.link = function( settings, context ) {
    if ( settings.from && settings.to ) {
        processFromTo( settings, context, $.link );
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
    
    target.each(function(i, target) {
        var _target = $(target);
        source.each(function(i, source) {
            var attr = sourceAttr;
            if ( !attr ) {
                // val for inputs, text for everything else
                if ( this.nodeType ) {
                    var nodeName = this.nodeName;
                    attr = formElems.test( nodeName ) ? "val" : "text";
                }
            }
            var handler = function(ev, reverse) {
                if ( !ev || source === ev.target ) {
                    var _source = $(ev ? ev.target : source),
                        newValue = ev ? ev.newValue : getValue( _source, attr ),
                        // re-evaluate convert each occurrance to pick up dynamic changes to convertFn
                        cv = convert ? ($.convertFn[ convert ] || convert) : null;
                    if ( cv ) {
                        newValue = cv( newValue, settings );
                    }
                    if ( typeof newValue !== "undefined" ) {
                        setValue( _source, _target, targetAttr, newValue );
                    }
                }
            };
            var id = linkId++,
                link = {
                    source: source,
                    sourceAttr: sourceAttr,
                    target: target,
                    targetAttr: targetAttr,
                    handler: handler,
                    id: id
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
            $(source).attrChange( attr ? attr.split( ' ' ) : '', handler );
            if ( settings.update ) {
                handler();
            }
        });
    });
}

/*
Links are individually remembered via data() in order to facilitate
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

'Live' links are not associated with any dom elements for obvious reasons.
A private dictionary is kept for them, indexed by the source selector.
var liveLinks = {
    source1: [link1, link2, ...],
    source2: [link1, link2, ...],
    ...
}
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
    link.handler = null;
}

$.unlink = function( settings, context ) {
    if ( settings.from && settings.to ) {
        processFromTo( settings, context, $.unlink );
        return;
    }
    var source = settings.source,
        target = settings.target,
        sourceAttr = settings.sourceAttr || "",
        targetAttr = settings.targetAttr || "";
    source = source ? $($.isArray( source ) ? [ source ] : source, context) : null;
    target = target ? $($.isArray( target ) ? [ target ] : target, context) : null;
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
