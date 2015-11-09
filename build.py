from __future__ import absolute_import, print_function, unicode_literals

import sys
import os
import subprocess
import argparse
import traceback
import platform
import timeit
import shutil

def check(code):
    if code != 0:
        raise Exception('step failed')

# the F# library
def build_gamelib(mode):
    check(subprocess.call(['python', 'gamelib/build.py', mode]))

# blockly
def build_blockly(mode, flags):
    check(subprocess.call(['python', 'build.py'], cwd='blockly'))

# HACK HACK HACK
config_file = None

# the actual webpage
def build_html(mode, flags):
    if config_file is not None:
        print("Copying config file %s to html/js/config.js..." % config_file)
        shutil.copyfile(config_file, 'html/js/config.js')

    check(subprocess.call(['npm', 'install'], cwd='html/'))
    check(subprocess.call(['gulp', flags], cwd='html/'))

build_steps = {
    'blockly': build_blockly,
    'html': build_html,
}

def build(target, mode, flags):
    print("Building '%s'..." % target)
    build_steps[target](mode, flags)
    print("Done building '%s'." % target)

def main(args):
    global config_file
    config_file = args.config

    start_time = timeit.default_timer()

    build_order = {}
    build_order['all'] = ['blockly', 'html']
    mode = args.mode
    target = args.target
    flags = {}
    flags['html'] = "--" + args.gulpflag
    flags['blockly'] = ""

    try:
        if target in build_order:
            for t in build_order[target]: build(t, mode, flags[t])
        else:
            build(target, mode, flags[target])
    except:
        traceback.print_exc()
        sys.stderr.write("BUILD FAILED :(\n")
        sys.exit(1)

    end_time = timeit.default_timer()
    print('Finished in %f seconds' % (end_time - start_time))

if __name__ == '__main__':
    _desc = '''
    Build all the things.
    Does not do dependency checking, simply builds them all in order.
    You can only build one step of the process by passing in something other than 'all'.
    '''
    targets = ['all', 'blockly', 'html']

    parser = argparse.ArgumentParser(description=_desc)
    parser.add_argument('target', nargs='?', default='all', choices=targets, help='The target to build. Defaults to all.')

    mut = parser.add_mutually_exclusive_group()
    mut.add_argument('-d', action='store_const', dest='mode', const='debug', default='debug',
        help="Build in debug mode (default)."
    )
    mut.add_argument('-r', action='store_const', dest='mode', const='release',
        help="Build in release mode."
    )

    parser.add_argument('--config', '-c', dest='config', default=None,
        help="Config file to use in place of default (this should be something from build/ for production builds!)"
    )

    parser.add_argument('--gulpflag', '-g', dest='gulpflag', default="",
        help="Flag to pass to gulp when it builds the html target"
    )

    main(parser.parse_args())

