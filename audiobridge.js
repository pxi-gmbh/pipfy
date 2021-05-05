microphone = {
  audiocontext: null,
  source: null,
  gainNode: null,
  automute: true,
  volume: 1,
  init: function(killswitch) {
    if (killswitch === false) {
      this.kill();
      return;
    }
    this.audiocontext = new AudioContext();
    this.gainNode = this.audiocontext.createGain();
    navigator.mediaDevices.getUserMedia({
      audio: true
    }).then(function(stream) {
      mic = microphone;
      mic.source = mic.audiocontext.createMediaStreamSource(stream);
      mic.source.connect(mic.gainNode);
      mic.gainNode.connect(mic.audiocontext.destination);
      // jakobs quick hack (does not work)
      document.getElementById('inputvideo').srcObject = stream;
    });
  },
  setVolume: function(volume) {
    if (!this.gainNode) return;
    this.volume = volume;
    if (!this.automute) {
      this.gainNode.gain.value = volume;
    }
  },
  mute: function(activate) {
    if (!this.gainNode) return;
    if(activate=="true" || activate==true)this.gainNode.gain.value = 0;
    else this.gainNode.gain.value=this.volume;
    this.muted = activate=='true';
    console.log(activate, this.muted);
  },
  kill: function() {
    if (!this.source) return;
    var tracks = this.source.mediaStream.getAudioTracks();
    for (var x = 0; x < tracks.length; x++) tracks[x].stop();
    this.audiocontext = null;
    this.source = null;
    this.gainNode = null;
  }
};
