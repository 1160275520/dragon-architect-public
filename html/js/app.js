var onHackcraftEvent = (function(){ "use strict";

var is_running = false;
var is_expr_mode = false;
var questLogger;
var handler = {};
var isDevMode = false;
// the modules/puzzles sent up on game start
var game_info;

var current_puzzle_runner;

var world_data;

var storage = (function() {
    var self = {};

    self.save = function(key, value) {
        if (typeof key !== "string") throw new TypeError("keys must be strings!");
        if (value !== null && typeof value !== "string") throw new TypeError("can only save string values!");

        sessionStorage.setItem(key, value);
    }

    self.load = function(key) {
        return sessionStorage.getItem(key);
    }

    return self;
}());

var progress = (function(){
    var self = {};

    var levelsCompleted = [];
    // load the level progress from this session (if any)
    if (sessionStorage.getItem("levelsCompleted")) {
        levelsCompleted = storage.load("levelsCompleted").split(',');
    }

    self.is_completed = function(puzzle_id) {
        return isDevMode || _.contains(levelsCompleted, puzzle_id);
    }

    self.mark_completed = function(puzzle_id) {
        levelsCompleted.push(puzzle_id);
        storage.save("levelsCompleted", levelsCompleted.toString());
    }

    self.is_module_completed = function(module) {
        return module.nodes.every(function (n) {
            return self.is_completed(n);
        });
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
        var info = {id:id, puzzle:game_info.puzzles[id], finish:finish_type};
        HackcraftUI.State.goToPuzzle(function() {
            HackcraftUnity.Call.request_start_puzzle(info);
        });
    }

    self.onPuzzleFinish = function() {
        switch (sceneSelectType) {
            case "module":
                // bring up the level select
                HackcraftUI.State.goToSceneSelect(function() {
                    HackcraftUI.LevelSelect.create(module, game_info.puzzles, progress.is_completed, function(pid) {
                        setState_puzzle(pid, "to_puzzle_select");
                    });
                });
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
function onHackcraftEvent(func, arg) {
    console.info('received Unity event ' + func);
    handler[func](arg);
}

function setState_title() {
    HackcraftUI.State.goToTitle(function(){});
}

function setState_intro() {
    var d = '<p>where the 0.5% of you reading this will be informed that you will be PROGRAMMING WOO and you should click somewhere to get started!</p>' +
        '<button id="button_startTutorial">Get Started!</button>';

    HackcraftUI.State.goToIntro(function(){
        HackcraftUI.Instructions.show({
            summary: 'This is intro text!',
            detail: d
        });
        $('#button_startTutorial').click(function() {
            // start the 'tutorial' module in tutorial mode
            current_puzzle_runner = create_puzzle_runner(game_info.modules["tutorial"], "tutorial");
        });
        // HACK assumes the get started button is inside #instructionsContainer
        $("#instructionsContainer").click(function() {
            current_puzzle_runner = create_puzzle_runner(game_info.modules["tutorial"], "tutorial");
            $("#instructionsContainer").unbind("click");
        });
    });
}

function setState_sandbox() {
    HackcraftUI.State.goToSandbox(function() {
        HackcraftUnity.Call.request_start_sandbox();
    });
}

// startup
$(function() {
    function initialize_unity() {
        var d = Q.defer();
        handler.onSystemStart = function() {
            d.resolve();
        };
        // this doesn't return a promise, unity will get back to us via hander.onSystemStart
        HackcraftUnity.Player.initialize();
        return d.promise;
    }

    function load_content() {
        game_info = {};

        var qm = Q($.get('content/modules.json'))
            .then(function(json) {
                game_info.modules = json;
            });

        var qs = Q($.get('content/puzzles.json'))
            .then(function(json) {
                game_info.puzzles = json;
            });

        return Q.all([qm, qs]);
    }

    // set up callbacks for transitions between application state
    ////////////////////////////////////////////////////////////////////////////////
    $('#button_header_levelSelect').on('click', function() {
        // HACK
        current_puzzle_runner = create_puzzle_runner(game_info.modules["module1"], "module");
    });

    $('#button_header_save').on('click', function() {
        HackcraftUnity.Call.request_world_state();
    });

    $('#button_header_sandbox').on('click', setState_sandbox);

    // initialize subsystems (mainly unity and logging)
    ////////////////////////////////////////////////////////////////////////////////

    var promise_content = load_content();
    var promise_unity = initialize_unity();
    var promise_blockly = HackcraftBlockly.init();

    // fetch the uid from the GET params and pass that to logging initializer
    var uid = $.url().param('uid');
    HackcraftLogging.initialize(uid);

    // set up some of the callbacks for code editing UI
    ////////////////////////////////////////////////////////////////////////////////

    $('#btn-run').on('click', function() {
        var program = HackcraftBlockly.getProgram();
        HackcraftUnity.Call.set_program(program);
        is_running = !is_running;
        HackcraftUI.RunButton.update(is_running);
        HackcraftUnity.Call.set_is_running(is_running);
        // if (Blockly.selected) {
        //     Blockly.selected.unselect();
        // }
        // Blockly.mainWorkspace.traceOn(is_running);
        if (questLogger) {
            if (is_running) {
                questLogger.logProgramExecutionStarted(JSON.stringify(program));
            } else {
                questLogger.logProgramExecutionReset();
            }
        }
    });
    HackcraftUI.Instructions.hide();

    $('#btn-expr').on('click', function() {
        is_expr_mode = !is_expr_mode;
        HackcraftUnity.Call.set_expr_mode(is_expr_mode);
    });

    // camera
    $('#camera-zoom-in').click(function(){HackcraftUnity.Call.control_camera('zoomin');});
    $('#camera-zoom-out').click(function(){HackcraftUnity.Call.control_camera('zoomout');});
    $('#camera-rotate-left').click(function(){HackcraftUnity.Call.control_camera('rotateleft');});
    $('#camera-rotate-right').click(function(){HackcraftUnity.Call.control_camera('rotateright');});

    // undo button
    // TODO shouldn't this be in blockly/hackcraft.js?
    $('#btn-undo').on('click', HackcraftBlockly.undo);

    HackcraftUI.SpeedSlider.initialize(HackcraftUnity.Call.set_program_execution_speed);

    // wait for all systems to start up, then go!
    Q.all([promise_unity, promise_blockly, promise_content]).done(function() {
        console.info('EVERYTHING IS READY!');
        if (progress.is_module_completed(game_info.modules["tutorial"])) {
            setState_sandbox();
        } else {
            setState_title();
        }
    });
});

// SPECIFIC HANDLER FUNCTIONS

function add_to_library(name, program) {
    // TODO check for reserved names (e.g., main)
    // TODO actually implement this function
}

function calculate_library(puzzle_info) {
    var lib = puzzle_info.library;
    var tools = lib.required.concat(lib.granted);
    if (isDevMode) {
        tools.push('speed_slider');
        tools.push('camera_controls');
    }
    return tools;
}

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

// TODO remove duplicate code from this an onPuzzleChange
handler.onSandboxStart = function() {
    // HACKHACKAHCKAHCCKCK
    var current_library = ['move2', 'move3', 'place', 'repeat', 'speed_slider'];

    HackcraftBlockly.setLevel(null, current_library);

    HackcraftUI.SpeedSlider.setVisible(_.contains(current_library, 'speed_slider'));

    HackcraftBlockly.history = [];
    // reset run button
    is_running = false;
    HackcraftUI.RunButton.update(is_running);

    // reset program execution speed, because the scene reload will have made Unity forget
    HackcraftUnity.Call.set_program_execution_speed(HackcraftUI.SpeedSlider.value());

    // clear old quest logger if it exists
    if (questLogger) {
        questLogger.logQuestEnd();
        questLogger = null;
    }

    HackcraftUI.Instructions.show({summary:"Let's build something cool! Click [picture of button] to learn new code.", detail:""});

    // TODO log this
}

handler.onPuzzleChange = function(json) {
    console.log(json);
    var info = JSON.parse(json);

    var VERSION = 1;
    if (info.puzzle.version !== VERSION) {
        console.error("Invalid puzzle info version '" + info.puzzle.version + "'!");
        return;
    }

    if (info.is_starting) {
        var current_library = calculate_library(info.puzzle);

        HackcraftBlockly.setLevel(info.puzzle, current_library);

        HackcraftUI.SpeedSlider.setVisible(_.contains(current_library, 'speed_slider'));

        HackcraftBlockly.history = [];
        // reset run button
        is_running = false;
        HackcraftUI.RunButton.update(is_running);

        // reset program execution speed, because the scene reload will have made Unity forget
        HackcraftUnity.Call.set_program_execution_speed(HackcraftUI.SpeedSlider.value());

        // clear old quest logger if it exists
        if (questLogger) {
            questLogger.logQuestEnd();
            questLogger = null;
        }
        // then start new quest logger if this is not an empty level
        questLogger = HackcraftLogging.startQuest(info.puzzle.logging_id, info.checksum);

        switch (info.puzzle.program.type) {
            case "text":
                var program = JSON.parse(info.puzzle.program.value);
                HackcraftBlockly.setProgram(program);
                break;
            case "preserve":
                // want to leave the old program, so do nothing!
                break;
            default:
                console.error("Unknown program type '" + info.puzzle.program.type + "'!");
                break;
        }
    }

    HackcraftUI.Instructions.show(info.puzzle.instructions);
};

handler.onStatementHighlight = function(id) {
    if (id) {
        Blockly.mainWorkspace.traceOn(true);
        Blockly.mainWorkspace.highlightBlock(id.toString());
    } 
};

handler.onSetColors = function(json) {
    console.info('on set colors!');
    var colors = JSON.parse(json);
    Blockly.FieldColour.COLOURS = colors;
    Blockly.FieldColour.COLUMNS = Math.min(colors.length, 7);
};

// sent the moment they "win" a puzzle
handler.onPuzzleComplete = function(puzzle_id) {
    progress.mark_completed(puzzle_id);

    if (questLogger) {
        questLogger.logPuzzledCompleted();
    }
};

// sent when they exit a puzzle
handler.onPuzzleFinish = function(puzzle_id) {
    progress.mark_completed(puzzle_id);
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
    storage.save('world_data', world_data);
}

handler.onUnlockDevMode = function() {
    isDevMode = true;
    Blockly.mainWorkspace.maxBlocks = 5000;
};

return onHackcraftEvent;
}());

function devmode() {
    onHackcraftEvent('onUnlockDevMode');
}

