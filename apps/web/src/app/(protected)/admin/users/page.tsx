import { Button } from "@univault/ui/components/button";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminUserManagement from "@/components/admin-user-management";
import { requireSession } from "@/lib/require-session";

const AdminUsersPage = async () => {
  const session = await requireSession();
  if (session.user.role !== "system_admin") {
    redirect("/dashboard");
  }

  return (
    <main className="container mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Manage users</h1>
          <p className="text-muted-foreground text-sm">
            Search by name or campus email, set staff access, or deactivate an
            account.
          </p>
        </div>
        <Button render={<Link href="/dashboard" />} variant="outline">
          Back to dashboard
        </Button>
      </div>
      <AdminUserManagement />
    </main>
  );
};

export default AdminUsersPage;
