import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 独立输出：运行时只需 standalone 产物，镜像与内存占用大幅降低
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
