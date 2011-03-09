/*!
 * jQuery Data Link plugin 1.0.0pre
 *
 * BETA2 INVESTIGATION
 *
 * http://github.com/jquery/jquery-datalink
 *
 * Copyright Software Freedom Conservancy, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */

(function($, undefined) {

var linkSettings, decl,
	fnSetters = {
		value: "val",
		html: "html",
		text: "text"
	},

	linkAttr = "data-jq-link",
	bindAttr = "data-jq-bind",

	unsupported = {
		"htmlhtml": 1,
		"arrayobject": 1,
		"objectarray": 1
	},

	getEventArgs = {
		pop: function( arr, args ) {
			if ( arr.length ) {
				return { change: "remove", oldIndex: arr.length - 1, oldItems: [ arr[arr.length - 1 ]]};
			}
		},
		push: function( arr, args ) {
			return { change: "add", newIndex: arr.length, newItems: [ args[ 0 ]]};
		},
		reverse: function( arr, args ) {
			if ( arr.length ) {
				return { change: "reset" };
			}
		},
		shift: function( arr, args ) {
			if ( arr.length ) {
				return { change: "remove", oldIndex: 0, oldItems: [ arr[ 0 ]]};
			}
		},
		sort: function( arr, args ) {
			if ( arr.length ) {
				return { change: "reset" };
			}
		},
		splice: function( arr, args ) {
			var index = args[ 0 ],
				numToRemove = args[ 1 ],
				elementsToRemove,
				elementsToAdd = args.slice( 2 );
			if ( numToRemove <= 0 ) {
				if ( elementsToAdd.length ) {
					return { change: "add", newIndex: index, newItems: elementsToAdd };
				}
			} else {
				elementsToRemove = arr.slice( index, numToRemove );
				if ( elementsToAdd.length ) {
					return { change: "move", oldIndex: index, oldItems: elementsToRemove, newIndex: index, newItems: elementsToAdd };
				} else {
					return { change: "remove", oldIndex: index, oldItems: elementsToRemove };
				}
			}
		},
		unshift: function( arr, args ) {
			return { change: "add", newIndex: 0, newItems: [ args[ 0 ]]};
		},
		move: function( arr, args ) {
			var fromIndex,
				numToMove = arguments[ 1 ];
			if ( numToMove > 0 ) {
				fromIndex = arguments[ 0 ];
				return { change: "move", oldIndex: fromIndex, oldItems: arr.splice( fromIndex, numToMove ), newIndex: arguments[ 2 ]};
			}
		}
	};

function addBinding( map, from, to, callback, links ) {

	function findJqObject( jqObject, type ) {
		var object, nodeName, path, linkedElems,
			length = jqObject.length;

		if ( length ) {
			object = jqObject[0];
			if ( object.nodeType ) {
				path = thisMap[ type ];
				if ( path ) {

//	TODO Replace with this style for better perf:
//	elems = elem.getElementsByTagName("*");
//	for ( m = elems.length - 1; m >= 0; m-- ) {
//		processItemKey( elems[m] );
//	}
//	processItemKey( elem );

					jqObject = jqObject.find( path ).add( jqObject.filter( path ) );  // TODO REPLACE BY ABOVE in the case of default binding, and remove support for random default binding - if perf concerns require it...
					thisMap[ type ] = 0;
					thisMap[ type + "Attr" ] = "default";
				}
			} else if ( length > 1 ) {
				jqObject = $([ jqObject.get() ]); // For objects: don't wrap multiples - consider as equivalent to a jQuery object containing single object - namely the array of objects.
			}
		}
		return jqObject;
	}

	var	thisMap = typeof map === "string" ? { to: map } : map && $.extend( {}, map );  // Note: "string" corresponds to 'to'. Is this intuitive? It is useful for filtering object copy: $.link( person, otherPerson, ["lastName", "address.city"] );

	from = findJqObject( from, "from" );
	if ( !from ) {
		return;
	}

	to = findJqObject( to, "to" );

	var i, link, innerMap, isArray,
		fromPath = thisMap.from,
		fromObj = from[0],
		fromType = objectType( fromObj ),
		isFromHtml = (fromType === "html"),
		isToHtml = (toType === "html"),
		toObj = to[0],
		toType = objectType( toObj ),
		eventType = isFromHtml ? "change" : fromType + "Change",

		// TODO Verify optimization for memory footprint in closure captured by handlers, and perf optimization for using function declaration rather than statement?
		handler = function( ev, eventArgs ) {
			var cancel, sourceValue, sourcePath,
				source = ev.target,

			fromHandler = {
				"html": function() {
					var setter, fromAttr, $source;

					fromAttr = thisMap.fromAttr;
					if ( fromAttr === "default" ) {
						// Merge in the default attribute bindings for this source element
						fromAttr = linkSettings.merge[ source.nodeName.toLowerCase() ];
						fromAttr = fromAttr ? fromAttr.from.fromAttr : "text";
					}
					setter = fnSetters[ fromAttr ];
					$source = $( source );
					sourceValue = setter ? $source[setter]() : $source.attr( fromAttr );
				},
				"object": function() {
					// For objectChange events, eventArgs provides the path (name), and value of the changed field
					var mapFrom = thisMap.from || !isToHtml && thisMap.to;
					if ( eventArgs ) {
						sourceValue = eventArgs.value;
						sourcePath = eventArgs.path;
						if ( mapFrom && sourcePath !== mapFrom ) {
							sourceValue = undefined;
						}
					} else {
						// This is triggered by .trigger(), where source is an object. So no eventArgs passed.
						sourcePath = mapFrom || sourcePath;
	//	TODO - verify for undefined source fields. Do we set target to ""?	sourceValue = sourcePath ? getField( source, sourcePath ) : "";
						sourceValue = sourcePath && getField( source, sourcePath ) || linkAttr;  // linkAttr used as a marker of trigger events
					}
				},
				"array": function() {
					// For objectChange events, eventArgs is a data structure of info on the array change
					sourceValue = eventArgs ? eventArgs.change : linkAttr;  // linkAttr used as a marker of trigger events
				}
			},

			toHandler = {
				"html": function() {
					to.each( function( _, elem ) {
						var setter, targetPath , matchLinkAttr,
							targetValue = sourceValue,
							$target =  $( elem ),

							htmlArrayOperation = {
								"add": function() {
									$( thisMap.tmpl ).tmpl( eventArgs.newItems ).appendTo( elem );
								},
								"remove": function() {
								},
								"reset": function() {
								},
								"move": function() {
									return target.splice( args[ 2 ], 0, target.splice( args[ 0 ], args[ 1 ]));
								}
							};

						function setTarget( all, attr, toPath, convert, toPathWithConvert ) {
							attr = attr || thisMap.toAttr;
							toPath = toPath || toPathWithConvert;
							convert = window[ convert ] || thisMap.convert; // TODO support for named converters

// Not currently supported
//if ( isFromHtml ) {
//	matchLinkAttr = (toPath === decl.getLinkInfo( source ));
//} else {
							matchLinkAttr = (!sourcePath || sourcePath === toPath );
							if ( !eventArgs ) {
								// This is triggered by trigger(), and there is no thisMap.from specified,
								// so use the declarative specification on each target element to determine the sourcePath.
								// So need to get the field value and run converter
								targetValue = getField( source, toPath );
							}
							// If the eventArgs is specified, then this came from a real field change event (not ApplyLinks trigger)
							// so only modify target elements which have a corresponding target path.
							if ( targetValue !== undefined && matchLinkAttr) {
								if ( convert && $.isFunction( convert )) {
									targetValue = convert( targetValue, source, sourcePath, elem, thisMap );
								}
								if ( attr === "default" ) {
									// Merge in the default attribute bindings for this target element
									attr = linkSettings.merge[ elem.nodeName.toLowerCase() ];
									attr = attr? attr.to.toAttr : "text";
								}

								if ( css = attr.indexOf( "css-" ) === 0 && attr.substr( 4 ) ) {
									if ( $target.css( css ) !== targetValue ) {
										$target.css( css, targetValue );
									}
								} else {
									setter = fnSetters[ attr ];
									if ( setter && $target[setter]() !== targetValue ) {
										$target[setter]( targetValue );
									} else if ( $target.attr( attr ) !== targetValue ){
										$target.attr( attr, targetValue );
									}
								}
							}
						}

						if ( fromType === "array" ) {
							if ( thisMap.tmpl) {
								htmlArrayOperation[ eventArgs.change ]();
							}
						} else {
							// Find path using thisMap.from, or if not specified, use declarative specification
							// provided by decl.applyBindInfo, applied to target element
							targetPath = thisMap.from;
							if ( targetPath ) {
								setTarget( "", "", targetPath );
							} else {
								var tmplItem = $.tmplItem && $.tmplItem( elem );
								if ( !(tmplItem && tmplItem.key) || (tmplItem.data === source )) {
									decl.applyBindInfo( elem, setTarget );
								}
							}
						}
					});
				},
				"object": function() {
					function setFields( sourceObj, basePath, cb ) {
						var field, isObject, sourceVal;

						for ( field in fromObj ) {
							isObject = 1;
							sourceVal = fromObj[ field ];
							if ( fromObj.hasOwnProperty(field) && !( $.isFunction( sourceVal ) || sourceVal.toJSON)) {
								setFields( sourceVal, (basePath ? basePath + "." : basePath) + field, cb );
							}
						}
						return isObject || cb( basePath, sourceObj, convert );
					}

					function convertAndSetField( toPath, val, cnvt ) {
						$.dataSetField( toObj, toPath, cnvt
							? cnvt( val, source, toPath, toObj, thisMap )
							: val
						);
					}
					// Find toPath using thisMap.to, or if not specified, use declarative specification
					// provided by decl.applyLinkInfo, applied to source element
					var convert = thisMap.Convert,
						toPath = thisMap.to || !isFromHtml && sourcePath;

					if (toPath ) {
						convertAndSetField( toPath, thisMap.convert );
					} else if ( !isFromHtml ) {
						// This is triggered by trigger(), and there is no thisMap.from or thisMap.to specified.
						// This will set fields on existing objects or subobjects on the target, but will not create new subobjects, since
						// such objects are not linked so this would not trigger events on them. For deep copying without triggering events, use $.extend.
						setFields( source, "", convertAndSetField );
					} else { // from html. (Mapping from array to object not supported)

						var tmplItem = $.tmplItem && $.tmplItem( source );
						if ( !(tmplItem && tmplItem.key) || (tmplItem.data === toObj )) {
							decl.applyLinkInfo( source, function(all, path, declCnvt){
								// TODO support for named converters
								convertAndSetField( path, sourceValue, window[ declCnvt ] || convert );
							});
						}
					}
				},
				"array": function() {
					// For arrayChange events, eventArgs is a data structure of info on the array change
					if ( fromType === "array" ) {
						if ( !eventArgs ) {
							var args = $.map( fromObj, function( obj ){
								return $.extend( true, {}, obj );
							});
							args.unshift( toObj.length );
							args.unshift( 0 );
							eventArgs = getEventArgs.splice( toObj, args );
						}
						changeArray( toObj, eventArgs );
					}
				}
			};
//getEventArgs.splice( toObj )
//$.dataChangeArray( toObj, "splice", 0, toObj.length, eventArgs || {
//	change: "move",
//	oldIndex: toObj.length,
//	oldItems: toObj,
//	newIndex: fromObj.length,
//	newItems: $.map(fromObj, function( obj ){
//		return $.extend(true, {}, obj);
//	})
//});
			fromHandler[ fromType ]();

			if ( !callback || !(cancel = callback.call( thisMap, ev, eventArgs, to, thisMap ) === false )) {
				if ( toObj && sourceValue !== undefined ) {
					toHandler[ toType ]();
				}
			}
			if ( cancel ) {
				ev.stopImmediatePropagation();
			}
		};

		switch ( fromType + toType ) {
			case "htmlarray" :
				for ( var j=0, l=toObj.length; j<l; j++ ) {
					addBinding( thisMap, from, $( toObj[j] ), callback, links );
				}
			break;

			case "arrayhtml" :
				from.bind( eventType, handler );
				for ( var j=0, l=fromObj.length; j<l; j++ ) {
					addBinding( thisMap, $( fromObj[j] ), to, callback, links );
				}
			break;

			default:
				from.bind( eventType, handler );
		}

//	if ( fromType === "array" && toType === "html" ) {
//		for ( var j=0, l=fromObj.length; j<l; j++ ) {
//			// This can probably be optimized by removing redundant data-jq-item annotations and leaving only top-level ones for each template item.
//			addBinding( thisMap, $(fromObj[ j ]), to.filter("[data-jq-item=" + j + "]"), callback, links );
//		}
//	}

	links.push({
		handler: handler,
		from: from,
		to: to,
		map: thisMap,
		type: eventType
	});

	// If from an object and the 'from' path points to a field of a descendant 'leaf object',
	// bind not only from leaf object, but also from intermediate objects
	if ( fromType === "object" && fromPath ) {
		fromPath = fromPath.split(".");
		if ( fromPath.length > 1 ) {
			fromObj = fromObj[ fromPath.shift() ];
			if ( fromObj ) {
				innerMap = $.extend( { inner: 1 }, thisMap ) // 1 is special value for 'inner' maps on intermediate objects, to prevent trigger() calling handler.
				innerMap.from = fromPath.join(".");
				addBinding( innerMap, $( fromObj ), to, callback, links );
			}
		}
	}
}

function objectType( object ) {
	return object
		? object.nodeType
			? "html"
			: $.isArray( object )
				? "array"
				: "object"
		: "none";
}

function declarativeMap( fromType, toType ) {
	 return !unsupported[ fromType + toType ] && $.extend( decl.from[fromType], decl.to[toType], { decl: true } );
}

function wrapObject( object ) {
	return object instanceof $ ? object : $.isArray( object ) ? $( [object] ) : $( object ); // Ensure that an array is wrapped as a single array object
}

function getField( object, path ) {
	if ( object && path ) {
		var leaf = getLeafObject( object, path );
		object = leaf[0];
		if ( object ) {
			return object[ leaf[1] ];
		}
	}
}

function getLeafObject( object, path ) {
	if ( object && path ) {
		var parts = path.split(".");

		path = parts.pop();
		while ( object && parts.length ) {
			object = object[ parts.shift() ];
		}
		return [ object, path ];
	}
	return [];
}

function changeArray( array, eventArgs ) {
	var ret, $array = $([ array ]),
		arrayOperation = {
			"add": function() {
				array.push( eventArgs.newItems[0] ); // Todo - use concat or iterate, for inserting multiple items
			},
			"remove": function() {
			},
			"reset": function() {
			},
			"move": function() {
				return array.splice( eventArgs.newIndex, 0, array.splice( eventArgs.oldIndex, eventArgs.number));
			}
		};

	if ( eventArgs ) {
		ret = arrayOperation[ eventArgs.change ]();
		$array.triggerHandler( "arrayChange!", eventArgs );
	} else {
		// this is a trigger
	}
	return ret;
}

$.extend({
	dataLink: function( from, to, maps, callback ) {
		var args = $.makeArray( arguments ),
			l = args.length - 1;
		if ( !callback && $.isFunction( args[ l ])) {
			// Last argument is a callback.
			// So make it the fourth parameter (our named callback parameter)
			args[3] = args.pop();
			return $.dataLink.apply( $, args );
		}
		var i,
			links = [],
			linkset = {   // TODO Consider exposing as prototype, for extension
				links: links,
				push: function() {
					var link, i = 0, l = links.length;
					while ( l-- ) {
						link = links[ l ];
						if ( !link.map.inner ) { // inner: 1 - inner map for intermediate object.
							link.from.each( function(){
								link.handler({
									type: link.type,
									target: this
								});
							});
						}
					}
					return linkset;
				},
				unlink: function() {
					var link, l = links.length;
					while ( l-- ) {
						link = links[ l ];
						link.from.unbind( link.type, link.handler );
					}
					return linkset;
				}
			};

		if ( from ) {
			from = wrapObject( from );
			to = wrapObject( to );

			if ( maps = maps || declarativeMap( objectType( from[ 0 ]), objectType( to[ 0 ]))) {
				maps = $.isArray( maps ) ? maps : [ maps ];

				i = maps.length;

				while ( i-- ) {
					addBinding( maps[i], from, to, callback, links );
				}
			}
		}
		return linkset;
	},
	dataPush: function( from, to, maps, callback ) {
		// TODO - provide implementation
	},
	dataPull: function( from, to, maps, callback ) {
		// TODO - provide implementation
	},
	dataSetField: function( object, path, value ) { // TODO add support for passing in object (map) with newValues to copy from.
		if ( path ) {
			var $object = $( object ),
				args = [{ path: path, value: value }],
				leaf = getLeafObject( object, path );

			object = leaf[0], path = leaf[1];
			if ( object && (object[ path ] !== value )) {
			//	$object.triggerHandler( setFieldEvent + "!", args );
				object[ path ] = value;
				$object.triggerHandler( "objectChange!", args );
			}
		}
	},
	dataGetField: function( object, path ) {
		return getField( object, path );
	},

	// operations: pop push reverse shift sort splice unshift move
	dataChangeArray: function( array, operation ) {
		var args = $.makeArray( arguments );
		args.splice( 0, 2 );
		return changeArray( array, getEventArgs[ operation ]( array, args ));
	},

	dataLinkSettings: {
		decl: {
			linkAttr: linkAttr,
			bindAttr: bindAttr,
			applyLinkInfo: function( elem, setTarget ){
				var linkInfo = elem.getAttribute( decl.linkAttr );
				if ( linkInfo ) {
									//  toPath:          convert     end
					linkInfo.replace( /([\w\.]+)(?:\:\s*(\w+)\(\)\s*)?$/g, setTarget );
				}
//lastName:convert1()
//	Alternative using name attribute:
//	return elem.getAttribute( decl.linkAttr ) || (elem.name && elem.name.replace( /\[(\w+)\]/g, function( all, word ) {
//		return "." + word;
//	}));
			},
			applyBindInfo: function( elem, setTarget ){
				var bindInfo = elem.getAttribute( decl.bindAttr );
				if ( bindInfo ) {
										// toAttr:               toPath    convert(  toPath  )        end
					bindInfo.replace( /(?:([\w\-]+)\:\s*)?(?:(?:([\w\.]+)|(\w+)\(\s*([\w\.]+)\s*\))(?:$|,))/g, setTarget );
				}
			},
			from: {
				object: {},
				html: {
					from: "input[" + linkAttr + "]"
				}
			},
			to: {
				object: {},
				html: {
					to: "[" + bindAttr + "]"
				}
			}
		},
		merge: {
			input: {
				from: {
					fromAttr: "value"
				},
				to: {
					toAttr: "value"
				}
			}
		}
	}
});

$.extend({
	unlink: function() {
		// TODO - provide implementation
	},
	triggerLinks: function() {
		// TODO - provide implementation
	}
});

linkSettings = $.dataLinkSettings;
decl = linkSettings.decl;

})( jQuery );
