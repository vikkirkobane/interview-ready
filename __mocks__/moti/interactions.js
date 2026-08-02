const React = require('react');
const { Pressable } = require('react-native');

const MotiPressable = ({ children, animate, transition, from, ...props }) =>
  React.createElement(Pressable, props, children);

module.exports = {
  __esModule: true,
  MotiPressable,
  MotiPressableComponent: MotiPressable,
  useMotiPressable: () => ({}),
  useMotiPressableTransition: () => ({}),
  useMotifiablePressability: () => ({}),
};
