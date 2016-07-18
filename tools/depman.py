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
            self.engines = {k: _engines[v['engine']](self.root_path, v) for k,v in self.deps.items()}

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
        return _getcmdcode(args, self.engines[name])

    def checkout_dependencies(self):
        """Update all dependencies to listed revisions.
        Fails if any local copies are unclean."""
        for name, eng in self.engines.items():
            if eng.does_exist():
                if not eng.is_clean():
                    raise RuntimeError("Dependency '%s' is not clean! Not checking out." % name)
                eng.go_to_revision()
            else:
                eng.create_repo()

    def set_dependencies(self):
        """Update the dependency map to the revisions of the current working copies.
        The caller must afterward invoke save_dependency_file to save these changes to disk!
        Fails if any local copies are non-existent unclean."""
        # check that everything is clean first
        for name, eng in self.engines.items():
            if not eng.does_exist():
                raise RuntimeError("Dependency '%s' does not exist! Not saving." % name)
            if not eng.is_clean():
                raise RuntimeError("Dependency '%s' is not clean! Not saving." % name)

        # then do updates
        for name, eng in self.engines.items():
            self.deps[name]['revision'] = eng.get_revision_id()

        # also update 'pristine' copy for saving
        for dep in self.deps_file['dependencies']:
            dep['revision'] = self.deps[dep['name']]['revision']

    def ensure_exist(self):
        """Checks to see if the dependencies' at least exist, but otherwise does nothing.
        Will throw an exception if any of the repositories do not exist."""
        for name, eng in self.engines.items():
            if not eng.does_exist():
                raise RuntimeError("Dependency '%s' does not exist! Not saving." % name)

    def save_dependency_file(self):
        # w uses wrong line endings on python 2 with windows but wb doesn't allow unicode strings with python 3 X(
        with open(self.deps_path, 'wb' if PY2 else 'w') as f:
            # manually encode the json file to control fomatting to make diff-friendly changes
            f.write('{\n\t"root":"%s",\n\t"dependencies":[\n\t\t{\n' % self.deps_file['root'])
            for i, dep in enumerate(self.deps_file['dependencies']):
                if i != 0:
                    f.write(",\n\t\t{\n")

                for j, key in enumerate(['name', 'local', 'engine', 'remote', 'revision', 'branch']):
                    # this guard allows optional params, but it will totally mess up commas if 'name' is missing.
                    # 'branch' is the only real optional parameter anyway, so this is not a big deal
                    if key in dep:
                        if j != 0:
                            f.write(",\n")
                        f.write('\t\t\t"%s":"%s"' % (key, dep[key]))

                f.write("\n\t\t}")
            f.write("\n\t]\n}\n")


def _path_of_dep(root, dep):
    return os.path.abspath(os.path.join(root, dep['local']))

def _getcmdout(args, engine):
    cwd = _path_of_dep(engine.root, engine.dep)
    print('executing "' + ' '.join(args) + '" in ' + cwd)
    sys.stdout.flush()
    result = subprocess.check_output(args, cwd=cwd)
    if PY2:
        return result
    else:
        return result.decode('utf-8')

def _getcmdcode(args, engine):
    cwd = _path_of_dep(engine.root, engine.dep)
    print('executing "' + ' '.join(args) + '" in ' + cwd)
    sys.stdout.flush()
    subprocess.check_call(args, cwd=cwd)

def _execute(args, cwd):
    print('executing "' + ' '.join(args) + '" in ' + cwd)
    sys.stdout.flush()
    subprocess.check_call(args, cwd=cwd)

