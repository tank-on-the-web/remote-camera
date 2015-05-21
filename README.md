# カメラの動画を送受信する Firefox OS アプリ

- 送信側で getUserMedia で取得した Video stream を WebRTC で受信側に転送する。
- ハコスコで使うことを想定しているので Video stream の送信はあえて片方向。
- 使い方:
    1. 送信側/受信側それぞれに fxos-webrtc をインストール。
    2. webrtc-signalsvr を PC で起動。
    3. 受信側でインストールしたアプリを起動し、PC の IP アドレスを指定して "Wait video stream" を押す。
    4. 送信側もインストールしたアプリを起動し、PC の IP アドレスを指定して "Send video stream" を押す。

Firefox OS でなくても動くはず。

