module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  // docs/ es la salida de build publicada en GitHub Pages y coolprop.js es el glue
  // de emscripten vendorizado: ninguno es código nuestro, y sus ~900 errores hacían
  // que `npm run lint` fuese inservible como puerta de calidad.
  ignorePatterns: ['dist', 'docs', 'src/propFluidos/coolprop.js', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
