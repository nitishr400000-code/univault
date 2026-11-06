import { redirect } from "next/navigation";

import ClaimReviewQueue from "@/components/claim-review-queue";
import { requireSession } from "@/lib/require-session";

const StaffReviewPage = async () => {
  const session = await requireSession();
  if (!session.user.emailVerified || session.user.role !== "staff") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-4 sm:p-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold">Claim review</h1>
        <p className="text-muted-foreground text-sm">
          Review proof notes and decide which claims match their found items.
        </p>
      </header>
      <ClaimReviewQueue />
    </main>
  );
};

export default StaffReviewPage;
