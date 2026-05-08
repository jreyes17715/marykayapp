// Smoke test: babel-transform modified files via jest's pipeline to catch syntax errors.
// Does NOT execute the modules — just validates parse + transform.

const path = require('path');
const fs = require('fs');
const babel = require('@babel/core');

const config = require('../../babel.jest.config.js');

const FILES = [
  'src/context/AuthContext.js',
  'src/utils/consultantState.js',
  'src/screens/HomeScreen.js',
  'src/screens/CartScreen.js',
  'src/screens/CheckoutScreen.js',
];

describe('syntax check via babel transform', () => {
  FILES.forEach((rel) => {
    it(`${rel} transforms without error`, () => {
      const abs = path.resolve(__dirname, '..', '..', rel);
      const src = fs.readFileSync(abs, 'utf8');
      expect(() =>
        babel.transformSync(src, { ...config, filename: abs, babelrc: false, configFile: false })
      ).not.toThrow();
    });
  });
});
