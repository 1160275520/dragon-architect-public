from __future__ import absolute_import, print_function, unicode_literals

import os
import sys
import platform
import subprocess

localdir = os.path.abspath(os.path.dirname(__file__))
outdir = os.path.abspath(os.path.join(localdir, '../html/generated/hackcraft'))

system = platform.system()
if system == 'Windows':
    unityExecutable = "C:\\Program Files (x86)\\Unity\\Editor\\Unity.exe"
else:
    print('platform unsupported!')
    sys.exit(1)

print('building unity project in "%s", outputting to "%s"...' % (localdir, outdir))

subprocess.call([
    unityExecutable,
    "-batchmode",
    "-projectPath",
    localdir,
    "-buildWebPlayer",
    outdir,
    "-quit",
], cwd=localdir)

