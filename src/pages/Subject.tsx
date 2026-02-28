import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { X, BookOpen, Lightbulb, Sigma, Target, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import FormulaRenderer from '@/components/FormulaRenderer';
import type { GraphNode, GraphEdge } from '@/types/course';

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Dagre from '@dagrejs/dagre';

// ═══════════════════════════════════════════════════════
// DAGRE LAYOUT
// ═══════════════════════════════════════════════════════

const NODE_WIDTH = 160;
const NODE_HEIGHT = 160;

function getLayoutedElements(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
  unlockedSet: Set<string>,
) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

  graphNodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  graphEdges.forEach((e) => {
    g.setEdge(e.from, e.to);
  });

  Dagre.layout(g);

  const nodes: Node[] = graphNodes.map((n) => {
    const pos = g.node(n.id);
    const unlocked = unlockedSet.has(n.id);
    return {
      id: n.id,
      type: 'concept',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { ...n, unlocked },
    };
  });

  const edges: Edge[] = graphEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    animated: true,
    style: {
      stroke: e.strength >= 0.7 ? '#111110' : e.strength >= 0.4 ? '#7A7A78' : '#D4CFC6',
      strokeWidth: 1.5,
    },
  }));

  return { nodes, edges };
}

// ═══════════════════════════════════════════════════════
// CUSTOM NODE
// ═══════════════════════════════════════════════════════

function getMasteryColor(mastery: number) {
  if (mastery >= 0.7) return '#BFFF00';
  if (mastery > 0) return '#F59E0B'; // amber
  return '#D4CFC6'; // gray
}

