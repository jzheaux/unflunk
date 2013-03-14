// multiple instances
function Room(id, token, messages, worksheets) {
    this.id = id;
    this.token = token;

    this.worksheetIdList = worksheets;
    this.worksheetList = {};
    this.chatMessageList = [];
    this.geomMessageList = [];
    this.messageList = messages;
    this.messageMax = 200;
    this.lastMessage = '';
    this.userList = [];
    this.messageListObj = null;
    this.pingInterval = 180000;
    this.userCheckInterval = 600000;

    this.addWorksheet = function(worksheet) {
        this.worksheetList[worksheet.id] = worksheet;
    };

    this.newWorksheet = function(worksheetId, show) {
        console.debug("newWorksheet()");
        var room = this;
        var worksheetTabs = room.getWidget('worksheets');
        var worksheetTab = new dijit.layout.ContentPane({
            id: worksheetId,
            title: worksheetId,
            href: "/room/"+room.id+"/worksheet/"+worksheetId,
            onDownloadEnd: function() {
                var worksheet = new Worksheet(worksheetId, room);
                worksheet.init();
                worksheet.initGfx();
                room.addWorksheet(worksheet);

                worksheetTabs.resize();
            },
            selected: true,
            closable: true
        });
        worksheetTabs.addChild(worksheetTab);
        if(show) {
            worksheetTabs.selectChild(worksheetTab);
        }
    };
}
// --------------- Entity methods -------------------
Room.prototype = {
    "getNode": function(clazz) {
        return dojo.query("."+clazz, this.id)[0];
    },
    "getWidget": function(clazz) {
        return dijit.getEnclosingWidget(this.getNode(clazz));
    },
    "getDialogWidget": function(clazz) {
        return dijit.getEnclosingWidget(dojo.query('.'+clazz+'.'+this.id)[0]);
    }
};
Room.prototype.init = function(){
    var room = this;
    // private methods
    var sendEmail = function() {
        console.debug('sendEmail()');
        dojo.xhrPost({
            url: '/wbmail',
            content: {
                wbId: room.id,
                email: room.getWidget("email").getValue()
            },
            load: function(resp){
                if(resp.error) {
                    console.info("error on email server",resp.error);
                }
            },
            error: function(e){
                console.info("post error email server",e);
            },
            handleAs: "json",
            preventCache: true
        });
    };
    var createWorksheet = function() {
        console.debug('newWorksheet()');
        dojo.xhrPost({
            url: "/room/"+room.id+"/worksheet/new",
            load: function(resp){
                if(resp.error) {
                    console.info("error on new worksheet",resp.error);
                }
                room.newWorksheet(resp.worksheetId, true);
            },
            error: function(e){
                console.info("post error new worksheet server",e);
            },
            handleAs: "json",
            preventCache: true
        });
    };
    var call = function(){
        try{
            var call = new Call(room.id);
            call.new();
        }catch(e) {
            console.error(e);
        }
    };
    // method body
    dojo.connect(room.getWidget('callBtn'),'onClick',function(){
        call();
    });
    dojo.connect(room.getWidget('sendMailButton'),'onClick',sendEmail);

    dojo.connect(room.getWidget('newWorksheetButton'),'onClick', createWorksheet);

    if(room.worksheetIdList.length > 0) {
        dojo.forEach(room.worksheetIdList, function(worksheetId) {
            room.newWorksheet(worksheetId, false);
        });
    } else {
        createWorksheet();
    }

    dojo.connect(dijit.byId(room.id),'onClose', function() {
        workspace.removeRoom(room.id);
    });
};
Room.prototype.drawFromJSON = function(worksheetId, geom) {
    if(this.worksheetList[worksheetId]) {
        this.worksheetList[worksheetId].drawFromJSON(geom, this.worksheetList[worksheetId].drawing);
    } else {
        this.newWorksheet(worksheetId);
    }
};
Room.prototype.sendMessage = function(message){
    var room = this;
    var clearChatUI = function(){
        try{
            //room.getNode('chatText').setAttribute('disabled',false);
            room.getWidget('chatText').setValue('');
            //room.getNode('chatBtn').setAttribute('disabled',false);
            room.getNode('chatWaitMessage').innerHTML = '';
        }catch(e){
            console.error(e);
        }
    };
    dojo.xhrPost({
        url: "/room/"+room.id+"/message",
        postData: dojo.toJson(message),
        headers: { "Content-Type": "application/json"},
        load: function(resp){
            console.log("post response",resp);
            if(resp.message){
                room.messageList.push(resp.message);
            }
            clearChatUI();
        },
        error: function(e){
            console.info("post error",e);
            clearChatUI();
        },
        handleAs: "json",
        preventCache: true
    });
};
Room.prototype.pingServer = function() {
    console.debug('pingServer()');
    var room = this;
    dojo.xhrGet({
        url: "/room/"+room.id+"/ping", //'/wbping',
        load: function(resp){
            if(resp.error) {
                console.info("error pinging server",resp.error);
            }
            setTimeout(function(){
                room.pingServer();
            }, room.pingInterval);
       },
       error: function(e){
            console.info("post error on pinging server",e);
            setTimeout(room.pingServer, room.pingInterval);
       },
       handleAs: "json",
       preventCache: true
    });
};
Room.prototype.getUserList = function() {
    console.debug('getUserList()');
    var room = this;
    dojo.xhrGet({
        url: "/room/"+room.id+"/users", //'/wbgetUsers',
        load: function(resp){
            if(resp.error) {
                console.info("error getting users",resp.error);
            }
            room.populateUserList(resp.userList);
            setTimeout(function() {
                room.getUserList();
            },room.userCheckInterval);
       },
       error: function(e){
            console.info("post error on gettingUsers",e);
            setTimeout(function() {
                room.getUserList();
            },room.userCheckInterval);
       },
       handleAs: "json",
       preventCache: true
    });
};
Room.prototype.populateUserList = function(userList){
    try{
        var output = '';
        dojo.forEach(userList,function(user){
            output += ('<span class=\"userListItem' + user + '\" style=\"background-color: #FFFFFF;\">' + user + '</span>');
            output += ('<br>');
        });
        this.getNode("userListDiv").innerHTML = output;
    }catch(e){
        console.info("error filling user list div",e);
    }
};
Room.prototype.openChannel = function() {
    var room = this;
    // private methods
    var onOpened = function() {
        //whiteboard.sendMessage({chatMessage:'I\'m here!'});
        dojo.connect(room.getWidget('chatBtn'),'onClick',sendChatMessage);

        //display any saved messages
        dojo.forEach(room.messageList,function(message){
            if(message.chatMessage){
                printChatMessage(message);
            }
        });
        room.pingServer();
        room.getUserList();
    };
    var onMessage = function(message) {
        console.debug("onMessage", message);

        var obj = dojo.fromJson(message.data);
        console.log(obj);
        if(obj.chatMessage){
            printChatMessage(obj);
        }
        if(obj.geometry && obj.geometry.shapeType){
            obj.geometry.fromUser = obj.fromUser;
            if(obj.fromUser !== userName){
                room.drawFromJSON(obj.worksheetId, obj.geometry);
            }
        }
        if(obj.chatMessage || obj.geometry) {
            room.messageList.push(obj);
        }
        if(obj.userList && (obj.userList.length > 0)){
            room.populateUserList(obj.userList);
        }
        if(obj.fromUser){
            //animateUserItem(obj.fromUser);
        }
    };
    var printChatMessage = function(message){
        room.chatMessageList.push('<pre class=\"chatMessage\"><span class=\"chatFrom\">' + message.fromUser + '</span>: ' + message.chatMessage + '</pre>');
        if(room.chatMessageList.length > room.messageMax){
            room.chatMessageList.shift();
        }
        var messageListStr = '';
        for(var i=0; i < room.chatMessageList.length; i++){
            var text = room.chatMessageList[i].split('###')[0];

            messageListStr += text;

            var roomKey = room.chatMessageList[i].split('###')[1];
            // little hack if roomKey exists
            if(roomKey) {
                messageListStr += '</pre><br>';
            }
            // set answer action
            var sender = text.match('<span.*>(.*)</span>')[1];
            var answerBtn = room.getNode('answerBtn'+userName);
            if(roomKey && answerBtn) {
                if (sender.toLowerCase() !== userName.toLowerCase()) {
                    answerBtn.setAttribute('style','color: red;');
                    answerBtn.setAttribute('onclick','answer("'+roomKey.replace('</pre><br>', '')+'")');
                } else {
                    // TODO: mark red color user call button
                }
            }
            console.debug('from: '+sender+', to: '+userName);
            console.debug('text: '+text+', roomKey: '+roomKey);
        }
        var outputWidget = room.getNode('output');
        outputWidget.innerHTML= messageListStr;
        outputWidget.scrollTop = outputWidget.scrollHeight;
    };
    var  sendChatMessage = function(){
        var cwm = room.getNode('chatWaitMessage');
        var ct = room.getWidget('chatText');
        var cb = room.getNode('chatBtn');
        var msg = dojo.trim('' + ct.getValue());
        if(msg === '')
        {
            cwm.innerHTML = 'Cat got your tongue?';
        }else if(msg === room.lastMessage){
            cwm.innerHTML = 'That\'s what you said last time.';
        }else{
            //ct.setAttribute('disabled',true);
            //cb.setAttribute('disabled',true);
            room.lastMessage = msg;
            room.getNode('chatWaitMessage').innerHTML = 'sending...';
            room.sendMessage({chatMessage:msg});
        }
    };
    var animateUserItem = function(user){
        try{
            var userNode = this.getNode("userListItem" + user);
            if(userNode){
                dojo.animateProperty({
                    node: userNode,
                    duration: 750,
                    properties: {
                        backgroundColor: {
                            start: "red",
                            end: "white"
                        },
                        color: {
                            start: "white",
                            end: "black"
                        }
                    }
                }).play();
            }
        }catch(e) {
            console.info("couldn\'t animate " + user, e);
        }
    };
    // method body
    var channel = new goog.appengine.Channel(room.token);
    var handler = {
        'onopen': onOpened,
        'onmessage': onMessage,
        'onerror': function(e) {
            console.log("channel error",e);
        },
        'onclose': function(c) {
            console.log("channel close",c);
        }
    };
    var socket = channel.open(handler);
    console.log(socket);
    socket.onopen = onOpened;
    socket.onmessage = onMessage;
};