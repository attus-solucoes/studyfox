import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, X, Loader2, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import type { Subject } from '@/types/course';
import { generateGraph } from '@/lib/generateGraph';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const statusConfig: Record<Subject['status'], { label: string; color: string; icon: typeof CheckCircle2 }> = {
  empty: { label: 'VAZIO', color: 'text-muted bg-paper border-line', icon: FileText },
  processing: { label: 'PROCESSANDO', color: 'text-[#D4A017] bg-[#D4A017]/10 border-[#D4A017]/30 animate-pulse', icon: Loader2 },
  ready: { label: 'PRONTO', color: 'text-lime bg-lime/20 border-lime', icon: CheckCircle2 },
  error: { label: 'ERRO', color: 'text-ember bg-ember/10 border-ember', icon: AlertCircle },
};

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses, addSubject, updateSubject } = useApp();
  const course = courses.find(c => c.id === id);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectSemester, setSubjectSemester] = useState('');

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

  const handleUploadSubmit = async (file: File | null, textContent: string) => {
    if (!showUploadModal) return;
    const subjectId = showUploadModal;
    const subject = course.subjects.find(s => s.id === subjectId);
    setShowUploadModal(null);
    updateSubject(course.id, subjectId, { status: 'processing' });
    toast('🦊 IA analisando material...');

    try {
      // Validar input mínimo
      if (!file && textContent.trim().length < 80) {
        updateSubject(course.id, subjectId, { status: 'error' });
        toast.error('Conteúdo muito curto. Envie pelo menos 80 caracteres.');
        return;
      }

      // Gerar grafo — PDF vai direto para o Gemini (multimodal!)
      const { concepts, edges, subjectName: detectedName } = await generateGraph({
        file: file || undefined,
        text: file ? undefined : textContent,
      });

      updateSubject(course.id, subjectId, {
        status: 'ready',
        nodes: concepts,
        edges,
        name: detectedName || subject?.name || '',
        progress: 0,
      });
      toast.success(`✓ Grafo criado: ${concepts.length} conceitos mapeados!`);
    } catch (err: any) {
      console.error('[StudyOS] Graph generation error:', err);
      updateSubject(course.id, subjectId, { status: 'error' });
      toast.error(err?.message || '✗ Erro ao processar. Tente novamente.');
    }
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
                  <div key={s.id} className={`bg-white border rounded-lg p-5 transition-all duration-[120ms] ${s.status === 'ready' ? 'border-line hover:border-lime/60 hover:shadow-sm' : 'border-line hover:border-ink/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-body font-semibold text-[15px] text-ink">{s.name}</p>
                      <span className={`font-body text-[10px] uppercase tracking-wide border px-2 py-0.5 rounded-full ${sc.color}`}>
                        {s.status === 'processing' && <Loader2 size={10} className="inline mr-1 animate-spin" />}
                        {sc.label}
                      </span>
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
                        <p className="font-body text-[13px] text-muted">
                          <Loader2 size={12} className="inline mr-1 animate-spin" />
                          IA gerando grafo...
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
              placeholder="Ex: 2025.1"
              className="w-full bg-white border-[1.5px] border-line focus:border-ink font-body text-sm text-ink p-3 rounded-md outline-none mb-6"
            />
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

      {/* Modal: Upload */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(null)}
            onSubmit={handleUploadSubmit}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} />
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
                <p className="font-body text-[11px] text-muted">PDF, TXT, DOC, DOCX — até 10MB</p>
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