class MercurialEngine(object):
    def __init__(self, root, dep):
        self.root = root
        self.dep = dep

    def does_exist(self):
        """Returns boolean indicating whether the dependency currently locally exists."""
        try:
            _getcmdcode(['hg', 'id'], self)
            return True
        except:
            return False
        #except: subprocess.CalledProcessError:
        #except NotADirectoryError:
        #    return False

    def create_repo(self):
        """Create a repository, set the default remote, and set worknig copy to the specified revision."""
        _execute(['hg', 'clone', '-r', self.dep['revision'], self.dep['remote'], self.dep['local']], self.root)

    def go_to_revision(self):
        """Update the dependency's working copy to the listed revision id."""
        rev = self.dep['revision']
        remote = self.dep['remote']

        try:
            _getcmdcode(['hg', 'update', '-r', rev], self)
        except subprocess.CalledProcessError:
            print("Don't have commit, pulling from remote '%s'..." % remote)
            _getcmdcode(['hg', 'pull', '-r', rev, remote], self)
            _getcmdcode(['hg', 'update', '-r', rev], self)

    def get_revision_id(self):
        """Return the (long) revision id of the dependency's working copy."""
        return _getcmdout(['hg', 'id', '-i', '--debug'], self).strip()

    def is_clean(self):
        """Return boolean indicated whether the dependency working copy is clean."""
        return len(_getcmdout(['hg', 'status'], self)) == 0


class GitEngine(object):
    def __init__(self, root, dep):
        self.root = root
        self.dep = dep

    def does_exist(self):
        """Returns boolean indicating whether the dependency currently locally exists."""
        try:
            _getcmdcode(['git', '--no-pager', 'log', '-n', '0'], self)
            return True
        except:
            return False
        #except: subprocess.CalledProcessError:
        #except NotADirectoryError:
        #    return False

    def create_repo(self):
        """Create a repository, set the default remote, and set worknig copy to the specified revision."""
        # intentionally want this to fail if the directory already exists to avoid blowing over some random directory
        os.makedirs(_path_of_dep(self.root, self.dep))
        # not a great way to clone a git repo only up to a specific revision, so have to grab entire thing
        _execute(['git', 'clone', self.dep['remote'], self.dep['local']], self.root)
        # if a branch is listed, immediately do a checkout to force creation
        if 'branch' in self.dep:
            _getcmdcode(['git', 'checkout', self.dep['branch']], self)
        self.go_to_revision()

    def get_head_revision_of_branch(self, branch):
        if 'branch' not in self.dep:
            return None
        else:
            res = _getcmdout(['git', 'show-ref', '--verify', branch], self).strip()
            return res.split(' ')[0]

    def go_to_revision(self):
        """Update the dependency's working copy to the listed revision id."""
        rev = self.dep['revision']
        remote = self.dep['remote']

        # shortcut: if we're already at the revision, do nothing!
        #if self.get_revision_id() != rev:
        try:
            # If we just checkout the revision directly git will detach the head.
            # So first check if the listed branch's head is the revision we want, in which case checkout the branch instead.
            if 'branch' in self.dep and self.get_head_revision_of_branch('refs/heads/' + self.dep['branch']) == self.dep['revision']:
                _getcmdcode(['git', 'checkout', self.dep['branch']], self)
            else:
                _getcmdcode(['git', 'checkout', '-q', rev], self)
        except subprocess.CalledProcessError:
            print("Don't have commit, fetching from remote '%s'..." % remote)
            # fetching only a specific changeset is a pain, so just fetch everything
            _getcmdcode(['git', 'fetch', remote], self)
            # first attempt to ff-merge from the current branch
            # failing that, just checkout the exact revision and detach ourselves
            try:
                _getcmdcode(['git', 'merge', '--ff-only', rev], self)
            except subprocess.CalledProcessError:
                _getcmdcode(['git', 'checkout', '-q', rev], self)

    def get_revision_id(self):
        """Return the (long) revision id of the dependency's working copy."""
        return _getcmdout(['git', 'rev-parse', '--verify', 'HEAD'], self).strip()

    def is_clean(self):
        """Return boolean indicated whether the dependency working copy is clean."""
        return len(_getcmdout(['git', 'status', '--porcelain'], self)) == 0


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

_engines = {
    'hg': MercurialEngine,
    'git': GitEngine,
}

