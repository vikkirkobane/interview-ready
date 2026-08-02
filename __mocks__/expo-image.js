const React = require('react');
const { View } = require('react-native');

const Image = ({ children, ...props }) => React.createElement(View, props, children);

module.exports = {
  __esModule: true,
  default: Image,
  Image,
  ImageBackground: ({ children, ...props }) => React.createElement(View, props, children),
  useImage: () => null,
  generateBlurhash: async () => 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
};
