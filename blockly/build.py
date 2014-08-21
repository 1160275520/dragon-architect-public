from __future__ import absolute_import, print_function, unicode_literals
import sys, os, subprocess, argparse, json, shutil

THIS_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.abspath(os.path.join(THIS_DIR,'../..'))

def errprint(s): sys.stderr.write(s + "\n")

def abort(msg):
    errprint(msg)
    sys.exit(1)

def invalid_engine(dep):
    abort('ABORT: uknown VCS engine "%s"' % dep['engine'])

def getcmdout(args, dep):
    return subprocess.check_output(args, cwd=os.path.join(ROOT_DIR, dep['local']))

def runcmd(args, dep):
    subprocess.check_call(args, cwd=os.path.join(ROOT_DIR, dep['local']))

def does_exist(dep):
    local = dep['local']

    if dep['engine'] == 'hg':
        args = ['hg', 'status']
    elif dep['engine'] == 'git':
        args = ['git', 'status', '--porcelain']
    else:
        invalid_engine(dep)

    try:
        runcmd(args, dep)
        return True
    except:
        return False

def init(dep):
    path = os.path.abspath(os.path.join(ROOT_DIR, dep['local']))
    print("Creating folder '%s' for repository..." % path)
    # intentionally want this to fail if the directory already exists to avoid blowing over some random directory
    os.makedirs(path)

    if dep['engine'] == 'hg':
        runcmd(['hg', 'init'], dep)
    elif dep['engine'] == 'git':
        pass
        runcmd(['git', 'init'], dep)
    else:
        invalid_engine(dep)

def checkout(dep):
    rev = dep['revision']
    remote = dep['remote']

    if dep['engine'] == 'hg':
        try:
            runcmd(['hg', 'update', '-r', rev], dep)
        except subprocess.CalledProcessError:
            print("Don't have commit, pulling from remote '%s'..." % remote)
            runcmd(['hg', 'pull', '-r', rev, remote], dep)
            runcmd(['hg', 'update', '-r', rev], dep)
    elif dep['engine'] == 'git':
        try:
            runcmd(['git', 'checkout', rev], dep)
        except subprocess.CalledProcessError:
            print("Don't have commit, pulling from remote '%s'..." % remote)
            runcmd(['git', 'fetch', remote], dep)
            runcmd(['git', 'checkout', rev], dep)
    else:
        invalid_engine(dep)

def get_checked_out_revision(dep):
    if dep['engine'] == 'hg':
        return getcmdout(['hg', 'id', '-i', '--debug'], dep).strip()
    elif dep['engine'] == 'git':
        return getcmdout(['git', 'rev-parse', '--verify', 'HEAD'], dep).strip()
    else:
        invalid_engine(dep)

def is_clean(dep):
    local = dep['local']

    if dep['engine'] == 'hg':
        return len(getcmdout(['hg', 'status'], dep)) == 0
    elif dep['engine'] == 'git':
        return len(getcmdout(['git', 'status', '--porcelain'], dep)) == 0
    else:
        invalid_engine(dep)

def build(deps):
    print("\nbuilding...\n")

    # HACK assumes this is blockly
    blockly = deps[0]
    assert(blockly['local'] == 'blockly-ruthefjord')
    runcmd(['python', 'mybuild.py'], blockly)
    tocopy = ['blockly.js', 'blockly.js.map']

    blocklyroot = os.path.join(ROOT_DIR, blockly['local'])
    src = os.path.join(ROOT_DIR, os.path.join(blockly['local'], 'dist'))
    dst = os.path.join(THIS_DIR, '../html/generated')
    for fname in tocopy:
        shutil.copyfile(os.path.join(src,fname),os.path.join(dst,fname))

    for dirn in ['core', 'blocks']:
        dstdir = os.path.join(dst, dirn)
        shutil.rmtree(dstdir, ignore_errors=True)
        shutil.copytree(os.path.join(blocklyroot, dirn), dstdir)

    # also copy core and blocks folders so source maps work

def save_deps(deps):
    print('Saving dependency file...')
    with open(os.path.join(THIS_DIR,'dependencies.json'), 'wb') as f:
        f.write("[")
        for i, dep in enumerate(deps):
            if i != 0:
                f.write(",\n{\n")
            else:
                f.write("\n{\n")

            f.write('\t"local":"%s",\n' % dep['local'])
            f.write('\t"engine":"%s",\n' % dep['engine'])
            f.write('\t"remote":"%s",\n' % dep['remote'])
            f.write('\t"revision":"%s"\n' % dep['revision'])

            f.write("}")
        f.write("\n]\n")

def main(args):
    print(ROOT_DIR)
    with open(os.path.join(THIS_DIR,'dependencies.json')) as f:
        deps = json.load(f)

    local = 'blockly-ruthefjord'

    for dep in deps:
        if not does_exist(dep):
            if args.action == 'update_deps':
                init(dep)
            else:
                abort('ABORT: dependency "%s" does not exist. Run without flags to clone repository.' % dep['local'])

    for dep in deps:
        if args.action != 'force' and not is_clean(dep):
            abort('ABORT: dependency "%s" has local changes. Commit changes or re-run with "-f" to ignore.' % dep['local'])

        if args.action == 'update_deps':
            checkout(dep)

    build(deps)

    if args.action == 'set_deps':
        for dep in deps:
            dep['revision'] = get_checked_out_revision(dep)
        save_deps(deps)

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


