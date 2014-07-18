
Since this page uses iframes, you'll need a static http server to test it.
To run a local webserver, you have a couple options:

node.js
----------------------------------------------------------------------------
npm install -g http-server
http-server <path to directory with index.html> -p <port> -c-1


Python 2.X
----------------------------------------------------------------------------
cd <directory with index.html>
python -m SimpleHTTPServer <port>


Python 3.X
----------------------------------------------------------------------------
cd <directory with index.html>
python -m http.server <port>

