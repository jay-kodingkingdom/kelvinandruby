var Lazy = require('lazy.js');

var dataer = function(context, data){

    context['_has'] = function(key){
        return new Promise(function(resolve, reject){
            data.findOne({ _id: key}, function(err, doc){
                if (err)
                    reject(err);
                else
                    resolve(doc);});
        });
    };
    context['_get'] = function(key){
        return new Promise(function(resolve, reject){
            data.findOne({ _id: key}, function(err, doc){
                if (err || !doc)
                    reject(err);
                else
                    resolve(doc.value);});
        });
    };
    context['_set'] = function(key, value){
        return new Promise(function(resolve, reject){console.log('inserting',key,value);
            data.update({_id: key}, { _id: key, value: value}, {upsert: true}, function(err, doc){
                if (err)
                    reject(err);
                else
                    resolve();});
        });
    };
    Object.defineProperty(context
        , '_all'
        , 
        {
            value: function(){
                return new Promise(function(resolve, reject){
                    data.find({},
                        function(err, docs){
                            if (err)
                                reject(err);
                            else
                                resolve(
                                    Lazy(docs)
                                        .indexBy(
                                            '_id'
                                            ,function(i){
                                                delete i._id; return i;}));
                        });
                });
            }
        });
};

module.exports = dataer;