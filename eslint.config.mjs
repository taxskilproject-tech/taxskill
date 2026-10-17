import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".yarn-cache/**",
    "coverage/**",
    "test-results/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/pdf.worker.min.mjs",
    "src/lib/supabase/types/database.types.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "tests/**/*.{ts,tsx}", "*.config.{ts,mjs}"],
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "separate-type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "max-depth": ["error", 2],
      "max-nested-callbacks": ["error", 2],
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": ["error", {
        groups: [
          ["^node:", "^\\u0000?@?\\w"],
          ["^@/"],
          ["^\\u0000?\\."],
          ["^\\u0000"],
        ],
      }],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/features/**", "@/lib/supabase/**", "@supabase/**", "**/repositories/**", "**/*.server"],
          message: "La UI compartida recibe props; no conoce features, persistencia ni secretos.",
        }],
      }],
    },
  },
  {
    files: ["src/components/atoms/**/*.{ts,tsx}", "src/components/molecules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/features/**", "@/lib/**", "@supabase/**", "**/repositories/**",
            "**/*.server", "@/components/organisms/**", "@/components/templates/**",
          ],
          message: "Átomos y moléculas no importan capas superiores ni hooks de negocio.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
