//for injection at at beginning of html head
/*!
 * domready (c) Dustin Diaz 2012 - License MIT
 */
//!function(a,ctx,b){typeof module!="undefined"?module.exports=b():typeof define=="function"&&typeof define.amd=="object"?define(b):ctx[a]=b()}("domready",this,function(a){function m(a){l=1;while(a=b.shift())a()}var b=[],c,d=!1,e=document,f=e.documentElement,g=f.doScroll,h="DOMContentLoaded",i="addEventListener",j="onreadystatechange",k="readyState",l=/^loade|c/.test(e[k]);return e[i]&&e[i](h,c=function(){e.removeEventListener(h,c,d),m()},d),g&&e.attachEvent(j,c=function(){/^c/.test(e[k])&&(e.detachEvent(j,c),m())}),a=g?function(c){self!=top?l?c():b.push(c):function(){try{f.doScroll("left")}catch(b){return setTimeout(function(){a(c)},50)}c()}()}:function(a){l?a():b.push(a)}})

var keylessHelper = window.keylessHelper = window.keylessHelper || {}
keylessHelper.canonical = "keyless.io"
keylessHelper.iframeProxies = {};
keylessHelper.exceptions = [];
keylessHelper.shortUrlCache = {};
keylessHelper.shortUrlCache.reversed = {}
for(var key in keylessHelper.shortUrlCache) keylessHelper.shortUrlCache.reversed[keylessHelper.shortUrlCache[key]] = key;

keylessHelper.post = function (url, data, callback) {
    var req = new XMLHttpRequest();
    req.open('POST', url, true);
    req.setRequestHeader('Content-type', 'application/json; charset=UTF-8;');
    req.send(JSON.stringify(data));
    req.onreadystatechange = function () {
        if (req.readyState === 4 && ((req.status >= 200 && req.status < 300) || req.status === 304 )) {
            try{
                callback(req.responseText, req);
            }catch(e){
                keylessHelper.exceptions.push(e)
            }
        }
    };
}

keylessHelper.get = function (url, data, callback) {
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.setRequestHeader('Content-type', 'application/json; charset=UTF-8;');
    req.send(JSON.stringify(data));
    req.onreadystatechange = function () {
        if (req.readyState === 4 && ((req.status >= 200 && req.status < 300) || req.status === 304 )) {
            try{
                callback(req.responseText, req);
            }catch(e){
                keylessHelper.exceptions.push(e)
            }
        }
    };
}

