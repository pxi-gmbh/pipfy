var inputstream;
var outputstream;

function captureVideo() {
  let video = document.getElementById('inputvideo');
  video.addEventListener('canplay', function() {
    //mirror(); //as we dont want to mirror alway, only if needed
    document.body.classList.add('video-active');
    changeOutput(false);
  })

  navigator.mediaDevices.getUserMedia({
    video: true
  }).then((stream) => {
    document.getElementById('inputvideo').srcObject = stream;
    inputstream = stream;
  });
}

async function pipClick() {
  console.log('requesting picture in picture')
  resp = await document.getElementById('outputvideo').requestPictureInPicture();
  console.log(resp);
};
var ongoingloop = false;
var loopTimeout;
var crop = {
  x: 0,
  y: 0,
  width:640,
  height:480,
  resize:false,
  maxInputWidth:640,
};
var inputvideo;

async function videoToCanvas(activateMirror) {
  let canvas = document.getElementById('canvas');
  if (ongoingloop) {
    //stop old loop:
    clearTimeout(loopTimeout);
    ctx = null;
    //destroy old canvas:
    let newCanvas = document.createElement('canvas');
    newCanvas.id = 'canvas';
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    canvas.parentElement.replaceChild(newCanvas, canvas);
    canvas = newCanvas;
    ongoingloop = false;
  }
  let video = inputvideo || document.getElementById('inputvideo');
  if (!inputvideo) inputvideo = video;
  let output = document.getElementById('outputvideo');
  var ctx = canvas.getContext('2d');
  var loop = function() {
    ctx.drawImage(inputvideo, crop.x, crop.y,crop.width, crop.height);
    if (ongoingloop) loopTimeout = setTimeout(loop, 10);
  }
  if (activateMirror) {
    ctx.translate(video.videoWidth, 0);
    ctx.scale(-1, 1);
  }
  if (!ongoingloop) {
    ongoingloop = true;
    loop();
    canvasToVideo(activateMirror);
  }
}

function canvasToVideo(mirroractive) {
  let canvas = document.getElementById('canvas');
  if (outputstream) outputstream = undefined;
  outputstream = canvas.captureStream(25);
  changeOutput(mirroractive, true);
}
var isMirror = false;

function changeOutput(toMirror, toCanvas) {
  if ((toMirror || toCanvas) && !ongoingloop) {
    videoToCanvas(toMirror);
    return;
  }
  isMirror = toMirror;
  document.body.classList.toggle('mirror-active', isMirror);
  let output = document.getElementById('outputvideo');
  if (isMirror || toCanvas){
    output.srcObject = outputstream;
    console.log('canvas-stream activated');
  }else {
    output.srcObject = inputstream;
    console.log('direct-stream activated');
  }
//  let canvas = document.getElementById('canvas');
//  if(hasToResize)this.setCanvasSize(canvas.width, canvas.height);

}



function toggleMirror(toMirror){
  let output = document.getElementById('outputvideo');
  let inputV = document.getElementById('inputvideo');
  let hasToResize = inputV.videoWidth>output.videoWidth || inputV.videoHeight > output.videoHeight;
  isMirror=toMirror;
  if(toMirror || hasToResize){
    calculateCrop();
    videoToCanvas(isMirror);
  }else{
    changeOutput(toMirror);
  }
}

function calculateCrop() {
  let input = document.getElementById('inputvideo');
  let output = document.getElementById('canvas');
  let inputWidth = input.videoWidth;
  let inputHeight = input.videoHeight;
  let inputFormat = inputWidth/inputHeight;
  if(inputWidth>crop.maxInputWidth){
      inputWidth=crop.maxInputWidth;
      inputHeight=inputWidth/inputFormat;
      crop.width=inputWidth;
      crop.height=inputHeight;
      crop.inputWidth=input.videoWidth;
      crop.inputHeight=input.videoHeight;
      crop.inputFormat=inputFormat;
  }

  let outputWidth = output.width;
  let outputHeight = output.height;

  let diffX = inputWidth - outputWidth;
  let diffY = inputHeight - outputHeight;
  if (diffX > 0) crop.x = 0 - Math.floor(diffX / 2);
  else crop.x = 0;
  if (isMirror) crop.x *= -1;
  if (diffY > 0) crop.y = 0 - Math.floor(diffY / 2);
  else crop.y = 0;

  crop.middleX = crop.x;
  crop.middleY = crop.y;
  rangeX = document.getElementById("moveCropX");
  rangeY = document.getElementById("moveCropY");
  rangeX.value = 50;
  rangeY.value = 50;
  rangeX.classList.toggle("active", (diffX > 0));
  rangeY.classList.toggle("active", (diffY > 0));
}

function setCanvasSize(width, height, button) {
  let canvas = document.getElementById('canvas');
  canvas.width = width;
  canvas.height = height;
  let inputV = document.getElementById('inputvideo');
  let hasToResize = inputV.videoWidth>width || inputV.videoHeight > height;
  if(button){
    let allbuttons = document.getElementsByClassName('set-aspect-ratio');
    for(let i=0;i<allbuttons.length;i++)allbuttons[i].classList.remove('selected');
    button.classList.add('selected');
  }
  console.log('has to resize:',hasToResize);
  if(!hasToResize && !isMirror){
    changeOutput();
    return;
  }
  calculateCrop();
  videoToCanvas(isMirror);
}

function moveCanvasX(percent) {
  let canvas = document.getElementById('canvas');
  let pixPerPercent = canvas.width / 100;
  //if((percent>50 && !isMirror) || (percent<50&& isMirror) ){
  if (percent > 50) {
    crop.x = crop.middleX + (percent - 50) * pixPerPercent;
  } else {
    crop.x = crop.middleX - (50 - percent) * pixPerPercent;
    //if(crop.x<0)crop.x=0;
  }
}

function moveCanvasY(percent) {
  let canvas = document.getElementById('canvas');
  let pixPerPercent = canvas.height / 100;
  if (percent > 50) {
    crop.y = crop.middleY + (percent - 50) * pixPerPercent;
  } else {
    crop.y = crop.middleY - (50 - percent) * pixPerPercent;
  }
}
