var RUTHEFJORD_CONFIG = {
    server: {
        url: 'http://localhost:27246/api',
        storage: 'local'
    },
    logging: {

    },
    experiment: {
        id: '322d194c-4914-11e6-aa49-570e0189cf71',
        condition_in_storage: true
    },
    features: {
        no_login_prompt: true,
        workshop_only: true
    },
    feature_conditions: {
        1: {
            is_debugging: true,
            debugging_always: true
        },
        2: {
            is_debugging: false
        }
    },
    hide_packs: [
        "decomposition"
    ],
    gallery: {
        group: "cgs_web"
    }
};

