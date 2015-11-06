var Lazy = require('lazy.js');

var scope = function(parent){
    if (parent == null)
        var scope = Object.create(null);
    else
        var scope = Object.create(parent);
    
    return contextify(scope);
};

var contextify = function(context){
    
    var findscope = require('./scrap.js').findscope;
    
    var events = {};
    
    var on = function(event, listener){
        if (! events[event])
            events[event] = Lazy([]);
        events[event] = events[event]
            .concat(listener);
    };
    var off = function(event, listener){
        if (! events[event])
            return;
        events[event] = events[event]
            .without(listener);
    };
    var emit = function(event, data){
        return new Promise(function(resolve){
            if (events[event])
                events[event]
                    .each(function(listener){
                        listener(data);
                    });
            resolve();
        });
    };
    
    var _ = function(key){
        return new Promise(function(resolve, reject){
            findscope(context, key)
                .then(function(context){
            emit('reading', {key: key})
                .then(function() {
            context['_get'](key)
            
                .catch(function(error){
            emit('read', {key: key, error: error})
                .then(function(){
            reject(error);
            });
            })
                .then(function(value){
            emit('read', {key: key, value: value})
                .then(function(){
            resolve(value);
            });
            });
            });
            });
        });
    };
    var _var = function(key, value){
        return new Promise(function(resolve, reject){
            emit('changing', {key: key, value: value})
                .then(function(){
            context['_set'](key, value)
            
                .catch(function(error){
            emit('changed', {key: key, value: value, error: error})
                .then(function(){
            reject(error);
            });
            })
                .then(function(){
            emit('changed', {key: key, value: value})
                .then(function(){
            resolve();
            });
            });
            });
        });
    };
    var __ = function(key, value){
        return new Promise(function(resolve, reject){
            findscope(context, key)
                .then(function(context){
            context['var'](key, value)
            
                .catch(
            reject
            )
                .then(
            resolve
            );
            });
        });
    };
    
    Object.defineProperties(context,
        {
            '_has':{
                value: function(key){
                    return new Promise(function(resolve){
                        resolve(Object.prototype.hasOwnProperty.call(context, key));});
                },
                writable: true
            },
            '_get':{
                value: function(key){
                    return new Promise(function(resolve){
                        resolve(context[key]);});
                },
                writable: true
            },
            '_set':{
                value: function(key, value){
                    return new Promise(function(resolve){
                        context[key] = value;
                        resolve();
                    });
                },
                writable: true
            },
            '':{
                value: function(){
                    if (arguments.length < 2)
                        return _.apply(this, arguments);
                    else
                        return __.apply(this, arguments);
                }
            },
            'var':{
                value: function(){
                    return _var.apply(this, arguments);}
            },
            '_on':{
                value: on
            },
            '_off':{
                value: off
            },
            '_changing':{
                value: function(listener){
                    on('changing', listener);
                }
            },
            '_changed':{
                value: function(listener){
                    on('changed', listener);
                }
            },
            '_reading':{
                value: function(listener){
                    on('reading', listener);
                }
            },
            '_read':{
                value: function(listener){
                    on('read', listener);
                }
            }
        }
    );
    
    var parent = Object.getPrototypeOf(context);
    
    if (parent != null){
        parent['_changing'](function(){emit(arguments);});
        parent['_changed'](function(){emit(arguments);});}
    
    
    return context;
};


module.exports = function(context/*, document, window*/){
    context = scope(context);
    
    /*if (arguments.length >= 3){
        context.document = document;
        context.window = window;
        context.$ = require('jquery')(context.window);}*/
        
    return context;
};