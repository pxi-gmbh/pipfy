var captions = {
  recognition:null,
  finalTranscript : '',
  interims: [],
  finals:[],
  starttime:Date.now(),
  output: null,
  output2: null,
  init: function(){
    this.output = document.getElementById('output');
    this.output2 = document.getElementById('output2');
    if(location.search.length>1){
      //easy solution: if there are search-params we are passive
      this.startPassiveWebsocket();
      return;
    }
    this.initCaption(); //we are active, so start initCaption

  },
  initCaption: function(){
    this.recognition = new webkitSpeechRecognition();
    this.recognition.continuous = true;
    // this.recognition.continuous = true;
    this.recognition.interimResults = true;
    //this.recognition.lang = navigator.languages[0] || navigator.language || 'en';
    let lang = navigator.languages[0] || navigator.language || 'en';
    this.selectLanguage(lang);
    this.recognition.onresult = function(event){
      let interimTranscript = '';
      console.log('result coming in');
      for (var x=event.resultIndex;x<event.results.length;++x){
        if(event.results[x].isFinal){
          captions.finalTranscript+=event.results[x][0].transcript;
          captions.displayLastFinal(event.results[x][0].transcript);
          captions.finals.push({timestamp:Date.now()-captions.starttime,content:event.results[x][0].transcript});
        }else{
          interimTranscript+=event.results[x][0].transcript;
        }
      }
      console.log('result fetched', interimTranscript);
      captions.interims.push({timestamp:Date.now()-captions.starttime,content:interimTranscript});
      captions.displayText(interimTranscript); //thats the one we are looking for i guess
    }
    this.recognition.onstart = function(event){
      console.log('recognition started');
      captions.starttime = Date.now();
      captions.isRunning = true;
      document.getElementById('debug-div').innerText="ongoing record";
    }
    this.recognition.onaudiostart = function(event){
      console.log('audio started')
    }
    this.recognition.onaudioend = function(event){
      console.log('audio ended')
    }
    this.recognition.onend = function(event){
      console.log('recognition ended');
      let debugstring = "time elapsed:"+(Date.now()-captions.starttime)+"\n";
      debugstring += "finals:\n";
      let finals = JSON.stringify(captions.finals);
      debugstring+=finals;
      debugstring+="interims:\n";
      debugstring+= JSON.stringify(captions.interims);
      document.getElementById('debug-div').innerText=debugstring;
      captions.isRunning = false;
      if(captions.shouldRun)this.start();
    }
    this.recognition.onerror = function(err){
      console.error('recognition error',err)
    }

  },
  displayText: function(text){
    this.output.innerText = text; //thats the one which is allways the latest so use this
    this.output2.innerText = this.finalTranscript; //not really necesary
    if(this.pipify.active)this.pipify.writeText(text);
    if(this.transmitOverWebsocket)this.sendSync(text);
  },
  displayLastFinal: function(text){
    let newFinal = document.createElement('span');
    newFinal.classList.add('last-final');
    newFinal.innerText=text;
    let wr = document.getElementById('outputwrapper');
    let op = document.getElementById('output');
    wr.insertBefore(newFinal, op);
    op.innerText=" ";
    if(this.pipify.active)this.pipify.pushFinal(text);
    setTimeout(this.removeLastFinal, 2000);
  },
  removeLastFinal: function(){
    let allFinals = document.getElementsByClassName('last-final');
    if(allFinals[0])allFinals[0].parentElement.removeChild(allFinals[0]);
    if(captions.pipify.active)captions.pipify.deleteFinal();
  },
  start: function(){
    this.shouldRun = true;
    document.body.classList.add('status-recording');
    this.recognition.start();

  },
  stop: function(){
    this.shouldRun = false;
    this.recognition.stop();
    document.body.classList.remove('status-recording');
    //this.recognition.abort();
  },
  toggleCaption: function(){
    if(this.isRunning)this.stop();
    else this.start();
  },
  selectLanguage: function(lang){
    this.recognition.lang = lang;
    document.getElementById('caption-language-value').innerText=lang;
    document.getElementById('dialog--language').classList.add('hidden');
  },
  //websocket related stuff:
  startWebsocket: function(options){
    ws.init(options.passive);
  },
  stopWebsocket: function(){
    document.getElementById('captions-startws').classList.remove('hidden');
    document.getElementById('captions-stopws').classList.add('hidden');
    let ldiv = document.getElementById('shareLink');
    ldiv.innerText=this.standardShareLinkText;
    ldiv.href='#';
  },
  startPassiveWebsocket: function(){
    let search = location.search;
    let roompos=search.indexOf('r=')+2;
    let dpos = search.indexOf('&',roompos);
    let pwpos = search.indexOf('p=')+2;
    if(pwpos<=1 && roompos<=1){
      console.warn('no room or password found in url');
      return;
    }
    let roomid = search.substring(roompos,dpos);
    let pw = search.substring(pwpos);
    this.guardian.password=pw;
    ws.room = roomid;
    this.startWebsocket({passive:true});
  },
  startActiveWebsocket: function(){
    let pw = this.generatePw();
    this.guardian.password = pw;
    this.transmitOverWebsocket = true;
    this.startWebsocket({});

    document.getElementById('captions-startws').classList.add('hidden');
    document.getElementById('captions-stopws').classList.remove('hidden');
  },
  showLink: function(){
    let link = location.href + '?r='+ws.room+'&p='+this.guardian.password;
    let ldiv = document.getElementById('shareLink');
    this.standardShareLinkText = ldiv.innerText;
    ldiv.innerText=link;
    ldiv.href=link;
  },
  showLanguageDialog: function(){
    document.getElementById('dialog--language').classList.remove('hidden');
    this.showLanguageRecomendation('');
  },
  showLanguageRecomendation: function(text){
    let poslangs = lookForLang(text);
    let res = '';
    for (var x=0;x<poslangs.length;x++){
      res+=`<button onclick="captions.selectLanguage('${poslangs[x]}');">`+poslangs[x]+'</button>';
    }
    document.getElementById('language-recomendation').innerHTML=res;
    document.getElementById('language-selection-field').classList.toggle('error',(poslangs.length==0));
  },
  generatePw: function(length){
    let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let strength = length || 20;
    let pw = "";
    for (var x=0;x<strength;x++){
      pw+=chars[Math.floor(Math.random()*chars.length)];
    }
    return pw;
  },
  encryptText: async function(text){
    let enct = await this.guardian.encryptText(text, this.guardian.password);
    return enct;
  },
  decryptText: async function(text){
    // let stt=Date.now();
    let dect = await this.guardian.decryptText(text,this.guardian.password);
    // console.log(">>",dect,"\ndecryption time",(stt-Date.now()))
    return dect;
  },
  recieveSync: async function(text){
    let dectext = await this.decryptText(text);
    // console.log(text,dectext);
    this.displayText(dectext);
  },
  sendSync: async function(text, final){
    let enctext = await this.encryptText(text);
    ws.sendMessage(enctext, 'sync');
  },
}

