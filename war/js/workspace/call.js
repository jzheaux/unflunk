/**
 * Created with IntelliJ IDEA.
 * User: max
 * Date: 3/04/13
 * Time: 11:24 PM
 * To change this template use File | Settings | File Templates.
 */

function Call(roomId) {
    this.roomId = roomId;

    this.getNode = function(clazz) {
        return dojo.query("."+clazz, this.roomId)[0];
    };
    this.getWidget = function(clazz) {
        return dijit.getEnclosingWidget(this.getNode(clazz));
    };
}

Call.prototype.new = function() {
    var callId;
    var call = this;
    var card;
    var localVideo;
    var miniVideo;
    var remoteVideo;
    var localStream;
    var remoteStream;
    var channel;
    var channelReady = false;
    var pc;
    var socket;
    var started = false;
    // Set up audio and video regardless of what devices are present.
    var sdpConstraints = {'mandatory': {
        'OfferToReceiveAudio':true,
        'OfferToReceiveVideo':true }};
    var isVideoMuted = false;
    var isAudioMuted = false;

    var me = false;
    var callee = '';
    var initiator = false; // {{ initiator }}; // 0
    var mediaConstraints = false;
    var pcConfig = false;
    var pcConstraints = false;
    var offerConstraints = false;

    //================== User Action =====================
    this.hangup = function() {
        //function onHangup() {
        console.debug("onHangup");
        console.log("Hanging up.");
        transitionToDone();
        stop();
        // will trigger BYE from server
        socket.close();
    };

    //================== Private Methods =====================
    var start = function(url) {
        dojo.xhrGet({
            url: url,
            handleAs: "json",
            //timeout: 10000,
            load: function(response, ioArgs){
                console.debug("Form submitted successfully.");
                console.debug(dojo.toJson(response));

                initiator = response.initiator;
                me = response.me;
                mediaConstraints = response.mediaConstraints;
                offerConstraints = response.offerConstraints;
                pcConfig = response.pcConfig;
                pcConstraints = response.pcConstraints;
                callId = response.callId;
                var channelToken = response.token;
                initialize(channelToken);
            },
            error: function(response, ioArgs){
                // debug.dir(response);
                console.debug(response);
                console.error("Form submission failed.");
                return response;
            }
        });
    };
    var initialize = function(channelToken) {
        console.debug("initialize");
        console.log("Initializing; call="+callId+".");
        card = call.getNode("card");
        localVideo = call.getNode("localVideo");
        miniVideo = call.getNode("miniVideo");
        remoteVideo = call.getNode("remoteVideo");
        resetStatus();
        openChannel(channelToken);
        doGetUserMedia();
    };
    var openChannel = function(channelToken) {
        console.debug("openVideoChannel");
        console.log("Opening channel with token = "+channelToken);
        var channel = new goog.appengine.Channel(channelToken);
        var handler = {
            'onopen': onChannelOpened,
            'onmessage': onChannelMessage,
            'onerror': onChannelError,
            'onclose': onChannelClosed
        };
        socket = channel.open(handler);
    };
    var resetStatus = function() {
        console.debug("resetStatus");
        if (!initiator) {
            setStatus("Waiting for someone to join");//: <a href=\""+roomLink+"\" TARGET=\"_blank\">"+roomLink+"</a>");
            call.getNode('chatText').innerHTML = " is calling you";//textArea.setValue(' is calling ');
        } else {
            setStatus("Initializing...");
        }
    };
    var doGetUserMedia = function() {
        console.debug("doGetUserMedia");
        // Call into getUserMedia via the polyfill (adapter.js).
        var constraints = mediaConstraints; //{{ media_constraints|safe }}; // {"mandatory": {}, "optional": []};
        try {
            getUserMedia({'audio':true, 'video':constraints}, onUserMediaSuccess,
                onUserMediaError);
            console.log("Requested access to local media with mediaConstraints:\n" +
                "  \"" + JSON.stringify(constraints) + "\"");
        } catch (e) {
            alert("getUserMedia() failed. Is this a WebRTC capable browser?");
            console.log("getUserMedia failed with exception: " + e.message);
        }
    };
    var createPeerConnection = function() {
        console.debug("createPeerConnection");
        var pc_config =  pcConfig; // {{ pc_config|safe }}; // {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
        var pc_constraints = pcConstraints; // {{ pc_constraints|safe }}; // {"optional": [{"DtlsSrtpKeyAgreement": true}]};
        // Force the use of a number IP STUN server for Firefox.
        if (webrtcDetectedBrowser === "firefox") {
            pc_config = {"iceServers":[{"url":"stun:23.21.150.121"}]};
        }
        try {
            // Create an RTCPeerConnection via the polyfill (adapter.js).
            pc = new RTCPeerConnection(pc_config, pc_constraints);
            pc.onicecandidate = onIceCandidate;
            console.log("Created RTCPeerConnnection with:\n" +
                "  config: \"" + JSON.stringify(pc_config) + "\";\n" +
                "  constraints: \"" + JSON.stringify(pc_constraints) + "\".");
        } catch (e) {
            console.log("Failed to create PeerConnection, exception: " + e.message);
            alert("Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.");
            return;
        }

        pc.onaddstream = onRemoteStreamAdded;
        pc.onremovestream = onRemoteStreamRemoved;
    };
    var maybeStart = function () {
        console.debug("maybeStart");
        if (!started && localStream && channelReady) {
            setStatus("Connecting...");
            console.log("Creating PeerConnection.");
            createPeerConnection();
            console.log("Adding local stream.");
            pc.addStream(localStream);
            started = true;
            // Caller initiates offer to peer.
            if (initiator) {
                doCall();
            }
        }
    };
    var setStatus = function(state) {
        console.debug("setStatus ");//+chatWaitMessage+' or '+callStatus);
        call.getNode('callWaitMessage').innerHTML = state;
    };
    var doCall = function() {
        console.debug("doCall");
        var constraints =  offerConstraints; // {{ offer_constraints | safe }}; // {"optional": [], "mandatory": {"MozDontOfferDataChannel": true}};
        // temporary measure to remove Moz* constraints in Chrome
        if (webrtcDetectedBrowser === "chrome") {
            for (var prop in constraints.mandatory) {
                if (prop.indexOf("Moz") !== -1) {
                    delete constraints.mandatory[prop];
                }
            }
        }
        constraints = mergeConstraints(constraints, sdpConstraints);
        console.log("Sending offer to peer, with constraints: \n" +
            "  \"" + JSON.stringify(constraints) + "\".");
        pc.createOffer(setLocalAndSendMessage, null, constraints);
    };
    var doAnswer = function() {
        console.debug("doAnswer");
        console.log("Sending answer to peer.");
        pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
    };
    var mergeConstraints = function(cons1, cons2) {
        console.debug("mergeConstraints");
        var merged = cons1;
        for (var name in cons2.mandatory) {
            merged.mandatory[name] = cons2.mandatory[name];
        }
        merged.optional.concat(cons2.optional);
        return merged;
    };
    var setLocalAndSendMessage = function(sessionDescription) {
        console.debug("setLocalAndSendMessage");
        // Set Opus as the preferred codec in SDP if Opus is present.
        sessionDescription.sdp = preferOpus(sessionDescription.sdp);
        pc.setLocalDescription(sessionDescription);
        sendMessage(sessionDescription);
    };
    var sendMessage = function(message) {
        console.debug("sendMessage");
        var msgString = JSON.stringify(message);
        console.log('C->S: ' + msgString);
        path = '/call/'+callId+'/message/?user='+me;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', path, true);
        xhr.send(msgString);
    };
    var processSignalingMessage = function(message) {
        console.debug("processSignalingMessage");
        var msg = JSON.parse(message);

        if (msg.type === 'offer') {
            // Callee creates PeerConnection
            if (!initiator && !started) {
                maybeStart();
            }
            pc.setRemoteDescription(new RTCSessionDescription(msg));
            doAnswer();
        } else if (msg.type === 'answer' && started) {
            pc.setRemoteDescription(new RTCSessionDescription(msg));
        } else if (msg.type === 'candidate' && started) {
            var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label,
                candidate:msg.candidate});
            pc.addIceCandidate(candidate);
        } else if (msg.type === 'bye' && started) {
            onRemoteHangup();
        }
    };
    //================== Inner Event Handlers ==================
    var onChannelOpened = function() {
        console.debug("onChannelOpened");
        console.log('Channel opened.');
        channelReady = true;
        if (initiator) {
            maybeStart();
        }
    };
    var onChannelMessage = function(message) {
        console.debug("onChannelMessage");
        console.log('S->C: ' + message.data);
        processSignalingMessage(message.data);
    };
    var onChannelError = function() {
        console.debug("onChannelError");
        console.log('Channel error.');
    };
    var onChannelClosed = function() {
        console.debug("onChannelClosed");
        console.log('Channel closed.');
    };
    var onUserMediaSuccess = function(stream) {
        console.debug("onUserMediaSuccess");
        console.log("User has granted access to local media.");
        // Call the polyfill wrapper to attach the media stream to this element.
        attachMediaStream(localVideo, stream);
        localVideo.style.opacity = 1;
        localStream = stream;
        // Caller creates PeerConnection.
        if (initiator) {
            maybeStart();
        }
    };
    var onUserMediaError = function(error) {
        console.debug("onUserMediaError");
        console.log("Failed to get access to local media. Error code was " + error.code);
        alert("Failed to get access to local media. Error code was " + error.code + ".");
    };
    var onIceCandidate = function(event) {
        console.debug("onIceCandidate");
        if (event.candidate) {
            sendMessage({type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate});
        } else {
            console.log("End of candidates.");
        }
    };
    var onRemoteStreamAdded = function(event) {
        console.debug("onRemoteStreamAdded");
        console.log("Remote stream added.");
        reattachMediaStream(miniVideo, localVideo);
        attachMediaStream(remoteVideo, event.stream);
        remoteStream = event.stream;
        waitForRemoteVideo();
    };
    var onRemoteStreamRemoved = function(event) {
        console.debug("onRemoteStreamRemoved");
        console.log("Remote stream removed.");
    };
    var onRemoteHangup = function() {
        console.debug("onRemoteHangup");
        console.log('Session terminated.');
        transitionToWaiting();
        stop();
        initiator = 0;
    };
    var stop = function() {
        console.debug("stop");
        started = false;
        isAudioMuted = false;
        isVideoMuted = false;
        pc.close();
        pc = null;
    };
    var waitForRemoteVideo = function() {
        console.debug("waitForRemoteVideo");
        // Call the getVideoTracks method via adapter.js.
        var videoTracks = remoteStream.getVideoTracks();
        if (videoTracks.length === 0 || remoteVideo.currentTime > 0) {
            transitionToActive();
        } else {
            setTimeout(waitForRemoteVideo, 100);
        }
    };
    var transitionToActive = function() {
        console.debug("transitionToActive");
        remoteVideo.style.opacity = 1;
        card.style.webkitTransform = "rotateY(180deg)";
        setTimeout(function() { localVideo.src = ""; }, 500);
        setTimeout(function() { miniVideo.style.opacity = 1; }, 1000);
        setStatus("<input type=\"button\" id=\"hangup\" value=\"Hang up\" onclick=\"hangup()\" />");
    };
    var transitionToWaiting = function() {
        console.debug("transitionToWaiting");
        card.style.webkitTransform = "rotateY(0deg)";
        setTimeout(function() {
            localVideo.src = miniVideo.src;
            miniVideo.src = "";
            remoteVideo.src = "";
        }, 500);
        miniVideo.style.opacity = 0;
        remoteVideo.style.opacity = 0;
        resetStatus();
    };
    var transitionToDone = function() {
        console.debug("transitionToDone");
        localVideo.style.opacity = 0;
        remoteVideo.style.opacity = 0;
        miniVideo.style.opacity = 0;
        setStatus("You have left the call. <a href=\"#TODO:\">Click here</a> to rejoin.");
    };
    //================== External Event Handlers ==================
    this.enterFullScreen = function() {
        //function enterFullScreen() {
        console.debug("enterFullScreen");
        container.webkitRequestFullScreen();
    };
    var toggleVideoMute = function() {
        console.debug("toggleVideoMute");
        // Call the getVideoTracks method via adapter.js.
        var videoTracks = localStream.getVideoTracks();
        if (videoTracks.length === 0) {
            console.log("No local video available.");
            return;
        }
        if (isVideoMuted) {
            for (i = 0; i < videoTracks.length; i++) {
                videoTracks[i].enabled = true;
            }
            console.log("Video unmuted.");
        } else {
            for (i = 0; i < videoTracks.length; i++) {
                videoTracks[i].enabled = false;
            }
            console.log("Video muted.");
        }
        isVideoMuted = !isVideoMuted;
    };
    var toggleAudioMute = function() {
        console.debug("toggleAudioMute");
        // Call the getAudioTracks method via adapter.js.
        var audioTracks = localStream.getAudioTracks();
        if (audioTracks.length === 0) {
            console.log("No local audio available.");
            return;
        }
        if (isAudioMuted) {
            for (i = 0; i < audioTracks.length; i++) {
                audioTracks[i].enabled = true;
            }
            console.log("Audio unmuted.");
        } else {
            for (i = 0; i < audioTracks.length; i++){
                audioTracks[i].enabled = false;
            }
            console.log("Audio muted.");
        }
        isAudioMuted = !isAudioMuted;
    };
    // Send BYE on refreshing(or leaving) a demo page
    // to ensure the room is cleaned for next session.
    window.onbeforeunload = function() {
        console.debug("onbeforeunload");
        sendMessage({type: 'bye'});
    };
    // Ctrl-D: toggle audio mute; Ctrl-E: toggle video mute.
    // On Mac, Command key is instead of Ctrl.
    // Return false to screen out original Chrome shortcuts.
    document.onkeydown = function() {
        console.debug("onkeydown: "+(event.keyChar || event.keyCode));
        if (navigator.appVersion.indexOf("Mac") !== -1) {
            if (event.metaKey && event.keyCode === 68) {
                toggleAudioMute();
                return false;
            }
            if (event.metaKey && event.keyCode === 69) {
                toggleVideoMute();
                return false;
            }
        } else {
            if (event.ctrlKey && event.keyCode === 68) {
                toggleAudioMute();
                return false;
            }
            if (event.ctrlKey && event.keyCode === 69) {
                toggleVideoMute();
                return false;
            }
        }
    };
    //================== Util Methods ==================
    // Set Opus as the default audio codec if it's present.
    var preferOpus = function(sdp) {
        console.debug("preferOpus");
        var sdpLines = sdp.split('\r\n');

        // Search for m line.
        var mLineIndex;
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('m=audio') !== -1) {
                mLineIndex = i;
                break;
            }
        }
        if (mLineIndex === null) {
            return sdp;
        }
        // If Opus is available, set it as the default in m line.
        for (i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('opus/48000') !== -1) {
                var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
                if (opusPayload) {
                    sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
                }
                break;
            }
        }

        // Remove CN in m line and sdp.
        sdpLines = removeCN(sdpLines, mLineIndex);

        sdp = sdpLines.join('\r\n');
        return sdp;
    };
    var extractSdp = function(sdpLine, pattern) {
        console.debug("extractSdp");
        var result = sdpLine.match(pattern);
        return (result && result.length === 2)? result[1]: null;
    };
    // Set the selected codec to the first in m line.
    var setDefaultCodec = function(mLine, payload) {
        console.debug("setDefaultCodec");
        var elements = mLine.split(' ');
        var newLine = [];
        var index = 0;
        for (var i = 0; i < elements.length; i++) {
            if (index === 3) { // Format of media starts from the fourth.
                newLine[index++] = payload; // Put target payload to the first.
            }
            if (elements[i] !== payload) {
                newLine[index++] = elements[i];
            }
        }
        return newLine.join(' ');
    };
    // Strip CN from sdp before CN constraints is ready.
    var removeCN = function(sdpLines, mLineIndex) {
        console.debug("removeCN");
        var mLineElements = sdpLines[mLineIndex].split(' ');
        // Scan from end for the convenience of removing an item.
        for (var i = sdpLines.length-1; i >= 0; i--) {
            var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
            if (payload) {
                var cnPos = mLineElements.indexOf(payload);
                if (cnPos !== -1) {
                    // Remove CN payload from m line.
                    mLineElements.splice(cnPos, 1);
                }
                // Remove CN line in sdp
                sdpLines.splice(i, 1);
            }
        }

        sdpLines[mLineIndex] = mLineElements.join(' ');
        return sdpLines;
    };

    console.debug("call()");
    start("/call/new/?roomId="+call.roomId);
};