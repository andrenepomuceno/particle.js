const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require('webpack');

module.exports = (env) => {
    return {
        entry: './src/main.js',
        mode: 'production',
        output: {
            filename: 'main.js',
            path: path.resolve(__dirname, 'dist'),
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        keep_fnames: true,
                    },
                }),
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                'ENV': JSON.stringify(env)
            }),
        ],
    }
};