// captions.init();

var ws = {
  server:null,
  init: async function(passive){
    console.log('start websocket in mode passive?',passive);
    if(this.server===null){
      this.server = await new WebSocket("wss://compad.pxi.gmbh/ws/");
    }
    this.server.onopen = function(){ws.init2(passive);};
  },
  init2: function(passive){
    console.log('websocket created');
    if(passive){
      document.body.classList.add('status--passive');
      this.sendMessage(this.room,'joinRoom');
      this.server.onmessage = function incoming(msg){
            let data;
            if(msg.data==="pong"){
              console.log("heartBeat websocket: pong", new Date());
              return;
            }
            try{
                data = JSON.parse(msg.data);
            }catch(e){
                console.log(e, msg);
                return;
            };
          // console.log("recieved message:",data);
            if(data.action==="sync"){
                captions.recieveSync(data.msg);
            }
            if(data.action==="init"){
                ws.id = data.id;
                // videoconf.showInitMessage(data.msg);
            }
        }; //end of onmessage

    }else{
      this.sendMessage('','createRoom');
      this.server.onmessage = function incoming(msg){
            let data;
            if(msg.data==="pong"){
              console.log("heartBeat websocket: pong", new Date());
              return;
            }
            try{
                data = JSON.parse(msg.data);
            }catch(e){
                console.log(e, msg);
                return;
            };
          // console.log("recieved message:",data);

            if(data.action==="init"){
                ws.id = data.id;
                // videoconf.showInitMessage(data.msg);
            }
            if(data.action==="initCreator"){
              ws.isCreator = true;
              document.body.classList.add("websocket--active");
              ws.room = data.roomid;
              captions.showLink();
              // localStorage.setItem("videoconftools",JSON.stringify({username:ws.username,room:ws.room,id:ws.id}));
              // ws.sendMessage(ws.room,"joinRoom");
              // videoconf.showInviteLinks();
              // if(ws.username===undefined)videoconf.setUserName("creator");
            }
        }; //end of onmessage

    }

  },
  sendMessage : function(msg, action, options){
    let data = {msg:msg, room:this.room, action:action, options:options, senderId:this.id};
    if(this.server===null){
      console.warn("cant send message - no websocket-server found");
    }else{
      this.server.send(JSON.stringify(data));
    }
  },
  heartBeat : function(){
    this.sendMessage({type:"heartBeat"},"heartBeat");
    console.log("heartbeat:",new Date());
    this.heartBeatTimer = setTimeout("ws.heartBeat()",10000); //send heartBeat every 10sec to keep alive
  },
}