keylessHelper.defineProperty = function (obj, propName, getSetPair, hidden){
    try{
        Object.defineProperty(obj, propName, { get: getSetPair.get, set: getSetPair.set, enumerable: !hidden, configurable: true});
    }catch(error){
        try{
            Object.prototype.__defineGetter__.call(obj, propName, getSetPair.get);
            Object.prototype.__defineSetter__.call(obj, propName, getSetPair.set);
        }catch(error2){
            throw "watchJS error: browser not supported :/"
        }
    }
};
var learnPostCounter = 0; //prevent sending twice
keylessHelper.learn = function () {
    console.info('learn init...');

    var allInputs = document.getElementsByTagName("input");
    var learningInputs = [];
    var learningPasswords = [];
    var passwordsTotalLength = 0;

    for (var i = 0; i < allInputs.length; i++) {
        if (allInputs[i].type == "text" || allInputs[i].type == "email") {
            learningInputs.push(allInputs[i]);
        }
        if (allInputs[i].type == "password") {
            learningPasswords.push(allInputs[i]);
            passwordsTotalLength += allInputs[i].value.length;
        }
    }

    var accountUsed = '';
    if (passwordsTotalLength > 0) {
        var learningData = [];
        for (var i = 0; i < learningInputs.length; i++) {
            if(learningInputs[i].value.length > 0) {
                learningData.push({ name: learningInputs[i].name, id: learningInputs[i].id, value: learningInputs[i].value, type: learningInputs[i].type });
                accountUsed = learningInputs[i].value;
            }
        }

        for (var i = 0; i < learningPasswords.length; i++) if(learningPasswords[i].value.length > 0) learningData.push({ name: learningPasswords[i].name, id: learningPasswords[i].id, value: learningPasswords[i].value, type: "password" })
        if(learningData.length > 0 && learnPostCounter ==0){//do not post if sign up form
                     
            var currentUrl = document.location.href;
            var u = currentUrl.split('/');
            var siteURL = u[0]+'//'+u[2];
		            
            console.log('attempt to learn via accelerator...');        
            keylessHelper.post("/keyless.io.learn", { siteURL:siteURL, learningData:learningData }, function (response) {
                var res = JSON.parse(response);
                if(res.success){
                   console.log('learn successful'); 
                }else{
                   console.log('learn failed!');
                }                
            },'json');	
        }

        //add Credential history
        var url = keylessHelper.decodeUrl(window.location.href);
        var urlDomain = url.split('://', 2).length > 1 ? url.split('/', 3)[2] : url.split("/", 1)[0];
        var title = urlDomain.split(':', 1)[0];
        var historyStartIndex = 1 - (document.addEventListener == undefined) //handle ie8 and below with length == 0
        if(history.length == 1 || !sessionStorage.pathId) sessionStorage.pathId = Math.random();
        if(!localStorage.pathIdOfActiveTab) localStorage.pathIdOfActiveTab = sessionStorage.pathId
        if(history.length == 1 || !sessionStorage.parentPathId) sessionStorage.parentPathId = localStorage.pathIdOfActiveTab;

        var setActiveTab = function (event) {
            if (event.origin !== urlDomain) return;
            localStorage.pathIdOfActiveTab = sessionStorage.pathId;
        }

        if(window.addEventListener){ window.addEventListener("message", setActiveTab , false); }
        else { window.attachEvent('onmessage', setActiveTab); }
//        if(sessionStorage.lastHistoryUrl != url){
//            sessionStorage.lastHistoryUrl = url;
//            var csrfToken = document.getElementById('csrfToken').value;
//              console.log('csrfToken '+csrfToken);
/*
        try{
            var historyData = {account:accountUsed, url:urlDomain, title:title, pathId:sessionStorage.pathId, parentPathId:sessionStorage.parentPathId};
            keylessHelper.post("https://keyless.io/credentialHistory", historyData ,function(response){
                if(response.success){
                    console.info("Credential History Saved.");
                }else{
                    console.error('Failed to add to Credential History!');
                }
            },'json');
        }catch(e){
            console.error('credHistory Failed: '+e);
        }
		*/

//        }
    }
}

var fillAttempts = 0;
keylessHelper.fill = function () {
    console.log("Attempting fill...");
    keylessHelper.post("/keyless.io.fill", {}, function (response) {
        var responseObject = JSON.parse(response); 
        if (responseObject.success && responseObject.credentials != null) {
            var credentials = responseObject.credentials;
            var passMatch = false;
            var textMatch = false;
            for (var i = 0; i < credentials.length; i++) {
                var cred = credentials[i];
                if (document.getElementsByName(cred.name).length > 0 || document.getElementById(cred.id) != null) {
                    if (cred.type == 'text') textMatch = true;
                    if (cred.type == 'email') textMatch = true;
                    if (cred.type == 'password') passMatch = true;
                }
            }

            if (textMatch && passMatch) {
                for (var i = 0; i < credentials.length; i++) {
                    var cred = credentials[i];
                    var byId = document.getElementById(cred.id);
                    var byName = document.getElementsByName(cred.name)[0];
                    if (byId != null) {
                        byId.value = cred.value;
                    } else if (byName != null) {
                        byName.value = cred.value;
                    }
                }
                console.log('Fill complete');
            } else {
                //try iframe
                console.log('attempt to autofill iframe...');
                var iframe = document.getElementsByTagName("iframe")[0];                
                var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                var iFrameFill = false;

                //wait for the frame to be loaded
                if (  innerDoc.readyState  == 'complete' ) {                    
                    for (var i = 0; i < credentials.length; i++) {
                        var cred = credentials[i];                    
                        var byId2 = innerDoc.getElementById(cred.id); 
                        var byName2 = innerDoc.getElementsByName(cred.name)[0]; 
                        if (byId2 != null) {
                            byId2.value = cred.value; iFrameFill = true; 
                        } else if (byName2 != null) {
                            byName2.value = cred.value;  iFrameFill = true;
                        }
                    }

                    if(iFrameFill){
                        console.log('AutoFill complete via iframe');
                    }else{
                        console.log("No autofill undertaken due to signature mismatch");
                    }   
                }

                if(!iFrameFill && credentials.length>0 && fillAttempts < 30){
                    //check again
                    fillAttempts++;
                    console.log('iframe not found retrying... ',fillAttempts);
                    setTimeout(function(){ keylessHelper.fill(); }, 1000);
                }
            }
        }
    });
}

