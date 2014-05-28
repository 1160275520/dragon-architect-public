onHackcraftEvent = (function(){
"use strict";

var possible_stages;
var program;
var unityObject;
var is_running = false;

var handler = {};

// GENERIC UNITY API SETUP AND MARSHALLING

// send a message to unity
function send_message(object, method, arg) {
    unityObject.getUnity().SendMessage(object, method, arg);
}

// callback function that receives messages from unity, sends to handler
function onHackcraftEvent(func, arg) {
    handler[func](arg);
}

// startup
$(function() {
    var dim = Math.min(768, window.innerWidth / 2)
    var config = {
        width: dim,
        height: dim,
        params: { enableDebugging:"0" }
    };

    unityObject = new UnityObject2(config);
    unityObject.initPlugin(jQuery("#unityPlayer")[0], "hackcraft/hackcraft.unity3d");

    // button/ui callbacks have to be setup inside this block

    $('#btn-run').on('click', function() {
        set_program(Hackcraft.getProgram());
        is_running = !is_running;
        set_is_running(is_running);
        Blockly.mainWorkspace.traceOn(is_running);
        var b = $('#btn-run')[0];
        var rect = $('#unityPlayer>embed')[0].getBoundingClientRect();
        var selfRect = b.getBoundingClientRect();
        b.style.left = (rect.right - selfRect.width - 2) + 'px'; // 2 to account for padding, etc.
        b.style.top = (rect.bottom - selfRect.height - 2) + 'px'; // 2 to account for padding, etc.
    });
});

// SPECIFIC HANDLER FUNCTIONS

function set_program(prog) {
    console.log(prog);
    send_message("System", "EAPI_SetProgramFromJson", JSON.stringify(prog));
}

function set_stage(stage_id) {
    send_message("Global", "EAPI_SetStage", stage_id);
}

function set_is_running(is_running) {
    send_message("System", "EAPI_SetIsRunning", is_running ? "true" : "false");
}

handler.onSystemStart = function(json) {
    possible_stages = JSON.parse(json);
}

handler.onProgramChange = function(json) {
    console.log(json);
    program = JSON.parse(json);
    Hackcraft.setProgram(program);
}

handler.onLevelChange = function(json) {
    console.log(json);
    var levelInfo = JSON.parse(json);
    Hackcraft.setLevel(levelInfo);
    // reset run button
    var b = $('#btn-run')[0];
    if (jQuery.isEmptyObject(levelInfo)) {
        b.hidden = true;
    } else {
        b.hidden = false;
        b.innerText = "Run!";
        b.style.backgroundColor = "#37B03F";
        var rect = $('#unityPlayer>embed')[0].getBoundingClientRect();
        var selfRect = b.getBoundingClientRect();
        b.style.left = (rect.right - selfRect.width - 2) + 'px'; // 2 to account for padding, etc.
        b.style.top = (rect.bottom - selfRect.height - 2) + 'px'; // 2 to account for padding, etc.
        // b.style.width = rect.width + 'px';
        // b.style.left = rect.left + 'px';
        // var toolBlocks = Blockly.mainWorkspace.flyout_.workspace_.topBlocks_;
        // var lastTool = toolBlocks[toolBlocks.length - 1];
        // rect = lastTool.svg_.svgGroup_.getBoundingClientRect();
        // b.style.top = (rect.bottom + 25) + 'px';
    }
    is_running = false;
}

handler.onStatementHighlight = function(id) {
    console.log("highlighting " + id)
    if (id) {
        Blockly.mainWorkspace.highlightBlock(id.toString());
    } else {
        Blockly.mainWorkspace.highlightBlock(id.toString());
    }
}

handler.onInstructionsChange = function(msg) {
    Hackcraft.setInstructions(msg);
}

return onHackcraftEvent;
}());
