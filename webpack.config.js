const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const glob = require('glob');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

const config = {
  entry: {
    'render-nav': ['./client/render-nav.js'],
    faq: ['./client/faq.js'],
    i18n: ['./client/i18n.js'],
    stats: ['./client/stats.js'],
    style: ['./sass/style.scss'],
    give: ['./sass/give.scss'],
    'locations-list-map': ['./client/locations-list-map.js'],
  },
  resolve: { extensions: ['.js'] },
  mode: isDevelopment ? 'development' : 'production',
  output: {
    path: path.join(__dirname, './public/generated'),
    publicPath: '/generated/',
    filename: '[name].entry.js',
  },
  module: {
    rules: [
      {
        test: /\.scss$|\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: isDevelopment,
            },
          },
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
              sassOptions: {
                includePaths: glob.sync('node_modules').map((d) => path.join(__dirname, d)),
              },
            },
          },
        ],
      },
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: isDevelopment ? "'development'" : "'production'",
      },
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
  ],
};

if (isDevelopment) {
  config.devtool = '#eval-source-map';
} else {
  config.devtool = '#source-map';
  config.optimization = { minimize: true };
}

module.exports = config;
