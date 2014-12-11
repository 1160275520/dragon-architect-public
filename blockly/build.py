from __future__ import absolute_import, print_function, unicode_literals
import sys, os, subprocess, argparse, json, shutil

THIS_DIR = os.path.dirname(__file__)
sys.path.append(os.path.abspath(os.path.join(THIS_DIR, '../tools')))
import depman

PY2 = sys.version_info[0] == 2

def errprint(s): sys.stderr.write(s + "\n")

def abort(msg):
    errprint(msg)
    sys.exit(1)

def build(depmanager):
    print("\nbuilding...\n")

    blockly = 'blockly-ruthefjord'
    depmanager.run_command_in_dependency(blockly, ['python', 'mybuild.py'])
    tocopy = ['blockly.js', 'blockly.js.map']

    blocklyroot = depmanager.path_of_dependency(blockly)
    src = os.path.join(blocklyroot, 'dist')
    dst = os.path.join(THIS_DIR, '../html/generated')
    for fname in tocopy:
        shutil.copyfile(os.path.join(src,fname),os.path.join(dst,fname))

    # also copy core and blocks folders so source maps work
    for dirn in ['core', 'blocks']:
        dstdir = os.path.join(dst, dirn)
        shutil.rmtree(dstdir, ignore_errors=True)
        shutil.copytree(os.path.join(blocklyroot, dirn), dstdir)

def main(args):
    depmanager = depman.DependencyManager(
            os.path.join(THIS_DIR,'dependencies.json'),
            override_file_path=os.path.join(THIS_DIR,'../dependency_override.json'),
            is_verbose=True, ignore_if_override_missing=True)

    try:
        if args.action == 'update_deps':
            depmanager.checkout_dependencies()
        elif args.action == 'set_deps':
            depmanager.set_dependencies()
        elif args.action == 'force':
            depmanager.ensure_exist()
    except:
        e = sys.exc_info()
        abort('ABORT: %s' % e)

    build(depmanager)

    if args.action == 'set_deps':
        depmanager.save_dependency_file()

if __name__ == '__main__':
    _desc = '''
    Build blockly and output the necessary files to html/.
    Build works by cloning/pulling the repositories listed in dependencies.json, building them, and copying over the results.
    The repositories will be cloned as sibling directories of this repository.
    If the repositories are not clean (i.e., there are local changes), the build will fail, to aviod blasting over the local changes.
    '''

    parser = argparse.ArgumentParser(description=_desc)

    mut = parser.add_mutually_exclusive_group()
    mut.add_argument('-s', action='store_const', dest='action', const='set_deps', default='update_deps',
        help="Instead of updating to the version listed in dependencies.json, use the versions of the already existing libraries and overwrite dependencies.json with the new vesrion. Will fail if other repositories are not clean (i.e., have local changes)."
    )
    mut.add_argument('-f', action='store_const', dest='action', const='force',
        help="Do not try to update the other repositories to the versions listed in dependencies.json nor write out new dependencies. Will not warn if repositories are not clean."
    )

    main(parser.parse_args())


