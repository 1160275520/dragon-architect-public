
Our blockly fork is in a different repository.
This folder tracks which versions of blockly/closure we built with (in dependencies.json).
build.py will grab the correct dependencies and pull them into sister directories of this repo.

Instructions for working on the blockly code:
1. When you first built Dragon Architect it would have cloned the blockly repo into a separate folder---look for a
   "blockly" folder in the same directory where the dragon-architect repo is. First step is to delete the blockly repo
   and then run "python blockly/build.py" from the dragon-architect directory. This will clone the new version of the repo.
   You can check that this worked by running "git remote -v" from the blockly repo directory. You should see
       origin  https://github.com/awb-carleton/blockly.git (fetch)
       origin  https://github.com/awb-carleton/blockly.git (push)

2. Make the changes you want to the blockly code in the blockly repo directory.

3. To bring these changes into the game, run "python blockly/build.py -f" from the dragon-architect repo. If you see

        Building 'blockly'...
        executing "git --no-pager log -n 0" in /mnt/c/Users/Aaron/Documents/blockly
        executing "git status --porcelain" in /mnt/c/Users/Aaron/Documents/blockly
        Traceback (most recent call last):
          File "build.py", line 75, in <module>
            main(parser.parse_args())
          File "build.py", line 50, in main
            abort('ABORT: %s' % e)
        TypeError: not all arguments converted during string formatting
        Traceback (most recent call last):
          File "build.py", line 64, in main
            build(target, mode, flags[target])
          File "build.py", line 43, in build
            build_steps[target](mode, flags)
          File "build.py", line 22, in build_blockly
            check(subprocess.call(['python', 'build.py'], cwd='blockly'))
          File "build.py", line 14, in check
            raise Exception('step failed')
        Exception: step failed
        BUILD FAILED :(

   you forgot the "-f". Without -f, blockly/build.py requires that the local blockly repo be "clean", meaning it has no
   uncommitted changes.

4. Commit and push your changes to the blockly repo. Others can pull the changes by running "python blockly/build.py"
   from the dragon-architect directory.