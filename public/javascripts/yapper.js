var Yapper = {
  /**
   * Start Yapper
   */
  start:function(){
    this.bindDOM();
    this.bindEvents();
  },
  /**
   * Map DOM elements to internal object
   */
  bindDOM:function(){
    this.dom = {
      login_form:document.id('chat_login_form'),
      sections:{
        login:document.id('login'),
        chat:document.id('chat')
      },
      chat_users:document.id('chat_users')
    }
  },
  /**
   * Bind DOM events to mapped DOM elements
   */
  bindEvents:function(){
    this.dom.login_form.set('send',{
      onSuccess:this.onLogin.bind(this)
    }).addEvent('submit',function(e){
      e.preventDefault();
      this.dom.login_form.send();
    }.bind(this));
  },
  /**
   * Handle successful login to Yapper
   */
  onLogin:function(response){
    var data = JSON.parse(response);
    for(var sid in data.session_data){
      if(data.session_data.hasOwnProperty(sid)){
        var s = data.session_data[sid];
        var el = new Element('p',{
          'class':(sid === data.session_id ? 'me' : ''),
          'id':sid
        }).set('html',s.user);
        this.dom.chat_users.adopt(el);
      }
    }
    WS.connect(data.session_id);
    SSE.connect();
  }
}

/**
 * Server-Side Events object - manages chat users add / remove
 */
var SSE = {
  /**
   * Connect to chat users update service
   */
  connect:function(){
    var source = new EventSource('http://localhost:3000/connected_users');
    source.addEventListener('open', function(e) {
    }.bind(this), false);

    source.addEventListener('close', function(e) {
    }, false);

    source.addEventListener('error', function(e) {
      if (e.eventPhase == EventSource.CLOSED) {
      // Connection was closed.
      }
    }, false);
    
    source.addEventListener('added', function(e) {
    }.bind(this), false);
    
    source.addEventListener('removed', function(e) {
    }.bind(this), false);
  }
}

/**
 * WebSockets manager - sends chat messages to all yappers
 */
var WS = {
  /**
   * Connects to server-side WS chat service
   * @param {String} session_id - current user's session_id on chat server
   */
  connect:function(session_id){
    var send_message = document.id('send_message');
    var chat_message = document.id('chat_message');
    var chat_messages = document.id('chat_messages');
    
    var conn = new (window['WebSocket'] || window['MozWebSocket'])("ws://localhost:3000",'yapper-chat-service');
    conn.onmessage = function(evt) {
      new Element('p').set('text',evt.data).inject(chat_messages,'top');
      chat_message.value = '';
    };
    conn.onopen = function () {
      send_message.addEvent('click',function(){
        conn.send(chat_message.value);
      });
      conn.send(JSON.stringify({session_id:session_id})); //let server know we're connected to a chat session
    };
  }
}
