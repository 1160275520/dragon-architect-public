
var RuthefjordLogging = (function(){ "use strict";

var user;
var is_initialized = false;
var self = {};

// expose the logger globally because ui needs it XP
self.activeTaskLogger = null;
self.telemetry_client = null;

self.uid = function() {
    //return user.getUserId();
    return '234234';
}

self.initialize = function(uid) {
    var base_uri = RUTHEFJORD_CONFIG.logging.url;
    var release_id = RUTHEFJORD_CONFIG.logging.release_id;
    var release_key = RUTHEFJORD_CONFIG.logging.release_key;

    if (!base_uri || !release_id) {
        console.warn('invalid logging configuration!');
        return;
    }

    // force the uid if it was passed into this function, otherwise make a random one
    // TODO FIXME actually fish this out of the session maybe XP, or use the one from the server
    // using Math.random to make these kinda sucks...
    if (!uid) {
        uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    self.telemetry_client = papika.TelemetryClient(base_uri, release_id, release_key);
    self.telemetry_client.log_session({
        user: uid,
        release: release_id,
        // TODO stick some actually useful information in here
        detail: null
    });

    is_initialized = true;
};

/*
* Two kinds of log events: user actions and state change events.
* User actions are logs of any user-initiated actions: e.g., clicking a button in the UI.
* State change events log any game state changes: e.g., program execution started, edit mode changed.
* State changes are often (but not always) the result of user actions.
* However, we separate the two so we can easily separate what the user is doing from what the system is doing.
*
* All action ids that are user events are in the 20000 - 29999, and state changes are 10000 - 19999.
* Actions that go together are usually given the same last 4 digits.
* Event ids, by convention, start with On<Blah>, and user events start with Do<Blah>
*/
var AID = {
    // meta stuff

    PuzzleStarted: 11,
    PuzzleEnded: 12,

    PlayerLogin: 101,
    PlayerConsented: 201,
    PlayerExperimentalCondition: 202,

    // state changes

    OnPuzzleStarted: 10001,
    OnPuzzleSolved: 10002,
    OnProgramExecuted: 10011,
    OnProgramStopped: 10012,
    OnProgramPaused: 10013,
    OnProgramFinished: 10014,
    OnEditModeChanged: 10021,

    // user actions

    DoProgramExecute: 20011,
    DoProgramStop: 20012,
    DoProgramPause: 20013,
    DoProgramFinish: 20014,
    DoEditModeChange: 20021,
    // generic ui action, since we have so dang many
    DoUiAction: 20101,

    Unused: 0 // to prevent comma sadness
};

self.startTask = function(gid, checksum) {

    if (!is_initialized) throw Error("cannot start task, logger not initialized!");

    var msStartTime = Date.now();

    var task_logger = self.telemetry_client.start_task({
        type: AID.PuzzleStarted,
        detail: {gid:gid, checksum:checksum},
        group:'0b854859-f162-4324-97db-a8fe21c3409a'
    });

    var tl = {};

    function log(aid, detail) {
        task_logger.log_event({
            type: aid,
            detail: detail
        });
    }

    tl.logOnPuzzledCompleted = function() {
        log(AID.OnPuzzleSolved, {});
    };

    tl.logOnProgramRunStateChanged = function(runState, program) {
        switch (runState) {
            case "stopped":
                log(AID.OnProgramStopped, {});
                break;
            case "executing":
                log(AID.OnProgramExecuted, {program:program});
                break;
            case "paused":
                log(AID.OnProgramPaused, {});
                break;
            case "finished":
                log(AID.OnProgramFinished, {});
                break;
        }
    };

    tl.logDoProgramRunStateChange = function(runState) {
        switch (runState) {
            case "stopped":
                log(AID.DoProgramStop, {});
                break;
            case "executing":
                log(AID.DoProgramExecute, {});
                break;
            case "paused":
                log(AID.DoProgramPause, {});
                break;
            case "finished":
                log(AID.DoProgramFinish, {});
                break;
        }
    };

    tl.logOnEditModeChanged = function(newMode) {
        log(AID.OnEditModeChanged, {mode: newMode});
    };

    tl.logDoEditModeChange = function(newMode) {
        log(AID.DoEditModeChange, {mode: newMode});
    };

    tl.logDoUiAction = function(element, action, data) {
        log(AID.DoUiAction, {element: element, action: action, data: data});
    };

    tl.logTaskEnd = function() {
        task_logger.log_event({
            type: AID.PuzzleEnded,
            detail:null
        });
        self.activeTaskLogger = null;
    };

    self.activeTaskLogger = tl;
    return tl;
};

// TODO add logging of their condition for redundancy
self.logExperimentalCondition = function(experimentId, conditionId) {
    self.telemetry_client.log_event({
        type: AID.PlayerExperimentalCondition,
        detail: {experiment:experimentId, condition:conditionId}
    });
}

self.logPlayerLogin = function(loginId) {
    self.telemetry_client.log_event({
        type: AID.PlayerLogin,
        detail: {id:loginId}
    });
}

self.logStudentConsented = function(didPlayerConsent, tosId) {
    self.telemetry_client.log_event({
        type: AID.PlayerConsented,
        detail: {tos_id: tosId, did_consent:didPlayerConsent}
    });
};

return self;

}());

