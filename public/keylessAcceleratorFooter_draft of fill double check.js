
function createKeylessWatermark() {
    var keylessWatermarkDiv = document.createElement("a");
    var watermarkImg = document.createElement("img");
    watermarkImg.setAttribute('id','kIcon');
    watermarkImg.setAttribute('style','position: fixed; bottom: 0px; left: 0px; z-index: 999999; cursor: pointer; opacity: 1; width: 36px; height: 50px;');
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
                createCredentialsFrame();
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
}

function createCredentialListenerInstance(){
    var script = document.createElement('script');
       
        script.onload = function() {
            console.info('credListener init...');             
        };

        script.src = "acceleratorCredentialListener.js"; 
    document.getElementsByTagName('head')[0].appendChild(script);
}

function initCredentialsDiv(){
    console.log('initialize credential container...'); 
    //main div
    var keylessListCredentialDiv = document.createElement("div");
    keylessListCredentialDiv.setAttribute('style','display:none;width:auto;height:auto;border:1px solid #ccc; position: fixed; top: 100px; left: 10px;z-index: 6001; cursor:pointer; opacity:0.9; background-color:#fff;padding:10px; border-radius:5px;font-size:14px;color:#888;');
    keylessListCredentialDiv.setAttribute('id','credentialsList');
        //sub divs
        var ownedCredentialDiv = document.createElement("div");
            // ownedCredentialDiv.setAttribute('style','display:block;width:auto;height:auto;z-index: 6001; cursor:pointer; opacity:0.9; background-color:#fff;padding:10px; border-radius:5px;font-size:14px;color:#888;');
        ownedCredentialDiv.setAttribute('id','ownedCredentials');
        var sharedCredentialDiv = document.createElement("div");
        sharedCredentialDiv.setAttribute('id','sharedCredentials');

        keylessListCredentialDiv.appendChild(ownedCredentialDiv);
        keylessListCredentialDiv.appendChild(sharedCredentialDiv);

    document.body.appendChild(keylessListCredentialDiv);

}

function createCredentialsFrame(){
    console.log('generate credential list...');    
    var keylessListCredentialDiv = document.getElementById("credentialsList");
    
    
    var currentUrl = document.location.href;
    var u = currentUrl.split('/');
    var url = u[0]+'//'+u[2];

    console.log('fetch owned credentials for...');
    keylessHelper.post("/keyless.io.getSiteCredentials", { siteURL:url }, function (response) {
        var r = JSON.parse(response);
        var clist = '';
        if(r.success==true){
            keylessListCredentialDiv.setAttribute('style','display:block;width:auto;height:auto;border:1px solid #ccc; position: fixed; top: 100px; left: 10px;z-index: 6001; cursor:pointer; opacity:0.9; background-color:#fff;padding:10px; border-radius:5px;font-size:14px;color:#888;');    
            var ownedCredentials = document.getElementById("ownedCredentials");

            var credentials = r.credentials;            
            // document.getElementById('ownCredentials').innerHTML = '';//empty list
            var defaultCred = {} 
            var tempDefaultCredential = {}
            for ( var i=0; i < credentials.length; i++ ) {
                var isDefaultStatus = '';
                //label the default credential
                if(credentials[i].isDefault){ 
                    isDefaultStatus = "<i>(default)</i>"; 
                    defaultCred = { credType:'owned', url:url, account: credentials[i].accountName }
                }

                //set the last cred used as temporary credential if no default is set
                if(i==(credentials.length - 1)){
                    tempDefaultCredential = {credType:'owned', url:url, account: credentials[i].accountName }
                }

                //prepare data display
                clist = clist + "<form id='form_"+i+"' class='form-inline credForm' role='form' style='margin-top:10px;'>";
                clist = clist + "<div class='text-info' title='Click to use credential' onmousedown=useCredential('owned','"+url+"','"+credentials[i].accountName+"')>" + credentials[i].accountName +" <span style='color:#888888 !important'>"+ isDefaultStatus + "</span></div>";
                clist = clist+ "</form>";
            }

            //add label 'owned credentials'
            if(clist!=''){
                clist = '<div style="color:#888888;font-weight:bold;">owned credentials: </div><hr/>' + clist;
            }

        }else{
            var clist = '<div style="color:#888888">No Credentials Found</div>';
        }
        
        ownedCredentials.innerHTML = clist;

    },'json');

    //get delegations 'from'
    console.log('fetch delegated credentials from...');
    keylessHelper.post("/keyless.io.getDelegatedSiteCredentials", { siteURL:u[2] }, function (response) {
        var r = JSON.parse(response);
        var dlist = '';
        if(r.success){
            keylessListCredentialDiv.setAttribute('style','display:block;width:auto;height:auto;border:1px solid #ccc; position: fixed; top: 100px; left: 10px;z-index: 6001; cursor:pointer; opacity:0.9; background-color:#fff;padding:10px; border-radius:5px;font-size:14px;color:#888;');
            var delegations = r.delegations;
            for ( var i=0; i < delegations.length; i++ ) {
                dlist = dlist + "<form id='form_"+i+"' class='form-inline delegatedForm' role='form' style='margin-top:10px;'>";
                dlist = dlist + "<div class='text-info' title='Click to use credential' onmousedown=useCredential('delegated','"+url+"','"+delegations[i]+"')>" + delegations[i] + "</div>";
                dlist = dlist+ "</form>";
            }
            if(dlist!=''){
                dlist = '<hr/><div style="color:#888888;font-weight:bold;">shared credentials: </div><hr/>' + dlist;
            }
        }else{
            var dlist = '';
        }
        
        document.getElementById('sharedCredentials').innerHTML = dlist;
        
    },'json');
}

