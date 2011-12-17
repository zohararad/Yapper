require.paths.unshift('./node_modules');
var express = require('express');

var app = module.exports = express.createServer();

var Session = require('./session');
var session = new Session();

/** CORS middleware **/
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.header("Access-Control-Allow-Headers","X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials",false); //no cookies allowed
  res.header("Access-Control-Max-Age",'86400'); // Cache pre-flight request for 24hrs
  next();
}

/** Configuration **/
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(allowCrossDomain); //enable CORS
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

/** Routes **/
app.get('/', function(req, res){
  res.render('index', {});
});

app.post('/chat', function(req, res){
  var n = req.body.screen_name;
  session.create(req.body.screen_name,function(session_id,session_data){
    res.send({session_id:session_id, session_data:session_data});
  });
});

var sse_responses = [];
session.on('create',function(user_session){
  sse_responses.forEach(function(res){
    res.write("event: added\n");
    res.write("data:"+JSON.stringify(user_session)+"\n\n");
  });
});

session.on('destroy',function(user_session){
  sse_responses.forEach(function(res){
    res.write("event: removed\n");
    res.write("data:"+JSON.stringify(user_session)+"\n\n");
  });
});

app.get('/connected_users', function(req, res){
  res.header('Content-Type','text/event-stream');
  res.header('Cache-Control', 'no-cache');
  res.header('Connection', 'keep-alive');

  sse_responses.push(res);
  req.on('close',function(){
    var index = sse_responses.indexOf(res);
    if(index > -1){
      sse_responses.splice(index,1);
    }
  });
});

app.listen(process.env.VMC_APP_PORT || 3000);

/** WebSocket Server **/
var connections = [];
var WebSocketServer = require('websocket').server;
var wsServer = new WebSocketServer({
                     httpServer:app,
                     fragmentOutgoingMessages: false
                   });

wsServer.on('request', function(request) {
  var connection = request.accept('yapper-chat-service', request.origin); //new connection, accepting requests only on 'yapper-chat-service'
  
  // Handle incoming message
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      var msg = message.utf8Data;
      if(/session_id/.test(msg)){
        var o = JSON.parse(msg);
        session.addConnection(connection, o.session_id);
      } else {
        session.broadcastToConnections(msg);
      }
    }
  });
  
  // Handle closed connections
  connection.on('close', function() {
    session.removeConnection(connection);
  });
  
  // Handle connection error
  connection.on('error', function(error) {
    console.log("Connection error for peer " + connection.remoteAddress + ": " + error);
  });
});