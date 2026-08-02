const React = require('react');

const show = jest.fn();
const hide = jest.fn();

const ToastComponent = () => React.createElement(React.Fragment, null, null);
ToastComponent.show = show;
ToastComponent.hide = hide;

module.exports = {
  __esModule: true,
  default: ToastComponent,
  Toast: ToastComponent,
  showToast: show,
};
