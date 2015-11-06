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

everything.addfloor = function(floorid, filepath){
    var floorcontent = 
    {
        content: 'floor-li-image',
        filepath: filepath
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
everything.deletefloor = function(app){
    app.put('/:id', function(req, res){
        console.log('recieved put practice');
        console.log(req.body);
        try{
            var practice = req.body;
            everything.practices[req.params.id] = practice;
            var response = {};
            response.id = req.params.id;
            response.message = 'Success';
            response.url = req.protocol + '://' + req.get('host') + '/practice/' + response.id;
            res.json(response);console.log(everything.practices[req.params.id]);
        }
        catch(err){
            res.status(400).json({ message: 'Error'});
        }
    });
};
everything.getpractice = function(app){
    app.get('/:id', function(req, res, next){
        console.log('getting practice');
        if (! everything.practices[req.params.id]){console.log('practice not found');
            next();}
        else{console.log('practice discovered');
            res.json(everything.practices[req.params.id]);}
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
        res.redirect('/change');
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
            everything.context._all().then(function(floorssequence){
                var floorsids = floorssequence.keys().toArray();
                console.log('hey emitting now', floorsids);
                socket.emit('floors', floorsids);
            })
                .catch(function(err){
            console.log('RED LIGHTS!!!', err);
                });
        };
        
        emitfloors();
        
        everything.context
            ._changed(emitfloors);
        
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
    
    var data = new datajs ('./heywhereami');
    
    require('./dataer.js')(everything.context, data);
};

everything.quicky();
everything.repl();
everything.socket();
everything.contexting();

module.exports = everything;