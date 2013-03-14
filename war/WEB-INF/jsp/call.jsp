<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
<head>
    <title>WebRTC Reference App</title>
    <meta http-equiv="X-UA-Compatible" content="chrome=1"/>
    <script src="/_ah/channel/jsapi"></script>

    <!-- Call specific libs and styles -->
    <script src="/js/azp/adapter.js"></script>
    <script src="/js/azp/call-ext.js"></script>
    <link rel="stylesheet" href="/css/call.css">

    <script TYPE="text/javascript" src="http://ajax.googleapis.com/ajax/libs/dojo/1.6/dojo/dojo.xd.js" djConfig="parseOnLoad: true, baseUrl: '/js/', modulePaths:{azp:'azp'}, gfxRenderer:'canvas,svg,vml,silverlight',defaultDuration:1"></script>
</head>
<body>

<div id="container" ondblclick="enterFullScreen()">
    <div id="card">
        <div id="local">
            <video width="100%" height="100%" id="localVideo" autoplay="autoplay" muted="true"/>
        </div>
        <div id="remote">
            <video width="100%" height="100%" id="remoteVideo" autoplay="autoplay">
            </video>
            <div id="mini">
                <video width="100%" height="100%" id="miniVideo" autoplay="autoplay" muted="true"/>
            </div>
        </div>
    </div>
    <div id="callStatus">
        <c:if test="${not empty param.roomKey}">
            <a href="#" onclick="answer('<c:out value="${roomKey}"/>')">Join to the Session</a>
        </c:if>
        <a href="#" onclick="call()">Create a new Session</a>
    </div>
</div>
</body>
</html>