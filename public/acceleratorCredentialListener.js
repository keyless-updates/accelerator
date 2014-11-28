// Create IE + others compatible event handler
var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

// Listen to message from child window
eventer(messageEvent, function(e) {
    try{
        var credentialToUse = JSON.parse(e.data);
        var user = credentialToUse[0];
        var pass = credentialToUse[1];

        //fill the username and password field
        if(user.id != undefined && pass.id != undefined){
            var userNameField = document.getElementById(user.id);
            var passwordField = document.getElementById(pass.id);
        }else{
            var userNameField = document.getElementByName(user.name);
            var passwordField = document.getElementByName(pass.name);
        }
        userNameField.value = user.value;
        passwordField.value = pass.value;
        console.log("Fill complete");
    } catch (e){
        //todo: this function should check the message type before trying to process it.
    }
},false);