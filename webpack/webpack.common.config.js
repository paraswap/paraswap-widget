const path = require('path');
const webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

module.exports = (env = process.env, dirname = __dirname) => ({
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
  },
  entry: path.resolve(dirname, '..', 'src/index.ts'),
  output: {
    filename: 'index.js',
    path: path.resolve(dirname, '..', 'dist'),
    library: '',
    libraryTarget: 'commonjs'
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader'
      },
      {
        test: /\.(woff|woff2|ttf|eot)$/,
        use: 'file-loader?name=fonts/[name].[ext]'
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          'file-loader',
          {
            loader: 'image-webpack-loader',
            options: {
              bypassOnDebug: true, // webpack@1.x
              disable: true, // webpack@2.x and newer
            },
          },
        ],
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV),
      'process.env.API_URL': JSON.stringify(env.API_URL),
      'process.env.PROVIDER_URL': JSON.stringify(env.PROVIDER_URL),
    }),
    new CleanWebpackPlugin()
  ]
});
