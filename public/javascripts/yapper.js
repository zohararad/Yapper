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
      chat:{
        send:document.id('send_message'),
        message:document.id('chat_message'),
        messages:document.id('chat_messages'),
        users:document.id('chat_users')
      }
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
    this.dom.sections.login.addClass('inactive');
    this.dom.sections.chat.addClass('active').removeClass('inactive');
    this.connectToChatService(this.session_id);
    this.subscribeToChatUsersUpdate();
  },
  /**
   * Connects to WS chat service and initiates chat message sending on page
   */
  connectToChatService:function(){
    this.ws_conn = new (window['WebSocket'] || window['MozWebSocket'])("ws://localhost:3000",'yapper-chat-service');
    this.ws_conn.onmessage = this.addChatMessage.bind(this);
    this.ws_conn.onopen = this.enableChat.bind(this);
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
   * Enable chat on page. Add send message events and send message to chat server that chat session has started
   */
  enableChat:function(){
    this.dom.chat.send.addEvent('click',this.sendChatMessage.bind(this));
    this.dom.chat.message.addEvent('keydown',this.sendChatMessage.bind(this));
    this.ws_conn.send(JSON.stringify({action:'start_session',session_id:this.session_id})); //let server know we're connected to a chat session
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
    this.dom.chat.users.adopt(el);
  },
  /**
   * Add a received chat message to chat messages window
   * @param {WebSocketEvent} e - WS message event
   */
  addChatMessage:function(e){
    var data = JSON.parse(e.data);
    new Element('p',{'class':'message'}).set('html','<strong>'+data.user+'</strong>:&nbsp;<span>'+data.message+'</span>').inject(this.dom.chat.messages);
    this.dom.chat.message.value = '';
  },
  /**
   * Sends a chat message to chat server
   * @param {DOMEvent} e - send message DOM event
   */
  sendChatMessage:function(e){
    if((e.type === 'keydown' && e.key === 'enter' && !e.shift) || e.type === 'click'){
      var msg = {action:'send_message', session_id:this.session_id, message: this.dom.chat.message.value};
      this.ws_conn.send(JSON.stringify(msg));
    }
  }
}
