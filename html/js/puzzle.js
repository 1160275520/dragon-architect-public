var RuthefjordPuzzle = (function () {
    "use strict";
    var self = {};

    var WIN_DELAY = 0.5;

    var win_predicate = function () { return false; };
    var current_puzzzle_id, win_time;

    function is_running_but_done_executing() {
        return RuthefjordManager.Simulator.run_state === RuthefjordManager.RunState.finished;
    }

    self.request_start_puzzle = function(info) {
        current_puzzzle_id = info.id;
        var puzzle = info.puzzle;

        // set world state from info.world
        if (puzzle.world) {
            if (puzzle.world.robots[0]) { // assume 1 robot since we currently only support 1
                RuthefjordWorldState.robot.pos.fromArray(puzzle.world.robots[0].pos);
                RuthefjordWorldState.robot.dir.fromArray(puzzle.world.robots[0].dir);
            }
            if (puzzle.world.cubes) {
                puzzle.world.cubes.forEach(function (cube) {
                    RuthefjordWorldState.grid[cube.pos] = cube.color;
                });
            }
            RuthefjordWorldState.dirty = true;
        } else {
            console.warn("puzzle " + puzzle.name + " doesn't set a world state");
        }
        // puzzles are always in workshop mode
        RuthefjordManager.Simulator.set_edit_mode(RuthefjordManager.EditMode.workshop);
        RuthefjordManager.Simulator.set_run_state(RuthefjordManager.RunState.stopped);
        // start_editor in app.js takes care of everything else except setting up and checking puzzle objectives
        RuthefjordDisplay.clearTargets();
        console.log(puzzle);
        if (puzzle.goal) {
            switch (puzzle.goal.source) {
                case "solution":
                    Q($.get(puzzle.solution)).then(function (json) {
                        var final_state = RuthefjordManager.Simulator.get_final_state(json, RuthefjordWorldState.clone());
                        switch(puzzle.goal.type) {
                            case "robot":
                                // display target location
                                RuthefjordDisplay.addRobotTarget(final_state.robot.pos);
                                // set up win predicate
                                win_predicate = function () {
                                    return is_running_but_done_executing() &&
                                        RuthefjordWorldState.robot.pos.equals(final_state.robot.pos);
                                };
                                break;
                            case "cubes":
                                RuthefjordDisplay.addCubeTargets(final_state.grid);
                                win_predicate = function () {
                                    return is_running_but_done_executing() &&
                                        _.isEqual(final_state.grid, RuthefjordWorldState.grid);
                                };
                                break;
                            default:
                                throw new Error(puzzle.goal.type + " not a supported type of goal from solution");
                        }
                    });
                    break;
                case "run-only":
                    win_predicate = function () {
                        return is_running_but_done_executing();
                    };
                    break;
                case "min-cubes":
                    win_predicate = function () {
                        return is_running_but_done_executing() &&
                                Object.keys(RuthefjordWorldState.grid).length >= puzzle.goal.value;
                    };
                    break;
                default:
                    throw new Error(puzzle.goal.source + " not a supported goal source");
            }
        } else {
            throw new Error("puzzle " + puzzle.name + " doesn't contain goal information");
        }

        info.is_starting = true;
        onRuthefjordEvent("onPuzzleChange", info);
    };

    self.check_win_predicate = function () {
        if (win_predicate()) {
            console.log("level won!");
            win_predicate = function () { return false; };
            onRuthefjordEvent("onPuzzleComplete", current_puzzzle_id);
            //if (RuthefjordDisplay.clock.getElapsedTime() > win_time + WIN_DELAY) {
            //}
        }
    };

    return self;
}());