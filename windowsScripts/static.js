exports.getStaticFiles = function (subFolder){
    var fs = require("fs")
    var path = require("path")
    var fileCollection = {};
    var dir = path.join(process.cwd(), subFolder);
    var files = fs.readdirSync(dir);
    for(var i=0; i< files.length; i++){
        var filename = files[i]
        fileCollection['/' + filename] = fs.readFileSync(path.join(dir, filename), 'utf8')
    }
    return fileCollection;

}