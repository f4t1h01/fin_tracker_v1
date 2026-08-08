import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Single flat config for every TypeScript workspace. Each workspace's `lint`
 * script delegates here instead of the no-op stubs that used to make a passing
 * `pnpm lint` meaningless.
 *
 * Deliberately not type-aware (no project service): a whole-program lint would
 * roughly double CI time, and `pnpm typecheck` already runs tsc over every
 * workspace.
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "apps/android/**",
      "packages/db/prisma/migrations/**",
      "**/next-env.d.ts"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      // Unused code is a real signal; allow the conventional underscore escape.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }
      ],
      // Several services intentionally reach Prisma through `any` (see CLAUDE.md).
      // Flag it so it does not spread, but do not fail the build on it.
      "@typescript-eslint/no-explicit-any": "warn",
      // Deliberately off: it fired on ~170 existing imports and is purely stylistic
      // here (no verbatimModuleSyntax), so it would drown out the real signals.
      // Turn it on together with a dedicated autofix pass if the style is wanted.
      "@typescript-eslint/consistent-type-imports": "off",
      // Empty catch blocks are used on purpose for best-effort parsing.
      "no-empty": ["error", { allowEmptyCatch: true }],
      eqeqeq: ["error", "smart"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error"
    }
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  },
  {
    // Nest DTO classes and decorated metadata read as unused to a non-type-aware
    // lint, and test files use throwaway bindings freely.
    files: ["**/*.test.ts", "**/dto/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off"
    }
  }
);
