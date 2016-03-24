var path = require('path');
var webpack = require('webpack');
module.exports = {
    entry: './js/main.js',
    // assumes all JavaScript files you edit will be in js/
    // when importing from src/<file>.js, only need to specify as <file>
    resolve: {
        root: [
            path.resolve('./js'), // must be absolute path
            path.resolve('./lib'),
            path.resolve('./generated')
            ],
        extensions: ['', '.js'],

    },
    devtool: 'source-map', // source maps to ease debugging
    module: {
        preLoaders: [
            { test: /\.json$/, loader: 'json'},
        ],
        loaders: [
            {
                // pre-process every *.js file (except for ones in
                // node_modules/) with Babel:
                test: /\.js$/,
                exclude: /node_modules|generated/,
                loaders: [
                    // invokes Babel to translate ES6
                    'babel-loader?cacheDirectory&presets[]=es2015'
                ]
            },
        ],

    },
    node: {
        net: 'empty',
        dns: 'empty'
    },
    plugins: [
        new webpack.DefinePlugin({
            COPILOT: false
        }),
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        }),
        new webpack.ProvidePlugin({
            Q: 'q',
            'window.Q': 'q'
        }),
        new webpack.ProvidePlugin({
            _: 'lodash',
            'window._': 'lodash'
        }),
        new webpack.ProvidePlugin({
            Blockly: 'blockly',
            'window.Blockly': 'blockly'
        })
    ]
};