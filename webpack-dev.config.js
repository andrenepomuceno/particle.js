const path = require('path');
const webpack = require('webpack');

module.exports = (env) => {
    return {
        entry: './src/main.js',
        mode: 'development',
        devtool: 'eval-source-map',
        output: {
            filename: 'main.js',
            path: path.resolve(__dirname, 'dist'),
        },
        watchOptions: {
            poll: true,
        },
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            hot: true,
        },
        plugins: [
            new webpack.DefinePlugin({
                'ENV': JSON.stringify(env)
            }),
        ],


        module: {
            rules: [
                {
                    test: /\.jsx?$/, // Para arquivos JS e JSX
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env', '@babel/preset-react'] // Presets para ES6+ e React
                        }
                    }
                },
                {
                    test: /\.css$/, // suporte a arquivos CSS
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        resolve: {
            extensions: ['.js', '.jsx']
        }
    }
};