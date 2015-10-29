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

        self.MAX_STACK_LENGTH = 50000;
        self.MAX_STEP_COUNT = 100000;
        self.TICKS_PER_SECOND = 60;
        self.ticks_per_step = 30; // controlled by speed slider
        self.last_stmt_exec_time = 0;

        self.set_run_state = function(rs) {
            if (self.run_state === rs) return;
            if (rs === module.RunState.stopped && self.edit_mode === module.EditMode.workshop) {
                if (self.save_state) {
                    RuthefjordWorldState.setFromSave(self.save_state);
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
            if (self.states) {
                self.set_run_state(module.RunState.paused);
                RuthefjordWorldState.setFromClone(self.states[Math.floor(self.states.length * x)]);
            }
        };

        self.execute_program_to = function (ast, t) {
            throw new Error("not yet implemented");
        };

        // simulate stdlib to set up globals
        self.init = function (addons) {
            var stdlib = {
                "body": [{
                    "body": [{
                        "body": [{"args": [], "name": "forward", "type": "command"}],
                        "number": {"type": "ident", "value": "x"},
                        "type": "repeat"
                    }], "name": "Forward", "params": ["x"], "type": "procedure"
                }, {
                    "body": [{"args": [], "name": "left", "type": "command"}],
                    "name": "Left",
                    "params": [],
                    "type": "procedure"
                }, {
                    "body": [{"args": [], "name": "right", "type": "command"}],
                    "name": "Right",
                    "params": [],
                    "type": "procedure"
                }, {
                    "body": [{
                        "body": [{"args": [], "name": "up", "type": "command"}],
                        "number": {"type": "ident", "value": "x"},
                        "type": "repeat"
                    }], "name": "Up", "params": ["x"], "type": "procedure"
                }, {
                    "body": [{
                        "body": [{"args": [], "name": "down", "type": "command"}],
                        "number": {"type": "ident", "value": "x"},
                        "type": "repeat"
                    }], "name": "Down", "params": ["x"], "type": "procedure"
                }, {
                    "body": [{
                        "args": [{"type": "ident", "value": "color"}],
                        "name": "cube",
                        "type": "command"
                    }], "name": "PlaceCube", "params": ["color"], "type": "procedure"
                }, {
                    "body": [{"args": [], "name": "remove", "type": "command"}],
                    "name": "RemoveCube",
                    "params": [],
                    "type": "procedure"
                }], "meta": {"language": "imperative_v02", "version": 2}
            };

            // assume everything in stdlib is a procedure, stick them all in globals
            _.forEach(stdlib.body, function (p) {
                module.globals[p.name] = p;
            });
            // go through each addon, adding defined procedures to globals
            _.forEach(addons, function (addon) {
                _.forEach(addon.body, function(stmt) {
                    if (stmt.type === "procedure") {
                        module.globals[stmt.name] = stmt;
                    }
                });
            });
        };

        function pop_next_statement(sim) {
            // if call stack is empty, nothing left to do!
            if (sim.call_stack.length === 0) {
                return null;
            }

            var ss = last(sim.call_stack);

            // if current stack state is empty, then go up a level
            if (ss.to_execute.length === 0) {
                sim.call_stack.pop();
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
        function push_stack_state(to_execute, args, sim) {
            if (sim.call_stack.length >= self.MAX_STACK_LENGTH) {
                throw new Error("max stack size exceeded!");
            }

            var stmts = to_execute.slice();
            stmts.reverse();
            // copy parent context, or start with an empty one if this is the first thing.
            var context = sim.call_stack.length > 0
                ? shallow_copy(last(sim.call_stack).context)
                : {};
            args.forEach(function (arg) {
                context[arg[0]] = arg[1];
            });
            sim.call_stack.push({to_execute: stmts, context: context});
        }

        function step(stmt, state, sim) {
            //console.log(stmt);
            switch (stmt.type) {
                case "procedure": // procedure definition
                    last(sim.call_stack).context[stmt.name] = stmt;
                    break;
                case "execute": // procedure call
                    var proc;
                    if (last(sim.call_stack).context[stmt.name]) {
                        proc = last(sim.call_stack).context[stmt.name];
                    } else if (module.globals[stmt.name]) {
                        proc = module.globals[stmt.name];
                    } else {
                        throw new Error(stmt.name + " not found");
                    }
                    push_stack_state(proc.body, _.zip(proc.params, stmt.args), sim);
                    break;
                case "repeat": // definite loop
                    var count;
                    if (stmt.number.type === "ident") {
                        count = last(sim.call_stack).context[stmt.number.value].value;
                    } else { // we only support int literals and identifiers
                        count = stmt.number.value;
                    }
                    var new_repeat = {
                        body: stmt.body,
                        number: shallow_copy(stmt.number),
                        type: "repeat",
                        meta: stmt.meta
                    };
                    new_repeat.number.type = "int";
                    new_repeat.number.value = count - 1;
                    if (new_repeat.number.value > 0) {
                        push_stack_state([new_repeat], [], sim);
                    }
                    push_stack_state(stmt.body, [], sim);
                    break;
                case "command": // imperative robot instructions
                    apply_command(stmt, state, sim);
                    break;
                default:
                    throw new Error("statement type " + stmt.type + " not recognized");

            }
        }

        function apply_command(c, state, sim) {
            var cur_pos = state.robot.pos;
            var cur_dir = state.robot.dir;
            switch (c.name) {
                case "cube":
                    // do nothing if something already occupies that space
                    if (!state.grid.hasOwnProperty(cur_pos.toArray())) {
                        state.grid[cur_pos.toArray()] = last(sim.call_stack).context["color"].value;
                    }
                    break;
                case "forward":
                    cur_pos.add(cur_dir);
                    break;
                case "up":
                    cur_pos.add(RuthefjordWorldState.UP);
                    break;
                case "down":
                    if (cur_pos.z > 0) {
                        cur_pos.add(RuthefjordWorldState.DOWN);
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
                    throw new Error(c.name + " not a recognized command");
            }
            state.dirty = true;
        }

        if (typeof window !== "undefined" && window.Worker) {
            self.worker = new Worker("js/worker.js");
            self.worker.onmessage = function (e) {
                self.states = JSON.parse(e.data);
                RuthefjordUI.TimeSlider.setEnabled(true);
            };
        }

        self.set_program = function (ast) {
            self.last_program_sent = ast;
            if (self.edit_mode === module.EditMode.workshop && self.save_state === null) {
                self.save_state = RuthefjordWorldState.save();
            }

            self.call_stack = [];
            self.total_steps = 0;
            self.current_code_elements = [];

            if (ast.body) { // we may be passed a null program
                push_stack_state(ast.body, [], self);
                RuthefjordUI.TimeSlider.setEnabled(false);
                self.states = null;
                if (self.worker) {
                    //self.worker.postMessage(JSON.stringify({globals:module.globals, ast: ast, state: RuthefjordWorldState.clone()}));
                }
            }
        };

        // run program from ast to completion, making updates to state
        // returns state
        self.get_final_state = function(ast, state) {
            var sim = {};
            sim.call_stack = [];
            if (ast.body) { // we may be passed a null program
                push_stack_state(ast.body, [], sim);
            }
            while (sim.call_stack.length > 0) {
                var s = pop_next_statement(sim);
                if (s) {
                    step(s, state, sim);
                }
            }
            return state;
        };

        // returns a list of the commands generated by simulating ast
        //self.get_commands = function(ast, state) {
        //    var commands = [];
        //    var sim = {};
        //    sim.call_stack = [];
        //    if (ast.body) { // we may be passed a null program
        //        push_stack_state(ast.body, [], sim);
        //    }
        //    while (sim.call_stack.length > 0) {
        //        var s = pop_next_statement(sim);
        //        if (s) {
        //            if (s.type === "command") {
        //                commands.push({command: s, call_stack: sim.call_stack.slice()});
        //            }
        //            step(s, state, sim);
        //        }
        //    }
        //    return commands;
        //};
        //
        //self.apply_commands = function(commands, state) {
        //    _.forEach(commands, function(c) {
        //        var sim = {call_stack: c.call_stack};
        //        apply_command(c.command, state, sim);
        //    });
        //};

        self.get_states = function(ast, state) {
            var states = [];
            var sim = {};
            sim.call_stack = [];
            if (ast.body) { // we may be passed a null program
                push_stack_state(ast.body, [], sim);
            }
            while (sim.call_stack.length > 0) {
                var s = pop_next_statement(sim);
                if (s) {
                    if (s.type === "command") { // record state before each update
                        states.push(RuthefjordWorldState.cloneState(state));
                    }
                    step(s, state, sim);
                }
            }
            return states;
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
                    var s = pop_next_statement(self);
                    if (s) {
                        if (s.meta) {
                            self.current_code_elements.push(s.meta.id);
                        }
                        step(s, state, self);
                        self.last_stmt_exec_time = t;
                        if (s.type === "command") {
                            num_steps--;
                        }
                    } else {
                        self.current_code_elements.pop();
                    }
                    if (self.call_stack.length === 0) {
                        self.set_run_state(self.edit_mode === module.EditMode.sandbox ? module.RunState.stopped : module.RunState.finished);
                        return transition_time;
                    }
                }
                onRuthefjordEvent("onProgramStateChange", "current_state");
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