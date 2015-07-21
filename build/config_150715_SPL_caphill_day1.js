
var RUTHEFJORD_CONFIG = {
    server: {
        url: 'http://gigantor.cs.washington.edu:27246/api',
        storage: 'local' // can be 'server', 'local', or 'session'
    },
    logging: {
        url: 'http://gigantor.cs.washington.edu:27895',
        release_id: '4D979494-9860-45E5-A046-4A646BDEBA97',
        release_name: '150715 capitol hill library day 1',
        release_key: ''
    },
    features: {},
    experiment: {
        id: '6C853767-7307-417B-A565-BA4614536026'
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
    },
    gallery: {
        group: "SPL"
    }
};

