var fs = require('fs');
var child = require('child_process');
var baseCertFolder = exports.generatedCertificatesFolder = "./certificates/generated"

String.prototype.format = function(obj) {
    return this.replace(/%\{([^}]+)\}/g,function(_,k){ return obj[k] });
};

exports.generate_cert = function (prefix, keepFiles, info, caKeyPath, caCertPath, cb) {

    //get file paths
    var certFolder = baseCertFolder + "/" + prefix

    var paths = {
     certFolder : certFolder,
     indexPath : certFolder + "/index.txt",
     serialPath : certFolder + "/serial.txt",
     configPath : certFolder + "/config.cfg",
     keyPath : certFolder + "/key.pem",
     csrPath : certFolder + "/csr.pem",
     certPath : certFolder + "/cert.pem",
     caKeyPath: caKeyPath,
     caCertPath: caCertPath
    }

    var configString = getConfigString(paths, info)
    var keyExecString = 'openssl genrsa -out %{keyPath} 1024'.format(paths);
    var csrExecString = 'openssl req -new -key %{keyPath} -config %{configPath} -out %{csrPath}'.format(paths)
    var certExecString = ('openssl ca -create_serial -batch -startdate ' + getTwoDaysAgoString() + '000000Z -extensions v3_ca -config %{configPath} -out %{certPath} -cert %{caCertPath} -keyfile %{caKeyPath} -infiles %{csrPath}').format(paths)

    var err = null
    var serial = Math.floor(Math.random() * 4294967296) + 1;
    if(serial.toString().length % 2 == 1) serial = "0" + serial;

    //create index and serial number
    fs.mkdir(certFolder, function(){
        writeString("", paths.indexPath, function(){
            writeString(serial, paths.serialPath, function(){
                writeString(configString, paths.configPath, function(){
                    execProcess(keyExecString, function(){
                        execProcess(csrExecString, function(){
                            execProcess(certExecString, function(){
                                cb(err, paths.keyPath, paths.certPath)
                            })
                        })
                    })
                })
            })
        })
    })
}

function getTwoDaysAgoString(){
    var d = new Date();
    var twoDaysAgo = new Date(d.setDate(d.getDate()-2));
    return ""+ twoDaysAgo.getYear().toString().slice(-2) + ("0" + twoDaysAgo.getMonth()).slice(-2) + ("0" + twoDaysAgo.getDate()).slice(-2);
}

exports.generate_cert_buf = function (prefix, keepFiles, info, caKeyPath, caCertPath, cb) {
    exports.generate_cert(prefix, keepFiles, info, caKeyPath, caCertPath,
        function (err, keyPath, certPath){
            if (err) return cb(err);
            fs.readFile(certPath, function (err, certBuf) {
                if (err) {
                    console.log("Failed to read cert: " + certPath)
                    return cb(err)
                };
                fs.readFile(keyPath, function (err, keyBuf) {
                    if (!keepFiles) {
                        //fs.unlink(certPath);
                        //fs.unlink(keyPath);
                    }
                    cb(err, keyBuf, certBuf);
                });
            });
        });
}

function writeString(s, path, cb){
    fs.writeFile(path, s, function writeFileCb(err) {
        cb(err, path);
    });
}

function execProcess(command, cb){
    child.exec(command, function execCb(err) {
        if(err) console.log("Error: " + err.toString())
        cb(err);
    });
}

function getConfigString(paths, info){
    var hash = info.subject;
    var s = "[ req ]\ndefault_bits           = 1024\n" +
        "default_keyfile        = keyfile.pem\n" +
        "distinguished_name     = req_distinguished_name\n" +
        "prompt                 = no\n\n" +
        "[ req_distinguished_name ]\n";

    var allowableKeys = { C:1, ST:1, L:1, O:1, OU:1, CN:1 };
    try {
    Object.keys(hash).forEach(function (key) {
        if (key in allowableKeys) {
            var val = hash[key];
            if (Array.isArray(val)) val = val[0]; // hack to handle OUs that are arrays of strings
            s = s + key + " = " + val + "\n";
        }
    });
    } catch (e){
        console.log("Error generating certificate", e.toString())
    }

    s += '[v3_ca]\n';
    if (info.subjectaltname) {
        s += 'subjectAltName = ' + info.subjectaltname + '\n';
    }

    s += '####################################################################\n\
    [ ca ]\n\
    default_ca	= CA_default		# The default ca section\n\
    [ CA_default ]\n\
    dir			    = .					# Where everything is kept\n\
    database		= %{indexPath}	    # database index file.\n\
    new_certs_dir	= %{certFolder}		# default place for new certs.\n\
    serial		    = %{serialPath} 	# The current serial number\n\
    name_opt 		= ca_default		# Subject Name options\n\
    cert_opt 		= ca_default		# Certificate field options\n\
    default_days	= 365				# how long to certify for\n\
    default_crl_days= 30				# how long before next CRL\n\
    default_md		= sha1				# use public key default MD\n\
    preserve		= no				# keep passed DN ordering\n\
    policy		    = policy_anything\n\
    [ policy_anything ]\n\
    countryName			    = optional\n\
    stateOrProvinceName		= optional\n\
    localityName			= optional\n\
    organizationName		= optional\n\
    organizationalUnitName	= optional\n\
    commonName				= supplied\n\
    emailAddress			= optional\n\
    '.format(paths)

    return s;
}