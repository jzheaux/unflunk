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

// multiple instances
function Worksheet(id, room) {
    this.room = room;
    this.id = id;

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
    this.tool = 'pen';
    this.points = [];
    this.mouseDown = false;

}
// Entity methods
Worksheet.prototype = {
    "getNode": function(clazz) {
        return dojo.query("."+clazz, this.id)[0];
    },
    "getWidget": function(clazz) {
        return dijit.getEnclosingWidget(this.getNode(clazz));
    },
    "getDialogWidget": function(clazz) {
        return dijit.getEnclosingWidget(dojo.query('.'+clazz+'.'+this.id)[0]);
    },
    "addTimeRand": function(geom){
        geom.cTime = new Date().getTime();
        geom.cRand = Math.round(100000000000 * Math.random());
        geom.fromUser = userName;
        return geom;
    }
};
Worksheet.prototype.drawFromJSON = function(geom,drawing) {
    // private methods
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
    // method body
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

            return shape;
        }else if(geom.shapeType === 'deleteOverlay'){
            shape = drawing.createRect({x: geom.xPts[0] - 3, y: geom.yPts[0] - 3, width: (geom.xPts[1] - geom.xPts[0] + 6), height: (geom.yPts[1] - geom.yPts[0] + 6) });
            shape.setStroke({color: new dojo.Color([255,0,0,0.75]), width: 2});
            shape.setFill(new dojo.Color([255,0,0,0.25]));

            line = drawing.createLine({x1: geom.xPts[0] - 3, y1: geom.yPts[0] - 3, x2: geom.xPts[1] + 3, y2: geom.yPts[1] + 3});
            line.setStroke({color: "#FF0000", width: 2});

            line = drawing.createLine({x1: geom.xPts[1] + 3, y1: geom.yPts[0] - 3, x2: geom.xPts[0] - 3, y2: geom.yPts[1] + 3});
            line.setStroke({color: "#FF0000", width: 2});

            return shape;
        }else if(geom.shapeType === 'moveOverlay'){
            shape = drawing.createRect({x: geom.xPts[0] - 3, y: geom.yPts[0] - 3, width: (geom.xPts[1] - geom.xPts[0] + 6), height: (geom.yPts[1] - geom.yPts[0] + 6) });
            shape.setStroke({color: new dojo.Color([0,0,255,0.75]), width: 2});
            shape.setFill(new dojo.Color([0,0,255,0.25]));

            return shape;
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

            return shape;
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

            return shape;
        }
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
        return shape;
    }
};
Worksheet.prototype.sendMessage = function(message){
    this.room.sendMessage(dojo.mixin(message, { worksheetId: this.id }));
};
Worksheet.prototype.initGfx = function(){
    var worksheet = this;
    // private methods
    var getGfxMouse = function(evt){
        var coordsM = dojo.coords(worksheet.container);
        return {x: Math.round(evt.clientX - coordsM.x), y: Math.round(evt.clientY - coordsM.y)};
    };
    var doGfxMouseDown = function(evt) {
        var pt = getGfxMouse(evt);
        //console.dir(pt);
        if(pointInDrawing(pt)){
            worksheet.mouseDownPt = pt;
            worksheet.points = [pt];
            worksheet.mouseDown = true;

            worksheet.selectedShape = getHoveredShape(worksheet.drawing,pt);
        }
    };
    var doGfxMouseMove = function(evt) {
        var pt = getGfxMouse(evt);
        var geom = false;
        var shape = false;

        if(worksheet.mouseDown){
            if((worksheet.tool === 'pen') && pointInDrawing(pt) ){
                if((worksheet.points[worksheet.points.length - 1].x !== pt.x) || (worksheet.points[worksheet.points.length - 1].y !== pt.y)){
                    worksheet.points.push(pt);

                    if(worksheet.points.length > 1){
                        //make sure its not the same point as last time
                        geom = createLineJSON(
                            {x1: worksheet.points[worksheet.points.length - 2].x,
                                y1: worksheet.points[worksheet.points.length - 2].y,
                                x2: worksheet.points[worksheet.points.length - 1].x,
                                y2: worksheet.points[worksheet.points.length - 1].y }
                        );
                        worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
                    }
                }
            }else{
                var bounds = {x1:worksheet.mouseDownPt.x, y1:worksheet.mouseDownPt.y, x2: pt.x, y2: pt.y};
                if(worksheet.tool !== 'pen'){
                    worksheet.overlayDrawing.clear();
                }
                if(worksheet.tool === 'rect'){
                    geom  = createRectJSON(bounds,false);
                    worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
                }else if(worksheet.tool === 'filledRect'){
                    geom  = createRectJSON(bounds,true);
                    worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
                }else if(worksheet.tool === 'ellipse'){
                    geom  = createEllipseJSON(bounds,false);
                    worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
                }else if(worksheet.tool === 'filledEllipse'){
                    geom  = createEllipseJSON(bounds,true);
                    worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
                }else if(worksheet.tool === 'line'){
                    geom  = createLineJSON(bounds);
                    worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
                }else if(worksheet.tool === 'move'){
                    if(worksheet.selectedShape && worksheet.mouseDownPt){
                        geom = createMoveOverlayJSON(worksheet.selectedShape.wbbb);
                        worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
                        var offBB = createOffsetBB(worksheet.selectedShape.wbbb,worksheet.mouseDownPt,pt);
                        //console.dir(offBB);
                        var geom2 = createMoveOverlayJSON(offBB);

                        worksheet.drawFromJSON(geom2,worksheet.overlayDrawing);
                    }
                }
            }
        } else {
            if(worksheet.tool === 'move'){
                worksheet.overlayDrawing.clear();
                shape = getHoveredShape(worksheet.drawing,pt);
                if(shape){
                    geom = createMoveOverlayJSON(shape.wbbb);
                    worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
                }
            }
        }
        //mouse up or down doesn't matter for the select and delete tools
        if(worksheet.tool === 'delete'){
            worksheet.overlayDrawing.clear();
            shape = getHoveredShape(worksheet.drawing,pt);
            if(shape){
                geom = createDeleteOverlayJSON(shape.wbbb);
                worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
            }
        }else if(worksheet.tool === 'moveUp'){
            worksheet.overlayDrawing.clear();
            shape = getHoveredShape(worksheet.drawing,pt);
            if(shape){
                geom = createMoveUpOverlayJSON(shape.wbbb);
                worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
            }
        }else if(worksheet.tool === 'moveDown'){
            worksheet.overlayDrawing.clear();
            shape = getHoveredShape(worksheet.drawing,pt);
            if(shape){
                geom = createMoveDownOverlayJSON(shape.wbbb);
                worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
            }
        }
    };
    var pointInDrawing = function(pt){
        if((pt.x > -2) && (pt.x < (worksheet.width + 2)) && (pt.y > -2) && (pt.y < (worksheet.height + 2))){
            return true;
        }else{
            return false;
        }
    };
    var doGfxMouseUp = function(evt) {
        var pt = getGfxMouse(evt);
        worksheet.mouseDown = false;
        //console.dir(pt);

        //always clear the overlay
        worksheet.overlayDrawing.clear();

        if(worksheet.mouseDownPt){
            //make sure mouse was released inside of drawing area
            if(pointInDrawing(pt)){
                //console.dir(worksheet.mouseDownPt);

                var bounds = {x1:worksheet.mouseDownPt.x, y1:worksheet.mouseDownPt.y, x2: pt.x, y2: pt.y};
                //worksheet.mouseDownPt = null;

                var geom = null;
                var shape = false;
                if(worksheet.tool === 'rect'){
                    geom  = createRectJSON(bounds,false);
                    worksheet.drawFromJSON(geom,worksheet.drawing);
                }else if(worksheet.tool === 'filledRect'){
                    geom  = createRectJSON(bounds,true);
                    worksheet.drawFromJSON(geom,worksheet.drawing);
                }else if(worksheet.tool === 'ellipse'){
                    geom  = createEllipseJSON(bounds,false);
                    worksheet.drawFromJSON(geom,worksheet.drawing);
                }else if(worksheet.tool === 'filledEllipse'){
                    geom  = createEllipseJSON(bounds,true);
                    worksheet.drawFromJSON(geom,worksheet.drawing);
                }else if(worksheet.tool === 'line'){
                    geom  = createLineJSON(bounds);
                    worksheet.drawFromJSON(geom,worksheet.drawing);
                }else if(worksheet.tool === 'pen'){
                    geom = createPenJSON(worksheet.points);
                    worksheet.drawFromJSON(geom,worksheet.drawing);
                    console.log("num pen points sending:",geom.xPts.length);
                }else if(worksheet.tool === 'delete'){
                    shape = getHoveredShape(worksheet.drawing,pt);
                    if(shape){
                        geom = createDeleteJSON(shape);
                        worksheet.drawFromJSON(geom,worksheet.drawing);
                    }
                }else if(worksheet.tool === 'move'){
                    //console.log(worksheet.selectedShape,worksheet.mouseDownPt,bounds);
                    if(worksheet.selectedShape && worksheet.mouseDownPt)
                    {
                        var ptDelta = {x: (pt.x - worksheet.mouseDownPt.x),y: (pt.y - worksheet.mouseDownPt.y)};

                        geom = createMoveJSON(worksheet.selectedShape, ptDelta);

                        worksheet.drawFromJSON(geom,worksheet.drawing);
                        //console.dir(geom);
                    }
                }else if(worksheet.tool === 'moveUp'){
                    shape = getHoveredShape(worksheet.drawing,pt);
                    if(shape){
                        geom = createMoveUpJSON(shape);
                        worksheet.drawFromJSON(geom,worksheet.drawing);
                    }
                }else if(worksheet.tool === 'moveDown'){
                    shape = getHoveredShape(worksheet.drawing,pt);
                    if(shape){
                        geom = createMoveDownJSON(shape);
                        worksheet.drawFromJSON(geom,worksheet.drawing);
                    }
                }else if(worksheet.tool === 'text'){
                    worksheet.textPoint = pt;
                    dijit.byId('textDialog').show();
                    dijit.byId('wbText').focus();
                }
                //worksheet.points = [];
                if(geom){
                    worksheet.sendMessage({geometry:geom});
                }
            }else{
                worksheet.mouseDownPt = null;
                console.log("mouse released outside of drawing area");
            }
        }
        //clear everything
        worksheet.mouseDownPt = null;
        worksheet.selectedShape = null;
        worksheet.points = [];
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
            geom.fillColor = worksheet.fillColor;
        }
        geom.lineColor = worksheet.lineColor;
        geom.lineStroke = worksheet.lineStroke;

        return worksheet.addTimeRand(geom);
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
            geom.fillColor = worksheet.fillColor;
        }
        geom.lineColor = worksheet.lineColor;
        geom.lineStroke = worksheet.lineStroke;

        return worksheet.addTimeRand(geom);
    };
    var createLineJSON = function(bounds){
        var geom = {
                xPts: [bounds.x1,bounds.x2],
                yPts: [bounds.y1,bounds.y2]
        };
        geom.shapeType = 'line';
        geom.fillColor = worksheet.fillColor;
        geom.lineColor = worksheet.lineColor;
        geom.lineStroke = worksheet.lineStroke;

        return worksheet.addTimeRand(geom);
    };
    var createPenJSON = function(points){
          var xPts = [];
          var yPts = [];
          dojo.forEach(points, function(point){
             xPts.push(point.x);
             yPts.push(point.y);
          });
        var geom = {shapeType: 'pen',
                    fillColor: worksheet.fillColor,
                    lineColor: worksheet.lineColor,
                    lineStroke: worksheet.lineStroke,
                    xPts: xPts,
                    yPts: yPts
                };
        return worksheet.addTimeRand(geom);
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

    // method body
    worksheet.container = worksheet.getNode("whiteboardContainer");
    worksheet.overlayContainer = worksheet.getNode("whiteboardOverlayContainer");

    worksheet.drawing = dojox.gfx.createSurface(worksheet.container, worksheet.width, worksheet.height);
    worksheet.overlayDrawing = dojox.gfx.createSurface(worksheet.overlayContainer, worksheet.width, worksheet.height);

    //for playback
    worksheet.movieContainer = dojo.byId("movieWhiteboardContainer");
    worksheet.movieDrawing = dojox.gfx.createSurface(worksheet.movieContainer, worksheet.width, worksheet.height);

    //draw any saved objects
    dojo.forEach(worksheet.room.messageList, function(message){
        if(message.geometry){
            message.geometry.fromUser = message.fromUser;
            if (worksheet.id === message.worksheetId) {
                worksheet.drawFromJSON(message.geometry, worksheet.drawing);
            }
        }
    });
    worksheet.overlayContainer.style.width = worksheet.width + 'px';
    worksheet.overlayContainer.style.height = worksheet.height + 'px';
    worksheet.container.style.width = worksheet.width + 'px';
    worksheet.container.style.height = worksheet.height + 'px';

    worksheet.movieContainer.style.width = worksheet.width + 'px';
    worksheet.movieContainer.style.height = worksheet.height + 'px';

    worksheet.overlayContainer.style.position = 'absolute';
    worksheet.overlayContainer.style.zIndex = 1;

    var c = dojo.coords(worksheet.container);
    console.dir(c);
    dojo.style(worksheet.overlayContainer,"top", (c.t + 'px'));
    dojo.style(worksheet.overlayContainer,"left", (c.l + 'px'));

    dojo.connect(dojo.body(),'onmouseup',doGfxMouseUp); //mouse release can happen anywhere in the container
    dojo.connect(worksheet.overlayContainer,'onmousedown',doGfxMouseDown);
    //dojo.connect(dojo.body(),'onmousemove',doGfxMouseMove);
    dojo.connect(worksheet.overlayContainer,'onmousemove',doGfxMouseMove);
    console.log("topov",dojo.style(worksheet.overlayContainer,"top"));

    if(Modernizr.draganddrop){
        console.log('supports drag and drop!');
        var dndc = new DNDFileController(worksheet.getNode('whiteboardOverlayContainer'));
    }
};
Worksheet.prototype.init = function(){
    var worksheet = this;
    // private methods
    var chooseColor = function(type) {
        var cp = worksheet.getDialogWidget(type + 'ColorPaletteWidget');
        //console.log(cp);
        dojo.style(worksheet.getNode(type + 'Swatch'),{backgroundColor: cp.value});
        worksheet[type + 'Color'] = cp.value;
        dijit.popup.close(worksheet.getDialogWidget(type + "ColorPaletteDialog"));
    };
    var cancelChooseColor = function(type) {
        dijit.popup.close(worksheet.getDialogWidget(type + "ColorPaletteDialog"));
    };
    var exportImage = function(){
        try{                                      //dojo.query('canvas',worksheet.getNode('movieDialog'))[0].toDataURL();
            dojo.byId("exportedImg").src = dojo.query('canvas',dojo.byId(worksheet.wbId))[0].toDataURL();
            dijit.byId("imgDialog").show();
        }catch(e){
            console.info("canvas not supported",e);
        }
    };
    var exportMovieImage = function(){
        try{
            dojo.byId("exportedImg").src = dojo.query('canvas',dojo.byId('movieDialog'))[0].toDataURL();
            dijit.byId("imgDialog").show();
        }catch(e){
            console.info("canvas not supported",e);
        }
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
            dojo.removeClass(worksheet.getNode(aTool.name + 'ToolBtn'), "selected");
        });

        //dojo.style(this.byClass(tool.name + 'ToolBtn').domNode,'border','2px solid black');
        dojo.addClass(worksheet.getNode(tool.name + 'ToolBtn'), "selected");
        worksheet.tool = tool.name;

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
            dijit.byId("movieDialog").show();

            if(worksheet.room.messageList){
                worksheet.geomMessageList = [];
                dojo.forEach(worksheet.room.messageList,function(message){
                    if(message.geometry && message.worksheetId === worksheet.id){
                        worksheet.room.geomMessageList.push(message);
                    }
                });
            }
            var mSlider = dijit.byId('movieSlider');
            mSlider.setAttribute('maximum',worksheet.room.geomMessageList.length);
            mSlider.setAttribute('discreteValues',worksheet.room.geomMessageList.length);

            mSlider.setValue(0);
        }catch(e){
            console.info("canvas not supported",e);
        }
    };
    var incrementMovie = function(){
        var indexEnd = Math.round(dijit.byId('movieSlider').getValue());
        worksheet.movieDrawing.clear();
        for(var i =0; i < indexEnd; i++){
            worksheet.drawFromJSON(worksheet.room.geomMessageList[i].geometry, worksheet.movieDrawing);
        }
        if(indexEnd > 0){
            dojo.byId('movieUser').innerHTML = worksheet.room.geomMessageList[indexEnd - 1].fromUser;
        }
    };
    var doCancelAddText = function(){
        dijit.byId('wbText').setValue('');
        dijit.byId('textDialog').hide();
        worksheet.overlayDrawing.clear();
        worksheet.textPoint = null;
    };
    var doAddText = function(){
        var text = dijit.byId('wbText').getValue();
        if((text !== '') && (worksheet.textPoint)){
            dijit.byId('textDialog').hide();
            var geom = createTextJSON(worksheet.textPoint,text);
            worksheet.drawFromJSON(geom,worksheet.drawing);
            worksheet.textPoint = null;
            worksheet.sendMessage({geometry:geom});
        }
        worksheet.overlayDrawing.clear();
    };
    var doIncrementalText = function(){
        worksheet.overlayDrawing.clear();
        var text = dijit.byId('wbText').getValue();
        if((text !== '') && (worksheet.textPoint)){
            var geom = createTextJSON(worksheet.textPoint,text);
            worksheet.drawFromJSON(geom,worksheet.overlayDrawing);
        }
    };
    var hide = function(id){
        try{
            worksheet.getNode(id).style.display = 'none';
        }catch(e) {
            console.error(e);
        }
    };
    var show = function(id){
        try{
            worksheet.getNode(id).style.display = '';
        }catch(e) {
            console.error(e);
        }
    };
    var  createClearDrawingJSON = function(){
        var geom = {shapeType: 'clear'};
        return geom;
    };
    var createTextJSON = function(pt,text){
        var geom = {
            xPts: [pt.x],
            yPts: [pt.y]
        };
        geom.shapeType = 'text';
        geom.text = text;
        geom.lineStroke = worksheet.fontSize;
        geom.lineColor = worksheet.lineColor;

        return worksheet.addTimeRand(geom);
    };

    // method body
    // binding events
    dojo.connect(worksheet.getDialogWidget('lineColorPaletteOkBtn'),'onClick',function(){
        chooseColor('line');
    });    
    dojo.connect(worksheet.getDialogWidget('lineColorPaletteCancelBtn'),'onClick',function(){
        cancelChooseColor('line');
    });
    dojo.connect(worksheet.getDialogWidget('fillColorPaletteOkBtn'),'onClick',function(){
        chooseColor('fill');
    });    
    dojo.connect(worksheet.getDialogWidget('fillColorPaletteCancelBtn'),'onClick',function(){
        cancelChooseColor('fill');
    });
    
    if(Modernizr.canvas) {
        dojo.connect(worksheet.getWidget('exportImgBtn'),'onClick',exportImage);
        dojo.connect(dijit.byId('exportMovieImgBtn'),'onClick',exportMovieImage);
    } else {
        dojo.style(worksheet.getWidget('exportImgBtn'), {'visibility': 'hidden', 'display': 'none'});
        dojo.style(dijit.byId('exportMovieImgBtn'), {'visibility': 'hidden', 'display': 'none'});
    }
    dojo.connect(worksheet.getWidget('showMovieBtn'),'onClick',showMovie);
    dojo.connect(dijit.byId('movieSlider'),'onChange',incrementMovie);
    
    dojo.connect(worksheet.getWidget('lineStrokeSelect'),'onChange',function(){
        worksheet.lineStroke = Math.floor(1.0 * worksheet.getWidget('lineStrokeSelect').getValue());
    });
    dojo.connect(worksheet.getNode('fontSizeSelect'),'onChange',function(){
        worksheet.fontSize = Math.floor(1.0 * worksheet.getWidget('fontSizeSelect').getValue());
    });
    dojo.connect(worksheet.getDialogWidget('clearDrawingNoBtn'),'onClick',function(){
        dijit.popup.close(worksheet.getWidget("clearDrawingDialog"));
    });
    dojo.connect(worksheet.getDialogWidget('clearDrawingYesBtn'),'onClick',function(){
        dijit.popup.close(worksheet.getDialogWidget("clearDrawingDialog"));
        var geom = createClearDrawingJSON();
        worksheet.sendMessage({geometry: geom });
        worksheet.drawFromJSON(geom,worksheet.drawing);
        
    });
    selectTool('pen');
    
    dojo.forEach(tools,function(tool){
        dojo.connect(worksheet.getWidget(tool.name + 'ToolBtn'),'onClick',function(){
            selectTool(tool.name);
        });
    });
    dojo.connect(worksheet.getWidget("wbText"), 'onKeyDown', function(evt) {
        if(evt.keyCode === dojo.keys.ENTER) {
            doAddText();
        }
    });
    dojo.connect(dijit.byId("okTextBtn"), 'onClick', function(evt) {
        doAddText();
    });
    dojo.connect(dijit.byId("cancelTextBtn"), 'onClick', function(evt) {
        doCancelAddText();
    });
    dojo.connect(worksheet.getWidget("wbText"), 'onKeyUp', function(evt) {
        doIncrementalText();
    });
    dojo.connect(worksheet.getWidget("wbText"), 'onChange', function(evt) {
        doIncrementalText();
    });
    dojo.connect(worksheet.getWidget("textDialog"), 'onClose', function(evt) {
        worksheet.overlayDrawing.clear();
        worksheet.getWidget("wbText").setValue('');
    });
    dojo.connect(worksheet.getWidget("textDialog"), 'onHide', function(evt) {
        worksheet.overlayDrawing.clear();
        worksheet.getWidget("wbText").setValue('');
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