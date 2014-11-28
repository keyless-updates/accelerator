var request = require('request');
var http = require('http')
var zlib = require('zlib');
var staticFiles = require('./static').getStaticFiles('public')
var routes = {};
var maxBufferChunks = 100;

global.fakePasswords = global.fakePasswords || [];
global.gzipIn = true;
exports.handleRequest = handleRequest;
console.log("Request handler loaded...")

var log = {write: function () {
    console.log("Log: " + arguments[1], JSON.stringify(arguments[2]))
}};

routes['/keyless.io.acceleratorActive'] = function (browserReq, browserRes) {

    postHelper(browserReq, browserRes, function () {
        console.log('attempt to set accelerator to active');
        var inputObject = JSON.stringify({ acceleratorActive: "true" });
        var options = {
            url: 'https://keyless.io/accelerator.active',
            form: { key: inputObject },
            headers: {
                'User-Agent': 'accelerator',
                'realhost': browserReq.headers.host, /* todo: consider encrypting */
                'cookie': global.keylessCookie
            }
        };

        request.post(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                browserRes.end(JSON.stringify({ success: true }));
            } else {
                browserRes.end(JSON.stringify({ success: false }));
            }
        });

    });

}

routes['/keyless.io.learn'] = function (browserReq, browserRes) {

    var requestBody = ""
    browserReq.on('data', function (chunk) {
        requestBody += chunk;
    })
    browserReq.on('end', function () {
        request.post({
            url: 'https://keyless.io/accelerator.learn',
            body: requestBody,
            headers: {
                'User-Agent': 'accelerator',
                'realhost': browserReq.headers.host, /* todo: consider encrypting */
                'cookie': global.keylessCookie
            }
        }).on('error', function (err) {
            console.log("error on learn")
        }).pipe(browserRes)
    });

}

routes['/keyless.io.fill'] = function (browserReq, browserRes) {
    var options = {
        url: 'https://keyless.io/accelerator.fill',
        headers: {
            'User-Agent': 'accelerator',
            'realhost': browserReq.headers.host, /* todo: consider encrypting */
            'cookie': global.keylessCookie
        }
    };

    request.post(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var cred = JSON.parse(body);
            var fakePassword = cred.credentials[1].value;
            if (global.fakePasswords.indexOf(fakePassword) > -1) {
                //do not store
            } else {
                global.fakePasswords.push(fakePassword);
            }
            browserRes.end(body);
        }
    });

}

routes['/keyless.io.getSiteCredentials'] = function (browserReq, browserRes) {
    postHelper(browserReq, browserRes, function () {
        var body = browserReq.body;
        var siteURL = '';
        for (key in body) {
            var data = JSON.parse(key);
            siteURL = data.siteURL;
        }

        if (siteURL) {
            // { mode: 'getAllCredentialsBySite', siteName:siteName }
            var options = {
                url: 'https://keyless.io/accelerator.getAllCredentialsBySite',
                form: { siteURL: siteURL },
                headers: {
                    'User-Agent': 'accelerator',
                    'realhost': browserReq.headers.host, /* todo: consider encrypting */
                    'cookie': global.keylessCookie
                }
            };

            request.post(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    browserRes.end(body);
                }
            });
        }
    });
}

routes['/keyless.io.getOneCredential'] = function (browserReq, browserRes) {
    postHelper(browserReq, browserRes, function () {
        var body = browserReq.body;
        var siteURL = '';
        var credentialType = '';
        var accountName = '';
        for (key in body) {
            var data = JSON.parse(key);
            siteURL = data.siteURL;
            credentialType = data.credentialType;
            accountName = data.accountName;
        }

        if (siteURL && credentialType && accountName) {
            // { mode: 'getAllCredentialsBySite', siteName:siteName }
            var options = {
                url: 'https://keyless.io/accelerator.getOneCredential',
                form: { credentialType: credentialType, siteURL: siteURL, accountName: accountName },
                headers: {
                    'User-Agent': 'accelerator',
                    'realhost': browserReq.headers.host, /* todo: consider encrypting */
                    'cookie': global.keylessCookie
                }
            };

            request.post(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var cred = JSON.parse(body);
                    var fakePassword = cred.siteCredential[1].value;
                    if (global.fakePasswords.indexOf(fakePassword) > -1) {
                        //do not store
                    } else {
                        global.fakePasswords.push(fakePassword);
                    }
                    browserRes.end(body);
                }
            });
        }
    });
}

