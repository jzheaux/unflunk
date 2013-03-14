<jsp:include page="../basicheader.jsp"/>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%
 String hostName=request.getServerName();
%>

<script>

var wbId = '${wbId}';
var token = '${token}';
var userName = '${userName}';
var error = '${errorMsg}';
</script>
<%--<script src="/js/azp/WBCommon.js"></script>--%>
<script src="/js/workspace/login.js"></script>

<script type="text/javascript">
    dojo.require("dijit.layout.TabContainer");
    dojo.require("dojox.layout.TableContainer");
    dojo.require("dijit.layout.ContentPane");
    dojo.require("dijit.form.ValidationTextBox");
</script>

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

<div id="setUserDiv" style="padding: 5px;">
	<div id="header"><h1>Collaborative Whiteboard</h1></div>
	
	<br>
	Choose any user name (no spaces or punctuation):
    <input id="userNameText" dojoType="dijit.form.ValidationTextBox"> <span id="userNameBtn" dojoType="dijit.form.Button">Start Drawing!</span><br>
	
	<span id="submitUserNameMessage"></span>
	<br><br>
<!--	<script src="/js/badge.js"></script>-->

</div>

<jsp:include page="../footer.jsp"/>