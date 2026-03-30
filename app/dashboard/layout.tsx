import { TopBar } from '@/components/dashboard/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      {/* pt accounts for: main bar (60px) + secondary nav (~44px) */}
      <div className="pt-[64px]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
