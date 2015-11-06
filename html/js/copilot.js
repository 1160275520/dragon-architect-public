var RuthefjordCopilot = (function () {
    var self = {};

    self.onWidgetReady = function() {
        window.parent.CgsGames.onWidgetReady(window.frameElement.id, "1.0");
    };

    return self;
}());