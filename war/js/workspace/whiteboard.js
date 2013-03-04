//dojo.provide('azp.Whiteboard');

dojo.require('dijit.form.ValidationTextBox');
dojo.require('dijit.form.Button');
dojo.require('dijit.Dialog');
dojo.require('dijit.layout.BorderContainer');
dojo.require('dijit.layout.ContentPane');
dojo.require("dojox.gfx");
dojo.require("dojo.fx");
dojo.require("dojox.gfx.move");
dojo.require("dojo.NodeList-fx");
//dojo.require("dijit.ColorPalette");
dojo.require("dojox.widget.ColorPicker");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.RadioButton");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.Slider");


var tools = [{name: 'line', showLineColor: true, showLineThickness: true}
            ,{name: 'pen', showLineColor: true, showLineThickness: true}
            ,{name: 'rect', showLineColor: true, showLineThickness: true}
            ,{name: 'ellipse', showLineColor: true, showLineThickness: true}
            ,{name: 'filledRect', showFillColor: true, showLineColor: true, showLineThickness: true}
            ,{name: 'filledEllipse', showFillColor: true, showLineColor: true, showLineThickness: true}
            ,{name: 'text', showLineColor: true, showFontSize: true}
            ,{name: 'delete'}
            ,{name: 'move'}
            ,{name: 'moveUp'}
            ,{name: 'moveDown'}
            ];

function Workspace(workspaceId) {
    this.workspaceId = workspaceId;

    this.roomCount = 0;
    this.roomList = [];

    this.addRoom = function(room) {
        this.roomList.push(room);
        this.roomCount = this.roomCount+1;
    };
}

// Whiteboard Entity
function Whiteboard(wbId, token, messages) {
    this.width = 700;
    this.height = 400;
    this.container = null;
    this.drawing = null;
    this.overlayContainer = null;
    this.overlayDrawing = null;
    this.lineColor = "#000000";
    this.fillColor = "#FFFFFF";
    this.lineStroke = 3;
    this.fontSize = 12;
    this.pingInterval = 180000;
    this.userCheckInterval = 600000;
    this.tool = 'pen';
    this.points = [];
    this.mouseDown = false;

    this.chatMessageList = [];
    this.geomMessageList = [];
    this.messageList = messages;
    this.messageMax = 200;
    this.lastMessage = '';
    this.userList = [];
    this.messageListObj = null;
//    <c:if test="${messageMapJSON != null}">
//    messageListObj = ${messageMapJSON};
//    if(messageListObj.messages && (messageListObj.messages.length > 0)){
//        messageList = messageListObj.messages;
//        }
//    </c:if>

    this.token = token;
    this.wbId = wbId;

    this.initCommon();
}

