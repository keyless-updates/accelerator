
function createKeylessWatermark() {
    var keylessWatermarkDiv = document.createElement("a");
    var watermarkImg = document.createElement("img")
    watermarkImg.setAttribute('style','position: fixed; bottom: 0px; left: 0px;z-index: 5000; cursor:pointer; opacity:1.0');
    watermarkImg.onmouseover = function(){this.style.opacity = 0.7}
    watermarkImg.onmouseout = function(){this.style.opacity = 1}
    watermarkImg.src = "https://keyless.io/images/keylessWater.png";
    watermarkImg.title = keylessWatermarkDiv.alt = "Back to keyless.io";
    keylessWatermarkDiv.href = "https://keyless.io#lastUrl=" + encodeURIComponent(keylessHelper.decodeUrl(document.location.href)) + "&" + encodeURIComponent(document.title)
    keylessWatermarkDiv.appendChild(watermarkImg)

    keylessWatermarkDiv.onclick = function(e){
        if(!e.ctrlKey){
            var timeSinceDown = (new Date()) - window.keylessWatermarkTimestamp
            if(timeSinceDown > 1000){
                //show box
                var credentialsFrame = document.getElementById('credentialsFrame');

                if(credentialsFrame){              
                    credentialsFrame.parentNode.removeChild(credentialsFrame);
                }

                createCredentialsFrame();
                // setTimeout(function(){
                //     document.getElementById('credentialsFrame').setAttribute('style','display:block;border:none;width:auto;height:100%;position: fixed; top: 100px; left: 50px;z-index: 6001; padding:10px;');                
                // }, 1000);
                return false; //prevent click action
            }
        }
    }

    keylessWatermarkDiv.ondblclick = function() {
        //keylessWatermarkDiv.remove(); //this was to allow clicking behind the watermark todo:add this feature back through a drag method
        window.open("https://keyless.io")
        return false;
    }

    keylessWatermarkDiv.onmousedown = function(){
        window.keylessWatermarkTimestamp = new Date();
    }

    var body = document.getElementsByTagName('body')[0];
    body.appendChild(keylessWatermarkDiv);

    //create the credential list container
    var keylessListCredentialDiv = document.createElement("div");
    keylessListCredentialDiv.setAttribute('style','display: none;');
    keylessListCredentialDiv.setAttribute('id','credentialsList');

    document.body.appendChild(keylessListCredentialDiv);
}

function createCredentialListenerInstance(){
    var script = document.createElement('script');
       
        script.onload = function() {
            console.info('credListener init...'); 
            setTimeout(function(){
                createCredentialsFrameWithAutoFill(); //get the creds and auto fill default
            }, 1000);

            // setTimeout(function(){
            //     //then clear after a while
            //     var credentialsFrameWithAutoFill = document.getElementById('credentialsFrameWithAutoFill');  
            //     if(credentialsFrameWithAutoFill) credentialsFrameWithAutoFill.parentNode.removeChild(credentialsFrameWithAutoFill);

            //     console.log('credentialsFrameWithAutoFill cleared...');
            // }, 10000);
            
        };

        script.src = "acceleratorCredentialListener.js"; 
    document.getElementsByTagName('head')[0].appendChild(script);
}

function createCredentialsFrame(){
    //create the frame
    var iframe = document.createElement("iframe");
    var frameDomain = "https://keyless.io";
    var currentUrl = document.location.href;
    var u = currentUrl.split('/');
    var siteURL = u[0]+'//'+u[2]+'/';
    iframe.setAttribute('id','credentialsFrame');
    // iframe.src = frameDomain + "/credentialsFrame.html?url=" + encodeURIComponent(document.location.href);
    iframe.src = frameDomain + "/credentialsFrame.html?url=" + encodeURIComponent(siteURL);
    iframe.setAttribute('style','display:block;width:auto;height:auto;border:1px solid #ccc; position: fixed; top: 100px; left: 10px;z-index: 6001; cursor:pointer; opacity:0.8; background-color:#fff;padding:10px; border-radius:5px;');
    //iframe.onload = function(){window.top.onfocus = function(){iframe.contentWindow.postMessage("focus", frameDomain);}}
    document.body.appendChild(iframe);
    console.info('credFrame init...');
}

function createCredentialsFrameWithAutoFill(){
    //create the frame
    var iframe = document.createElement("iframe");
    var frameDomain = "https://keyless.io";
    var currentUrl = document.location.href;
    var u = currentUrl.split('/');
    var siteURL = u[0]+'//'+u[2]+'/';
    iframe.setAttribute('id','credentialsFrame');
    iframe.setAttribute('id','credentialsFrameWithAutoFill');
    iframe.src = frameDomain + "/credentialsFrame.html?url=" + encodeURIComponent(siteURL);
    iframe.setAttribute('style','display:none;width:auto;height:auto;border:1px solid #ccc; position: fixed; top: 100px; left: 10px;z-index: 6001; cursor:pointer; opacity:0.8; background-color:#fff;padding:10px; border-radius:5px;');
    //iframe.onload = function(){window.top.onfocus = function(){iframe.contentWindow.postMessage("focus", frameDomain);}}
    document.body.appendChild(iframe);
    console.info('credFrameWithAutoFill loaded...');
}

