
var HackcraftLogging = (function(){ "use strict";

var user;
var self = {};

self.initialize = function() {
    //Create the url requester to handle making requests.
    var loader = new cgs.http.UrlLoader(new cgs.js.http.DefaultHttpLoaderFactory());
    var handler = new cgs.http.requests.UrlRequestHandler(loader, new cgs.http.requests.RequestFailureHandler());

    var api = new cgs.CgsApi(handler, new cgs.CgsCache(null));

    var skey = "";
    var skeyHash = cgs.server.logging.GameServerData.NO_SKEY_HASH;
    var serverTag = cgs.server.CGSServerProps.DEVELOPMENT_SERVER;
    var gameName = "dev";
    var gameId = 10;
    var versionId = 1;
    var categoryId = 23;

    var props = new cgs.user.CgsUserProperties(
        skey, skeyHash, gameName, gameId, versionId, categoryId, serverTag);

    //Enable saving of data to server.
    props.enableCaching();
    //props.setForceUid("test_user");

    //Wait to save data until everything has been loaded.
    props.setCompleteCallback(function(response) {
        console.log("Test save data is: " + user.getSave("test"));
        user.setSave("test", Math.floor((Math.random() * 10) + 1));
    });

    //Initialize an anonymous user. TODO - Local cache still needs
    //to be written for js.
    user = api.initializeUser(props);
}

self.startQuest = function(qid) {
    var localDqid = 1; //Optional parameter that is needed if more than one quest is being logged at a time.
    var msStartTime = Date.now();

    function start() {
        //Load a quest start action and the quest end.
        var questId = qid;
        var details = {exampleData1:"data1", exampleData2:"data2"};
        var levelDataString = "test";
        //CrytoJS is required to call this. See html file for script.
        var questHash = CryptoJS.MD5(levelDataString);
        user.logQuestStart(questId, questHash, details, function(response) {
            //Callback is optional and usually is only used for testing.
        }, localDqid);
        console.info('logging quest start for qid ' + qid);
    }

    var questLogger = {};

    var AID = {
        PuzzleExecuted: 1001,
        PuzzleSolved: 1002,
        ProgramExecutionStarted: 2001,
        ProgramExecutionReset: 2002,
        ProgramExecutionSpeedAdjusted: 2005
    };

    function log(actionId, actionDetail) {
        var startTs = Date.now() - msStartTime;
        var endTs = 0;
        var questAction = new cgs.QuestAction(actionId, startTs, endTs);
        questAction.setDetail(actionDetail);
        user.logQuestAction(questAction);
    };

    questLogger.logProgramExecutionStarted = function(program) {
        log(AID.ProgramExecutionStarted, {program:program});
    };

    questLogger.logProgramExecutionReset = function() {
        log(AID.ProgramExecutionReset, {});
    };

    questLogger.logQuestEnd = function() {
        var questEndDetail = {test:"test"};
        user.logQuestEnd(questEndDetail, function(response) {
            //Callback is optional and usually is only used for testing.
        }, localDqid);
        console.info('logging quest end for qid ' + qid);
    };

    start();
    return questLogger;
}

self.logRandomAction = function() {
    //Action unrelated to a quest.
    var actionId = 1;
    var actionDetail = {test:"test"};
    var action = new cgs.UserAction(actionId, actionDetail);
    user.logAction(action);
}

return self;

}());

