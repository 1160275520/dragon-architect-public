from __future__ import absolute_import, print_function, unicode_literals

import sys
import os
import subprocess

# build gamelib/ (the F# library)

MSBUILD="C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\MSBuild.exe"
GAMELIB_SLN = "gamelib/HackcraftNoUnitTest.sln"

subprocess.call([MSBUILD, GAMELIB_SLN, '/p:Configuration=Release'])

# build unity/ (the Unity project)

subprocess.call(['python', 'unity/build.py'])

# build blockly/

subprocess.call(['python', 'build.py'], cwd='blockly/blockly/')

# build html/
# TODO actually do this!

