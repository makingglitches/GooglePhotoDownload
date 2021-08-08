const sqlite3 = require('sqlite3').verbose();
const { any } = require('async');
const { create } = require('lodash');
const path = require('path')
// itemstore object
// {
//     "id": "AAs_2xY0TPLdYdba-IcKQZVIy8JnzzxO9FrmyrvNY3m2jCD1nZS-ctJRdeYiZ3jHvjhJXdgOkbyTN8A3RfjOLAjPpHy8xJw2oA",
//     "filename": "IMG_2115.MOV",
//     "size": "5868486",
//     "finished": false,
//     "userid": "115473458188357073643",
//     "VideoOption": "v",
//     "online": true,
//     "missinglocal": true
// }


class queryResult
{
    constructor(s,r,e)
    {
        this.success = s;
        this.rows =r;
        this.err = e;
    }
}


var db= null;

async function getrows(db, sql, params = null, debug = false) {
	if (params == null) {
		params = [];
	}

	var rows = await new Promise((resolve, reject) => {
		db.all(sql, params, (err, rows) => {
			if (err) {
                resolve(new queryResult(false,rows, err));
				
			}

			if (debug) {
				rows.forEach((row) => {
					console.log(row);
				});
			}

			resolve(new queryResult(true,rows,err));
		});
	});

	return rows;
}



// async function runsql(db, sql, params = null) {
// 	if (params == null) {
// 		params = [];
// 	}

// 	var res = await new Promise((resolve, reject) => {
// 		try {
// 			var res =  db.run(sql, params);
// 			resolve(true);
// 		} catch (err) {
//             throw err;
// 		}
// 	});

// 	return res;
// }

async function getItemCount() {
	var r = await 
    getrows(db, 'select count(*) as counted from storeitem');
	return r.success? r.rows[0].counted: null;
}

async function SetVideoOption( id, VideoOption) {
	var r = await 
    getrows(db, 'update storeitem set VideoOption=? where id = ?', [ VideoOption, id ]);
	return r.success;
}

async function FileInStore(filename, userid=null)
{

	var sql = 'select id from storeitem where filenameonserver=? '
	var params = [ path.basename(filename) ];
	
	if (userid)
	{
		params.push(userid);
		sql += (userid!=null ? ' and userid=?': "");
	}
	
	var r = await getrows(db,sql,params);

	if (r.success)
	{
		if (r.rows.length > 0)
		{
			return {res: true, id: r.rows[0] , file: filename};
		}
		else
		{
			return {res: false, id: -1, file: filename};
		}
	}

	throw r.err;
}


async function MarkMissingOnline( id, missing)
{
	var r = await getrows(db,'update StoreItem set Online=? where id=?', [!missing,id]);
	return r.success;
}

async function AddStoreItem( id, filename, userid) {
	var r = await 
    getrows(db, 'insert into StoreItem(id,filenameonserver,userid) values (?, ?, ?)', [
		id,
		filename,
		userid
	]);

	return r.success;
}

async function MarkFinished( id, finished, finishedsize, missinglocal=false) {
	var r = await getrows(db, 'update StoreItem set finished= ?,  finishedsize= ?, downloadmissinglocal=? where id =? ', [
		finished,
		finishedsize,
		missinglocal,
		id
	]);

	return r.success;
}

async function MarkMissingLocal( id, val) {
	var r = await getrows(db, 'update storeitem set missinglocal = ? where id =?', [ val, id ]);
  
    return r.success;
}


async function UpdateOriginalSizeIf( id, size) {
	var r = await getrows(db, 'update storeitem set originalsize = ? where id = ? and originalsize is null', [ size, id ]);
	return r.success;
}

async function UpdateSize( id, size) {
	var r = await getrows(db, 'update storeitem set sizeonserver = ? where id = ?', [ size, id ]);
	return r.success;
}


async function CheckExists( id) {
	var r = await getrows(db, 'select 1 from StoreItem where id=?', id);

	return r.success && r.rows.length == 1 ? true: false;
}

async function GetIds() {
	var r = await getrows(db, 'select id, finished from storeitem where 1=1');

	return r.success ? r.rows: null;
}

async function GetById( id)
{
    var r = await getrows(db, 'select * from storeitem where id=?',[id]);
    return r.success && r.rows.length == 1? r.rows[0]:null;
}

async function GetItems( userid=null, offset=null, limit=null)
{
    var sql = ' select * from storeitem ' + 
            (limit != null? " limit "+limit:" ") +
            (offset != null?" offset "+offset:" ") +
            ( userid !=null ? " where userid=?": " ");

    var r = await getrows(db, sql,  userid == null ? [] : [userid]);

    return (r.success && r.rows.length > 0? r.rows:null);
}

