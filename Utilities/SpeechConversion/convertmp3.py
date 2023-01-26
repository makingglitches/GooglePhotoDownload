import pathlib
import sys
import os

# get the directory
first = sys.argv[1]

p = pathlib.Path(first)
outp = pathlib.Path("./output");

second =    p.name.replace(p.suffix,'.mp3')

finalname = outp.joinpath(second).as_posix()

command = f"copyAudio \"{first}\" \"{finalname}\" "

exitcode = os.system(command)
