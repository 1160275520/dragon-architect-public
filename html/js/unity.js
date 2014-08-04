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

    var selector = '#unity-player embed, #unity-player, #main-view-game';

    self.hide = function() {
        $(selector).css('width', '1px').css('height', '1px');
    };

    self.show = function() {
        $(selector).removeAttr('style');
    };

    return self;
}());

module.Call = (function() {
    var self = {};

    self.set_program_state = function(parameter) {
        console.info('setting program state: ' + JSON.stringify(parameter));
        send_message("System", "EAPI_SetProgramState", JSON.stringify(parameter));
    }

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

    self.control_camera = function(action) {
        send_message("System", "EAPI_ControlCamera", action);
    }

    self.request_world_state = function() {
        send_message("System", "EAPI_RequestWorldState", "");
    }

    return self;
}());

return module;
}());

