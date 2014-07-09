from __future__ import absolute_import, print_function, unicode_literals

import sys
import os
import subprocess
import argparse
import traceback

def check(code):
    if code != 0:
        raise Exception('step failed')

# the F# library
def build_gamelib():
    check(subprocess.call(['python', 'gamelib/build.py']))

# the Unity project
def build_unity():
    check(subprocess.call(['python', 'unity/build.py']))

# blockly
def build_blockly():
    check(subprocess.call(['python', 'build.py'], cwd='blockly/blockly/'))

# the actual webpage
def build_html():
    check(subprocess.call(['npm', 'install'], cwd='html/', shell=True))
    check(subprocess.call(['gulp', 'default'], cwd='html/', shell=True))

build_steps = {
    'gamelib': build_gamelib,
    'unity': build_unity,
    'blockly': build_blockly,
    'html': build_html,
}

def build(target):
    print("Building '%s'..." % target)
    build_steps[target]()
    print("Done building '%s'." % target)

def main(args):
    build_order = ['gamelib', 'unity', 'blockly', 'html']

    try:
        if args.target == 'all':
            for t in build_order: build(t)
        else:
            build(args.target)
    except:
        traceback.print_exc()
        sys.stderr.write("BUILD FAILED :(\n")
        sys.exit(1)

if __name__ == '__main__':
    _desc = '''
    Build all the things.
    Does not do dependency checking, simply builds them all in order.
    You can only build one step of the process by passing in something other than 'all'.
    '''
    targets = ['all', 'gamelib', 'unity', 'blockly', 'html']

    parser = argparse.ArgumentParser(description=_desc)
    parser.add_argument('target', nargs='?', default='all', choices=targets, help='The target to build. Defaults to all.')

    main(parser.parse_args())