// --------------- Entity methods -------------------
Whiteboard.prototype.initCommon = function() {
    this.getNode = function(clazz) {
        return dojo.query("."+clazz, this.wbId)[0];
    };
    this.getWidget = function(clazz) {
        return dijit.getEnclosingWidget(this.getNode(clazz));
    };
    this.drawFromJSON = function(geom,drawing) {
        if(geom && geom.shapeType){
            var shape = false;
            var line = false;
            var stroke = {color: geom.lineColor, width: geom.lineStroke};
            if(geom.shapeType === 'rect'){
                shape = drawing.createRect({x: geom.xPts[0], y: geom.yPts[0], width: (geom.xPts[1] - geom.xPts[0]), height: (geom.yPts[1] - geom.yPts[0]) });
            }
            else if(geom.shapeType === 'image'){
                //var img = new Image();
                //img.src = geom.text;
                var imgData = geom.dataStr;
                //console.log('drawImage',imgData);
                if(imgData){
                    shape =  drawing.createImage({src:imgData,x: geom.xPts[0], y: geom.yPts[0], width: (geom.xPts[1] - geom.xPts[0]), height: (geom.yPts[1] - geom.yPts[0]) });
                }
            }
            else if(geom.shapeType === 'line'){
                shape = drawing.createLine({x1: geom.xPts[0], y1: geom.yPts[0], x2: geom.xPts[1], y2: geom.yPts[1]});
                stroke.cap = 'round';
            }
            else if(geom.shapeType === 'text'){
                shape = drawing.createText({ x:geom.xPts[0], y:geom.yPts[0] + geom.lineStroke, text:geom.text});
                shape.setFont({ size:(geom.lineStroke + "pt"), weight:"normal", family:"Arial" });
                shape.setFill(geom.lineColor);
                var width = shape.getTextWidth(geom.text);
                shape.wbbb = {
                    x1: geom.xPts[0],
                    y1: geom.yPts[0],
                    x2: (geom.xPts[0] + width),
                    y2: geom.yPts[0] + geom.lineStroke
                };
            }
            else if(geom.shapeType === 'ellipse'){
                shape = drawing.createEllipse({cx: ((geom.xPts[1] - geom.xPts[0])/2) + geom.xPts[0],
                    cy: ((geom.yPts[1] - geom.yPts[0])/2) + geom.yPts[0],
                    rx: (geom.xPts[1] - geom.xPts[0])/2,
                    ry: (geom.yPts[1] - geom.yPts[0])/2 });
            }
            else if(geom.shapeType === 'pen'){
                if(geom.xPts){
                    if(geom.xPts.length > 1){
                        //console.log("num pen points drawing:",geom.xPts.length);
                        shape = drawing.createGroup();
                        for(var i = 0; i < (geom.xPts.length - 1); i++){
                            var lineShape = drawing.createLine({x1: geom.xPts[i], y1: geom.yPts[i], x2: geom.xPts[i + 1], y2: geom.yPts[i + 1]});
                            stroke.cap = 'round';
                            lineShape.setStroke(stroke);

                            shape.add(lineShape);
                        }
                    }
                }
            }else if(geom.shapeType === 'clear'){
                drawing.clear();
            }else if(geom.shapeType === 'delete'){
                removeShape(geom,drawing);
            }else if(geom.shapeType === 'move'){
                moveShape(geom,drawing);
            }else if(geom.shapeType === 'moveUp'){
                moveShapeUp(geom,drawing);
            }else if(geom.shapeType === 'moveDown'){
                moveShapeDown(geom,drawing);
            }
            else if(geom.shapeType === 'select'){
                shape = drawing.createRect({x: geom.xPts[0] - 3, y: geom.yPts[0] - 3, width: (geom.xPts[1] - geom.xPts[0] + 6), height: (geom.yPts[1] - geom.yPts[0] + 6) });
                shape.setStroke({color: new dojo.Color([0,0,255,0.75]), width: 2});
                shape.setFill(new dojo.Color([0,0,255,0.25]));
            }else if(geom.shapeType === 'deleteOverlay'){
                shape = drawing.createRect({x: geom.xPts[0] - 3, y: geom.yPts[0] - 3, width: (geom.xPts[1] - geom.xPts[0] + 6), height: (geom.yPts[1] - geom.yPts[0] + 6) });
                shape.setStroke({color: new dojo.Color([255,0,0,0.75]), width: 2});
                shape.setFill(new dojo.Color([255,0,0,0.25]));

                line = drawing.createLine({x1: geom.xPts[0] - 3, y1: geom.yPts[0] - 3, x2: geom.xPts[1] + 3, y2: geom.yPts[1] + 3});
                line.setStroke({color: "#FF0000", width: 2});

                line = drawing.createLine({x1: geom.xPts[1] + 3, y1: geom.yPts[0] - 3, x2: geom.xPts[0] - 3, y2: geom.yPts[1] + 3});
                line.setStroke({color: "#FF0000", width: 2});
            }else if(geom.shapeType === 'moveOverlay'){
                shape = drawing.createRect({x: geom.xPts[0] - 3, y: geom.yPts[0] - 3, width: (geom.xPts[1] - geom.xPts[0] + 6), height: (geom.yPts[1] - geom.yPts[0] + 6) });
                shape.setStroke({color: new dojo.Color([0,0,255,0.75]), width: 2});
                shape.setFill(new dojo.Color([0,0,255,0.25]));
            }else if(geom.shapeType === 'moveUpOverlay'){
                shape = drawing.createRect({x: geom.xPts[0] - 3, y: geom.yPts[0] - 3, width: (geom.xPts[1] - geom.xPts[0] + 6), height: (geom.yPts[1] - geom.yPts[0] + 6) });
                //shape.setStroke({color: new dojo.Color([0,0,255,0.75]), width: 2});
                shape.setFill(new dojo.Color([0,0,255,0.15]));

                line = drawing.createLine({x1: geom.xPts[0] - 5, y1: geom.yPts[0] + ((geom.yPts[1] - geom.yPts[0]) / 2), x2: geom.xPts[1] + 3, y2: geom.yPts[0] + ((geom.yPts[1] - geom.yPts[0]) / 2)});
                line.setStroke({color: "#0000FF", width: 2});

                line = drawing.createLine({x1: geom.xPts[0] - 5, y1: geom.yPts[0] + ((geom.yPts[1] - geom.yPts[0]) / 2), x2: geom.xPts[0] + ((geom.xPts[1] - geom.xPts[0]) / 2), y2: geom.yPts[0] -5});
                line.setStroke({color: "#0000FF", width: 2});

                line = drawing.createLine({x1: geom.xPts[0] + ((geom.xPts[1] - geom.xPts[0]) / 2), y1: geom.yPts[0] -5, x2: geom.xPts[1] + 5, y2: geom.yPts[0] + ((geom.yPts[1] - geom.yPts[0]) / 2)});
                line.setStroke({color: "#0000FF", width: 2});
            }else if(geom.shapeType === 'moveDownOverlay'){
                shape = drawing.createRect({x: geom.xPts[0] - 3, y: geom.yPts[0] - 3, width: (geom.xPts[1] - geom.xPts[0] + 6), height: (geom.yPts[1] - geom.yPts[0] + 6) });
                //shape.setStroke({color: new dojo.Color([0,0,255,0.75]), width: 2});
                shape.setFill(new dojo.Color([0,0,255,0.15]));

                line = drawing.createLine({x1: geom.xPts[0] - 5, y1: geom.yPts[0] + ((geom.yPts[1] - geom.yPts[0]) / 2), x2: geom.xPts[1] + 3, y2: geom.yPts[0] + ((geom.yPts[1] - geom.yPts[0]) / 2)});
                line.setStroke({color: "#0000FF", width: 2});

                line = drawing.createLine({x1: geom.xPts[0] - 5, y1: geom.yPts[0] + ((geom.yPts[1] - geom.yPts[0]) / 2), x2: geom.xPts[0] + ((geom.xPts[1] - geom.xPts[0]) / 2), y2: geom.yPts[1] + 5});
                line.setStroke({color: "#0000FF", width: 2});

                line = drawing.createLine({x1: geom.xPts[0] + ((geom.xPts[1] - geom.xPts[0]) / 2), y1: geom.yPts[1] + 5, x2: geom.xPts[1] + 5, y2: geom.yPts[0] + ((geom.yPts[1] - geom.yPts[0]) / 2)});
                line.setStroke({color: "#0000FF", width: 2});
            } else {
                if(shape){
                    shape.cRand = geom.cRand;
                    shape.cTime = geom.cTime;
                    if(!shape.wbbb){
                        shape.wbbb = getBoundingBox(geom);
                    }
                    shape.fromUser = geom.fromUser;

                    if(geom.filled && shape.setFill){
                        shape.setFill(geom.fillColor);
                    }
                    if(shape.setStroke && (geom.shapeType !== 'text')){
                        shape.setStroke(stroke);
                    }
                }
            }
            return shape;
        }
    };
};

