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
    this.session_id = data.session_id;
    for(var sid in data.session_data){
      if(data.session_data.hasOwnProperty(sid)){
        var s = data.session_data[sid];
        s.session_id = sid;
        this.addUserToUserList(s);
      }
    }
    this.connectToChatService(this.session_id);
    this.subscribeToChatUsersUpdate();
  },
  /**
   * Connects to WS chat service and initiates chat message sending on page
   * @param {String} session_id - current user's session ID
   */
  connectToChatService:function(session_id){
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
  },
  /**
   * Subscribe to chat users add / remove SSE service
   */
  subscribeToChatUsersUpdate:function(){
    var source = new EventSource('http://localhost:3000/connected_users');
    
    source.addEventListener('open', function(e) {
      console.log('Chat Users Update Service Ready');
    }.bind(this), false);

    source.addEventListener('close', function(e) {
      console.log('Chat Users Update Service Closed');
    }, false);
    
    source.addEventListener('added', this.addChatUser.bind(this), false);
    source.addEventListener('removed', this.removeChatUser.bind(this), false);
  },
  /**
   * Callback for chat user added server-side event
   * Adds user to chat users list
   * @param {ServerSideEvent} e - chat user add event
   */
  addChatUser:function(e){
    var data = JSON.parse(e.data);
    this.addUserToUserList(data);
  },
  /**
   * Callback for chat user removed server-side event
   * Removes user from chat users list
   * @param {ServerSideEvent} e - chat user remove event
   */
  removeChatUser:function(e){
    var data = JSON.parse(e.data);
    var p = document.id(data.session_id);
    p.dispose();
  },
  /**
   * Adds a user to the DOM chat users list
   * @param {Object} data - user data (name and session id)
   */
  addUserToUserList:function(data){
    var el = new Element('p',{
      'class':(this.session_id === data.session_id ? 'me' : ''),
      'id':data.session_id
    }).set('html',data.user);
    this.dom.chat_users.adopt(el);
  }
}
