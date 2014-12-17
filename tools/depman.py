'''
Generic project dependency management. Supports Python 2.7+ and 3.4+.
Because sub-repos are hard to use, and I could not find any language-agnostic system.

Tracks dependencies of external version control repositories in a dependencies.json.
Names are used as the primary identifiers, and urls can be overriden with a config file,
for when the default remote repository listed in dependencies.json inevitably disappears.
'''

from __future__ import absolute_import, print_function, unicode_literals
import sys, os, argparse, json, subprocess, copy
PY2 = sys.version_info[0] == 2

class DependencyManager(object):

    def __init__(self, dependency_file_path, override_file_path=None, is_verbose=False, ignore_if_override_missing=False):
        self.deps_path = dependency_file_path
        with open(self.deps_path) as f:
            self.deps_file = json.load(f)
            # deep copy entries so that we have a prsitine version of original dep file for saving.
            self.deps = {d['name']: copy.copy(d) for d in self.deps_file['dependencies']}
            self.root_path = os.path.join(os.path.dirname(self.deps_path), self.deps_file['root'])

        # TODO validate file?

        self.override = None
        if override_file_path is not None:
            try:
                with open(override_file_path) as f:
                    override = json.load(f)
                    # overriden root should be relative to the override file, not the dependency file
                    if 'root' in override:
                        self.root_path = os.path.join(os.path.dirname(override_file_path), override['root'])
                    for dep in override['dependencies']:
                        n = dep['name']
                        # ignore overrides that don't exist in the current file.
                        # that way overrides could be used for multiple dependencies files.
                        if n in self.deps:
                            data = self.deps[n]
                            for k,v in dep.items():
                                data[k] = dep[k]
            except IOError:
                if not ignore_if_override_missing:
                    raise

    def get_dependency(self, name):
        return self.deps[name]

    def path_of_dependency(self, name):
        return _path_of_dep(self.root_path, self.deps[name])

    def run_command_in_dependency(self, name, args):
        return _getcmdcode(args, self.root_path, self.deps[name])

    def checkout_dependencies(self):
        """Update all dependencies to listed revisions.
        Fails if any local copies are unclean."""
        r = self.root_path
        # check that everything is clean first
        for dep in self.deps.values():
            if not _does_exist(r, dep):
                _init_repo(r, dep)
            if not _is_clean(r, dep):
                raise RuntimeError("Dependency '%s' is not clean! Not checking out." % dep['name'])

        # then do updates
        for dep in self.deps.values():
            _checkout(r, dep)

    def set_dependencies(self):
        """Update the dependency map to the revisions of the current working copies.
        The caller must afterward invoke save_dependency_file to save these changes to disk!
        Fails if any local copies are non-existent unclean."""
        r = self.root_path
        # check that everything is clean first
        for dep in self.deps.values():
            if not _does_exist(r, dep):
                raise RuntimeError("Dependency '%s' does not exist! Not saving." % dep['name'])
            if not _is_clean(r, dep):
                raise RuntimeError("Dependency '%s' is not clean! Not saving." % dep['name'])

        # then do updates
        for dep in self.deps.values():
            dep['revision'] = _get_checked_out_revision(r, dep)

        # also update 'pristine' copy for saving
        for dep in self.deps_file['dependencies']:
            dep['revision'] = self.deps[dep['name']]['revision']

    def ensure_exist(self):
        """Checks to see if the dependencies' at least exist, but otherwise does nothing.
        Will throw an exception if any of the repositories do not exist."""
        r = self.root_path
        for dep in self.deps.values():
            if not _does_exist(r, dep):
                raise RuntimeError("Dependency '%s' does not exist!" % dep['name'])

    def save_dependency_file(self):
        # w uses wrong line endings on python 2 with windows but wb doesn't allow unicode strings with python 3 X(
        with open(self.deps_path, 'wb' if PY2 else 'w') as f:
            # manually encode the json file to control fomatting to make diff-friendly changes
            f.write('{\n\t"root":"%s",\n\t"dependencies":[\n\t\t{\n' % self.deps_file['root'])
            for i, dep in enumerate(self.deps_file['dependencies']):
                if i != 0:
                    f.write(",\n\t\t{\n")

                for j, key in enumerate(['name', 'local', 'engine', 'remote', 'revision']):
                    if j != 0:
                        f.write(",\n")
                    f.write('\t\t\t"%s":"%s"' % (key, dep[key]))

                f.write("\n\t\t}")
            f.write("\n\t]\n}\n")


