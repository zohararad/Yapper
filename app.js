require.paths.unshift('./node_modules');
var express = require('express');

var app = module.exports = express.createServer();

//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header("Access-Control-Allow-Headers","X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
    res.header("Access-Control-Allow-Credentials",false); //no cookies allowed
    // Cache pre-flight request for 24hrs
    res.header("Access-Control-Max-Age",'86400')
    next();
}
// Configuration

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

// Routes

app.get('/', function(req, res){
  res.render('index', {});
});

app.get('/chat', function(req, res){
  res.render('chat', {});
});

app.listen(process.env.VMC_APP_PORT || 3000);