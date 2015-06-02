#!/usr/bin/env python
from __future__ import absolute_import, print_function

import sys
import os
import subprocess

PY2 = sys.version_info[0] == 2

localdir = os.path.abspath(os.path.dirname(__file__))
rootdir = os.path.join(localdir, '..')

def check_output(args, cwd=None):
    '''Wrapper for subprocess.check_output that converts result to unicode'''
    with open(os.devnull, 'w') as devnull:
        result = subprocess.check_output(args, cwd=cwd, stderr=devnull)
    if PY2:
        return result
    else:
        return result.decode('utf-8')

def get_changed():
    out1 = check_output(['hg', 'status', '-man'], cwd=rootdir).replace('\r','').split('\n')
    try:
        out2 = check_output(['hg', 'qstatus', '-man'], cwd=rootdir).replace('\r','').split('\n')
    except: out2 = []
    return [f for f in out1 + out2 if f.endswith(('.fs', '.cs'))]

for filename in get_changed():
    with open(filename, 'rb') as f:
        contents = f.read()
        if not PY2:
            contents = contents.decode('utf-8')
    if '\r' in contents:
        print('Converting %s...' % filename)
        with open(filename, 'wb') as f:
            towrite = contents.replace('\r','')
            if not PY2:
                towrite = towrite.encode('utf-8')
            f.write(towrite)


