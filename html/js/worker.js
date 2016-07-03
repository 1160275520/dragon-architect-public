importScripts("../lib/three/three.js", "../lib/lodash/lodash.js");

var UP = new THREE.Vector3(0,0,1);
var DOWN = new THREE.Vector3(0,0,-1);
var globals = {};

function pop_next_statement(sim) {
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
}

function peek_next_statement(sim) {
    // if call stack is empty, nothing left to do!
    if (sim.call_stack.length === 0) {
        return null;
    }

    var ss = _.last(sim.call_stack);

    // if current stack state is empty
    if (ss.to_execute.length === 0) {
        return null;
    }

    // otherwise return element off the current stack state.
    return _.last(ss.to_execute);
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

    var stmts = to_execute.slice();
    stmts.reverse();
    // copy parent context, or start with an empty one if this is the first thing.
    var context = sim.call_stack.length > 0
        ? shallow_copy(_.last(sim.call_stack).context)
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
            _.last(sim.call_stack).context[stmt.name] = stmt;
            break;
        case "execute": // procedure call
            var proc;
            if (_.last(sim.call_stack).context[stmt.name]) {
                proc = _.last(sim.call_stack).context[stmt.name];
            } else if (globals[stmt.name]) {
                proc = globals[stmt.name];
            } else {
                throw new Error(stmt.name + " not found");
            }
            push_stack_state(proc.body, _.zip(proc.params, stmt.args), sim);
            break;
        case "repeat": // definite loop
            var count;
            if (stmt.number.type === "ident") {
                count = _.last(sim.call_stack).context[stmt.number.value].value;
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
                state.grid[cur_pos.toArray()] = _.last(sim.call_stack).context["color"].value;
            }
            break;
        case "forward":
            cur_pos.add(cur_dir);
            break;
        case "up":
            cur_pos.add(UP);
            break;
        case "down":
            if (cur_pos.z > 0) {
                cur_pos.add(DOWN);
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

function cloneState(state) {
    var c = {};
    c.robot = {
        pos: state.robot.pos.clone(),
        dir: state.robot.dir.clone()
    };
    c.grid = _.clone(state.grid);
    return c;
}

function get_total(ast, state) {
    var count = 0;
    var sim = {};
    sim.call_stack = [];
    if (ast.body) { // we may be passed a null program
        push_stack_state(ast.body, [], sim);
    }
    while (sim.call_stack.length > 0) {
        var s = pop_next_statement(sim);
        if (s) {
            if (s.type === "command") { // record state before each update
                count++;
            }
            step(s, state, sim);
        }
    }
    return count;
}

function send_states(ast, state) {
    var total = get_total(ast, cloneState(state));
    postMessage({total:total, done:false});
    var steps = Math.min(total, 100);
    var threshold = total / steps + 1;
    var count = 0;
    var sim = {};
    sim.call_stack = [];
    if (ast.body) { // we may be passed a null program
        push_stack_state(ast.body, [], sim);
    }
    while (sim.call_stack.length > 0) {
        var s = peek_next_statement(sim); // peek to avoid needing to copy to send correct call_stack
        if (s) {
            if (s.type === "command") { // record state before each update
                count++;
                if (count >= threshold) {
                    //console.log({count: count, threshold: threshold});
                    postMessage({sim_state: {state: state, cs: sim.call_stack}, done: false});
                    threshold += total / steps;
                }
            }
            step(pop_next_statement(sim), state, sim);
        } else {
            pop_next_statement(sim); // need to pop to keep things moving since we just peeked above
        }
    }
    postMessage({sim_state: {state: state, cs: sim.call_stack}, done: false});
}

onmessage = function(e) {
    data = e.data;
    globals = data.globals;
    // restore robot state data to Vector3 after stringification
    var state = data.state;
    state.robot.pos = new THREE.Vector3(state.robot.pos.x, state.robot.pos.y, state.robot.pos.z);
    state.robot.dir = new THREE.Vector3(state.robot.dir.x, state.robot.dir.y, state.robot.dir.z);

    send_states(data.ast, state);
    postMessage({done: true});
};