cgs = {}
cgs.js = {}
cgs.js.http = {}
cgs.js.http.DefaultHttpLoaderFactory = function() { };
cgs.js.http.DefaultHttpLoaderFactory.__name__ = true;
//cgs.js.http.DefaultHttpLoaderFactory.__interfaces__ = [cgs.http.IHttpLoaderFactory];
cgs.js.http.DefaultHttpLoaderFactory.prototype =
{
    createHttpLoader: function(request)
    {
        return new cgs.js.http.HttpLoader(request);
    }
    ,__class__: cgs.js.http.DefaultHttpLoaderFactory
}

cgs.js.http.HttpLoader = function(request)
{
    this.request = request;
};
cgs.js.http.HttpLoader.__name__ = true;
//cgs.js.http.HttpLoader.__interfaces__ = [cgs.http.IHttpLoader];
cgs.js.http.HttpLoader.prototype =
{
    setListener: function(listener)
    {
        this.listener = listener;
    }
    ,onLoadError: function(error) {
        this.errorCallback = error;
    }
    ,onComplete: function(complete) {
        this.completeCallback = complete;
    }
    ,onStatus: function(status) {
        this.status = status;
    }
    ,onError: function(msg) {
        this.error = msg;
        if(this.listener != null) this.listener.handleHttpLoadError(this);
    }
    ,onData: function(data) {
        this.response.setData(data);
        if(this.listener != null) this.listener.handleHttpLoadComplete(this);
    }
    ,load: function() {
        this.response = new cgs.http.responses.Response();
        var that = this;
        
        //TODO - Need to fix request to set properties on
        //request as needed.
        //console.log(this.request.getUrlVariables().toString());
        var data = null;
        if(this.request.isPOST())
        {
            data = this.request.getUrlVariables().toString();
        }
        
        var xhr = $.ajax(
        {
            type: this.request.getMethod(),
            url: this.request.getUrl(),
            data: data,
            success: function(data)
            {
                that.onData(data);
            },
            error: function(data)
            {
                that.onError(data);
            }
        });
        
        //TODO - Set the headers if there are any.
    }
    ,getResponse: function() {
        return this.response;
    }
    ,getRequest: function() {
        return this.request;
    }
    ,__class__: cgs.js.http.HttpLoader
}