var onRuthefjordEvent = (function(){ "use strict";

var program_state = {
    run_state: null,
    edit_mode: null
};

var questLogger;
var handler = {};
var isDevMode = false;
// the modules/puzzles sent up on game start
var game_info;

var current_puzzle_runner;

var world_data;

var current_scene = "title";

var storage = (function() {
    var self = {};
    var base_url = RUTHEFJORD_CONFIG.game_server.url;
    var remote_data;

    self.initialize = function(cb) {
        if (RUTHEFJORD_CONFIG.are_logins) {
            var username = '';
            while (!username) {
                username = window.prompt("Please enter your username");
            }
            // try to grab all the user data
            $.get(base_url + 'player/' + username)
                .done(function(data) {
                    remote_data = data;
                    cb();
                })
                .fail(function(data) {
                    // on failure, make a new user
                    $.ajax(base_url + 'player', {
                        data: JSON.stringify({id:username}),
                        contentType: 'application/json',
                        type: 'POST'
                    })
                        .done(function(data) {
                            remote_data = data;
                            cb();
                        })
                        .fail(function(data) {
                            // if THIS fails, give up and turn off logins
                            console.log("creating a player failed D:")
                            cb();
                        });
                });

        } else {
            cb();
        }
    }

    self.save = function(key, value) {
        if (typeof key !== "string") throw new TypeError("keys must be strings!");
        if (value !== null && typeof value !== "string") throw new TypeError("can only save string values!");

        var o = {};
        o[key] = value;

        if (remote_data) {
            $.ajax(base_url + 'player/' + remote_data.id, {
                data: JSON.stringify(o),
                contentType: 'application/json',
                type: 'PUT'
            });
            remote_data[key] = value;
        } else {
            sessionStorage.setItem(key, value);
        }
    }

    self.load = function(key, cb) {
        if (remote_data) {
            cb(remote_data[key]);
        } else {
            cb(sessionStorage.getItem(key));
        }
    }

    self.remove = function(key) {
        if (remote_data) {
            $.ajax(base_url + 'player/' + remote_data.id, {
                data: JSON.stringify({key:null}),
                contentType: 'application/json',
                type: 'PUT'
            });
            remote_data[key] = null;
        } else {
            sessionStorage.removeItem(key);
        }
    }

    return self;
}());

var content = (function() {
    var self = {};

    /** Returns a promise. */
    self.initialize = function() {
        game_info = {};

        var qm = Q($.get('content/modules.json'))
            .then(function(json) {
                game_info.modules = json;
            });

        var qs = Q($.get('content/puzzles.json'))
            .then(function(json) {
                game_info.puzzles = json;
                // HACK we want these objects to have id as a property instead of being a mysterious key mapping.
                _.each(json, function(val, key) {
                    val.id = key;
                });
            });

        return Q.all([qm, qs]);
    }

    self.puzzles = function() { return _.values(game_info.puzzles); }

    return self;
}());

var progress = (function(){
    var self = {};

    var puzzles_completed = [];

    self.initialize = function(cb) {
        // load the level progress from this session (if any)
        if (sessionStorage.getItem("puzzles_completed")) {
            storage.load("puzzles_completed", function(x) {
                puzzles_completed = x.split(',');
                cb();
            });
        } else {
            cb();
        }
    };

    self.mark_puzzle_completed = function(id, puzzle) {
        if (!_.contains(puzzles_completed, id)) {
            puzzles_completed.push(id);
            storage.save("puzzles_completed", puzzles_completed.toString());
        }
    }

    self.is_puzzle_completed = function(puzzle_id) {
        return isDevMode || _.contains(puzzles_completed, puzzle_id);
    }

    self.completed_puzzles = function() {
        return _.filter(content.puzzles(), function(p) { return self.is_puzzle_completed(p.id); });
    }

    self.is_module_completed = function(module) {
        return module.nodes.every(self.is_puzzle_completed);
    }

    self.puzzles_remaining = function(module) {
        return _.filter(module.nodes, function(p) { return !self.is_puzzle_completed(p); }).length;
    }

    self.get_library = function() {
        var libs = _.map(self.completed_puzzles(), function(p) { return p.library.granted; });
        return _.unique(_.flatten(libs));
    }

    return self;
}());

/**
 * Starts a module.
 * Returns an object with the function 'onPuzzleFinish' that should be called when puzzleCompleted is sent from unity.
 * @param module A module object (from game_info.modules).
 * @param sceneSelectType one of {"tutorial", "module"}.
 * Controls whether you are shuttled through levels automatically or get the graph scene selctor.
 */
function create_puzzle_runner(module, sceneSelectType) {
    var self = {};
    var tutorialCounter = 0;

    function onModuleComplete() {
        console.error("TODO make this do something!");
    }

    function setState_puzzle(id, finish_type) {
        current_scene = 'transition';
        var info = {id:id, puzzle:game_info.puzzles[id], finish:finish_type};
        RuthefjordUI.State.goToPuzzle(function() {
            if (sceneSelectType === 'tutorial') {
                $('.hideTutorial').hide();
            }
            RuthefjordUnity.Call.request_start_puzzle(info);
        });
    }

    self.onPuzzleFinish = function() {
        switch (sceneSelectType) {
            case "module":
                if (progress.puzzles_remaining(module) > 0 || isDevMode) {
                    // bring up the level select
                    RuthefjordUI.State.goToSceneSelect(function() {
                        RuthefjordUI.LevelSelect.create(module, game_info.puzzles, progress.is_puzzle_completed, function(pid) {
                            if (progress.puzzles_remaining(module) === 1) {
                                setState_puzzle(pid, "to_sandbox");
                            } else {
                                setState_puzzle(pid, "to_puzzle_select");
                            }
                        });
                    });
                } else {
                    // module has been completed, go to sandbox
                    setState_sandbox();
                }
                break;

            case "tutorial":
                if (tutorialCounter < module.nodes.length) {
                    // progress through tutorial using tutorialCounter
                    var finishType = module.nodes.length - tutorialCounter === 1 ? "to_sandbox" : "to_next_puzzle";
                    setState_puzzle(module.nodes[tutorialCounter++], finishType);
                } else {
                    // tutorial has been completed, go to sandbox
                    setState_sandbox();
                }

                break;

            default:
                throw new Error("invalid scene select type " + sceneSelectType);
        }
    }

    // call onPuzzleComplete to trigger the first puzzle
    self.onPuzzleFinish();

    return self;
};

// callback function that receives messages from unity, sends to handler
function onRuthefjordEvent(func, arg) {
    if (func !== 'onProgramStateChange') {
        console.info('received Unity event ' + func);
    }
    handler[func](arg);
}

function setState_title() {
    RuthefjordUI.State.goToTitle(function(){});
}

function setState_intro() {
    var d = '<p>I\'m a Dragon who can build things out of cubes. I follow instructions written in <b>code</b>. Click anywhere to start learning <b>code</b>, so we can build things together!</p>' +
        '<button id="button_startTutorial">Get Started!</button>';

    RuthefjordUI.State.goToIntro(function(){
        RuthefjordUI.Instructions.show({
            summary: 'Welcome to Ruthefjord!',
            detail: d
        }, function() {
            current_puzzle_runner = create_puzzle_runner(game_info.modules["tutorial"], "tutorial");
        }, true);
    });
}

function setState_sandbox() {
    current_scene = 'transition';
    RuthefjordUI.State.goToSandbox(function() {
        storage.load('sandbox_world_data', function(wd) {
            RuthefjordUnity.Call.request_start_sandbox(wd);
        });
    });
}

function onProgramEdit() {
    if (current_scene === 'sandbox') {
        var prog = RuthefjordBlockly.getXML();
        storage.save('sandbox_program', prog);
    }
}

// startup
$(function() {
    function initialize_unity() {
        var d = Q.defer();
        handler.onSystemStart = function() {
            d.resolve();
        };
        // this doesn't return a promise, unity will get back to us via hander.onSystemStart
        RuthefjordUnity.Player.initialize();
        return d.promise;
    }

    function load_save_data() {
        var d = Q.defer();
        storage.initialize(function() { d.resolve(); });
        return d.promise;
    }

    // set up callbacks for transitions between application state
    ////////////////////////////////////////////////////////////////////////////////

    var devSelectModule = $('#dev-select-module');
    devSelectModule.change(function() {
        var val = devSelectModule.val();
        // HACK assumes opening line starts with '-'
        if (val[0] !== '-') {
            current_puzzle_runner = create_puzzle_runner(game_info.modules[val], "module");
        }
    });

    $('#button_header_clear_sandbox').on('click', function() {
        storage.remove('sandbox_program');
        storage.remove('sandbox_world_data');
        // HACK if they're in the sandbox, just reload it to force a clear
        if (current_scene == 'sandbox') {
            setState_sandbox();
        }
    });

    $('#button_header_sandbox').on('click', setState_sandbox);
    $('#btn-back-sandbox').on('click', setState_sandbox);

    $('#btn-back-selector-puzzle').on('click', function() { current_puzzle_runner.onPuzzleFinish(); });

    function goToModules() {
        RuthefjordUI.State.goToModuleSelect(function () {
            RuthefjordUI.ModuleSelect.create(_.filter(game_info.modules,
                function(m) {
                    return !progress.is_module_completed(m) && !isDevMode;
                }),
                function(module) {
                    current_puzzle_runner = create_puzzle_runner(module, "module");
                });
        });
    }

    $('#btn-modules').on('click', goToModules);
    $('#btn-back-selector-module').on('click', goToModules);

    // initialize subsystems (mainly unity and logging)
    ////////////////////////////////////////////////////////////////////////////////

    var promise_all = Q.all([
        content.initialize(),
        load_save_data(),
        initialize_unity(),
        RuthefjordBlockly.init(),
    ]);

    // fetch the uid from the GET params and pass that to logging initializer
    var uid = $.url().param('uid');
    RuthefjordLogging.initialize(uid);

    // set up some of the callbacks for code editing UI
    ////////////////////////////////////////////////////////////////////////////////

    $('#btn-run').on('click', function() {
        RuthefjordUnity.Call.set_program(RuthefjordBlockly.getProgram());
        var newRS = program_state.run_state !== 'stopped' ? 'stopped' : 'executing';
        if (questLogger) { questLogger.logDoProgramRunStateChange(newRS); }
        RuthefjordUnity.Call.set_program_state({run_state: newRS});

    });

    $('#btn-workshop').on('click', function() {
        var newEM = program_state.edit_mode === 'workshop' ? 'persistent' : 'workshop';
        if (questLogger) { questLogger.logDoEditModeChange(newEM); }
        RuthefjordUnity.Call.set_program_state({edit_mode: newEM});
    });

    $('#btn-pause').on('click', function() {
        var oldRS = program_state.run_state;
        if (oldRS === 'executing' || oldRS === 'paused') {
            var newRS = oldRS === 'executing' ? 'paused' : 'executing';
            if (questLogger) { questLogger.logDoProgramRunStateChange(newRS); }
            RuthefjordUnity.Call.set_program_state({run_state: newRS});
        }
    });

    // camera
    $('#camera-zoom-in').click(function(){RuthefjordUnity.Call.control_camera('zoomin');});
    $('#camera-zoom-out').click(function(){RuthefjordUnity.Call.control_camera('zoomout');});
    $('#camera-rotate-left').click(function(){RuthefjordUnity.Call.control_camera('rotateleft');});
    $('#camera-rotate-right').click(function(){RuthefjordUnity.Call.control_camera('rotateright');});

    // undo button
    // TODO shouldn't this be in blockly/ruthefjord.js?
    $('#btn-undo').on('click', RuthefjordBlockly.undo);

    RuthefjordUI.Instructions.hide();

    RuthefjordUI.SpeedSlider.initialize(RuthefjordUnity.Call.set_program_execution_speed);

    // wait for all systems to start up, then go!
    promise_all.done(function() {
        // HACK add blockly change listener for saving
        Blockly.addChangeListener(onProgramEdit);

        console.info('EVERYTHING IS READY!');

        // HACK this needs to wait for the modules to be loaded
        _.each(game_info.modules, function(module, id) {
            devSelectModule.append('<option value="' + id + '">' + id + '</option>');
        });

        progress.initialize(function() {
            if (progress.is_module_completed(game_info.modules["tutorial"])) {
                setState_sandbox();
            } else {
                setState_title();
            }
        });
    });
});

// SPECIFIC HANDLER FUNCTIONS

handler.onTitleButtonClicked = function(button) {
    switch (button) {
        case 'tutorial':
            setState_intro();
            break;
        default:
            throw new Error('uknown title button ' + button);
            break;
    }
}

var PUZZLE_FORMAT_VERSION = 1;

function start_editor(info) {

    if (info.puzzle.version !== PUZZLE_FORMAT_VERSION) {
        console.error("Invalid puzzle info version '" + info.puzzle.version + "'!");
        return;
    }

    if (info.is_starting) {
        var library = {
            current: progress.get_library(),
            puzzle: _.union(info.puzzle.library.required, info.puzzle.library.granted)
        };
        library.all = _.union(library.current, library.puzzle);

        var goals = info.puzzle.goals ? info.puzzle.goals : [];

        RuthefjordBlockly.setLevel(info.puzzle, library);
        RuthefjordUI.SpeedSlider.setVisible(_.contains(library.all, 'speed_slider'));
        RuthefjordUI.CameraControls.setVisible(library.all);
        RuthefjordUI.CubeCounter.setVisible(goals.some(function(g) { return g.type === "cube_count";}));

        RuthefjordBlockly.history = [];

        // reset program execution speed, because the scene reload will have made Unity forget
        // FIXME use the unified API
        if (info.puzzle.name !== "101 Cubes") { // HACK to allow 101 Cubes to have a faster default execution speed
            RuthefjordUnity.Call.set_program_execution_speed(RuthefjordUI.SpeedSlider.value());
        }

        // clear old quest logger if it exists
        if (questLogger) {
            questLogger.logQuestEnd();
            questLogger = null;
        }
        // then start new quest logger if this is not an empty level
        questLogger = RuthefjordLogging.startQuest(info.puzzle.logging_id, info.checksum);

        switch (info.puzzle.program.type) {
            case "text":
                var program = JSON.parse(info.puzzle.program.value);
                RuthefjordBlockly.setProgram(program);
                break;
            case "preserve":
                // want to leave the old program, so do nothing!
                break;
            case "xml":
                RuthefjordBlockly.clearProgram();
                if (info.puzzle.program.value) {
                    RuthefjordBlockly.loadBlocks(info.puzzle.program.value);
                }
                break;
            default:
                console.error("Unknown program type '" + info.puzzle.program.type + "'!");
                break;
        }
    }

    RuthefjordUI.Instructions.show(info.puzzle.instructions, null, true);
}

// TODO remove duplicate code from this an onPuzzleChange
handler.onSandboxStart = function() {
    current_scene = "sandbox";

    storage.load('sandbox_program', function(sandbox_program) {
        var info = {
            checksum: 0,
            is_starting: true,
            puzzle: {
                version: PUZZLE_FORMAT_VERSION,
                logging_id: 11,
                library: {required:[],granted:[]},
                program: {type: 'xml', value: sandbox_program},
                instructions: {
                    summary: "Let's build something cool! Click {learn} to get new tools and abilities, like moving up and down or rotating the camera.",
                    detail:
                        "In this mode, any code you run will stick around <b>permanently</b>. " +
                        "Click on {workshop} to toggle to a mode where you can test code without blocks sticking around." +
                        "<br><br>" +
                        "You can also clear away all of your code and blocks by clicking {clear}."
                }
            }
        };

        start_editor(info);
    });
}

handler.onPuzzleChange = function(json) {
    console.log('starting puzzle ' + json);
    current_scene = "puzzle";
    start_editor(JSON.parse(json));
};

handler.onProgramStateChange = function(data) {
    var json = JSON.parse(data);

    if ('edit_mode' in json) {
        console.log('on edit mode change');
        program_state.edit_mode = json.edit_mode;
        RuthefjordUI.ModeButton.update(program_state.edit_mode === 'workshop');
        if (questLogger) { questLogger.logOnEditModeChanged(json.edit_mode); }
    }

    if ('run_state' in json) {
        console.log('on run state change');
        var rs = json.run_state;
        program_state.run_state = rs;
        RuthefjordUI.PauseButton.update(rs !== 'stopped', rs === 'paused');
        RuthefjordUI.RunButton.update(rs !== 'stopped', program_state.edit_mode === 'workshop');

        if (questLogger) { questLogger.logOnProgramRunStateChanged(rs, JSON.stringify(RuthefjordBlockly.getProgram())); }

        if (rs === 'stopped' && current_scene === 'sandbox') {
            RuthefjordUnity.Call.request_world_state();
        }

    }

    if ('current_block' in json) {
        var id = json.current_block;
        if (id !== null) {
            Blockly.mainWorkspace.traceOn(true);
            Blockly.mainWorkspace.highlightBlock(id.toString());
        } else if (Blockly.selected) {
            Blockly.selected.unselect();
        }
    }
}

handler.onSetColors = function(json) {
    console.info('on set colors!');
    var colors = JSON.parse(json);
    Blockly.FieldColour.COLOURS = colors;
    Blockly.FieldColour.COLUMNS = Math.min(colors.length, 7);
};

// sent the moment they "win" a puzzle
handler.onPuzzleComplete = function(puzzle_id) {
    progress.mark_puzzle_completed(puzzle_id, game_info.puzzles[puzzle_id]);
    if (questLogger) { questLogger.logOnPuzzledCompleted(); }
};

// sent when they exit a puzzle
handler.onPuzzleFinish = function(puzzle_id) {
    current_puzzle_runner.onPuzzleFinish();

    if (questLogger) {
        questLogger.logQuestEnd();
        questLogger = null;
    }
};

handler.onWorldDataStart = function() {
    world_data = "";
}

handler.onWorldDataChunkSend = function(chunk) {
    world_data += chunk;
}

handler.onWorldDataEnd = function() {
    console.info(world_data);
    storage.save('sandbox_world_data', world_data);
}

handler.onUnlockDevMode = function() {
    isDevMode = true;
    Blockly.mainWorkspace.maxBlocks = 5000;
};

handler.onCubeCount = function(count) {
    RuthefjordUI.CubeCounter.update(count);
}

return onRuthefjordEvent;
}());

function devmode() {
    onRuthefjordEvent('onUnlockDevMode');
}

