// the elsinore module, which returns the top-level function required for Unity communication
onHackcraftEvent = (function(){
"use strict";

var possible_stages;
var program;
var unityObject;

var handler = {};

// GENERIC UNITY API SETUP AND MARSHALLING

// send a message to unity
function send_message(object, method, arg) {
    console.log(object);
    console.log(method);
    console.log(arg);
    unityObject.getUnity().SendMessage(object, method, arg);
}

// callback function that receives messages from unity, sends to handler
function onHackcraftEvent(func, arg) {
    console.log(func);
    console.log(arg);
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

    $('#btn').on('click', function() {
        console.log('click!');
        send_message("Global", "SetStage", possible_stages[8]);
    });
});

// SPECIFIC HANDLER FUNCTIONS

handler.onSystemStart = function(json) {
    possible_stages = JSON.parse(json);
}

handler.onProgramChange = function(json) {
    program = JSON.parse(json);
    console.log(program);
}

return onHackcraftEvent;
}());
