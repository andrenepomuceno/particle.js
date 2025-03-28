const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require('webpack');
const common = require('./webpack-common.config.js');

module.exports = (env) => {
    return {
        ...common(env),
        mode: 'production',
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin()
            ],
        }
    }
};