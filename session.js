// basic imports
var events = require('events');

// for us to do a require later
module.exports = Session;

function Session() {
  this.connections = [];
  this.sessions = {};
  events.EventEmitter.call(this);
}

// inherit events.EventEmitter
Session.super_ = events.EventEmitter;
Session.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Session,
    enumerable: false
  }
});

Session.prototype.create = function(user, callback) {
  var session_id = this.createSessionID();
  this.sessions[session_id] = {
    user:user
  }
  this.emit('create', {session_id:session_id, user:user});
  var sessions = {};
  for(var s in this.sessions){
    if(this.sessions.hasOwnProperty(s)){
      sessions[s] = {
        user:this.sessions[s].user
      }
    }
  }
  callback(session_id,sessions);
  return this;
}

Session.prototype.destroy = function(session_id) {
  var session = this.sessions[session_id];
  delete this.sessions[session_id];
  this.emit('destroy', {session_id:session_id, user:session.user});

  return this;
}

Session.prototype.addConnection = function(connection, session_id){
  this.sessions[session_id]['connection'] = connection;
}

Session.prototype.removeConnection = function(connection){
  for(var sid in this.sessions){
    if(this.sessions.hasOwnProperty(sid)){
      var c = this.sessions[sid];
      if(c.connection === connection){
        this.destroy(sid);
        break;
      }
    }
  }
}

Session.prototype.broadcastToConnections = function(message){
  var sender_session = this.sessions[message.session_id];
  for(var sid in this.sessions){
    if(this.sessions.hasOwnProperty(sid)){
      var c = this.sessions[sid];
      c.connection.sendUTF(JSON.stringify({message:message.message, user: sender_session.user}));
    }
  }
}

Session.prototype.createSessionID = function() {
  var length = 16;
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
  
  if (!length) {
    length = Math.floor(Math.random() * chars.length);
  }
  
  var str = [];
  for (var i = 0; i < length; i++) {
    str.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  var uid = str.join('');
  return this.sessions.hasOwnProperty(uid) ? this.createSessionID() : uid;
}
