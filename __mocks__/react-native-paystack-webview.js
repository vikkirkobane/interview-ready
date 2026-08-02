const React = require('react');
const { View } = require('react-native');

const Paystack = ({ children, ...props }) => React.createElement(View, props, children);

module.exports = {
  __esModule: true,
  Paystack,
  PaystackWebView: Paystack,
  default: Paystack,
};
