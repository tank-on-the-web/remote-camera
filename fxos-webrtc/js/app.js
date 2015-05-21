window.addEventListener("load", function() {
  var video = document.getElementById('remote-video');
  var control = document.getElementById('control');
  var viewer = document.getElementById('viewer');
  var indicator = document.getElementById('indicator');
  var localStream = null;
  
  // ---------------------- video handling -----------------------
  function startVideo(cb) {
    var callback = (cb || function() {});
    navigator.getUserMedia(
      { video: true, audio: false },
      streamSuccess,
      streamError
    );
    function streamSuccess(stream) {
      localStream = stream;
      video.src = window.URL.createObjectURL(stream);
      video.play();
      hide(control);
      show(viewer);
      callback(stream);
    }
    function streamError(error) {
      console.error('An error occurred: [CODE ' + error + ']');
      console.dir(error);
      return;
    }
  }

  // stop local video
  function stopVideo() {
    video.src = "";
    localStream.stop();
  }

  function hide(elm) {
    elm.style.display = 'none';
  }

  function show(elm) {
    elm.style.display = 'block';
  }

  var storedServer = window.localStorage.getItem('signalServer');
  if (storedServer) {
    document.getElementById('server').value = storedServer;
  }

  WebRTC.onAddStream = function onRemoteStreamAdded(event) {
    console.log("Remote stream added");
    video.src = window.URL.createObjectURL(event.stream);
    hide(indicator);
    show(viewer);
  };

  WebRTC.onRemoveStream = function onRemoteStreamRemoved(event) {
    console.log("Remote stream removed");
    video.src = "";
  };

  document.getElementById('start-listener').onclick = () => {
    var server = document.getElementById('server').value;
    window.localStorage.setItem('signalServer', server);
    WebRTC.init(server);
    hide(control);
    show(indicator);
  };

  document.getElementById('connect').onclick = () => {
    startVideo((stream) => {
      var server = document.getElementById('server').value;
      window.localStorage.setItem('signalServer', server);
      WebRTC.init(server, () => {
        WebRTC.setStream(localStream);
        WebRTC.connect();
      });
    });
  };
  // document.getElementById('stop-video').onclick = stopVideo;
  // document.getElementById('hang-up').onclick = () => { WebRTC.hangUp(); }
});
