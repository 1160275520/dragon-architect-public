var RuthefjordCopilot = (function () {
    var self = {};

    self.onWidgetReady = function() {
        var data = {};
        data.command = "onWidgetReady";
        data.arguments = ["NEW_WIDGET", "1.0"];
        // referrer is set to URL of document that loaded current document, so we can use it to parent URL
        window.parent.postMessage(data, document.referrer);
    };

    return self;
}());