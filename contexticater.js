var contexticater = function(something, contexter){
    var data = JSON.stringify(something);
    var somedata = JSON.parse(data);
    
    var context = contexter();
    
    for (var key in somedata){
        var value = somedata[key];
        if (typeof value === 'object'){
            context['var'](
                key,
                contexticater(
                    value, contexter));
        }
        else{
            context['var'](
                key,
                value);
        }
    }
    
    return context;
};

module.exports = contexticater;