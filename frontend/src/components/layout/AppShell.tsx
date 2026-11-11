import { useState } from "react";
import {
  Activity,
  BarChart3,
  Box,
  ChevronRight,
  Cpu,
  Database,
  FileText,
  Gauge,
  Menu,
  RefreshCw,
  Settings,
  Waves,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiStatusContext } from "../../app/apiStatusContext";
import { useApiStatus } from "../../hooks/useApiStatus";

interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const navigation: NavigationItem[] = [
  { label: "Overview", path: "/", icon: Gauge },
  { label: "Production analytics", path: "/production", icon: BarChart3 },
  { label: "Well performance", path: "/wells", icon: Activity },
  { label: "Reservoir analysis", path: "/reservoir", icon: Waves },
  { label: "Natural flow", path: "/natural-flow", icon: ChevronRight },
  { label: "Artificial lift", path: "/artificial-lift", icon: Settings },
  { label: "Machine learning", path: "/models", icon: Cpu },
  { label: "Predictions", path: "/predictions", icon: BarChart3 },
  { label: "Dataset management", path: "/datasets", icon: Database },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "3D & monitoring", path: "/visualization", icon: Box },
];

const pageNames = Object.fromEntries(navigation.map((item) => [item.path, item.label]));
pageNames["/settings"] = "Settings";
pageNames["/not-found"] = "Page not found";

function ConnectionIndicator({ state, version }: { state: string; version?: string }) {
  const connected = state === "connected";
  const checking = state === "checking";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-slate-300">
      <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : checking ? "animate-pulse bg-amber-300" : "bg-rose-400"}`} />
      <span>{connected ? `API online${version ? ` · v${version}` : ""}` : checking ? "Checking API" : "API offline"}</span>
    </span>
  );
}

export function AppShell() {
  const api = useApiStatus();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = pageNames[location.pathname] ?? "Well analytics";

  return (
    <ApiStatusContext.Provider value={api}>
      <div className="min-h-screen bg-ink text-slate-100">
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-[#0d1727] transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-[76px] items-center justify-between border-b border-line px-5">
            <NavLink to="/" className="group flex items-center gap-3" onClick={() => setMobileOpen(false)} aria-label="GROUP Project ML overview">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
                <Activity size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-wide text-white">GROUP PROJECT ML</span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Well analytics</span>
              </span>
            </NavLink>
            <button className="icon-button lg:hidden" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav aria-label="Main navigation" className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-5">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
            {navigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : "nav-link-idle"}`}
              >
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            <div className="my-4 border-t border-line" />
            <NavLink to="/settings" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : "nav-link-idle"}`}>
              <Settings size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>Settings</span>
            </NavLink>
          </nav>
          <div className="border-t border-line p-4">
            <div className="rounded-xl border border-line bg-[#111d2e] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> Local research build
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Session-only data · no user login · no field persistence</p>
            </div>
          </div>
        </aside>

        {mobileOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}

        <div className="min-h-screen lg:pl-72">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-line bg-ink/95 px-4 backdrop-blur sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button className="icon-button lg:hidden" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <div className="hidden items-center gap-2 text-[11px] text-slate-500 sm:flex">
                  <span>Workspace</span><ChevronRight size={12} /><span className="text-slate-400">{title}</span>
                </div>
                <h1 className="truncate text-sm font-semibold text-white sm:mt-1 sm:text-base">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ConnectionIndicator state={api.connection} version={api.health?.api_version} />
              <button className="icon-button" type="button" aria-label="Refresh API connection" onClick={() => void api.refresh()} title="Refresh API connection">
                <RefreshCw size={16} className={api.connection === "checking" ? "animate-spin" : ""} />
              </button>
            </div>
          </header>
          <main id="main-content" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ApiStatusContext.Provider>
  );
}
