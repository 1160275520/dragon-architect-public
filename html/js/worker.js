onmessage = function(data) {
    console.log("message for you sir");
    console.log(data);
    postMessage("same to you");
};