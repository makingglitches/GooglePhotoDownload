const crypto = require('crypto')
const fs = require('fs')
const { fasttest } = require('./config')
const path = require('path')
const itemstore = require('./storemgr/itemstore')

function createSha256(plainstring)
{
    var h = crypto.createHash('sha256')

    h.update(plainstring)

    return h.digest('base64')
}


async function HashItem(db,storeitem, location, original = false)
{

    try 
    {
    itemstore.InitDB(db);

    var filename = path.join(location,storeitem.FileNameOnServer);

    var digest = createSha256FromFile(filename)

    var  succ = await itemstore.setHash(storeitem.Id, digest, original);
    

    return {success:succ, item:storeitem,location:location, hash:digest, err: null};
    }
    catch (err)
    {
        return {success:false, item:storeitem, location:location, hash:null, err:err }
    }

}

function createSha256FromFile(filename)
{
    var h = crypto.createHash('sha256')

    var src = fs.openSync(filename, 'r')

    var buf = Buffer.alloc(1024,0)

    var i = fs.readSync(src,buf,0,1024)

    while (i > 0)
    {

        if (i < 1024)
        {
            h.update(buf.subarray(0,i-1))    
        }
        else
        {   
            h.update(buf)
        }

        i = fs.readSync(src,buf,1024)
    }

    fs.closeSync(src)

    return h.digest('base64')
}



module.exports = 
{
    HashItem,HashItem,
    CreateSha256: createSha256,
    CreateSha256FromFile: createSha256FromFile
}
