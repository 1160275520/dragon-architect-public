import {onRuthefjordEvent} from 'app';
import {Ruthefjord} from 'app';
import {RuthefjordBlockly} from 'blockly/ruthefjord';

Ruthefjord.Puzzle = (function () {
    "use strict";
    var self = {};

    var WIN_DELAY = 0.5;

    var win_predicate = function () { return false; };
    var submit_predicate = function () { return false; };
    var current_puzzzle_id, win_time;

    function is_running_but_done_executing() {
        return Ruthefjord.Manager.Simulator.run_state === Ruthefjord.Manager.RunState.finished;
    }

    function body_count(body, proc_name) {
        var count = 0;
        _.forEach(body, function (stmt) {
            if (stmt.type === "execute" && stmt.name === proc_name) {
                count++;
            }
            if (stmt.type === "repeat") {
                // HACK assume repeat number is an int, not an ident
                count += stmt.number.value * body_count(stmt.body, proc_name);
            }
        });
        return count;
    }

    function count_calls(reqs, body, errors) {
        var ret = true;
        _.forEach(reqs, function(call_info) {
            var count = body_count(body, call_info.proc_name);
            if (count !== call_info.count) {
                errors.push(call_info.error_msg);
                ret = false;
            }
        });
        return ret;
    }

    self.clear_puzzle = function() {
        current_puzzzle_id = null;
        win_predicate = function () { return false; };
        submit_predicate = function () { return false; };
        Ruthefjord.Display.clearTargets();
        RuthefjordBlockly.clearProgram(); // clear program so it doesn't get carried over to sandbox
        Ruthefjord.WorldState.init(); // clear world state
        console.log("puzzle cleared");
    };

    self.request_start_puzzle = function(info) {
        current_puzzzle_id = info.id;
        var puzzle = info.puzzle;

        // puzzles are always in workshop mode
        Ruthefjord.Manager.Simulator.set_edit_mode(Ruthefjord.Manager.EditMode.workshop);
        Ruthefjord.Manager.Simulator.clear_run_state();
        // set world state from info.puzzle.world

        Ruthefjord.WorldState.init();
        Ruthefjord.WorldState.dirty = true;
        if (puzzle.world) {
            if (puzzle.world.robots[0]) { // assume 1 robot since we currently only support 1
                Ruthefjord.WorldState.robot.pos.fromArray(puzzle.world.robots[0].pos);
                Ruthefjord.WorldState.robot.dir.fromArray(puzzle.world.robots[0].dir);
            }
            if (puzzle.world.cubes) {
                puzzle.world.cubes.forEach(function (cube) {
                    Ruthefjord.WorldState.grid[cube.pos] = cube.color;
                });
            }
        } else {
            console.warn("puzzle " + puzzle.name + " doesn't set a world state, using default");
        }
        // start_editor in app.js takes care of everything else except setting up and checking puzzle objectives
        Ruthefjord.Display.clearTargets();
        console.log(puzzle);
        var solution_promise;
        if (puzzle.goal) {
            switch (puzzle.goal.source) {
                case "solution":
                    solution_promise = Q($.get(puzzle.solution)).then(function (json) {
                        var final_state = Ruthefjord.Manager.Simulator.get_final_state(json, Ruthefjord.WorldState.clone());
                        switch(puzzle.goal.type) {
                            case "robot":
                                // display target location
                                Ruthefjord.Display.addRobotTarget(final_state.robot.pos);
                                // set up win predicate
                                win_predicate = function () {
                                    return is_running_but_done_executing() &&
                                        Ruthefjord.WorldState.robot.pos.equals(final_state.robot.pos);
                                };
                                break;
                            case "cubes":
                                Ruthefjord.Display.addCubeTargets(final_state.grid);
                                // sort cube positions in case solution program put them down in a different order
                                win_predicate = function () {
                                    return is_running_but_done_executing() &&
                                        _.isEqual(Object.keys(final_state.grid).sort(), Object.keys(Ruthefjord.WorldState.grid).sort());
                                };
                                break;
                            default:
                                throw new Error(puzzle.goal.type + " not a supported type of goal from solution");
                        }
                    });
                    break;
                case "run_only":
                    win_predicate = function () {
                        return is_running_but_done_executing();
                    };
                    break;
                case "min_cubes":
                    win_predicate = function () {
                        return is_running_but_done_executing() &&
                                Object.keys(Ruthefjord.WorldState.grid).length >= puzzle.goal.value;
                    };
                    break;
                case "code_count":
                    win_predicate = function () { return false; }; // never win on update loop, only on submit
                    submit_predicate =  function () {
                        var prog = RuthefjordBlockly.getProgram();
                        var errors = [];
                        var ret = _.every(Object.keys(puzzle.goal.calls), function(proc_def_name) {
                            if (proc_def_name === "MAIN") {
                                return count_calls(puzzle.goal.calls.MAIN, prog.body, errors);
                            } else {
                                var def = _.find(prog.body, function (stmt) {
                                    return stmt.type === "procedure" && stmt.name === proc_def_name;
                                });
                                if (def) {
                                    return count_calls(puzzle.goal.calls[proc_def_name], def.body, errors);
                                } else {
                                    return false;
                                }
                            }
                        });
                        if (errors.length > 0) {
                            Ruthefjord.UI.Instructions.displayErrors(errors);
                        }
                        return ret;
                    };
                    break;
                case "none":
                    // unwinable level, meant for open-ended challenges
                    win_predicate = function () { return false; };
                    break;
                default:
                    throw new Error(puzzle.goal.source + " not a supported goal source");
            }
        } else {
            throw new Error("puzzle " + puzzle.name + " doesn't contain goal information");
        }

        info.is_starting = true;
        if (solution_promise) {
            solution_promise.then(function () {
                onRuthefjordEvent("onPuzzleChange", info);
            });
        } else {
            onRuthefjordEvent("onPuzzleChange", info);
        }
    };

    function win_puzzle() {
        console.log("level won!");
        win_predicate = function () { return false; };
        onRuthefjordEvent("onPuzzleComplete", current_puzzzle_id);
        //if (Ruthefjord.Display.clock.getElapsedTime() > win_time + WIN_DELAY) {
        //}
    }

    self.check_win_predicate = function () {
        if (win_predicate()) {
            win_puzzle();
        }
    };

    self.check_submit_predicate = function() {
        if (submit_predicate()) { // submit_predicate takes care of displaying necessary errors
            win_puzzle();
        }
    };

    return self;
}());