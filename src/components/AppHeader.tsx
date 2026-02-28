import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const breadcrumbMap: Record<string, string> = {
  '/home': 'Home',
  '/progress': 'Progresso',
};

export default function AppHeader() {
  const location = useLocation();
  const { user } = useAuth();

  const getBreadcrumb = () => {
    if (breadcrumbMap[location.pathname]) return breadcrumbMap[location.pathname];
    if (location.pathname.startsWith('/subject/')) return 'Matérias / Knowledge Graph';
    if (location.pathname.startsWith('/concept/')) return 'Matérias / Conceito';
    return '';
  };

  const crumbs = getBreadcrumb().split(' / ');

  return (
    <header className="h-12 sticky top-0 z-20 bg-paper border-b border-line flex items-center justify-between px-4 lg:px-6 shadow-sm">
      <div className="flex items-center gap-1 pl-10 lg:pl-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="font-body text-xs text-muted">/</span>}
            <span className={`font-body text-xs ${i === crumbs.length - 1 ? 'text-ink font-semibold' : 'text-muted'}`}>{c}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-body text-[13px] text-ink bg-white border border-line rounded px-2 py-0.5">
          🔥 5
        </span>
        <div className="w-px h-5 bg-line" />
        <div className="w-7 h-7 rounded-full bg-lime flex items-center justify-center">
          <span className="font-display font-bold text-[10px] text-ink">
            {user?.initials || '🦊'}
          </span>
        </div>
      </div>
    </header>
  );
}