function createHistoryFrame(){
    var iframe = document.createElement("iframe");
    var frameDomain = "https://keyless.io";
    iframe.src = frameDomain + "/addHistoryItem.html?url=" + encodeURIComponent(document.location.href)+ "&" + "title=" + encodeURIComponent(document.title);
    iframe.style.display = "none";
    iframe.onload = function(){window.top.onfocus = function(){iframe.contentWindow.postMessage("focus", frameDomain);}}
    document.body.appendChild(iframe);
    console.info('historyFrame init...');
}

/*function createCredentialHistoryFrame(){
    var iframe = document.createElement("iframe");
    var frameDomain = "https://keyless.io";
    iframe.src = frameDomain + "/addCredentialHistory.html?url=" + encodeURIComponent(document.location.href)+ "&" + "title=" + encodeURIComponent(document.title);
    iframe.style.display = "none";
    iframe.onload = function(){window.top.onfocus = function(){iframe.contentWindow.postMessage("focus", frameDomain);}}
    document.body.appendChild(iframe);
    console.info('historyFrame init...');
}*/

function preventSavePassword(){
    var forms = document.getElementsByTagName("form")
    for(var i=0; i<forms.length; i++) forms[i].onsubmit = unlearn(forms[i].onsubmit);

    function unlearn(onSubmit){
        console.log("attached onsubmit")
        return function(){
            var originalOnSubmit = onSubmit
            var passwords = document.querySelectorAll("input[type=password]")
            for(var i=0; i<passwords.length; i++) {
                var passwordField = passwords[i]
                var replacementPasswordField = passwordField.cloneNode();
                replacementPasswordField.id = null;
                replacementPasswordField.name = null;
                replacementPasswordField.value = "******************************".slice(0, passwordField.value.length)
                passwordField.setAttribute("type", "hidden")
                passwordField.setAttribute("autocomplete", "off")
                passwordField.parentNode.insertBefore(replacementPasswordField, passwords[i])
                setTimeout(function(){
                    passwordField.setAttribute("type", "password")
                    try{passwordField.parentNode.removeChild(replacementPasswordField)}catch(e){/*exception if item does not exist*/}
                }, 500)
            }
            if(originalOnSubmit) originalOnSubmit.apply(this, arguments)
        }
    }
}

function createLearnCredentialFrame(){    
    var iframe = document.createElement("iframe");
    var frameDomain = "https://keyless.io";
    iframe.src = "learnCredentialsFrame.html";
    // iframe.src = "https://keyless.io/learnCredentialsFrame.html?url="+document.location.href+"&learningData=" + encodeURIComponent(JSON.stringify(learningData));           
    iframe.setAttribute('id','learnCredentialFrame');
    iframe.setAttribute('style','display:none;top:0px;position:fixed;border:1px solid red;');
    //iframe.onload = function(){window.top.onfocus = function(){iframe.contentWindow.postMessage("focus", frameDomain);}}
    document.body.appendChild(iframe);    
    console.info('credLearnFrame init...');
}

function initAcceleratorDetection(){
    console.log('accelerator init...');
    sessionStorage.accelerator = 'on';

    /*var checkExist = setInterval(function() {
        var historyUL = document.getElementById('history');     
       if (historyUL != null) {
          console.log("History List Detected!");
          
          var spans = historyUL.getElementsByClassName('siteLink');
          console.log('spans '+spans.length);
            for (var i = 0; i < spans.length; i++) {
                var a = spans[i].getElementsByTagName('a');
                console.log('elem '+a.length);
                for (var j = 0; j < a.length; j++) {

                    var elem = a[i];
                    elem.setAttribute('style','color:red !important;');
                    console.log('links '+elem.href);
                }
            }
          clearInterval(checkExist); 
       }else{
            console.log("Wait for History List!");
       }
    }, 2000); // check every 100ms*/
}

keylessHelper.after = function (before, after) {
    return function () {
        try { if (typeof before == 'function') before.apply(this,arguments); }
        catch (e) { throw e; }
        finally { if (typeof after == 'function') after.apply(this, arguments); }
    };
}

if(window.self === window.top) {
    if(document.location.href.indexOf('https://keyless.io')>-1){
        initAcceleratorDetection();
        console.info("keylessAcceleratorFooter fuc'n disabled...");
    }else{
        keylessHelper.fill();
        createKeylessWatermark();
        createCredentialListenerInstance();
        // createCredentialsFrame();
        createLearnCredentialFrame();
        createHistoryFrame();
        preventSavePassword();
    }
} else {
    keylessHelper.notifyContentChange()
}

window.onclick = keylessHelper.after(window.onclick, keylessHelper.navigateHandler);
window.onkeydown = keylessHelper.after(window.onkeydown, keylessHelper.navigateHandler);
