import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { GraphNode, GraphEdge } from '@/types/course';

const NODE_W = 96;
const NODE_H = 34;

function getNodeStyle(mastery: number) {
  if (mastery >= 0.9) return { fill: '#BFFF00', stroke: '#BFFF00', textColor: '#111110' };
  if (mastery >= 0.7) return { fill: '#111110', stroke: '#111110', textColor: '#BFFF00' };
  if (mastery > 0) return { fill: '#FAFAF8', stroke: '#111110', textColor: '#111110' };
  return { fill: '#FAFAF8', stroke: '#D4CFC6', textColor: '#7A7A78' };
}

export default function Subject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses } = useApp();

  const result = (() => {
    for (const c of courses) {
      const s = c.subjects.find(s => s.id === id);
      if (s) return { course: c, subject: s };
    }
    return null;
  })();

  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Center graph on mount
  useEffect(() => {
    if (!result?.subject.nodes.length || !containerRef.current) return;
    const nodes = result.subject.nodes;
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));
    const graphW = maxX - minX + NODE_W * 2;
    const graphH = maxY - minY + NODE_H * 2;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = rect.width / graphW;
    const scaleY = rect.height / graphH;
    const scale = Math.min(scaleX, scaleY, 1.2) * 0.85;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setTransform({
      x: rect.width / 2 - cx * scale,
      y: rect.height / 2 - cy * scale,
      scale,
    });
  }, [result?.subject.nodes]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform(t => {
      const newScale = Math.min(Math.max(t.scale * factor, 0.2), 3);
      return {
        x: mx - (mx - t.x) * (newScale / t.scale),
        y: my - (my - t.y) * (newScale / t.scale),
        scale: newScale,
      };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, [handleWheel]);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setTransform(t => ({
      ...t,
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    }));
  };
  const onPointerUp = () => setDragging(false);

  if (!result || result.subject.status !== 'ready') {
    return (
      <div className="p-8 text-center">
        <p className="text-3xl mb-3">🦊</p>
        <p className="font-body font-semibold text-base text-ink">Matéria não encontrada ou sem grafo.</p>
        <Link to="/home" className="font-body text-sm text-muted hover:text-ink mt-2 inline-block">← Voltar</Link>
      </div>
    );
  }

  const { course, subject } = result;
  const nodes = subject.nodes;
  const edges = subject.edges;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const getPrereqs = (nodeId: string) =>
    edges.filter(e => e.to === nodeId).map(e => nodeMap.get(e.from)?.title).filter(Boolean) as string[];

  const masteredCount = nodes.filter(n => n.mastery >= 0.7).length;
  const progressPct = nodes.length ? Math.round((masteredCount / nodes.length) * 100) : 0;

  // Tooltip position
  const hoveredNodeData = hoveredNode ? nodeMap.get(hoveredNode) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Graph header */}
      <div className="h-10 bg-paper border-b border-line px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to={`/course/${course.id}`} className="font-body text-xs text-muted hover:text-ink transition-fast">
            {course.name}
          </Link>
          <span className="text-muted text-xs">/</span>
          <span className="font-body font-semibold text-[13px] text-ink">{subject.name}</span>
          <div className="w-[60px] h-0.5 bg-line">
            <div className="h-full bg-lime" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="font-body text-[11px] text-muted">{progressPct}% dominado</span>
        </div>
        <span className="font-body text-[11px] text-muted">{nodes.length} conceitos</span>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ touchAction: 'none' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className={`${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            {/* Edges */}
            {edges.map((e, i) => {
              const src = nodeMap.get(e.from);
              const tgt = nodeMap.get(e.to);
              if (!src || !tgt) return null;
              const cx = (src.x + tgt.x) / 2;
              const cy = (src.y + tgt.y) / 2 - 30;
              return (
                <motion.path
                  key={`e-${i}`}
                  d={`M ${src.x},${src.y} Q ${cx},${cy} ${tgt.x},${tgt.y}`}
                  fill="none"
                  stroke="#D4CFC6"
                  strokeWidth={1.5}
                  style={{ pointerEvents: 'none' }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const style = getNodeStyle(node.mastery);
              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="cursor-pointer"
                  onPointerEnter={() => setHoveredNode(node.id)}
                  onPointerLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(node);
                  }}
                >
                  <rect
                    x={node.x - NODE_W / 2}
                    y={node.y - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={4}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={node.mastery > 0 && node.mastery < 0.7 ? 1.5 : 1}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill={style.textColor}
                    fontSize={9}
                    fontFamily="DM Sans, sans-serif"
                    className="pointer-events-none select-none"
                  >
                    {node.title.length > 14 ? node.title.slice(0, 13) + '…' : node.title}
                  </text>
                </motion.g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip (outside transformed group) */}
        <AnimatePresence>
          {hoveredNodeData && !selected && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute pointer-events-none bg-ink text-white font-body text-[11px] px-3 py-1.5 rounded shadow-lg max-w-[200px]"
              style={{
                left: hoveredNodeData.x * transform.scale + transform.x,
                top: hoveredNodeData.y * transform.scale + transform.y - 50,
                transform: 'translateX(-50%)',
              }}
            >
              <p className="font-semibold">{hoveredNodeData.title}</p>
              {hoveredNodeData.description && (
                <p className="text-[10px] text-white/70 mt-0.5 line-clamp-2">{hoveredNodeData.description}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ x: 280 }}
              animate={{ x: 0 }}
              exit={{ x: 280 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 right-0 w-[280px] h-full bg-white border-l border-line p-5 overflow-y-auto"
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-muted hover:text-ink transition-fast"
              >
                <X size={16} />
              </button>

              <p className="font-body font-semibold text-base text-ink">{selected.title}</p>
              <p className="font-body text-[11px] text-muted mt-0.5">Nível {selected.level}</p>

              {selected.description && (
                <>
                  <div className="h-px bg-line my-4" />
                  <span className="font-body text-[10px] text-muted uppercase tracking-widest">Descrição</span>
                  <p className="font-body text-[13px] text-ink mt-1">{selected.description}</p>
                </>
              )}

              {selected.intuition && (
                <>
                  <div className="h-px bg-line my-4" />
                  <span className="font-body text-[10px] text-muted uppercase tracking-widest">Intuição</span>
                  <p className="font-body text-[13px] text-ink mt-1">{selected.intuition}</p>
                </>
              )}

              {selected.formula && (
                <>
                  <div className="h-px bg-line my-4" />
                  <span className="font-body text-[10px] text-muted uppercase tracking-widest">Fórmula</span>
                  <p className="font-body text-[13px] text-ink mt-1 font-mono bg-paper px-2 py-1 rounded">{selected.formula}</p>
                </>
              )}

              <div className="h-px bg-line my-4" />

              <span className="font-body text-[10px] text-muted uppercase tracking-widest">Domínio</span>
              <p className="font-display font-bold text-[32px] text-ink mt-1">
                {Math.round(selected.mastery * 100)}%
              </p>
              <div className="w-full h-1 bg-line mt-1.5">
                <div
                  className="h-full"
                  style={{
                    width: `${selected.mastery * 100}%`,
                    backgroundColor:
                      selected.mastery < 0.4 ? '#D4CFC6' : selected.mastery < 0.7 ? '#111110' : '#BFFF00',
                  }}
                />
              </div>

              <div className="h-px bg-line my-4" />

              <span className="font-body text-[10px] text-muted uppercase tracking-widest">Pré-requisitos</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {getPrereqs(selected.id).map(p => (
                  <span key={p} className="font-body text-[11px] text-graphite border border-line px-2 py-1 rounded">
                    {p}
                  </span>
                ))}
                {getPrereqs(selected.id).length === 0 && (
                  <span className="font-body text-[11px] text-muted">Nenhum</span>
                )}
              </div>

              <button
                onClick={() => navigate(`/concept/${selected.id}`)}
                className="w-full bg-ink text-lime font-body font-semibold text-[13px] py-2.5 rounded-md mt-6 hover:bg-graphite transition-fast"
              >
                Estudar agora →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
