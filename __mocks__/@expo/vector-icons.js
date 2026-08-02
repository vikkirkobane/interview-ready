const React = require('react');
const { View } = require('react-native');

const makeIcon = (IconName) => ({ name, size, color, style, ...props }) =>
  React.createElement(View, { ...props, style, accessibilityLabel: name || IconName || 'icon' }, null);

module.exports = {
  __esModule: true,
  Ionicons: makeIcon('Ionicons'),
  MaterialCommunityIcons: makeIcon('MaterialCommunityIcons'),
  MaterialIcons: makeIcon('MaterialIcons'),
  FontAwesome: makeIcon('FontAwesome'),
  FontAwesome5: makeIcon('FontAwesome5'),
  FontAwesome6: makeIcon('FontAwesome6'),
  Feather: makeIcon('Feather'),
  AntDesign: makeIcon('AntDesign'),
  EvilIcons: makeIcon('EvilIcons'),
  Entypo: makeIcon('Entypo'),
  Foundation: makeIcon('Foundation'),
  Octicons: makeIcon('Octicons'),
  SimpleLineIcons: makeIcon('SimpleLineIcons'),
  Zocial: makeIcon('Zocial'),
};
