/*var jsdom = function(){
    var jsdom = require('jsdom').jsdom;
    var document = jsdom(undefined, {});
    var window = document.defaultView;
    return {document: document, window: window};
};*/

var same = function() {
	var i, l, leftChain, rightChain;

	function compare(x, y) {
		// remember that NaN === NaN returns false
		// and isNaN(undefined) returns true
		if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') 
			return true;
		// Compare primitives and functions.     
		// Check if both arguments link to the same object.
		// Especially useful on step when comparing prototypes
		if (x === y) 
			return true;
		// Works in case when functions are created in constructor.
		// Comparing dates is a common scenario. Another built-ins?
		// We can even handle functions passed across iframes
		if ((typeof x === 'function' && typeof y === 'function') ||
			(x instanceof Date && y instanceof Date) ||
			(x instanceof RegExp && y instanceof RegExp) ||
			(x instanceof String && y instanceof String) ||
			(x instanceof Number && y instanceof Number)) 
			return x.toString() === y.toString();
		// At last checking prototypes as good a we can
		if ((!(x instanceof Object && y instanceof Object)) ||
			(x.isPrototypeOf(y) || y.isPrototypeOf(x)) ||
			(x.constructor !== y.constructor) ||
			(x.prototype !== y.prototype)) 
			return false;
		// Check for infinitive linking loops
		if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) 
			return false;
		// Quick checking of one object beeing a subset of another.
		// todo: cache the structure of arguments[0] for performance
		var p;
		for (p in y) {
			if ((y.hasOwnProperty(p) !== x.hasOwnProperty(p)) ||
				(typeof y[p] !== typeof x[p]))
				return false;
		}

		for (p in x) {
			if ((y.hasOwnProperty(p) !== x.hasOwnProperty(p)) ||
				(typeof y[p] !== typeof x[p]))
				return false;
			

			switch (typeof(x[p])) {
				case 'object':
				case 'function':

					leftChain.push(x);
					rightChain.push(y);
					if (!compare(x[p], y[p]))
						return false;
					leftChain.pop();
					rightChain.pop();
					break;

				default:
					if (x[p] !== y[p]) 
						return false;
					break;
			}
		}

		return true;
	}

	if (arguments.length < 1)
		return true;

	for (i = 1, l = arguments.length; i < l; i++) {

		leftChain = []; //Todo: this can be cached
		rightChain = [];

		if (!compare(arguments[0], arguments[i]))
			return false;
	}

	return true;
};

var versioner = function(version){
    
    if (! version)
        version = 0;
    
    var versioner = {
        version: version,
        revise: function(){
            if (arguments.length === 1){
                var revise = arguments[0];
                var version = this.version;
                this.version++;}
            else{
                var revise = arguments[1];
                var version = arguments[0];}
            revise(version);
        }
    };
    
    return versioner;
};

var reviser = function(version){
    
    if (! version)
        version = 0;
    
    var revises = [];
    
    var reviser = {
        version: version,
        revise: function(version, revise){
            revises[version] = revise;
            while (revises[this.version]){
                revises[this.version](this.version);
                this.version++;
            }
        }
    };
    
    return reviser;
};

var findscope = function(context, key){
    
    var settle = function(scope, key){
        return new Promise(function(settle, climb){
            scope['_has'](key)
                .then(function(key, has){
            if (has){
                settle(scope);}
            else{
                var nextscope = Object.getPrototypeOf(scope);
                if (nextscope == null){
                    settle(scope);}
                else{
                    climb(nextscope);}}
            });
        });
    };
    
    var climbscope = function(scope){
    	return new Promise(function(resolve){
	        settle(scope, key)
	            .then(function(){
	            	resolve.apply(this,arguments);})
	            	
	            .catch( function(nextscope){
            climbscope(nextscope)
            	.then(resolve);
	                });
    	});
    };
    
    return new Promise(function(resolve){
    	climbscope(context)
    		.then(function(climbedscope){
        resolve(climbedscope);});
    });
};

var contextifyable = function(something){
    return typeof something === 'function';
};

var contextify = function(something, context){
    while (contextifyable(something))
        something = something(context);
        
    return something;
};

var pairify = function(something){
    var key = something[0];
    var value = something[1];
    
    var pairwrapper = contextify(key);
    if (typeof pairwrapper === 'object'){
        key = Object.keys(pairwrapper)[0];
        value = pairwrapper[key];}
        
    return {key: key, value: value};
};

var source = function(context){
	return Object.getPrototypeOf(context);
};

var scopeget = function(context){
	var source = source(context);
	var contextget = context['_get'];
	if (source)
		return function(key){
	        return new Promise(function(resolve, reject){
	            findscope(source, key)
	                .then( function(scope){
	                    
	            scope['_get'](key)
	                .catch(reject)
	                .then(resolve);
	            });
	        });
	    };
	else
		return function(key){
	        return new Promise(function(resolve, reject){
	            contextget(key)
	                .catch(reject)
	                .then(resolve);
	        });
	    };
};
var scopeset = function(context){
	var source = source(context);
	var contextset = context['_set'];
	if (source)
		return function(key, value){
	        return new Promise(function(resolve, reject){
	            findscope(source, key)
	                .then( function(scope){
	                    
	            scope['_set'](key, value)
	                .catch(reject)
	                .then(resolve);
	            });
	        });
	    };
	else
		return function(key, value){
	        return new Promise(function(resolve, reject){
	            contextset(key, value)
	                .catch(reject)
	                .then(resolve);
	        });
	    };
};


//module.exports.jsdom = jsdom;
module.exports.same = same;
module.exports.versioner = versioner;
module.exports.reviser = reviser;
module.exports.findscope = findscope;
module.exports.pairify = pairify;
module.exports.contextify = contextify;
module.exports.scopeget = scopeget;
module.exports.scopeset = scopeset;