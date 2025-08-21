** As of 08/21/2065 for the umpeenth time you people have made everyone repeat the same bs so you can kill yourselves, I noted that the google photos api has been changed
** now you can only use the javascript api to select photos, or the photoslibrary to select and modify content your app made.  which defeats the entire 
** purpose of this application.
** however that being said bear in mind they will eventually reboot the platform in its previous form or you can always request it be changed back
** once the newest group of sickos is done trying to store murder porn / obvious crime advertisements and chomo bs on google photos.
** heres to hoping something improves before I end up dying of old age. heh.

# GooglePhotoDownload
Connects to Google Photos and downloads all content, keeping track of original data on disk and moving 
files only on the computer and already on server to  respective directories, and tries to download th-e 
entire collection and store size info for quicker startup as well as original file sizes of those on disk, 
downloading the files still on disk first so they can be freed up.  

Supports multiple user accounts. 

Its just a better mousetrap. 

Google Takeout prepares whole archives of photos, 
this allows you to download them separately and keep track of some statistics as well on space usage.

Also there are specific flaws to Google Photos this tries to circumvent usually resulting from partial and or abandoned uploads.

Additionally a free account allows photos to be downloaded as usual because they're just http assets, however calling the restful services can result in throttling which this utility limits.

Everything is stored in a nice neat Sqlite Database where item metadata and user account information is concerned.

A little description about StoreItem

Finished column and DownloadMissingLocal are being modified seperately for a reason.
One prohibits re-download
the other indicates the downloaded file can't be found which can result from a location becoming unavailable or the file being moved

the two do not exclusively get set together.

The program also generates sha256 hashes of every downloaded file.

There is also in the works a seperate subproject this will utilize that simply finds all copies of the same file isolating likely culprits in different locations and tracks them by the specific volume (partition and or disk serial) they reside on.
