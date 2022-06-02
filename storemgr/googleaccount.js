
// var acc = {
//     userid: config.userid,
//     username: config.username,
//     emailid: config.emailid,
//     title: 'Google User',
//     localdirectory: config.defaultlocaldir,
//     onserverdirectory: config.defaultpulldir+'/'+ config.username+ '/'+config.defaultonserverdir,
//     destdir: config.defaultpulldir + '/'+config.username
// };

const getrows = require("./getRows");


class GoogleAccount  
{
    static  FromRow(row)
    {
        return new GoogleAccount(
            row.UserId,
            row.Name,
            row.EmailId,
            'Google Account');
    }

    static async CheckExistsDb(db,userid)
    {
            // yeah yeah double index scan, the table won't ever have many rows blah blah
            // on a big table this would be awful, this table will likely have less than 20 rows
            var sql = `select 1 as res where exists (select 1 from Accounts where UserId = ? )
            union 
            select 0 as res where not exists (select 1 from Accounts where UserId = ? )`

            var res = await getrows(db,sql,[userid, userid])
            
            var ya = res.rows[0]['res']

            return ya == '1' ? true: false;
        
    }

    static async GetAll(db)
    {

        var accounts = [];

        var res = await getrows(db,'select * from Accounts')

        if (res.success)
        {
             res.rows.forEach(element => {
                accounts.push(GoogleAccount.FromRow(element));        
            });
        }

        return accounts;

    }

    constructor(_userid=null, 
                _username=null, 
                _emailid=null, 
                _title=null)
    {
        this.userid =  _userid;
        this.username=_username;
        this.emailid=_emailid;
        this.title =  'Google User';

        this.UserExistsInDb = async function(db)
        {
            // yeah yeah double index scan, the table won't ever have many rows blah blah
            // on a big table this would be awful, this table will likely have less than 20 rows
            var sql = `select 1 as res where exists (select 1 from Accounts where UserId = ? )
            union 
            select 0 as res where not exists (select 1 from Accounts where UserId = ? )`

            var res = await getrows(db,sql,[this.userid, this.userid])
            
            var ya = res.rows[0]['res']

            return ya == '1' ? true: false;
        }

        this.UpdateInDb =  async function(db)
        {
           var res = await getrows(db ,` UPDATE Accounts
                    SET Name = ?,
                    EmailId = ?,
                    WHERE
                    UserId = ?`,
                    [
                        this.username,
                        this.emailid,
                        this.userid]);

            return res.success;
        }

        this.InsertInDb = async function(db)
        {

            if (await this.UserExistsInDb(db))
            return false;

            var res = await getrows(db , `INSERT INTO Accounts (
                Name,
                EmailId,
                UserId,
           )
            VALUES (
                ?,
                ?,
                ?
            );`,
            [
                this.username,
                this.emailid,
                this.userid
            ]);

            return res.success;

        }
    }

}

module.exports = GoogleAccount;