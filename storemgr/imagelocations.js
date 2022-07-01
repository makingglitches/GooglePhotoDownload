const getrows = require("./getRows");
const queryResult = require("./queryresult");

var db = null;

function InitDB(_db) {
	db = _db;
}

async function AddStoreItem(StoreItemId, ImageLocationId, SubPath=null)
{
    var sql = `INSERT INTO StoreItemLocation (
        PhotoItemId,
        StoreId,
        SubPath
    )
    VALUES (
        ?,
        ?,
        ?
    );`

    var res = await  getrows(db, sql,[StoreItemId,ImageLocationId,SubPath]);

    return new queryResult( res.success,null, null);
}
