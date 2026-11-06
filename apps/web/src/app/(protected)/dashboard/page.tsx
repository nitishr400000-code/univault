import { Button } from "@univault/ui/components/button";
import Link from "next/link";

import ProfileNameForm from "@/components/profile-name-form";
import { requireSession } from "@/lib/require-session";

import Dashboard from "./dashboard";

const DashboardPage = async () => {
  const session = await requireSession();

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="flex items-center justify-between gap-4">
        <p>Welcome {session.user.name}</p>
        {session.user.role === "system_admin" ? (
          <Button render={<Link href="/admin/users" />} variant="outline">
            Manage users
          </Button>
        ) : null}
      </div>
      <section className="grid gap-4 p-4">
        <h2 className="font-medium">Profile</h2>
        <ProfileNameForm name={session.user.name} />
      </section>
      <Dashboard
        canPost={
          session.user.role === "student" || session.user.role === "staff"
        }
      />
    </div>
  );
};

export default DashboardPage;
