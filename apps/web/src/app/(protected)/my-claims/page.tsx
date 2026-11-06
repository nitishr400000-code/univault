import MyClaimsList from "@/components/my-claims-list";

const MyClaimsPage = () => (
  <main className="mx-auto grid w-full max-w-4xl gap-6 p-4 sm:p-6">
    <header className="grid gap-2">
      <h1 className="text-2xl font-semibold">My claims</h1>
      <p className="text-muted-foreground text-sm">
        Check the review status of your claims.
      </p>
    </header>
    <MyClaimsList />
  </main>
);

export default MyClaimsPage;