routes['/keyless.io.getDelegatedSiteCredentials'] = function (browserReq, browserRes) {
    postHelper(browserReq, browserRes, function () {
        var body = browserReq.body;
        var siteURL = '';
        for (key in body) {
            var data = JSON.parse(key);
            siteURL = data.siteURL;
        }

        if (siteURL) {
            var options = {
                url: 'https://keyless.io/accelerator.getAllDelegatedCredentialsFrom',
                form: { siteURL: siteURL },
                headers: {
                    'User-Agent': 'accelerator',
                    'realhost': browserReq.headers.host,  // todo: consider encrypting
                    'cookie': global.keylessCookie
                }
            };

            request.post(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    browserRes.end(body);
                }
            });
        }
    });
}

function handleRequest(browserReq, browserRes) {
    var serverReq = null;
    var targetUrl = require('url').parse(browserReq.url);
    targetUrl.hostname = targetUrl.hostname || browserReq.headers.host;
    targetUrl.protocol = targetUrl.protocol || "https";
    browserReq.bodyBuffer = [];
    browserReq.session = {};

    console.log("Handling request for " + targetUrl.format());

    if (targetUrl.path in staticFiles) {
        browserRes.end(staticFiles[targetUrl.path])
        console.log("static file sent")

    } else if (targetUrl.path in routes) {
        routes[targetUrl.path](browserReq, browserRes);
    } else {

        function createServerReq() {
            var bodyAsString = Buffer.concat(browserReq.bodyBuffer).toString();
            var containsFakePasswords = false;
            for (var i = 0; i < global.fakePasswords.length; i++) {
                if (bodyAsString.indexOf(global.fakePasswords[i]) > -1) {
                    containsFakePasswords = true;
                    break;
                }
            }

            var requestOptions = containsFakePasswords ? prepareRequestToKeylessPipe(browserReq, targetUrl.format()) : prepareRequestToDestinationServer(browserReq, targetUrl.format());

            return request(requestOptions);
        }

        browserReq.on('error', function () {
            browserRes.end("An error occured during the submission of your request.")
        })

        browserReq.on('data', function (chunk) {
            if (browserReq.bodyBuffer.length < maxBufferChunks) browserReq.bodyBuffer.push(chunk);
            else {
                if (!serverReq) serverReq = createServerReq();
                while (browserReq.bodyBuffer.length > 0) serverReq.write(browserReq.bodyBuffer.shift());
                serverReq.write(chunk);
            }
        });

        browserReq.on('end', function () {
            if (!serverReq) serverReq = createServerReq();
            while (browserReq.bodyBuffer.length > 0) serverReq.write(browserReq.bodyBuffer.shift());
            completeServerReq(serverReq)

            function completeServerReq(severReq) {
                serverReq.end();

                //todo:handler trailers
                var serverRes = {url: targetUrl.format()};
                serverReq.on('data', function (chunk) {
                    if (serverReq.response.headers && !serverRes.contentType) {
                        //todo: Sniff content type https://npmjs.org/package/mmmagic instead of listening to server dictated mime type (or at least test before doing injection)
                        serverRes.statusCode = serverReq.response.statusCode
                        serverRes.headers = serverReq.response.headers
                        serverRes.contentType = serverReq.response.headers['content-type'] || "text/html; charset=utf-8"
                        var injectionTarget = serverRes.url.slice(-3).toLowerCase() == ".js" || serverRes.contentType.indexOf('text') > -1 || serverRes.contentType.indexOf('utf-8') > -1 || serverRes.contentType.indexOf('json') > -1

                        if (!injectionTarget) {
                            browserRes.writeHead(serverRes.statusCode, serverRes.headers)
                            browserRes.headersSent = true;
                        }
                    }

                    if (!serverRes.bodyBuffer) serverRes.bodyBuffer = [];
                    if (!browserRes.headersSent) serverRes.bodyBuffer.push(chunk)
                    else {

                        while (serverRes.bodyBuffer && serverRes.bodyBuffer.length) browserRes.write(serverRes.bodyBuffer.pop())
                        browserRes.write(chunk);
                    }

                });

                serverReq.on('end', function () {
                    if (serverReq.req.connection && serverReq.req.connection.authorized === false) console.log("Invalid certificate Allowed") //todo: handle

                    serverRes.headers = serverReq.response.headers;
                    serverRes.statusCode = serverReq.response.statusCode;
                    serverRes.contentEncoding = (getProp(serverRes.headers, "content-encoding") || "").toLowerCase();

                    if (serverRes.bodyBuffer && serverRes.bodyBuffer.length) {
                        serverRes.bodyBuffer = Buffer.concat(serverRes.bodyBuffer)
                        decompress();

                        function decompress() {
                            var decompresser = null;
                            if (serverRes.contentEncoding == "gzip") decompresser = zlib.gunzip;
                            if (serverRes.contentEncoding == "deflate") decompresser = zlib.inflate;
                            if (!decompresser) {
                                serverRes.body = serverRes.bodyBuffer.toString()
                                prepareResponse()
                            } else decompresser(serverRes.bodyBuffer, function (err, expandedBody) {
                                try {
                                    serverRes.body = expandedBody.toString();
                                    prepareResponse();
                                } catch (e) {
                                    console.log(e);
                                }
                            });
                        }

                        function prepareResponse() {
                            delete serverRes.headers["content-encoding"];

                            //get keyless session cookie if presented
                            if (targetUrl.hostname == "keyless.io" && serverRes.headers["set-cookie"]) {
                                global.keylessCookie = serverRes.headers["set-cookie"][0];
                                global.credentials = getCredentials(global.keylessCookie);
                            }
//                           
                            var isHtmlFile = (new RegExp("^\\s*<")).test(serverRes.body) && serverRes.body.indexOf('</html') > -1 || serverRes.body.substring(0, "<script".length).toLowerCase() === "<script";
                            if (isHtmlFile && global.keylessCookie) serverRes.body = performInjection(serverRes.body)
                            serverRes.body = serverRes.body.replace(/WebSocket‌/g, "WebSocket‌\u200c") //disable websocket support

                            if (global.gzipOut) compress();
                            else sendResponseToBrowser();
                        }

                        function compress() {
                            var compressor = null;
                            if (serverRes.contentEncoding == "gzip") compressor = zlib.gzip
                            if (serverRes.contentEncoding == "deflate") compressor = zlib.deflate
                            if (!compressor) sendResponseToBrowser()
                            else compressor(new Buffer(serverRes.body), function (err, compressedBody) {
                                serverRes.body = compressedBody;
                                serverRes.headers["content-encoding"] = serverRes.contentEncoding;
                                sendResponseToBrowser()
                            });
                        }

                        function sendResponseToBrowser() {
                            serverRes.headers['content-length'] = serverRes.body instanceof Buffer ? serverRes.body.length : Buffer.byteLength(serverRes.body);
                            browserRes.writeHead(serverRes.statusCode, serverRes.headers);
                            browserRes.end(serverRes.body)
                        }

                        function getCredentials(cookie) {
                            //todo: complete
                            return {};
                        }

                        function performInjection(inHtml) {
                            var outHtml = inHtml
                            var headerInjected = false;
                            var headerRegex = /<head\b[^>]*>/i;
                            var footerRegex = /(<\/html(>[\s]|>$))/i;
                            var headerScript = '<script src="/keylessAcceleratorHeader.js"></script>' //todo: inject passwords, watermark etc
                            var footerScript = '<script src="/keylessAcceleratorFooter.js"></script>';

                            outHtml = outHtml.replace(headerRegex, function (match) {
                                headerInjected = true;
                                return match + headerScript;
                            });

                            outHtml = outHtml.replace(footerRegex, function (match) {
                                return footerScript + match;
                            });

                            if (!headerInjected) //no header, inject one
                            {
                                var bodyRegex = /<body\b[^>]*>/i;
                                outHtml = outHtml.replace(bodyRegex, function (match) {
                                    headerInjected = true;
                                    return headerScript + match;
                                });
                            }

                            if (!headerInjected)  outHtml = headerScript + outHtml;
                            return outHtml;
                        }

                    } else {
                        //no data to send
                        if (browserRes.headersSent) browserRes.end();
                        else {
                            browserRes.writeHead(serverRes.statusCode, serverRes.headers);
                            browserRes.end();
                        }
                    }
                });

                serverReq.on('error', function (err) {

                    log.write(browserReq, "Server Request Error", {uri: targetUrl.format(), err: err.message});

                    if (err.message == "getaddrinfo ENOTFOUND") {
                        browserRes.end("Hostname not found");
                    } else if (err.message.toLowerCase().indexOf('verify') > -1) {
                        //This could be thrown when the certificates presented by the server are invalid. Instead of erroring we should ask the user whether they want to accept unverified certificates for this particular domain. If they say yes then we try again.
                        browserRes.end("The website you attempted to access presented an invalid security certificate. Contact us for more information.")
                    } else {
                        browserRes.end("An error occurred while attempting to retrieve " + targetUrl.format() + "\n(" + err.message + ")");
                    }

                });
            }
        })
    }
}

