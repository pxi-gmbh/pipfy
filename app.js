function init(){

}
var inputstream;
function captureVideo(){
  let video = document.getElementById('inputvideo');
    video.addEventListener('canplay',function(){
      mirror();
      document.body.classList.add('video-active');
    })

  navigator.mediaDevices.getUserMedia({video:true}).then((stream) => {
    document.getElementById('inputvideo').srcObject = stream;
    inputstream = stream;
  });
}

 async function pipClick() {
  // pipButtonElement.disabled = true;
  console.log('requesting picture in picture')
    resp = await document.getElementById('outputvideo').requestPictureInPicture();
   console.log(resp);
  // pipButtonElement.disabled = false;
 };
 var ongoingloop=false;
 var loopTimeout;
 async function mirror(){
   let video = document.getElementById('inputvideo');
   let canvas = document.getElementById('canvas');
   let output = document.getElementById('outputvideo');
   let ctx = canvas.getContext('2d');
   ctx.translate(video.videoWidth,0);
   ctx.scale(-1,1);
   ongoingloop=true;
   loop = function(){
     ctx.drawImage(video, 0, 0);
     if(ongoingloop)loopTimeout = setTimeout(loop,1000/300);
   }
   loop();
   canvasToVideo(false);
 }
 var outputstream;
 function canvasToVideo(mirroractive){
   let canvas = document.getElementById('canvas');
   outputstream = canvas.captureStream(25);
   changeOutput(mirroractive);
 }
 var isMirror=false;
 function changeOutput(mirror){
   isMirror=mirror;
   document.body.classList.toggle('mirror-active',isMirror);
   let output = document.getElementById('outputvideo');
   if(mirror)output.srcObject=outputstream;
   else output.srcObject=inputstream;
 }

 init();
