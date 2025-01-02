const path = require('path');
const webpack = require('webpack');
const common = require('./webpack-common.config.js');

module.exports = (env) => {
    return {
        ...common(env),
        mode: 'development',
        devtool: 'eval-source-map',
        watchOptions: {
            poll: true,
        },
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            hot: true,
        }
    }
};