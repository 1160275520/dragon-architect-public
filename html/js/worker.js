importScripts("../lib/three/three.js", "../lib/lodash/lodash.js");

var UP = new THREE.Vector3(0,0,1);
var DOWN = new THREE.Vector3(0,0,-1);
var globals = {};

function last(array) {
    return array[array.length - 1];
}

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
    c.grid = JSON.parse(JSON.stringify(state.grid));
    return c;
}

function get_states(ast, state) {
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
                states.push(cloneState(state));
            }
            step(s, state, sim);
        }
    }
    return states;
}

onmessage = function(e) {
    data = JSON.parse(e.data);
    globals = data.globals;
    // restore robot state data to Vector3 after stringification
    var state = data.state;
    state.robot.pos = new THREE.Vector3(state.robot.pos.x, state.robot.pos.y, state.robot.pos.z);
    state.robot.dir = new THREE.Vector3(state.robot.dir.x, state.robot.dir.y, state.robot.dir.z);

    var states = get_states(data.ast, state);
    postMessage(JSON.stringify(states));
};