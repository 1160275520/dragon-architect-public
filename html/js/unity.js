var HackcraftUnity = (function(){ "use strict";
var module = {};

var unityObject;

function send_message(object, method, arg) {
    unityObject.getUnity().SendMessage(object, method, arg);
}

module.Player = (function(){
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
}());

module.Call = (function() {
    var self = {};

    self.set_program_execution_speed = function(parameter) {
        send_message("System", "EAPI_SetProgramExecutionSpeed", parameter.toString());
    }

    self.set_program = function(prog) {
        var s = JSON.stringify(prog);
        send_message("System", "EAPI_SetProgramFromJson", s);
    }

    self.request_start_puzzle = function(puzzle_info) {
        send_message("Global", "EAPI_RequestStartPuzzle", JSON.stringify(puzzle_info));
    }

    self.set_is_running = function(is_running) {
        send_message("System", "EAPI_SetIsRunning", is_running ? "true" : "false");
    }

    self.control_camera = function(action) {
        send_message("System", "EAPI_ControlCamera", action);
    }

    return self;
}());

return module;
}());

