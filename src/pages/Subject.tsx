import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const nodes = [
  { id: '1', label: '1ª Lei Termo.', x: 150, y: 100, mastery: 0 },
  { id: '2', label: 'Fluidos', x: 380, y: 100, mastery: 0 },
  { id: '3', label: 'Mudança de Fase', x: 610, y: 100, mastery: 0 },
  { id: '4', label: 'Transf. Calor', x: 840, y: 100, mastery: 0 },
  { id: '5', label: 'Diagrama P-h', x: 250, y: 260, mastery: 0 },
  { id: '6', label: 'Ciclo Ideal', x: 500, y: 260, mastery: 0 },
  { id: '7', label: 'COP', x: 750, y: 260, mastery: 0.72 },
  { id: '8', label: 'Compressores', x: 160, y: 420, mastery: 0 },
  { id: '9', label: 'Condensadores', x: 380, y: 420, mastery: 0.35 },
  { id: '10', label: 'Evaporadores', x: 600, y: 420, mastery: 0 },
  { id: '11', label: 'Expansão', x: 820, y: 420, mastery: 0 },
  { id: '12', label: 'Ciclo Real', x: 310, y: 580, mastery: 0 },
  { id: '13', label: 'Carga Térmica', x: 580, y: 580, mastery: 0 },
  { id: '14', label: 'Subresfriamento', x: 800, y: 580, mastery: 0.88 },
  { id: '15', label: 'Dimensionamento', x: 450, y: 740, mastery: 0 },
];

const edges = [
  { s: '1', t: '5' }, { s: '2', t: '5' }, { s: '3', t: '5' },
  { s: '1', t: '6' }, { s: '5', t: '6' }, { s: '4', t: '6' },
  { s: '6', t: '7' }, { s: '6', t: '8' }, { s: '6', t: '9' },
  { s: '6', t: '10' }, { s: '6', t: '11' },
  { s: '8', t: '12' }, { s: '9', t: '12' },
  { s: '4', t: '13' }, { s: '6', t: '13' },
  { s: '12', t: '14' }, { s: '9', t: '14' },
  { s: '12', t: '15' }, { s: '13', t: '15' }, { s: '14', t: '15' },
];

function getNodeStyle(mastery: number) {
  if (mastery >= 0.9) return { fill: '#BFFF00', stroke: '#BFFF00', textColor: '#111110' };
  if (mastery >= 0.7) return { fill: '#111110', stroke: '#111110', textColor: '#BFFF00' };
  if (mastery > 0) return { fill: '#FAFAF8', stroke: '#111110', textColor: '#111110' };
  return { fill: '#FAFAF8', stroke: '#D4CFC6', textColor: '#7A7A78' };
}

function getPrereqs(nodeId: string) {
  return edges.filter(e => e.t === nodeId).map(e => {
    const n = nodes.find(n => n.id === e.s);
    return n?.label || '';
  });
}

export default function Subject() {
  const [selected, setSelected] = useState<typeof nodes[0] | null>(null);
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 860 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(v => {
      const nw = v.w * factor;
      const nh = v.h * factor;
      return { x: v.x - (nw - v.w) / 2, y: v.y - (nh - v.h) / 2, w: nw, h: nh };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (svg) svg.removeEventListener('wheel', handleWheel); };
  }, [handleWheel]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    setViewBox(v => ({
      ...v,
      x: dragStart.current.vx - (e.clientX - dragStart.current.x) * scaleX,
      y: dragStart.current.vy - (e.clientY - dragStart.current.y) * scaleY,
    }));
  };
  const onMouseUp = () => setDragging(false);

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Graph header */}
      <div className="h-10 bg-paper border-b border-line px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-body font-semibold text-[13px] text-ink">Refrigeração (RAC)</span>
          <div className="w-[60px] h-0.5 bg-line">
            <div className="h-full bg-lime" style={{ width: '18%' }} />
          </div>
          <span className="font-body text-[11px] text-muted">18% dominado</span>
        </div>
        <button className="font-body text-xs text-muted hover:underline transition-fast">
          Retomar →
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Edges */}
          {edges.map((e, i) => {
            const src = nodeMap[e.s];
            const tgt = nodeMap[e.t];
            if (!src || !tgt) return null;
            const cx = (src.x + tgt.x) / 2;
            const cy = (src.y + tgt.y) / 2 - 20;
            return (
              <motion.path
                key={`e-${i}`}
                d={`M ${src.x},${src.y} Q ${cx},${cy} ${tgt.x},${tgt.y}`}
                fill="none"
                stroke="#D4CFC6"
                strokeWidth={1.5}
                className="hover:stroke-ink transition-fast"
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
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(node);
                }}
              >
                <rect
                  x={node.x - 45}
                  y={node.y - 16}
                  width={90}
                  height={32}
                  rx={4}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={node.mastery > 0 && node.mastery < 0.7 ? 1.5 : 1}
                  className="hover:scale-105 transition-fast"
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fill={style.textColor}
                  className="font-body text-[9px] pointer-events-none select-none"
                  fontSize={9}
                  fontFamily="DM Sans, sans-serif"
                >
                  {node.label}
                </text>
              </motion.g>
            );
          })}
        </svg>

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

              <p className="font-body font-semibold text-base text-ink">{selected.label}</p>
              <p className="font-body text-[11px] text-muted mt-0.5">Nível 2</p>

              <div className="mt-4">
                <span className="font-body text-[10px] text-muted uppercase tracking-wide">Domínio</span>
                <div className="w-full h-1.5 bg-line mt-1.5 rounded-none">
                  <div
                    className="h-full"
                    style={{
                      width: `${selected.mastery * 100}%`,
                      backgroundColor:
                        selected.mastery < 0.4 ? '#E2DDD6' : selected.mastery < 0.7 ? '#111110' : '#BFFF00',
                    }}
                  />
                </div>
                <p className="font-display font-bold text-[28px] text-ink mt-1">
                  {Math.round(selected.mastery * 100)}%
                </p>
              </div>

              <div className="mt-4">
                <span className="font-body text-[10px] text-muted uppercase tracking-wide">Pré-requisitos</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {getPrereqs(selected.id).map(p => (
                    <span key={p} className="font-body text-xs border border-line px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                  {getPrereqs(selected.id).length === 0 && (
                    <span className="font-body text-xs text-muted">Nenhum</span>
                  )}
                </div>
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
