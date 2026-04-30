import TopBar from '@/components/dashboard/TopBar';
import { getCurrentUser } from '@/lib/db/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar
        userName={user?.fullName}
        userEmail={user?.email}
        userRole={user?.role}
        isDevMode={user?.isDevMode || false}
        prodExperiment={process.env.PROD_EXPERIMENT === "true"}
      />
      {/* pt accounts for: main bar (60px) + secondary nav (~44px) */}
      <div className="pt-[64px]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