def _path_of_dep(root, dep):
    return os.path.abspath(os.path.join(root, dep['local']))

def _getcmdout(args, root, dep):
    result = subprocess.check_output(args, cwd=_path_of_dep(root, dep))
    if PY2:
        return result
    else:
        return result.decode('utf-8')

def _getcmdcode(args, root, dep):
    print('executing "' + ' '.join(args) + '" in ' + _path_of_dep(root, dep))
    subprocess.check_call(args, cwd=_path_of_dep(root, dep))

def _invalid_engine(dep):
    raise ValueError('Uknown VCS engine "%s"' % dep['engine'])

def _does_exist(root, dep):
    "Returns boolean indicating whether the dependency currently locally exists."
    local = dep['local']

    if dep['engine'] == 'hg':
        args = ['hg', 'status']
    elif dep['engine'] == 'git':
        args = ['git', 'status', '--porcelain']
    else:
        _invalid_engine(dep)

    try:
        _getcmdcode(args, root, dep)
        return True
    except:
        return False

def _init_repo(root, dep):
    """Create an empty repository for the dependency and set the default remote."""
    path = _path_of_dep(root, dep)
    print("Creating folder '%s' for repository..." % path)
    # intentionally want this to fail if the directory already exists to avoid blowing over some random directory
    os.makedirs(path)

    # TODO actually check return code to make sure this succeeded
    if dep['engine'] == 'hg':
        _getcmdcode(['hg', 'init'], root, dep)
        with open(os.path.join(path, '.hg/hgrc'), 'w') as f:
            f.write("[paths]\ndefault=%s\n" % dep['remote'])
    elif dep['engine'] == 'git':
        _getcmdcode(['git', 'init'], root, dep)
        _getcmdcode(['git', 'remote', 'add', 'origin', dep['remote']], root, dep)
    else:
        _invalid_engine(dep)

def _checkout(root, dep):
    """Update the dependency's working copy to the listed revision id."""
    rev = dep['revision']
    remote = dep['remote']

    if dep['engine'] == 'hg':
        try:
            _getcmdcode(['hg', 'update', '-r', rev], root, dep)
        except subprocess.CalledProcessError:
            print("Don't have commit, pulling from remote '%s'..." % remote)
            _getcmdcode(['hg', 'pull', '-r', rev, remote], root, dep)
            _getcmdcode(['hg', 'update', '-r', rev], root, dep)
    elif dep['engine'] == 'git':
        try:
            _getcmdcode(['git', 'checkout', rev], root, dep)
        except subprocess.CalledProcessError:
            print("Don't have commit, pulling from remote '%s'..." % remote)
            _getcmdcode(['git', 'fetch', remote, rev], root, dep)
            _getcmdcode(['git', 'checkout', rev], root, dep)
    else:
        _invalid_engine(dep)

def _get_checked_out_revision(root, dep):
    """Return the (long) revision id of the dependency's working copy."""
    if dep['engine'] == 'hg':
        return _getcmdout(['hg', 'id', '-i', '--debug'], root, dep).strip()
    elif dep['engine'] == 'git':
        return _getcmdout(['git', 'rev-parse', '--verify', 'HEAD'], root, dep).strip()
    else:
        _invalid_engine(dep)

def _is_clean(root, dep):
    """Return boolean indicated whether the dependency working copy is clean."""
    local = dep['local']

    if dep['engine'] == 'hg':
        return len(_getcmdout(['hg', 'status'], root, dep)) == 0
    elif dep['engine'] == 'git':
        return len(_getcmdout(['git', 'status', '--porcelain'], root, dep)) == 0
    else:
        _invalid_engine(dep)

def _main(args):
    depman = DependencyManager(args.depfile, args.override, is_verbose=True)
    if args.operation == 'checkout':
        depman.checkout_dependencies()
    elif args.operation == 'set':
        depman.set_dependencies()
        depman.save_dependency_file()

if __name__ == '__main__':
    _desc = '''
    Operate on dependencies. You can either checkout all depencies or update the dependency file with current revisions.
    '''

    parser = argparse.ArgumentParser(description=_desc)

    parser.add_argument('operation', choices=['checkout', 'set'], help="The operation to perform.")
    parser.add_argument('depfile', help="The dependency configuration file.")
    parser.add_argument('--override', '-o', default=None,
        help="Path of the override depencies file. If given, any entries in this dependency file will take precedence. Setting revisions will still only affect the primary dependency file, however.")

    _main(parser.parse_args())

