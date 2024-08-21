select a.UserId, 
a.Name, 
a.EmailId,
i.Directory || '/' || s.FileNameOnServer as filename,
s.Id
from accounts a
inner join imagedirectories i
on i.UserId = a.UserId
inner join storeitem s
on s.UserId = a.UserId
where i.TrustedStore=1 
