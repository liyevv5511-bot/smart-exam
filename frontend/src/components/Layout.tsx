import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Upload,
  BookOpen,
  BarChart3,
  User,
  Shield,
  LogOut,
  Moon,
  Sun,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'İdarəetmə Paneli', end: true },
  { to: '/upload', icon: Upload, label: 'Excel Yüklə' },
  { to: '/tests', icon: BookOpen, label: 'Testlərim' },
  { to: '/statistics', icon: BarChart3, label: 'Statistika' },
  { to: '/profile', icon: User, label: 'Profil' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      {/* Yan panel */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Ağıllı İmtahan</p>
            <p className="text-xs text-slate-400">Sistemi</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`
              }
            >
              <Shield size={18} />
              Admin Paneli
            </NavLink>
          )}
        </nav>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            {user?.full_name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.full_name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={toggle} className="btn-ghost flex-1" title="Tema">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="btn-ghost flex-1"
            title="Çıxış"
          >
            <LogOut size={16} /> Çıxış
          </button>
        </div>
      </aside>

      {/* Mobil üst panel */}
      <div className="flex w-full flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:hidden">
          <span className="flex items-center gap-2 font-bold">
            <GraduationCap size={20} className="text-brand-600" /> Ağıllı İmtahan
          </span>
          <button onClick={toggle} className="btn-ghost !px-2.5">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-6xl"
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Mobil alt naviqasiya */}
        <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                  isActive ? 'text-brand-600' : 'text-slate-400'
                }`
              }
            >
              <item.icon size={20} />
              {item.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
