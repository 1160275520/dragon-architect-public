var onHackcraftEvent = (function(){ "use strict";

var unityObject;
var is_running = false;
var questLogger;
var handler = {};
var levelsCompleted = [];
var scenes = null;

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
    }

    self.height = function() {
        return $('#unityPlayer embed').height();
    }

    self.initialize = function() {
        var div = $("#unityPlayer");

        var config = {
            params: { enableDebugging:"0" }
        };

        unityObject = new UnityObject2(config);
        unityObject.initPlugin(div[0], "generated/generated.unity3d");

    }

    // HACK TODO oh god come up with something better than this that works to hide/show the player T_T

    self.hide = function() {
        var u = $('#unityPlayer embed, #unityPlayer');
        u.css('width', '1px').css('height', '1px');
    }

    self.show = function() {
        var u = $('#unityPlayer embed, #unityPlayer');
        u.css('width', '100%').css('height', '100%');
    }

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

var SANDBOX_LEVEL_ID = 'tl_final';

function setState_levelSelect() {
    hideAll();
    $('.levelSelector').show();
}

function make_levelSelect(module, scenes) {
    // TODO move hard-coded graph spec to config file of some kind
    var colors = {}
    colors["teal"] = "#5BA68D";
    colors["brown"] = "#A6875B";
    colors["purple"] = "#995BA6";
    colors["green"] = "#5BA65B";
    colors["gray"] = "#777777";
    colors["orange"] = "#FFB361";

    var graph = new dagre.Digraph();

    _.each(module.nodes, function(id) {
        graph.addNode(id, {label: scenes[id].name, id: id});
    });

    _.each(module.edges, function(edge) {
        graph.addEdge(null, edge[0], edge[1]);
    });

    // perform layout
    var renderer = new dagreD3.Renderer();
    renderer.zoom(false);
    var layout = dagreD3.layout()
                        .rankDir("LR");
    renderer.layout(layout).run(graph, d3.select(".levelSelector svg g"));

    // color rectangles
    var nodes = d3.selectAll(".levelSelector .node")[0];

    // setup onclick behavior
    var SANDBOX_LEVEL_ID = 'tl_final';

    function is_completed(level) {
        //return levelsCompleted.indexOf(level) !== -1;
        return true;
    }

    nodes.forEach(function (x) { 
        if (graph.predecessors(x.id).every(is_completed)) {
            x.onclick = function() {
                setState_puzzle({id:x.id, puzzle:scenes[x.id]});
            };
            if (is_completed(x.id)) {
                x.children[0].style.fill = colors["green"];
            } else {
                x.children[0].style.fill = colors["orange"];
            }
        } else {
            x.children[0].style.fill = colors["gray"];
        }
    });
}

function make_smallInstructions() {
    var instContainer = $("#instructionsContainer")[0];
    instContainer.onclick = null;

    $("#instructionsBackground").removeClass("instructionsShow");
    $("#instructionsBackground").addClass("instructionsHide");
    $("#instructions-detail").removeClass("detailShow");
    $("#instructions-detail").addClass("detailHide");

    // $("#instructions").removeClass("speechBubble");
    // $("#instructions-detail").removeClass("instructionsShown");

    // $("#dragonIcon").removeClass("speechBubble");
    var dragon = $("#dragonIcon")[0];
    // $("#dragonIcon")[0].style.visibility = "hidden";
    // $("#dragonIcon")[0].style.height = "0px";
    // dragon.style.height = $("#instructions")[0].getBoundingClientRect().height + "px";

    // var inst = $("#instructions")[0];
    // inst.innerHTML = "+";
    // inst.style.textAlign = "center";
    // inst.style.verticalAlign = "middle";
    // inst.style.fontSize = "32pt";

    var detail = $("#instructions-detail")[0];
    detail.style.height = '0px';

    setTimeout(function() {
        // instContainer.style.width = "50px";
        instContainer.style.height = "auto";
        instContainer.onclick = make_largeInstructions;
    }, 1000);
}

function make_largeInstructions() {
    var rect = $("svg g")[0].getBoundingClientRect();
    var instContainer = $("#instructionsContainer")[0]
    instContainer.style.top = '0px';
    instContainer.style.left = rect.width + 'px';
    instContainer.style.width = ($("#blockly")[0].getBoundingClientRect().width - rect.width) + 'px';
    instContainer.style.height = "100%";
    instContainer.onclick = null;

    $("#instructionsBackground").removeClass("instructionsHide");
    $("#instructionsBackground").addClass("instructionsShow");
    $("#instructions-detail").removeClass("detailHide");
    $("#instructions-detail").addClass("detailShow");

    $("#instructions").addClass("speechBubble");
    var inst = $("#instructions")[0];
    inst.style.webkitAnimationPlayState = "paused";
    inst.style.animationPlayState = "paused";

    var dragon = $("#dragonIcon")[0];
    $("#dragonIcon").addClass("speechBubble");
    dragon.style.webkitAnimationPlayState = "paused";
    dragon.style.animationPlayState = "paused";

    var goal = $("#instructions-goal")[0];

    var detail = $("#instructions-detail")[0];
    detail.style.height = "auto";

    //Hackcraft.setInstructions(instructions);

    setTimeout(function () { 
        dragon.style.visibility = "visible";
        goal.style.visibility = "visible";
        detail.style.visibility = "visible";
        dragon.style.webkitAnimationPlayState = "running";
        dragon.style.animationPlayState = "running";
        inst.style.webkitAnimationPlayState = "running";
        inst.style.animationPlayState = "running";
        instContainer.onclick = make_smallInstructions;
    }, 1000);
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
    _.each(galleryObjectArray, function(item, index) {
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
    $('#instructions-goal')[0].style.visibility = "hidden";

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
    var s = JSON.stringify(prog)
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
    scenes = info.scenes;
    make_levelSelect(info.modules[0], info.scenes);
    setState_title();
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
        Hackcraft.setLevel(info.puzzle);

        Hackcraft.history = new Array();
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

        make_largeInstructions();

        switch (info.puzzle.program.type) {
            case "text":
                var program = JSON.parse(info.puzzle.program.value);
                Hackcraft.setProgram(program);
                break;
            case "preserve":
                break;
            default:
                console.error("Unknown program type '" + info.puzzle.program.type + "'!");
                break;
        }
    }

    Hackcraft.setInstructions(info.puzzle.instructions);
}

handler.onStatementHighlight = function(id) {
    if (id) {
        Blockly.mainWorkspace.highlightBlock(id.toString());
    } else if (Blockly.selected) {
        Blockly.selected.unselect();
    }
}

handler.onSetColors = function(json) {
    console.info('on set colors!');
    var colors = JSON.parse(json);
    Blockly.FieldColour.COLOURS = colors;
    Blockly.FieldColour.COLUMNS = Math.min(colors.length, 7);
}

handler.onLevelComplete = function(levelId) {
    console.info('on level complete!');
    levelsCompleted.push(levelId);
    sessionStorage.setItem("levelsCompleted", levelsCompleted);

    if (questLogger) {
        questLogger.logPuzzledCompleted();
    }
}

handler.onReturnToSelect = function() {
    console.info('on return to level select!');
    setState_levelSelect();
}

return onHackcraftEvent;
}());
