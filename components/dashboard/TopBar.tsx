'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Zap,
  LogOut,
  ChevronDown,
  Home,
  FileText,
  Activity,
  FlaskConical,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { logoutAction } from '@/app/login/actions';

const NAV_LINKS = [
  { label: 'Home',          href: '/dashboard/home',           Icon: Home },
  { label: 'Documentación', href: '/dashboard/documentacion',  Icon: FileText },
  { label: 'Synapsis Go',   href: '/dashboard/go',             Icon: Activity },
  { label: 'Ablación',      href: '/dashboard/ablation',       Icon: FlaskConical },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.05)]">

      {/* ── Main strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-[64px] px-4 sm:px-8">

        {/* Logo Section */}
        <Link href="/dashboard/home" className="flex items-center gap-3 group transition-all">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/20 group-hover:scale-105 transition-all duration-300">
            <Zap className="w-5 h-5 text-white fill-white/20" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-slate-900 font-black text-[16px] tracking-tight group-hover:text-blue-600 transition-colors">
              SYNAPSIS
            </span>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.15em] mt-0.5 opacity-80">
              Go Intelligence
            </span>
          </div>
        </Link>

        {/* Navigation - Centered Desktop */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
          {NAV_LINKS.map(({ label, href, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl transition-all duration-200",
                  active
                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                )}
              >
                <Icon className={cn("w-4 h-4", active ? "text-blue-500" : "text-slate-400")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: User & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          <div className="h-8 w-px bg-slate-200/60 hidden sm:block" />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={cn(
                "flex items-center gap-2 sm:gap-3 pl-1 pr-2 py-1 rounded-xl transition-all group",
                isUserMenuOpen ? "bg-slate-100" : "hover:bg-slate-50"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white text-[12px] font-black shadow-md shadow-blue-500/10 shrink-0">
                AH
              </div>
              <div className="hidden sm:flex flex-col leading-none text-left">
                <span className="text-slate-900 text-[13px] font-bold">Admin HTL</span>
                <span className="text-slate-400 text-[10px] mt-0.5 font-medium">Administrator</span>
              </div>
              <ChevronDown className={cn(
                "w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-all",
                isUserMenuOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-4 py-2 border-b border-slate-50 mb-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cuenta</p>
                  <p className="text-xs font-semibold text-slate-700 truncate">admin@synapsis.go</p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 font-bold transition-colors group"
                >
                  <div className="p-1.5 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </div>
                  Salir del Sistema
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200/50"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white animate-in slide-in-from-top duration-300">
          <nav className="flex flex-col p-4 gap-2">
            {NAV_LINKS.map(({ label, href, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-2xl text-[14px] font-bold transition-all",
                    active
                      ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                    active ? "bg-white text-blue-500 shadow-sm" : "bg-slate-100 text-slate-400"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
