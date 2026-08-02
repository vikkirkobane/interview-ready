const React = require('react');
const { View, Text } = require('react-native');

const Mock = (props) => React.createElement(View, props, props.children);
const TextMock = (props) => React.createElement(Text, props, props.children);

module.exports = {
  __esModule: true,
  default: Mock,
  Svg: Mock,
  SvgXml: Mock,
  SvgUri: Mock,
  Circle: Mock,
  Rect: Mock,
  Path: Mock,
  Text: TextMock,
  G: Mock,
  Line: Mock,
  Polygon: Mock,
  Polyline: Mock,
  Ellipse: Mock,
  Defs: Mock,
  LinearGradient: Mock,
  RadialGradient: Mock,
  Stop: Mock,
  ClipPath: Mock,
  Use: Mock,
  Symbol: Mock,
  Marker: Mock,
  Pattern: Mock,
  TSpan: Mock,
  Mask: Mock,
  ForeignObject: Mock,
  withLocalSvg: (C) => C,
};
