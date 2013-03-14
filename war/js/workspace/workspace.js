// single instance only
function Workspace(id, roomIdList) {
    this.id = id;

    this.roomCount = 0;
    this.roomList = {};
    this.roomIdList = roomIdList || [];

    this.addRoom = function(room) {
        this.roomList[room.id] = room;
    };

    this.removeRoom = function(roomId) {
        var workspace = this;
        console.debug('removeRoom()');
        dojo.xhrDelete({
            url: "/workspace/"+workspace.id+"/room/"+roomId,
            load: function(resp){
                if(resp.error){
                    console.error(resp.error);
                } else {
                    // ok
                }
            },
            error: function(e){
                console.info("post error",e);
            },
            handleAs: "json",
            preventCache: true
        });
    };

    this.newRoom = function(roomId) {
        var workspace = this;
        console.debug('newRoom()');
        var roomTabs = dijit.byId("rooms");

        dojo.xhrPost({
            url: "/workspace/"+workspace.id+"/room/"+(roomId || ''),
            load: function(resp){
                if(resp.error){
                    console.error(resp.error);
                } else {
                    var roomTab = new dijit.layout.ContentPane({
                        id: resp.roomId,
                        title: "Room #"+(++workspace.roomCount),
                        href: "/workspace/"+workspace.id+"/room/"+resp.roomId,
                        onDownloadEnd: function() {
                            var room = new Room(resp.roomId, resp.token, resp.messages, resp.worksheets);
                            if (room.token) {
                                room.openChannel();
                                room.init();
                            }
                            workspace.addRoom(room);
                            dijit.byId('applicationArea').resize();
                        },
                        selected: true,
                        closable: true
                    });
                    roomTabs.addChild(roomTab);
                    if(!roomId) {
                        roomTabs.selectChild(roomTab);
                    }
                }
            },
            error: function(e){
                console.info("post error",e);
            },
            handleAs: "json",
            preventCache: true
        });
    };
    this.exit = function() {
        dojo.xhrPost({
            url: "/workspace/logout",
            load: function(resp){
                window.location.href = "/workspace";
            },
            error: function(e){
                console.info("post error",e);
            },
            handleAs: "json",
            preventCache: true
        });
    };
}
Workspace.prototype.init = function() {
    var workspace = this;
    dojo.forEach(workspace.roomIdList, function(roomId){
        workspace.newRoom(roomId);
    });

    dojo.connect(dijit.byId('mainmenu.new'),'onClick',function() {
        workspace.newRoom();
    });
    dojo.connect(dijit.byId('mainmenu.join'),'onClick', function() {
        var roomKey=prompt("Please enter room key","");
        if (roomKey !== null && roomKey !== "") {
            workspace.newRoom(roomKey);
        }
    });
    dojo.connect(dijit.byId('mainmenu.exit'),'onClick',function() {
        workspace.exit();
    });
};

// drag and drop common method
function DNDFileController(el_) {
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
                };
                reader.onload = (function(aFile) {
                    return function(evt) {
                        if (evt.target.readyState === FileReader.DONE) {

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
                                // TODO:
                                //whiteboard.drawFromJSON(imgJSON,whiteboard.drawing);
                                //whiteboard.sendMessage({geometry:imgJSON});
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

 dojo.addOnLoad(function() {
     console.log('onLoad');
     workspace = new Workspace(workspaceId, roomIdList);
     workspace.init();
 });