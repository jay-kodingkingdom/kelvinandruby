var Lazy = require('lazy.js');

var everything = {};


everything.make = function(){
    for (var i = 1; i < arguments.length; i++)
        arguments[i](arguments[0]);
    return arguments[0];
};

everything.quicky = function(){
    var express = require('express');
    var app = express();
    
    everything.make(app,
        everything.log,
        everything.body, everything.cookie, everything.upload);
    
    app.use('/floors/', everything.make(express(), everything.postfloor));
    
    app.use('/', everything.make(express(), everything.serve));
    
    app.use('/', everything.make(express(), everything.done));
    
    everything.server = app.listen(process.env.PORT, function () {
        var host = everything.server.address().address;
        var port = everything.server.address().port;
        console.log('Listening at http://%s:%s', host, port);
    });
};


everything.log = function(app){
    app.use(require('morgan')('combined'));
    app.all('*', function(req, res, next){
        console.log('new request');
        next();
    });
};
everything.cookie = function(app){
    app.use(require('cookie-parser')());
};
everything.body = function(app){
    app.use(require('body-parser').json());
    app.use(require('body-parser').urlencoded({extended: true}));
};
everything.upload = function(app){
    app.use(require('connect-busboy')());
};


everything.deletefloor = function(floorid){
    everything.context.var(floorid, undefined)
        .catch(function(err){
    console.log('RED LIGHTS!!!', err);
        });
};
everything.addfloor = function(floorid, filepath){
    var floorcontent = 
    {
        content: 'floor-li-image',
        filepath: filepath,
        items: 
        {
            Everything: [{x: 0, y: 0},{x: 0, y: 1000},{x: 1000, y: 1000},{x: 1000, y: 0}]
        }
    };
    everything.context.var(floorid, floorcontent)
        .catch(function(err){
    console.log('RED LIGHTS!!!', err);
        });
};
everything.createfloor = function(file){
    return new Promise(function(resolve, reject){
        console.log('Uploading');
        
        var generateUUID = function(){
            var d = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = (d + Math.random()*16)%16 | 0;
                d = Math.floor(d/16);
                return (c=='x' ? r : (r&0x3|0x8)).toString(16);
            });
            return uuid;
        };
        
        var floorid = generateUUID();
        var filepath = '/floors/' + floorid;
        
        console.log('Done preparation');
        console.log(__dirname + '/serve' + filepath);
        
        var filestream = require('fs-extra').createWriteStream(__dirname + '/serve' + filepath);
        
        filestream.on('close', function () {    
            console.log("Upload Finished");
            everything.addfloor(floorid, filepath);
            resolve({id: floorid});
        });
        
        file.pipe(filestream);
    });
};
everything.postfloor = function(app){
    app.post('/', function (req, res) {
        req.busboy.on('file', function (fieldname, file) {
            everything.createfloor(file)
                .then(function(floorid){
            console.log('Done',floorid);
            var response = {};
            response.id = req.filename;
            response.message = 'Success';
            res.json(response);
                });
        });
        
        req.pipe(req.busboy);
    });
};


everything.serve = function(app){
    app.set('views', __dirname + '/serve');
    //app.engine('html', engines.mustache);
    app.set('view engine', 'ejs');
    app.all('/:page', function(req, res, next){console.log('trying serve page:'+req.params.page);
        try{
            var info = req.query || {};
            info.body = req.body;
            info.require = require;
            res.render(
                req.params.page,
                info,
                function(err, html) {
                    if (err){console.log('render failed');console.log(err);
                        next();}
                    else{console.log('done render');
                        res.send(html);}
            });
        }
        catch(err){console.log('render not found');
            next();
        }
    });
    app.use(require('express').static(__dirname+'/serve'));
};
everything.done = function(app){
    app.all('*', function (req, res, next) {
        console.log('processing unhandled request');
        res.redirect('/you');
        //res.status(404).end();
    });
};


