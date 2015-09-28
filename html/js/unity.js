var RuthefjordUnity = (function(){ "use strict";
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

    var selector = '#unity-player embed, #unity-player';

    self.hide = function() {
        if (navigator.platform.indexOf('Mac') === 0 && bowser.firefox) {
            $('#unity-player').css('z-index', '-1');
            $('#main-view-game').css('background', '#b5b5b5');
        } else {
            $(selector).css('width', '1px').css('height', '1px');
        }
    };

    self.show = function() {
        if (navigator.platform.indexOf('Mac') === 0 && bowser.firefox) {
            $('#unity-player').css('z-index', '0');
            $('#main-view-game').css('background', '#ccebff');
        } else {
            $(selector).removeAttr('style');
        }
    };

    return self;
}());

module.Call = (function() {
    var self = {};

    self.set_program_state = function(parameter) {
        // console.info('setting program state: ' + JSON.stringify(parameter));
        send_message("System", "EAPI_SetProgramState", JSON.stringify(parameter));
    };

    self.set_program_execution_speed = function(parameter) {
        send_message("System", "EAPI_SetProgramExecutionSpeed", parameter.toString());
    };

    self.set_program_execution_time = function(parameter) {
        send_message("System", "EAPI_SetProgramExecutionTime", parameter.toString());
    };

    self.set_program = function(prog) {
        // console.log(prog);
        send_message("System", "EAPI_SetProgramFromJson", prog);
    };

    self.execute_program_to = function(prog, time) {
        console.log(prog);
        var params = {
            program: prog,
            time: time
        };
        send_message("System", "EAPI_SetProgramExecutionTime", "0");
        send_message("System", "EAPI_SetProgramFromJson", prog);
        send_message("System", "EAPI_ExecuteProgramTo", JSON.stringify(time));
    };

    self.submit_solution = function() {
        send_message("System", "EAPI_SubmitSolution", "");
    };

    self.parse_concrete_program = function(prog) {
        send_message("System", "EAPI_ParseProgramFromConcrete", prog);
    };

    self.step_program = function(step_type, step_distance) {
        var params = {
            type: step_type, 
            distance: step_distance
        };
        send_message("System", "EAPI_StepProgramExecution", JSON.stringify(params));
    };

    self.next_interesting_step = function() {
        send_message("System", "EAPI_NextInterestingStep", "");
    };

    self.request_start_puzzle = function(puzzle_info) {
        send_message("Global", "EAPI_RequestStartPuzzle", JSON.stringify(puzzle_info));
    };

    self.request_start_sandbox = function(world_data) {
        send_message("Global", "EAPI_RequestStartSandbox", world_data ? world_data : "");
    };

    self.control_camera = function(action) {
        send_message("System", "EAPI_ControlCamera", action);
    };

    self.request_world_state = function() {
        send_message("System", "EAPI_RequestWorldState", "");
    };

    self.render_final_frame = function(data) {
        send_message("System", "EAPI_RenderFinal", JSON.stringify(data));
    };

    self.render_current_frame = function(id) {
        send_message("System", "EAPI_RenderCurrent", id);
    };

    return self;
}());

return module;
}());

