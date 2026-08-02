const React = require('react');
const { View } = require('react-native');

module.exports = {
  __esModule: true,
  SafeAreaProvider: ({ children, ...props }) => React.createElement(View, props, children),
  SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
  SafeAreaConsumer: ({ children }) => (typeof children === 'function' ? children({ top: 0, right: 0, bottom: 0, left: 0 }) : children),
  SafeAreaInsetsContext: { Consumer: ({ children }) => (typeof children === 'function' ? children({ top: 0, right: 0, bottom: 0, left: 0 }) : children) },
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, right: 0, bottom: 34, left: 0 },
  },
  initialWindowSafeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
};