//cryptography:

captions.guardian = {
    ivlength:8,
    iv:null,
    password:null,
    crypto:window.crypto,


}
captions.guardian.decryptText = async function(text, password){
    let encBufferString = text;
	    //getting iv of string:
    let iv = new Uint8Array(this.ivlength); //create empty ivarray
    for(let i=0;i<this.ivlength;i++)iv[i]=encBufferString.charCodeAt(i)-255;
    this.iv = iv;
    encBufferString = encBufferString.substring(this.ivlength);//delete iv-chars from string
    let buffer = new Uint8Array(encBufferString.length);
    for(let i=0;i<encBufferString.length;i++)buffer[i]=encBufferString.charCodeAt(i)-255;
    let decText = await this.decrypt(buffer.buffer, this.iv, password); //decrypt ArrayBuffer
    return decText;
}

captions.guardian.decrypt = async function(buffer, iv, pw){
  let keyguardian = await this.createKey(iv, pw);
// console.log("decoding starts");
  let plainTextBuffer;
  try{
    plainTextBuffer = await this.crypto.subtle.decrypt(keyguardian.alg, keyguardian.key, buffer);
  } catch(e){
    console.log(e);
    console.log("decryption has failed!");
    return "decryption has failed";
  }
// console.log("decoding has ended");
  return new TextDecoder().decode(plainTextBuffer); //TODO: error-handling
}

captions.guardian.encryptText = async function(text, password){
   var plaintext = text;
   var encresult = await this.encrypt(plaintext, password);
   if(encresult.iv===null||encresult.encbuffer===null)return false;
   var enctext = this.encBufferToString(encresult);
   return enctext;
}

captions.guardian.encrypt = async function(plaintext, pw){
// console.log("encrypt plaintext:"+plaintext.substring(0,20));
  let plainTextUtf8 = new TextEncoder().encode(plaintext); //changing into UTF-8-Array
  let keyguardian = await this.createKey(null, pw);
  if(keyguardian==null)return {encbuffer:null, iv:null};
  //this.iv = keyguardian.iv;
  let encbuffer = await crypto.subtle.encrypt(keyguardian.alg, keyguardian.key, plainTextUtf8);
  return {encbuffer: encbuffer, iv:keyguardian.iv};
}

captions.guardian.encBufferToString = function(encResult){
  let encTextBuffer = encResult.encbuffer;
  let iv = encResult.iv;
  //getting only displayable chars without control-chars:
  let utf8array = new Uint8Array(encTextBuffer); //changing into utf8-Array
  //console.log(utf8array);
  let utf8string = ""; //starting new string for utf8
  for(let i =0; i<utf8array.length;i++){
    utf8string+=String.fromCharCode(utf8array[i]+255); //fill string with save values
  }
  //converting iv to string with same method:
  let ivstring="";
  for(let i=0; i<iv.length;i++)ivstring+=String.fromCharCode(iv[i]+255);
  return ivstring+utf8string;//save iv in front of code
}

captions.guardian.createKey = async function(iv, passw){
// console.log("creating Key with iv"+iv);
  let password = passw;
  if(this.password ==null && passw==null)return;
  if(passw==null)password = this.password;
  let pwUtf8 = new TextEncoder().encode(password);
  let passwordHash = await this.crypto.subtle.digest('SHA-256', pwUtf8);
  let keyguardian = {};
  if(iv==null){
    keyguardian.iv = crypto.getRandomValues(new Uint8Array(this.ivlength));
  }else{
    keyguardian.iv = iv;
  }
  keyguardian.alg = { name: 'AES-GCM', iv: keyguardian.iv };
  keyguardian.key = await crypto.subtle.importKey('raw', passwordHash, keyguardian.alg, false, ['encrypt', 'decrypt']);
// console.log("key created");
  return keyguardian;
}

