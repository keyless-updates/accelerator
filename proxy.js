//for development mode
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//for development mode

global = {};

var http = require('http');
var https = require('https');
var net = require('net');
var path = require('path')
var events = require('events');
var certgen = require('./certgen')
var url = require('url')
var fs = require("fs")
var handler = require("./handler")
var request = require("request")

var isWindows = process.platform === 'win32';
var port = process.env.PORT || 8888;
var workingDirectory = process.cwd();
var caKeyPath = path.resolve(workingDirectory, "./certificates/dummy-key.pem")
var caCertPath = path.resolve(workingDirectory, "./certificates/dummy-cert.pem")
//https.globalAgent = new https.Agent({secureProtocol: 'SSLv3_method', rejectUnauthorized:false}); //todo: reconsider
var requestBuffers = {};
var serversAvailable = {};
var serverGenerationInProgress = {};
var proxy = http.createServer(handler.handleRequest);

proxy.on('connect', function(browserRequest, browserSocket, browserRequestHead) {

    // connect to an origin server
    var targetUrl = url.parse('https://' + browserRequest.url);
    var host = targetUrl.host

    console.log('Received request to connect to %s:%s', targetUrl.hostname, targetUrl.port);

    requestBuffers[host] = requestBuffers[host] || []
    requestBuffers[host].unshift({browserRequest:browserRequest, browserSocket:browserSocket, browserRequestHead:browserRequestHead})

    var handleRequestAction = function(data){pipeToServer(data.browserRequest, data.browserSocket, data.browserRequestHead);}
    var flushQueueAction = function(){flushQueue(requestBuffers[host], handleRequestAction);}

    if(serversAvailable[host]){
        flushQueueAction()
    } else if (serverGenerationInProgress[host]) {
        //do nothing. the request has already been added to the queue and the queue will be flushed when the server generation is complete
    } else {
        serverGenerationInProgress[host] = true;
        generateServer(targetUrl, flushQueueAction)
    }

});

proxy.listen(port);
console.log("Proxy server listening on port " + port)



function pipeToServer(browserRequest, browserSocket, browserRequestHead){

    var targetUrl = url.parse('https://' + browserRequest.url);
    var namedPipe = createNamedPipe(targetUrl.hostname + '-' + targetUrl.port)

    console.log("Attempting to connect to " + namedPipe)
    var proxySocket = net.connect(namedPipe, function() {
        console.log("Connected to destination server: " + namedPipe)
        browserSocket.write('HTTP/' + browserRequest.httpVersion + ' 200 Connection Established\r\n' +'proxy-agent: Node-Proxy\r\n' + '\r\n');
        proxySocket.write(browserRequestHead);
        proxySocket.pipe(browserSocket);
        browserSocket.pipe(proxySocket);
    });
}

function flushQueue(queue, action){
    action(queue.pop())
    if(queue.length > 0) process.nextTick(function(){flushQueue(queue, action)})
}

function generateServer(targetUrl, callback){

    var host = targetUrl.host
    var namedPipe = createNamedPipe(targetUrl.hostname + '-' + targetUrl.port)

    console.log("Requesting certificates for " + targetUrl.host)
    getCertificates(targetUrl.host, function(certificates){

        if(certificates){
            console.log("Certificates retrieved successfully for " + host)
            try{
                var httpsServer = https.createServer(certificates, handler.handleRequest)
                httpsServer.on('error', function(err){
                    console.log("Error on https server: " + namedPipe + " reported " + err)
                })
                httpsServer.listen(namedPipe, function(){
                    console.log('Https proxy server created at ' + namedPipe)
                    delete serverGenerationInProgress[host]
                    serversAvailable[host] = true;
                    callback();
                });
            } catch (e) {
                console.log("Error creating server: " + e.toString())
                //callback();
            }

        } else {
            console.log("Attempt to use https to connect to non-https server.")
        }
    });
}

function createNamedPipe(pipeName){
    var winPipePrefix = '\\\\.\\pipe\\'
    var unixPipePrefix = ""
    return (isWindows ? winPipePrefix : unixPipePrefix) + pipeName
}

function getCertificates(remoteHostname, callback){

    //todo: check the filesystem
    var certPrefix = remoteHostname.replace(":","-")
    var potentialCertPath = "./certificates/generated/" + certPrefix + "/cert.pem"
    var potentialKeyPath = "./certificates/generated/" + certPrefix + "/key.pem"

    var certificatePair = {};
    fs.readFile(potentialCertPath, function (err, buffer) {
        if(!err) certificatePair.cert = buffer

        fs.readFile(potentialKeyPath, function (err, buffer) {
            if(!err) certificatePair.key = buffer
            if(certificatePair.cert && certificatePair.key){
                console.log("Found certificates on filesystem for " + remoteHostname)
                callback(certificatePair)

            } else {
                console.log("Generating certificates for " + remoteHostname)

                getRemoteCertificateInfo(remoteHostname, function(certInfo){
                    console.log("Got remote certificate info: " + (!!certInfo))

                    if(!!certInfo){
                        //todo: add cache
                        certgen.generate_cert_buf(certPrefix, false, certInfo, caKeyPath, caCertPath, function(err, key, cert){
                            if(err) console.log("An error occurred while generating certificates")
                            else callback({key:key, cert:cert})
                        })
                    } else {
                        console.log("Could not get certificate info")
                        callback()
                    }
                })
            }
        });
    });
}

function getRemoteCertificateInfo(remoteHostname, callback){
    var url = 'https://' + remoteHostname;
    var pingOptions = { url: url,
        followRedirect: false,
        jar: false,
        method: 'HEAD' };

    var ping = request(pingOptions, onPingResponse);
    function onPingResponse(err, resp, body) {
        if (!ping.req.socket.getPeerCertificate) {
            console.error('No certificate for ' + url);
            console.error('Ping request: %j', ping);
            callback()
        } else {
            var srvCert = ping.req.socket.getPeerCertificate();
            callback(srvCert)
        }
    }
}
