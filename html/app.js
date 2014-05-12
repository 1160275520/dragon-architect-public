// the elsinore module, which returns the top-level function required for Unity communication
onHackcraftEvent = (function(){
"use strict";

var possible_stages;
var program;

var handler = {};

handler.onSystemStart = function(json) {
    possible_stages = JSON.parse(json);
}

handler.onProgramChange = function(json) {
    program = JSON.parse(json);
    console.log(program);
}

$(function() {
    var config = {
        width: 1366, 
        height: 768,
        params: { enableDebugging:"0" }
    };

    var u = new UnityObject2(config);
    u.initPlugin(jQuery("#unityPlayer")[0], "hackcraft/hackcraft.unity3d");

    $('#btn').on('click', function() {
        console.log('click!');
        //u.getUnity().SendMessage("System", "ExternalTest", "Hello from a web page");
        u.getUnity().SendMessage("Global", "SetStage", possible_stages[8]);
    });
});

function somefunc(arg) {
    console.log("Oh hey unity said something");
    console.log(arg);
}

function onHackcraftEvent(func, arg) {
    console.log(func);
    console.log(arg);
    console.log(handler[func]);
    handler[func](arg);
}

return onHackcraftEvent;
}());