function ConceptNode({ data }: NodeProps) {
  const node = data as unknown as GraphNode & { unlocked: boolean };
  const mastery = node.mastery;
  const unlocked = node.unlocked;
  const isReady = unlocked && mastery === 0;

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - circumference * mastery;
  const ringColor = getMasteryColor(mastery);

  return (
    <div
      className={`flex flex-col items-center justify-center transition-opacity duration-200 ${
        !unlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      title={node.title}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />

      <div className="relative flex items-center justify-center">
        {/* Mastery ring */}
        <svg width={120} height={120} className="absolute">
          {/* Background ring */}
          <circle
            cx={60} cy={60} r={radius}
            fill="none"
            stroke="#E2DDD6"
            strokeWidth={4}
          />
          {/* Mastery arc */}
          {mastery > 0 && (
            <circle
              cx={60} cy={60} r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={4}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              className="transition-all duration-500"
            />
          )}
          {/* Pulsing border when ready */}
          {isReady && (
            <circle
              cx={60} cy={60} r={radius + 4}
              fill="none"
              stroke="#BFFF00"
              strokeWidth={2}
              opacity={0.6}
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Inner circle */}
        <div
          className="w-[104px] h-[104px] rounded-full flex items-center justify-center bg-card border border-border z-10"
        >
          <span
            className="font-body text-[11px] font-semibold text-center leading-tight text-foreground line-clamp-3"
            style={{ wordBreak: 'break-word', padding: '8px', maxWidth: '100px' }}
          >
            {node.title}
          </span>
        </div>
      </div>

      {/* Badge */}
      {isReady && (
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
          Pronto
        </span>
      )}

      {/* Mastery % */}
      {mastery > 0 && (
        <span className="mt-1 text-[10px] font-semibold text-muted-foreground">
          {Math.round(mastery * 100)}%
        </span>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  );
}

const nodeTypes = { concept: ConceptNode };

// ═══════════════════════════════════════════════════════
// MINIMAP COLOR
// ═══════════════════════════════════════════════════════

function minimapNodeColor(node: Node) {
  const mastery = (node.data as any)?.mastery ?? 0;
  const unlocked = (node.data as any)?.unlocked ?? false;
  if (!unlocked) return '#D4CFC6';
  if (mastery >= 0.7) return '#BFFF00';
  if (mastery > 0) return '#F59E0B';
  return '#E2DDD6';
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function Subject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSubject, getPrerequisites, courses } = useApp();

  const result = getSubject(id || '');
  const [selected, setSelected] = useState<GraphNode | null>(null);

  // Build unlocked set
  const unlockedSet = useMemo(() => {
    if (!result) return new Set<string>();
    const { subject } = result;
    const set = new Set<string>();
    for (const node of subject.nodes) {
      const prereqEdges = subject.edges.filter((e) => e.to === node.id);
      if (prereqEdges.length === 0) {
        set.add(node.id);
        continue;
      }
      const allMet = prereqEdges.every((e) => {
        const prereq = subject.nodes.find((n) => n.id === e.from);
        return prereq && prereq.mastery >= 0.5;
      });
      if (allMet) set.add(node.id);
    }
    return set;
  }, [result]);

  // Layouted elements
  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!result) return { layoutNodes: [], layoutEdges: [] };
    const { nodes, edges } = getLayoutedElements(result.subject.nodes, result.subject.edges, unlockedSet);
    return { layoutNodes: nodes, layoutEdges: edges };
  }, [result, unlockedSet]);

  const [rfNodes, , onNodesChange] = useNodesState(layoutNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(layoutEdges);

  const onNodeClick = useCallback((_: any, node: Node) => {
    const d = node.data as unknown as GraphNode & { unlocked: boolean };
    if (!d.unlocked) return;
    setSelected(d as GraphNode);
  }, []);

  if (!result || result.subject.status !== 'ready') {
    return (
      <div className="p-8 text-center">
        <p className="text-3xl mb-3">🦊</p>
        <p className="font-body font-semibold text-base text-foreground">Matéria não encontrada ou sem grafo.</p>
        <Link to="/home" className="font-body text-sm text-muted-foreground hover:text-foreground mt-2 inline-block">← Voltar</Link>
      </div>
    );
  }

  const { course, subject } = result;
  const nodes = subject.nodes;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const getPrereqs = (nodeId: string) =>
    subject.edges.filter((e) => e.to === nodeId).map((e) => nodeMap.get(e.from)?.title).filter(Boolean) as string[];

  const masteredCount = nodes.filter((n) => n.mastery >= 0.7).length;
  const progressPct = nodes.length ? Math.round((masteredCount / nodes.length) * 100) : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="h-12 bg-background border-b border-border px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to={`/course/${course.id}`} className="font-body text-xs text-muted-foreground hover:text-foreground transition-fast">
            {course.name}
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="font-body font-semibold text-[13px] text-foreground">{subject.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[100px] h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="font-body text-[11px] text-muted-foreground">{masteredCount} de {nodes.length} dominados</span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#E2DDD6" gap={20} size={1} />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            nodeColor={minimapNodeColor}
            maskColor="rgba(245, 242, 236, 0.7)"
            style={{ border: '1px solid #E2DDD6' }}
          />
        </ReactFlow>

        {/* Side Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 right-0 w-[320px] h-full bg-card border-l border-border p-5 overflow-y-auto z-50"
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-fast"
              >
                <X size={16} />
              </button>

              <p className="font-body font-semibold text-base text-foreground pr-6">{selected.title}</p>
              <p className="font-body text-[11px] text-muted-foreground mt-0.5">Nível {selected.level}</p>

              {selected.description && (
                <>
                  <div className="h-px bg-border my-4" />
                  <div className="flex items-center gap-1.5 mb-1">
                    <BookOpen size={12} className="text-muted-foreground" />
                    <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Descrição</span>
                  </div>
                  <p className="font-body text-[13px] text-foreground">{selected.description}</p>
                </>
              )}

              {selected.intuition && (
                <>
                  <div className="h-px bg-border my-4" />
                  <div className="flex items-center gap-1.5 mb-1">
                    <Lightbulb size={12} className="text-muted-foreground" />
                    <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Intuição</span>
                  </div>
                  <p className="font-body text-[13px] text-foreground">{selected.intuition}</p>
                </>
              )}

              {(selected.formula_latex || selected.formula) && (
                <>
                  <div className="h-px bg-border my-4" />
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sigma size={12} className="text-muted-foreground" />
                    <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Fórmula</span>
                  </div>
                  <div className="bg-foreground px-3 py-2 rounded-md overflow-x-auto">
                    <FormulaRenderer
                      formula={selected.formula_latex || selected.formula!}
                      className="text-accent"
                    />
                  </div>
                </>
              )}

              {selected.variables && selected.variables.length > 0 && (
                <>
                  <div className="h-px bg-border my-4" />
                  <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Variáveis</span>
                  <div className="mt-2 space-y-1.5">
                    {selected.variables.map((v, i) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-accent bg-foreground px-1.5 py-0.5 rounded">{v.symbol}</span>
                        <span className="font-body text-[12px] text-foreground">{v.meaning}</span>
                        <span className="font-body text-[11px] text-muted-foreground ml-auto">[{v.unit}]</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selected.keyPoints && selected.keyPoints.length > 0 && (
                <>
                  <div className="h-px bg-border my-4" />
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target size={12} className="text-muted-foreground" />
                    <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Pontos-chave</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {selected.keyPoints.map((kp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-accent text-xs mt-0.5 shrink-0">▸</span>
                        <span className="font-body text-[12px] text-foreground">{kp}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {selected.commonMistakes && selected.commonMistakes.length > 0 && (
                <>
                  <div className="h-px bg-border my-4" />
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} className="text-muted-foreground" />
                    <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Erros comuns</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {selected.commonMistakes.map((cm, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-destructive text-xs mt-0.5 shrink-0">✗</span>
                        <span className="font-body text-[12px] text-foreground">{cm}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="h-px bg-border my-4" />

              <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Domínio</span>
              <p className="font-display font-bold text-[32px] text-foreground mt-1">
                {Math.round(selected.mastery * 100)}%
              </p>
              <div className="w-full h-1 bg-border mt-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${selected.mastery * 100}%`,
                    backgroundColor:
                      selected.mastery < 0.4 ? '#D4CFC6' : selected.mastery < 0.7 ? '#111110' : '#BFFF00',
                  }}
                />
              </div>

              <div className="h-px bg-border my-4" />

              <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Pré-requisitos</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {getPrereqs(selected.id).map((p) => (
                  <span key={p} className="font-body text-[11px] text-muted-foreground border border-border px-2 py-1 rounded">
                    {p}
                  </span>
                ))}
                {getPrereqs(selected.id).length === 0 && (
                  <span className="font-body text-[11px] text-muted-foreground">Nenhum</span>
                )}
              </div>

              <button
                onClick={() => navigate(`/concept/${selected.id}`)}
                className="w-full bg-accent text-accent-foreground font-display font-bold text-[13px] tracking-wide py-3 rounded-md mt-6 hover:brightness-95 transition-all duration-[120ms] shadow-[0_0_16px_rgba(191,255,0,0.3)]"
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
