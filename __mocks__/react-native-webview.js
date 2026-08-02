const React = require('react');
const { View } = require('react-native');

const WebView = ({ children, ...props }) => React.createElement(View, props, children);

module.exports = {
  __esModule: true,
  default: WebView,
  WebView,
};
