
var RUTHEFJORD_CONFIG = {
    //server: {url: 'http://gigantor.cs.washington.edu:27246/api'},
    server: {
        url: 'http://localhost:5000/api',
        storage: 'local' // can be 'server', 'local', or 'session'
    },
    logging: {
        //server_tag: 'PRODUCTION_SERVER',
        server_tag: 'DEVELOPMENT_SERVER',
        //proxy_url: 'logging_proxy',
        game: {name: 'hackcraft', id: 19, skey: "e00fc765bbcc46064b5eb57dbb02bdf2"},
        category_id: 4
    },
    features: { 
        is_debugging: true
    },
};

