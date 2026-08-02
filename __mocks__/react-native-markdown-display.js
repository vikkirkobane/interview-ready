const React = require('react');
const { View, Text } = require('react-native');

const Markdown = ({ children, ...props }) => {
  const content = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : children;
  return React.createElement(
    View,
    props,
    typeof content === 'string' ? React.createElement(Text, null, content) : content
  );
};

module.exports = {
  __esModule: true,
  default: Markdown,
  Markdown,
};
