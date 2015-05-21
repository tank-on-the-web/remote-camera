(function() {
  var localStream = null;
  var peerConnection = null;
  var peerStarted = false;
  var mediaConstraints = {'mandatory': {'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true }};
  if (navigator.mozGetUserMedia) {
    // Mandatory/optional in createOffer options is deprecated!
    // Use {"offerToReceiveAudio":true,"offerToReceiveVideo":true}
    // instead (note the case difference)!
    mediaConstraints = {'offerToReceiveAudio':false, 'offerToReceiveVideo':true };
  }

  // ---- socket ------
  // create socket
  var socketReady = false;
  var port = 9001;
  var socket;

  function openSocket(server, cb) {
    var callback = (cb || function () {});
    var url = 'http://' + server + '/';
    socket = io.connect(url);
    // socket: channel connected
    socket.on('connect', function (evt) {
      onOpened(evt);
      callback();
    }).on('message', onMessage);
  }
 
  function onOpened(evt) {
    console.log('socket opened.');
    socketReady = true;
  }
 
  // socket: accept connection request
  function onMessage(evt) {
    if (evt.type === 'offer') {
      console.log("Received offer, set offer, sending answer....")
      onOffer(evt);      
    } else if (evt.type === 'answer' && peerStarted) {
      console.log('Received answer, settinng answer SDP');
      onAnswer(evt);
    } else if (evt.type === 'candidate' && peerStarted) {
      console.log('Received ICE candidate...');
      onCandidate(evt);
    } else if (evt.type === 'user dissconnected' && peerStarted) {
      console.log("disconnected");
      stop();
    }
  }

  // ----------------- handshake --------------
  var textForSendSDP;
  var textForSendICE;
  var textToReceiveSDP;
  var textToReceiveICE;
  var iceSeparator = '------ ICE Candidate -------';
  var CR = String.fromCharCode(13);
  
  function onSDP() {
    console.log("onSDP()");
    var text = textToReceiveSDP;
    var evt = JSON.parse(text);
    if (peerConnection) {
      onAnswer(evt);
    }
    else { // receiver
      onOffer(evt);
    }
    
    textToReceiveSDP = "";
  }  
  
  //--- multi ICE candidate ---
  function onICE() {
    console.log("onICE()");
    var text = textToReceiveICE;
    var arr = text.split(iceSeparator);
    for (var i = 1, len = arr.length; i < len; i++) {
      var evt = JSON.parse(arr[i]);
      onCandidate(evt);
    }

    textToReceiveICE = "";
  }
  
  function onOffer(evt) {
    console.log("onOffer()")
    console.log(evt);
    setOffer(evt);
    sendAnswer(evt);
    peerStarted = true;
  }
  
  function onAnswer(evt) {
    console.log("onAnswer()")
    console.log(evt);
    setAnswer(evt);
  }
  
  function onCandidate(evt) {
    var candidate = new RTCIceCandidate({sdpMLineIndex:evt.sdpMLineIndex, sdpMid:evt.sdpMid, candidate:evt.candidate});
    console.log("onCandidate()")
    console.log(candidate);
    peerConnection.addIceCandidate(candidate);
  }

  function sendSDP(sdp) {
    var text = JSON.stringify(sdp);
    console.log("sendSDP()");
    console.log(text);
    
    textForSendSDP = text;
    // send via socket
    socket.json.send(sdp);
  }
  
  function sendCandidate(candidate) {
    var text = JSON.stringify(candidate);
    console.log("sendCandidate()"); 
    console.log(text);

    textForSendICE = (textForSendICE + CR + iceSeparator + CR + text + CR);

    // send via socket
    socket.json.send(candidate);
  }

  // ---------------------- connection handling -----------------------
  function prepareNewConnection() {
    console.log('prepareNewConnection()');
    var pc_config = {"iceServers":[]};
    var peer = null;
    try {
      peer = new RTCPeerConnection(pc_config);
    } catch (e) {
      console.log("Failed to create peerConnection, exception: " + e.message);
    }

    // send any ice candidates to the other peer
    peer.onicecandidate = function (evt) {
      console.log('*** onicecandidate ***');
      if (evt.candidate) {
        console.log(evt.candidate);
        sendCandidate(
          {
            type: "candidate", 
            sdpMLineIndex: evt.candidate.sdpMLineIndex,
            sdpMid: evt.candidate.sdpMid,
            candidate: evt.candidate.candidate
          }
        );
      } else {
        console.log("End of candidates. ------------------- phase=" + evt.eventPhase);
      }
    };

    if (localStream) {
      console.log('Adding local stream...');
      peer.addStream(localStream);
    }
    peer.addEventListener("addstream", WebRTC.onAddStream, false);
    peer.addEventListener("removestream", WebRTC.onRemoveStream, false)

    return peer;
  }

  function sendOffer() {
    peerConnection = prepareNewConnection();
    peerConnection.createOffer(function (sessionDescription) { // in case of success
      peerConnection.setLocalDescription(sessionDescription);
      console.log("Sending: SDP");
      console.log(sessionDescription);
      sendSDP(sessionDescription);
    }, function (evt) { // in case of error
      console.log("Create Offer failed");
      alert("Create Offer failed: " + (evt.name ? evt.name : ""));
    }, mediaConstraints);
  }

  function setOffer(evt) {
    if (peerConnection) {
      console.error('peerConnection alreay exist!');
    }
    peerConnection = prepareNewConnection();
    peerConnection.setRemoteDescription(new RTCSessionDescription(evt));
  }
  
  function sendAnswer(evt) {
    console.log('sending Answer. Creating remote session description...' );
    if (! peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }
  
    peerConnection.createAnswer(function (sessionDescription) { // in case of success
      peerConnection.setLocalDescription(sessionDescription);
      console.log("Sending: SDP");
      console.log(sessionDescription);
      sendSDP(sessionDescription);
    }, function () { // in case of error
      console.log("Create Answer failed");
    }, mediaConstraints);
  }

  function setAnswer(evt) {
    if (! peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }
    peerConnection.setRemoteDescription(new RTCSessionDescription(evt));
  }
  
  // -------- handling user UI event -----
  function init(server, callback) {
    var cb = (callback || function () {});
    openSocket(server, cb);
  }

  function setStream(stream) {
    localStream = stream;
  }

  // start the connection upon user request
  function connect() {
    if (!peerStarted && localStream) {
      sendOffer();
      peerStarted = true;
    } else {
      alert("Local stream not running yet - try again.");
    }
  }

  // stop the connection upon user request
  function hangUp() {
    console.log("Hang up.");
    peerConnection.close();
    peerConnection = null;
    peerStarted = false;
  }

  // -------- export ---------
  window.WebRTC = (window.WebRTC || {});
  WebRTC.init = init;
  WebRTC.setStream = setStream;
  WebRTC.connect = connect;
  WebRTC.hangUp = hangUp;
  WebRTC.onAddStream = function() {};
  WebRTC.onRemoveStream = function() {};

})();
