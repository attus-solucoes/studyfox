import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, X, Loader2, AlertCircle, CheckCircle2, FileText, MoreVertical, Pencil, FileSearch, RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import GraphGenerationOverlay from '@/components/GraphGenerationOverlay';
import { useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import type { Subject } from '@/types/course';
import { generateGraph, type ProgressInfo } from '@/lib/generateGraph';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// ─── Semester helpers ───────────────────────────────
function parseSemesterKey(key: string): number {
  // "2025.1" → 20251, "2024.2" → 20242
  const match = key.match(/(\d{4})[.\-/]?(\d)/);
  if (match) return parseInt(match[1]) * 10 + parseInt(match[2]);
  return 0; // "Sem semestre" goes first
}

function isSemesterPast(subjects: Subject[]): boolean {
  return subjects.length > 0 && subjects.every(s => s.progress >= 100 || (s.status === 'ready' && s.nodes.length > 0 && s.nodes.every(n => n.mastery >= 1)));
}

function getSemesterLabel(key: string, index: number): string {
  if (key === 'Sem semestre') return key;
  return `${index + 1}º Semestre — ${key}`;
}

const QUICK_SEMESTERS = ['2024.2', '2025.1', '2025.2', '2026.1'];

const statusConfig: Record<Subject['status'], { label: string; color: string; icon: typeof CheckCircle2 }> = {
  empty: { label: 'VAZIO', color: 'text-muted bg-paper border-line', icon: FileText },
  processing: { label: 'PROCESSANDO', color: 'text-[#D4A017] bg-[#D4A017]/10 border-[#D4A017]/30 animate-pulse', icon: Loader2 },
  ready: { label: 'PRONTO', color: 'text-lime bg-lime/20 border-lime', icon: CheckCircle2 },
  error: { label: 'ERRO', color: 'text-ember bg-ember/10 border-ember', icon: AlertCircle },
};

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses, addSubject, updateSubject, deleteSubject } = useApp();
  const course = courses.find(c => c.id === id);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectSemester, setSubjectSemester] = useState('');
  const [progress, setProgress] = useState<ProgressInfo | null>(null);

  // Subject management state
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [editSemester, setEditSemester] = useState('');
  const [viewRawText, setViewRawText] = useState<Subject | null>(null);
  const [confirmRetrain, setConfirmRetrain] = useState<Subject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null);

  // Abort controller for cancelling generation
  const abortRef = useRef<AbortController | null>(null);

  // ─── Semester grouping ──────────────────────────────
  const [collapsedSemesters, setCollapsedSemesters] = useState<Record<string, boolean>>({});

  const semesterGroups = useMemo(() => {
    if (!course) return [];
    const grouped = course.subjects.reduce((acc, s) => {
      const key = s.semester?.trim() || 'Sem semestre';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {} as Record<string, Subject[]>);

    const sorted = Object.entries(grouped).sort(
      ([a], [b]) => parseSemesterKey(a) - parseSemesterKey(b)
    );

    // Find "active" semester: most recent with at least one non-100% subject
    let activeSemester = '';
    for (let i = sorted.length - 1; i >= 0; i--) {
      const [key, subs] = sorted[i];
      if (key !== 'Sem semestre' && subs.some(s => s.progress < 100)) {
        activeSemester = key;
        break;
      }
    }

    return sorted.map(([key, subs], i) => ({
      key,
      subjects: subs,
      label: getSemesterLabel(key, i),
      isPast: isSemesterPast(subs) && key !== activeSemester,
      isActive: key === activeSemester,
      isFuture: parseSemesterKey(key) > parseSemesterKey(activeSemester) && key !== 'Sem semestre' && activeSemester !== '',
    }));
  }, [course]);

  const toggleCollapse = (key: string) => {
    setCollapsedSemesters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!course) {
    return (
      <div className="p-8 text-center">
        <p className="text-3xl mb-3">🦊</p>
        <p className="font-body font-semibold text-base text-ink">Curso não encontrado.</p>
        <Link to="/home" className="font-body text-sm text-muted hover:text-ink mt-2 inline-block">← Voltar</Link>
      </div>
    );
  }

  const handleCreateSubject = () => {
    if (!subjectName.trim()) return;
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      courseId: course.id,
      name: subjectName.trim(),
      semester: subjectSemester.trim(),
      status: 'empty',
      progress: 0,
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
    };
    addSubject(course.id, newSubject);
    setSubjectName('');
    setSubjectSemester('');
    setShowSubjectModal(false);
  };

  const handleUploadSubmit = async (file: File | null, textContent: string, subjectIdOverride?: string) => {
    const subjectId = subjectIdOverride || showUploadModal;
    if (!subjectId) return;
    const subject = course.subjects.find(s => s.id === subjectId);
    if (!subjectIdOverride) setShowUploadModal(null);
    updateSubject(course.id, subjectId, { status: 'processing' });
    setProgress({ step: 'Preparando análise...', current: 0, total: 1 });
    toast('🦊 IA analisando material...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (!file && textContent.trim().length < 80) {
        updateSubject(course.id, subjectId, { status: 'error' });
        setProgress(null);
        toast.error('Conteúdo muito curto. Envie pelo menos 80 caracteres.');
        return;
      }

      const { concepts, edges, subjectName: detectedName } = await generateGraph(
        { file: file || undefined, text: file ? undefined : textContent },
        (info) => setProgress(info),
        controller.signal
      );

      updateSubject(course.id, subjectId, {
        status: 'ready',
        nodes: concepts,
        edges,
        name: detectedName || subject?.name || '',
        progress: 0,
      });
      setProgress(null);
      toast.success(`✓ Grafo criado: ${concepts.length} conceitos mapeados!`);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        updateSubject(course.id, subjectId, { status: 'empty' });
        setProgress(null);
        toast('Geração cancelada.');
        return;
      }
      console.error('[StudyOS] Graph generation error:', err);
      updateSubject(course.id, subjectId, { status: 'error' });
      setProgress(null);
      toast.error(err?.message || '✗ Erro ao processar. Tente novamente.');
    } finally {
      abortRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    abortRef.current?.abort();
  };

  const handleEditSave = () => {
    if (!editSubject || !editName.trim()) return;
    updateSubject(course.id, editSubject.id, {
      name: editName.trim(),
      semester: editSemester.trim(),
    });
    setEditSubject(null);
    toast.success('Matéria atualizada!');
  };

  const handleRetrain = (s: Subject) => {
    setConfirmRetrain(null);
    updateSubject(course.id, s.id, { nodes: [], edges: [], status: 'empty', progress: 0 });
    // Open upload modal for retraining
    setShowUploadModal(s.id);
  };

  const handleDelete = (s: Subject) => {
    setConfirmDelete(null);
    deleteSubject(course.id, s.id);
    toast.success('Matéria excluída.');
  };

  return (
    <>
      <motion.div className="p-6 lg:p-8 max-w-5xl" variants={container} initial="hidden" animate="show">
        {/* Breadcrumb */}
        <motion.div variants={item} className="font-body text-xs text-muted mb-1">
          <Link to="/home" className="hover:text-ink transition-fast">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink">{course.name}</span>
        </motion.div>

        {/* Header */}
        <motion.div variants={item} className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-extrabold text-3xl lg:text-[40px] text-ink leading-tight">{course.name}</h1>
            <p className="font-body text-sm text-muted mt-1">
              {course.institution} · {course.subjects.length} matéria{course.subjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowSubjectModal(true)}
            className="shrink-0 border-[1.5px] border-ink font-body font-semibold text-[13px] text-ink px-4 py-2 rounded-md hover:bg-ink hover:text-lime transition-all duration-[120ms]"
          >
            <Plus size={14} className="inline mr-1 -mt-0.5" />
            Nova matéria
          </button>
        </motion.div>

        {/* Subjects */}
        <motion.div variants={item}>
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">MATÉRIAS</span>

          {course.subjects.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-line rounded-lg p-8 text-center mt-3">
              <p className="text-3xl mb-3">🦊</p>
              <p className="font-body font-semibold text-base text-ink">Nenhuma matéria ainda.</p>
              <p className="font-body text-sm text-muted mb-4">Adicione a primeira matéria deste curso.</p>
              <button
                onClick={() => setShowSubjectModal(true)}
                className="bg-ink text-lime font-body font-semibold text-[13px] px-6 py-2.5 rounded-md hover:bg-graphite transition-all duration-[120ms]"
              >
                Criar primeira matéria →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {course.subjects.map(s => {
                const sc = statusConfig[s.status];
                return (
                  <div key={s.id} className={`bg-white border rounded-lg p-5 transition-all duration-[120ms] relative ${s.status === 'ready' ? 'border-line hover:border-lime/60 hover:shadow-sm' : 'border-line hover:border-ink/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-body font-semibold text-[15px] text-ink pr-6">{s.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-body text-[10px] uppercase tracking-wide border px-2 py-0.5 rounded-full ${sc.color}`}>
                          {s.status === 'processing' && <Loader2 size={10} className="inline mr-1 animate-spin" />}
                          {sc.label}
                        </span>
                        {/* Menu button */}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id); }}
                            className="text-muted hover:text-ink transition-colors duration-[120ms] p-0.5 rounded"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {menuOpen === s.id && (
                            <SubjectMenu
                              subject={s}
                              onClose={() => setMenuOpen(null)}
                              onEdit={() => {
                                setEditSubject(s);
                                setEditName(s.name);
                                setEditSemester(s.semester || '');
                                setMenuOpen(null);
                              }}
                              onViewRaw={() => { setViewRawText(s); setMenuOpen(null); }}
                              onRetrain={() => { setConfirmRetrain(s); setMenuOpen(null); }}
                              onDelete={() => { setConfirmDelete(s); setMenuOpen(null); }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.semester && <p className="font-body text-xs text-muted">{s.semester}</p>}
                      {s.status === 'ready' && s.nodes.length > 0 && (
                        <span className="font-body text-[10px] text-muted">· {s.nodes.length} conceito{s.nodes.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div className="w-full h-1 bg-line mt-3 rounded-full overflow-hidden">
                      <div className="h-full bg-lime rounded-full transition-all duration-500" style={{ width: `${s.progress}%` }} />
                    </div>
                    <div className="mt-3">
                      {s.status === 'ready' && (
                        <button
                          onClick={() => navigate(`/subject/${s.id}`)}
                          className="font-body text-[13px] text-muted hover:text-ink transition-all duration-[120ms] group"
                        >
                          Ver grafo <span className="inline-block transition-transform duration-[120ms] group-hover:translate-x-1">→</span>
                        </button>
                      )}
                      {s.status === 'empty' && (
                        <button
                          onClick={() => setShowUploadModal(s.id)}
                          className="font-body text-[13px] text-muted hover:text-ink transition-all duration-[120ms] flex items-center gap-1"
                        >
                          <Upload size={12} /> Adicionar apostila
                        </button>
                      )}
                      {s.status === 'processing' && (
                        <p className="font-body text-[13px] text-ink font-semibold flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin text-lime" />
                          Processando com IA...
                        </p>
                      )}
                      {s.status === 'error' && (
                        <div>
                          <button
                            onClick={() => setShowUploadModal(s.id)}
                            className="font-body text-[13px] text-ember hover:text-ink transition-all duration-[120ms]"
                          >
                            Tentar novamente →
                          </button>
                          <p className="font-body text-[11px] text-muted mt-1">Erro técnico — veja console (F12)</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div
                onClick={() => setShowSubjectModal(true)}
                className="border-[1.5px] border-dashed border-line rounded-lg p-5 flex flex-col items-center justify-center gap-1 hover:border-ink hover:text-ink transition-all duration-[150ms] cursor-pointer text-muted min-h-[120px]"
              >
                <Plus size={20} strokeWidth={1.5} />
                <span className="font-body text-sm">Nova matéria</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Modal: Nova Matéria */}
      <AnimatePresence>
        {showSubjectModal && (
          <Modal onClose={() => setShowSubjectModal(false)} title="Nova matéria">
            <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">NOME DA MATÉRIA</label>
            <input
              value={subjectName}
              onChange={e => setSubjectName(e.target.value)}
              placeholder="Ex: Termodinâmica II"
              className="w-full bg-white border-[1.5px] border-line focus:border-ink font-body text-sm text-ink p-3 rounded-md outline-none mb-4"
            />
            <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">SEMESTRE</label>
            <input
              value={subjectSemester}
              onChange={e => setSubjectSemester(e.target.value)}
              placeholder="Ex: 2025.1 (ano.semestre)"
              className="w-full bg-white border-[1.5px] border-line focus:border-ink font-body text-sm text-ink p-3 rounded-md outline-none mb-2"
            />
            <div className="flex gap-1.5 mb-6">
              {QUICK_SEMESTERS.map(sem => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSubjectSemester(sem)}
                  className={`font-body text-[11px] px-2.5 py-1 rounded border transition-all duration-[120ms] ${
                    subjectSemester === sem
                      ? 'border-ink bg-ink text-lime'
                      : 'border-line text-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreateSubject}
              disabled={!subjectName.trim()}
              className="bg-ink text-lime font-display font-bold text-[13px] tracking-wide w-full py-3 rounded-md hover:bg-graphite transition-all duration-[120ms] disabled:opacity-40"
            >
              Criar matéria →
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* Modal: Editar Matéria */}
      <AnimatePresence>
        {editSubject && (
          <Modal onClose={() => setEditSubject(null)} title="Editar matéria">
            <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">NOME DA MATÉRIA</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full bg-white border-[1.5px] border-line focus:border-ink font-body text-sm text-ink p-3 rounded-md outline-none mb-4"
            />
            <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">SEMESTRE</label>
            <input
              value={editSemester}
              onChange={e => setEditSemester(e.target.value)}
              placeholder="Ex: 2025.1 (ano.semestre)"
              className="w-full bg-white border-[1.5px] border-line focus:border-ink font-body text-sm text-ink p-3 rounded-md outline-none mb-2"
            />
            <div className="flex gap-1.5 mb-6">
              {QUICK_SEMESTERS.map(sem => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setEditSemester(sem)}
                  className={`font-body text-[11px] px-2.5 py-1 rounded border transition-all duration-[120ms] ${
                    editSemester === sem
                      ? 'border-ink bg-ink text-lime'
                      : 'border-line text-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditSubject(null)}
                className="flex-1 border border-line font-body text-sm text-muted py-2.5 rounded-md hover:border-ink hover:text-ink transition-all duration-[120ms]"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editName.trim()}
                className="flex-1 bg-ink text-lime font-display font-bold text-[13px] tracking-wide py-2.5 rounded-md hover:bg-graphite transition-all duration-[120ms] disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Modal: Ver Apostila */}
      <AnimatePresence>
        {viewRawText && (
          <Modal onClose={() => setViewRawText(null)} title="📄 Material enviado">
            {viewRawText.rawText ? (
              <div className="max-h-[70vh] overflow-y-auto bg-paper border border-line rounded-md p-4">
                <pre className="font-mono text-sm text-ink whitespace-pre-wrap break-words leading-relaxed">
                  {viewRawText.rawText}
                </pre>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">📭</p>
                <p className="font-body text-sm text-muted">Nenhum material salvo para esta matéria.</p>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* Dialog: Confirmar Retreinar */}
      <AnimatePresence>
        {confirmRetrain && (
          <Modal onClose={() => setConfirmRetrain(null)} title="🔄 Retreinar matéria">
            <p className="font-body text-sm text-ink mb-4">
              Isso vai <strong>apagar todos os conceitos e exercícios</strong> de <strong>{confirmRetrain.name}</strong> e regerar do zero. Continuar?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRetrain(null)}
                className="flex-1 border border-line font-body text-sm text-muted py-2.5 rounded-md hover:border-ink hover:text-ink transition-all duration-[120ms]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRetrain(confirmRetrain)}
                className="flex-1 bg-ink text-lime font-display font-bold text-[13px] tracking-wide py-2.5 rounded-md hover:bg-graphite transition-all duration-[120ms]"
              >
                Retreinar →
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Dialog: Confirmar Excluir */}
      <AnimatePresence>
        {confirmDelete && (
          <Modal onClose={() => setConfirmDelete(null)} title="🗑️ Excluir matéria">
            <p className="font-body text-sm text-ink mb-4">
              Excluir <strong>{confirmDelete.name}</strong>? Esta ação é permanente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-line font-body text-sm text-muted py-2.5 rounded-md hover:border-ink hover:text-ink transition-all duration-[120ms]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-ember text-white font-display font-bold text-[13px] tracking-wide py-2.5 rounded-md hover:bg-ember/80 transition-all duration-[120ms]"
              >
                Excluir permanentemente
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Modal: Upload */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(null)}
            onSubmit={handleUploadSubmit}
          />
        )}
      </AnimatePresence>

      {/* Graph Generation Overlay */}
      <GraphGenerationOverlay
        progress={progress}
        visible={!!progress}
        onCancel={handleCancelGeneration}
      />
    </>
  );
}

// ─── Subject Menu Dropdown ──────────────────────────

function SubjectMenu({
  subject,
  onClose,
  onEdit,
  onViewRaw,
  onRetrain,
  onDelete,
}: {
  subject: Subject;
  onClose: () => void;
  onEdit: () => void;
  onViewRaw: () => void;
  onRetrain: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useState(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  });

  const items = [
    { icon: Pencil, label: 'Editar matéria', action: onEdit },
    { icon: FileSearch, label: 'Ver apostila', action: onViewRaw },
    ...(subject.status === 'ready'
      ? [{ icon: RefreshCw, label: 'Retreinar', action: onRetrain }]
      : []),
    { icon: Trash2, label: 'Excluir', action: onDelete, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-7 z-30 w-48 bg-white border border-line rounded-lg shadow-lg py-1 animate-scale-in"
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); it.action(); }}
          className={`w-full text-left px-3 py-2 font-body text-[13px] flex items-center gap-2 transition-colors duration-[120ms] ${
            (it as any).danger
              ? 'text-ember hover:bg-ember/5'
              : 'text-ink hover:bg-paper'
          }`}
        >
          <it.icon size={13} />
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ─── Generic Modal ──────────────────────────────────

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-white border border-line rounded-lg p-6 w-full max-w-md shadow-lg z-10"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-ink">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition-fast">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Upload Modal ───────────────────────────────────

function UploadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (file: File | null, text: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<'file' | 'text'>('file');

  const canSubmit = mode === 'file' ? !!file : textContent.trim().length > 0;

  return (
    <Modal onClose={onClose} title="Adicionar conteúdo">
      {/* Mode tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('file')}
          className={`font-body text-[12px] px-3 py-1.5 rounded-md border transition-all duration-150 ${
            mode === 'file' ? 'border-ink bg-ink text-lime' : 'border-line text-muted hover:border-ink'
          }`}
        >
          <Upload size={12} className="inline mr-1" /> Arquivo
        </button>
        <button
          onClick={() => setMode('text')}
          className={`font-body text-[12px] px-3 py-1.5 rounded-md border transition-all duration-150 ${
            mode === 'text' ? 'border-ink bg-ink text-lime' : 'border-line text-muted hover:border-ink'
          }`}
        >
          <FileText size={12} className="inline mr-1" /> Colar texto
        </button>
      </div>

      {mode === 'file' ? (
        <>
          <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-2 block">APOSTILA OU MATERIAL</label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-[150ms] ${
              dragOver ? 'border-ink bg-paper' : file ? 'border-lime/50 bg-lime/5' : 'border-line hover:border-ink/40'
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 size={28} className="text-lime" />
                <p className="font-body font-semibold text-sm text-ink">{file.name}</p>
                <p className="font-body text-[11px] text-muted">Clique para trocar</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={32} className="text-muted" />
                <p className="font-body font-semibold text-sm text-ink">Arraste seu PDF ou clique para selecionar</p>
                <p className="font-body text-[11px] text-muted">PDF, TXT, DOC, DOCX — até 20MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
            }}
          />
        </>
      ) : (
        <>
          <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-2 block">COLE O CONTEÚDO</label>
          <textarea
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            placeholder="Cole aqui o conteúdo da apostila, anotações ou resumo..."
            className="w-full bg-white border-[1.5px] border-line focus:border-ink font-body text-sm text-ink p-3 rounded-md outline-none resize-none h-40"
          />
          <p className="font-body text-[11px] text-muted mt-1">
            {textContent.length} caracteres · mín. 100
          </p>
        </>
      )}

      <button
        onClick={() => onSubmit(mode === 'file' ? file : null, textContent)}
        disabled={!canSubmit}
        className="bg-ink text-lime font-display font-bold text-[13px] tracking-wide w-full py-3 rounded-md hover:bg-graphite transition-all duration-[120ms] mt-4 disabled:opacity-40"
      >
        Gerar grafo com IA →
      </button>
    </Modal>
  );
}
