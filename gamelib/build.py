
import sys
import os
import subprocess
import argparse
import traceback
import platform

def check(code):
    if code != 0:
        raise Exception('step failed')

system = platform.system()

slnfile = "gamelib/HackcraftNoUnitTest.sln"
configarg = 'Release'

if system == 'Windows':
    command = "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\MSBuild.exe"
    check(subprocess.call([command, slnfile, '/p:Configuration=' + configarg, "/t:Rebuild"]))
elif system == 'Darwin':
    command = "/Applications/Xamarin Studio.app/Contents/MacOS/mdtool"
    config = "--configuration:" + configarg
    check(subprocess.call([command, "build", config, "--target:Clean", slnfile]))
    check(subprocess.call([command, "build", config, "--target:Build", slnfile]))
else:
    sys.sterr.write("platform unsupported!\n")
    raise Exception('platform unsupported')

