"use client";

import { ArrowUpRight, Circle, DoorOpen, Eraser, Eye, EyeOff, Hand, MousePointerClick, Pencil, Ruler, Type, Wand2, Square as WallIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useHub } from "@/components/providers/hub-provider";
import type { MapDrawing, MapState, MapTemplate, MapWall } from "@/lib/dnd/types";
import { useBoardPatch, useDraw, useMoveToken, usePing } from "@/lib/queries";
import { initials, cn } from "@/lib/utils";

export type MapTool = "move" | "ruler" | "ping" | "draw" | "arrow" | "text" | "reveal" | "hide" | "wall" | "door" | "erase" | "template";
export type TemplateShape = "circle" | "cone" | "line";

export const MAP_TOOLS: { id: MapTool; label: string; icon: typeof Hand; dmOnly: boolean }[] = [
  { id: "move", label: "Двигать", icon: Hand, dmOnly: false },
  { id: "ruler", label: "Линейка", icon: Ruler, dmOnly: false },
  { id: "ping", label: "Указка", icon: MousePointerClick, dmOnly: false },
  { id: "draw", label: "Рисовать", icon: Pencil, dmOnly: false },
  { id: "arrow", label: "Стрелка", icon: ArrowUpRight, dmOnly: false },
  { id: "text", label: "Пометка", icon: Type, dmOnly: false },
  { id: "reveal", label: "Открыть туман", icon: Eye, dmOnly: true },
  { id: "hide", label: "Скрыть", icon: EyeOff, dmOnly: true },
  { id: "wall", label: "Стена", icon: WallIcon, dmOnly: true },
  { id: "door", label: "Дверь", icon: DoorOpen, dmOnly: true },
  { id: "template", label: "Зона", icon: Wand2, dmOnly: true },
  { id: "erase", label: "Ластик", icon: Eraser, dmOnly: true },
];

type Props = {
  readOnly?: boolean; tool?: MapTool; brush?: number; templateRadius?: number; templateShape?: TemplateShape;
  drawColor?: string; selectedTokenId?: string | null; onSelectToken?: (id: string | null) => void;
};

function intersects(ax: number, ay: number, bx: number, by: number, w: MapWall) {
  const d = (bx - ax) * (w.y2 - w.y1) - (by - ay) * (w.x2 - w.x1);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((w.x1 - ax) * (w.y2 - w.y1) - (w.y1 - ay) * (w.x2 - w.x1)) / d;
  const u = ((w.x1 - ax) * (by - ay) - (w.y1 - ay) * (bx - ax)) / d;
  return t > 0.001 && t < 0.999 && u >= 0 && u <= 1;
}
const segDist = (px: number, py: number, w: { x1: number; y1: number; x2: number; y2: number }) => {
  const dx = w.x2 - w.x1; const dy = w.y2 - w.y1;
  const t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (w.x1 + t * dx), py - (w.y1 + t * dy));
};

function templatePath(t: MapTemplate, feetPerCell: number) {
  const length = t.radiusFeet / feetPerCell;
  const angle = ((t.angle ?? 0) * Math.PI) / 180;
  if (t.shape === "cone") {
    const half = Math.atan(0.5);
    const p1 = [t.x + Math.cos(angle - half) * length / Math.cos(half), t.y + Math.sin(angle - half) * length / Math.cos(half)];
    const p2 = [t.x + Math.cos(angle + half) * length / Math.cos(half), t.y + Math.sin(angle + half) * length / Math.cos(half)];
    return `M${t.x},${t.y} L${p1[0]},${p1[1]} L${p2[0]},${p2[1]} Z`;
  }
  if (t.shape === "line") {
    const w = 0.5; const nx = -Math.sin(angle) * w; const ny = Math.cos(angle) * w;
    const ex = t.x + Math.cos(angle) * length; const ey = t.y + Math.sin(angle) * length;
    return `M${t.x + nx},${t.y + ny} L${ex + nx},${ey + ny} L${ex - nx},${ey - ny} L${t.x - nx},${t.y - ny} Z`;
  }
  return "";
}

