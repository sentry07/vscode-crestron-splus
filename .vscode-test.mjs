import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  tests: [{
    label: "UnitTests",
    files: "out/test/**/*.test.js",
    workspaceFolder: "./testWorkspace",
    mocha: {
      timeout: 200000,

    },
  }],
  coverage: {
    exclude: [
      "out/**/*",
      "src/test/**/*",
      "src/fsWrapper.ts",
    ]
  }
});
