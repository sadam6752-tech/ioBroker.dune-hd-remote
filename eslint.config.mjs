import config from "@iobroker/eslint-config";

export default [
  ...config,
  {
    ignores: ["node_modules/**", "admin/pwa/**", "test/**"],
  },
];
