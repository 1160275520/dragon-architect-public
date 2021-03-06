
import sys
import os
import subprocess
import traceback
import platform

def check(code):
    if code != 0:
        raise Exception('step failed')

system = platform.system()

slnfile = "gamelib/RuthefjordNoUnitTest.sln"

if len(sys.argv) > 1:
    modearg = sys.argv[1]
    if modearg == 'debug':
        configarg = 'Debug'
    elif modearg == 'release':
        configarg = 'Release'
    else:
        sys.stderr.write("Invalid configuration '%s', aborting.\n" % modearg)
        sys.exit(1)
else:
    configarg = 'Debug'

if system == 'Windows':
    command = "C:\\Program Files (x86)\\MSBuild\\12.0\\Bin\\MSBuild.exe"
    check(subprocess.call([command, slnfile, '/p:Configuration=' + configarg, "/t:Rebuild"]))
    #command = "C:\\Program Files (x86)\\Xamarin Studio\\bin\\mdtool"
    #config = "--configuration:" + configarg
    #check(subprocess.call([command, "build", config, "--target:Clean", slnfile]))
    #check(subprocess.call([command, "build", config, "--target:Build", slnfile]))
elif system == 'Darwin':
    if configarg == "Release":
        sys.stdout.write("MAKE SURE YOU HAVE BUILT GAMELIB IN XAMARIN\n")
    else:
        command = "/Applications/Xamarin Studio.app/Contents/MacOS/mdtool"
        config = "--configuration:" + configarg
        check(subprocess.call([command, "build", config, "--target:Clean", slnfile]))
        check(subprocess.call([command, "build", config, "--target:Build", slnfile]))
else:
    sys.stderr.write("platform unsupported!\n")
    raise Exception('platform unsupported')

