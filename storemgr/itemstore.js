const sqlite3 = require('sqlite3').verbose();

// itemstore object
// {
//     "id": "AAs_2xY0TPLdYdba-IcKQZVIy8JnzzxO9FrmyrvNY3m2jCD1nZS-ctJRdeYiZ3jHvjhJXdgOkbyTN8A3RfjOLAjPpHy8xJw2oA",
//     "filename": "IMG_2115.MOV",
//     "size": "5868486",
//     "finished": false,
//     "userid": "115473458188357073643",
//     "voption": "v",
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

async function getItemCount(db) {
	var r = await 
    getrows(db, 'select count(*) as counted from storeitem');
	return r.success? r.rows[0].counted: null;
}

async function SetVOption(db, id, voption) {
	var r = await 
    getrows(db, 'update storeitem set voption=? where id = ?', [ voption, id ]);
	return r.success;
}

async function AddStoreItem(db, id, filename, userid) {
	var r = await 
    getrows(db, 'insert into StoreItem(id,filenameonserver,userid) values (?, ?, ?)', [
		id,
		filename,
		userid
	]);

	return r.success;
}

async function MarkFinished(db, id, finished, finishedsize) {
	var r = await getrows(db, 'update StoreItem set finished= ?,  finishedsize= ? where id =? ', [
		finished,
		finishedsize,
		id
	]);

	return r.success;
}

async function MarkMissingLocal(db, id, val) {
	var r = await getrows(db, 'update storeitem set missinglocal = ? where id =?', [ val, id ]);
  
    return r.success;
}


async function UpdateOriginalSize(db, id, size) {
	var r = await getrows(db, 'update storeitem set originalsize = ? where id = ?', [ size, id ]);
	return r.success;
}

async function UpdateSize(db, id, size) {
	var r = await getrows(db, 'update storeitem set sizeonserver = ? where id = ?', [ size, id ]);
	return r.success;
}

async function markOnline(db, id, online) {
	var r = await getrows(db, 'update storeitem set online = ? where id = ?', [ online, id ]);
	return r.success;
}

async function CheckExists(db, id) {
	var r = await getrows(db, 'select 1 from StoreItem where id=?', id);

	return r.success && r.rows.length == 1 ? true: false;
}

async function GetIds(db) {
	var r = await getrows(db, 'select id, finished from storeitem where 1=1');

	return r.success ? r.rows: null;
}

async function GetById(db, id)
{
    var r = await getrows(db, 'select * from storeitem where id=?',[id]);
    return r.success && r.rows.length == 1? r.rows[0]:null;
}

async function GetItems(db, userid=null, offset=null, limit=null)
{
    var sql = ' select * from storeitem ' + 
            (limit != null? " limit "+limit:" ") +
            (offset != null?" offset "+offset:" ") +
            ( userid !=null ? " where userid=?": " ");

    var r = await getrows(db, sql,  userid == null ? [] : [userid]);

    return (r.success && r.rows.length > 0? r.rows:null);
}

async function GetUnfinishedItems(db, userid=null, offset=null, limit=null)
{
    var sql = ' select * from storeitem ' + 
            " where finished=0 "+
            ( userid !=null ? " and userid=?": " ")+
            (limit != null? " limit "+limit:" ") +
            (offset != null?" offset "+offset:" ") ;
           

    var r = await getrows(db, sql,  userid == null ? [] : [userid]);
    return (r.success && r.rows.length > 0? r.rows:null);
}


module.exports = {
	CheckExists: CheckExists,
	MarkFinished: MarkFinished,
	UpdateSize: UpdateSize,
	MarkMissingLocal: MarkMissingLocal,
	markOnline: markOnline,
	AddStoreItem: AddStoreItem,
	SetVOption: SetVOption,
	GetIds: GetIds,
	getItemCount: getItemCount,
	GetById:GetById,
    queryResult:queryResult,
    GetItems: GetItems,
    GetUnfinishedItems: GetUnfinishedItems
};
