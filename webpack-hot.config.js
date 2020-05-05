const webpack = require('webpack');
const ErrorOverlayPlugin = require('error-overlay-webpack-plugin');
const config = require('./webpack.config.js');

// Currently rendering doesn't have a way to understand HMR to do a partial
// reload so do a full page refresh per HMR update.

/* eslint-disable no-restricted-syntax */
for (const entry of Object.values(config.entry)) {
  entry.unshift('webpack-hot-middleware/client?reload=true');
}

config.plugins.unshift(new webpack.HotModuleReplacementPlugin());
config.plugins.push(new ErrorOverlayPlugin());

// Eek. Magic positioning.
config.module.rules[0].use = ['css-hot-loader'].concat(config.module.rules[0].use);

module.exports = config;
