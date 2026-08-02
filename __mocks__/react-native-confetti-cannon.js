const React = require('react');
const { View } = require('react-native');

module.exports = {
  __esModule: true,
  default: ({ children, ...props }) => React.createElement(View, props, children),
  ConfettiCannon: ({ children, ...props }) => React.createElement(View, props, children),
};