function toBase36(num) { return new Number(num).toString(36); }
function fromBase36(str) { return parseInt(str, 36); }

keylessHelper.encodeUrl = function(url, domainRoot) {
    if (typeof url != "string" || (url.split("/")[2] && url.split("/")[2].match(/\.keyless\.io/)) ) {
        return url;
    }

    var domainRoot = domainRoot || keylessHelper.canonical;
    var protocolMap = { http: 0, https: 1 };

    var inProtocol = url.split('://', 2).length > 1 ? url.split('://', 1)[0] : null;
    if(!inProtocol) return url;

    var hostNameAndPort = url.split('://', 2).length > 1 ? url.split('/', 3)[2] : url.split("/", 1)[0];
    var inHostname = hostNameAndPort.split(':', 1)[0];
    var inPort = hostNameAndPort.split(':', 2).length > 1 ? hostNameAndPort.split(':', 2)[1] : 10;
    var inPath = url.split('://', 2).length > 1 ? url.split('/').slice(3).join('/') : url.split('/').slice(1).join('/');

    var longUrlExcludingPath = inProtocol + "://" + hostNameAndPort;
    var shortUrlAvailable = keylessHelper.shortUrlCache.reversed[longUrlExcludingPath]
    var encodedUrl = ""

    if(shortUrlAvailable){

        encodedUrl = 'https://' + shortUrlAvailable + '.' + domainRoot + (inPath.length > 0 ? "/" + inPath : "");

    } else {

        var lastDotLocation = 0;
        var dotLocationString = "";
        var strippedHostname = inHostname.replace(/\./gi, function (match, offset) {
            dotLocationString = dotLocationString + toBase36(offset - lastDotLocation);
            lastDotLocation = offset;
            return "";
        });

        var portProtocolSuffix = toBase36("" + inPort + protocolMap[inProtocol.toLowerCase()] + dotLocationString.length);
        var portProtocolSuffixLength = toBase36(portProtocolSuffix.length);
        encodedUrl = 'https://' + strippedHostname + dotLocationString + portProtocolSuffix + portProtocolSuffixLength + '.' + domainRoot + (inPath.length > 0 ? "/" + inPath : "");

    }

    if(url.slice(-1) == '/' && encodedUrl.slice(-1) != '/') encodedUrl += '/'
    return encodedUrl;
}

