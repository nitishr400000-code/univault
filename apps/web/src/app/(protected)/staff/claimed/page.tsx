import { redirect } from "next/navigation";

import ClaimedItems from "@/components/claimed-items";
import { requireSession } from "@/lib/require-session";

const ClaimedItemsPage = async () => {
  const session = await requireSession();
  if (!session.user.emailVerified || session.user.role !== "staff") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-4 sm:p-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold">Claimed items</h1>
        <p className="text-muted-foreground text-sm">
          Items marked handed over remain available to staff here.
        </p>
      </header>
      <ClaimedItems />
    </main>
  );
};

export default ClaimedItemsPage;
