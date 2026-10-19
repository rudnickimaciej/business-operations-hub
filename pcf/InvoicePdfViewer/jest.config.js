/** Unit tests for the control's logic (service and hooks); the rendering is checked in DEV. */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  transform: {
    "^.+\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react", module: "commonjs", esModuleInterop: true } }],
  },
};
