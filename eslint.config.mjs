import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  // 关闭 prettier 负责的格式规则，避免两者打架
  prettier,
  {
    rules: {
      // 生产代码中允许 console（服务端日志）
      "no-console": "off",
      // 商品图片来自自有 API（SQLite BLOB 二进制流，含商家上传内容），不适合 next/image
      "@next/next/no-img-element": "off",
      // 下划线前缀的参数/变量视为有意保留
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/wal.cjs"],
  },
];

export default eslintConfig;
