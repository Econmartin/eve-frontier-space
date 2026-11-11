/** Shared React Flow canvas and graph builders for the industry pages. */
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Background, Controls, Handle, Position, ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge, type Node, type NodeProps, type NodeTypes,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import {
  fmtQty, builtInSpace, defaultRecipeFor, facilityKind, facilityLive, facilityName, fmtTime, isBaseInput, itemName, itemOf, producedBy, recipeAvailable, usedIn, type Recipe,
} from '@/lib/industry';
import { ItemIcon, useIndustrySettings } from '../parts';

type ItemData = { id: number; root: boolean; base: boolean; sub?: string; vertical?: boolean };
type RecipeData = { recipe: Recipe };
type FacilityData = { id: number };
type GroupData = { label: string; count: number };
export type GNode = Node<ItemData, 'item'> | Node<RecipeData, 'recipe'> | Node<FacilityData, 'facility'> | Node<GroupData, 'category'>;

/** facilities for a recipe as shown on pills: respects the toggle, available first, deduped by name */
function pillFacilities(r: Recipe, showUnavailable: boolean) {
  return [...new Set(r.facilities.map((f) => f.id).filter((id) => showUnavailable || facilityLive(id)).sort((a, b) => Number(facilityLive(b)) - Number(facilityLive(a))).map((id) => facilityName(id)))];
}

function ItemNode({ data }: NodeProps<Node<ItemData, 'item'>>) {
  const it = itemOf(data.id);
  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl bg-card ring-1 px-3 py-2 min-w-[180px] max-w-[240px] shadow-sm', data.root ? 'ring-[var(--color-martian-500)] ring-2' : data.base ? 'ring-foreground/10' : 'ring-foreground/15')}>
      <Handle type="target" position={data.vertical ? Position.Top : Position.Left} className="!bg-foreground/30 !border-0 !w-1.5 !h-1.5" />
      <ItemIcon id={data.id} size={34} className="rounded-lg" />
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight truncate">{it.name}</div>
        <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground truncate">{data.sub ?? (data.base ? 'raw material' : it.group)}</div>
      </div>
      <Handle type="source" position={data.vertical ? Position.Bottom : Position.Right} className="!bg-foreground/30 !border-0 !w-1.5 !h-1.5" />
    </div>
  );
}
function RecipeNode({ data }: NodeProps<Node<RecipeData, 'recipe'>>) {
  const r = data.recipe;
  const { showUnavailable } = useIndustrySettings();
  const facs = pillFacilities(r, showUnavailable);
  const lead = builtInSpace(r) ? 'Build Mode' : facs[0] ?? 'unassigned';
  const title = `${builtInSpace(r) ? 'Build Mode' : facs.length ? `Runs on: ${facs.join(', ')}` : 'No facility in game'} · ${fmtTime(r.time)} per run · ${r.inputs.map((i) => `${i.qty} ${itemName(i.id)}`).join(', ')} → ${r.outputs.map((o) => `${o.qty} ${itemName(o.id)}`).join(', ')}`;
  return (
    <div title={title} className={cn('rounded-full px-3 py-1.5 text-[0.65rem] leading-tight ring-1 shadow-sm text-center',
      builtInSpace(r) ? 'bg-[var(--color-ocean-500)] text-white ring-transparent' : !facs.length ? 'bg-muted text-muted-foreground ring-foreground/10' : recipeAvailable(r) ? 'bg-[var(--color-martian-500)] text-black ring-transparent' : 'bg-muted text-muted-foreground ring-foreground/10 line-through')}>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-1 !h-1" />
      <div className="font-semibold tracking-wide uppercase">{lead}{facs.length > 1 ? ` +${facs.length - 1}` : ''}</div>
      <div className="opacity-80">{fmtTime(r.time)}</div>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-1 !h-1" />
    </div>
  );
}
function FacilityNode({ data }: NodeProps<Node<FacilityData, 'facility'>>) {
  const kind = facilityKind(data.id);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-martian-500)] text-black px-4 py-3 min-w-[200px] shadow-md">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-1 !h-1" />
      <ItemIcon id={data.id} size={44} className="rounded-lg" />
      <div className="min-w-0">
        <div className="font-heading leading-tight">{facilityName(data.id)}</div>
        <div className="text-[0.6rem] uppercase tracking-wider opacity-70">{kind === 'shipModule' ? 'ship module' : 'structure'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-1 !h-1" />
    </div>
  );
}
// not called 'group': React Flow styles its own built-in group nodes, which drew a second box behind this one
function GroupNode({ data }: NodeProps<Node<GroupData, 'category'>>) {
  return (
    <div className="rounded-lg bg-muted text-foreground px-3 py-2 w-[220px] text-left ring-1 ring-foreground/10">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-1 !h-1" />
      <div className="text-[0.65rem] tracking-[0.16em] uppercase leading-tight">{data.label}</div>
      <div className="text-[0.6rem] text-muted-foreground">{data.count} product{data.count === 1 ? '' : 's'}</div>
      <Handle id="b" type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-1 !h-1" />
      <Handle id="r" type="source" position={Position.Right} className="!bg-transparent !border-0 !w-1 !h-1" />
    </div>
  );
}
const nodeTypes: NodeTypes = { item: ItemNode, recipe: RecipeNode, facility: FacilityNode, category: GroupNode };