async function GetUnfinishedItems( userid=null, offset=null, limit=null)
{
    var sql = ' select * from storeitem ' + 
            " where finished=0 "+
            ( userid !=null ? " and userid=?": " ")+
            (limit != null? " limit "+limit:" ") +
            (offset != null?" offset "+offset:" ") ;
           

    var r = await getrows(db, sql,  userid == null ? [] : [userid]);
    return (r.success && r.rows.length > 0? r.rows:null);
}


async function SetFinishedSize( id, size)
{
	var r = await getrows(db, 'update storeitem set finishedsize=? where id=?', [size,id]);
	return r.success;
}

async function MarkWaitTillNext(id, val)
{
	var r = await getrows(db, 'update storeitem set waittillnext=? where id=?',[val,id]);

	return r.success;
}

async function ClearAllWaitTillNext(userid)
{
	var r = await getrows(db, 'update storeitem set waittillnext=0 where userid=? ',[userid]);

	return r.success;
}


function InitDB(_db)
{
	db = _db
}

async function GetItemsByIds(idarray)
{
	
	prepare = idarray.map(function(v) { return "'"+v+"'"}).join();
	
	var r = await getrows(db, 'select * from storeitem where id in (?)',[prepare]);

	return r.success? r.rows:null;
}

async function CheckExistsFileByNames(namesarray,userid)
{
	prepare = namesarray.map(function(v) { return "'"+v+"'"}).join();

	var r = await getrows(db, 'select * from storeitem where filenameonserver in (?) and userid=?',[prepare,userid]);

	return r.success ? r.rows: null;
}

async function deleteQueue()
{
	var r = await getrows(db, 'delete from queuestore',[])

	return r.success;
}

async function addqueueitems(itemlist)
{
	 await db.run("begin transaction");

	for (var i in itemlist)
	{
		var p = [itemlist[i].id, itemlist[i].filename, JSON.stringify( itemlist[i].mediaMetadata)];

		var stmt = await getrows(db,'insert into queuestore(id, filename,mediadata) values (?,?,?) ',p);

	//	await stmt.finalize();
	}

	//stmt.finalize();
	await db.run('commit');
	
}


async function getNewItems(userid)
{
	var sql = "select count(*) as newitemcount from queuestore q "+
	"where not exists (select null from storeitem s where  s.id=q.id and s.userid=?)";

	var newitems = await getrows(db,sql,[userid]);

	return newitems.success? newitems.rows[0]["newitemcount"]:0;
}

// Get a list of 
async function setWaitTillNextFromQueue(userid)
{
	suc = await ClearAllWaitTillNext(userid);

	sql = `update storeitem  
	set waittillnext = not storeitem.finished
	from queuestore q
	where q.id = storeitem.id
	and storeitem.userid=?`;

	var stmt = db.prepare(sql,[userid]);

	var res = await getrows(db,sql,[userid])

	return res.success
}

async function getNext100Waiting(userid)
{
	sql = "select * from StoreItem where WaitTillNext=1 and userid=? limit 100"

	var res = await getrows(db,sql, [userid]);

	return res.success ? res.rows : null;
}

async function createNewStoreItemsFromQueue(userid)
{
	var sql="insert into StoreItem(Id,FileNameOnServer,MediaData,UserId,WaitTillNext) "+
			"select q.id, q.filename, q.mediadata, ?, 1 from queuestore q "+
			"where not exists (select null from storeitem s where  s.id=q.id and s.userid=? ) ";
	
	var res = await getrows(db,sql,[userid,userid]);

	return res.success;
}

async function getCountWaiting(userid)
{
	var sql = "select count(*) as waitingcount from StoreItem where userid=? and waittillnext=1"

	var res = await getrows(db,sql,[userid]);

	return res.rows[0].waitingcount;

}


module.exports = {
	InitDB: InitDB,
	CheckExists: CheckExists,
	MarkFinished: MarkFinished,
	UpdateSize: UpdateSize,
	MarkMissingLocal: MarkMissingLocal,
	AddStoreItem: AddStoreItem,
	SetVideoOption: SetVideoOption,
	GetIds: GetIds,
	getItemCount: getItemCount,
	GetById:GetById,
    queryResult:queryResult,
    GetItems: GetItems,
    GetUnfinishedItems: GetUnfinishedItems,
    getrows:getrows,
	FileInStore:FileInStore,
	MarkMissingOnline:MarkMissingOnline,
	SetFinishedSize:SetFinishedSize,
	MarkWaitTillNext:MarkWaitTillNext,
	ClearAllWaitTillNext:ClearAllWaitTillNext,
	UpdateOriginalSizeIf: UpdateOriginalSizeIf,
	GetItemsByIds: GetItemsByIds,
	CheckExistsFileByNames: CheckExistsFileByNames,
	addqueueitems:addqueueitems,
	deleteQueue:deleteQueue,
	getNewItems:getNewItems,
	setWaitTillNextFromQueue:setWaitTillNextFromQueue,
	getNext100Waiting: getNext100Waiting,
	createNewStoreItemsFromQueue:createNewStoreItemsFromQueue,
	getCountWaiting:getCountWaiting
};
