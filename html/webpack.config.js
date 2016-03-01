var path = require('path');
var webpack = require('webpack');
module.exports = {
    entry: './js/main.js',
    output: {
        filename: 'bundle.js'
    },
    // assumes all JavaScript files you edit will be in js/
    // when importing from src/<file>.js, only need to specify as <file>
    resolve: {
        root: [
            path.resolve('./js'), // must be absolute path
            path.resolve('./lib')
            ],
        extensions: ['', '.js']
    },
    devtool: 'source-map', // source maps to ease debugging
    module: {
        loaders: [
            {
                // pre-process every *.js file (except for ones in
                // node_modules/) with Babel:
                test: /\.js$/,
                exclude: /node_modules/,
                loaders: [
                    // invokes Babel to translate ES6
                    'babel-loader?cacheDirectory&presets[]=es2015'
                ]
            },
        ]
    },
    node: {
        net: 'empty',
        dns: 'empty'
    },
    plugins: [
        new webpack.IgnorePlugin(/\/iconv-loader$/)
    ]
};