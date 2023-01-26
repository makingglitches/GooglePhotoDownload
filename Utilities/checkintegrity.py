#This script checks if the the video files in the directory tree named are playable.
#It keeps track of success in a file called "succeeded.log" so that the user can return
#to the process. 
#I have not tested the method of verification exhaustively, it attempts an in memory play of 
# the video file using ffmpeg, if any errors are found it redirects them to a file named 
# "errors.log", the script checks to see if this file contains any information, if it does it 
# will place the filename in fileerrors.log.
# the script "checkdirectory.sh" will pipe all files found in the selected directory to 
# this script if called.


import sys
import os
import pathlib
import re


#check if error log exists
if os.path.exists('error.log'):
    os.remove('error.log')

if not os.path.exists('fileerrors.log'):
    os.system('touch fileeerrors.log')

# check if succeeded log exists
if not os.path.exists("succeeded.log"):
    os.system('touch succeeded.log')

#retrieve filename, first and only argument
videofilename = sys.argv[1]

#videofilename="/mnt/Seagate1TB/Photos and Videos/partyinthecia2/VID_20150315_045652.mp4"


# checking this file is 1000s of times faster than waiting
checklog = open("succeeded.log",'r')

print(f"checking {videofilename}")

for line in checklog:
    if line.strip() == videofilename:
        print(f"skipping {videofilename} ")
        checklog.close()
        exit(0)

checklog.close()

print("didn't find it in logs.")

# this is the command i found, checked its output
# error.log will be empty if there is no file corruption
# that ffmpeg can find, probably a good idea to 
# do other checks too of some sort.

print(f"Running on {videofilename}")

#https://superuser.com/questions/100288/how-can-i-check-the-integrity-of-a-video-file-avi-mpeg-mp4
command = f"ffmpeg -v error -i \"{videofilename}\" -f null - 2>error.log"


#execute ffmpeg to test the file
os.system(command)
print('done.')

# if error log contains any lines, there was a problem
f = open("error.log", "r")

alllines = f.read()

f.close()

error = False

if len(alllines) > 0:
    print(f"errors in {videofilename}")

    err = open("fileerrors.log",'a')
    err.write(videofilename+"\n")
    err.flush()
    err.close()
    
if not error:
    f = open("succeeded.log",'a')

    f.write(videofilename+"\n")

    f.flush()
    f.close()

exit(error)