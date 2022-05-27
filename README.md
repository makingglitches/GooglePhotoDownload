# GooglePhotoDownload
Connects to Google Photos and downloads all content, keeping track of original data on disk and moving 
files only on the computer and already on server to  respective directories, and tries to download the 
entire collection and store size info for quicker startup as well as original file sizes of those on disk, 
downloading the files still on disk first so they can be freed up.  

Supports multiple user accounts. 

Its just a better mousetrap. 

Google Takeout prepares whole archives of photos, 
this allows you to download them separately and keep track of some statistics as well on space usage.

Also there are specific flaws to Google Photos this tries to circumvent usually resulting from partial and or abandoned uploads.

Additionally a free account allows photos to be downloaded as usual because they're just http assets, however calling the restful services can result in throttling which this utility limits.

Everything is stored in a nice neat Sqlite Database where item metadata and user account information is concerned.

P.S. Worthless chomo whores. Do not delete this for fucks sake. Its freely available anyway you fucks !
