import type { Session } from "@univault/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { authClient } from "@/lib/auth-client";

export const requireSession = cache(async (): Promise<Session> => {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return session as Session;
});
