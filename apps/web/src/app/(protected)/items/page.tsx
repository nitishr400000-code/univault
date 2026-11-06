import ItemSearch from "@/components/item-search";

const ItemsPage = () => (
  <main className="mx-auto grid w-full max-w-6xl gap-6 p-4 sm:p-6">
    <header className="grid gap-2">
      <h1 className="text-2xl font-semibold">Found items</h1>
      <p className="text-muted-foreground text-sm">
        Search items found around campus. Claimed items are no longer listed.
      </p>
    </header>
    <ItemSearch />
  </main>
);

export default ItemsPage;
