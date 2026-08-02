const React = require('react');
const { View } = require('react-native');

const passthrough = (props) => React.createElement(View, props, props.children);

module.exports = {
  __esModule: true,
  MotiView: passthrough,
  MotiText: passthrough,
  MotiSkeleton: passthrough,
  MotiPressable: passthrough,
  useMotifiablePressability: () => ({}),
  useMotify: () => ({}),
  useMotiPressable: () => ({}),
  useMotiPressableTransition: () => ({}),
  AnimatePresence: ({ children }) => children,
  default: passthrough,
};
