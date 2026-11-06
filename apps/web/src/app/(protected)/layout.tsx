import type { ReactNode } from "react";

import { requireSession } from "@/lib/require-session";

const ProtectedLayout = async ({ children }: { children: ReactNode }) => {
  await requireSession();
  return children;
};

export default ProtectedLayout;