//pipify:
captions.pipify = {
  // finals:[],
  lastFinal:'',
  active:false,
  fontsize:30,
  init: function(){
  },
  toggle: async function(){
    this.active=!this.active;
    if(this.active){
      //activate/prepare pip
      document.body.classList.add('status--pip')
      //write some blank text to get video preview visible:
      this.writeText(' ');
      let canvas = document.getElementById("pipcanvas");
      let outputstream = canvas.captureStream(25);
      let output = document.getElementById('outputvideo');
      output.srcObject = outputstream;
      output.addEventListener('loadedmetadata',
        function(){
          console.log('video is ready, start pip');
          captions.pipify.activatePip();
        }
      )
    }else{
      //deactivate pip if active
      document.body.classList.remove('status--pip');
      document.exitPictureInPicture();
    }
  },
  activatePip: async function() {
    if(this.pipelement && this.pipelement.width>0)return;
    this.writeText('<<starting pip...>>')
    console.log('requesting picture in picture')
    let op = document.getElementById('outputvideo')
    op.addEventListener('enterpictureinpicture',function(){
      document.body.classList.add('status--pip-active');
      console.log('op started pip');
      setTimeout("captions.pipify.writeText('<<pip started>>');",500);
    });
    op.addEventListener('leavepictureinpicture',function(){
      document.body.classList.remove('status--pip-active');
      console.log('closed picture in picture');
      setTimeout("captions.pipify.writeText('<<pip ended>>');",500);
    });
    this.pipelement = await op.requestPictureInPicture();

  // console.log(this.pipelement);
  },
  writeText: function(text){
    this.lastInterim = text;
    let res="";
    // if(this.finals.length>0)res+=this.finals.join('. ')+'. ';
    if(this.lastFinalTime && Date.now()-this.lastFinalTime<2000)res+=this.lastFinal;
    res+=text;
    let canvas = document.getElementById("pipcanvas");
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = this.fontsize+"px Comic Sans MS";
    ctx.textBaseline = "bottom";
    let posy = canvas.height - 10;
    ctx.textAlign="right";
    let posx=canvas.width-10;
    ctx.fillText(res, posx, posy);
  },
  pushFinal: function(text){
    // this.finals.push(text);
    this.lastFinal=text;
    this.lastFinalTime=Date.now();
  },
  deleteFinal: function(){
    // this.finals.shift();
    // this.writeText(this.lastInterim);
  },
  changeWidth: function(width){
    let canvas = document.getElementById("pipcanvas");
    canvas.width = width;
    this.writeText('<<width changed>>');
  },
  changeFontsize: function(size){
    this.fontsize=size*1;
    let canvas = document.getElementById("pipcanvas");
    canvas.height=this.fontsize+20;
    this.writeText('<<fontsize changed>>');
  },

}
//possible languages:
var availablelangs =
[['Afrikaans',       ['af-ZA']],
 ['Bahasa Indonesia',['id-ID']],
 ['Bahasa Melayu',   ['ms-MY']],
 ['Català',          ['ca-ES']],
 ['Čeština',         ['cs-CZ']],
 ['Deutsch',         ['de-DE']],
 ['English',         ['en-AU', 'Australia'],
                     ['en-CA', 'Canada'],
                     ['en-IN', 'India'],
                     ['en-NZ', 'New Zealand'],
                     ['en-ZA', 'South Africa'],
                     ['en-GB', 'United Kingdom'],
                     ['en-US', 'United States']],
 ['Español',         ['es-AR', 'Argentina'],
                     ['es-BO', 'Bolivia'],
                     ['es-CL', 'Chile'],
                     ['es-CO', 'Colombia'],
                     ['es-CR', 'Costa Rica'],
                     ['es-EC', 'Ecuador'],
                     ['es-SV', 'El Salvador'],
                     ['es-ES', 'España'],
                     ['es-US', 'Estados Unidos'],
                     ['es-GT', 'Guatemala'],
                     ['es-HN', 'Honduras'],
                     ['es-MX', 'México'],
                     ['es-NI', 'Nicaragua'],
                     ['es-PA', 'Panamá'],
                     ['es-PY', 'Paraguay'],
                     ['es-PE', 'Perú'],
                     ['es-PR', 'Puerto Rico'],
                     ['es-DO', 'República Dominicana'],
                     ['es-UY', 'Uruguay'],
                     ['es-VE', 'Venezuela']],
 ['Euskara',         ['eu-ES']],
 ['Français',        ['fr-FR']],
 ['Galego',          ['gl-ES']],
 ['Hrvatski',        ['hr_HR']],
 ['IsiZulu',         ['zu-ZA']],
 ['Íslenska',        ['is-IS']],
 ['Italiano',        ['it-IT', 'Italia'],
                     ['it-CH', 'Svizzera']],
 ['Magyar',          ['hu-HU']],
 ['Nederlands',      ['nl-NL']],
 ['Norsk bokmål',    ['nb-NO']],
 ['Polski',          ['pl-PL']],
 ['Português',       ['pt-BR', 'Brasil'],
                     ['pt-PT', 'Portugal']],
 ['Română',          ['ro-RO']],
 ['Slovenčina',      ['sk-SK']],
 ['Suomi',           ['fi-FI']],
 ['Svenska',         ['sv-SE']],
 ['Türkçe',          ['tr-TR']],
 ['български',       ['bg-BG']],
 ['Pусский',         ['ru-RU']],
 ['Српски',          ['sr-RS']],
 ['한국어',            ['ko-KR']],
 ['中文',             ['cmn-Hans-CN', '普通话 (中国大陆)'],
                     ['cmn-Hans-HK', '普通话 (香港)'],
                     ['cmn-Hant-TW', '中文 (台灣)'],
                     ['yue-Hant-HK', '粵語 (香港)']],
 ['日本語',           ['ja-JP']],
 ['Lingua latīna',   ['la']]];

 var langcorts = [];
 for (var x=0;x<availablelangs.length;x++){
   for (var y=1;y<availablelangs[x].length;y++){
     langcorts.push(availablelangs[x][y][0]);
   }
 }

