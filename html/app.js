// the elsinore module, which returns the top-level function required for Unity communication
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
    console.log(handler[func]);
    handler[func](arg);
}

// startup
$(function() {
    var config = {
        width: 768,
        height: 768,
        params: { enableDebugging:"0" }
    };

    unityObject = new UnityObject2(config);
    unityObject.initPlugin(jQuery("#unityPlayer")[0], "hackcraft/hackcraft.unity3d");

    // button/ui callbacks have to be setup inside this block

    $('#btn-load').on('click', function() {
        set_stage(possible_stages[8]);
    });

    $('#btn-setprog').on('click', function() {
        set_program("not a valid program");
    });

    $('#btn-run').on('click', function() {
        is_running = !is_running;
        set_is_running(is_running);
    });
});

// SPECIFIC HANDLER FUNCTIONS

function set_program(prog) {
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
    program = JSON.parse(json);
    console.log(program);
}

return onHackcraftEvent;
}());