Whiteboard.prototype.sendMessage = function(message){
    var whiteboard = this;
    var clearChatUI = function(){
        try{
            whiteboard.getNode('chatText').setAttribute('disabled',false);
            whiteboard.getWidget('chatText').setValue('');
            whiteboard.getNode('chatBtn').setAttribute('disabled',false);
            whiteboard.getNode('chatWaitMessage').innerHTML = '';
        }catch(e){
            console.error(e);
        }
    };

    dojo.xhrPost({
        url: '/wbpost',
        content: {
            wbId: this.wbId,
            data: dojo.toJson(message)
        },
        load: function(resp){
            console.log("post response",resp);
            if(resp.message){
                whiteboard.messageList.push(resp.message);
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

Whiteboard.prototype.pingServer = function() {
    var whiteboard = this;
    dojo.xhrPost({
        url: '/wbping',
        content: {
           wbId: whiteboard.wbId
        },
        load: function(resp){
            if(resp.error) {
                console.info("error pinging server",resp.error);
            }
            setTimeout(whiteboard.pingServer, whiteboard.pingInterval);
       },
       error: function(e){
            console.info("post error on pinging server",e);
            setTimeout(whiteboard.pingServer, whiteboard.pingInterval);
       },
       handleAs: "json",
       preventCache: true
    });
};

Whiteboard.prototype.getUserList = function() {
    console.debug('getUserList()');
    var whiteboard = this;
    dojo.xhrPost({
        url: '/wbgetUsers',
        content: {
           wbId: whiteboard.wbId
        },
        load: function(resp){
            if(resp.error) {
                console.info("error getting users",resp.error);
            }
            whiteboard.populateUserList(resp.userList);
            setTimeout(whiteboard.getUserList, whiteboard.userCheckInterval);
       },
       error: function(e){
            console.info("post error on gettingUsers",e);
            setTimeout(whiteboard.getUserList, whiteboard.userCheckInterval);
       },
       handleAs: "json",
       preventCache: true
    });
};

Whiteboard.prototype.populateUserList = function(userList){
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

Whiteboard.prototype.openChannel = function() {
    var whiteboard = this;
    var onOpened = function() {
        whiteboard.initGfx();
        //whiteboard.sendMessage({chatMessage:'I\'m here!'});
        dojo.connect(whiteboard.getWidget('chatBtn'),'onClick',sendChatMessage);

        //display any saved messages
        dojo.forEach(whiteboard.messageList,function(message){
            if(message.chatMessage){
                printChatMessage(message);
            }
        });
        whiteboard.pingServer();
        whiteboard.getUserList();
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
                whiteboard.drawFromJSON(obj.geometry,whiteboard.drawing);
            }
        }
        if(obj.chatMessage || obj.geometry) {
            whiteboard.messageList.push(obj);
        }
        if(obj.userList && (obj.userList.length > 0)){
            whiteboard.populateUserList(obj.userList);
        }
        if(obj.fromUser){
            //animateUserItem(obj.fromUser);
        }
    };
    var printChatMessage = function(message){

        whiteboard.chatMessageList.push('<pre class=\"chatMessage\"><span class=\"chatFrom\">' + message.fromUser + '</span>: ' + message.chatMessage + '</pre><br>');
        if(whiteboard.chatMessageList.length > whiteboard.messageMax){
            whiteboard.chatMessageList.shift();
        }

        var messageListStr = '';
        for(var i=0; i < whiteboard.chatMessageList.length; i++){
            var text = whiteboard.chatMessageList[i].split('###')[0];

            messageListStr += text;

            var roomKey = whiteboard.chatMessageList[i].split('###')[1];
            // little hack if roomKey exists
            if(roomKey) {
                messageListStr += '</pre><br>';
            }
            // set answer action
            var sender = text.match('<span.*>(.*)</span>')[1];
            var answerBtn = whiteboard.getNode('answerBtn'+userName);
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
        var outputWidget = whiteboard.getNode('output');
        outputWidget.innerHTML= messageListStr;
        outputWidget.scrollTop = outputWidget.scrollHeight;
    };
    var  sendChatMessage = function(){
        var cwm = whiteboard.getNode('chatWaitMessage');
        var ct = whiteboard.getWidget('chatText');
        var cb = whiteboard.getNode('chatBtn');
        var msg = dojo.trim('' + ct.getValue());
        if(msg === '')
        {
            cwm.innerHTML = 'Cat got your tongue?';
        }else if(msg === whiteboard.lastMessage){
            cwm.innerHTML = 'That\'s what you said last time.';
        }else{
            //ct.setAttribute('disabled',true);
            //cb.setAttribute('disabled',true);
            whiteboard.lastMessage = msg;
            whiteboard.getNode('chatWaitMessage').innerHTML = 'sending...';
            whiteboard.sendMessage({chatMessage:msg});
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

    var channel = new goog.appengine.Channel(whiteboard.token);
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

Whiteboard.prototype.initGfx = function(){
    var whiteboard = this;
    var getGfxMouse = function(evt){
        var coordsM = dojo.coords(whiteboard.container);
        return {x: Math.round(evt.clientX - coordsM.x), y: Math.round(evt.clientY - coordsM.y)};
    };
    var  doGfxMouseDown = function(evt) {
        var pt = getGfxMouse(evt);
        //console.dir(pt);
        if(pointInDrawing(pt)){
            whiteboard.mouseDownPt = pt;
            whiteboard.points = [pt];
            whiteboard.mouseDown = true;

            whiteboard.selectedShape = getHoveredShape(whiteboard.drawing,pt);
        }
    };
    var doGfxMouseMove = function(evt) {
        var pt = getGfxMouse(evt);
        var geom = false;
        var shape = false;

        if(whiteboard.mouseDown){
            if((whiteboard.tool === 'pen') && pointInDrawing(pt) ){
                if((whiteboard.points[whiteboard.points.length - 1].x !== pt.x) || (whiteboard.points[whiteboard.points.length - 1].y !== pt.y)){
                    whiteboard.points.push(pt);

                    if(whiteboard.points.length > 1){
                        //make sure its not the same point as last time
                        geom = createLineJSON(
                            {x1: whiteboard.points[whiteboard.points.length - 2].x,
                                y1: whiteboard.points[whiteboard.points.length - 2].y,
                                x2: whiteboard.points[whiteboard.points.length - 1].x,
                                y2: whiteboard.points[whiteboard.points.length - 1].y }
                        );
                        whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
                    }
                }
            }else{
                var bounds = {x1:whiteboard.mouseDownPt.x, y1:whiteboard.mouseDownPt.y, x2: pt.x, y2: pt.y};
                if(whiteboard.tool !== 'pen'){
                    whiteboard.overlayDrawing.clear();
                }
                if(whiteboard.tool === 'rect'){
                    geom  = createRectJSON(bounds,false);
                    whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
                }else if(whiteboard.tool === 'filledRect'){
                    geom  = createRectJSON(bounds,true);
                    whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
                }else if(whiteboard.tool === 'ellipse'){
                    geom  = createEllipseJSON(bounds,false);
                    whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
                }else if(whiteboard.tool === 'filledEllipse'){
                    geom  = createEllipseJSON(bounds,true);
                    whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
                }else if(whiteboard.tool === 'line'){
                    geom  = createLineJSON(bounds);
                    whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
                }else if(whiteboard.tool === 'move'){
                    if(whiteboard.selectedShape && whiteboard.mouseDownPt){
                        geom = createMoveOverlayJSON(whiteboard.selectedShape.wbbb);
                        whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
                        var offBB = createOffsetBB(whiteboard.selectedShape.wbbb,whiteboard.mouseDownPt,pt);
                        //console.dir(offBB);
                        var geom2 = createMoveOverlayJSON(offBB);

                        whiteboard.drawFromJSON(geom2,whiteboard.overlayDrawing);
                    }
                }
            }
        } else {
            if(whiteboard.tool === 'move'){
                whiteboard.overlayDrawing.clear();
                shape = getHoveredShape(whiteboard.drawing,pt);
                if(shape){
                    geom = createMoveOverlayJSON(shape.wbbb);
                    whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
                }
            }
        }
        //mouse up or down doesn't matter for the select and delete tools
        if(whiteboard.tool === 'delete'){
            whiteboard.overlayDrawing.clear();
            shape = getHoveredShape(whiteboard.drawing,pt);
            if(shape){
                geom = createDeleteOverlayJSON(shape.wbbb);
                whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
            }
        }else if(whiteboard.tool === 'moveUp'){
            whiteboard.overlayDrawing.clear();
            shape = getHoveredShape(whiteboard.drawing,pt);
            if(shape){
                geom = createMoveUpOverlayJSON(shape.wbbb);
                whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
            }
        }else if(whiteboard.tool === 'moveDown'){
            whiteboard.overlayDrawing.clear();
            shape = getHoveredShape(whiteboard.drawing,pt);
            if(shape){
                geom = createMoveDownOverlayJSON(shape.wbbb);
                whiteboard.drawFromJSON(geom,whiteboard.overlayDrawing);
            }
        }
    };
    var pointInDrawing = function(pt){
        if((pt.x > -2) && (pt.x < (whiteboard.width + 2)) && (pt.y > -2) && (pt.y < (whiteboard.height + 2))){
            return true;
        }else{
            return false;
        }
    };

    var doGfxMouseUp = function(evt) {
        var pt = getGfxMouse(evt);
        whiteboard.mouseDown = false;
        //console.dir(pt);

        //always clear the overlay
        whiteboard.overlayDrawing.clear();

        if(whiteboard.mouseDownPt){
            //make sure mouse was released inside of drawing area
            if(pointInDrawing(pt)){
                //console.dir(whiteboard.mouseDownPt);

                var bounds = {x1:whiteboard.mouseDownPt.x, y1:whiteboard.mouseDownPt.y, x2: pt.x, y2: pt.y};
                //whiteboard.mouseDownPt = null;

                var geom = null;
                var shape = false;
                if(whiteboard.tool === 'rect'){
                    geom  = createRectJSON(bounds,false);
                    whiteboard.drawFromJSON(geom,whiteboard.drawing);
                }else if(whiteboard.tool === 'filledRect'){
                    geom  = createRectJSON(bounds,true);
                    whiteboard.drawFromJSON(geom,whiteboard.drawing);
                }else if(whiteboard.tool === 'ellipse'){
                    geom  = createEllipseJSON(bounds,false);
                    whiteboard.drawFromJSON(geom,whiteboard.drawing);
                }else if(whiteboard.tool === 'filledEllipse'){
                    geom  = createEllipseJSON(bounds,true);
                    whiteboard.drawFromJSON(geom,whiteboard.drawing);
                }else if(whiteboard.tool === 'line'){
                    geom  = createLineJSON(bounds);
                    whiteboard.drawFromJSON(geom,whiteboard.drawing);
                }else if(whiteboard.tool === 'pen'){
                    geom = createPenJSON(whiteboard.points);
                    whiteboard.drawFromJSON(geom,whiteboard.drawing);
                    console.log("num pen points sending:",geom.xPts.length);
                }else if(whiteboard.tool === 'delete'){
                    shape = getHoveredShape(whiteboard.drawing,pt);
                    if(shape){
                        geom = createDeleteJSON(shape);
                        whiteboard.drawFromJSON(geom,whiteboard.drawing);
                    }
                }else if(whiteboard.tool === 'move'){
                    //console.log(whiteboard.selectedShape,whiteboard.mouseDownPt,bounds);
                    if(whiteboard.selectedShape && whiteboard.mouseDownPt)
                    {
                        var ptDelta = {x: (pt.x - whiteboard.mouseDownPt.x),y: (pt.y - whiteboard.mouseDownPt.y)};

                        geom = createMoveJSON(whiteboard.selectedShape, ptDelta);

                        whiteboard.drawFromJSON(geom,whiteboard.drawing);
                        //console.dir(geom);
                    }
                }else if(whiteboard.tool === 'moveUp'){
                    shape = getHoveredShape(whiteboard.drawing,pt);
                    if(shape){
                        geom = createMoveUpJSON(shape);
                        whiteboard.drawFromJSON(geom,whiteboard.drawing);
                    }
                }else if(whiteboard.tool === 'moveDown'){
                    shape = getHoveredShape(whiteboard.drawing,pt);
                    if(shape){
                        geom = createMoveDownJSON(shape);
                        whiteboard.drawFromJSON(geom,whiteboard.drawing);
                    }
                }else if(whiteboard.tool === 'text'){
                    whiteboard.textPoint = pt;
                    whiteboard.getNode('textDialog').show();
                    whiteboard.getNode('wbText').focus();
                }

                //whiteboard.points = [];
                if(geom){
                    whiteboard.sendMessage({geometry:geom});
                }
            }else{
                whiteboard.mouseDownPt = null;
                console.log("mouse released outside of drawing area");
            }
        }
        //clear everything
        whiteboard.mouseDownPt = null;
        whiteboard.selectedShape = null;
        whiteboard.points = [];
    };
    var addTimeRand = function(geom){
        geom.cTime = new Date().getTime();
        geom.cRand = Math.round(100000000000 * Math.random());
        geom.fromUser = userName;
        return geom;
    };
    var createRectJSON = function(bounds,filled){
        bounds = normalizeBounds(bounds);
        var geom = {
                xPts: [bounds.x1,bounds.x2],
                yPts: [bounds.y1,bounds.y2]
        };
        geom.shapeType = 'rect';
        geom.filled = filled;
        if(filled){
            geom.fillColor = whiteboard.fillColor;
        }
        geom.lineColor = whiteboard.lineColor;
        geom.lineStroke = whiteboard.lineStroke;

        return addTimeRand(geom);
    };
    var createImageJSON = function(bounds,textData){
        bounds = normalizeBounds(bounds);
        var geom = {
                xPts: [bounds.x1,bounds.x2],
                yPts: [bounds.y1,bounds.y2],
                shapeType: 'image'
        };
        geom.dataStr = textData;

        return addTimeRand(geom);
    };
    var createSelectJSON = function(bounds){
        bounds = normalizeBounds(bounds);
        var geom = {
                xPts: [bounds.x1,bounds.x2],
                yPts: [bounds.y1,bounds.y2]
        };
        geom.shapeType = 'select';
        return geom;
    };
    var createTextJSON = function(pt,text){
        var geom = {
                xPts: [pt.x],
                yPts: [pt.y]
        };
        geom.shapeType = 'text';
        geom.text = text;
        geom.lineStroke = whiteboard.fontSize;
        geom.lineColor = whiteboard.lineColor;

        return addTimeRand(geom);
    };
    var createDeleteOverlayJSON = function(bounds){
        bounds = normalizeBounds(bounds);
        var geom = {
                xPts: [bounds.x1,bounds.x2],
                yPts: [bounds.y1,bounds.y2]
        };
        geom.shapeType = 'deleteOverlay';
        return geom;
    };
    var createMoveOverlayJSON = function(bounds){
        bounds = normalizeBounds(bounds);
        var geom = {
                xPts: [bounds.x1,bounds.x2],
                yPts: [bounds.y1,bounds.y2]
        };
        geom.shapeType = 'moveOverlay';
        return geom;
    };
    var createMoveUpOverlayJSON = function(bounds){
        var geom = createMoveOverlayJSON(bounds);
        geom.shapeType = 'moveUpOverlay';
        return geom;
    };
    var createMoveDownOverlayJSON = function(bounds){
        var geom = createMoveOverlayJSON(bounds);
        geom.shapeType = 'moveDownOverlay';
        return geom;
    };
    var createMoveJSON = function(shape,ptDelta){
        var geom = {
                xPts: [ptDelta.x],
                yPts: [ptDelta.y]
        };
        geom.shapeType = 'move';
        geom.cTime = shape.cTime;
        geom.cRand = shape.cRand;
        geom.fromUser = shape.fromUser;
        return geom;
    };
    var createMoveUpJSON = function(shape,ptDelta){
        var geom = {};
        geom.shapeType = 'moveUp';
        geom.cTime = shape.cTime;
        geom.cRand = shape.cRand;
        geom.fromUser = shape.fromUser;
        return geom;
    };
    var createMoveDownJSON = function(shape,ptDelta){
        var geom = {};
        geom.shapeType = 'moveDown';
        geom.cTime = shape.cTime;
        geom.cRand = shape.cRand;
        geom.fromUser = shape.fromUser;
        return geom;
    };
    var createDeleteJSON = function(shape){
        var geom = {};
        geom.shapeType = 'delete';
        geom.cTime = shape.cTime;
        geom.cRand = shape.cRand;
        geom.fromUser = shape.fromUser;
        return geom;
    };
    var createEllipseJSON = function(bounds,filled){
        bounds = normalizeBounds(bounds);
        var geom = {
                xPts: [bounds.x1,bounds.x2],
                yPts: [bounds.y1,bounds.y2]
        };
        geom.shapeType = 'ellipse';
        geom.filled = filled;
        if(filled){
            geom.fillColor = whiteboard.fillColor;
        }
        geom.lineColor = whiteboard.lineColor;
        geom.lineStroke = whiteboard.lineStroke;

        return addTimeRand(geom);
    };
    var createLineJSON = function(bounds){
        var geom = {
                xPts: [bounds.x1,bounds.x2],
                yPts: [bounds.y1,bounds.y2]
        };
        geom.shapeType = 'line';
        geom.fillColor = whiteboard.fillColor;
        geom.lineColor = whiteboard.lineColor;
        geom.lineStroke = whiteboard.lineStroke;

        return addTimeRand(geom);
    };
    var createPenJSON = function(points){
          var xPts = [];
          var yPts = [];
          dojo.forEach(points, function(point){
             xPts.push(point.x);
             yPts.push(point.y);
          });
        var geom = {shapeType: 'pen',
                    fillColor: whiteboard.fillColor,
                    lineColor: whiteboard.lineColor,
                    lineStroke: whiteboard.lineStroke,
                    xPts: xPts,
                    yPts: yPts
                };

        return addTimeRand(geom);
    };
    var  createClearDrawingJSON = function(){
        var geom = {shapeType: 'clear'};
        return geom;
    };
    var createOffsetBB = function(origBB, pointInBB, newPt){
        //console.log('offset',origBB, pointInBB, newPt);

        var xDelta = Math.abs(pointInBB.x - origBB.x1);
        var yDelta = Math.abs(pointInBB.y - origBB.y1);

        //console.log('deltas',xDelta,yDelta);
        var bounds = {
            x1: (newPt.x - xDelta),
            y1: (newPt.y - yDelta)
        };

        bounds.x2 = bounds.x1 + (origBB.x2 - origBB.x1);
        bounds.y2 = bounds.y1 + (origBB.y2 - origBB.y1);

        return bounds;
    };
    var getBoundingBox = function(geom){
        if(geom.xPts && geom.yPts){
            var xs = geom.xPts;
            var ys = geom.yPts;
            var bb = {x1: 0, x2: -1, y1: 0, y2: -1 };

            if(xs.length > 1){
                bb.x1 = xs[0];
                bb.x2 = xs[1];
                dojo.forEach(xs, function(x){
                    if(x < bb.x1){
                        bb.x1 = x;
                    }
                    else if(x > bb.x2){
                        bb.x2 = x;
                    }
                });
            }
            if(ys.length > 1){
                bb.y1 = ys[0];
                bb.y2 = ys[1];
                dojo.forEach(ys, function(y){
                    if(y < bb.y1){
                        bb.y1 = y;
                    }
                    else if(y > bb.y2){
                        bb.y2 = y;
                    }
                });
            }
            return bb;
        } else {
            return null;
        }
    };
    var removeShape = function(geom, drawing){
        var shape = getShapeFromGeom(geom,drawing);
        if(shape){
            drawing.remove(shape);
        }
    };
    var moveShape = function(geom, drawing){
        var shape = getShapeFromGeom(geom,drawing);
        if(shape){
            shape.applyTransform({dx: geom.xPts[0], dy: geom.yPts[0]});
            if(shape.wbbb){
                shape.wbbb.x1 += geom.xPts[0];
                shape.wbbb.x2 += geom.xPts[0];
                shape.wbbb.y1 += geom.yPts[0];
                shape.wbbb.y2 += geom.yPts[0];
            }
        }
    };
    var moveShapeUp = function(geom, drawing){
        var shape = getShapeFromGeom(geom,drawing);
        if(shape){
            shape.moveToFront();
        }
    };
    var moveShapeDown = function(geom, drawing){
        var shape = getShapeFromGeom(geom,drawing);
        if(shape){
            shape.moveToBack();
        }
    };
    var getShapeFromGeom = function(geom, drawing){
        var retVal = null;
        dojo.every(drawing.children, function(shape){
            if((shape.cRand === geom.cRand) && (shape.cTime === geom.cTime)){
                retVal = shape;
                return false;
            }
            return true; // keep going until we find one that isn't
        });
        return retVal;
    };

    //first point should be upper left of rect
    var  normalizeBounds = function(bounds){
            if(bounds.x2 < bounds.x1){
                var tempX1 = bounds.x1;
                bounds.x1 = bounds.x2;
                bounds.x2 = tempX1;
            }
            if(bounds.y2 < bounds.y1){
                var tempY1 = bounds.y1;
                bounds.y1 = bounds.y2;
                bounds.y2 = tempY1;
            }
            return bounds;
    };
    var getHoveredShape = function(drawing, pt){
        try{
            var children = drawing.children;
            if(children){
                for(var i = children.length; i > 0; i--){
                    var child = children[i - 1];
                    if(ptInBox(pt,child.wbbb)){
                        return child;
                    }
                }
            }
        }catch(e){
            console.log('error finding shape',e);
        }
        return null;
    };
    var ptInBox = function(pt, box){
        if(pt && box){
            if((pt.x >= box.x1) && (pt.x <= box.x2) && (pt.y >= box.y1) && (pt.y <= box.y2)){
                return true;
            }else{
                return false;
            }
        }else{
            return false;
        }
    };

    whiteboard.container = whiteboard.getNode("whiteboardContainer");
    whiteboard.overlayContainer = whiteboard.getNode("whiteboardOverlayContainer");

    whiteboard.drawing = dojox.gfx.createSurface(whiteboard.container, whiteboard.width, whiteboard.height);
    whiteboard.overlayDrawing = dojox.gfx.createSurface(whiteboard.overlayContainer, whiteboard.width, whiteboard.height);

    //for playback
    whiteboard.movieContainer = dojo.byId("movieWhiteboardContainer");
    whiteboard.movieDrawing = dojox.gfx.createSurface(whiteboard.movieContainer, whiteboard.width, whiteboard.height);

    //draw any saved objects
    dojo.forEach(whiteboard.messageList, function(message){
        if(message.geometry){
            message.geometry.fromUser = message.fromUser;
            whiteboard.drawFromJSON(message.geometry, whiteboard.drawing);
        }
    });
    whiteboard.overlayContainer.style.width = whiteboard.width + 'px';
    whiteboard.overlayContainer.style.height = whiteboard.height + 'px';
    whiteboard.container.style.width = whiteboard.width + 'px';
    whiteboard.container.style.height = whiteboard.height + 'px';

    whiteboard.movieContainer.style.width = whiteboard.width + 'px';
    whiteboard.movieContainer.style.height = whiteboard.height + 'px';

    whiteboard.overlayContainer.style.position = 'absolute';
    whiteboard.overlayContainer.style.zIndex = 1;

    var c = dojo.coords(whiteboard.container);
    console.dir(c);
    dojo.style(whiteboard.overlayContainer,"top", (c.t + 'px'));
    dojo.style(whiteboard.overlayContainer,"left", (c.l + 'px'));

    dojo.connect(dojo.body(),'onmouseup',doGfxMouseUp); //mouse release can happen anywhere in the container
    dojo.connect(whiteboard.overlayContainer,'onmousedown',doGfxMouseDown);
    //dojo.connect(dojo.body(),'onmousemove',doGfxMouseMove);
    dojo.connect(whiteboard.overlayContainer,'onmousemove',doGfxMouseMove);
    console.log("topov",dojo.style(whiteboard.overlayContainer,"top"));

    if(Modernizr.draganddrop){
        console.log('supports drag and drop!');
        var dndc = new DNDFileController(whiteboard.getNode('whiteboardOverlayContainer'));
    }
};

Whiteboard.prototype.loadFunction = function(){
    var whiteboard = this;

    // private methods
    var chooseColor = function(type) {
        var cp = whiteboard.getNode(type + 'ColorPaletteWidget');
        //console.log(cp);
        dojo.style(dojo.byId(type + 'Swatch'),{backgroundColor: cp.value});
        whiteboard[type + 'Color'] = cp.value;
        dijit.popup.close(whiteboard.getNode(type + "ColorPaletteDialog"));
    };
    var cancelChooseColor = function(type) {
        dijit.popup.close(whiteboard.getNode(type + "ColorPaletteDialog"));
    };
    var exportImage = function(){
        try{                                      //dojo.query('canvas',whiteboard.getNode('movieDialog'))[0].toDataURL();
            dojo.byId("exportedImg").src = whiteboard.getWidget('canvas').toDataURL();
            whiteboard.getNode("imgDialog").show();

        }catch(e){
            console.info("canvas not supported",e);
        }
    };
    var exportMovieImage = function(){
        try{
            dojo.byId("exportedImg").src = dojo.query('canvas',whiteboard.getNode('movieDialog'))[0].toDataURL();
            whiteboard.getNode("imgDialog").show();
        }catch(e){
            console.info("canvas not supported",e);
        }
    };
    var sendEmail = function() {
        console.debug('sendEmail()');
        dojo.xhrPost({
            url: '/wbmail',
            content: {
                wbId: whiteboard.wbId,
                email: whiteboard.getWidget("email").getValue()
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
    var selectTool = function(toolName) {
        hide("lineColorDisplay");
        hide("fillColorDisplay");
        hide("lineStrokeSelect");
        hide("fontSizeSelect");

        var tool = null;
        dojo.forEach(tools,function(aTool){
            if(aTool.name === toolName){
                tool = aTool;
            }
            //dojo.style(this.byClass(aTool.name + 'ToolBtn').domNode,'border','0px');
            //dojo.addClass(dojo.style(this.byClass(aTool.name + 'ToolBtn').domNode, "selected");
            dojo.removeClass(whiteboard.getNode(aTool.name + 'ToolBtn'), "selected");
        });

        //dojo.style(this.byClass(tool.name + 'ToolBtn').domNode,'border','2px solid black');
        dojo.addClass(whiteboard.getNode(tool.name + 'ToolBtn'), "selected");
        whiteboard.tool = tool.name;

        if(tool.showLineColor){
            show("lineColorDisplay");
        }
        if(tool.showFillColor){
            show("fillColorDisplay");
        }
        if(tool.showLineThickness){
            show("lineStrokeSelect");
        }
        if(tool.showFontSize){
            show("fontSizeSelect");
        }
    };
    var showMovie = function(){
        try{
            whiteboard.getNode("movieDialog").show();

            if(whiteboard.messageList){
                whiteboard.geomMessageList = [];
                dojo.forEach(whiteboard.messageList,function(message){
                    if(message.geometry){
                        whiteboard.geomMessageList.push(message);
                    }
                });
            }
            var mSlider = whiteboard.getNode('movieSlider');
            mSlider.setAttribute('maximum',whiteboard.geomMessageList.length);
            mSlider.setAttribute('discreteValues',whiteboard.geomMessageList.length);

            mSlider.setValue(0);
        }catch(e){
            console.info("canvas not supported",e);
        }
    };
    var incrementMovie = function(){
        var indexEnd = Math.round(whiteboard.getNode('movieSlider').getValue());
        whiteboard.movieDrawing.clear();
        for(var i =0; i < indexEnd; i++){
            whiteboard.drawFromJSON(whiteboard.geomMessageList[i].geometry, whiteboard.movieDrawing);
        }
        if(indexEnd > 0){
            dojo.byId('movieUser').innerHTML = whiteboard.geomMessageList[indexEnd - 1].fromUser;
        }

    };
    var doCancelAddText = function(){
        whiteboard.getNode('wbText').setValue('');
        whiteboard.getNode('textDialog').hide();
        whiteboard.overlayDrawing.clear();
        whiteboard.textPoint = null;
    };
    var doAddText = function(){
        var text = whiteboard.getNode('wbText').getValue();
        if((text !== '') && (whiteboard.textPoint)){
            whiteboard.getNode('textDialog').hide();
            var geom = createTextJSON(whiteboard.textPoint,text);
            whiteboard.drawFromJSON(geom,whiteboard.drawing);
            whiteboard.textPoint = null;
            whiteboard.sendMessage({geometry:geom});
        }
        whiteboard.overlayDrawing.clear();
    };
    var doIncrementalText = function(){
        whiteboard.overlayDrawing.clear();
        var text = whiteboard.getNode('wbText').getValue();
        if((text !== '') && (whiteboard.textPoint)){
            var geom = createTextJSON(whiteboard.textPoint,text);
            drawFromJSON(geom,whiteboard.overlayDrawing);
        }
    };
    var hide = function(id){
        try{
            whiteboard.getWidget(id).style.display = 'none';
        }catch(e) {
            console.error(e);
        }
    };
    var show = function(id){
        try{
            whiteboard.getWidget(id).style.display = '';
        }catch(e) {
            console.error(e);
        }
    };
    var call = function(){
        try{
            var call = new Call(whiteboard.wbId);
            call.call();
        }catch(e) {
            console.error(e);
        }
    };


    // binding events
    dojo.connect(whiteboard.getWidget('callBtn'),'onClick',function(){
        call();
    });

    dojo.connect(whiteboard.getWidget('lineColorPaletteOkBtn'),'onClick',function(){
        chooseColor('line');
    });    
    dojo.connect(whiteboard.getWidget('lineColorPaletteCancelBtn'),'onClick',function(){
        cancelChooseColor('line');
    });
    dojo.connect(whiteboard.getWidget('fillColorPaletteOkBtn'),'onClick',function(){
        chooseColor('fill');
    });    
    dojo.connect(whiteboard.getWidget('fillColorPaletteCancelBtn'),'onClick',function(){
        cancelChooseColor('fill');
    });
    
    if(Modernizr.canvas) {
        dojo.connect(whiteboard.getWidget('exportImgBtn'),'onClick',exportImage);
        dojo.connect(whiteboard.getWidget('exportMovieImgBtn'),'onClick',exportMovieImage);
    } else {
        dojo.style(whiteboard.getWidget('exportImgBtn'), {'visibility': 'hidden', 'display': 'none'});
        dojo.style(whiteboard.getWidget('exportMovieImgBtn'), {'visibility': 'hidden', 'display': 'none'});
    }
    dojo.connect(whiteboard.getWidget('showMovieBtn'),'onClick',showMovie);
    dojo.connect(whiteboard.getWidget('movieSlider'),'onChange',incrementMovie);
    
    dojo.connect(whiteboard.getWidget('lineStrokeSelect'),'onChange',function(){
        whiteboard.lineStroke = Math.floor(1.0 * whiteboard.getWidget('lineStrokeSelect').getValue());
    });
    dojo.connect(whiteboard.getNode('fontSizeSelect'),'onChange',function(){
        whiteboard.fontSize = Math.floor(1.0 * whiteboard.getWidget('fontSizeSelect').getValue());
    });
    dojo.connect(whiteboard.getWidget('clearDrawingNoBtn'),'onClick',function(){
        dijit.popup.close(whiteboard.getWidget("clearDrawingDialog"));
    });
    dojo.connect(whiteboard.getWidget('clearDrawingYesBtn'),'onClick',function(){
        dijit.popup.close(whiteboard.getWidget("clearDrawingDialog"));
        var geom = createClearDrawingJSON();
        whiteboard.sendMessage({geometry: geom });
        drawFromJSON(geom,whiteboard.drawing);
        
    });
    dojo.connect(whiteboard.getWidget('sendMailButton'),'onClick',sendEmail);

    selectTool('pen');
    
    dojo.forEach(tools,function(tool){
        dojo.connect(whiteboard.getWidget(tool.name + 'ToolBtn'),'onClick',function(){
            selectTool(tool.name);            
        });
    });
    dojo.connect(whiteboard.getWidget("wbText"), 'onKeyDown', function(evt) {
        if(evt.keyCode === dojo.keys.ENTER) {
            doAddText();
        }
    });
    dojo.connect(whiteboard.getWidget("okTextBtn"), 'onClick', function(evt) {
        doAddText();
    });
    dojo.connect(whiteboard.getWidget("cancelTextBtn"), 'onClick', function(evt) {
        doCancelAddText();
    });
    dojo.connect(whiteboard.getWidget("wbText"), 'onKeyUp', function(evt) {
        doIncrementalText();
    });
    dojo.connect(whiteboard.getWidget("wbText"), 'onChange', function(evt) {
        doIncrementalText();
    });
    dojo.connect(whiteboard.getWidget("textDialog"), 'onClose', function(evt) {
        whiteboard.overlayDrawing.clear();
        whiteboard.getWidget("wbText").setValue('');
    });
    dojo.connect(whiteboard.getWidget("textDialog"), 'onHide', function(evt) {
        whiteboard.overlayDrawing.clear();
        whiteboard.getWidget("wbText").setValue('');
    });
    try{
        var reader = new FileReader();
        reader.onload = function(e) {
            document.querySelector('img').src = e.target.result;
        };

        function onDrop(e) {
            reader.readAsDataURL(e.dataTransfer.files[0]);
        };
    }catch(imgE){
        console.error(e);
    }
};

function DNDFileController(el_) {
    var thumbnails_ = document.getElementById('thumbnails');

    this.dragenter = function(e) {
        e.stopPropagation();
        e.preventDefault();
        el_.classList.add('rounded');
    };

    this.dragover = function(e) {
        e.stopPropagation();
        e.preventDefault();
    };

    this.dragleave = function(e) {
        e.stopPropagation();
        e.preventDefault();
        el_.classList.remove('rounded');
    };

    this.drop = function(e) {
        try{
            //console.log('dropevent',e);
            var pt = getGfxMouse(e);

            e.stopPropagation();
            e.preventDefault();

            el_.classList.remove('rounded');

            var files = e.dataTransfer.files;

            for (var i = 0, file; file = files[i]; i++) {
                var imageType = /image.*/;
                if (!file.type.match(imageType)) {
                    continue;
                }
                // FileReader
                var reader = new FileReader();

                reader.onerror = function(evt) {
                    alert('Error code: ' + evt.target.error.code);
                }
                reader.onload = (function(aFile) {
                    return function(evt) {
                        if (evt.target.readyState == FileReader.DONE) {

                            console.log('rawImg',evt.target.result.length);
                            var img = new Image();
                            img.src = evt.target.result;
                            var imgData = img.src;
                            var newH, newW;

                            img.onload = function(){
                                console.log(img.height, img.width);
                                var maxDim = 75;
                                //console.log(whiteboard);
                                if(img.height > maxDim || img.width > maxDim){
                                    //need to scale
                                    if(img.width > img.height){
                                        newW = maxDim;
                                        newH = Math.round((maxDim * img.height) / img.width);
                                    }else{
                                        newH = maxDim;
                                        newW = Math.round((maxDim * img.width) / img.height);
                                    }

                                }else{
                                    newH = img.height;
                                    newW = img.width;
                                }

                                var tempCanvas = document.createElement("canvas");
                                tempCanvas.height = newH;
                                tempCanvas.width = newW;
                                var tempContext = tempCanvas.getContext("2d");
                                tempContext.drawImage(img,0,0,newW,newH);

                                var bounds = {x1:pt.x, y1:pt.y, x2: pt.x + newW, y2: pt.y + newH};
                                var imgJSON = createImageJSON(bounds,tempCanvas.toDataURL());

                                //console.log(imgJSON);

                                drawFromJSON(imgJSON,whiteboard.drawing);

                                whiteboard.sendMessage({geometry:imgJSON});
                            };
                        }
                    };
                })(file);
                reader.readAsDataURL(file);
            }
            return false;
        }catch(dropE){
            console.log('DnD error',dropE);
        }
    };
    el_.addEventListener("dragenter", this.dragenter, false);
    el_.addEventListener("dragover", this.dragover, false);
    el_.addEventListener("dragleave", this.dragleave, false);
    el_.addEventListener("drop", this.drop, false);
}

var newRoom = function(roomKey) {
    console.log('creating new ...');
    var rooms = dijit.byId("rooms");

    dojo.xhrPost({
        url: "/workspace/"+workspaceId+"/room/"+(roomKey || ''),
        load: function(resp){
            if(resp.error){
                console.error(resp.error);
            } else {
                var room = new dijit.layout.ContentPane({
                    title: "Room #"+(workspace.roomCount+1),
                    href: "/workspace/"+workspaceId+"/room/?wbId="+resp.wbId,
                    onDownloadEnd: function() {
                        var curRoom = this;
                        var whiteboard = new Whiteboard(resp.wbId, resp.token, resp.messages);
                        if (whiteboard.token) {
                            whiteboard.openChannel();
                            whiteboard.loadFunction();
                        }
                        workspace.addRoom(whiteboard);

                        dijit.byId('applicationArea').resize();
                    },
                    selected: true,
                    closable: true
                });
                rooms.addChild(room);
            }
        },
        error: function(e){
            console.info("post error",e);
        },
        handleAs: "json",
        preventCache: true
    });
};

 dojo.addOnLoad(function() {
     console.log('onLoad');
     dojo.connect(dijit.byId('mainmenu.new'),'onClick',function() {
         newRoom();
     });
     dojo.connect(dijit.byId('mainmenu.join'),'onClick', function() {
         var roomKey=prompt("Please enter room key","");
         if (roomKey !== null && roomKey !== "") {
             newRoom(roomKey);
         }
     });

     // global
     workspace = new Workspace(workspaceId);

 });
 