#
#
#
#  Script: FixLocal.py
#  Purpose: The purpose of this script is double check the existen
#  and completion status of local files and update the database
#  accordingly.
#  Also will check the playability of files and sizes.

import sqlite3
import datetime



con = sqlite3.connect('/home/john/Downloads/GooglePhotoDownload-0.75/ItemStore.sqlite')

cur = con.cursor()

cur.close()

con.close()

# constant for calculating datetime utc from epoch second values
def getEpochTime(date:datetime.datetime=None):
    epoch_datetime = datetime.datetime(1970,1,1)

    if date is None:
        date = datetime.datetime.now()
        
    return (date - epoch_datetime).total_seconds()






