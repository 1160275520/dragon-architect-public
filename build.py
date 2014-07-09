from __future__ import absolute_import, print_function, unicode_literals

import sys
import os
import subprocess

# clean the final bulid FIRST because for some reasons Windows takes its
# sweet ol' time actually deleting the files, and likes to do it IN THE
# MIDDLE OF THE BUILD TASK.
subprocess.call(['npm', 'install'], cwd='html/', shell=True)
subprocess.call(['gulp', 'clean'], cwd='html/', shell=True)

# build gamelib/ (the F# library)
MSBUILD="C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\MSBuild.exe"
GAMELIB_SLN = "gamelib/HackcraftNoUnitTest.sln"
subprocess.call([MSBUILD, GAMELIB_SLN, '/p:Configuration=Release'])

# build unity/ (the Unity project)
subprocess.call(['python', 'unity/build.py'])

# build blockly/
subprocess.call(['python', 'build.py'], cwd='blockly/blockly/')

# build html/
subprocess.call(['gulp', 'default'], cwd='html/', shell=True)

