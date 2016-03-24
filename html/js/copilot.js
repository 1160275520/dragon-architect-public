export var RuthefjordCopilot;

if (COPILOT) {
    RuthefjordCopilot = (function () {
        var self = {};

        self.onWidgetReady = function () {
            var data = {};
            data.command = "CgsGames.onWidgetReady";
            data.args = ["NEW_WIDGET", "1.0"];
            // referrer is set to URL of document that loaded current document, so we can use it to get the parent URL
            window.parent.postMessage(data, document.referrer);
        };

        return self;
    }());
} else {
    RuthefjordCopilot = (function () {
        var self = {};

        self.onWidgetReady = function() {};

        return self;
    }());
}