/**
 * Jest stub for react-native-svg / react-native-qrcode-svg in widget contract
 * tests. Native SVG can't render under jest; the contract being tested is the
 * widget's render against its payload, not vector output. Any imported symbol
 * resolves to a pass-through View.
 */
const React = require('react');
const { View } = require('react-native');

const Stub = ({ children }) => React.createElement(View, null, children);

module.exports = new Proxy(
  { __esModule: true, default: Stub },
  { get: (target, prop) => (prop in target ? target[prop] : Stub) },
);