keylessHelper.decodeUrl = function(url) {

    if(!url) return url; //handle undefined being passed in ie. during read of a new href
    if(url.toString().substring(0, "http".length).toLowerCase() != "http" || url.toString().split('/',3)[2].indexOf(keylessHelper.canonical) < 0) return url //only accept valid urls
    if(url.toString().split('/',3)[2].toLowerCase() == keylessHelper.canonical) return url
    url = url.toString() //handle objects that are going to be convered into a url
    var reverseProtocolMap = { '0': 'http', '1': 'https' };
    var hostNameAndPort = url.split('://', 2).length > 1 ? url.split('/', 3)[2] : url.split("/", 1)[0];
    var inHostname = hostNameAndPort.split(':', 1)[0];
    var inPath = url.split('://', 2).length > 1 ? url.split('/').slice(3).join('/') : url.split('/').slice(1).join('/');
    var subdomain = inHostname.split('.', 1)[0];
    var decodedUrl = "";

    var expandedShortUrl = keylessHelper.shortUrlCache[subdomain];
    if(expandedShortUrl) decodedUrl = expandedShortUrl + (inPath.length > 0 ? '/' + inPath : "")
    else {

        var portProtocolSuffixLength = fromBase36(subdomain.slice(-1));
        var portProtocolSuffix = '' + fromBase36(subdomain.slice(-1 + -1 * portProtocolSuffixLength, -1));
        var dotLocationStringLength = parseInt(portProtocolSuffix.slice(-1));
        var outProtocol = portProtocolSuffix.slice(-2, -1);
        var outPort = portProtocolSuffix.slice(0, -2);
        var hostnameExcludingDots = subdomain.slice(0, -1 + -1 * portProtocolSuffixLength + -1 * dotLocationStringLength);
        var dotLocationString = subdomain.slice(hostnameExcludingDots.length, hostnameExcludingDots.length + dotLocationStringLength);

        var outPath = inPath;
        var outHostname = hostnameExcludingDots;

        var lastDotLocation = 0;
        for (var i = 0; i < dotLocationString.length; i++) {
            var relativeDotLocation = fromBase36(dotLocationString[i]);
            var dotLocation = lastDotLocation + relativeDotLocation;
            lastDotLocation = dotLocation;
            outHostname = outHostname.substring(0, dotLocation) + '.' + outHostname.substring(dotLocation, outHostname.length);
        }

        decodedUrl = reverseProtocolMap[outProtocol] + "://" + outHostname + (outPort == 10 ? "" : ":" + outPort) + (outPath.length > 0 ? '/' + outPath : "");
    }

    if(url.slice(-1) == '/' && decodedUrl.slice(-1) != '/') decodedUrl += '/'
    return decodedUrl
}

/**
 * Taken from app.proxy.js
 */
keylessHelper.replaceAll = function(inputString, regex, nextText){
    var outputString = inputString.replace(regex, function (match) {
        return nextText;
    });
    return outputString;
}

/**
 * Taken and modified from app.proxy.js
 */
