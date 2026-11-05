import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";

import { withPwa } from "./pwa.config";

const withVarlock = varlockNextConfigPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  typedRoutes: true,
};

export default withVarlock(withPwa(nextConfig));
