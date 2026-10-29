import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/**
 * Fails on hardcoded user-facing strings in UI files. Detects Cyrillic and
 * Lithuanian diacritics inside string literals, template literals and JSX text,
 * forcing every visible string through t() and the locale files.
 */
const noUiLiteralRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow hardcoded user-facing strings in UI files",
    },
    messages: {
      noLiteral:
        "Hardcoded UI string '{{text}}' — use t() with a locale key instead of a literal.",
    },
    schema: [],
  },
  create(context) {
    const CYRILLIC = /[\u0400-\u04FF]/;
    const LT_DIACRITICS = /[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/;
    function check(node, text) {
      if (text && (CYRILLIC.test(text) || LT_DIACRITICS.test(text))) {
        context.report({ node, messageId: "noLiteral", data: { text: text.trim().slice(0, 40) } });
      }
    }
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) check(quasi, quasi.value.cooked ?? "");
      },
      JSXText(node) {
        check(node, node.value);
      },
    };
  },
};

export default tseslint.config(
  { ignores: ["dist/**", "src-tauri/**", "node_modules/**", "src/i18n/locales/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    plugins: { invokas: { rules: { "no-ui-literal": noUiLiteralRule } } },
    rules: { "invokas/no-ui-literal": "error" },
  },
  {
    // Tests assert exact user-facing output on purpose, so literals are expected there.
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: { "invokas/no-ui-literal": "off" },
  },
  {
    // shadcn components export variants alongside the component by design.
    files: ["src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
);
