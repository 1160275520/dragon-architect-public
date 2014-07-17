var onHackcraftEvent = (function(){ "use strict";

var unityObject;
var is_running = false;
var questLogger;
var handler = {};
var levelsCompleted = [];

// GENERIC UNITY API SETUP AND MARSHALLING

// send a message to unity
function send_message(object, method, arg) {
    unityObject.getUnity().SendMessage(object, method, arg);
}

// callback function that receives messages from unity, sends to handler
function onHackcraftEvent(func, arg) {
    console.info('received Unity event ' + func);
    handler[func](arg);
}

var unityPlayer = function(){
    var self = {};

    // TODO have these return correct values even when the thing isn't visible

    self.width = function() {
        return $('#unityPlayer embed').width();
    };

    self.height = function() {
        return $('#unityPlayer embed').height();
    };

    self.initialize = function() {
        var div = $("#unityPlayer");

        var config = {
            params: { enableDebugging:"0" }
        };

        unityObject = new UnityObject2(config);
        unityObject.initPlugin(div[0], "generated/generated.unity3d");

    };

    // HACK TODO oh god come up with something better than this that works to hide/show the player T_T

    self.hide = function() {
        var u = $('#unityPlayer embed, #unityPlayer');
        u.css('width', '1px').css('height', '1px');
    };

    self.show = function() {
        var u = $('#unityPlayer embed, #unityPlayer');
        u.css('width', '100%').css('height', '100%');
    };

    return self;
}();

function hideAll() {
    unityPlayer.hide();
    $('.codeEditor, .puzzleModeUI, .creativeModeUI, .levelSelector, .titleScreen, .galleryUI').hide();
}

function setState_title() {
    hideAll();
    $('.titleScreen').show();
}

function setState_levelSelect() {
    hideAll();
    $('.levelSelector').show();
}

function setState_puzzle(puzzle_info) {
    hideAll();
    $('.codeEditor, .puzzleModeUI').show();
    unityPlayer.show();
    request_start_puzzle(puzzle_info);
}

/*
// shows the UI for sandbox mode. If stageID is not null, also sets the unity stage.
function setState_sandbox(stageId) {
    console.info('starting sandbox ' + stageId);
    hideAll();
    $('.codeEditor, .creativeModeUI').show();
    unityPlayer.show();
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
    unityPlayer.show();

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
    // set up callbacks for transitions between application state
    ////////////////////////////////////////////////////////////////////////////////
    $('#button_title_to_levelSelect').on('click', setState_levelSelect);
    $('#button_header_levelSelect').on('click', setState_levelSelect);
    $('#button_levelSelect_to_title').on('click', setState_title);

    // initialize subsystems (mainly unity and logging)
    ////////////////////////////////////////////////////////////////////////////////

    unityPlayer.initialize();
    Hackcraft.init();

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
        var program = Hackcraft.getProgram();
        set_program(program);
        is_running = !is_running;
        set_is_running(is_running);
        Blockly.mainWorkspace.traceOn(is_running);
        if (questLogger) {
            if (is_running) {
                questLogger.logProgramExecutionStarted(JSON.stringify(program));
            } else {
                questLogger.logProgramExecutionReset();
            }
        }
    });
    HackcraftUI.Instructions.hide();

    // run button
    $('#btn-run').on('click', function () {
        var b = $('#btn-run')[0];
        if (b.innerText === "Run!") {
            b.innerText = "Reset";
            b.style.backgroundColor = "#B03737";
        } else {
            b.innerText = "Run!";
            b.style.backgroundColor = "#37B03F";
        }
    });

    // camera
    $('#camera-zoom-in').click(function(){control_camera('zoomin');});
    $('#camera-zoom-out').click(function(){control_camera('zoomout');});
    $('#camera-rotate-left').click(function(){control_camera('rotateleft');});
    $('#camera-rotate-right').click(function(){control_camera('rotateright');});

    // undo button
    $('#btn-undo').on('click', Hackcraft.undo);

    $( "#slider" ).slider({
        value: 0.22,
        min: 0.0,
        max: 1.0,
        step: 0.05,
        slide: function( event, ui ) {
            set_program_execution_speed(ui.value);
        }
    });

    $('#button_loadProcedure').click(function() {
        // TODO HACK consider checking for errors and handling potential concurrency problems
        $.get('http://localhost:5000/api/savedprocedure', function(data) {
            setState_gallery(data.objects);
        });
    });
});

// SPECIFIC HANDLER FUNCTIONS

function add_to_library(name, program) {
    // TODO check for reserved names (e.g., main)
    // TODO actually implement this function
}

function set_program_execution_speed(parameter) {
    send_message("System", "EAPI_SetProgramExecutionSpeed", parameter.toString());
}

function set_program(prog) {
    var s = JSON.stringify(prog);
    send_message("System", "EAPI_SetProgramFromJson", s);
}

function request_start_puzzle(puzzle_info) {
    send_message("Global", "EAPI_RequestStartPuzzle", JSON.stringify(puzzle_info));
}

function set_is_running(is_running) {
    send_message("System", "EAPI_SetIsRunning", is_running ? "true" : "false");
}

function control_camera(action) {
    send_message("System", "EAPI_ControlCamera", action);
}

handler.onSystemStart = function(json) {
    var info = JSON.parse(json);
    HackcraftUI.LevelSelect.create(info.modules[0], info.scenes, setState_puzzle);
    setState_title();
};

handler.onPuzzleChange = function(json) {
    console.log(json);
    var info = JSON.parse(json);

    var VERSION = 1;
    if (info.puzzle.version !== VERSION) {
        console.error("Invalid puzzle info version '" + info.puzzle.version + "'!");
        return;
    }

    if (info.is_starting) {
        Hackcraft.setLevel(info.puzzle);

        Hackcraft.history = [];
        // reset run button
        var b = $('#btn-run')[0];
        var slider = $('#sliderContainer')[0];
        if (false){//jQuery.isEmptyObject(levelInfo)) {
            b.hidden = true;
            slider.style.visibility = "hidden";
        } else {
            b.hidden = false;
            b.innerText = "Run!";
            b.style.backgroundColor = "#37B03F";
            slider.style.visibility = "visible";
            set_program_execution_speed($('#slider').slider("option", "value"));
        }
        is_running = false;

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
                Hackcraft.setProgram(program);
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
        Blockly.mainWorkspace.highlightBlock(id.toString());
    } else if (Blockly.selected) {
        Blockly.selected.unselect();
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

return onHackcraftEvent;
}());