everything.repl = function(){
    var repl = require('repl')
    var net = require('net')
    
    module.exports = net.createServer(function (socket) {
        var r = repl.start({
            prompt: '[' + process.pid + '] ' +socket.remoteAddress+':'+socket.remotePort+'> '
            , input: socket
            , output: socket
            , terminal: true
            , useGlobal: false
        });
        r.on('exit', function () {
            socket.end();
        });
        r.context.socket = socket;
    }).listen(1337);
};
everything.socket = function(){
    var server = everything.server;
    var io = require('socket.io')(server);

    io.on('connection', function(socket){
        console.log('user connected');
        
        var emitfloors = function(){
            console.log('hey emitting');
            everything.context._all()
            .then(function(floorssequence){
                var floorsids = floorssequence
                    .filter(function(floor){ return floor.value;})
                    .keys().without('comments').toArray();
                console.log('hey emitting now', floorsids);
                socket.emit('floors', floorsids);
            })
                .catch(function(err){
            console.log('Error!', err);
                });
        };
        
        var servefloorinfo = function(){
            var ejs = require('ejs');
            var fs = require("fs");
            
            var sendfloorinfo = function(floorinfo){console.log('tried to send floor info');
                socket.emit('loadedfloor', floorinfo);
            };
            
            socket.on('loadfloor', function(floorinfo){console.log(floorinfo, 'recieved loadfloor');
                try {
                    console.log(__dirname + '/serve/' + floorinfo.template +'.ejs', 'loading floor conscious ', !!floorinfo.content.id);
                    
                    if (floorinfo.content.id)
                        everything.context[''](floorinfo.content.id)
                            .then(function(floorcontent){
                                
                        floorinfo.content.items = floorcontent.items;
                               
                        if (floorinfo.newitem){console.log('processing newitem');
                            var itemidtry = 0;
                            var itemid = "Item " + (+Object.keys(floorcontent.items).length + itemidtry);
                            while (floorcontent.items[itemid]){
                                itemidtry++;
                                itemid = "Item " + (+Object.keys(floorcontent.items).length + itemidtry);
                            }
                            floorcontent.items[itemid] = floorinfo.newitem;
                            floorinfo.content.items = floorcontent.items;
                            
                            console.log(floorcontent, 'floorcontent again');
                            
                            everything.context.var(floorinfo.content.id, floorcontent)
                                .then(function(){
                                    
                            console.log('going to send fllor');
                            floorinfo.content.require = require;
                            sendfloorinfo(
                                ejs.render(fs.readFileSync(__dirname + '/serve/' + floorinfo.template +'.ejs', "utf8"), floorinfo.content));
                                });}
                        
                        else if (floorinfo.deleteitem){console.log('processing delitem');
                            
                            floorcontent.items[floorinfo.deleteitem] = undefined;
                            floorinfo.content.items = floorcontent.items;
                            
                            console.log(floorcontent, 'floorcontent again');
                            
                            everything.context.var(floorinfo.content.id, floorcontent)
                                .then(function(){
                                    
                            console.log('going to send fllor');
                            floorinfo.content.require = require;
                            sendfloorinfo(
                                ejs.render(fs.readFileSync(__dirname + '/serve/' + floorinfo.template +'.ejs', "utf8"), floorinfo.content));
                                });}
                        
                        else if (floorinfo.savename){console.log('processing saveitemname');
                            
                            var itemname = floorinfo.savename;
                            floorcontent.items[itemname.to] = floorcontent.items[itemname.from];
                            floorcontent.items[itemname.from] = undefined;
                            floorinfo.content.items = floorcontent.items;
                            
                            console.log(floorcontent, 'floorcontent again');
                            
                            everything.context.var(floorinfo.content.id, floorcontent)
                                .then(function(){
                                    
                            console.log('going to send fllor');
                            floorinfo.content.require = require;
                            sendfloorinfo(
                                ejs.render(fs.readFileSync(__dirname + '/serve/' + floorinfo.template +'.ejs', "utf8"), floorinfo.content));
                                });}
                                
                        else if (floorinfo.suicide){console.log('processing suicide');
                            
                            everything.deletefloor(floorinfo.content.id)
                            
                            sendfloorinfo(
                                    '<div class="embed-responsive embed-responsive-16by9 border"></div>'
                            );}
                                
                        else if (floorinfo.comment){console.log('processing comment');
                            
                            var addcomment = function(comments){
                                var comment = floorinfo.comment;
                                comment.time = Date();
                                comments.push(comment)
                                
                                everything.context.var('comments', comments);
                                
                                console.log('comments now',comments);
                            };
                            
                            everything.context['']('comments')
                                .then(addcomment)
                                .catch(function(err){
                            if (err !== null)
                                console.log('ERRORRRRR!!!', err);
                            else
                                everything.context.var('comments',[])
                                    .then(function(){
                            everything.context['']('comments')
                                .then(addcomment)
                                    });
                                });
                            
                            }
                        
                        else{
                            console.log('going to send fllor');
                            floorinfo.content.require = require;
                            sendfloorinfo(
                                ejs.render(fs.readFileSync(__dirname + '/serve/' + floorinfo.template +'.ejs', "utf8"), floorinfo.content));} 
                            });
                            
                    else
                        sendfloorinfo(
                                '<div class="embed-responsive embed-responsive-16by9 border"></div>'
                            );
                }
                catch(e){
                    var stacktrace = function() {
                        var err = new Error();
                        return err.stack;
                    };
                    console.log('red lights',e, stacktrace());
                }
            });
        };
        
        emitfloors();
        
        everything.context
            ._changed(emitfloors);
            
        servefloorinfo();
        
        socket.on('disconnect', function(){
            console.log('user disconnected');
            everything.context
                ._off('changed', emitfloors);
        });
    });
};
everything.contexting = function(){
    everything.context = require('./context.js')();
    
    var datajs = require('./data.js');
    
    var data = new datajs (everything.context, './floors');
    
    require('./dataer.js')(everything.context, data);
};

everything.quicky();
everything.repl();
everything.socket();
everything.contexting();

module.exports = everything;