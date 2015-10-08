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
        self.saveState = null;

        self.MAX_STACK_LENGTH = 50;
        self.MAX_STEP_COUNT = 10000;

        self.setRunState = function(rs) {
            if (self.runState === rs) return;
            if (rs === module.RunState.stopped && self.editMode === module.EditMode.workshop) {
                if (save) {
                    RuthefjordWorldState.restoreFromSave(save);
                } else {
                    throw new Error("no save state available when stopping in workshop mode");
                }
            } else if (rs === module.RunState.executing) {
                if (self.runState === module.RunState.stopped) {
                    // start execution
                }
            }
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
            // default values
            self.runState = module.RunState.stopped;
            self.editMode = module.EditMode.sandbox;
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
            if (self.call_stack.length >= MAX_STACK_LENGTH) {
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

        function step(stmt) {
            self.total_steps += 1;
            if (total_steps > MAX_STEP_COUNT) {
                throw new Error("max step count exceeded!");
            }
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
                    var curPos = RuthefjordWorldState.robot.pos;
                    var curDir = RuthefjordWorldState.robot.dir;
                    switch (stmt.name) {
                        case "cube":
                            RuthefjordWorldState.grid[curPos.toArray()] = last(self.call_stack).context["color"];
                            break;
                        case "forward":
                            curPos.add(curDir);
                            break;
                        case "up":
                            curPos.add(RuthefjordWorldState.UP);
                            break;
                        case "down":
                            if (curPos.z > 0) {
                                curPos.add(RuthefjordWorldState.DOWN);
                            }
                            break;
                        case "left":
                            RuthefjordWorldState.robot.dir = new THREE.Vector3(-curDir.y, curDir.x, 0);
                            break;
                        case "right":
                            RuthefjordWorldState.robot.dir = new THREE.Vector3(curDir.y, -curDir.x, 0);
                            break;
                        case "remove":
                            delete RuthefjordWorldState.grid[curPos.toArray()];
                            break;
                        default:
                            throw new Error(stmt.name + " not a recognized command");
                    }
                    break;
                default:
                    throw new Error("statement type " + stmt.type + " not recognized");

            }
        }

        // simulates program given by ast, applying commands along the way
        self.startExecution = function (ast) {
            if (self.editMode === module.EditMode.workshop && self.saveState === null) {
                self.saveState = RuthefjordWorldState.save();
            }

            self.call_stack = [];
            self.total_steps = 0;

            push_stack_state(ast.body, []);
            while (self.call_stack.length > 0 && self.runState === module.RunState.executing) {
                var s = pop_next_statement();
                if (s) {
                    step(s);
                }
            }
        };



        return self;
    }());

    return module;
}());