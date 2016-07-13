
var RUTHEFJORD_CONFIG = {
    server: {
        url: 'https://dragonarchitect.net:27246/api',
        storage: 'local'
    },
    logging: {
        url: 'https://dragonarchitect.net:27895',
        release_id: '208bb932-4914-11e6-b0c9-eb45834f6dcb',
        release_name: 'spl_2016',
        release_key: ''
    },
    experiment: {
        id: '322d194c-4914-11e6-aa49-570e0189cf71'
    },
    feature_conditions: {
        1: {
            is_debugging: true,
            debugging_always: true,
            no_login_prompt: true,
            workshop_only: true
        },
        2: {
            is_debugging: false,
            no_login_prompt: true,
            workshop_only: true
        }
    },
    hide_packs: [
        "decomposition"
    ],
    gallery: {
        group: "spl_2016"
    }
};

