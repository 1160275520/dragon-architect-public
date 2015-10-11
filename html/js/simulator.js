var RuthefjordManager = (function() {
    "use strict";
    var module = {};
    module.globals = {};

    module.EditMode = {
        workshop: "workshop",
        sandbox: "sandbox"
    };

    module.RunState = {
        executing: "executing",
        stopped: "stopped",
        paused: "paused",
        finished: "finished"
    };

    function last(array) {
        return array[array.length - 1];
    }

    module.Simulator = (function () {
        var self = {};
        self.save_state = null;

        self.MAX_STACK_LENGTH = 50;
        self.MAX_STEP_COUNT = 10000;
        self.TICKS_PER_SECOND = 60;
        self.ticks_per_step = 30; // controlled by speed slider
        self.last_stmt_exec_time = 0;

        self.set_run_state = function(rs) {
            if (self.run_state === rs) return;
            if (rs === module.RunState.stopped && self.edit_mode === module.EditMode.workshop) {
                if (self.save_state) {
                    RuthefjordWorldState.restoreFromSave(self.save_state);
                } else {
                    throw new Error("no save state available when stopping in workshop mode");
                }
            } else if (rs === module.RunState.executing) {
                if (self.run_state === module.RunState.stopped) {
                    self.set_program(RuthefjordBlockly.getProgram());
                }
                // reset last statement execution time so dt isn't super wrong next time
                self.last_stmt_exec_time = RuthefjordDisplay.clock.getElapsedTime();
            } else if (rs === module.RunState.paused && self.run_state !== module.RunState.executing) {
                throw new Error("cannot pause when not executing");
            }

            self.run_state = rs;
            onRuthefjordEvent("onProgramStateChange", "run_state");
        };

        self.set_edit_mode = function(em) {
            if (self.edit_mode === em) return;
            self.set_run_state(module.RunState.stopped);
            // save world state here?
            self.edit_mode = em;
            onRuthefjordEvent("onProgramStateChange", "edit_mode");
        };

        self.set_execution_speed = function(x) {
            self.ticks_per_step = Math.max(1, Math.floor(60 * Math.pow(0.1, 2.0 * x)));
        };

        self.set_execution_time = function (x) {
            throw new Error("not yet implemented");
        };

        self.execute_program_to = function (ast, t) {
            throw new Error("not yet implemented");
        };

        // simulate stdlib to set up globals
        self.init = function () {
            var stdlib = {
                "body": [{
                    "body": [{
                        "body": [{"args": [], "meta": {"id": 2}, "name": "forward", "type": "command"}],
                        "meta": {"id": 3},
                        "number": {"meta": {"id": 1}, "type": "ident", "value": "x"},
                        "type": "repeat"
                    }], "meta": {"id": 4}, "name": "Forward", "params": ["x"], "type": "procedure"
                }, {
                    "body": [{"args": [], "meta": {"id": 5}, "name": "left", "type": "command"}],
                    "meta": {"id": 6},
                    "name": "Left",
                    "params": [],
                    "type": "procedure"
                }, {
                    "body": [{"args": [], "meta": {"id": 7}, "name": "right", "type": "command"}],
                    "meta": {"id": 8},
                    "name": "Right",
                    "params": [],
                    "type": "procedure"
                }, {
                    "body": [{
                        "body": [{"args": [], "meta": {"id": 10}, "name": "up", "type": "command"}],
                        "meta": {"id": 11},
                        "number": {"meta": {"id": 9}, "type": "ident", "value": "x"},
                        "type": "repeat"
                    }], "meta": {"id": 12}, "name": "Up", "params": ["x"], "type": "procedure"
                }, {
                    "body": [{
                        "body": [{"args": [], "meta": {"id": 14}, "name": "down", "type": "command"}],
                        "meta": {"id": 15},
                        "number": {"meta": {"id": 13}, "type": "ident", "value": "x"},
                        "type": "repeat"
                    }], "meta": {"id": 16}, "name": "Down", "params": ["x"], "type": "procedure"
                }, {
                    "body": [{
                        "args": [{"meta": {"id": 17}, "type": "ident", "value": "color"}],
                        "meta": {"id": 18},
                        "name": "cube",
                        "type": "command"
                    }], "meta": {"id": 19}, "name": "PlaceCube", "params": ["color"], "type": "procedure"
                }, {
                    "body": [{"args": [], "meta": {"id": 20}, "name": "remove", "type": "command"}],
                    "meta": {"id": 21},
                    "name": "RemoveCube",
                    "params": [],
                    "type": "procedure"
                }], "meta": {"language": "imperative_v02", "version": 2}
            };

            // assume everything in stdlib is a procedure, stick them all in globals
            stdlib.body.forEach(function (p) {
                module.globals[p.name] = p;
            });
        };

        function pop_next_statement() {
            // if call stack is empty, nothing left to do!
            if (self.call_stack.length === 0) {
                return null;
            }

            var ss = last(self.call_stack);

            // if current stack state is empty, then go up a level
            if (ss.to_execute.length === 0) {
                self.call_stack.pop();
                return null;
            }

            // otherwise pop an element off the current stack state.
            return ss.to_execute.pop();
        }

        function shallow_copy(object) {
            var copy = {};
            for (var id in object) {
                copy[id] = object[id];
            }
            return copy;
        }

        // to_execute is a list of statements, args is a list of two-element lists where the first element is the
        // parameter name, and the second element is the argument value
        function push_stack_state(to_execute, args) {
            if (self.call_stack.length >= self.MAX_STACK_LENGTH) {
                throw new Error("max stack size exceeded!");
            }

            var stmts = to_execute.slice();
            stmts.reverse();
            // copy parent context, or start with an empty one if this is the first thing.
            var context = self.call_stack.length > 0
                ? shallow_copy(last(self.call_stack).context)
                : {};
            args.forEach(function (arg) {
                context[arg[0]] = arg[1];
            });
            self.call_stack.push({to_execute: stmts, context: context});
        }

        function step(stmt, state) {
            console.log(stmt);
            switch (stmt.type) {
                case "procedure": // procedure definition
                    last(self.call_stack).context[stmt.name] = stmt;
                    break;
                case "execute": // procedure call
                    var proc;
                    if (last(self.call_stack).context[stmt.name]) {
                        proc = last(self.call_stack).context[stmt.name];
                    } else if (module.globals[stmt.name]) {
                        proc = module.globals[stmt.name];
                    } else {
                        throw new Error(stmt.name + " not found");
                    }
                    push_stack_state(proc.body, _.zip(proc.params, stmt.args));
                    break;
                case "repeat": // definite loop
                    var count;
                    if (stmt.number.type === "ident") {
                        count = last(self.call_stack).context[stmt.number.value].value;
                    } else { // we only support int literals and identifiers
                        count = stmt.number.value;
                    }
                    for (var i = 0; i < count; i++) {
                        push_stack_state(stmt.body, []);
                    }
                    break;
                case "command": // imperative robot instructions
                    var cur_pos = state.robot.pos;
                    var cur_dir = state.robot.dir;
                    switch (stmt.name) {
                        case "cube":
                            state.grid[cur_pos.toArray()] = last(self.call_stack).context["color"].value;
                            break;
                        case "forward":
                            cur_pos.add(cur_dir);
                            break;
                        case "up":
                            cur_pos.add(state.UP);
                            break;
                        case "down":
                            if (cur_pos.z > 0) {
                                cur_pos.add(state.DOWN);
                            }
                            break;
                        case "left":
                            state.robot.dir = new THREE.Vector3(-cur_dir.y, cur_dir.x, 0);
                            break;
                        case "right":
                            state.robot.dir = new THREE.Vector3(cur_dir.y, -cur_dir.x, 0);
                            break;
                        case "remove":
                            delete state.grid[cur_pos.toArray()];
                            break;
                        default:
                            throw new Error(stmt.name + " not a recognized command");
                    }
                    state.dirty = true;
                    break;
                default:
                    throw new Error("statement type " + stmt.type + " not recognized");

            }
        }

        self.set_program = function (ast) {
            self.last_program_sent = ast;
            if (self.edit_mode === module.EditMode.workshop && self.save_state === null) {
                self.save_state = RuthefjordWorldState.save();
            }

            self.call_stack = [];
            self.total_steps = 0;

            if (ast.body) { // we may be passed a null program
                push_stack_state(ast.body, []);
            }
        };

        // run program from ast to completion, making updates to a clone of state
        // returns updated clone of state
        self.get_final_state = function(ast, orig_state) {
            if (self.call_stack.length > 0) {
                throw new Error("this might interfere with currently executing program");
            }
            self.call_stack = [];
            self.total_steps = 0;
            var state = orig_state.clone();
            if (ast.body) { // we may be passed a null program
                push_stack_state(ast.body, []);
            }
            while (self.call_stack.length > 0) {
                var s = pop_next_statement();
                if (s) {
                    step(s, state);
                }
            }
            return state;
        };

        self.update = function(dt, t, state) {
            if (self.run_state === module.RunState.executing) {
                var step_delta = dt * self.TICKS_PER_SECOND / self.ticks_per_step;
                var old_tick = Math.floor(self.total_steps);
                self.total_steps += step_delta;
                var new_tick = Math.floor(self.total_steps);
                var num_steps = new_tick - old_tick;

                if (self.total_steps > self.MAX_STEP_COUNT) {
                    throw new Error("max step count exceeded!");
                }

                var transition_time = num_steps === 1 ? t - self.last_stmt_exec_time : 0;
                while (num_steps > 0) {
                    var s = pop_next_statement();
                    if (s) {
                        step(s, state);
                        self.last_stmt_exec_time = t;
                        if (s.type === "command") {
                            num_steps--;
                        }
                    }
                    if (self.call_stack.length === 0) {
                        self.set_run_state(self.edit_mode === module.EditMode.sandbox ? module.RunState.stopped : module.RunState.finished)
                        return transition_time;
                    }
                }
                return transition_time;
            } else if (self.run_state === module.RunState.paused) {
                // update last statement execution time when paused so transition
                // time is reasonable if/when execution resumes
                self.last_stmt_exec_time = t;
            }
            return 0; // dummy transition_time
        };

        return self;
    }());

    return module;
}());