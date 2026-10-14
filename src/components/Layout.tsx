import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileUp, 
  ShieldCheck, 
  Calculator, 
  Banknote, 
  Users, 
  BarChart3, 
  ClipboardCheck, 
  Settings,
  LogOut,
  Menu,
  X,
  Percent,
  FileText,
  BookOpen,
  Globe2
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useAccounting } from '../AccountingContext';
import { cn } from '../lib/utils';
import ChatAssistant from './ChatAssistant';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ingestion', icon: FileUp, label: 'Ingestion' },
  { to: '/factures', icon: FileText, label: 'Factures' },
  { to: '/conformite', icon: ShieldCheck, label: 'Conformité' },
  { to: '/tva', icon: Percent, label: 'Contrôle TVA' },
  { to: '/allocation', icon: Calculator, label: 'Allocation' },
  { to: '/reconciliation', icon: Banknote, label: 'Réconciliation' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/ohada', icon: Globe2, label: 'SYSCOHADA' },
  { to: '/social', icon: Users, label: 'Réseau Social' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/audit', icon: ClipboardCheck, label: 'Audit' },
  { to: '/admin', icon: Settings, label: 'Paramètres' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { standard, toggleStandard, currencySymbol, pays } = useAccounting();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tighter text-emerald-600">Xfactur</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-semibold">
              v1.2.0
            </span>
          </div>
          
          {/* Quick Standard Toggle */}
          <div className="mt-3 p-2 bg-neutral-50 rounded-2xl border border-neutral-200">
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 px-1 mb-1">
              <span>RÉFÉRENTIEL</span>
              <span className="text-neutral-500 font-mono">{currencySymbol}</span>
            </div>
            <button
              onClick={toggleStandard}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm",
                standard === 'OHADA'
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
              title="Cliquer pour basculer de référentiel comptable"
            >
              <div className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" />
                <span>{standard === 'OHADA' ? 'SYSCOHADA' : 'PCG France'}</span>
              </div>
              <span className="text-[10px] uppercase font-mono opacity-90">
                {standard === 'OHADA' ? (pays || 'Afrique') : 'France'}
              </span>
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? (item.to === '/ohada' ? "bg-amber-50 text-amber-800 font-bold" : "bg-emerald-50 text-emerald-700")
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.to === '/ohada' && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200/60 text-amber-900">
                  OHADA
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <img 
              src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-neutral-200"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || 'Utilisateur'}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="mt-2 flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 z-50">
        <h1 className="text-xl font-bold tracking-tighter text-emerald-600">Xfactur</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-16 flex flex-col overflow-y-auto">
          {/* Mobile Standard Toggle */}
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/70">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-400 mb-1.5 px-1">
              <span>RÉFÉRENTIEL COMPTABLE</span>
              <span className="font-mono text-neutral-600">{currencySymbol}</span>
            </div>
            <button
              onClick={() => {
                toggleStandard();
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm",
                standard === 'OHADA'
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4" />
                <span>{standard === 'OHADA' ? 'SYSCOHADA Révisé' : 'PCG France'}</span>
              </div>
              <span className="text-xs uppercase font-mono bg-black/15 px-2 py-0.5 rounded-md">
                {standard === 'OHADA' ? (pays || 'Afrique') : 'France'}
              </span>
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium",
                  isActive ? "bg-emerald-50 text-emerald-700" : "text-neutral-600"
                )}
              >
                <item.icon className="w-6 h-6" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-6 border-t border-neutral-200">
            <button 
              onClick={logout}
              className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-lg font-medium text-red-600 bg-red-50"
            >
              <LogOut className="w-6 h-6" />
              Déconnexion
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <Outlet />
        </div>
      </main>
      <ChatAssistant />
    </div>
  );
}
