import React from "react";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, LogOut, PlusCircle, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export const Navbar: React.FC = () => {
  const { user, signOut, integrations } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-navy-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue via-accent-teal to-accent-violet text-white shadow-lg shadow-blue-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">LearnMate</span>
            <span className="ml-1 rounded bg-accent-teal/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-teal">
              Live
            </span>
          </div>
        </Link>

        {user && (
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                location.pathname === "/dashboard"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <Link
              to="/setup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Session
            </Link>

            {integrations && (
              <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-navy-900 px-2.5 py-1 text-[11px] text-slate-400">
                <span
                  className={`h-2 w-2 rounded-full ${
                    integrations.openai_configured ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                AI
                <span
                  className={`ml-1.5 h-2 w-2 rounded-full ${
                    integrations.zoom_configured ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                Zoom
              </div>
            )}

            <div className="hidden sm:block text-xs text-slate-400 pl-1">{user.name}</div>
            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out"
              className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};
