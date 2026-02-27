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
    c.subjects.filter(s => s.status === 'ready').map(s => ({ id: s.id, name: s.name }))
  );

  const sidebar = (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-[220px] bg-ink flex flex-col
      lg:relative lg:translate-x-0 transition-transform duration-200
      ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🦊</span>
          <span className="font-display font-bold text-base text-lime">StudyOS</span>
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
                    : 'text-[#E8E4DC] border-l-2 border-transparent hover:bg-[#1A1A18]'
                }`}
              >
                <BookOpen size={14} />
                {s.name}
              </Link>
            );
          })
        )}

        {/* Navegar */}
        <div className="px-4 pt-5 pb-1">
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
                  : 'text-[#E8E4DC] border-l-2 border-transparent hover:bg-[#1A1A18]'
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
          <div className="w-8 h-8 rounded-full bg-lime flex items-center justify-center">
            <span className="font-display font-bold text-xs text-ink">
              {user?.initials || '🦊'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-[13px] text-[#E8E4DC] truncate">
              {user?.name || 'Estudante'}
            </p>
            <div className="w-full h-0.5 bg-[#1E1E1C] mt-1">
              <div className="h-full bg-lime" style={{ width: '68%' }} />
            </div>
            <p className="font-body text-[10px] text-muted mt-0.5">68% esta semana</p>
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
