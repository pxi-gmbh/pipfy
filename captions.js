// original code by Steve Seguin. All rights reserved. UX-tweaks for a standalone accessibility app by pxi.design with generous permission from Steve

function updateURL(param, force=false) {
  var para = param.split('=');
  if (!(urlParams.has(para[0].toLowerCase()))){
    if (history.pushState){

      var arr = window.location.href.split('?');
      var newurl;
      if (arr.length > 1 && arr[1] !== '') {
        newurl = window.location.href + '&' +param;
      } else {
        newurl = window.location.href + '?' +param;
      }

      window.history.pushState({path:newurl},'',newurl);
    }
  } else if (force){
    if (history.pushState){
      var href = new URL(window.location.href);
      if (para.length==1){
        href.searchParams.set(para[0].toLowerCase(), "");
      } else {
        href.searchParams.set(para[0].toLowerCase(), para[1]);
      }
      log(href.toString());
      window.history.pushState({path:href.toString()},'',href.toString());
    }
  }
}


(function (w) {
  w.URLSearchParams = w.URLSearchParams || function (searchString) {
    var self = this;
    self.searchString = searchString;
    self.get = function (name) {
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(self.searchString);
      if (results == null) {
        return null;
      }
      else {
        return decodeURI(results[1]) || 0;
      }
    };
  };

})(window);
var urlParams = new URLSearchParams(window.location.search);


function generateStreamID(){
  var text = "";
  var possible = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  for (var i = 0; i < 7; i++){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var roomID = "test";

if (urlParams.has("room")){
  roomID = urlParams.get("room");
} else if (urlParams.has("ROOM")){
  roomID = urlParams.get("ROOM");
} else {
  roomID = generateStreamID();
  updateURL("room="+roomID);
}

var myLang = "en-US";
if (urlParams.has("lang")){
  myLang = urlParams.get("lang");
} else {
  updateURL("lang="+myLang);
}

console.log("Language: "+myLang);


var counter=0;
var url = document.URL.substr(0,document.URL.lastIndexOf('/'));

document.getElementById("shareLink").href= url+"/overlay?room="+roomID;
document.getElementById("shareLink").innerHTML = url+"/overlay?room="+roomID;

navigator.clipboard.writeText(url+"/textout?room="+roomID).then(() => {
    /* clipboard successfully set */
  }, () => {
    /* clipboard write failed */
  });

var socket = new WebSocket("wss://api.action.wtf:666");

socket.onclose = function (){
  setTimeout(function(){window.location.reload(true);},100);
};

socket.onopen = function (){
  socket.send(JSON.stringify({"join":roomID}));
}

var final_transcript = '';
var interim_transcript = "";
var idle = null;
setup();
function setup(){
  if ('webkitSpeechRecognition' in window){
    var recognition = new webkitSpeechRecognition();
    if (myLang){
      recognition.lang = myLang;
    }
    recognition.continuous = true;
    recognition.interimResults = true;


    recognition.onstart = function(){
      console.log("started transcription");

    };
    recognition.onerror = function(event){
      console.log(event);
    };
    recognition.onend = function(e){
      console.log(e);
      console.log("Stopped transcription");
      setup();
    };
    recognition.onresult = function(event){
      counter+=1;
      var interim_transcript = '';
      if(typeof(event.results) == 'undefined'){
        //console.log("ended");
        //recognition.onend = null;
        //recognition.stop();
        console.log(event);
        return;
      }
      for(var i = event.resultIndex; i < event.results.length; ++i){
        if(event.results[i].isFinal){
          final_transcript += event.results[i][0].transcript;
        } else {
          interim_transcript += event.results[i][0].transcript;
        }
      }

      //final_transcript = final_transcript.toUpperCase();
      //interim_transcript = interim_transcript.toUpperCase();

      if (final_transcript){
        console.log("FINAL:", final_transcript);
        //final_transcript = final_transcript.split(" ");
        final_transcript = "<span id='final_"+counter+"'>"+final_transcript+"</span><br />";

        document.getElementById("output").innerHTML+=final_transcript;
        document.getElementById("interm").innerHTML="";

        try {
          socket.send(JSON.stringify({"msg":true, "final":final_transcript, "id":counter}));
          final_transcript="";
          interim_transcript="";
        } catch(e){

        }

      } else {
        console.log("INTERM:", interim_transcript);
        interim_transcript = "<span>"+interim_transcript+"</span><br />";
        document.getElementById("interm").innerHTML=interim_transcript;
        try {
          socket.send(JSON.stringify({"msg":true, "interm":interim_transcript, "id":counter}));
        } catch(e){
            interim_transcript="";
        }
      }

      //if (idle){
      //	clearInterval(idle);
      //}
      //idle = setTimeout(function(){
      //	document.getElementById("output").innerHTML="";
      //	document.getElementById("interm").innerHTML="";
      //},10000);

    };

    //recognition.lang = 'en-US';
    recognition.start();
  }
}
