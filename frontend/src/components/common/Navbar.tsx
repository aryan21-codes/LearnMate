import React from "react";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, LogOut, PlusCircle, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export const Navbar: React.FC = () => {
  const { user, signOut, integrations } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display text-base font-extrabold tracking-tight text-slate-900">
              LearnMate
            </span>
            <span className="ml-1 rounded-md bg-teal-50 border border-teal-200 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-teal-700">
              Live
            </span>
          </div>
        </Link>

        {user && (
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                location.pathname === "/dashboard"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <Link
              to="/setup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Session
            </Link>

            {integrations && (
              <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                <span
                  className={`h-2 w-2 rounded-full ${
                    integrations.openai_configured ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                AI
                <span
                  className={`ml-1.5 h-2 w-2 rounded-full ${
                    integrations.zoom_configured ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                Zoom
              </div>
            )}

            <div className="hidden sm:block text-xs font-medium text-slate-700 pl-1">
              {user.name}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out"
              className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};
