<jsp:include page="../basicheader.jsp"/>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%
 String hostName=request.getServerName();
%>

<script src='/_ah/channel/jsapi'></script>
<script>
//dojo.require('workspace.BBCodeEditor');

var userName = '${userName}';
var workspaceId = '${workspaceId}';
var roomIdList = [];
<c:if test="${not empty roomList}">
roomIdList = ${roomList}; // json array
</c:if>
var error = '${errorMsg}';
var workspace; // window scope

</script>

<script type="text/javascript">
    dojo.require("dijit.layout.TabContainer");
    dojo.require("dojox.layout.TableContainer");
    dojo.require("dijit.layout.ContentPane");
    dojo.require("dijit.Toolbar");
    dojo.require("dijit.form.Button");
    dojo.require("dijit.form.Textarea");
    dojo.require("dijit.form.ToggleButton");
    dojo.require("dijit.ToolbarSeparator");

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
    dojo.require("dijit.form.TextBox");
</script>

<%--<script src="/js/azp/WBCommon.js"></script>--%>
<script src="/js/workspace/worksheet.js"></script>
<script src="/js/workspace/room.js"></script>
<script src="/js/workspace/workspace.js"></script>

<!-- Call specific libs and styles -->
<script src="/js/azp/adapter.js"></script>
<script src="/js/workspace/call.js"></script>
<link rel="stylesheet" href="/css/call.css">

<style>
#header{
	font-size: 3em;
	text-align: center;

}

#setUserDiv{
	text-align: center;
}

._webstore_badge {
  width: 128px;
  height: 190px;
  top: 0px;
  right: 0px;
  position: absolute;
  margin: 0 50px 0 50px;
  padding: 5px;
  box-shadow: #000 0 0 5px;
  background-color: #eae88c;
  border: solid 1px #c9c778;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  display: inline;
  font-family: Arial;
  opacity: 1;
  -webkit-transition: all 0.5s ease-in-out;
}

</style>

<div id="applicationArea" style="width: 100%; height: 100%; position: absolute; top: 0; bottom: 0; padding: 0;"  dojoType="dijit.layout.BorderContainer">

<div region="top" dojoType="dijit.layout.ContentPane" style="padding:0;">
    <div id="mainmenu" data-dojo-type="dijit.Toolbar">
        <div data-dojo-type="dijit.form.Button" id="mainmenu.new"
             data-dojo-props="iconClass:'dijitIcon dijitIconTask'">New</div>
        <div data-dojo-type="dijit.form.Button" id="mainmenu.join"
             data-dojo-props="iconClass:'dijitIcon dijitIconEdit'">Join</div>
        <div data-dojo-type="dijit.form.Button" id="mainmenu.exit"
             data-dojo-props="iconClass:'dijitEditorIcon dijitEditorIconRedo'">Exit</div>
        <div data-dojo-type="dijit.ToolbarSeparator"></div>
        <input id="value1Box" dojoType="dijit.form.TextBox" readonly="readonly" value="Current user: ${userName}"/>
    </div>
</div>
<div id="rooms" region="center" dojoType="dijit.layout.TabContainer">
<%--<jsp:include page="room.jsp"/>--%>
</div>

</div> <!-- TabsArea -->

<div id="imgDialog" dojoType="dijit.Dialog" title="Right-click on image to save it">
    <img id="exportedImg" name="exportedImg">
</div>

<div id="textDialog" dojoType="dijit.Dialog" title="Type in some text."  style="display: none">
    <input type="text" dojoType="dijit.form.ValidationTextBox" id="wbText" name="wbText"><br>
    <button dojoType="dijit.form.Button" id="okTextBtn">OK</button>&nbsp;&nbsp;&nbsp;<button dojoType="dijit.form.Button" id="cancelTextBtn">Cancel</button>
</div>

<div id="movieDialog" dojoType="dijit.Dialog" title="Move slider to see drawing steps."  style="display: none">
    <div id="movieWhiteboardContainer" style="border: 2px blue solid; background-color: white;"></div><br>
    <div id="movieSlider" dojoType="dijit.form.HorizontalSlider" value="0"
         minimum="0" maximum="1" discreteValues="2" intermediateChanges="true"
         showButtons="false" style="width:500px;"></div><br> <button dojoType="dijit.form.Button" id="exportMovieImgBtn"><img src="/images/export-icon.png"></button>
    <div dojoType="dijit.Tooltip" connectId="exportMovieImgBtn">Export this snapshot of the drawing surface.</div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    user: <span id="movieUser">user</span><br>
</div>

<jsp:include page="../footer.jsp"/>