function prepareRequestToDestinationServer(browserReq, url) {
    delete browserReq.headers['accept-encoding'];
    if (global.gzipIn) browserReq.headers['accept-encoding'] = 'gzip,deflate';
    //todo: add an X-Forwarded-For header

    return { url: url, jar: false, method: browserReq.method, encoding: null, headers: browserReq.headers, followAllRedirects: false, followRedirect: false };
}

/*function prepareRequestToKeylessPipe(browserReq, url){   
 var browserHeaders = {
 'User-Agent': 'accelerator',
 'realhost': browserReq.headers.host,  //todo: consider encrypting
 'cookie': global.keylessCookie
 }
 //todo: inject keylessSecurityCookie, don't forget to strip it in accelerator.pipe
 // browserReq.headers['keyless.pipe.url'] = url;
 browserHeaders['keyless.pipe.url'] = url;
 delete browserReq.headers['accept-encoding'];
 if(global.gzipIn) browserReq.headers['accept-encoding'] = 'gzip,deflate';
 return { url: "https://keyless.io/accelerator.pipe", jar: false, method: browserReq.method, encoding:null, headers: browserHeaders, cookie: global.keylessCookie, hefollowAllRedirects: false, followRedirect:false };
 }*/

function prepareRequestToKeylessPipe(browserReq, url) {

    //todo: inject keylessSecurityCookie, don't forget to strip it in accelerator.pipe
    var headersToSend = {
        'User-Agent': 'accelerator',
        'cookie': global.keylessCookie,
        'keyless.pipe.url': url,
        'keyless.pipe.headers': JSON.stringify(browserReq.headers)
    }
    delete browserReq.headers['accept-encoding'];
    if (global.gzipIn) browserReq.headers['accept-encoding'] = 'gzip,deflate';
    return { url: "https://keyless.io/accelerator.pipe", jar: false, method: browserReq.method, encoding: null, headers: headersToSend, cookie: global.keylessCookie, followAllRedirects: false, followRedirect: false };
}

function getProp(obj, propname) {
    var propnameLower = propname.toLowerCase();
    for (var p in obj) {
        if (p.toLowerCase() == propnameLower) {
            return obj[p];
        }
    }
    ;
}

function setProp(obj, propname, newValue) {
    var propnameLower = propname.toLowerCase();
    for (var p in obj) {
        if (p.toLowerCase() == propnameLower) {
            obj[p] = newValue;
            return;
        }
    }
    ;
}

function postHelper(request, response, callback, queryStringFormatted) {
    if (queryStringFormatted === undefined) queryStringFormatted = true;
    var queryData = "";
    if (typeof callback !== 'function') return null;

    if (request.method == 'POST') {
        request.on('data', function (data) {
            queryData += data;
            if (queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'});
                request.connection.destroy();
            }
        });

        request.on('end', function () {
            request.body = queryStringFormatted ? require('querystring').parse(queryData) : queryData;
            callback();
        });

    } else {
        response.writeHead(405, {'Content-Type': 'text/plain'});
        response.end();
    }
}