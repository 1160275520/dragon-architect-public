
var RuthefjordLogging = (function(){ "use strict";

var user;
var is_initialized = false;
var self = {};

self.initialize = function(uid) {

    var skey = RUTHEFJORD_CONFIG.logging.game.skey;
    var skeyHash = cgs.server.logging.GameServerData.UUID_SKEY_HASH;
    var serverTag = cgs.server.CGSServerProps[RUTHEFJORD_CONFIG.logging.server_tag];
    console.info(serverTag);
    var gameName = RUTHEFJORD_CONFIG.logging.game.name;
    var gameId = RUTHEFJORD_CONFIG.logging.game.id;
    var versionId = 1;
    var categoryId = RUTHEFJORD_CONFIG.logging.category_id;

    if (!serverTag || !gameName || !gameId || !versionId || (!categoryId && categoryId !== 0)) {
        console.warn('invalid logging configuration!');
        return;
    }

    var loader = new cgs.http.UrlLoader(new cgs.js.http.DefaultHttpLoaderFactory());
    var handler = new cgs.http.requests.UrlRequestHandler(loader, new cgs.http.requests.RequestFailureHandler());
    var api = new cgs.CgsApi(handler, new cgs.CgsCache(null));

    var props = new cgs.user.CgsUserProperties(
        skey, skeyHash, gameName, gameId, versionId, categoryId, serverTag);

    // DO NOT Enable saving of data to server (it doesn't even work yet anyway)
    // props.enableCaching();

    // force the uid if it was passed into this function
    if (uid) {
        props.setForceUid(uid);
    }

    if (RUTHEFJORD_CONFIG.logging.proxy_url) {
        props.setUseProxy(true);
        props.setProxyUrl(RUTHEFJORD_CONFIG.game_server.url + RUTHEFJORD_CONFIG.logging.proxy_url);
    }

    //Wait to save data until everything has been loaded.
    props.setCompleteCallback(function(response) {
        console.log("Test save data is: " + user.getSave("test"));
        user.setSave("test", Math.floor((Math.random() * 10) + 1));
    });

    //Initialize an anonymous user. TODO - Local cache still needs
    //to be written for js.
    user = api.initializeUser(props);

    is_initialized = true;
};

self.startQuest = function(qid, checksum) {

    var localDqid = 1; //Optional parameter that is needed if more than one quest is being logged at a time.
    var msStartTime = Date.now();

    function start() {
        //Load a quest start action and the quest end.
        var questId = qid;
        var details = {exampleData1:"data1", exampleData2:"data2"};
        //CrytoJS is required to call this. See html file for script.
        var questHash = checksum;
        user.logQuestStart(questId, questHash, details, function(response) {
            //Callback is optional and usually is only used for testing.
        }, localDqid);
        console.info('logging quest start for qid ' + qid);
    }

    var ql = {};

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
        // state changes

        OnPuzzleSolved: 10001,
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

        Unused: 0 // to prevent comma sadness
    };

    function log(actionId, actionDetail) {
        if (!is_initialized) return;

        var startTs = Date.now() - msStartTime;
        var endTs = 0;
        var questAction = new cgs.QuestAction(actionId, startTs, endTs);
        questAction.setDetail(actionDetail);
        user.logQuestAction(questAction);
    }

    ql.logOnPuzzledCompleted = function() {
        log(AID.OnPuzzleSolved, {});
    };

    ql.logOnProgramRunStateChanged = function(runState, program) {
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

    ql.logDoProgramRunStateChange = function(runState) {
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

    ql.logOnEditModeChanged = function(newMode) {
        log(AID.OnEditModeChanged, {mode: newMode});
    };

    ql.logDoEditModeChange = function(newMode) {
        log(AID.DoEditModeChange, {mode: newMode});
    };

    ql.logQuestEnd = function() {
        if (!is_initialized) return;

        var questEndDetail = {test:"test"};
        user.logQuestEnd(questEndDetail, function(response) {
            //Callback is optional and usually is only used for testing.
        }, localDqid);
        console.info('logging quest end for qid ' + qid);
    };

    if (is_initialized) {
        start();
    }
    return ql;
};

self.logRandomAction = function() {
    //Action unrelated to a quest.
    var actionId = 1;
    var actionDetail = {test:"test"};
    var action = new cgs.UserAction(actionId, actionDetail);
    user.logAction(action);
};

return self;

}());

