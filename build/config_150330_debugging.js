
var RUTHEFJORD_CONFIG = {
    server: {
        url: 'http://gigantor.cs.washington.edu:27246/api',
        storage: 'local' // can be 'server', 'local', or 'session'
    },
    logging: {
        server_tag: 'DEVELOPMENT_SERVER',
        game: {name: 'hackcraft', id: 19, skey: "e00fc765bbcc46064b5eb57dbb02bdf2"},
        category_id: 4
    },
    features: {},
    experiment: {
        id: '7e14b455-2eb4-4485-b210-59d97003da8a'
    },
    feature_conditions: {
        1: {
            is_debugging: true,
            debugging_always: true,
            workshop_only: true
        },
        2: {
            is_debugging: false,
            workshop_only: true
        }
    }
};

