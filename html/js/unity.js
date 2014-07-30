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
        return $('#unity-player embed').width();
    };

    self.height = function() {
        return $('#unity-player embed').height();
    };

    self.initialize = function() {
        var div = $("#unity-player");

        var config = {
            params: { enableDebugging:"0" }
        };

        unityObject = new UnityObject2(config);
        unityObject.initPlugin(div[0], "generated/generated.unity3d");

    };

    // HACK TODO oh god come up with something better than this that works to hide/show the player T_T

    self.hide = function() {
        var u = $('#unity-player embed, #unity-player');
        u.css('width', '1px').css('height', '1px');
    };

    self.show = function() {
        var u = $('#unity-player embed, #unity-player');
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
        console.log(s);
        send_message("System", "EAPI_SetProgramFromJson", s);
    }

    self.request_start_puzzle = function(puzzle_info) {
        send_message("Global", "EAPI_RequestStartPuzzle", JSON.stringify(puzzle_info));
    }

    self.request_start_sandbox = function(world_data) {
        send_message("Global", "EAPI_RequestStartSandbox", world_data ? world_data : "");
    }

    self.set_is_running = function(is_running) {
        send_message("System", "EAPI_SetIsRunning", is_running ? "true" : "false");
    }

    self.control_camera = function(action) {
        send_message("System", "EAPI_ControlCamera", action);
    }

    self.set_edit_mode = function(is_workshop_mode) {
        send_message("System", "EAPI_SetWorkshopMode", is_workshop_mode ? "true" : "false");
    }

    self.request_world_state = function() {
        send_message("System", "EAPI_RequestWorldState", "");
    }

    self.toggle_pause = function() {
        send_message("System", "EAPI_TogglePause", "");
    }

    return self;
}());

return module;
}());