function useCredential(credentialType, siteURL, accountName){
    console.log('attempt to use ',accountName);
    keylessHelper.post("/keyless.io.getOneCredential", { credentialType:credentialType, siteURL:siteURL, accountName:accountName }, function (response) {      
        var responseObject = JSON.parse(response); 
        if (responseObject.success && responseObject.siteCredential != null) {
            var credentials = responseObject.siteCredential;
            var passMatch = false;
            var textMatch = false;
            for (var i = 0; i < credentials.length; i++) {
                var cred = credentials[i]; console.log('cred',JSON.stringify(cred));
                console.log('credName',cred.name);
                console.log('credType',cred.type);
                // if (document.getElementsByName(cred.name).length > 0 || document.getElementById(cred.id) != null) {
                if (cred.name.length > 0 || cred.id != null) {
                    if (cred.type == 'text') textMatch = true;
                    if (cred.type == 'email') textMatch = true;
                    if (cred.type == 'password') passMatch = true;
                    console.log('match '+i+': '+textMatch+' '+passMatch);
                }
            }
            console.log('match '+textMatch+' '+passMatch);

            if (textMatch && passMatch) {
                console.log('no. of credentials', credentials.length);
                for (var i = 0; i < credentials.length; i++) {
                    var cred = credentials[i];
                    var byId = document.getElementById(cred.id); 
                    var byName = document.getElementsByName(cred.name)[0]; 
                    console.log(i,' ',byName,' ',byId);
                    if (byId != null) {
                        byId.value = cred.value;
                    } else if (byName != null) {
                        byName.value = cred.value;
                    } else {
                        //check iframes
                        console.log('processing...',cred.name);
                        var frames = document.getElementsByTagName("iframe");
                        console.log('no. of frames', frames.length);
                        for(var f = 0; f < frames.length; f++){
                            console.log('f',f);
                            var iframe = document.getElementsByTagName("iframe")[f];
                            var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                            // console.log(f, innerDoc)
                            var byId2 = innerDoc.getElementById(cred.id); 
                            var byName2 = innerDoc.getElementsByName(cred.name)[0]; 
                            if (byId2 != null) {
                                byId2.value = cred.value;
                            } else if (byName2 != null) {
                                byName2.value = cred.value;
                            }

                        }
                        
                    }

                    

                }
                console.log('Fill complete');
            } else {
                console.log("No fill undertaken due to signature mismatch");
            }
        }
    },'json');
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

function initAcceleratorDetection(){
    console.log('accelerator init...');
    sessionStorage.acceleratorActive = true;
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
    initAcceleratorDetection();
    if(document.location.href.indexOf('https://keyless.io')>-1){        
        console.info("keylessAcceleratorFooter fuc'n disabled...");
    }else{
        keylessHelper.fill();
        createKeylessWatermark();
        initCredentialsDiv(); // list when you pressed the 'K' icon
        createCredentialListenerInstance();
        // createCredentialsFrame();
        // createLearnCredentialFrame();
        createHistoryFrame();
        preventSavePassword();
    }
} else {
    keylessHelper.notifyContentChange()
}

window.onclick = keylessHelper.after(window.onclick, keylessHelper.navigateHandler);
window.onkeydown = keylessHelper.after(window.onkeydown, keylessHelper.navigateHandler);