function lookForLang(text){
  let posssibleLanguages = [];
  for (var x=0;x<langcorts.length;x++){
    if(langcorts[x].indexOf(text)>-1)posssibleLanguages.push(langcorts[x]);
  }
  return posssibleLanguages;
}

var tester = {
  sampletext:`as we said, lists are one of the complex elements. as such it has a context menu.
whenever your cursor is in such an element you are offered the context menu context menu at the left side of the editor.
it tells you the type of the element you are in and gives you a helping hand in handling the element. in case of the list element it offers you to change the list type.
this is especially useful because you can mix different list types to get sublists and still keep an overview while in code
  `,
  createWordList: function(text){
      let st = text || this.sampletext;
      st = st.split('\n').join(' \n ');
      st = st.split('.').join(' . ');
      st = st.split(',').join(' , ');
      return st.split(' ');
  },
  simpleTest: async function(count){
    this.wordlist = this.createWordList();
    this.lastStumble = "";
    let done = await this.walkthrough();
    if(count>0){
        console.log('finished run, '+(count-1)+' to go');
        this.simpleTest(count-1);
        return;
    }
    console.log('test is over');
    console.log(done);

  },
  walkthrough: async function(){
    return new Promise((resolve,reject)=>{
      tester.walkList(resolve);
    });
  },
  walkList: async function(resolve){
      if(this.wordlist.length==0){
        resolve('yeah'); //break the loop
        return;
      }
      let act = this.wordlist.shift();
      let wait=200; //wait 100ms
      if(act.indexOf('.')>-1 || act.indexOf(',')>-1 || act.indexOf('\n')>-1){
        wait=400;
        if(act.indexOf('.')){
          wait=600;
          // this.lastStumble='';
          captions.displayLastFinal(this.lastStumble);
          //captions.displayText('');
          this.lastStumble='';
        }
        if(act.indexOf('\n')){
          wait=1000;
          captions.displayLastFinal(this.lastStumble);
          //captions.displayText('');
          this.lastStumble='';
        }
      }else{
        this.lastStumble+=' '+act;
        //speak word:
        captions.displayText(this.lastStumble);
      }
      this.runningTest = setTimeout(function(){tester.walkList(resolve)},wait);

  },

}
