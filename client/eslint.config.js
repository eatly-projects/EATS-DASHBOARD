/**
 * ESLint menggantikan peran TypeScript di project JavaScript ini.
 * Dua aturan terpenting disetel ERROR:
 *   no-undef                   -> variabel yang sudah dihapus tapi masih dipakai
 *   react-hooks/rules-of-hooks -> hook yang dipanggil bersyarat
 * Jalankan sebelum menyatakan sebuah halaman selesai:  npm run lint
 */
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-use-before-define": ["error", { functions: false, classes: true, variables: true, allowNamedExports: true }],
      "no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/incompatible-library": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["*.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
];
