import { notFound } from "next/navigation";
import { z } from "zod";

import ItemDetail from "@/components/item-detail";

const ItemDetailPage = async ({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) => {
  const { itemId } = await params;
  if (!z.uuid().safeParse(itemId).success) {
    notFound();
  }

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 p-4 sm:p-6">
      <ItemDetail id={itemId} />
    </main>
  );
};

export default ItemDetailPage;