export function MapBoard({ readOnly = false, tool = "move", brush = 1, templateRadius = 20, templateShape = "circle", drawColor = "#D4AF37", selectedTokenId = null, onSelectToken }: Props) {
  const { snapshot, campaign, isDm, actor } = useHub();
  const boardPatch = useBoardPatch();
  const moveToken = useMoveToken();
  const ping = usePing();
  const draw = useDraw();
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [paint, setPaint] = useState<Set<string> | null>(null);
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [stroke, setStroke] = useState<number[] | null>(null);
  const [, setTick] = useState(0);

  const map = snapshot?.board?.map;
  const scene = snapshot?.board?.scene;
  const encounter = snapshot?.encounter?.state;
  const ownIds = useMemo(() => new Set((snapshot?.characters ?? []).filter((character) => character.ownerId === actor?.id).map((character) => character.id)), [snapshot?.characters, actor?.id]);

  const pingActive = scene?.ping && Date.now() - new Date(scene.ping.at).getTime() < 5000 ? scene.ping : null;
  useEffect(() => { if (!pingActive) return; const timer = window.setTimeout(() => setTick((value) => value + 1), 5100); return () => window.clearTimeout(timer); }, [pingActive]);

  const visible = useMemo(() => {
    if (!map?.lighting) return null;
    const walls = (map.walls ?? []).filter((wall) => !(wall.door && wall.open));
    const blocked = (ax: number, ay: number, bx: number, by: number) => walls.some((wall) => intersects(ax, ay, bx, by, wall));
    const center = (token: { x: number; y: number; size: number }) => [token.x + token.size / 2, token.y + token.size / 2];
    const lights = map.tokens.filter((token) => (token.light ?? 0) > 0);
    const viewers = isDm ? map.tokens.filter((token) => token.kind === "character") : map.tokens.filter((token) => token.characterId && ownIds.has(token.characterId));
    const set = new Set<string>();
    for (let y = 0; y < map.rows; y += 1) for (let x = 0; x < map.cols; x += 1) {
      const cx = x + 0.5; const cy = y + 0.5;
      const lit = lights.some((light) => { const [lx, ly] = center(light); return Math.hypot(lx - cx, ly - cy) <= (light.light ?? 0) / map.feetPerCell + 0.5 && !blocked(lx, ly, cx, cy); });
      const seen = viewers.some((viewer) => {
        const [vx, vy] = center(viewer);
        if (blocked(vx, vy, cx, cy)) return false;
        return lit || Math.hypot(vx - cx, vy - cy) <= (viewer.darkvision ?? 0) / map.feetPerCell + 0.5 || Math.hypot(vx - cx, vy - cy) < 1;
      });
      if (seen) set.add(`${x}:${y}`);
    }
    return set;
  }, [map, isDm, ownIds]);

  if (!map || !campaign) return null;
  const revealed = paint ?? new Set(map.revealed);
  const walls = map.walls ?? [];
  const drawings = map.drawings ?? [];

  const exact = (event: ReactPointerEvent | React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((event.clientX - rect.left) / rect.width) * map.cols, y: ((event.clientY - rect.top) / rect.height) * map.rows };
  };
  const cellOf = (point: { x: number; y: number }) => ({ x: Math.max(0, Math.min(map.cols - 1, Math.floor(point.x))), y: Math.max(0, Math.min(map.rows - 1, Math.floor(point.y))) });
  const snap = (point: { x: number; y: number }) => ({ x: Math.round(point.x), y: Math.round(point.y) });
  const commitMap = (next: MapState) => boardPatch.mutate({ campaignId: campaign.id, patch: { map: next } });
  const paintCells = (set: Set<string>, cx: number, cy: number) => {
    const half = Math.floor(brush / 2);
    for (let dx = -half; dx < brush - half; dx += 1) for (let dy = -half; dy < brush - half; dy += 1) {
      const x = cx + dx; const y = cy + dy;
      if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
      if (tool === "reveal") set.add(`${x}:${y}`); else set.delete(`${x}:${y}`);
    }
    return set;
  };
  const canEdit = !readOnly;

  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    const point = exact(event);
    const capture = () => event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "ruler" || tool === "arrow" || (isDm && (tool === "wall" || tool === "template"))) {
      const start = tool === "wall" ? snap(point) : tool === "template" ? { x: Math.floor(point.x) + 0.5, y: Math.floor(point.y) + 0.5 } : tool === "ruler" ? { x: Math.floor(point.x) + 0.5, y: Math.floor(point.y) + 0.5 } : point;
      setLine({ x1: start.x, y1: start.y, x2: start.x, y2: start.y }); capture();
    } else if (tool === "draw") { setStroke([point.x, point.y]); capture(); }
    else if (tool === "ping") ping.mutate({ campaignId: campaign.id, x: point.x, y: point.y });
    else if (tool === "text") {
      const text = window.prompt("Текст пометки (например: «Тут ловушка!»)");
      if (text?.trim()) draw.mutate({ campaignId: campaign.id, drawing: { id: `d-${Date.now()}`, kind: "text", points: [point.x, point.y], color: drawColor, text: text.trim().slice(0, 80) } });
    } else if (isDm && (tool === "reveal" || tool === "hide")) { const cell = cellOf(point); setPaint(paintCells(new Set(map.revealed), cell.x, cell.y)); capture(); }
    else if (isDm && tool === "door") {
      const nearest = [...walls].sort((a, b) => segDist(point.x, point.y, a) - segDist(point.x, point.y, b))[0];
      if (nearest && segDist(point.x, point.y, nearest) < 0.5) commitMap({ ...map, walls: walls.map((wall) => wall.id !== nearest.id ? wall : wall.door ? { ...wall, open: !wall.open } : { ...wall, door: true, open: false }) });
    } else if (isDm && tool === "erase") {
      const wall = [...walls].sort((a, b) => segDist(point.x, point.y, a) - segDist(point.x, point.y, b))[0];
      const drawing = drawings.find((entry) => { for (let i = 0; i < entry.points.length; i += 2) if (Math.hypot(entry.points[i] - point.x, entry.points[i + 1] - point.y) < 0.6) return true; return false; });
      if (drawing) commitMap({ ...map, drawings: drawings.filter((entry) => entry.id !== drawing.id) });
      else if (wall && segDist(point.x, point.y, wall) < 0.5) commitMap({ ...map, walls: walls.filter((entry) => entry.id !== wall.id) });
    } else if (tool === "move") onSelectToken?.(null);
  };

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = exact(event);
    if (drag) {
      const size = map.tokens.find((item) => item.id === drag.id)?.size ?? 1;
      setDrag({ id: drag.id, x: Math.max(0, Math.min(map.cols - size, Math.round(point.x - size / 2))), y: Math.max(0, Math.min(map.rows - size, Math.round(point.y - size / 2))) });
    } else if (line) {
      const end = tool === "wall" ? snap(point) : tool === "ruler" ? { x: Math.floor(point.x) + 0.5, y: Math.floor(point.y) + 0.5 } : point;
      setLine({ ...line, x2: end.x, y2: end.y });
    } else if (stroke) {
      const lastX = stroke[stroke.length - 2]; const lastY = stroke[stroke.length - 1];
      if (Math.hypot(point.x - lastX, point.y - lastY) > 0.15 && stroke.length < 390) setStroke([...stroke, point.x, point.y]);
    } else if (paint) { const cell = cellOf(point); setPaint(new Set(paintCells(new Set(paint), cell.x, cell.y))); }
  };

  const onUp = () => {
    if (drag) {
      const token = map.tokens.find((item) => item.id === drag.id);
      if (token && (token.x !== drag.x || token.y !== drag.y)) moveToken.mutate({ campaignId: campaign.id, tokenId: drag.id, x: drag.x, y: drag.y });
      setDrag(null);
    }
    if (paint) { commitMap({ ...map, revealed: [...paint] }); setPaint(null); }
    if (stroke) { if (stroke.length >= 4) draw.mutate({ campaignId: campaign.id, drawing: { id: `d-${Date.now()}`, kind: "free", points: stroke.map((value) => Math.round(value * 100) / 100), color: drawColor } }); setStroke(null); }
    if (line) {
      const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
      if (tool === "wall" && length > 0) commitMap({ ...map, walls: [...walls, { id: `w-${Date.now()}`, ...line, door: false, open: false }].slice(-300) });
      if (tool === "arrow" && length > 0.3) draw.mutate({ campaignId: campaign.id, drawing: { id: `d-${Date.now()}`, kind: "arrow", points: [line.x1, line.y1, line.x2, line.y2], color: drawColor } });
      if (tool === "template") {
        const angle = Math.round((Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI);
        const template: MapTemplate = { id: `tpl-${Date.now()}`, x: line.x1, y: line.y1, radiusFeet: templateRadius, color: templateShape === "line" ? "#60a5fa" : "#ff6a2a", label: `${templateShape === "circle" ? "⭕" : templateShape === "cone" ? "🔺" : "➖"} ${templateRadius} фт`, shape: templateShape, angle };
        commitMap({ ...map, templates: [...map.templates, template].slice(-20) });
      }
      if (tool === "ruler") window.setTimeout(() => setLine(null), 2500); else setLine(null);
    }
  };

  const canDrag = (characterId: string | null) => canEdit && tool === "move" && (isDm || Boolean(characterId && ownIds.has(characterId)));
  const rulerFeet = line && tool === "ruler" ? Math.max(Math.abs(Math.floor(line.x2) - Math.floor(line.x1)), Math.abs(Math.floor(line.y2) - Math.floor(line.y1))) * map.feetPerCell : 0;
  const darkFor = (x: number, y: number) => visible && !visible.has(`${x}:${y}`);

  return (
    <div className="thin-scrollbar w-full overflow-auto rounded-2xl border border-gold/20 bg-black/60">
      <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onDoubleClick={(event) => { if (!readOnly) { const point = exact(event); ping.mutate({ campaignId: campaign.id, x: point.x, y: point.y }); } }}
        className={cn("relative mx-auto touch-none select-none", tool === "move" ? "cursor-default" : "cursor-crosshair")}
        style={{ width: "100%", minWidth: map.cols * 28, aspectRatio: `${map.cols} / ${map.rows}` }}>
        {map.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={map.imageUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        ) : <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#2a241a,#0d0b08)]" />}

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${map.cols} ${map.rows}`} preserveAspectRatio="none">
          <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke" /></marker></defs>
          {Array.from({ length: map.cols + 1 }, (_, i) => <line key={`v${i}`} x1={i} y1={0} x2={i} y2={map.rows} stroke="rgba(212,175,55,0.16)" strokeWidth={0.02} />)}
          {Array.from({ length: map.rows + 1 }, (_, i) => <line key={`h${i}`} x1={0} y1={i} x2={map.cols} y2={i} stroke="rgba(212,175,55,0.16)" strokeWidth={0.02} />)}
          {map.templates.map((template) => template.shape && template.shape !== "circle"
            ? <path key={template.id} d={templatePath(template, map.feetPerCell)} fill={`${template.color}33`} stroke={template.color} strokeWidth={0.06} />
            : <ellipse key={template.id} cx={template.x} cy={template.y} rx={template.radiusFeet / map.feetPerCell} ry={template.radiusFeet / map.feetPerCell} fill="rgba(255,106,42,0.18)" stroke={template.color} strokeWidth={0.06} strokeDasharray="0.2 0.12" />)}
          {drawings.map((drawing: MapDrawing) => drawing.kind === "free" ? (
            <polyline key={drawing.id} points={drawing.points.reduce<string[]>((acc, value, index) => { if (index % 2 === 0) acc.push(`${value},${drawing.points[index + 1]}`); return acc; }, []).join(" ")} fill="none" stroke={drawing.color} strokeWidth={0.1} strokeLinecap="round" strokeLinejoin="round" />
          ) : drawing.kind === "arrow" ? (
            <line key={drawing.id} x1={drawing.points[0]} y1={drawing.points[1]} x2={drawing.points[2]} y2={drawing.points[3]} stroke={drawing.color} strokeWidth={0.12} markerEnd="url(#arrowhead)" />
          ) : null)}
          {stroke ? <polyline points={stroke.reduce<string[]>((acc, value, index) => { if (index % 2 === 0) acc.push(`${value},${stroke[index + 1]}`); return acc; }, []).join(" ")} fill="none" stroke={drawColor} strokeWidth={0.1} /> : null}
          {map.fogEnabled ? Array.from({ length: map.cols * map.rows }, (_, index) => {
            const x = index % map.cols; const y = Math.floor(index / map.cols);
            if (revealed.has(`${x}:${y}`)) return null;
            return <rect key={`f${index}`} x={x - 0.01} y={y - 0.01} width={1.02} height={1.02} fill={isDm && !readOnly ? "rgba(5,5,8,0.62)" : "#060608"} />;
          }) : null}
          {visible ? Array.from({ length: map.cols * map.rows }, (_, index) => {
            const x = index % map.cols; const y = Math.floor(index / map.cols);
            if (!darkFor(x, y)) return null;
            return <rect key={`l${index}`} x={x - 0.01} y={y - 0.01} width={1.02} height={1.02} fill={isDm && !readOnly ? "rgba(0,0,30,0.35)" : "rgba(2,2,10,0.93)"} />;
          }) : null}
          {walls.map((wall) => <line key={wall.id} x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2} stroke={wall.door ? (wall.open ? "#86efac" : "#b45309") : isDm ? "#e5e7eb" : "rgba(229,231,235,0.55)"} strokeWidth={wall.door ? 0.22 : 0.14} strokeDasharray={wall.door && wall.open ? "0.15 0.12" : undefined} strokeLinecap="round" />)}
          {line ? (
            tool === "template" ? (templateShape === "circle"
              ? <ellipse cx={line.x1} cy={line.y1} rx={templateRadius / map.feetPerCell} ry={templateRadius / map.feetPerCell} fill="rgba(255,106,42,0.15)" stroke="#ff6a2a" strokeWidth={0.05} />
              : <path d={templatePath({ id: "p", x: line.x1, y: line.y1, radiusFeet: templateRadius, color: "", label: "", shape: templateShape, angle: (Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI }, map.feetPerCell)} fill="rgba(255,106,42,0.18)" stroke="#ff6a2a" strokeWidth={0.05} />)
              : <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={tool === "wall" ? "#fff" : tool === "arrow" ? drawColor : "#D4AF37"} strokeWidth={tool === "wall" ? 0.14 : 0.08} strokeDasharray={tool === "ruler" ? "0.25 0.15" : undefined} markerEnd={tool === "arrow" ? "url(#arrowhead)" : undefined} />
          ) : null}
        </svg>

        {drawings.filter((drawing) => drawing.kind === "text").map((drawing) => (
          <span key={drawing.id} className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 text-[clamp(9px,1.2vw,13px)] font-bold" style={{ left: `${(drawing.points[0] / map.cols) * 100}%`, top: `${(drawing.points[1] / map.rows) * 100}%`, color: drawing.color }}>📌 {drawing.text}</span>
        ))}

        {map.templates.map((template) => (
          <button key={template.id} type="button" disabled={!isDm || readOnly} onPointerDown={(event) => event.stopPropagation()}
            onClick={() => commitMap({ ...map, templates: map.templates.filter((item) => item.id !== template.id) })} title={isDm ? "Нажмите, чтобы убрать зону" : template.label}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/80 px-1.5 text-[10px] font-bold text-white" style={{ left: `${(template.x / map.cols) * 100}%`, top: `${(template.y / map.rows) * 100}%` }}>{template.label}</button>
        ))}

        {map.tokens.map((token) => {
          const position = drag?.id === token.id ? drag : token;
          const own = Boolean(token.characterId && ownIds.has(token.characterId));
          if (!isDm && !own && visible && darkFor(token.x, token.y)) return null;
          const combatant = token.combatantId ? encounter?.combatants.find((item) => item.id === token.combatantId) : undefined;
          const active = Boolean(encounter?.active && combatant && encounter.activeId === combatant.id);
          const fogged = map.fogEnabled && !revealed.has(`${token.x}:${token.y}`);
          const draggable = canDrag(token.characterId);
          return (
            <div key={token.id}
              onPointerDown={(event) => {
                if (tool !== "move") return;
                event.stopPropagation(); onSelectToken?.(token.id);
                if (!draggable) return;
                (event.currentTarget.parentElement as HTMLDivElement).setPointerCapture(event.pointerId);
                setDrag({ id: token.id, x: token.x, y: token.y });
              }}
              title={token.name}
              className={cn("absolute z-20 p-[3%] transition-[left,top] duration-200", drag?.id === token.id && "z-30 transition-none", tool !== "move" && "pointer-events-none", draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}
              style={{ left: `${(position.x / map.cols) * 100}%`, top: `${(position.y / map.rows) * 100}%`, width: `${(token.size / map.cols) * 100}%`, height: `${(token.size / map.rows) * 100}%` }}>
              {(token.light ?? 0) > 0 ? <span className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,200,90,0.25),transparent_70%)]" style={{ width: `${((token.light ?? 0) / map.feetPerCell) * 2 * (100 / token.size)}%`, height: `${((token.light ?? 0) / map.feetPerCell) * 2 * (100 / token.size)}%` }} /> : null}
              <div className={cn("relative grid h-full w-full place-items-center rounded-full border-2 font-display text-[clamp(8px,1.4vw,14px)] font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.7)]",
                active && "pulse-ring ring-2 ring-gold", selectedTokenId === token.id && "ring-2 ring-sky-300", (token.hidden || fogged) && isDm && "opacity-50", combatant && combatant.hp === 0 && "grayscale")}
                style={{ background: `radial-gradient(circle at 35% 30%, ${token.color}, #0a0a0a 120%)`, borderColor: token.kind === "monster" ? "#ff6b6b" : "#f6e3a1" }}>
                {initials(token.name)}
                {combatant ? <span className="absolute -bottom-1 left-1/2 h-1 w-[90%] -translate-x-1/2 overflow-hidden rounded-full bg-black/80"><span className="block h-full rounded-full" style={{ width: `${Math.max(0, (combatant.hp / Math.max(1, combatant.maxHp)) * 100)}%`, background: combatant.hp / combatant.maxHp > 0.5 ? "#34d399" : combatant.hp / combatant.maxHp > 0.25 ? "#f5c542" : "#ef4444" }} /></span> : null}
              </div>
            </div>
          );
        })}

        {pingActive ? (
          <div className="pointer-events-none absolute z-40" style={{ left: `${(pingActive.x / map.cols) * 100}%`, top: `${(pingActive.y / map.rows) * 100}%` }}>
            <span className="map-ping absolute h-10 w-10 rounded-full border-4" style={{ borderColor: pingActive.color }} />
            <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: pingActive.color }} />
            <span className="absolute left-3 top-2 whitespace-nowrap rounded bg-black/80 px-1.5 text-[10px] font-bold" style={{ color: pingActive.color }}>{pingActive.by}</span>
          </div>
        ) : null}

        {line && tool === "ruler" ? <div className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-[160%] rounded-lg bg-ink/90 px-2 py-1 font-mono text-xs font-bold text-gold" style={{ left: `${(line.x2 / map.cols) * 100}%`, top: `${(line.y2 / map.rows) * 100}%` }}>{rulerFeet} фт</div> : null}
      </div>
      <Circle className="hidden" />
    </div>
  );
}