const EDGE_LABEL = {
  labelStyle: { fill: 'var(--foreground)', fontSize: 11, fontWeight: 600 },
  labelBgStyle: { fill: 'var(--card)', stroke: 'color-mix(in oklab, var(--foreground) 15%, transparent)' },
  labelBgPadding: [5, 3] as [number, number],
  labelBgBorderRadius: 6,
};
const IN_STYLE = { stroke: 'var(--muted-foreground)', opacity: 0.7 };
const OUT_STYLE = { stroke: 'var(--color-martian-500)' };

export type Mode = 'up' | 'down' | 'both';
export interface GraphOptions {
  mode: Mode; depth: number; showUnavailable: boolean;
  /** collapse recipe pills: draw item → item edges labelled with the facility */
  productsOnly?: boolean;
  /** consumers followed per item when walking downstream */
  perItem?: number;
}

function layout(nodes: GNode[], edges: Edge[], opts: { rankdir?: 'LR' | 'TB'; nodesep?: number; ranksep?: number } = {}) {
  const g = new dagre.graphlib.Graph(); g.setDefaultEdgeLabel(() => ({})); g.setGraph({ rankdir: opts.rankdir ?? 'LR', nodesep: opts.nodesep ?? 24, ranksep: opts.ranksep ?? 110, marginx: 20, marginy: 20 });
  for (const n of nodes) g.setNode(n.id, n.type === 'recipe' ? { width: 120, height: 40 } : n.type === 'facility' ? { width: 240, height: 70 } : n.type === 'category' ? { width: 220, height: 36 } : { width: 230, height: 56 });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  for (const n of nodes) { const p = g.node(n.id); n.position = { x: p.x - p.width / 2, y: p.y - p.height / 2 }; }
  return { nodes, edges };
}

/**
 * Item-centred graph. Upstream: all recipes for the root, then the default recipe for each input to `depth`.
 * Downstream: recipes that consume the item, then recipes that consume their outputs, to `depth`;
 * only the edge from the item being followed is drawn so the tree stays readable.
 */