keylessHelper.updateAllUrls = function(inputText, encodeDecodeFunction){
    var outputText = inputText;
    var normalFormatRegex = /((https|ftp|http):)*\/\/[a-zA-Z0-9\-_]+(\.[a-zA-Z0-9\-_]+)+([a-zA-Z0-9\-\.,@^%&;:/~\+#]*[a-zA-Z0-9\-@^%&;/~\+#\(])/gi;
    outputText = outputText.replace(normalFormatRegex, function (match,match1,match2,match4) {
        if (match.indexOf("//") === 0) {
            match = 'https:' + match;
        }
        return encodeDecodeFunction(match);
    });
    return outputText
}

/**
 * Taken and modified from app.proxy.js::prepareResponseBody()
 */
keylessHelper.replaceU200C = function(oldResponseBody){
    var newResponseBody = oldResponseBody.replace(/&#58;/gi,":");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /(\.src)((?![\w\.]*["'])(?![\w]))/gi, ".src\u200c");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /(\.href)((?![\w\.]*["'])(?![\w]))/gi, ".href\u200c");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /XMLHttpRequest/gi, "XMLHttpRequest\u200c");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /(\.location)((?![\w\.]*["'])(?![\w]))/gi, ".location\u200c");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /(\.domain)((?![\w\.]*["'])(?![\w]))/gi, ".domain\u200c");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /(\.cookie)((?![\w\.]*["'])(?![\w]))/gi, ".cookie\u200c");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /\.setAttribute\(/gi, ".setAttribute\u200c(");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /\.getAttribute\(/gi, ".getAttribute\u200c(");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /(\.innerHTML)((?![\w\.]*["'])(?![\w]))/gi, ".innerHTML\u200c");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /(\.outerHTML)((?![\w\.]*["'])(?![\w]))/gi, ".outerHTML\u200c");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /\.appendChild\(/gi, ".appendChild\u200c(");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /\.replaceChild\(/gi, ".replaceChild\u200c(");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /\.insertBefore\(/gi, ".insertBefore\u200c(");
    newResponseBody = keylessHelper.replaceAll(newResponseBody, /\.write\(/gi, ".write\u200c(");
    return newResponseBody;
}

/**
 * Loop through DOM to encode URLs and replace \u200c
 * @param el Node
 */
keylessHelper.iterateUpdate = function(el){
    if (el.hasChildNodes()){
        for (var i=0; i<el.childNodes.length; i++) {
            keylessHelper.iterateUpdate(el.childNodes[i]);
        }
    }
    if(el.attributes){
        for (var i=0; i<el.attributes.length; i++) {
            var att = el.attributes[i];
            if (att.name === 'src' || att.name === 'href') { //encode URLs in src and href attributes
                att.value = keylessHelper.updateAllUrls(att.value, keylessHelper.encodeUrl);
            } else { //non-src/href attributes, replace \u200c
                att.value = keylessHelper.replaceU200C(att.value);
            }
        }
    } else { //text nodes, including text inside <script> or <style>
        var text = el.textContent;
        if (text.trim().length > 0 && !el.hasChildNodes()) {
            el.textContent = keylessHelper.replaceU200C(text);
        }
    }
    return el;
}

keylessHelper.facadeApply = function (inobj, inprop) {
    var prop = inprop;
    var obj = inobj
    var x = function () {
        for(var a=0; a<arguments.length; a++){
            if(arguments[a] !== null && arguments[a] !== undefined){
                var b = arguments[a].toString();
                var c = b.toLowerCase();
                if(c.substring(0,"http://".length)=="http://" || c.substring(0,"https://".length)=="https://") arguments[a] = keylessHelper.encodeUrl(b); //important for facebook and xmlhttprequest.open
            }
        }
        //todo: uncomment once server has been updated to remove this prior to request being sent
        //obj.setRequestHeader("keyless.io.withCredentials", "false")
        try{obj.withCredentials = true;} catch(e){/* not currently checking whether the xmlhttprequest is in an open state first*/}

        obj[prop].apply(obj, arguments)
    };
    return x;
}

keylessHelper.facadeGet = function (inobj, inprop) {
    var prop = inprop;
    var obj = inobj
    var x = function () {
        if(!obj[prop]) return obj[prop]
        var c = obj[prop].toString().toLowerCase();
        if(c.substring(0,"http://".length)=="http://" || c.substring(0,"https://".length)=="https://") return keylessHelper.decodeUrl(obj[prop].toString()); //important for facebook and xmlhttprequest.open
        else return obj[prop];
    };
    return x;
}

keylessHelper.facadeSet = function (inobj, inprop) {
    var prop = inprop;
    var obj = inobj
    var x = function (value) {
        if(value){
            var c = value.toString().toLowerCase();
            if(c.substring(0,"http://".length)=="http://" || c.substring(0,"https://".length)=="https://") obj[prop] = keylessHelper.encodeUrl(value.toString()); //important for facebook and xmlhttprequest.open
            else obj[prop] = value;
        }
        else obj[prop] = value;
    };
    return x;
}

keylessHelper.createFacade = function (o) {
    //if(typeof o == 'function')
    var _facade = function () {
        this.internal = new o();
        for (var prop in this.internal) {
            var t = typeof (this.internal[prop]);
            if (t == "function") {
                this[prop] = keylessHelper.facadeApply(this.internal, prop);
            } else {
                keylessHelper.defineProperty(this, prop, {get:keylessHelper.facadeGet(this.internal, prop), set:keylessHelper.facadeSet(this.internal, prop)});
            }
        };
    };
    return _facade;
};

keylessHelper.createSrcFacade = function () {
    keylessHelper.defineProperty(Object.prototype, "src\u200C", {
        get: function () {
            return keylessHelper.decodeUrl(this.src); },
        set: function (newValue) {
            //todo: clean this up
            try{
                if(newValue && newValue.toString().substring(0,"httpss:".length).toLowerCase() == "httpss:") newValue = "https:" + newValue.toString().substring(7); //hack for google search results
                this.src = keylessHelper.encodeUrl(newValue);
            }
            catch(e) {
                this.src = newValue
                keylessHelper.exceptions.push(e)
            }
        }
    }, true);
}

keylessHelper.createHrefFacade = function () {
    keylessHelper.defineProperty(Object.prototype, "href\u200C", {
        get: function () {
            return keylessHelper.decodeUrl(this.href);
        },
        set: function (newValue) {
            this.href = keylessHelper.encodeUrl(newValue);
        }
    }, true);
}

keylessHelper.createAttributeFacades = function(){
    keylessHelper.defineProperty(Object.prototype, "setAttribute\u200C", {
        get: function () {
            if(this.setAttribute !== (document.body && document.body.setAttribute)) return this.setAttribute;
            else return function(name, value){
                return this.setAttribute(name, keylessHelper.encodeUrl(value))
            }
        },
        set: function(value){
            this.setAttribute = value
        }
    }, true);

    keylessHelper.defineProperty(Object.prototype, "getAttribute\u200C", {
        get: function () {
            if(this.getAttribute !== (document.body && document.body.getAttribute)) return this.getAttribute;
            else return function(name){
                return keylessHelper.decodeUrl(this.getAttribute(name))
            }
        },
        set: function(value){
            this.getAttribute = value
        }
    }, true);
}

keylessHelper.createLocationFacade = function () {

    var windowLocationHref = keylessHelper.decodeUrl(window.location.href);
    var windowLocationHost = windowLocationHref.split('://', 2).length > 1 ? windowLocationHref.split('/', 3)[2] : windowLocationHref.split("/", 1)[0];
    var windowLocationHostname = windowLocationHost.split(':', 1)[0];

    var keylessLocation = {};

    keylessHelper.defineProperty(keylessLocation, "toString", {
        get: function () { return function(){return window.location.href;} },
        set: function (newValue) { /*ignore*/ }
    });

    keylessHelper.defineProperty(keylessLocation, "href", {
        get: function () { return window.location.href; },
        set: function (newValue) { if (typeof newValue === "string") { window.location.href = newValue } }
    });


    keylessHelper.defineProperty(keylessLocation, "host", {
        get: function () { return windowLocationHost; },
        set: function (newValue) { }
    });


    keylessHelper.defineProperty(keylessLocation, "hostname", {
        get: function () { return windowLocationHostname; },
        set: function (newValue) { }
    });

    keylessHelper.defineProperty(keylessLocation, "ancestorOrigins", {
        get: function () { return location.ancestorOrigins; },
        set: function (newValue) { },
        enumerable: true,
        configurable: true
    });

    keylessHelper.defineProperty(keylessLocation, "origin", {
        get: function () { return keylessHelper.decodeUrl(location.origin); },
        set: function (newValue) { }
    });

    keylessHelper.defineProperty(keylessLocation, "hash", {
        get: function () { return location.hash; },
        set: function (newValue) { }
    });

    keylessHelper.defineProperty(keylessLocation, "search", {
        get: function () { return location.search; },
        set: function (newValue) { }
    });

    keylessHelper.defineProperty(keylessLocation, "pathname", {
        get: function () { return location.pathname; },
        set: function (newValue) { }
    });

    keylessHelper.defineProperty(keylessLocation, "port", {
        get: function () { return location.port; },
        set: function (newValue) { }
    });

    keylessHelper.defineProperty(keylessLocation, "protocol", {
        get: function () { return location.protocol; },
        set: function (newValue) { }
    });

    keylessHelper.defineProperty(keylessLocation, "domain", keylessHelper.domainHandlers);
    //keylessHelper.defineProperty(keylessLocation, "domain\u200c", keylessHelper.domainHandlers, true)

    keylessLocation.assign = function (url) {
        location.assign(keylessHelper.encodeUrl(url));
    }

    keylessLocation.reload = function () {
        location.reload();
    }

    keylessLocation.toLowerCase = function () {
        keylessHelper.decodeUrl(location.href).toLowerCase();
    }

    keylessLocation.replace = function (url) {
        var isEncodedRegex = /\.keyless\.io/;
        if (!isEncodedRegex.test(url)) {
            location.replace(keylessHelper.encodeUrl(url));
        } else {
            location.replace(url);
        }
    }

    keylessHelper.defineProperty(window, "location\u200C", {
        get: function () {  return keylessLocation; },
        set: function (href) {
            this.location = keylessHelper.encodeUrl(href)
        }
    }, true);

    keylessHelper.defineProperty(document, "location\u200C", {
        get: function () {  return keylessLocation; },
        set: function (href) { this.location = keylessHelper.encodeUrl(href)  }
    }, true);

    keylessHelper.defineProperty(Object.prototype, "domain\u200C", keylessHelper.domainHandlers, true);
    //keylessHelper.defineProperty(window, "domain\u200C", keylessHelper.domainHandlers, true);

    keylessHelper.defineProperty(document, "cookie\u200C", {
        get: function () {
            //todo: confirm that we don't need to do any decoding here.
            return this.cookie;
        },
        set: function (cookieText) {
            keylessHelper.post("/keyless.io.cookies",{cookie:cookieText}, function(response) {
                return cookieText;
            });
            var newCookie = cookieText.replace(/(;[ ]?domain[ ]?=)[^;]*/gi, function(){ return ';domain=' + document.location.hostname; });
            newCookie = newCookie.replace(/(;[ ]?expires[ ]?=)[^;]*/gi, function(){ return '' });
            document.cookie = newCookie;
        }
    }, true);


};

keylessHelper.createDocumentDomainHandlers = function(){

    keylessHelper.getContentWindow = function(){
        var contentWindowProxy = {};
        contentWindowProxy["location\u200c"] = {}//todo:implement
        contentWindowProxy.document = keylessHelper.getContentDocument(this)
    }

    keylessHelper.getContentDocument = function(argIframe){
        var iframe = argIframe || this; console.log('iframe.contentDocument '+JSON.stringify(iframe.contentDocument));
        var iframeContentDocument = keylessHelper.iframeProxies[iframe.src]
        if(iframeContentDocument) iframeContentDocument["location\u200c"] = {}//todo:implement
        else iframeContentDocument = iframe.contentDocument;
        return iframeContentDocument
    }

    //todo: Delete these, they are no longer used.
    var oldDomainHandlers = {
        get: function () {
            if(this == document) return keylessHelper.decodeUrl(this.domain);
            else return this.domain
        },
        set: function (location) {
            //todo: remove this hack
            this.domain = "keyless.io"
            console.log("Attempt to write to document.domain. This is not yet supported by keyless.")
        }
    }

    keylessHelper.setDocumentDomain = function(newValue){
        var errorString = 'Uncaught SecurityError: Blocked a frame with origin "http://parent.test.com" from accessing a frame with origin "http://child.test.com". The frame requesting access set "document.domain" to "test.com", but the frame being accessed did not. Both must set "document.domain" to the same value to allow access. (Generated by Keyless)';
        if(this == document){
            keylessHelper.documentDomain = newValue //todo: normal checks for matching domain suffix
            return keylessHelper.documentDomain
        } else {
            return this.domain = newValue;
        }
    }

    keylessHelper.getDocumentDomain = function(){
        return this == document ? keylessHelper.documentDomain || keylessHelper.decodeUrl("https://" + document.domain).substring(8) : this.domain
    }

    keylessHelper.notifyContentChange = function(){

        var messageTarget = "*" //todo should be encoded document.domain
        var payload = {src:document.location.href, html:document.documentElement.innerHTML}
        window.parent.postMessage(payload, messageTarget)

    }

    keylessHelper.listenForContentChanges = function(){
        var handleMessage = function (e){
            //todo: check url and origin
            var tempElement = document.createElement("html")
            tempElement.innerHTML = e.data.html
            tempElement.body = tempElement.getElementsByTagName("body")[0]
            tempElement.documentElement = tempElement;
            keylessHelper.iframeProxies[e.data.src] = tempElement
        }
        window.addEventListener('message', handleMessage, false);
    }

    keylessHelper.defineProperty(Object.prototype, "postMessage\u200c", {
        get: function () {
            return function(a,b,c){
                if(b) b = keylessHelper.encodeUrl(b);
                return this.postMessage(a,b,c);
            }
        },
        set: function(value){}
    }, true);

    keylessHelper.domainHandlers = {get:keylessHelper.getDocumentDomain, set:keylessHelper.setDocumentDomain}
    keylessHelper.defineProperty(Object.prototype, "contentDocument\u200c", {get:keylessHelper.getContentDocument, set:function(){}}, true)
    keylessHelper.defineProperty(Object.prototype, "contentWindow\u200c", {get:keylessHelper.getContentWindow, set:function(){}}, true)
    keylessHelper.listenForContentChanges();
}

keylessHelper.createDomManipulationFacades = function () {

    keylessHelper.defineProperty(Object.prototype, "innerHTML\u200c", {
        get: function () {
            return this.innerHTML ? keylessHelper.updateAllUrls(this.innerHTML, keylessHelper.decodeUrl) : this.innerHTML;
        },
        set: function (content) {
            this.innerHTML = typeof content === 'string' ? keylessHelper.replaceU200C(keylessHelper.updateAllUrls(content, keylessHelper.encodeUrl)) : content;
        }
    }, true);

    keylessHelper.defineProperty(Object.prototype, "outerHTML\u200c", {
        get: function () {
            return this.outerHTML ? keylessHelper.updateAllUrls(this.outerHTML, keylessHelper.decodeUrl) : this.outerHTML;
        },
        set: function (content) {
            this.outerHTML = typeof content === 'string' ? keylessHelper.replaceU200C(keylessHelper.updateAllUrls(content, keylessHelper.encodeUrl)) : content;
        }
    }, true);

    keylessHelper.defineProperty(Object.prototype, "appendChild\u200c", {
        get: function () {
            if(!(this instanceof Node)) return this.appendChild
            else return function(content){
                if (content && content instanceof Node) {
                    content = keylessHelper.iterateUpdate(content);
                }

                return this.appendChild(content);
            }
        },
        set: function(value){}
    }, true);

    keylessHelper.defineProperty(Object.prototype, "replaceChild\u200c", {
        get: function () {
            return function(content, replace){
                if (content instanceof Node) {
                    content = keylessHelper.iterateUpdate(content);
                }
                return this.replaceChild(content, replace);
            }
        },
        set: function(value){}
    }, true);

    keylessHelper.defineProperty(Object.prototype, "insertBefore\u200c", {
        get: function () {
            return function(content, reference){
                if (content instanceof Node) {
                    content = keylessHelper.iterateUpdate(content);
                }

                return this.insertBefore(content, reference);
            }
        },
        set: function(value){}
    }, true);

    keylessHelper.defineProperty(document, "write\u200c", {
        get: function () {
            return function(content){
                if (typeof content === 'string') {
                    content = typeof content === 'string' ? keylessHelper.replaceU200C(keylessHelper.updateAllUrls(content, keylessHelper.encodeUrl)) : content;
                }
                return this.write(content);
            }
        },
        set: function(value){}
    }, true);

}

keylessHelper.navigateHandler = function (evt) {
    var key = evt.keyCode ? evt.keyCode : evt.charCode ? evt.charCode : evt.which;

    //watch for quick-home (``)
    if (document.activeElement && document.activeElement.tagName.toLowerCase() == "body") {
        if (key == 192 && keylessHelper.lastKeyCode == 192 && ((new Date()) - keylessHelper.lastKeyTime) < 300) document.location = 'https://' + keylessHelper.canonical
        keylessHelper.lastKeyCode = key; keylessHelper.lastKeyTime = new Date();
    };

    if(document.location.href.indexOf('https://keyless.io')>-1){
        //do not run learn on own page
    }else{
        //learn
        if (key == 13) keylessHelper.learn();
        if (!(evt instanceof KeyboardEvent)) { keylessHelper.learn(); }
    }//todo: only if expect navigation (eg. input, anchor)

}

keylessHelper.createDocumentDomainHandlers();
keylessHelper.createLocationFacade();
keylessHelper.createSrcFacade();
keylessHelper.createHrefFacade();
keylessHelper.createAttributeFacades();
keylessHelper.createDomManipulationFacades();
window["XMLHttpRequest\u200C"] = keylessHelper.createFacade(XMLHttpRequest);

window.onclick = keylessHelper.navigateHandler
window.onkeyup = keylessHelper.navigateHandler
