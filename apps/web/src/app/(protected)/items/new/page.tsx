import { redirect } from "next/navigation";

import FoundItemForm from "@/components/found-item-form";
import { requireSession } from "@/lib/require-session";

const NewFoundItemPage = async () => {
  const session = await requireSession();
  if (session.user.role !== "student" && session.user.role !== "staff") {
    redirect("/dashboard");
  }

  return (
    <main className="grid gap-6 p-4">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold">Post a found item</h1>
        <p className="text-muted-foreground text-sm">
          Describe the item and add clear photos so its owner can recognize it.
        </p>
      </header>
      <FoundItemForm />
    </main>
  );
};

export default NewFoundItemPage;