export function buildItemGraph(root: number, o: GraphOptions) {
  const vis = (rs: Recipe[]) => (o.showUnavailable ? rs : rs.filter(recipeAvailable));
  const perItem = o.perItem ?? 12;
  const nodes = new Map<string, GNode>(); const edges: Edge[] = []; const edgeIds = new Set<string>();
  const addItem = (id: number, isRoot = false) => { const k = `i${id}`; if (!nodes.has(k)) nodes.set(k, { id: k, type: 'item', position: { x: 0, y: 0 }, className: 'cursor-pointer!', data: { id, root: isRoot, base: isBaseInput(id) } }); return k; };
  const addEdge = (e: Edge) => { if (!edgeIds.has(e.id)) { edgeIds.add(e.id); edges.push(e); } };
  const addRecipe = (r: Recipe, inputFilter?: (id: number) => boolean) => {
    if (o.productsOnly) {
      const fac = builtInSpace(r) ? 'Build Mode' : pillFacilities(r, o.showUnavailable)[0] ?? 'unassigned';
      for (const i of r.inputs) if (!inputFilter || inputFilter(i.id)) for (const out of r.outputs) if (out.id !== i.id)
        addEdge({ id: `${i.id}>${out.id}@${r.id}`, source: addItem(i.id), target: addItem(out.id), label: `${fmtQty(i.qty, i.id)} → ${fmtQty(out.qty, out.id)} · ${fac}`, ...EDGE_LABEL, labelStyle: { ...EDGE_LABEL.labelStyle, fontSize: 10 }, style: OUT_STYLE, animated: out.id === root || i.id === root });
      return;
    }
    const k = `r${r.id}`;
    if (!nodes.has(k)) nodes.set(k, { id: k, type: 'recipe', position: { x: 0, y: 0 }, className: 'cursor-default!', data: { recipe: r } });
    for (const i of r.inputs) if (!inputFilter || inputFilter(i.id)) addEdge({ id: `${k}<${i.id}`, source: addItem(i.id), target: k, label: fmtQty(i.qty, i.id), ...EDGE_LABEL, style: IN_STYLE });
    for (const out of r.outputs) addEdge({ id: `${k}>${out.id}`, source: k, target: addItem(out.id), label: fmtQty(out.qty, out.id), ...EDGE_LABEL, style: OUT_STYLE, animated: out.id === root });
  };
  addItem(root, true);
  const seenUp = new Set<number>();
  const expandUp = (id: number, d: number, all: boolean) => {
    const pool = vis(producedBy.get(id) ?? []);
    const rs = all ? pool : [defaultRecipeFor(id, pool)].filter((r): r is Recipe => !!r);
    for (const r of rs) { const key = r.id * 1_000_003 + id; if (seenUp.has(key)) continue; seenUp.add(key); addRecipe(r); if (d > 1) for (const i of r.inputs) expandUp(i.id, d - 1, false); }
  };
  const seenDown = new Set<number>();
  const expandDown = (id: number, d: number) => {
    if (seenDown.has(id)) return; seenDown.add(id);
    for (const r of vis(usedIn.get(id) ?? []).slice(0, perItem)) {
      addRecipe(r, (iid) => iid === id);
      if (d > 1) for (const out of r.outputs) if (out.id !== id) expandDown(out.id, d - 1);
    }
  };
  if (o.mode !== 'down') expandUp(root, o.depth, true);
  if (o.mode !== 'up') expandDown(root, o.depth);
  return layout([...nodes.values()], edges, o.productsOnly ? { nodesep: 30, ranksep: 260 } : { nodesep: 26, ranksep: 120 });
}

/**
 * Facility-centred graph, read top to bottom: the building, then a spine of item groups down the left,
 * each group's products in rows to the right (five per row). With `withInputs`, dagre lays out a top-down tree instead.
 */
