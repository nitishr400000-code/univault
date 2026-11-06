import ProfileNameForm from "@/components/profile-name-form";
import { requireSession } from "@/lib/require-session";

import Dashboard from "./dashboard";

const DashboardPage = async () => {
  const session = await requireSession();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.user.name}</p>
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
