var onHackcraftEvent = (function(){ "use strict";

var possible_stages;
var program;
var unityObject;
var is_running = false;
var questLogger;
var handler = {};
var levelsCompleted = ["tl_movement2d", "tl_call", "tl_placement", "tl_repeat", "tl_movement_args"];

// GENERIC UNITY API SETUP AND MARSHALLING

// send a message to unity
function send_message(object, method, arg) {
    unityObject.getUnity().SendMessage(object, method, arg);
}

// callback function that receives messages from unity, sends to handler
function onHackcraftEvent(func, arg) {
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
        unityObject.initPlugin(div[0], "hackcraft/hackcraft.unity3d");

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
    make_levelSelect()
}

function make_levelSelect() {
    // TODO move hard-coded graph spec to config file of some kind
    var colors = {}
    colors["teal"] = "#5BA68D"
    colors["brown"] = "#A6875B"
    colors["purple"] = "#995BA6"
    colors["green"] = "#5BA65B"
    colors["gray"] = "#777777"
    colors["orange"] = "#FFB361"
    // var levelColors = {}
    // levelColors["tl_movement2d"] = colors["teal"];
    // levelColors["tl_movement3d"] = colors["teal"];
    // levelColors["tl_placement"] = colors["brown"];
    // levelColors["tl_movement_args"] = colors["teal"];
    // levelColors["tl_call"] = colors["purple"];
    // levelColors["tl_call2"] = colors["purple"];
    // levelColors["tl_repeat"] = colors["green"];
    // levelColors["tl_repeat2"] = colors["green"];

    var graph = new dagre.Digraph();
    graph.addNode("tl_movement2d", {label: "2D Movement", id: "tl_movement2d"});
    graph.addNode("tl_movement3d", {label: "3D Movement", id: "tl_movement3d"});
    graph.addNode("tl_placement", {label: "Place Blocks", id: "tl_placement"});
    graph.addNode("tl_movement_args", {label: "Movement Arguments", id: "tl_movement_args"});
    graph.addNode("tl_speed_slider", {label: "Speed Slider", id: "tl_speed_slider"});
    graph.addNode("tl_call", {label: "Call", id: "tl_call"});
    graph.addNode("tl_call2", {label: "Call 2", id: "tl_call2"});
    graph.addNode("tl_repeat", {label: "Repeat", id: "tl_repeat"});
    graph.addNode("tl_repeat2", {label: "Repeat 2", id: "tl_repeat2"});

    graph.addEdge(null, "tl_movement2d", "tl_movement3d");
    graph.addEdge(null, "tl_movement2d", "tl_placement");
    graph.addEdge(null, "tl_movement2d", "tl_movement_args");
    graph.addEdge(null, "tl_movement_args", "tl_repeat");
    graph.addEdge(null, "tl_placement", "tl_speed_slider");
    graph.addEdge(null, "tl_placement", "tl_call");
    graph.addEdge(null, "tl_call", "tl_call2");
    graph.addEdge(null, "tl_placement", "tl_repeat");
    graph.addEdge(null, "tl_repeat", "tl_repeat2");

    // perform layout
    var renderer = new dagreD3.Renderer();
    renderer.zoom(false);
    var layout = dagreD3.layout()
                        .rankDir("LR");
    renderer.layout(layout).run(graph, d3.select(".levelSelector svg g"));

    // color rectangles
    var nodes = d3.selectAll(".levelSelector .node")[0]
    nodes.forEach(function (x) {  })

    // setup onclick behavior
    var SANDBOX_LEVEL_ID = 'tl_final';
    nodes.forEach(function (x) { 
        if (graph.predecessors(x.id).every(function (p) { return levelsCompleted.indexOf(p) != -1; })) {
            if (x.id === SANDBOX_LEVEL_ID) {
                x.onclick = function() { setState_sandbox(x.id); };
            } else {
                x.onclick = function() { setState_puzzle(x.id); };
            }
            if (levelsCompleted.indexOf(x.id) != -1) {
                x.children[0].style.fill = colors["green"];
            } else {
                x.children[0].style.fill = colors["orange"];
            }
        } else {
            x.children[0].style.fill = colors["gray"];
        }
    });
}

function setState_puzzle(stageId) {
    console.info('starting puzzle ' + stageId);
    hideAll();
    $('.codeEditor, .puzzleModeUI').show();
    unityPlayer.show();
    set_stage(stageId);
}

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

    // set up some of the callbacks for code editing UI
    ////////////////////////////////////////////////////////////////////////////////
    make_levelSelect()

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
    $('#instructions')[0].style.visibility = "hidden";

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

    // undo button
    $('#btn-undo').on('click', Hackcraft.undo);

    $( "#slider" ).slider({
        value: 0.5,
        min: 0.0,
        max: 1.0,
        step: 0.05,
        slide: function( event, ui ) {
            send_message("System", "EAPI_SetDelayPerCommand", (1 - ui.value).toString());
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

function set_program(prog) {
    var s = JSON.stringify(prog)
    console.info(s);
    send_message("System", "EAPI_SetProgramFromJson", s);
}

function set_stage(stage_id) {
    send_message("Global", "EAPI_SetStage", stage_id);
}

function set_is_running(is_running) {
    send_message("System", "EAPI_SetIsRunning", is_running ? "true" : "false");
}

handler.onSystemStart = function(json) {
    possible_stages = JSON.parse(json);
    setState_title();
}

handler.onProgramChange = function(json) {
    //console.log(json);
    program = JSON.parse(json);
    Hackcraft.setProgram(program);
}

handler.onLevelChange = function(json) {
    console.log(json);
    var levelInfo = JSON.parse(json);

    Hackcraft.setLevel(levelInfo);
    Hackcraft.history = new Array();
    // reset run button
    var b = $('#btn-run')[0];
    var slider = $('#sliderContainer')[0];
    if (jQuery.isEmptyObject(levelInfo)) {
        b.hidden = true;
        slider.style.visibility = "hidden";
    } else {
        b.hidden = false;
        b.innerText = "Run!";
        b.style.backgroundColor = "#37B03F";
        var rect = $('#unityPlayer>embed')[0].getBoundingClientRect();
        var selfRect = b.getBoundingClientRect();
        slider.style.visibility = "visible";
        var selfRect = slider.getBoundingClientRect();
        var speed_slider_value = $('#slider').slider("option", "value");
        send_message("System", "EAPI_SetDelayPerCommand", speed_slider_value.toString());
    }
    is_running = false;

    // clear old quest logger if it exists
    if (questLogger) {
        questLogger.logQuestEnd();
        questLogger = null;
    }
    // then start new quest logger if this is not an empty level
    if (levelInfo.hasOwnProperty('qid')) {
        questLogger = HackcraftLogging.startQuest(levelInfo.qid);
    }
}

handler.onStatementHighlight = function(id) {
    //console.log("highlighting " + id)
    // XXX edbutler are these conditional bodies supposed to be different...?
    if (id) {
        Blockly.mainWorkspace.highlightBlock(id.toString());
    } else {
        Blockly.mainWorkspace.highlightBlock(id.toString());
    }
}

handler.onInstructionsChange = function(msg) {
    Hackcraft.setInstructions(msg);
}

handler.onSetColors = function(json) {
    var colors = JSON.parse(json);
    Blockly.FieldColour.COLOURS = colors;
    Blockly.FieldColour.COLUMNS = Math.min(colors.length, 7);
}

return onHackcraftEvent;
}());
