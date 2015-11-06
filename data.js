var data = function(context, location) {
    
    var nedber = require('nedb');
    
    var nedb = new nedber({ filename: location, autoload: true });
    
    var apply = function(method, args){
        return nedb[method]
            .apply(nedb, args);
    };
    
    this.insert = function(){return apply('insert', arguments);};
    this.find = function(){return apply('find', arguments);};
    this.findOne = function(){return apply('findOne', arguments);};
    this.count = function(){return apply('count', arguments);};
    this.update = function(){return apply('update', arguments);};
    this.remove = function(){return apply('remove', arguments);};
};

module.exports = data;