export function buildFacilityGraph(facilityId: number, showUnavailable: boolean, withInputs: boolean) {
  const nodes = new Map<string, GNode>(); const edges: Edge[] = [];
  nodes.set('f', { id: 'f', type: 'facility', position: { x: 0, y: 0 }, className: 'cursor-default!', data: { id: facilityId } });
  const addItem = (id: number, sub?: string, vertical = false) => { const k = `i${id}`; if (!nodes.has(k)) nodes.set(k, { id: k, type: 'item', position: { x: 0, y: 0 }, className: 'cursor-pointer!', data: { id, root: false, base: isBaseInput(id), sub, vertical } }); return k; };
  const all = [...new Set([...producedBy.values()].flat())].filter((r) => (showUnavailable || recipeAvailable(r)) && r.facilities.some((f) => f.id === facilityId));
  const products = new Map<number, { r: Recipe; from?: number }>();
  for (const r of all) {
    const breakdown = r.inputs.some((i) => i.id === r.product);
    if (breakdown) { for (const o of r.outputs) if (o.id !== r.product && !products.has(o.id)) products.set(o.id, { r, from: r.inputs[0].id }); }
    else if (!products.has(r.product)) products.set(r.product, { r });
  }
  const groups = new Map<string, number[]>();
  for (const [pid] of products) { const gname = itemOf(pid).group; groups.set(gname, [...(groups.get(gname) ?? []), pid]); }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const sub = (p: { r: Recipe; from?: number }) => `${fmtTime(p.r.time)}${p.from ? ` · from ${itemName(p.from)}` : ''}`;

  if (withInputs) {
    for (const [pid, p] of products) {
      const k = addItem(pid, sub(p), true);
      edges.push({ id: `f>${pid}`, source: 'f', target: k, style: OUT_STYLE });
      for (const i of p.r.inputs) if (i.id !== pid) edges.push({ id: `${i.id}>${pid}@${p.r.id}`, source: addItem(i.id, undefined, true), target: k, label: fmtQty(i.qty, i.id), ...EDGE_LABEL, style: IN_STYLE });
    }
    return layout([...nodes.values()], edges, { rankdir: 'TB', nodesep: 24, ranksep: 90 });
  }

  const PER_ROW = 5, COL = 250, ROW = 70, X0 = 270, GAP = 28;
  let y = 110; let prev = 'f'; let prevHandle: string | undefined;
  ordered.forEach(([label, ids], gi) => {
    ids.sort((a, b) => itemName(a).localeCompare(itemName(b)));
    const gk = `g${gi}`;
    nodes.set(gk, { id: gk, type: 'category', position: { x: 0, y }, className: 'cursor-default!', data: { label: label.replace(' Regoliths', ''), count: ids.length } });
    edges.push({ id: `${prev}>${gk}`, source: prev, sourceHandle: prevHandle, target: gk, type: 'straight', style: OUT_STYLE });
    ids.forEach((pid, i) => {
      const k = addItem(pid, sub(products.get(pid)!));
      nodes.get(k)!.position = { x: X0 + (i % PER_ROW) * COL, y: y + Math.floor(i / PER_ROW) * ROW };
      // one line per row, into its first product: lines to the rest ran along the row on top of each other
      if (i % PER_ROW === 0) edges.push({ id: `${gk}>${pid}`, source: gk, sourceHandle: 'r', target: k, type: 'smoothstep', style: IN_STYLE });
    });
    y += Math.ceil(ids.length / PER_ROW) * ROW + GAP; prev = gk; prevHandle = 'b';
  });
  return { nodes: [...nodes.values()], edges };
}

function Canvas({ nodes, edges, onItem }: { nodes: GNode[]; edges: Edge[]; onItem?: (id: number) => void }) {
  const navigate = useNavigate();
  const { fitView } = useReactFlow();
  useEffect(() => { const t = setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 30); return () => clearTimeout(t); }, [nodes, fitView]);
  const onNodeClick = useCallback((_: unknown, n: Node) => { if (n.type === 'item') (onItem ?? ((id: number) => navigate(`/industry/item/${id}`)))((n.data as ItemData).id); }, [navigate, onItem]);
  const onNodeDoubleClick = useCallback((_: unknown, n: Node) => { if (n.type === 'item') navigate(`/industry/item/${(n.data as ItemData).id}`); }, [navigate]);
  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} onNodeDoubleClick={onNodeDoubleClick}
      nodesDraggable nodesConnectable={false} elementsSelectable={false} minZoom={0.2} maxZoom={2} fitView>
      <Background gap={24} size={1} color="color-mix(in oklab, var(--foreground) 12%, transparent)" />
      <Controls showInteractive={false} className="!bg-card !text-foreground !shadow-md [&>button]:!bg-card [&>button]:!border-foreground/10 [&>button]:!fill-foreground" />
    </ReactFlow>
  );
}

/** Same frame as GraphPanel with no graph in it, so picking the first item moves nothing on the page. */
export function GraphPlaceholder({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl ring-1 ring-foreground/10 bg-background flex items-center justify-center p-6 text-sm text-muted-foreground font-sans overflow-auto', className ?? 'h-[60dvh] min-h-[420px]')}>
      <div className="max-w-xl">{children}</div>
    </div>
  );
}

/** Drop-in graph panel. `build` runs inside useMemo keyed on `deps`. */
export function GraphPanel({ build, deps, onItem, className, note }: { build: () => { nodes: GNode[]; edges: Edge[] }; deps: unknown[]; onItem?: (id: number) => void; className?: string; note?: string }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(build, deps);
  return (
    <div>
      <div className={cn('rounded-2xl overflow-hidden ring-1 ring-foreground/10 bg-background', className ?? 'h-[60dvh] min-h-[420px]')}>
        <ReactFlowProvider><Canvas nodes={g.nodes} edges={g.edges} onItem={onItem} /></ReactFlowProvider>
      </div>
      {note && <p className="text-xs text-muted-foreground font-sans mt-2">{note}</p>}
    </div>
  );
}
