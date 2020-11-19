var RuthefjordManager = (function() {
    "use strict";
    var module = {};
    module.globals = {};

    module.EditMode = {
        workshop: "workshop",
        persistent: "persistent"
    };

    module.RunState = {
        executing: "executing",
        stopped: "stopped",
        paused: "paused",
        finished: "finished"
    };

    module.Runtime = (function () {
        var self = {};
        self.MAX_STACK_LENGTH = 50000;

        self.pop_next_statement = function(sim) {
            // if call stack is empty, nothing left to do!
            if (sim.call_stack.length === 0) {
                return null;
            }

            var ss = _.last(sim.call_stack);

            // if current stack state is empty, then go up a level
            if (ss.to_execute.length === 0) {
                sim.call_stack.pop();
                return null;
            }

            // otherwise pop an element off the current stack state.
            return ss.to_execute.pop();
        };

        // to_execute is a list of statements, args is a list of two-element lists where the first element is the
        // parameter name, and the second element is the argument value
        // we include the meta for the relevant block (when applicable) to facilitate highlighting
        self.push_stack_state = function(to_execute, args, meta, sim) {
            if (sim.call_stack.length >= self.MAX_STACK_LENGTH) {
                throw new Error("max stack size exceeded!");
            }

            var stmts = to_execute.slice();
            stmts.reverse();
            // copy parent context, or start with an empty one if this is the first thing.
            var context = sim.call_stack.length > 0
                ? _.clone(_.last(sim.call_stack).context)
                : {};
            args.forEach(function (arg) {
                context[arg[0]] = arg[1];
            });
            sim.call_stack.push({to_execute: stmts, context: context, meta: meta});
        };

        self.step = function(stmt, state, sim) {
            //console.log(stmt);
            switch (stmt.type) {
                case "assign": //for variable blocks
                    if (stmt.value.type === "ident") {
                        // if the argument is a get block for a variable
                        _.last(sim.call_stack).context[stmt.name] = _.last(sim.call_stack).context[stmt.value.value];
                    } else {
                        _.last(sim.call_stack).context[stmt.name] = stmt.value;
                    }
                    break;
                case "procedure": // procedure definition
                    _.last(sim.call_stack).context[stmt.name] = stmt;
                    break;
                case "execute": // procedure call
                    var proc;
                    if (_.last(sim.call_stack).context[stmt.name]) {
                        proc = _.last(sim.call_stack).context[stmt.name];
                    } else if (module.globals[stmt.name]) {
                        proc = module.globals[stmt.name];
                    } else {
                        throw new Error(stmt.name + " not found");
                    }
                    // replace each variable with its value before pushing state on the stack
                    stmt.args.forEach((arg, index, args) => {
                        if (arg.type === "ident") { // if the argument is a get block for a variable
                            args[index] = _.last(sim.call_stack).context[arg.value];
                        }
                    })
                    self.push_stack_state(proc.body, _.zip(proc.params, stmt.args), stmt.meta, sim);
                    break;
                case "repeat": // definite loop
                    var count;
                    // console.log('stmt', stmt);
                    if (stmt.number.type === "ident") { //ToDo: make context hold count's value
                        // console.log("A");
                        // console.log("last on call stack:");
                        // console.log(_.last(sim.call_stack).context);

                        count = _.last(sim.call_stack).context[stmt.number.value].value;
                    } else { // we only support int literals and identifiers
                        count = stmt.number.value;
                    }
                    var new_repeat = {
                        body: stmt.body,
                        number: _.clone(stmt.number),
                        type: "repeat",
                        meta: stmt.meta
                    };
                    new_repeat.number.type = "int";
                    new_repeat.number.value = count - 1;
                    if (new_repeat.number.value > 0) {
                        self.push_stack_state([new_repeat], [], new_repeat.meta, sim);
                    }
                    self.push_stack_state(stmt.body, [], null, sim);
                    break;
                case "counting_loop":
                    var new_loop = {
                        body: stmt.body,
                        counter: _.clone(stmt.counter),
                        from: _.clone(stmt.from),
                        to: _.clone(stmt.to),
                        by: _.clone(stmt.by),
                        type: "counting_loop",
                        meta: stmt.meta
                    };

                    break;
                case "command": // imperative robot instructions
                    //ToDo: this is where forward/up/down/etc. get their functionality, but the value doesnt get passed in here. It just does things once. and somewhere else things got unrolled
                    self.apply_command(stmt, state, sim);
                    break;
                default:
                    throw new Error("statement type " + stmt.type + " not recognized");

            }
        };

        self.apply_command = function(c, state, sim) {
            var cur_pos = state.robot.pos;
            var cur_dir = state.robot.dir;
            switch (c.name) {
                case "cube":
                    // do nothing if something already occupies that space
                    if (!state.grid.hasOwnProperty(cur_pos.toArray())) {
                        state.grid[cur_pos.toArray()] = _.last(sim.call_stack).context["color"].value;
                    }
                    break;
                case "forward":
                    cur_pos.add(cur_dir);
                    break;
                case "set":
                    // cur_pos.add(cur_dir.clone().multiplyScalar(-1)); set should not make things go backwards
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
        };

        return self;
    }());

    module.Simulator = (function () {
        var self = {};
        self.save_state = null;

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
                RuthefjordUI.TimeSlider.value(0);
            } else if (rs === module.RunState.executing) {
                if (self.run_state === module.RunState.stopped) {
                    RuthefjordTranslate.getPythonCode();
                    self.set_program(RuthefjordBlockly.getProgram());
                }
                // reset last statement execution time so dt isn't super wrong next time
                self.last_stmt_exec_time = RuthefjordDisplay.clock.getElapsedTime();
            }//} else if (rs === module.RunState.paused && self.run_state !== module.RunState.executing) {
            //    throw new Error("cannot pause when not executing");
            //}

            self.run_state = rs;
            onRuthefjordEvent("onProgramStateChange", "run_state");
        };

        self.clear_run_state = function() {
            self.save_state = null; // throw out temporary save state so it doesn't end up on the sandbox
            self.run_state = module.RunState.stopped;
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
            if (self.sim_states) {
                self.set_run_state(module.RunState.paused);
                var state_index = Math.floor((self.sim_states.length - 1) * x); // subtract 1 since indices begin at 0
                self.current_commands = Math.floor(state_index * self.total_commands / (self.sim_states.length - 1)); // total_commands does not include start state
                //console.log("set_execution_time: " + self.current_commands + " out of " + self.total_commands);
                RuthefjordUI.TimeSlider.value(self.current_commands / self.total_commands);
                // when current_commands indexes out of bounds, nothing for us to do (will happen when x is 1, i.e., slider all the way at the end)
                if (state_index < self.sim_states.length) {
                    RuthefjordWorldState.setFromClone(self.sim_states[state_index].state);
                    self.call_stack = _.cloneDeep(self.sim_states[state_index].cs);
                    self.current_code_elements = _.map(_.filter(self.call_stack, function(x) { return x.meta }), function(x) { return x.meta.id; });
                }
                onRuthefjordEvent("onProgramStateChange", "current_state");
                if (state_index === self.sim_states.length - 1) { // if we are at the end of the program
                    self.set_run_state(module.RunState.finished);
                }
            }
        };

        self.execute_program_to = function (ast, t) {
            throw new Error("not yet implemented");
        };

        // simulate stdlib to set up globals
        self.init = function (addons) {
            // clear any vestigial program
            self.set_program({});
            delete self.sim_states;

            var stdlib = {
                "body": [{
                    "body": [{
                        "body": [{"args": [], "name": "forward", "type": "command"}],
                        "number": {"type": "ident", "value": "x"},
                        "type": "repeat"
                    }], "name": "Forward", "params": ["x"], "type": "procedure"
                }, {
                    "body": [{
                        "body": [{"args": [], "name": "set", "type": "command"}],
                        "number": {"type": "ident", "value": "x"},
                        "type": "repeat"
                    }], "name": "Set", "params": ["x"], "type": "procedure"
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

        if (typeof window !== "undefined" && window.Worker) {
            self.worker = new Worker("js/worker.js");
            self.worker.onmessage = function (e) {
                if (e.data.done) {
                    //console.log(self.sim_states);
                    RuthefjordUI.TimeSlider.setEnabled(true);
                } else if (e.data.total) {
                    self.total_commands = e.data.total;
                    RuthefjordUI.TimeSlider.setStepSize(Math.max(RuthefjordUI.TimeSlider.MIN_STEP_SIZE, 1 / self.total_commands));
                } else {
                    self.sim_states.push(e.data.sim_state);
                }
            };
        }

        self.set_program = function (ast) {
            self.call_stack = [];
            self.current_commands = 0;
            self.current_code_elements = [];
            if (ast.body && ast.body.length > 0) { // we may be passed a null program
                module.Runtime.push_stack_state(ast.body, [], null, self);
            }
            if (!_.isEqual(ast, self.last_program_sent)) {
                self.last_program_sent = ast;
                if (self.edit_mode === module.EditMode.workshop && self.run_state === module.RunState.stopped) {
                    self.save_state = RuthefjordWorldState.save();
                }

                self.total_steps = 0;

                if (ast.body && ast.body.length > 0) {
                    RuthefjordUI.TimeSlider.setEnabled(false);
                    self.sim_states = [{
                        state: RuthefjordWorldState.clone(),
                        cs: _.cloneDeep(self.call_stack)
                    }];
                    if (self.worker) {
                        self.worker.postMessage({globals: module.globals, ast: ast, state: self.sim_states[0].state});
                    }
                }
            }
        };

        // run program from ast to completion, making updates to state
        // returns state
        self.get_final_state = function(ast, state) {
            var sim = {};
            sim.call_stack = [];
            if (ast.body && ast.body.length > 0) { // we may be passed a null program
                module.Runtime.push_stack_state(ast.body, [], null, sim);
            }
            while (sim.call_stack.length > 0) {
                var s = module.Runtime.pop_next_statement(sim);
                if (s) {
                    module.Runtime.step(s, state, sim);
                }
            }
            return state;
        };

        self.next_state = function() {
            while (true) {
                var s = module.Runtime.pop_next_statement(self);
                // extract the block ids to highlight from the call stack
                self.current_code_elements = _.map(_.filter(self.call_stack, function(x) { return x.meta }), function(x) { return x.meta.id; });
                if (s) {
                    module.Runtime.step(s, RuthefjordWorldState, self);
                    if (s.type === "command") {
                        self.current_commands++;
                        if (self.total_commands) {
                            //console.log("next_state: " + self.current_commands + " out of " + self.total_commands);
                            RuthefjordUI.TimeSlider.value(self.current_commands / self.total_commands);
                        }
                        break;
                    }
                }
                if (self.call_stack.length === 0) {
                    self.set_run_state(self.edit_mode === module.EditMode.persistent ? module.RunState.stopped : module.RunState.finished);
                    //RuthefjordUI.TimeSlider.value(1); // move time slider to the end
                    return;
                }
            }
            onRuthefjordEvent("onProgramStateChange", "current_state");
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
                    var s = module.Runtime.pop_next_statement(self);
                    // extract the block ids to highlight from the call stack
                    self.current_code_elements = _.map(_.filter(self.call_stack, function(x) { return x.meta }), function(x) { return x.meta.id; });

                    if (s) {
                        //if (s.meta) {
                        //    self.current_code_elements.push(s.meta.id);
                        //}
                        module.Runtime.step(s, state, self);
                        self.last_stmt_exec_time = t;
                        if (s.type === "command") {
                            num_steps--;
                            self.current_commands++;
                            if (self.total_commands) {
                                //console.log(self.current_commands + " out of " + self.total_commands);
                                RuthefjordUI.TimeSlider.value(self.current_commands / self.total_commands);
                            }
                        }
                    } else {
                        //self.current_code_elements.pop();
                    }
                    if (self.call_stack.length === 0) {
                        self.set_run_state(self.edit_mode === module.EditMode.persistent ? module.RunState.stopped : module.RunState.finished);
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