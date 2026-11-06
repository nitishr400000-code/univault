import MyPostsList from "@/components/my-posts-list";

const MyPostsPage = () => (
  <main className="mx-auto grid w-full max-w-6xl gap-6 p-4 sm:p-6">
    <header className="grid gap-2">
      <h1 className="text-2xl font-semibold">My posts</h1>
      <p className="text-muted-foreground text-sm">
        Track the current status of the found items you posted.
      </p>
    </header>
    <MyPostsList />
  </main>
);

export default MyPostsPage;
