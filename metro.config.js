const { getDefaultConfig } = require("@react-native/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /android\/\.cxx\/.*/,
  /node_modules\/.*\/android\/\.cxx\/.*/,
];

module.exports = config;
