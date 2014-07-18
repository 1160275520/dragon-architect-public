var onHackcraftEvent = (function(){ "use strict";

var is_running = false;
var questLogger;
var handler = {};
var levelsCompleted = [];
var isDevMode = false;
// the modules/puzzles sent up on game start
var game_info;

// GENERIC UNITY API SETUP AND MARSHALLING

// callback function that receives messages from unity, sends to handler
function onHackcraftEvent(func, arg) {
    console.info('received Unity event ' + func);
    handler[func](arg);
}

function is_scene_completed(level) {
    console.log("checking " + level);
    return isDevMode || levelsCompleted.indexOf(level) !== -1;
}

function setState_title() {
    HackcraftUI.State.goToTitle(function(){});
}

function setState_intro() {
    HackcraftUI.State.goToIntro(function(){
        HackcraftUI.Instructions.show({
            summary: 'This is intro text!',
            detail: 'where the 0.5% of you reading this will be informed that you will be PROGRAMMING WOO and you should click somewhere to get started!'
        });
    });
}

function setState_levelSelect() {
    HackcraftUI.State.goToSceneSelect(function() {
        create_level_select();
    });
}

function setState_puzzle(id) {
    var info = {id:id, puzzle:game_info.scenes[id]};
    HackcraftUI.State.goToPuzzle(function() {
        HackcraftUnity.Call.request_start_puzzle(info);
    });
}

/*
// shows the UI for sandbox mode. If stageID is not null, also sets the unity stage.
function setState_sandbox(stageId) {
    console.info('starting sandbox ' + stageId);
    hideAll();
    $('.codeEditor, .creativeModeUI').show();
    HackcraftUnity.Player.show();
    if (stageId) {
        set_stage(stageId);
    }
}
*/

function setState_gallery(galleryObjectArray) {
    // TODO make sure current program is preserved for when gallery returns to sandbox
    console.info('starting gallery view');
    hideAll();
    $('.galleryUI, .creativeModeUI').show();
    HackcraftUnity.Player.show();

    var list = $('#galleryList');
    list.empty();
    _.each(galleryObjectArray, function(item) {
        var button = $('<li><button>' + item.name + '</button></li>').appendTo(list);
        // HACK look for special sandbox level id
        button.click(function() {
            add_to_library(item.name, item.contents);
            // show creative UI again without resetting unity stage
            setState_sandbox(null);
        });
    });
}

// startup
$(function() {
    function initialize_unity() {
        var d = Q.defer();
        // this doesn't return a promise, unity will get back to us via hander.onSystemStart
        handler.onSystemStart = function(json) {
            game_info = JSON.parse(json);
            d.resolve();
        };
        HackcraftUnity.Player.initialize();
        return d.promise;
    }

    // set up callbacks for transitions between application state
    ////////////////////////////////////////////////////////////////////////////////
    $('#button_title_to_levelSelect').on('click', setState_levelSelect);
    $('#button_header_levelSelect').on('click', setState_levelSelect);
    $('#button_levelSelect_to_title').on('click', setState_title);

    // initialize subsystems (mainly unity and logging)
    ////////////////////////////////////////////////////////////////////////////////

    var promise_unity = initialize_unity();
    var promise_blockly = HackcraftBlockly.init();

    // fetch the uid from the GET params and pass that to logging initializer
    var uid = $.url().param('uid');
    HackcraftLogging.initialize(uid);

    // load the level progress from this session (if any)
    if (sessionStorage.getItem("levelsCompleted")) {
        levelsCompleted = sessionStorage.getItem("levelsCompleted").split(',');
    }

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

    // camera
    $('#camera-zoom-in').click(function(){HackcraftUnity.Call.control_camera('zoomin');});
    $('#camera-zoom-out').click(function(){HackcraftUnity.Call.control_camera('zoomout');});
    $('#camera-rotate-left').click(function(){HackcraftUnity.Call.control_camera('rotateleft');});
    $('#camera-rotate-right').click(function(){HackcraftUnity.Call.control_camera('rotateright');});

    // undo button
    // TODO shouldn't this be in blockly/hackcraft.js?
    $('#btn-undo').on('click', HackcraftBlockly.undo);

    HackcraftUI.SpeedSlider.initialize(HackcraftUnity.Call.set_program_execution_speed);

    $('#button_loadProcedure').click(function() {
        // TODO HACK consider checking for errors and handling potential concurrency problems
        $.get('http://localhost:5000/api/savedprocedure', function(data) {
            setState_gallery(data.objects);
        });
    });

    // wait for all systems to start up, then go!
    Q.all([promise_unity, promise_blockly]).done(function() {
        console.info('EVERYTHING IS READY!');
        setState_title();
    });
});

// SPECIFIC HANDLER FUNCTIONS

function add_to_library(name, program) {
    // TODO check for reserved names (e.g., main)
    // TODO actually implement this function
}

function create_level_select() {
    HackcraftUI.LevelSelect.create(game_info.modules[0], game_info.scenes, is_scene_completed, setState_puzzle);
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

handler.onLevelComplete = function(levelId) {
    console.info('on level complete!');
    levelsCompleted.push(levelId);
    sessionStorage.setItem("levelsCompleted", levelsCompleted);

    if (questLogger) {
        questLogger.logPuzzledCompleted();
    }
};

handler.onReturnToSelect = function() {
    console.info('on return to level select!');
    setState_levelSelect();
};

handler.onUnlockDevMode = function() {
    isDevMode = true;
    // recreate the level select
    create_level_select();
};

return onHackcraftEvent;
}());

function devmode() {
    onHackcraftEvent('onUnlockDevMode');
}

