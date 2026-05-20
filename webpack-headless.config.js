const path = require('path');
const common = require('./webpack-common.config.js');

module.exports = (env) => {
    return {
        ...common(env),
        entry: './src/headless/browserHarness.js',
        output: {
            filename: 'headless.js',
            path: path.resolve(__dirname, 'dist')
        },
        mode: 'development',
        devtool: 'eval-source-map',
        devServer: {
            port: 8090,
            static: [
                {
                    directory: path.join(__dirname, 'dist'),
                },
                {
                    directory: path.join(__dirname, 'tests/fixtures'),
                },
            ],
            hot: false,
        },
    };
};
