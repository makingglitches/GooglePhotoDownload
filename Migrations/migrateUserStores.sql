
insert
    or ignore into ImageDirectories(
        Directory,
        Name,
        Active,
        TrustedStore,
        OriginalStore,
        ServerOnlyOrganizer,
        UserSpecific,
        UserId
    )
select
    StoreDirectory,
    'Downloaded ' || UserId,
    True,
    True,
    False,
    False,
    True,
    UserId
from
    Accounts
union
select
    OnServerDir,
    'Onserver ' || UserId,
    True,
    False,
    False,
    True,
    True,
    UserId
from
    Accounts
union
select
    *
from
    (
        select
            distinct LocalDir,
            'Originals ',
            True,
            False,
            True,
            False,
            False,
            Null
        from
            Accounts
    )


select sql from sqlite_master where tbl_name='Accounts'


alter table
    Accounts rename to Accounts_old 
    
CREATE TABLE Accounts (
        Name CHAR (255),
        EmailId CHAR (255),
        UserId CHAR (25) PRIMARY KEY NOT NULL
    )

insert into Accounts 
select Name, EmailId, UserId from Accounts_old

drop table Accounts_old

drop table AccountImageDirectory