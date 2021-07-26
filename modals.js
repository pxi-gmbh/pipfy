// modal dialog logic
/*
<aside aria-role="help section" id="help" class="modal--wrapper">
  <!-- not a link to keep it out of tabindex -->
  <span class="modal--background" aria-hidden="true" tabindex="-1" onclick="location.hash='#close'"></span>
  <!-- trap buttons wrap the content. js will move user focus when triggered -->
  <button id="help--trap-top" class="is-invisible">start of help modal, jump to last focusable element</button>
  <div class="modal--content" id="help--content">
    <a  href="#close" class="modal--link">close</a>
    ...
  </div>
  <button id="help--trap-bottom" class="is-invisible">end of help modal, jump to first focusable element</button>
</aside>
<script type="text/javascript" src="_global-elements/modals.js"></script>
*/

// 1. control state of dialog and siblings (event on hashchange) - toggleHelpModal
// 2. the trap on the buttons to keep user inside dialog - trapHelpModalFocus
// 3. keyboard-control to close on escape - leaveHelpModalOnEscape
// 4. init-function to attach event-listeners - initHelpModal
  function toggleHelpModal(e){
    let dialog = document.getElementById('help');

    // apply state changes to modal and siblings
    if(location.hash=='#help'){
      document.body.classList.add('js--helpModal-open'); // store state-info into body-classlist for later use - see further down
      dialog.parentElement.style.overflowY = 'hidden'; // disable scroll on HTML underneath
      document.getElementById('help--trap-bottom').focus(); // use shortcut to jump to first focusable element ;)

      //hide siblings
      let siblings = dialog.parentElement.children;
      for(let i=0;i<siblings.length;i++) {
        if(siblings[i]==dialog)continue; //skip help-dialog
        let oldAriaHidden = siblings[i].getAttribute('aria-hidden'); //check for aria-hidden-attribute
        if(oldAriaHidden)siblings[i].oldAriaHidden = oldAriaHidden; //if it has - store it
        siblings[i].setAttribute('aria-hidden', 'true'); //set aria-attribute to hidden
      }

    } else {

      // undo all state changes to modal and siblings
      if(document.body.classList.contains('js--helpModal-open')) {
        document.body.classList.remove('js--helpModal-open'); //remove the state-info from body-classlist
        dialog.parentElement.style.overflowY = null; // undo disable scroll on HTML underneath
        document.getElementById('help--open').focus(); //focus on help-open-button

        //undo hiding siblings:
        let siblings = dialog.parentElement.children;
        for(let i=0;i<siblings.length;i++){
          if(siblings[i]==dialog)continue; //do nothing to dialog as its done already
          if(siblings[i].oldAriaHidden)siblings[i].setAttribute('aria-hidden',siblings[i].oldAriaHidden); //if there is a stored aria-hidden-attribute restore it
          else siblings[i].removeAttribute('aria-hidden'); //if not - remove actual attribute
        }
      }
    }
  }

  // focus trap function
  function trapHelpModalFocus(e){
    // put all focusable elements of help-content (without trap-buttons) in a flattened list
    let focusable = document.getElementById('help--content').querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    // reroute focus from the focus-traps to focusable elements
    if(this.id=='help--trap-bottom')focusable[0].focus(); //go to first element in focusable
    if(this.id=='help--trap-top')focusable[focusable.length-1].focus(); //go to last element in focusable
  }

  // closing function for ESC keypress on the open modal
  function leaveHelpModalOnEscape(e) {
    if(e.key!='Escape')return; //we do nothing if it was not escape
    if(location.hash=='#help')location.hash='#close'; //as we control it over location.hash we should just activate it
  }

  // initiating function to collate all logic for the modal
  function initHelpModal() {
    // call toggle function whenever user changes url
    window.addEventListener('hashchange',toggleHelpModal);

    // initiate circular focus trap
    let traptop = document.getElementById('help--trap-top');
    let trapbottom = document.getElementById('help--trap-bottom');
    traptop.onfocus=trapHelpModalFocus; //attach to focus-event
    trapbottom.onfocus=trapHelpModalFocus; //attach to focus-event
    traptop.onclick=trapHelpModalFocus; //attach to click to help screenreader-users in browse-mode
    trapbottom.onclick=trapHelpModalFocus; //attach to click to help screenreader-users in browse-mode

    // initiate closing function for ESC key
    let dialog = document.getElementById('help');
    dialog.onkeyup = leaveHelpModalOnEscape; //attach leaveHelpModalOnEscape to dialog, so it only activates if focus is inside dialog

    //call toggleHelpModal once to allow deep links to work
    setTimeout('toggleHelpModal()',10); // wait for events to propagate, then call function
  }
  // call initiating function once to start the process
  initHelpModal();
