var keytree = require('./keytree')
var path = require('path')

function addFile(tree, file)
{
    var base = path.basename(file);
    var f = keytree.findInTree(tree,base);
    var dir = path.dirname(file);

    if (f.found)
    {
        if (f.obj.tag.indexOf(dir) == -1)
        {
            f.obj.tag.push(dir);
        }
        
        return f;
    }
    else
    {
        return keytree.addToTree(tree,base,[dir])
    }
}

function findFile(tree,file)
{
    var base = path.basename(file)
    var f = keytree.findInTree(tree,base);
    var dir = path.dirname(file);

    if (f.found && dir && dir!='')
    {
        if (f.obj.tag.indexOf(dir) > -1)
        {
            return f;
        }
        else
        {
            f.found = false;
            return f;
        }
    }


    return f;

}


var filetree = {
    findFile:findFile,
    addFile:addFile
}

module.exports = filetree;