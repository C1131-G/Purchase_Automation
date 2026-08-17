export default {
  // TypeScript / JavaScript — lint then format staged files
  "**/*.{ts,tsx,js,jsx,mjs,cjs}": ["oxlint --fix --deny-warnings", "oxfmt"],

  // JSON / Markdown / CSS — format only.
  // Skip *.yaml so pnpm-lock.yaml is not passed to oxfmt (it ignores lockfiles).
  "**/*.{json,jsonc,yml,md,css}": ["oxfmt"],
};
