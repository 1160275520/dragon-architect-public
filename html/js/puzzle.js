var RuthefjordPuzzle = (function () {
    "use strict";
    var self = {};

    self.request_start_puzzle = function(info) {
        // set world state from info.world
        if (info.world) {
            if (info.world.robots[0]) { // assume 1 robot since we currently only support 1
                RuthefjordWorldState.robot.pos.fromArray(info.world.robots[0].pos);
                RuthefjordWorldState.robot.dir.fromArray(info.world.robots[0].dir);
            }
            if (info.world.cubes) {
                info.world.cubes.forEach(function (cube) {
                    RuthefjordWorldState.cubes[cube.pos] = cube.color;
                });
            }
            RuthefjordWorldState.dirty = true;
        } else {
            console.warn("puzzle " + info.name + " doesn't set a world state");
        }
        // puzzles are always in workshop mode
        RuthefjordManager.Simulator.set_edit_mode(RuthefjordManager.EditMode.workshop);
        // start_editor in app.js takes care of everything else except setting up and checking puzzle objectives
        if (info.goal) {
            switch (info.goal.type) {
                case "from-program":
                    var final_state = RuthefjordManager.Simulator.get_final_state()
                    break;
                default :
                    throw new Error("not yet implemented");
            }
        } else {
            throw new Error("puzzle " + info.name + " doesn't contain goal information");
        }
    };

    return self;
}());