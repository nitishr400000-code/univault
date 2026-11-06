import { notFound } from "next/navigation";
import { z } from "zod";

import ItemDetail from "@/components/item-detail";
import { requireSession } from "@/lib/require-session";

const ItemDetailPage = async ({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) => {
  const { itemId } = await params;
  const session = await requireSession();
  if (!z.uuid().safeParse(itemId).success) {
    notFound();
  }

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 p-4 sm:p-6">
      <ItemDetail
        canClaim={
          session.user.emailVerified &&
          (session.user.role === "student" || session.user.role === "staff")
        }
        id={itemId}
      />
    </main>
  );
};

export default ItemDetailPage;
