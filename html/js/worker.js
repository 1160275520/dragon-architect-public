importScripts("../node_modules/three/three.js", "../node_modules/lodash/lodash.js", "simulator.js");

// dummy world state so imported code from simulator.js can reference it
var RuthefjordWorldState = {};
RuthefjordWorldState.UP = new THREE.Vector3(0,0,1);
RuthefjordWorldState.DOWN = new THREE.Vector3(0,0,-1);

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
    if (ast.body && ast.body.length > 0) { // we may be passed a null program
        RuthefjordManager.Runtime.push_stack_state(ast.body, [], null, sim);
    }
    while (sim.call_stack.length > 0) {
        var s = RuthefjordManager.Runtime.pop_next_statement(sim);
        if (s) {
            if (s.type === "command") { // record state before each update
                count++;
            }
            RuthefjordManager.Runtime.step(s, state, sim);
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
    if (ast.body && ast.body.length > 0) { // we may be passed a null program
        RuthefjordManager.Runtime.push_stack_state(ast.body, [], null, sim);
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
            RuthefjordManager.Runtime.step(RuthefjordManager.Runtime.pop_next_statement(sim), state, sim);
        } else {
            RuthefjordManager.Runtime.pop_next_statement(sim); // need to pop to keep things moving since we just peeked above
        }
    }
    postMessage({sim_state: {state: state, cs: sim.call_stack}, done: false});
}

onmessage = function(e) {
    data = e.data;
    RuthefjordManager.globals = data.globals;
    // restore robot state data to Vector3 after stringification
    var state = data.state;
    state.robot.pos = new THREE.Vector3(state.robot.pos.x, state.robot.pos.y, state.robot.pos.z);
    state.robot.dir = new THREE.Vector3(state.robot.dir.x, state.robot.dir.y, state.robot.dir.z);

    send_states(data.ast, state);
    postMessage({done: true});
};