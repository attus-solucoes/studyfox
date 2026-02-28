import { BookOpen, House, BarChart2, Settings, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';

const navItems = [
  { to: '/home', icon: House, label: 'Home' },
  { to: '/progress', icon: BarChart2, label: 'Progresso' },
  { to: '#', icon: Settings, label: 'Config' },
];

export default function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { courses } = useApp();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Flatten all subjects from all courses for sidebar
  const allSubjects = courses.flatMap(c =>
    c.subjects.filter(s => s.status === 'ready').map(s => ({ id: s.id, name: s.name, progress: s.progress ?? 0 }))
  );
  const weeklyProgress = 68;

  const sidebar = (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-[220px] bg-ink flex flex-col
      lg:relative lg:translate-x-0 transition-transform duration-200
      ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 group cursor-default">
          <span className="text-base">🦊</span>
          <span className="font-display font-bold text-base text-lime transition-fast group-hover:brightness-110">StudyOS</span>
        </div>
        <span className="font-mono text-[10px] text-muted mt-0.5 block">v0.1 beta</span>
      </div>

      <div className="h-px bg-[#1E1E1C]" />

      {/* Matérias */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-1">
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">Matérias</span>
        </div>
        {allSubjects.length === 0 ? (
          <p className="px-4 py-2 font-body text-[12px] text-muted">Nenhuma pronta</p>
        ) : (
          allSubjects.map(s => {
            const path = `/subject/${s.id}`;
            const active = isActive(path);
            return (
              <Link
                key={s.id}
                to={path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2 font-body text-[13px] transition-fast ${
                  active
                    ? 'text-lime border-l-2 border-lime bg-[#1A1A18]'
                    : 'text-[#E8E4DC] border-l-2 border-transparent hover:border-lime/40 hover:bg-[#1A1A18]'
                }`}
              >
                <BookOpen size={14} className="shrink-0" />
                <span className="flex-1 truncate">{s.name}</span>
                <span className="font-mono text-[9px] text-muted shrink-0">{s.progress}%</span>
              </Link>
            );
          })
        )}

        {/* Separator */}
        <div className="mx-4 mt-4 mb-2 h-px" style={{ background: 'linear-gradient(to right, #BFFF00, transparent)' }} />

        {/* Navegar */}
        <div className="px-4 pt-2 pb-1">
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">Navegar</span>
        </div>
        {navItems.map(item => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2 font-body text-[13px] transition-fast ${
                active
                  ? 'text-lime border-l-2 border-lime bg-[#1A1A18]'
                  : 'text-[#E8E4DC] border-l-2 border-transparent hover:border-lime/40 hover:bg-[#1A1A18]'
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1E1E1C]">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full bg-lime flex items-center justify-center ${weeklyProgress > 50 ? 'ring-2 ring-lime ring-offset-2 ring-offset-ink' : ''}`}>
            <span className="font-display font-bold text-xs text-ink">
              {user?.initials || '🦊'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-[13px] text-[#E8E4DC] truncate">
              {user?.name || 'Estudante'}
            </p>
            <div className="w-full h-1 bg-[#1E1E1C] rounded-full mt-1">
              <div className="h-full bg-lime rounded-full transition-all duration-300" style={{ width: `${weeklyProgress}%` }} />
            </div>
            <p className={`font-body text-[10px] mt-0.5 ${weeklyProgress > 60 ? 'text-lime font-semibold' : 'text-muted'}`}>{weeklyProgress}% esta semana</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 lg:hidden p-1.5 bg-ink rounded-md text-lime"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div className="fixed inset-0 bg-ink/50 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}
      {sidebar}
    </>
  );
}
