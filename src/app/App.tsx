import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Layout, Layouts } from "react-grid-layout";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import * as dashjs from "dashjs";
import Hls from "hls.js";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Server,
  AlertCircle,
  Activity,
  Globe,
  Bell,
  Search,
  Settings,
  BarChart2,
  Database,
  GripVertical,
  Plus,
  X,
  Pencil,
  Check,
  RefreshCw,
  ChevronDown,
  Link,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Loader,
  Sun,
  Moon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Table2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

type PanelMode = "text" | "api" | "live" | "embed";

interface PanelData {
  id: string;
  title: string;
  content: string;
  titleSize: number;
  bodySize: number;
  mode: PanelMode;
  apiUrl: string;
  liveUrl: string;
  embedUrl: string;
  posterUrl: string;
  apiResponse: string | null;
  apiError: string | null;
  apiLoading: boolean;
}

type PersistedPanelData = Omit<PanelData, "apiResponse" | "apiError" | "apiLoading">;
type SyncState = "idle" | "saving" | "saved" | "error" | "offline";
// ── Default panels ─────────────────────────────────────────────────────────────

function makePanel(id: string, title: string, content: string): PanelData {
  return {
    id,
    title,
    content,
    titleSize: 11,
    bodySize: 12,
    mode: "text",
    apiUrl: "",
    liveUrl: "",
    embedUrl: "",
    posterUrl: "",
    apiResponse: null,
    apiError: null,
    apiLoading: false,
  };
}

const DEFAULT_PANELS: PanelData[] = [
  makePanel("p1", "Monthly Revenue", "$641,000\n+3.7% vs last month\n\nRevenue target: $600,000\nAchieved: 106.8%"),
  makePanel("p2", "Active Users", "84,291 daily active\n+8.2% week-over-week\n\nPeak: 09:00–11:00 UTC"),
  makePanel("p3", "API Uptime", "99.91% — 30-day rolling\n\nLast incident: INC-4819\nDuration: 14 minutes"),
  makePanel("p4", "Avg Latency p99", "312ms across all services\n+18ms since last week\n\nWorst: search-engine 889ms"),
  makePanel("p5", "Revenue vs Target", "Jan  $412k / $380k  ✓\nFeb  $438k / $390k  ✓\nMar  $462k / $420k  ✓\nApr  $448k / $440k  ✓\nMay  $491k / $460k  ✓\nJun  $523k / $480k  ✓\nJul  $511k / $500k  ✓\nAug  $548k / $520k  ✓\nSep  $572k / $540k  ✓\nOct  $594k / $560k  ✓\nNov  $618k / $580k  ✓\nDec  $641k / $600k  ✓"),
  makePanel("p6", "Latency — Today", "Time    p50    p95    p99\n00:00   42ms  118ms  204ms\n04:00   38ms  102ms  189ms\n08:00   61ms  164ms  312ms\n12:00   74ms  198ms  387ms\n16:00   68ms  181ms  342ms\n20:00   55ms  147ms  271ms\n23:59   44ms  121ms  218ms"),
  makePanel("p7", "Request Volume", "Mon  Web 48k  API 122k  Mobile 34k\nTue  Web 52k  API 135k  Mobile 38k\nWed  Web 50k  API 129k  Mobile 37k\nThu  Web 55k  API 141k  Mobile 40k\nFri  Web 59k  API 149k  Mobile 43k\nSat  Web 38k  API  94k  Mobile 30k\nSun  Web 32k  API  81k  Mobile 25k"),
  makePanel("p8", "Service Health", "auth-service      2.84M req  0.02% err   84ms p99  ✓\npayment-api       1.20M req  0.08% err  241ms p99  ✓\ndata-pipeline     0.89M req  0.14% err  512ms p99  ⚠\nnotification-svc  0.64M req  0.01% err   62ms p99  ✓\nsearch-engine     0.48M req  0.31% err  889ms p99  ✗\nmedia-processor   0.33M req  0.05% err 1240ms p99  ✓"),
  makePanel("p9", "Active Incidents", "INC-4821  CRITICAL  search-engine  14m ago\n  Elevated error rate — 0.31%\n\nINC-4819  WARNING   data-pipeline  1h 22m ago\n  p99 latency spike to 512ms\n\nINC-4814  INFO      auth-service   3h ago\n  Certificate renewal scheduled"),
  makePanel("p10", "System Resources", "CPU      68%  ████████░░\nMemory   74%  ████████░░\nDisk I/O 42%  █████░░░░░\nNetwork  31%  ████░░░░░░"),
  makePanel("p11", "Notes", "· Merge freeze begins 2026-07-10\n· Q3 planning meeting Thu 14:00\n· Deploy search-engine hotfix ASAP\n· Review cert renewal for auth-service"),
  makePanel("p12", "On-Call", "Primary: Marcus Holt\nSecondary: Priya Nair\n\nEscalation: ops-leads@company.com\nPagerDuty: /incident-response"),
];

const DEFAULT_LAYOUT: Layout[] = [
  { i: "p1",  x: 0,  y: 0,  w: 3, h: 4, minW: 2, minH: 3 },
  { i: "p2",  x: 3,  y: 0,  w: 3, h: 4, minW: 2, minH: 3 },
  { i: "p3",  x: 6,  y: 0,  w: 3, h: 4, minW: 2, minH: 3 },
  { i: "p4",  x: 9,  y: 0,  w: 3, h: 4, minW: 2, minH: 3 },
  { i: "p5",  x: 0,  y: 4,  w: 7, h: 9, minW: 3, minH: 5 },
  { i: "p6",  x: 7,  y: 4,  w: 5, h: 9, minW: 3, minH: 5 },
  { i: "p7",  x: 0,  y: 13, w: 5, h: 8, minW: 3, minH: 5 },
  { i: "p8",  x: 5,  y: 13, w: 7, h: 8, minW: 4, minH: 5 },
  { i: "p9",  x: 0,  y: 21, w: 8, h: 7, minW: 4, minH: 5 },
  { i: "p10", x: 8,  y: 21, w: 4, h: 7, minW: 2, minH: 4 },
  { i: "p11", x: 0,  y: 28, w: 6, h: 5, minW: 2, minH: 3 },
  { i: "p12", x: 6,  y: 28, w: 6, h: 5, minW: 2, minH: 3 },
];

const ResponsiveGridLayout = WidthProvider(Responsive);
const DESKTOP_COLS = 12;
const TABLET_COLS = 8;
const MOBILE_COLS = 4;
const PHONE_PANEL_MIN_HEIGHT = 340;
const TABLET_PANEL_MIN_HEIGHT = 300;
const BREAKPOINTS = { lg: 1200, md: 900, sm: 768, xs: 480, xxs: 0 } as const;
const GRID_COLS = { lg: DESKTOP_COLS, md: TABLET_COLS, sm: MOBILE_COLS, xs: MOBILE_COLS, xxs: MOBILE_COLS } as const;
type BreakpointKey = keyof typeof GRID_COLS;
const MONITORING_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", key: "overview" as NavKey },
  { icon: Globe, label: "Traffic", key: "traffic" as NavKey },
  { icon: Server, label: "Services", key: "services" as NavKey },
  { icon: Database, label: "Database", key: "database" as NavKey },
];
const OPERATIONS_ITEMS = [
  { icon: AlertCircle, label: "Incidents", key: "alerts" as NavKey },
  { icon: BarChart2, label: "Analytics", key: "traffic" as NavKey },
  { icon: TrendingUp, label: "Reports", key: "database" as NavKey },
];

const DASHBOARD_ROW_ID = "main";
const DASHBOARD_TABLE = "dashboard_state";
const DASHBOARD_IMAGE_BUCKET = "dashboard-images";
const SAVE_DEBOUNCE_MS = 900;

function cloneDefaultPanels() {
  return DEFAULT_PANELS.map((panel) => ({ ...panel }));
}

function sanitizeUploadFilename(fileName: string) {
  return fileName.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "image";
}

function cloneDefaultLayout() {
  return DEFAULT_LAYOUT.map((item) => ({ ...item }));
}

function toPersistedPanels(panels: PanelData[]): PersistedPanelData[] {
  return panels.map(({ apiResponse, apiError, apiLoading, ...persisted }) => persisted);
}

function toRuntimePanel(panel: Partial<PersistedPanelData> & { id: string }): PanelData {
  return {
    id: panel.id,
    title: typeof panel.title === "string" && panel.title.trim() ? panel.title : "New Panel",
    content: typeof panel.content === "string" ? panel.content : "",
    titleSize: typeof panel.titleSize === "number" ? panel.titleSize : 11,
    bodySize: typeof panel.bodySize === "number" ? panel.bodySize : 12,
    mode: panel.mode === "api" || panel.mode === "live" || panel.mode === "embed" ? panel.mode : "text",
    apiUrl: typeof panel.apiUrl === "string" ? panel.apiUrl : "",
    liveUrl: typeof panel.liveUrl === "string" ? panel.liveUrl : "",
    embedUrl: typeof panel.embedUrl === "string" ? panel.embedUrl : "",
    posterUrl: typeof panel.posterUrl === "string" ? panel.posterUrl : "",
    apiResponse: null,
    apiError: null,
    apiLoading: false,
  };
}

function buildFallbackLayout(panels: PanelData[]): Layout[] {
  return panels.map((panel, index) => ({
    i: panel.id,
    x: (index * 4) % 12,
    y: Math.floor(index / 3) * 5,
    w: 4,
    h: 5,
    minW: 2,
    minH: 3,
  }));
}

function parsePanels(raw: unknown): PanelData[] {
  if (!Array.isArray(raw)) return cloneDefaultPanels();

  const parsed = raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<PersistedPanelData> & { id?: unknown };
    if (typeof candidate.id !== "string" || !candidate.id.trim()) return [];
    return [toRuntimePanel(candidate as Partial<PersistedPanelData> & { id: string })];
  });

  return parsed.length ? parsed : cloneDefaultPanels();
}

function parseLayout(raw: unknown, panels: PanelData[]): Layout[] {
  if (!Array.isArray(raw)) return buildFallbackLayout(panels);

  const validIds = new Set(panels.map((panel) => panel.id));
  const parsed = raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;

    if (
      typeof candidate.i !== "string" ||
      !validIds.has(candidate.i) ||
      typeof candidate.x !== "number" ||
      typeof candidate.y !== "number" ||
      typeof candidate.w !== "number" ||
      typeof candidate.h !== "number"
    ) {
      return [];
    }

    return [{
      i: candidate.i,
      x: candidate.x,
      y: candidate.y,
      w: candidate.w,
      h: candidate.h,
      ...(typeof candidate.minW === "number" ? { minW: candidate.minW } : {}),
      ...(typeof candidate.minH === "number" ? { minH: candidate.minH } : {}),
    }];
  });

  return parsed.length === panels.length ? parsed : buildFallbackLayout(panels);
}

function syncUidCounter(panels: PanelData[]) {
  uidCounter = panels.reduce((maxId, panel) => {
    const match = /^p(\d+)$/.exec(panel.id);
    return match ? Math.max(maxId, Number(match[1])) : maxId;
  }, uidCounter);
}

function sortLayoutItems(a: Layout, b: Layout) {
  if (a.y !== b.y) return a.y - b.y;
  return a.x - b.x;
}

function ensureDesktopLayout(layout: Layout[], panels: PanelData[]) {
  const fallback = buildFallbackLayout(panels);
  const layoutMap = new Map(layout.map((item) => [item.i, item]));

  return panels.map((panel, index) => {
    const item = layoutMap.get(panel.id) ?? fallback[index];
    return {
      i: panel.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW ?? 2,
      minH: item.minH ?? 3,
    };
  });
}

function scaleLayoutToCols(layout: Layout[], targetCols: number) {
  return layout.map((item) => {
    const scaledW = Math.max(item.minW ?? 2, Math.min(targetCols, Math.round((item.w / DESKTOP_COLS) * targetCols) || item.w));
    const scaledX = Math.min(
      Math.max(0, Math.round((item.x / DESKTOP_COLS) * targetCols)),
      Math.max(0, targetCols - scaledW),
    );

    return {
      ...item,
      x: scaledX,
      w: scaledW,
      minW: Math.min(item.minW ?? 2, scaledW),
    };
  });
}

function estimateMobileRows(panel: PanelData, item: Layout) {
  if (panel.mode === "api") return Math.max(item.h, item.minH ?? 4, 8);
  if (panel.mode === "live" || panel.mode === "embed") return Math.max(item.h, item.minH ?? 4, 10);
  if (panel.mode === "text" && panel.content.startsWith(FLOATING_CANVAS_PREFIX)) {
    const canvasDoc = parseFloatingCanvasDocument(panel.content);
    const estimatedRows = Math.ceil((canvasDoc.canvasHeight + 56) / 34);
    return Math.max(item.h, item.minH ?? 4, Math.min(32, estimatedRows));
  }
  if (/!\[[^\]]*\]\([^)]+\)/.test(panel.content)) return Math.max(item.h, item.minH ?? 4, 14);
  if (/(^|\n)\s*\|.+\|\s*(\n|$)/.test(panel.content)) return Math.max(item.h, item.minH ?? 4, 12);

  const lines = panel.content.split("\n");
  const wrappedLines = lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 24)), 0);
  const estimatedRows = Math.ceil((112 + wrappedLines * Math.max(18, panel.bodySize * 1.6)) / 34);

  return Math.max(item.h, item.minH ?? 4, Math.min(16, estimatedRows));
}

function stackLayoutForMobile(layout: Layout[], panels: PanelData[]) {
  let nextY = 0;
  const panelMap = new Map(panels.map((panel) => [panel.id, panel]));

  return [...layout].sort(sortLayoutItems).map((item) => {
    const panel = panelMap.get(item.i);
    const mobileRows = panel ? estimateMobileRows(panel, item) : Math.max(item.h, item.minH ?? 4, 6);
    const stacked = {
      ...item,
      x: 0,
      y: nextY,
      w: MOBILE_COLS,
      h: mobileRows,
      minW: MOBILE_COLS,
      minH: Math.max(item.minH ?? 4, 5),
    };
    nextY += stacked.h;
    return stacked;
  });
}

// ── Nav ────────────────────────────────────────────────────────────────────────

function NavItem({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 rounded-sm ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
      style={{ fontFamily: "'Barlow', sans-serif", fontSize: "13px", fontWeight: 500, letterSpacing: "0.02em" }}
    >
      <Icon size={15} strokeWidth={active ? 2 : 1.5} />
      {label}
    </button>
  );
}

// ── Editable title ─────────────────────────────────────────────────────────────

function EditableTitle({ value, onChange, fontSize }: { value: string; onChange: (v: string) => void; fontSize: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim() || value;
    onChange(trimmed);
    setDraft(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
          className="flex-1 min-w-0 bg-transparent border-b border-primary text-foreground outline-none uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: `${fontSize}px`, letterSpacing: "0.1em", fontWeight: 700 }}
        />
        <button onMouseDown={(e) => { e.preventDefault(); commit(); }} className="text-primary hover:opacity-70 flex-shrink-0">
          <Check size={11} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 flex-1 min-w-0 group/title cursor-text"
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      <span
        className="text-foreground uppercase truncate"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: `${fontSize}px`, letterSpacing: "0.1em", fontWeight: 700 }}
      >
        {value}
      </span>
      <Pencil size={9} className="text-muted-foreground/0 group-hover/title:text-muted-foreground/50 transition-colors flex-shrink-0" strokeWidth={2} />
    </div>
  );
}

// ── Editable text body ─────────────────────────────────────────────────────────

function EditableBody({
  value,
  onChange,
  fontSize,
  compact,
  textareaRef,
}: {
  value: string;
  onChange: (v: string) => void;
  fontSize: number;
  compact: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      placeholder={"請直接輸入文字內容\n可插入 Word 表格與圖片，右側會即時顯示"}
      className="w-full h-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/30 outline-none leading-relaxed"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: `${fontSize}px`,
        fontWeight: 400,
        scrollbarWidth: "none",
        whiteSpace: compact ? "pre-wrap" : "pre",
        overflowX: compact ? "hidden" : "auto",
        wordBreak: compact ? "break-word" : "normal",
      }}
    />
  );
}

type TextBlock =
  | { type: "paragraph"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "image"; alt: string; src: string; widthPercent: number; lineIndex: number };

const IMAGE_BLOCK_PATTERN = /^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)(?:\{width=(\d{1,3})%\})?$/i;

function splitTableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string) {
  const cells = splitTableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function clampImageWidthPercent(value: number) {
  return Math.min(100, Math.max(10, Math.round(value)));
}

function extractImageWidthPercent(rawWidth: string | undefined) {
  if (!rawWidth) return 100;
  const parsed = Number.parseInt(rawWidth, 10);
  return Number.isFinite(parsed) ? clampImageWidthPercent(parsed) : 100;
}

function buildImageSnippet(altText: string, imageUrl: string, widthPercent: number) {
  const cleanAlt = altText.trim();
  const cleanUrl = imageUrl.trim();
  const normalizedWidth = clampImageWidthPercent(widthPercent);
  return `![${cleanAlt}](${cleanUrl}){width=${normalizedWidth}%}`;
}

function askImageWidthPercent(defaultValue = 100) {
  const answer = window.prompt("請輸入圖片寬度百分比（10 - 100）", String(clampImageWidthPercent(defaultValue)));
  if (answer === null) return null;
  const parsed = Number.parseInt(answer.trim(), 10);
  if (!Number.isFinite(parsed)) return clampImageWidthPercent(defaultValue);
  return clampImageWidthPercent(parsed);
}

function buildWordTableTemplate(rowCount: number, columnCount: number) {
  const safeRows = Math.max(1, Math.min(12, Math.floor(rowCount)));
  const safeColumns = Math.max(1, Math.min(8, Math.floor(columnCount)));
  const headers = `| ${Array.from({ length: safeColumns }, (_, index) => `欄位 ${index + 1}`).join(" | ")} |`;
  const separator = `|${Array.from({ length: safeColumns }, () => " --- ").join("|")}|`;
  const rows = [headers, separator];

  for (let row = 0; row < safeRows; row += 1) {
    rows.push(`| ${Array.from({ length: safeColumns }, (_, column) => `內容 ${row + 1}-${column + 1}`).join(" | ")} |`);
  }

  return rows.join("\n");
}

function parseTextBlocks(content: string): TextBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: TextBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index];
    const trimmed = currentLine.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const imageMatch = trimmed.match(IMAGE_BLOCK_PATTERN);
    if (imageMatch) {
      blocks.push({
        type: "image",
        alt: imageMatch[1].trim(),
        src: imageMatch[2].trim(),
        widthPercent: extractImageWidthPercent(imageMatch[3]),
        lineIndex: index,
      });
      index += 1;
      continue;
    }

    const nextLine = lines[index + 1]?.trim() ?? "";
    if (trimmed.includes("|") && nextLine && isMarkdownTableSeparator(nextLine)) {
      const headers = splitTableCells(trimmed);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length) {
        const rowLine = lines[index].trim();
        if (!rowLine || !rowLine.includes("|")) break;
        rows.push(splitTableCells(rowLine));
        index += 1;
      }

      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const paragraphLines = [currentLine];
    index += 1;

    while (index < lines.length) {
      const candidate = lines[index];
      const candidateTrimmed = candidate.trim();
      const followingLine = lines[index + 1]?.trim() ?? "";

      if (!candidateTrimmed) break;
      if (IMAGE_BLOCK_PATTERN.test(candidateTrimmed)) break;
      if (candidateTrimmed.includes("|") && followingLine && isMarkdownTableSeparator(followingLine)) break;

      paragraphLines.push(candidate);
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join("\n").trim(),
    });
  }

  return blocks;
}

function RichTextPreview({
  value,
  fontSize,
  compact,
  onImageWidthChange,
}: {
  value: string;
  fontSize: number;
  compact: boolean;
  onImageWidthChange?: (lineIndex: number, widthPercent: number) => void;
}) {
  const blocks = useMemo(() => parseTextBlocks(value), [value]);

  if (!blocks.length) {
    return (
      <p className="text-muted-foreground/40 text-center mt-4" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "12px" }}>
        尚未輸入內容
      </p>
    );
  }

  return (
    <div className="h-full overflow-auto pr-1" style={{ scrollbarWidth: "none" }}>
      <div className="flex flex-col gap-3">
        {blocks.map((block, index) => {
          if (block.type === "image") {
            return (
              <figure key={`image-${index}`} className="border border-border bg-background/50 p-2">
                <img
                  src={block.src}
                  alt={block.alt || "Panel image"}
                  className="h-auto object-contain bg-black/20"
                  style={{ width: `${block.widthPercent}%`, maxWidth: "100%" }}
                  loading="lazy"
                />
                {block.alt && (
                  <figcaption className="mt-2 text-muted-foreground/80" style={{ fontFamily: "'Barlow', sans-serif", fontSize: `${Math.max(fontSize - 1, 11)}px` }}>
                    {block.alt}
                  </figcaption>
                )}
                {onImageWidthChange && (
                  <div className={`mt-3 flex gap-2 ${compact ? "flex-col" : "items-center flex-wrap"}`}>
                    <button
                      onClick={() => onImageWidthChange(block.lineIndex, clampImageWidthPercent(block.widthPercent - 10))}
                      className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                    >
                      縮小 10%
                    </button>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={block.widthPercent}
                      onChange={(event) => onImageWidthChange(block.lineIndex, Number(event.target.value))}
                      className="flex-1 min-w-[120px]"
                    />
                    <button
                      onClick={() => onImageWidthChange(block.lineIndex, clampImageWidthPercent(block.widthPercent + 10))}
                      className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                    >
                      放大 10%
                    </button>
                    <span
                      className="text-primary"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
                    >
                      {block.widthPercent}%
                    </span>
                  </div>
                )}
              </figure>
            );
          }

          if (block.type === "table") {
            const visibleRows = [block.headers, ...block.rows];
            return (
              <div key={`table-${index}`} className="overflow-auto border border-border bg-background/50 p-1" style={{ scrollbarWidth: "thin" }}>
                <table className="w-full border-collapse table-fixed bg-white/[0.03]">
                  <tbody>
                    {visibleRows.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`} className="bg-transparent">
                        {block.headers.map((_, cellIndex) => (
                          <td
                            key={`cell-${rowIndex}-${cellIndex}`}
                            className="border border-border px-2 py-2 align-top text-foreground/90"
                            style={{
                              fontFamily: "'Barlow', sans-serif",
                              fontSize: `${Math.max(fontSize, 11)}px`,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              minHeight: "38px",
                            }}
                          >
                            {row[cellIndex] ?? "\u00A0"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return (
            <div
              key={`paragraph-${index}`}
              className="text-foreground"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: `${fontSize}px`,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.7,
              }}
            >
              {block.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FLOATING_CANVAS_PREFIX = "<!--dashboard-canvas-v2:";
const FLOATING_CANVAS_SUFFIX = "-->";
const DEFAULT_CANVAS_HEIGHT = 720;
const DEFAULT_FLOATING_ITEM_WIDTH = 320;
const DEFAULT_FLOATING_ITEM_HEIGHT = 220;
const DEFAULT_TABLE_COLUMN_WIDTH = 140;
const MIN_FLOATING_ITEM_WIDTH = 180;
const MIN_FLOATING_ITEM_HEIGHT = 120;
const CANVAS_SAFE_PADDING = 24;
const SNAP_DISTANCE = 12;
const MIN_EDITOR_FONT_SIZE = 10;
const MAX_EDITOR_FONT_SIZE = 36;

type FloatingImageItem = {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  alt: string;
  src: string;
  lockAspectRatio: boolean;
  aspectRatio: number;
};

type FloatingTableItem = {
  id: string;
  type: "table";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  fontSize: number;
  headers: string[];
  rows: string[][];
  columnWidths: number[];
};

type FloatingTextItem = {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  fontSize: number;
  text: string;
};

type FloatingItem = FloatingImageItem | FloatingTableItem | FloatingTextItem;

interface FloatingCanvasDocument {
  version: 2;
  text: string;
  textFontSize: number;
  items: FloatingItem[];
  canvasHeight: number;
}

interface SnapGuides {
  x: number | null;
  y: number | null;
}

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface TableSelection {
  itemId: string;
  rowIndex: number;
  columnIndex: number;
  area: "header" | "body";
}

type CanvasInteraction =
  | {
    mode: "move";
    itemIds: string[];
    startX: number;
    startY: number;
    origins: Record<string, { x: number; y: number }>;
  }
  | {
    mode: "resize";
    itemId: string;
    startX: number;
    startY: number;
    originWidth: number;
    originHeight: number;
  }
  | {
    mode: "column-resize";
    itemId: string;
    columnIndex: number;
    startX: number;
    originColumnWidths: number[];
  };

function createFloatingItemId() {
  return crypto.randomUUID();
}

function createFloatingTextItem(x = 48, y = 120): FloatingTextItem {
  return {
    id: createFloatingItemId(),
    type: "text",
    x,
    y,
    width: 320,
    height: 180,
    rotation: 0,
    locked: false,
    fontSize: 16,
    text: "請輸入文字方塊內容",
  };
}

function estimateCanvasTextHeight(text: string) {
  const lines = text.split("\n");
  const wrappedLines = lines.reduce((total, line) => total + Math.max(1, Math.ceil(Math.max(line.length, 1) / 42)), 0);
  return 120 + wrappedLines * 22;
}

function computeCanvasHeight(text: string, items: FloatingItem[], preferredHeight?: number) {
  const textHeight = estimateCanvasTextHeight(text);
  const itemBottom = items.reduce((maxBottom, item) => Math.max(maxBottom, item.y + item.height + CANVAS_SAFE_PADDING), 0);
  return Math.max(DEFAULT_CANVAS_HEIGHT, preferredHeight ?? 0, textHeight, itemBottom);
}

function normalizeTableRows(rows: string[][], columnCount: number) {
  return rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));
}

function createFloatingTableItem(rowCount: number, columnCount: number, x = 48, y = 160): FloatingTableItem {
  const safeRows = Math.max(1, Math.min(12, Math.floor(rowCount)));
  const safeColumns = Math.max(1, Math.min(8, Math.floor(columnCount)));
  const headers = Array.from({ length: safeColumns }, (_, index) => `欄位 ${index + 1}`);
  const rows = Array.from({ length: safeRows }, (_, rowIndex) =>
    Array.from({ length: safeColumns }, (_, columnIndex) => `內容 ${rowIndex + 1}-${columnIndex + 1}`));

  return {
    id: createFloatingItemId(),
    type: "table",
    x,
    y,
    width: Math.max(DEFAULT_FLOATING_ITEM_WIDTH, safeColumns * 140),
    height: Math.max(DEFAULT_FLOATING_ITEM_HEIGHT, 120 + safeRows * 42),
    rotation: 0,
    locked: false,
    fontSize: 13,
    headers,
    rows,
    columnWidths: Array.from({ length: safeColumns }, () => DEFAULT_TABLE_COLUMN_WIDTH),
  };
}

function sanitizeFloatingItem(item: FloatingItem, index: number): FloatingItem {
  const safeX = Number.isFinite(item.x) ? Math.max(0, Math.round(item.x)) : 24;
  const safeY = Number.isFinite(item.y) ? Math.max(0, Math.round(item.y)) : 120 + index * 36;
  const safeWidth = Number.isFinite(item.width) ? Math.max(MIN_FLOATING_ITEM_WIDTH, Math.round(item.width)) : DEFAULT_FLOATING_ITEM_WIDTH;
  const safeHeight = Number.isFinite(item.height) ? Math.max(MIN_FLOATING_ITEM_HEIGHT, Math.round(item.height)) : DEFAULT_FLOATING_ITEM_HEIGHT;

  if (item.type === "image") {
    return {
      ...item,
      id: item.id || createFloatingItemId(),
      x: safeX,
      y: safeY,
      width: safeWidth,
      height: safeHeight,
      rotation: Number.isFinite(item.rotation) ? item.rotation : 0,
      locked: Boolean(item.locked),
      alt: typeof item.alt === "string" ? item.alt : "",
      src: typeof item.src === "string" ? item.src : "",
      lockAspectRatio: item.lockAspectRatio !== false,
      aspectRatio: Number.isFinite(item.aspectRatio) && item.aspectRatio > 0 ? item.aspectRatio : Math.max(1, safeWidth / Math.max(safeHeight, 1)),
    };
  }

  if (item.type === "text") {
    return {
      ...item,
      id: item.id || createFloatingItemId(),
      x: safeX,
      y: safeY,
      width: safeWidth,
      height: safeHeight,
      rotation: Number.isFinite(item.rotation) ? item.rotation : 0,
      locked: Boolean(item.locked),
      fontSize: Number.isFinite(item.fontSize) ? Math.min(MAX_EDITOR_FONT_SIZE, Math.max(MIN_EDITOR_FONT_SIZE, Math.round(item.fontSize))) : 16,
      text: typeof item.text === "string" ? item.text : "",
    };
  }

  const columnCount = Math.max(1, item.headers.length);
  const headers = Array.from({ length: columnCount }, (_, columnIndex) => item.headers[columnIndex] ?? `欄位 ${columnIndex + 1}`);
  const rows = normalizeTableRows(item.rows, columnCount);
  const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) =>
    Math.max(80, Math.round(item.columnWidths[columnIndex] ?? DEFAULT_TABLE_COLUMN_WIDTH)));

  return {
    ...item,
    id: item.id || createFloatingItemId(),
    x: safeX,
    y: safeY,
    width: safeWidth,
    height: safeHeight,
    rotation: Number.isFinite(item.rotation) ? item.rotation : 0,
    locked: Boolean(item.locked),
    fontSize: Number.isFinite(item.fontSize) ? Math.min(MAX_EDITOR_FONT_SIZE, Math.max(MIN_EDITOR_FONT_SIZE, Math.round(item.fontSize))) : 13,
    headers,
    rows,
    columnWidths,
  };
}

function sanitizeFloatingCanvasDocument(doc: Partial<FloatingCanvasDocument>): FloatingCanvasDocument {
  const safeText = typeof doc.text === "string" ? doc.text : "";
  const rawItems = Array.isArray(doc.items) ? doc.items : [];
  const items = rawItems
    .filter((item): item is FloatingItem => Boolean(item) && typeof item === "object" && "type" in item)
    .map((item, index) => sanitizeFloatingItem(item, index));

  return {
    version: 2,
    text: safeText,
    textFontSize: typeof doc.textFontSize === "number"
      ? Math.min(MAX_EDITOR_FONT_SIZE, Math.max(MIN_EDITOR_FONT_SIZE, Math.round(doc.textFontSize)))
      : 14,
    items,
    canvasHeight: computeCanvasHeight(safeText, items, typeof doc.canvasHeight === "number" ? doc.canvasHeight : undefined),
  };
}

function serializeFloatingCanvasDocument(doc: FloatingCanvasDocument) {
  const normalized = sanitizeFloatingCanvasDocument(doc);
  return `${FLOATING_CANVAS_PREFIX}${encodeURIComponent(JSON.stringify(normalized))}${FLOATING_CANVAS_SUFFIX}`;
}

function parseMarkdownTableBlock(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = splitTableCells(lines[0]);
  const rows = lines.slice(2).map(splitTableCells);
  return {
    headers,
    rows: normalizeTableRows(rows, headers.length),
  };
}

function convertLegacyContentToFloatingCanvas(content: string): FloatingCanvasDocument {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const textLines: string[] = [];
  const items: FloatingItem[] = [];
  let index = 0;
  let nextItemY = 180;

  while (index < lines.length) {
    const currentLine = lines[index];
    const trimmed = currentLine.trim();

    if (!trimmed) {
      textLines.push("");
      index += 1;
      continue;
    }

    const imageMatch = trimmed.match(IMAGE_BLOCK_PATTERN);
    if (imageMatch) {
      items.push(sanitizeFloatingItem({
        id: createFloatingItemId(),
        type: "image",
        x: 48,
        y: nextItemY,
        width: DEFAULT_FLOATING_ITEM_WIDTH,
        height: DEFAULT_FLOATING_ITEM_HEIGHT,
        rotation: 0,
        locked: false,
        alt: imageMatch[1].trim(),
        src: imageMatch[2].trim(),
        lockAspectRatio: true,
        aspectRatio: DEFAULT_FLOATING_ITEM_WIDTH / DEFAULT_FLOATING_ITEM_HEIGHT,
      }, items.length));
      nextItemY += DEFAULT_FLOATING_ITEM_HEIGHT + 24;
      index += 1;
      continue;
    }

    const nextLine = lines[index + 1]?.trim() ?? "";
    if (trimmed.includes("|") && nextLine && isMarkdownTableSeparator(nextLine)) {
      const tableLines = [currentLine, lines[index + 1]];
      index += 2;

      while (index < lines.length) {
        const rowLine = lines[index];
        const rowTrimmed = rowLine.trim();
        if (!rowTrimmed || !rowTrimmed.includes("|")) break;
        tableLines.push(rowLine);
        index += 1;
      }

      const parsedTable = parseMarkdownTableBlock(tableLines.join("\n"));
      if (parsedTable) {
        items.push(sanitizeFloatingItem({
          ...createFloatingTableItem(parsedTable.rows.length || 1, parsedTable.headers.length || 1, 48, nextItemY),
          headers: parsedTable.headers,
          rows: parsedTable.rows,
          columnWidths: Array.from({ length: parsedTable.headers.length || 1 }, () => DEFAULT_TABLE_COLUMN_WIDTH),
        }, items.length));
        nextItemY += DEFAULT_FLOATING_ITEM_HEIGHT + 32;
        continue;
      }
    }

    textLines.push(currentLine);
    index += 1;
  }

  return sanitizeFloatingCanvasDocument({
    version: 2,
    text: textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    textFontSize: 14,
    items,
    canvasHeight: computeCanvasHeight(textLines.join("\n"), items),
  });
}

function parseFloatingCanvasDocument(content: string): FloatingCanvasDocument {
  if (content.startsWith(FLOATING_CANVAS_PREFIX) && content.endsWith(FLOATING_CANVAS_SUFFIX)) {
    try {
      const encoded = content.slice(FLOATING_CANVAS_PREFIX.length, -FLOATING_CANVAS_SUFFIX.length);
      const parsed = JSON.parse(decodeURIComponent(encoded)) as Partial<FloatingCanvasDocument>;
      return sanitizeFloatingCanvasDocument(parsed);
    } catch {
      return convertLegacyContentToFloatingCanvas(content);
    }
  }

  return convertLegacyContentToFloatingCanvas(content);
}

function TextModeEditor({
  value,
  onChange,
  fontSize,
  compact,
  panelId,
  availableTextPanels,
  onCopyLayoutToPanel,
}: {
  value: string;
  onChange: (v: string) => void;
  fontSize: number;
  compact: boolean;
  panelId: string;
  availableTextPanels: Array<{ id: string; title: string }>;
  onCopyLayoutToPanel: (targetPanelId: string, content: string) => void;
}) {
  const doc = useMemo(() => parseFloatingCanvasDocument(value), [value]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [interaction, setInteraction] = useState<CanvasInteraction | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({ x: null, y: null });
  const [tableSelection, setTableSelection] = useState<TableSelection | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const clipboardRef = useRef<FloatingItem[]>([]);

  const commitDocument = useCallback((nextDoc: FloatingCanvasDocument) => {
    onChange(serializeFloatingCanvasDocument(nextDoc));
  }, [onChange]);

  const updateDocument = useCallback((updater: (currentDoc: FloatingCanvasDocument) => FloatingCanvasDocument) => {
    commitDocument(updater(doc));
  }, [commitDocument, doc]);

  const selectedItems = doc.items.filter((item) => selectedItemIds.includes(item.id));
  const selectedItem = selectedItems.at(-1) ?? null;

  useEffect(() => {
    if (selectedItemIds.some((itemId) => !doc.items.some((item) => item.id === itemId))) {
      setSelectedItemIds((current) => current.filter((itemId) => doc.items.some((item) => item.id === itemId)));
    }
  }, [doc.items, selectedItemIds]);

  function selectItem(itemId: string, additive = false) {
    setSelectedItemIds((current) => {
      if (additive) {
        return current.includes(itemId)
          ? current.filter((id) => id !== itemId)
          : [...current, itemId];
      }

      return [itemId];
    });
  }

  function updateItem(itemId: string, updater: (item: FloatingItem) => FloatingItem) {
    updateDocument((currentDoc) => ({
      ...currentDoc,
      items: currentDoc.items.map((item, index) =>
        item.id === itemId ? sanitizeFloatingItem(updater(item), index) : item),
    }));
  }

  function removeItems(itemIds: string[]) {
    if (!itemIds.length) return;
    const itemSet = new Set(itemIds);
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: currentDoc.items.filter((item) => !itemSet.has(item.id)),
    }));
    setSelectedItemIds((current) => current.filter((itemId) => !itemSet.has(itemId)));
    setTableSelection((current) => (current && itemSet.has(current.itemId) ? null : current));
  }

  function removeItem(itemId: string) {
    removeItems([itemId]);
  }

  function moveItemLayer(itemId: string, direction: "forward" | "backward") {
    updateDocument((currentDoc) => {
      const index = currentDoc.items.findIndex((item) => item.id === itemId);
      if (index === -1) return currentDoc;

      const targetIndex = direction === "forward"
        ? Math.min(currentDoc.items.length - 1, index + 1)
        : Math.max(0, index - 1);

      if (targetIndex === index) return currentDoc;

      const nextItems = [...currentDoc.items];
      const [movingItem] = nextItems.splice(index, 1);
      nextItems.splice(targetIndex, 0, movingItem);

      return sanitizeFloatingCanvasDocument({
        ...currentDoc,
        items: nextItems,
      });
    });
  }

  function moveSelectedItemsBy(dx: number, dy: number) {
    if (!selectedItemIds.length) return;
    const selectedSet = new Set(selectedItemIds);
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: currentDoc.items.map((item) => {
        if (!selectedSet.has(item.id) || item.locked) return item;
        return {
          ...item,
          x: Math.max(0, item.x + dx),
          y: Math.max(0, item.y + dy),
        };
      }),
    }));
  }

  function rotateSelectedItems(delta: number) {
    if (!selectedItemIds.length) return;
    const selectedSet = new Set(selectedItemIds);
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: currentDoc.items.map((item) => {
        if (!selectedSet.has(item.id) || item.locked) return item;
        return {
          ...item,
          rotation: item.rotation + delta,
        };
      }),
    }));
  }

  function toggleLockSelectedItems() {
    if (!selectedItems.length) return;
    const nextLocked = !selectedItems.every((item) => item.locked);
    const selectedSet = new Set(selectedItemIds);
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: currentDoc.items.map((item) => selectedSet.has(item.id) ? { ...item, locked: nextLocked } : item),
    }));
  }

  function toggleImageAspectLock(itemId: string) {
    updateItem(itemId, (currentItem) => currentItem.type === "image"
      ? { ...currentItem, lockAspectRatio: !currentItem.lockAspectRatio }
      : currentItem);
  }

  function updateCanvasTextFontSize(nextFontSize: number) {
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      textFontSize: Math.max(MIN_EDITOR_FONT_SIZE, Math.min(MAX_EDITOR_FONT_SIZE, nextFontSize)),
    }));
  }

  function updateSelectedTextLikeFontSize(delta: number) {
    if (!selectedItems.length) return;
    const selectedSet = new Set(selectedItemIds);
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: currentDoc.items.map((item) => {
        if (!selectedSet.has(item.id) || item.locked) return item;
        if (item.type === "text" || item.type === "table") {
          return {
            ...item,
            fontSize: Math.max(MIN_EDITOR_FONT_SIZE, Math.min(MAX_EDITOR_FONT_SIZE, item.fontSize + delta)),
          };
        }
        return item;
      }),
    }));
  }

  function selectAllItems() {
    setSelectedItemIds(doc.items.map((item) => item.id));
  }

  function alignSelectedItems(mode: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    if (selectedItems.length < 2) return;
    const selectedSet = new Set(selectedItemIds);
    const left = Math.min(...selectedItems.map((item) => item.x));
    const right = Math.max(...selectedItems.map((item) => item.x + item.width));
    const top = Math.min(...selectedItems.map((item) => item.y));
    const bottom = Math.max(...selectedItems.map((item) => item.y + item.height));
    const center = (left + right) / 2;
    const middle = (top + bottom) / 2;

    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: currentDoc.items.map((item) => {
        if (!selectedSet.has(item.id) || item.locked) return item;

        if (mode === "left") return { ...item, x: left };
        if (mode === "center") return { ...item, x: Math.round(center - item.width / 2) };
        if (mode === "right") return { ...item, x: Math.round(right - item.width) };
        if (mode === "top") return { ...item, y: top };
        if (mode === "middle") return { ...item, y: Math.round(middle - item.height / 2) };
        return { ...item, y: Math.round(bottom - item.height) };
      }),
    }));
  }

  function distributeSelectedItems(axis: "horizontal" | "vertical") {
    if (selectedItems.length < 3) return;
    const sortable = [...selectedItems].sort((a, b) => axis === "horizontal" ? a.x - b.x : a.y - b.y);

    if (axis === "horizontal") {
      const start = sortable[0].x;
      const end = sortable[sortable.length - 1].x + sortable[sortable.length - 1].width;
      const totalWidth = sortable.reduce((sum, item) => sum + item.width, 0);
      const gap = (end - start - totalWidth) / (sortable.length - 1);
      let cursor = start;
      const positions = new Map<string, number>();
      for (const item of sortable) {
        positions.set(item.id, Math.round(cursor));
        cursor += item.width + gap;
      }

      updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
        ...currentDoc,
        items: currentDoc.items.map((item) => positions.has(item.id) && !item.locked ? { ...item, x: positions.get(item.id)! } : item),
      }));
      return;
    }

    const start = sortable[0].y;
    const end = sortable[sortable.length - 1].y + sortable[sortable.length - 1].height;
    const totalHeight = sortable.reduce((sum, item) => sum + item.height, 0);
    const gap = (end - start - totalHeight) / (sortable.length - 1);
    let cursor = start;
    const positions = new Map<string, number>();
    for (const item of sortable) {
      positions.set(item.id, Math.round(cursor));
      cursor += item.height + gap;
    }

    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: currentDoc.items.map((item) => positions.has(item.id) && !item.locked ? { ...item, y: positions.get(item.id)! } : item),
    }));
  }

  async function exportCanvasLayout() {
    const payload = JSON.stringify(sanitizeFloatingCanvasDocument(doc), null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setUploadMessage("畫布配置 JSON 已複製到剪貼簿");
    } catch {
      window.prompt("請複製以下畫布配置 JSON", payload);
      setUploadMessage("已開啟畫布配置 JSON 複製視窗");
    }
  }

  function importCanvasLayout() {
    const input = window.prompt("請貼上畫布配置 JSON 或已匯出的文字內容");
    if (!input?.trim()) return;

    try {
      const trimmed = input.trim();
      if (trimmed.startsWith(FLOATING_CANVAS_PREFIX)) {
        onChange(trimmed);
      } else {
        const parsed = sanitizeFloatingCanvasDocument(JSON.parse(trimmed) as Partial<FloatingCanvasDocument>);
        onChange(serializeFloatingCanvasDocument(parsed));
      }
      setSelectedItemIds([]);
      setUploadMessage("畫布配置已匯入");
    } catch {
      setUploadMessage("匯入失敗，請確認貼上的內容是有效 JSON 或匯出字串");
    }
  }

  function copyCanvasToAnotherPanel() {
    const targets = availableTextPanels.filter((panel) => panel.id !== panelId);
    if (!targets.length) {
      setUploadMessage("沒有其他可用的 panel 可接收版面");
      return;
    }

    const promptText = targets.map((panel) => `${panel.id}: ${panel.title}`).join("\n");
    const targetId = window.prompt(`請輸入要接收版面的 panel ID：\n${promptText}`, targets[0]?.id ?? "");
    if (!targetId?.trim()) return;

    const target = targets.find((panel) => panel.id === targetId.trim());
    if (!target) {
      setUploadMessage("找不到指定的 panel ID");
      return;
    }

    onCopyLayoutToPanel(target.id, serializeFloatingCanvasDocument(doc));
    setUploadMessage(`已複製版面到 ${target.title}`);
  }

  function cloneItem(item: FloatingItem, offsetMultiplier: number) {
    const offset = 24 * offsetMultiplier;
    if (item.type === "image") {
      return {
        ...item,
        id: createFloatingItemId(),
        x: item.x + offset,
        y: item.y + offset,
      } satisfies FloatingImageItem;
    }

    if (item.type === "table") {
      return {
        ...item,
        id: createFloatingItemId(),
        x: item.x + offset,
        y: item.y + offset,
        headers: [...item.headers],
        rows: item.rows.map((row) => [...row]),
        columnWidths: [...item.columnWidths],
      } satisfies FloatingTableItem;
    }

    return {
      ...item,
      id: createFloatingItemId(),
      x: item.x + offset,
      y: item.y + offset,
    } satisfies FloatingTextItem;
  }

  function copySelectedItems() {
    if (!selectedItems.length) return;
    clipboardRef.current = selectedItems.map((item, index) => cloneItem(item, index + 1));
  }

  function pasteClipboardItems() {
    if (!clipboardRef.current.length) return;
    const pastedItems = clipboardRef.current.map((item, index) => cloneItem(item, index + 1));
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: [...currentDoc.items, ...pastedItems],
    }));
    setSelectedItemIds(pastedItems.map((item) => item.id));
  }

  function duplicateSelectedItems() {
    copySelectedItems();
    pasteClipboardItems();
  }

  function getDefaultItemPosition() {
    const maxBottom = doc.items.reduce((bottom, item) => Math.max(bottom, item.y + item.height), 120);
    return {
      x: 48 + (doc.items.length % 3) * 24,
      y: Math.min(maxBottom + 24, Math.max(160, doc.canvasHeight - 260)),
    };
  }

  function insertTextBox() {
    const { x, y } = getDefaultItemPosition();
    const nextTextBox = createFloatingTextItem(x, y);
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: [...currentDoc.items, nextTextBox],
    }));
    setSelectedItemIds([nextTextBox.id]);
  }

  function createWrapTextBoxesForItem(itemId: string) {
    const targetItem = doc.items.find((item) => item.id === itemId);
    const canvasWidth = canvasRef.current?.clientWidth ?? 960;
    if (!targetItem) return;

    const wrapItems: FloatingTextItem[] = [];
    const leftWidth = targetItem.x - CANVAS_SAFE_PADDING - 12;
    const rightStart = targetItem.x + targetItem.width + 12;
    const rightWidth = canvasWidth - rightStart - CANVAS_SAFE_PADDING;

    if (leftWidth >= 220) {
      wrapItems.push({
        ...createFloatingTextItem(CANVAS_SAFE_PADDING, targetItem.y),
        width: Math.min(320, leftWidth),
        height: Math.max(120, Math.min(260, targetItem.height)),
        text: "左側繞排文字",
      });
    }

    if (rightWidth >= 220) {
      wrapItems.push({
        ...createFloatingTextItem(rightStart, targetItem.y),
        width: Math.min(320, rightWidth),
        height: Math.max(120, Math.min(260, targetItem.height)),
        text: "右側繞排文字",
      });
    }

    wrapItems.push({
      ...createFloatingTextItem(targetItem.x, targetItem.y + targetItem.height + 16),
      width: Math.max(260, Math.min(targetItem.width, canvasWidth - targetItem.x - CANVAS_SAFE_PADDING)),
      height: 160,
      text: "下方延伸文字",
    });

    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: [...currentDoc.items, ...wrapItems],
    }));
    setSelectedItemIds(wrapItems.map((item) => item.id));
  }

  function addTableRow(itemId: string, insertIndex?: number) {
    updateItem(itemId, (currentItem) => {
      if (currentItem.type !== "table") return currentItem;
      const targetIndex = typeof insertIndex === "number"
        ? Math.max(0, Math.min(currentItem.rows.length, insertIndex))
        : currentItem.rows.length;
      return {
        ...currentItem,
        rows: [
          ...currentItem.rows.slice(0, targetIndex),
          currentItem.headers.map((_, columnIndex) => `內容 ${targetIndex + 1}-${columnIndex + 1}`),
          ...currentItem.rows.slice(targetIndex),
        ],
        height: currentItem.height + 42,
      };
    });
  }

  function removeTableRow(itemId: string, rowIndex?: number) {
    updateItem(itemId, (currentItem) => {
      if (currentItem.type !== "table" || currentItem.rows.length <= 1) return currentItem;
      const targetIndex = typeof rowIndex === "number"
        ? Math.max(0, Math.min(currentItem.rows.length - 1, rowIndex))
        : currentItem.rows.length - 1;
      return {
        ...currentItem,
        rows: currentItem.rows.filter((_, index) => index !== targetIndex),
        height: Math.max(MIN_FLOATING_ITEM_HEIGHT, currentItem.height - 42),
      };
    });
  }

  function addTableColumn(itemId: string, insertIndex?: number) {
    updateItem(itemId, (currentItem) => {
      if (currentItem.type !== "table") return currentItem;
      const targetIndex = typeof insertIndex === "number"
        ? Math.max(0, Math.min(currentItem.headers.length, insertIndex))
        : currentItem.headers.length;
      return {
        ...currentItem,
        headers: [
          ...currentItem.headers.slice(0, targetIndex),
          `欄位 ${targetIndex + 1}`,
          ...currentItem.headers.slice(targetIndex),
        ],
        rows: currentItem.rows.map((row, rowIndex) => [
          ...row.slice(0, targetIndex),
          `內容 ${rowIndex + 1}-${targetIndex + 1}`,
          ...row.slice(targetIndex),
        ]),
        columnWidths: [
          ...currentItem.columnWidths.slice(0, targetIndex),
          DEFAULT_TABLE_COLUMN_WIDTH,
          ...currentItem.columnWidths.slice(targetIndex),
        ],
        width: currentItem.width + DEFAULT_TABLE_COLUMN_WIDTH,
      };
    });
  }

  function removeTableColumn(itemId: string, columnIndex?: number) {
    updateItem(itemId, (currentItem) => {
      if (currentItem.type !== "table" || currentItem.headers.length <= 1) return currentItem;
      const targetIndex = typeof columnIndex === "number"
        ? Math.max(0, Math.min(currentItem.headers.length - 1, columnIndex))
        : currentItem.headers.length - 1;
      const removedWidth = currentItem.columnWidths[targetIndex] ?? DEFAULT_TABLE_COLUMN_WIDTH;
      return {
        ...currentItem,
        headers: currentItem.headers.filter((_, index) => index !== targetIndex),
        rows: currentItem.rows.map((row) => row.filter((_, index) => index !== targetIndex)),
        columnWidths: currentItem.columnWidths.filter((_, index) => index !== targetIndex),
        width: Math.max(MIN_FLOATING_ITEM_WIDTH, currentItem.width - removedWidth),
      };
    });
  }

  function insertTableTemplate() {
    const columnInput = window.prompt("請輸入表格欄數（1 - 8）", "3");
    if (columnInput === null) return;

    const rowInput = window.prompt("請輸入表格列數（1 - 12）", "4");
    if (rowInput === null) return;

    const columns = Number.parseInt(columnInput.trim(), 10);
    const rows = Number.parseInt(rowInput.trim(), 10);
    const { x, y } = getDefaultItemPosition();
    const nextTable = createFloatingTableItem(rows, columns, x, y);
    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: [...currentDoc.items, nextTable],
    }));
    setSelectedItemIds([nextTable.id]);
  }

  function insertImageBlock(src: string, alt: string, widthPercent: number) {
    const trimmedUrl = src.trim();
    if (!trimmedUrl) {
      setUploadMessage("圖片網址不能為空白");
      return;
    }

    const nextWidth = Math.max(MIN_FLOATING_ITEM_WIDTH, Math.round((clampImageWidthPercent(widthPercent) / 100) * 420));
    const aspectRatio = 4 / 3;
    const { x, y } = getDefaultItemPosition();
    const nextImage: FloatingImageItem = {
      id: createFloatingItemId(),
      type: "image",
      x,
      y,
      width: nextWidth,
      height: Math.max(MIN_FLOATING_ITEM_HEIGHT, Math.round(nextWidth / aspectRatio)),
      rotation: 0,
      locked: false,
      alt: alt.trim(),
      src: trimmedUrl,
      lockAspectRatio: true,
      aspectRatio,
    };

    updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
      ...currentDoc,
      items: [...currentDoc.items, nextImage],
    }));
    setSelectedItemIds([nextImage.id]);
  }

  function insertImageTemplate() {
    const imageUrl = window.prompt("請輸入圖片網址", "https://");
    if (!imageUrl) return;

    const altText = window.prompt("請輸入圖片說明", "Dashboard 圖片")?.trim() ?? "";
    const widthPercent = askImageWidthPercent(100);
    if (widthPercent === null) return;
    insertImageBlock(imageUrl, altText, widthPercent);
  }

  async function uploadImageFile(file: File) {
    if (!supabase) {
      setUploadMessage("Supabase 未連接，暫時無法上傳圖片");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadMessage("只支援上傳圖片檔案");
      return;
    }

    setUploadingImage(true);
    setUploadMessage(null);

    try {
      const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "png" : "png";
      const fileBaseName = sanitizeUploadFilename(file.name.replace(/\.[^.]+$/, ""));
      const objectPath = `panel-images/${Date.now()}-${crypto.randomUUID()}.${extension || "png"}`;

      const { error: uploadError } = await supabase.storage
        .from(DASHBOARD_IMAGE_BUCKET)
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(DASHBOARD_IMAGE_BUCKET).getPublicUrl(objectPath);
      if (!data.publicUrl) throw new Error("無法取得圖片公開網址");

      const widthPercent = askImageWidthPercent(100);
      if (widthPercent === null) {
        setUploadMessage("圖片已上傳，但你取消了插入尺寸設定");
        return;
      }

      insertImageBlock(data.publicUrl, fileBaseName, widthPercent);
      setUploadMessage("圖片已上傳並插入");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "圖片上傳失敗");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSelectUpload() {
    setUploadMessage(null);
    fileInputRef.current?.click();
  }

  function beginMove(event: React.MouseEvent, item: FloatingItem) {
    event.preventDefault();
    event.stopPropagation();
    if (item.locked) return;

    const activeIds = selectedItemIds.includes(item.id) ? selectedItemIds : [item.id];
    const movableIds = activeIds.filter((itemId) => {
      const currentItem = doc.items.find((candidate) => candidate.id === itemId);
      return currentItem && !currentItem.locked;
    });

    setSelectedItemIds(activeIds);
    setInteraction({
      mode: "move",
      itemIds: movableIds,
      startX: event.clientX,
      startY: event.clientY,
      origins: Object.fromEntries(movableIds.map((itemId) => {
        const currentItem = doc.items.find((candidate) => candidate.id === itemId)!;
        return [itemId, { x: currentItem.x, y: currentItem.y }];
      })),
    });
  }

  function beginResize(event: React.MouseEvent, item: FloatingItem) {
    event.preventDefault();
    event.stopPropagation();
    if (item.locked) return;
    setSelectedItemIds((current) => current.includes(item.id) ? current : [item.id]);
    setInteraction({
      mode: "resize",
      itemId: item.id,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: item.width,
      originHeight: item.height,
    });
  }

  function beginColumnResize(event: React.MouseEvent, item: FloatingTableItem, columnIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    if (item.locked) return;
    setSelectedItemIds((current) => current.includes(item.id) ? current : [item.id]);
    setInteraction({
      mode: "column-resize",
      itemId: item.id,
      columnIndex,
      startX: event.clientX,
      originColumnWidths: [...item.columnWidths],
    });
  }

  function snapAxis(position: number, size: number, candidateLines: number[]) {
    const points = [
      { line: position },
      { line: position + size / 2 },
      { line: position + size },
    ];

    let best: { position: number; guide: number } | null = null;

    for (const candidate of candidateLines) {
      for (const point of points) {
        const delta = candidate - point.line;
        if (Math.abs(delta) > SNAP_DISTANCE) continue;
        const nextPosition = position + delta;
        if (!best || Math.abs(delta) < Math.abs(best.position - position)) {
          best = { position: nextPosition, guide: candidate };
        }
      }
    }

    return best ?? { position, guide: null };
  }

  useEffect(() => {
    if (!interaction) return;

    function handleMouseMove(event: MouseEvent) {
      const canvasWidth = canvasRef.current?.clientWidth ?? 720;

      if (interaction.mode === "move") {
        const primaryId = interaction.itemIds.at(-1);
        const primaryItem = doc.items.find((item) => item.id === primaryId);
        if (!primaryItem) return;

        const origin = interaction.origins[primaryItem.id];
        const rawX = Math.max(0, Math.min(canvasWidth - primaryItem.width - CANVAS_SAFE_PADDING, origin.x + (event.clientX - interaction.startX)));
        const rawY = Math.max(0, origin.y + (event.clientY - interaction.startY));
        const siblingItems = doc.items.filter((item) => !interaction.itemIds.includes(item.id));
        const xCandidates = [
          CANVAS_SAFE_PADDING,
          canvasWidth / 2,
          canvasWidth - CANVAS_SAFE_PADDING,
          ...siblingItems.flatMap((item) => [item.x, item.x + item.width / 2, item.x + item.width]),
        ];
        const yCandidates = [
          CANVAS_SAFE_PADDING,
          doc.canvasHeight / 2,
          doc.canvasHeight - CANVAS_SAFE_PADDING,
          ...siblingItems.flatMap((item) => [item.y, item.y + item.height / 2, item.y + item.height]),
        ];

        const snappedX = snapAxis(rawX, primaryItem.width, xCandidates);
        const snappedY = snapAxis(rawY, primaryItem.height, yCandidates);
        const deltaX = snappedX.position - origin.x;
        const deltaY = snappedY.position - origin.y;
        setSnapGuides({ x: snappedX.guide, y: snappedY.guide });

        commitDocument(sanitizeFloatingCanvasDocument({
          ...doc,
          items: doc.items.map((item) => {
            if (!interaction.itemIds.includes(item.id)) return item;
            const itemOrigin = interaction.origins[item.id];
            return {
              ...item,
              x: itemOrigin.x + deltaX,
              y: itemOrigin.y + deltaY,
            };
          }),
        }));
        return;
      }

      setSnapGuides({ x: null, y: null });

      const currentItem = doc.items.find((item) => item.id === interaction.itemId);
      if (!currentItem) return;

      if (interaction.mode === "resize") {
        const nextWidth = Math.max(MIN_FLOATING_ITEM_WIDTH, Math.min(canvasWidth - currentItem.x - CANVAS_SAFE_PADDING, interaction.originWidth + (event.clientX - interaction.startX)));
        const nextHeight = currentItem.type === "image" && currentItem.lockAspectRatio
          ? Math.max(MIN_FLOATING_ITEM_HEIGHT, Math.round(nextWidth / Math.max(currentItem.aspectRatio, 0.1)))
          : Math.max(MIN_FLOATING_ITEM_HEIGHT, interaction.originHeight + (event.clientY - interaction.startY));

        commitDocument(sanitizeFloatingCanvasDocument({
          ...doc,
          items: doc.items.map((item) => item.id === interaction.itemId ? { ...item, width: nextWidth, height: nextHeight } : item),
        }));
        return;
      }

      const tableItem = currentItem.type === "table" ? currentItem : null;
      if (!tableItem) return;

      const deltaX = event.clientX - interaction.startX;
      const nextColumnWidths = [...interaction.originColumnWidths];
      nextColumnWidths[interaction.columnIndex] = Math.max(80, interaction.originColumnWidths[interaction.columnIndex] + deltaX);
      const nextTableWidth = nextColumnWidths.reduce((sum, width) => sum + width, 0);

      commitDocument(sanitizeFloatingCanvasDocument({
        ...doc,
        items: doc.items.map((item) => item.id === interaction.itemId
          ? { ...tableItem, columnWidths: nextColumnWidths, width: Math.max(nextTableWidth + 24, item.width) }
          : item),
      }));
    }

    function handleMouseUp() {
      setInteraction(null);
      setSnapGuides({ x: null, y: null });
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [commitDocument, doc, interaction]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.key.toLowerCase() === "c" && selectedItemIds.length && !isTypingTarget) {
        event.preventDefault();
        copySelectedItems();
        return;
      }

      if (modifier && event.key.toLowerCase() === "v" && !isTypingTarget) {
        event.preventDefault();
        pasteClipboardItems();
        return;
      }

      if (modifier && event.key.toLowerCase() === "d" && selectedItemIds.length && !isTypingTarget) {
        event.preventDefault();
        duplicateSelectedItems();
        return;
      }

      if (modifier && event.key.toLowerCase() === "a" && !isTypingTarget) {
        event.preventDefault();
        selectAllItems();
        return;
      }

      if (isTypingTarget || !selectedItemIds.length) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeItems(selectedItemIds);
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelectedItemsBy(-step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSelectedItemsBy(step, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelectedItemsBy(0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelectedItemsBy(0, step);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemIds, selectedItems]);

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadImageFile(file);
        }}
      />
      <div className={`flex gap-2 flex-shrink-0 ${compact ? "flex-col" : "items-center flex-wrap"}`}>
        <button
          onClick={insertTextBox}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          <Plus size={11} strokeWidth={2.5} />
          文字方塊
        </button>
        <button
          onClick={insertTableTemplate}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          <Table2 size={11} strokeWidth={2} />
          Word 表格
        </button>
        <button
          onClick={handleSelectUpload}
          disabled={uploadingImage}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-primary/40 bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          {uploadingImage
            ? <Loader size={11} strokeWidth={2} className="animate-spin" />
            : <ImageIcon size={11} strokeWidth={2} />}
          {uploadingImage ? "上傳中" : "上傳圖片"}
        </button>
        <button
          onClick={insertImageTemplate}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          <ImageIcon size={11} strokeWidth={2} />
          插入圖片網址
        </button>
        <button
          onClick={copySelectedItems}
          disabled={!selectedItems.length}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          複製
        </button>
        <button
          onClick={pasteClipboardItems}
          disabled={!clipboardRef.current.length}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          貼上
        </button>
        <button
          onClick={duplicateSelectedItems}
          disabled={!selectedItems.length}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          Duplicate
        </button>
        <button
          onClick={() => setSelectionMode((current) => !current)}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 border transition-colors ${selectionMode ? "border-primary bg-primary/20 text-primary" : "border-border bg-secondary text-foreground hover:bg-white/5"}`}
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          框選模式
        </button>
        <button
          onClick={copyCanvasToAnotherPanel}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          複製到其他 Panel
        </button>
        <button
          onClick={exportCanvasLayout}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          匯出配置
        </button>
        <button
          onClick={importCanvasLayout}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          匯入配置
        </button>
        <div className="flex items-center gap-1 border border-border bg-secondary px-1 py-0.5">
          <span className="text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}>
            背景文字
          </span>
          <button
            onClick={() => updateCanvasTextFontSize(doc.textFontSize - 1)}
            className="w-5 h-5 flex items-center justify-center text-accent hover:text-foreground transition-colors"
            style={{ fontSize: "14px", lineHeight: 1 }}
          >
            -
          </button>
          <span className="w-7 text-center text-accent" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 600 }}>
            {doc.textFontSize}
          </span>
          <button
            onClick={() => updateCanvasTextFontSize(doc.textFontSize + 1)}
            className="w-5 h-5 flex items-center justify-center text-accent hover:text-foreground transition-colors"
            style={{ fontSize: "14px", lineHeight: 1 }}
          >
            +
          </button>
        </div>
      </div>

      <div className="text-muted-foreground/60 flex-shrink-0" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "11px" }}>
        同一個視窗內直接編輯文字，並可加入文字方塊、圖片與表格；支援多選、群組拖曳、複製貼上、旋轉、鎖定、吸附對齊與表格指定位置插入欄列
      </div>

      {uploadMessage && (
        <div
          className={`${uploadMessage.includes("失敗") || uploadMessage.includes("無法") || uploadMessage.includes("只支援") || uploadMessage.includes("未連接")
            ? "text-destructive"
            : "text-primary"} flex-shrink-0`}
          style={{ fontFamily: "'Barlow', sans-serif", fontSize: "11px" }}
        >
          {uploadMessage}
        </div>
      )}

      <div className="flex-1 min-h-0 border border-border bg-background/30 overflow-auto" style={{ scrollbarWidth: "thin" }}>
        <div className="px-3 py-2 text-muted-foreground/70 border-b border-border" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}>
          單一自由畫布
        </div>
        {selectedItem && (
          <div className={`px-3 py-2 border-b border-border bg-background/30 ${compact ? "flex flex-col gap-2" : "flex items-center gap-2 flex-wrap"}`}>
            <span className="text-muted-foreground/70" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}>
              已選取：{selectedItems.length > 1 ? `${selectedItems.length} 個物件` : selectedItem.type === "image" ? "圖片" : selectedItem.type === "table" ? "表格" : "文字方塊"}
            </span>
            <button
              onClick={() => moveItemLayer(selectedItem.id, "backward")}
              className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
            >
              移到後面
            </button>
            <button
              onClick={() => moveItemLayer(selectedItem.id, "forward")}
              className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
            >
              移到前面
            </button>
            <button
              onClick={() => rotateSelectedItems(-15)}
              className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
            >
              左轉 15°
            </button>
            <button
              onClick={() => rotateSelectedItems(15)}
              className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
            >
              右轉 15°
            </button>
            <button
              onClick={toggleLockSelectedItems}
              className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
            >
              {selectedItems.every((item) => item.locked) ? "解除鎖定" : "鎖定物件"}
            </button>
            <button
              onClick={duplicateSelectedItems}
              className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
            >
              Duplicate
            </button>
            <button
              onClick={() => createWrapTextBoxesForItem(selectedItem.id)}
              className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
            >
              建立繞排文字方塊
            </button>
            {selectedItem.type === "text" && (
              <div className="flex items-center gap-1 border border-border bg-secondary px-1 py-0.5">
                <span className="text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}>
                  文字大小
                </span>
                <button
                  onClick={() => updateSelectedTextLikeFontSize(-1)}
                  className="w-5 h-5 flex items-center justify-center text-accent hover:text-foreground transition-colors"
                  style={{ fontSize: "14px", lineHeight: 1 }}
                >
                  -
                </button>
                <span className="w-7 text-center text-accent" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 600 }}>
                  {selectedItem.fontSize}
                </span>
                <button
                  onClick={() => updateSelectedTextLikeFontSize(1)}
                  className="w-5 h-5 flex items-center justify-center text-accent hover:text-foreground transition-colors"
                  style={{ fontSize: "14px", lineHeight: 1 }}
                >
                  +
                </button>
              </div>
            )}
            {selectedItems.length > 1 && (
              <>
                <button
                  onClick={() => alignSelectedItems("left")}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  左對齊
                </button>
                <button
                  onClick={() => alignSelectedItems("center")}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  水平置中
                </button>
                <button
                  onClick={() => alignSelectedItems("right")}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  右對齊
                </button>
                <button
                  onClick={() => alignSelectedItems("top")}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  上對齊
                </button>
                <button
                  onClick={() => alignSelectedItems("middle")}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  垂直置中
                </button>
                <button
                  onClick={() => alignSelectedItems("bottom")}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  下對齊
                </button>
                <button
                  onClick={() => distributeSelectedItems("horizontal")}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  水平等距
                </button>
                <button
                  onClick={() => distributeSelectedItems("vertical")}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  垂直等距
                </button>
              </>
            )}
            {selectedItem.type === "image" && (
              <button
                onClick={() => toggleImageAspectLock(selectedItem.id)}
                className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
              >
                {selectedItem.lockAspectRatio ? "解除比例鎖定" : "鎖定圖片比例"}
              </button>
            )}
            {selectedItem.type === "table" && (
              <>
                <button
                  onClick={() => addTableRow(selectedItem.id, tableSelection?.itemId === selectedItem.id && tableSelection.area === "body" ? tableSelection.rowIndex : 0)}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  在上方加列
                </button>
                <button
                  onClick={() => addTableRow(selectedItem.id, tableSelection?.itemId === selectedItem.id && tableSelection.area === "body" ? tableSelection.rowIndex + 1 : undefined)}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  在下方加列
                </button>
                <button
                  onClick={() => removeTableRow(selectedItem.id, tableSelection?.itemId === selectedItem.id && tableSelection.area === "body" ? tableSelection.rowIndex : undefined)}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  刪除此列
                </button>
                <button
                  onClick={() => addTableColumn(selectedItem.id, tableSelection?.itemId === selectedItem.id ? tableSelection.columnIndex : 0)}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  在左側加欄
                </button>
                <button
                  onClick={() => addTableColumn(selectedItem.id, tableSelection?.itemId === selectedItem.id ? tableSelection.columnIndex + 1 : undefined)}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  在右側加欄
                </button>
                <button
                  onClick={() => removeTableColumn(selectedItem.id, tableSelection?.itemId === selectedItem.id ? tableSelection.columnIndex : undefined)}
                  className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  刪除此欄
                </button>
              </>
            )}
          </div>
        )}
        <div
          ref={canvasRef}
          className="relative min-w-full bg-background/10"
          style={{ height: `${doc.canvasHeight}px` }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedItemIds([]);
              setTableSelection(null);
            }
          }}
        >
          <textarea
            value={doc.text}
            onChange={(event) => updateDocument((currentDoc) => sanitizeFloatingCanvasDocument({
              ...currentDoc,
              text: event.target.value,
            }))}
            placeholder={"請直接輸入文字內容\n圖片與表格可在這張畫布上自由移動"}
            className="absolute inset-0 w-full h-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/30 outline-none"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: `${doc.textFontSize}px`,
              lineHeight: 1.7,
              padding: "18px",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              wordBreak: compact ? "break-word" : "normal",
              pointerEvents: selectionMode ? "none" : "auto",
            }}
          />
          {selectionMode && (
            <div
              className="absolute inset-0 z-20 cursor-crosshair bg-transparent"
              onMouseDown={(event) => {
                event.stopPropagation();
                const bounds = canvasRef.current?.getBoundingClientRect();
                if (!bounds) return;
                const startX = event.clientX - bounds.left;
                const startY = event.clientY - bounds.top;
                setSelectionBox({ startX, startY, currentX: startX, currentY: startY });
              }}
              onMouseMove={(event) => {
                if (!selectionBox) return;
                const bounds = canvasRef.current?.getBoundingClientRect();
                if (!bounds) return;
                setSelectionBox((current) => current ? {
                  ...current,
                  currentX: event.clientX - bounds.left,
                  currentY: event.clientY - bounds.top,
                } : current);
              }}
              onMouseUp={() => {
                if (!selectionBox) return;
                const left = Math.min(selectionBox.startX, selectionBox.currentX);
                const right = Math.max(selectionBox.startX, selectionBox.currentX);
                const top = Math.min(selectionBox.startY, selectionBox.currentY);
                const bottom = Math.max(selectionBox.startY, selectionBox.currentY);

                const nextSelection = doc.items
                  .filter((item) => item.x < right && item.x + item.width > left && item.y < bottom && item.y + item.height > top)
                  .map((item) => item.id);

                setSelectedItemIds(nextSelection);
                setSelectionBox(null);
                setSelectionMode(false);
              }}
            />
          )}

          {snapGuides.x !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-primary/70 pointer-events-none"
              style={{ left: `${snapGuides.x}px` }}
            />
          )}
          {snapGuides.y !== null && (
            <div
              className="absolute left-0 right-0 h-px bg-primary/70 pointer-events-none"
              style={{ top: `${snapGuides.y}px` }}
            />
          )}
          {selectionBox && (
            <div
              className="absolute border border-primary bg-primary/10 pointer-events-none"
              style={{
                left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
              }}
            />
          )}

          {doc.items.map((item, itemIndex) => (
            <div
              key={item.id}
              className={`absolute border shadow-lg ${selectedItemIds.includes(item.id) ? "border-primary ring-1 ring-primary/60" : "border-border"} ${item.locked ? "opacity-95" : ""} bg-card/95 backdrop-blur-sm`}
              style={{
                left: `${item.x}px`,
                top: `${item.y}px`,
                width: `${item.width}px`,
                height: `${item.height}px`,
                zIndex: selectedItemIds.includes(item.id) ? 1000 + itemIndex : 100 + itemIndex,
                transform: `rotate(${item.rotation}deg)`,
                transformOrigin: "center",
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
                selectItem(item.id, event.shiftKey);
              }}
            >
              <div
                className="flex items-center justify-between gap-2 border-b border-border bg-background/80 px-2 py-1 cursor-move"
                onMouseDown={(event) => beginMove(event, item)}
              >
                <div className="flex items-center gap-2 text-muted-foreground/70">
                  <GripVertical size={12} strokeWidth={2.2} />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}>
                    {item.type === "image" ? "圖片物件" : item.type === "table" ? "表格物件" : "文字方塊"}{item.locked ? " 已鎖定" : ""}
                  </span>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>

              {item.type === "image" ? (
                <div className="flex h-[calc(100%-29px)] flex-col gap-2 p-2">
                  <div className="flex-1 overflow-hidden bg-black/20">
                    <img
                      src={item.src}
                      alt={item.alt || "Panel image"}
                      className="w-full h-full object-contain"
                      onLoad={(event) => {
                        const target = event.currentTarget;
                        if (!target.naturalWidth || !target.naturalHeight) return;
                        const nextAspectRatio = target.naturalWidth / target.naturalHeight;
                        if (Math.abs(nextAspectRatio - item.aspectRatio) > 0.05) {
                          updateItem(item.id, (currentItem) => currentItem.type === "image"
                            ? { ...currentItem, aspectRatio: nextAspectRatio, height: currentItem.lockAspectRatio ? Math.max(MIN_FLOATING_ITEM_HEIGHT, Math.round(currentItem.width / nextAspectRatio)) : currentItem.height }
                            : currentItem);
                        }
                      }}
                      loading="lazy"
                    />
                  </div>
                  <input
                    value={item.alt}
                    disabled={item.locked}
                    onChange={(event) => updateItem(item.id, (currentItem) => currentItem.type === "image"
                      ? { ...currentItem, alt: event.target.value }
                      : currentItem)}
                    placeholder="圖片說明"
                    className="w-full border border-border bg-transparent px-2 py-1 text-foreground outline-none"
                    style={{ fontFamily: "'Barlow', sans-serif", fontSize: "11px" }}
                  />
                  <div className={`flex gap-2 ${compact ? "flex-col" : "items-center flex-wrap"}`}>
                    <span className="text-primary" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}>
                      {Math.round((item.width / 420) * 100)}%
                    </span>
                    <button
                      onClick={() => updateItem(item.id, (currentItem) => currentItem.type === "image"
                        ? {
                          ...currentItem,
                          width: Math.max(MIN_FLOATING_ITEM_WIDTH, currentItem.width - 40),
                          height: currentItem.lockAspectRatio
                            ? Math.max(MIN_FLOATING_ITEM_HEIGHT, Math.round(Math.max(MIN_FLOATING_ITEM_WIDTH, currentItem.width - 40) / currentItem.aspectRatio))
                            : currentItem.height,
                        }
                        : currentItem)}
                      className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                    >
                      縮小
                    </button>
                    <button
                      onClick={() => updateItem(item.id, (currentItem) => currentItem.type === "image"
                        ? {
                          ...currentItem,
                          width: currentItem.width + 40,
                          height: currentItem.lockAspectRatio
                            ? Math.max(MIN_FLOATING_ITEM_HEIGHT, Math.round((currentItem.width + 40) / currentItem.aspectRatio))
                            : currentItem.height,
                        }
                        : currentItem)}
                      className="px-2 py-1 border border-border bg-secondary text-foreground hover:bg-white/5 transition-colors"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}
                    >
                      放大
                    </button>
                  </div>
                </div>
              ) : item.type === "text" ? (
                <div className="h-[calc(100%-29px)] p-2">
                  <textarea
                    value={item.text}
                    disabled={item.locked}
                    onChange={(event) => updateItem(item.id, (currentItem) => currentItem.type === "text"
                      ? { ...currentItem, text: event.target.value }
                      : currentItem)}
                    placeholder="請輸入文字方塊內容"
                    className="w-full h-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/30 outline-none"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: `${item.fontSize}px`,
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  />
                </div>
              ) : (
                <div className="h-[calc(100%-29px)] overflow-auto p-2" style={{ scrollbarWidth: "thin" }}>
                  <div className={`mb-2 flex gap-2 ${compact ? "flex-col" : "items-center justify-between"}`}>
                    <span className="text-muted-foreground/70" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700 }}>
                      表格文字大小
                    </span>
                    <div className="flex items-center gap-1 border border-border bg-secondary px-1 py-0.5">
                      <button
                        onClick={() => updateItem(item.id, (currentItem) => currentItem.type === "table"
                          ? { ...currentItem, fontSize: Math.max(MIN_EDITOR_FONT_SIZE, currentItem.fontSize - 1) }
                          : currentItem)}
                        className="w-5 h-5 flex items-center justify-center text-accent hover:text-foreground transition-colors"
                        style={{ fontSize: "14px", lineHeight: 1 }}
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-accent" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 600 }}>
                        {item.fontSize}
                      </span>
                      <button
                        onClick={() => updateItem(item.id, (currentItem) => currentItem.type === "table"
                          ? { ...currentItem, fontSize: Math.min(MAX_EDITOR_FONT_SIZE, currentItem.fontSize + 1) }
                          : currentItem)}
                        className="w-5 h-5 flex items-center justify-center text-accent hover:text-foreground transition-colors"
                        style={{ fontSize: "14px", lineHeight: 1 }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <table className="border-collapse" style={{ tableLayout: "fixed", minWidth: "100%" }}>
                    <colgroup>
                      {item.columnWidths.map((width, columnIndex) => (
                        <col key={`col-${item.id}-${columnIndex}`} style={{ width: `${width}px` }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        {item.headers.map((header, columnIndex) => (
                          <th key={`header-${item.id}-${columnIndex}`} className={`relative border border-border p-0 align-top ${tableSelection?.itemId === item.id && tableSelection.columnIndex === columnIndex && tableSelection.area === "header" ? "bg-primary/20" : "bg-background/70"}`}>
                            <input
                              value={header}
                              disabled={item.locked}
                              onFocus={() => setTableSelection({ itemId: item.id, rowIndex: 0, columnIndex, area: "header" })}
                              onChange={(event) => updateItem(item.id, (currentItem) => {
                                if (currentItem.type !== "table") return currentItem;
                                const nextHeaders = [...currentItem.headers];
                                nextHeaders[columnIndex] = event.target.value;
                                return { ...currentItem, headers: nextHeaders };
                              })}
                              className="w-full bg-transparent px-2 py-2 text-foreground outline-none"
                              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: `${Math.max(item.fontSize, 11)}px`, fontWeight: 700 }}
                            />
                            <div
                              className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                              onMouseDown={(event) => beginColumnResize(event, item, columnIndex)}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {item.rows.map((row, rowIndex) => (
                        <tr key={`row-${item.id}-${rowIndex}`}>
                          {row.map((cell, cellIndex) => (
                            <td key={`cell-${item.id}-${rowIndex}-${cellIndex}`} className={`border p-0 align-top ${tableSelection?.itemId === item.id && tableSelection.rowIndex === rowIndex && tableSelection.columnIndex === cellIndex && tableSelection.area === "body" ? "border-primary bg-primary/10" : "border-border bg-background/40"}`}>
                              <textarea
                                value={cell}
                                disabled={item.locked}
                                onFocus={() => setTableSelection({ itemId: item.id, rowIndex, columnIndex: cellIndex, area: "body" })}
                                onChange={(event) => updateItem(item.id, (currentItem) => {
                                  if (currentItem.type !== "table") return currentItem;
                                  const nextRows = currentItem.rows.map((currentRow) => [...currentRow]);
                                  nextRows[rowIndex][cellIndex] = event.target.value;
                                  return { ...currentItem, rows: nextRows };
                                })}
                                className="w-full resize-none bg-transparent px-2 py-2 text-foreground outline-none"
                                rows={Math.max(2, cell.split("\n").length)}
                                style={{ fontFamily: "'Barlow', sans-serif", fontSize: `${Math.max(item.fontSize, 11)}px`, whiteSpace: "pre-wrap" }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div
                className={`absolute bottom-1 right-1 h-4 w-4 rounded-sm border border-border bg-background/80 ${item.locked ? "cursor-not-allowed opacity-50" : "cursor-se-resize"}`}
                onMouseDown={(event) => beginResize(event, item)}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-border px-3 py-2 text-muted-foreground/50" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "11px" }}>
          提示：可用 Shift 或框選模式多選物件並群組拖曳；`Ctrl/Cmd + A` 全選、`Ctrl/Cmd + C` 複製、`Ctrl/Cmd + V` 貼上、`Ctrl/Cmd + D` duplicate；方向鍵微調位置，Shift + 方向鍵快速移動；可對齊、等距分佈、複製到其他 Panel，也可匯出／匯入配置。
        </div>
      </div>
    </div>
  );
}

// ── Mode selector dropdown ─────────────────────────────────────────────────────

const MODE_OPTIONS: { value: PanelMode; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "文字", icon: FileText },
  { value: "api", label: "API", icon: Link },
  { value: "live", label: "直播", icon: Activity },
  { value: "embed", label: "嵌入", icon: Globe },
];

function ModeSelector({
  value,
  onChange,
}: {
  value: PanelMode;
  onChange: (m: PanelMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODE_OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 border border-border bg-secondary hover:bg-white/5 transition-colors justify-between"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700, width: "112px", minWidth: "112px" }}
      >
        <div className="flex items-center gap-1.5">
          <current.icon size={10} strokeWidth={2} className="text-muted-foreground" />
          <span className="text-foreground">{current.label}</span>
        </div>
        <ChevronDown size={9} strokeWidth={2.5} className={`text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 border border-border bg-card shadow-xl" style={{ width: "112px" }}>
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors ${opt.value === value ? "text-primary" : "text-foreground"}`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.06em", fontWeight: 600 }}
            >
              <opt.icon size={11} strokeWidth={2} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigInput({
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onEnter?: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      placeholder={placeholder}
      spellCheck={false}
      className="flex-1 min-w-0 bg-secondary border border-border px-2 py-1.5 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}
    />
  );
}

type ParsedFeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
};

type ParsedFeed = {
  title: string;
  description: string;
  items: ParsedFeedItem[];
};

function normalizeApiUrl(url: string) {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }

  return trimmed;
}

function looksLikeFeedUrl(url: string) {
  return /(\.xml($|[?#]))|(\/rss\/)|rss|atom/i.test(url);
}

function buildApiRequestCandidates(url: string) {
  const normalizedUrl = normalizeApiUrl(url);
  const candidates = [normalizedUrl];

  if (looksLikeFeedUrl(normalizedUrl)) {
    candidates.push(`https://corsproxy.io/?url=${encodeURIComponent(normalizedUrl)}`);
    candidates.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`);
  }

  return Array.from(new Set(candidates));
}

function getXmlChildText(parent: Element | null | undefined, tagNames: string[]) {
  if (!parent) return "";

  for (const tagName of tagNames) {
    const match = Array.from(parent.children).find((child) => {
      const normalized = child.tagName.toLowerCase();
      const expected = tagName.toLowerCase();
      return normalized === expected || normalized.endsWith(`:${expected}`);
    });

    const value = match?.textContent?.trim();
    if (value) return value;
  }

  return "";
}

function getFeedItemLink(item: Element) {
  const linkNode = Array.from(item.children).find((child) => {
    const normalized = child.tagName.toLowerCase();
    return normalized === "link" || normalized.endsWith(":link");
  });

  if (!linkNode) return "";

  const href = linkNode.getAttribute("href")?.trim();
  if (href) return href;

  return linkNode.textContent?.trim() ?? "";
}

function parseApiFeed(text: string): ParsedFeed | null {
  if (typeof DOMParser === "undefined") return null;

  const trimmed = text.trim();
  if (!trimmed.startsWith("<")) return null;

  const xml = new DOMParser().parseFromString(trimmed, "application/xml");
  if (xml.querySelector("parsererror")) return null;

  const rssItems = Array.from(xml.getElementsByTagName("item"));
  const atomEntries = Array.from(xml.getElementsByTagName("entry"));
  const sourceItems = rssItems.length ? rssItems : atomEntries;
  if (!sourceItems.length) return null;

  const channel = xml.getElementsByTagName("channel")[0];
  const feed = xml.getElementsByTagName("feed")[0];
  const metaRoot = channel ?? feed ?? xml.documentElement;

  const items = sourceItems
    .map((item) => ({
      title: getXmlChildText(item, ["title"]),
      link: getFeedItemLink(item),
      pubDate: getXmlChildText(item, ["pubDate", "published", "updated"]),
      description: getXmlChildText(item, ["description", "summary", "content"]),
    }))
    .filter((item) => item.title || item.link || item.description)
    .slice(0, 20);

  if (!items.length) return null;

  return {
    title: getXmlChildText(metaRoot, ["title"]) || "RSS Feed",
    description: getXmlChildText(metaRoot, ["description", "subtitle"]),
    items,
  };
}

// ── API view ───────────────────────────────────────────────────────────────────

function ApiView({
  panel,
  onUrlChange,
  onFetch,
  fontSize,
  compact,
}: {
  panel: PanelData;
  onUrlChange: (v: string) => void;
  onFetch: () => void;
  fontSize: number;
  compact: boolean;
}) {
  const parsedFeed = useMemo(() => {
    if (panel.apiResponse === null) return null;
    return parseApiFeed(panel.apiResponse);
  }, [panel.apiResponse]);
  const apiFeedOptions = [
    { label: "RTHK 本地快訊", value: "https://rthk9.rthk.hk/rthk/news/rss/c_expressnews_clocal.xml" },
    { label: "政府新聞網", value: "https://www.news.gov.hk/tc/common/html/topstories.rss.xml" },
  ] as const;

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      {/* URL input row */}
      <div className={`flex gap-2 flex-shrink-0 ${compact ? "flex-col" : "items-center"}`}>
        <ConfigInput
          value={panel.apiUrl}
          onChange={onUrlChange}
          onEnter={onFetch}
          placeholder="https://api.example.com/endpoint"
        />
        <button
          onClick={onFetch}
          disabled={panel.apiLoading || !panel.apiUrl.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          {panel.apiLoading
            ? <Loader size={11} strokeWidth={2} className="animate-spin" />
            : <RefreshCw size={11} strokeWidth={2} />}
          {panel.apiLoading ? "FETCHING" : "FETCH"}
        </button>
      </div>
      <div className={`flex gap-2 flex-shrink-0 ${compact ? "flex-col" : "flex-wrap items-center"}`}>
        {apiFeedOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onUrlChange(option.value)}
            className={`px-3 py-1.5 border transition-colors ${
              panel.apiUrl.trim() === option.value
                ? "border-primary/50 bg-primary/20 text-primary"
                : "border-border bg-secondary text-foreground hover:bg-white/5"
            }`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Response area */}
      <div className="flex-1 min-h-0 overflow-auto border border-border bg-background/50 p-2" style={{ scrollbarWidth: "none" }}>
        {panel.apiError ? (
          <div className="flex items-start gap-2 text-destructive">
            <AlertTriangle size={12} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: `${fontSize}px`, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {panel.apiError}
            </span>
          </div>
        ) : parsedFeed ? (
          <div className="flex flex-col gap-3">
            <div className="border border-border bg-background/60 p-3">
              <div
                className="text-foreground uppercase"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: `${Math.max(fontSize + 2, 13)}px`, letterSpacing: "0.08em", fontWeight: 700 }}
              >
                {parsedFeed.title}
              </div>
              {parsedFeed.description && (
                <p className="mt-1 text-muted-foreground/80" style={{ fontFamily: "'Barlow', sans-serif", fontSize: `${fontSize}px`, margin: 0 }}>
                  {parsedFeed.description}
                </p>
              )}
            </div>

            {parsedFeed.items.map((item, index) => (
              <article key={`${item.link || item.title}-${index}`} className="border border-border bg-background/60 p-3">
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: `${Math.max(fontSize + 1, 12)}px`, letterSpacing: "0.04em", fontWeight: 700 }}
                  >
                    {item.title || item.link}
                  </a>
                ) : (
                  <div
                    className="text-foreground"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: `${Math.max(fontSize + 1, 12)}px`, letterSpacing: "0.04em", fontWeight: 700 }}
                  >
                    {item.title}
                  </div>
                )}

                {item.pubDate && (
                  <div className="mt-1 text-muted-foreground/70" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: `${Math.max(fontSize - 1, 10)}px` }}>
                    {item.pubDate}
                  </div>
                )}

                {item.description && (
                  <p
                    className="mt-2 text-foreground/85"
                    style={{ fontFamily: "'Barlow', sans-serif", fontSize: `${fontSize}px`, marginBottom: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {item.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : panel.apiResponse !== null ? (
          <pre
            className="text-accent"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: `${fontSize}px`, whiteSpace: compact ? "pre-wrap" : "pre", wordBreak: "break-all", margin: 0, overflowX: compact ? "hidden" : "auto" }}
          >
            {panel.apiResponse}
          </pre>
        ) : (
          <p className="text-muted-foreground/40 text-center mt-4" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "12px" }}>
            輸入 URL 並按 FETCH 取得資料
          </p>
        )}
      </div>
    </div>
  );
}

function LivePlayer({
  src,
  poster,
}: {
  src: string;
  poster: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cleanSrc = src.trim();
    const cleanPoster = poster.trim();
    let hls: Hls | null = null;
    let dashPlayer: dashjs.MediaPlayerClass | null = null;
    setPlayerError(null);

    if (cleanPoster) video.poster = cleanPoster;
    else video.removeAttribute("poster");

    if (!cleanSrc) {
      video.removeAttribute("src");
      video.load();
      return;
    }

    const handleVideoError = () => setPlayerError("直播來源無法播放，請檢查網址或串流格式");
    video.addEventListener("error", handleVideoError);

    if (cleanSrc.endsWith(".m3u8")) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = cleanSrc;
      } else if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(cleanSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setPlayerError("HLS 串流初始化失敗，請確認直播連結可公開存取");
        });
      } else {
        setPlayerError("目前瀏覽器不支援 HLS 直播");
      }
    } else if (cleanSrc.endsWith(".mpd")) {
      try {
        dashPlayer = dashjs.MediaPlayer().create();
        dashPlayer.initialize(video, cleanSrc, true);
        dashPlayer.updateSettings({
          streaming: {
            abr: {
              autoSwitchBitrate: {
                video: true,
                audio: true,
              },
            },
          },
        });
        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, () => {
          setPlayerError("DASH 串流初始化失敗，請確認 .mpd 來源可公開存取");
        });
      } catch {
        setPlayerError("目前瀏覽器無法初始化 DASH 播放");
      }
    } else {
      video.src = cleanSrc;
    }

    video.load();

    return () => {
      video.removeEventListener("error", handleVideoError);
      if (hls) hls.destroy();
      if (dashPlayer) dashPlayer.reset();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [poster, src]);

  if (!src.trim()) {
    return (
      <p className="text-muted-foreground/40 text-center mt-4" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "12px" }}>
        輸入直播來源，例如 `mp4`、`m3u8` 或 `mpd`
      </p>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <video
        ref={videoRef}
        className="w-full flex-1 min-h-0 bg-black"
        controls
        autoPlay
        playsInline
        crossOrigin="anonymous"
      />
      {playerError && (
        <div className="flex items-start gap-2 text-destructive">
          <AlertTriangle size={12} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
          <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: "12px" }}>{playerError}</span>
        </div>
      )}
    </div>
  );
}

function LiveView({
  panel,
  onLiveUrlChange,
  onPosterUrlChange,
  compact,
}: {
  panel: PanelData;
  onLiveUrlChange: (value: string) => void;
  onPosterUrlChange: (value: string) => void;
  compact: boolean;
}) {
  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      <div className={`flex gap-2 flex-shrink-0 ${compact ? "flex-col" : "items-center"}`}>
        <ConfigInput value={panel.liveUrl} onChange={onLiveUrlChange} placeholder="https://example.com/live.m3u8 或 .mpd" />
        <ConfigInput value={panel.posterUrl} onChange={onPosterUrlChange} placeholder="Poster URL（可留空）" />
      </div>
      <div className="flex-1 min-h-0 overflow-auto border border-border bg-background/50 p-2" style={{ scrollbarWidth: "none" }}>
        <LivePlayer src={panel.liveUrl} poster={panel.posterUrl} />
      </div>
    </div>
  );
}

function EmbedView({
  url,
  onUrlChange,
  compact,
}: {
  url: string;
  onUrlChange: (value: string) => void;
  compact: boolean;
}) {
  const cleanUrl = url.trim();
  const liveEmbedOptions = [
    { label: "TVB 無線新聞台", value: "https://news.tvb.com/tc/live/C" },
    { label: "Now 331 直播台", value: "https://news.now.com/home/live331a" },
    { label: "Now 332 新聞台", value: "https://news.now.com/home/live" },
  ] as const;
  const isCroppedLiveEmbed = liveEmbedOptions.some((option) => option.value === cleanUrl);

  if (cleanUrl && isCroppedLiveEmbed) {
    return (
      <div className="h-full flex flex-col gap-2 min-h-0">
        <div className={`flex gap-2 flex-shrink-0 ${compact ? "flex-col" : "items-center"}`}>
          <ConfigInput value={url} onChange={onUrlChange} placeholder="https://example.com/embed" />
        </div>
        <div className={`flex gap-2 flex-shrink-0 ${compact ? "flex-col" : "flex-wrap items-center"}`}>
          {liveEmbedOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onUrlChange(option.value)}
              className={`px-3 py-1.5 border transition-colors ${
                cleanUrl === option.value
                  ? "border-primary/50 bg-primary/20 text-primary"
                  : "border-border bg-secondary text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden border border-border bg-background/50 p-2">
          <div className="h-full flex flex-col gap-2">
            <div className="relative flex-1 overflow-hidden bg-black border border-border">
              <iframe
                src={cleanUrl}
                title="Embedded content"
                className="absolute border-0 bg-black"
                allow="autoplay; fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                style={{ top: "-10%", left: "-24%", width: "150%", height: "160%" }}
              />
            </div>
            <p className="text-muted-foreground/60" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "11px" }}>
              已套用直播裁切視圖，會盡量只顯示直播畫面；若目標網站改版，裁切位置可能需要再調整。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      <div className={`flex gap-2 flex-shrink-0 ${compact ? "flex-col" : "items-center"}`}>
        <ConfigInput value={url} onChange={onUrlChange} placeholder="https://example.com/embed" />
      </div>
      <div className={`flex gap-2 flex-shrink-0 ${compact ? "flex-col" : "flex-wrap items-center"}`}>
        {liveEmbedOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onUrlChange(option.value)}
            className={`px-3 py-1.5 border transition-colors ${
              cleanUrl === option.value
                ? "border-primary/50 bg-primary/20 text-primary"
                : "border-border bg-secondary text-foreground hover:bg-white/5"
            }`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden border border-border bg-background/50 p-2">
        {cleanUrl ? (
          <div className="h-full flex flex-col gap-2">
            <div className={isCroppedLiveEmbed ? "relative flex-1 overflow-hidden bg-black border border-border" : "flex-1"}>
              <iframe
                src={cleanUrl}
                title="Embedded content"
                className={isCroppedLiveEmbed ? "absolute border-0 bg-black" : "w-full h-full border-0 bg-black"}
                allow="autoplay; fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                style={isCroppedLiveEmbed ? { top: "-10%", left: "-24%", width: "150%", height: "160%" } : undefined}
              />
            </div>
            <p className="text-muted-foreground/60" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "11px" }}>
              若目標網站禁止 iframe 嵌入，畫面可能無法顯示。
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground/40 text-center mt-4" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "12px" }}>
            輸入可嵌入的網址或 iframe src
          </p>
        )}
      </div>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────────

const TITLE_MIN = 8;
const TITLE_MAX = 28;
const BODY_MIN = 8;
const BODY_MAX = 32;


function Panel({
  data,
  onTitleChange,
  onContentChange,
  onTitleSizeChange,
  onBodySizeChange,
  onModeChange,
  onApiUrlChange,
  onLiveUrlChange,
  onEmbedUrlChange,
  onPosterUrlChange,
  onApiFetch,
  onRemove,
  compact,
  availableTextPanels,
  onCopyLayoutToPanel,
}: {
  data: PanelData;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onTitleSizeChange: (v: number) => void;
  onBodySizeChange: (v: number) => void;
  onModeChange: (m: PanelMode) => void;
  onApiUrlChange: (v: string) => void;
  onLiveUrlChange: (v: string) => void;
  onEmbedUrlChange: (v: string) => void;
  onPosterUrlChange: (v: string) => void;
  onApiFetch: () => void;
  onRemove: () => void;
  compact: boolean;
  availableTextPanels: Array<{ id: string; title: string }>;
  onCopyLayoutToPanel: (targetPanelId: string, content: string) => void;
}) {
  return (
    <div className="bg-card border border-border h-full flex flex-col overflow-hidden group/panel">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 select-none"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <div className="drag-handle flex items-center justify-center w-5 h-5 flex-shrink-0 cursor-grab active:cursor-grabbing">
          <GripVertical size={14} className="text-white/50 group-hover/panel:text-white transition-colors" strokeWidth={2.5} />
        </div>
        <EditableTitle value={data.title} onChange={onTitleChange} fontSize={data.titleSize} />

        {/* Title size control — inline next to title */}
        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover/panel:opacity-100 transition-opacity flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => onTitleSizeChange(Math.max(TITLE_MIN, data.titleSize - 1))}
            className="w-5 h-5 flex items-center justify-center rounded-sm bg-primary/20 text-primary hover:bg-primary/40 transition-colors font-bold"
            style={{ fontSize: "14px", lineHeight: 1 }}
          >−</button>
          <span className="w-6 text-center text-primary" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 600 }}>
            {data.titleSize}
          </span>
          <button
            onClick={() => onTitleSizeChange(Math.min(TITLE_MAX, data.titleSize + 1))}
            className="w-5 h-5 flex items-center justify-center rounded-sm bg-primary/20 text-primary hover:bg-primary/40 transition-colors font-bold"
            style={{ fontSize: "14px", lineHeight: 1 }}
          >+</button>
        </div>

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="flex-shrink-0 text-muted-foreground/40 md:text-muted-foreground/0 md:group-hover/panel:text-muted-foreground/40 hover:!text-destructive transition-colors"
        >
          <X size={11} strokeWidth={2} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Mode bar */}
        <div
          className="flex items-center gap-2 px-3 border-b border-border flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.01)", height: "36px", minHeight: "36px" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ModeSelector value={data.mode} onChange={onModeChange} />
          <span className="flex-1" />
          {/* Body size control */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onBodySizeChange(Math.max(BODY_MIN, data.bodySize - 1))}
              className="w-5 h-5 flex items-center justify-center rounded-sm bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-bold"
              style={{ fontSize: "14px", lineHeight: 1 }}
            >−</button>
            <span className="w-6 text-center text-accent" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 600 }}>
              {data.bodySize}
            </span>
            <button
              onClick={() => onBodySizeChange(Math.min(BODY_MAX, data.bodySize + 1))}
              className="w-5 h-5 flex items-center justify-center rounded-sm bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-bold"
              style={{ fontSize: "14px", lineHeight: 1 }}
            >+</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-3" onMouseDown={(e) => e.stopPropagation()}>
          {data.mode === "text" ? (
            <TextModeEditor
              value={data.content}
              onChange={onContentChange}
              fontSize={data.bodySize}
              compact={compact}
              panelId={data.id}
              availableTextPanels={availableTextPanels}
              onCopyLayoutToPanel={onCopyLayoutToPanel}
            />
          ) : data.mode === "api" ? (
            <ApiView panel={data} onUrlChange={onApiUrlChange} onFetch={onApiFetch} fontSize={data.bodySize} compact={compact} />
          ) : data.mode === "live" ? (
            <LiveView panel={data} onLiveUrlChange={onLiveUrlChange} onPosterUrlChange={onPosterUrlChange} compact={compact} />
          ) : (
            <EmbedView url={data.embedUrl} onUrlChange={onEmbedUrlChange} compact={compact} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────

type NavKey = "overview" | "traffic" | "services" | "database" | "alerts";
const ROW_HEIGHT = 38;
const MARGIN: [number, number] = [8, 8];
let uidCounter = 100;

export default function App() {
  const [activeNav, setActiveNav] = useState<NavKey>("overview");
  const [panels, setPanels] = useState<PanelData[]>(DEFAULT_PANELS);
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT);
  const [containerWidth, setContainerWidth] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<BreakpointKey>("lg");
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [isHydrating, setIsHydrating] = useState(Boolean(supabase));
  const [syncState, setSyncState] = useState<SyncState>(() => (supabase ? "idle" : "offline"));
  const [syncMessage, setSyncMessage] = useState(() => (supabase ? "Preparing cloud sync" : "Supabase not configured"));
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState(Boolean(supabase));
  const [darkMode, setDarkMode] = useState(() => {
    document.documentElement.classList.add("dark");
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isPhone = viewportWidth < BREAKPOINTS.sm;
  const isTabletOrBelow = viewportWidth < BREAKPOINTS.lg;
  const isCompactLayout = currentBreakpoint !== "lg";
  const useStackedLayout = isTabletOrBelow;
  const responsiveLayouts = useMemo<Layouts>(() => {
    const desktopLayout = ensureDesktopLayout(layout, panels);
    const tabletLayout = scaleLayoutToCols(desktopLayout, TABLET_COLS);
    const mobileLayout = stackLayoutForMobile(desktopLayout, panels);

    return {
      lg: desktopLayout,
      md: tabletLayout,
      sm: mobileLayout,
      xs: mobileLayout,
      xxs: mobileLayout,
    };
  }, [layout, panels]);
  const orderedPanels = useMemo(() => {
    const desktopLayout = ensureDesktopLayout(layout, panels);
    const orderedIds = desktopLayout.slice().sort(sortLayoutItems).map((item) => item.i);
    const panelMap = new Map(panels.map((panel) => [panel.id, panel]));
    return orderedIds
      .map((id) => panelMap.get(id))
      .filter((panel): panel is PanelData => Boolean(panel));
  }, [layout, panels]);
  const desktopLayoutMap = useMemo(
    () => new Map(ensureDesktopLayout(layout, panels).map((item) => [item.i, item])),
    [layout, panels],
  );

  const containerElRef = useRef<HTMLDivElement | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerElRef.current = node;
  }, []);

  useEffect(() => {
    const node = containerElRef.current;
    if (!node) return;
    const measure = () => {
      const w = node.getBoundingClientRect().width || node.offsetWidth || node.clientWidth;
      if (w > 0) setContainerWidth(w);
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(node);
    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 200);
    return () => { obs.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPhone) setMobileSidebarOpen(false);
  }, [isPhone]);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      if (!supabase) {
        setRemoteSyncEnabled(false);
        setSyncState("offline");
        setSyncMessage("Supabase not configured");
        setIsHydrating(false);
        return;
      }

      setSyncState("saving");
      setSyncMessage("Loading dashboard from Supabase");

      const { data, error } = await supabase
        .from(DASHBOARD_TABLE)
        .select("id, panels, layout, updated_at")
        .eq("id", DASHBOARD_ROW_ID)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        setRemoteSyncEnabled(false);
        setSyncState("error");
        setSyncMessage(error.message);
        setIsHydrating(false);
        return;
      }

      if (data) {
        const nextPanels = parsePanels(data.panels);
        const nextLayout = parseLayout(data.layout, nextPanels);
        syncUidCounter(nextPanels);
        setPanels(nextPanels);
        setLayout(nextLayout);
        setSyncState("saved");
        setSyncMessage("Loaded from Supabase");
      } else {
        const nextPanels = cloneDefaultPanels();
        const nextLayout = cloneDefaultLayout();
        syncUidCounter(nextPanels);
        setPanels(nextPanels);
        setLayout(nextLayout);
        setSyncState("idle");
        setSyncMessage("Using default dashboard");
      }

      setRemoteSyncEnabled(true);
      setIsHydrating(false);
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) return;

    if (!supabase) {
      setSyncState("offline");
      setSyncMessage("Supabase not configured");
      return;
    }

    if (!remoteSyncEnabled) return;

    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);

    setSyncState("saving");
    setSyncMessage("Saving dashboard");

    const timeoutId = window.setTimeout(async () => {
      const { error } = await supabase.from(DASHBOARD_TABLE).upsert({
        id: DASHBOARD_ROW_ID,
        panels: toPersistedPanels(panels),
        layout,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setSyncState("error");
        setSyncMessage(error.message);
        return;
      }

      setSyncState("saved");
      setSyncMessage(`Saved at ${new Date().toLocaleTimeString()}`);
    }, SAVE_DEBOUNCE_MS);

    saveTimeoutRef.current = timeoutId;

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isHydrating, layout, panels, remoteSyncEnabled]);

  function addPanel() {
    const id = `p${++uidCounter}`;
    setPanels((prev) => [...prev, makePanel(id, "New Panel", "")]);
    setLayout((prev) => [...prev, { i: id, x: 0, y: Infinity, w: 4, h: 5, minW: 2, minH: 3 }]);
  }

  function removePanel(id: string) {
    setPanels((prev) => prev.filter((p) => p.id !== id));
    setLayout((prev) => prev.filter((l) => l.i !== id));
  }

  function updateTitle(id: string, title: string) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, title } : p));
  }

  function updateContent(id: string, content: string) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, content } : p));
  }

  function updateTitleSize(id: string, titleSize: number) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, titleSize } : p));
  }

  function updateBodySize(id: string, bodySize: number) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, bodySize } : p));
  }

  function updateMode(id: string, mode: PanelMode) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, mode } : p));
  }

  function updateApiUrl(id: string, apiUrl: string) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, apiUrl } : p));
  }

  function updateLiveUrl(id: string, liveUrl: string) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, liveUrl } : p));
  }

  function updateEmbedUrl(id: string, embedUrl: string) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, embedUrl } : p));
  }

  function updatePosterUrl(id: string, posterUrl: string) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, posterUrl } : p));
  }

  function copyLayoutToPanel(targetPanelId: string, content: string) {
    setPanels((prev) => prev.map((panel) => panel.id === targetPanelId
      ? { ...panel, mode: "text", content }
      : panel));
  }

  async function fetchApi(id: string) {
    const panel = panels.find((p) => p.id === id);
    if (!panel || !panel.apiUrl.trim()) return;
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, apiLoading: true, apiError: null } : p));
    try {
      const candidates = buildApiRequestCandidates(panel.apiUrl);
      let text = "";
      let lastError: Error | null = null;

      for (const candidate of candidates) {
        try {
          const res = await fetch(candidate);
          if (!res.ok) throw new Error(`Request failed (${res.status})`);
          text = await res.text();
          lastError = null;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Request failed");
        }
      }

      if (lastError) throw lastError;

      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      setPanels((prev) => prev.map((p) => p.id === id ? { ...p, apiLoading: false, apiResponse: formatted, apiError: null } : p));
    } catch (err: any) {
      setPanels((prev) => prev.map((p) => p.id === id ? { ...p, apiLoading: false, apiResponse: null, apiError: err?.message ?? "Request failed" } : p));
    }
  }

  function reset() {
    setPanels(DEFAULT_PANELS);
    setLayout(DEFAULT_LAYOUT);
  }

  function renderNavSection(items: ReadonlyArray<{ icon: React.ElementType; label: string; key: NavKey }>, mobile = false) {
    return items.map(({ icon: Icon, label, key }) => {
      const handleClick = () => {
        setActiveNav(key);
        if (mobile) setMobileSidebarOpen(false);
      };

      return mobile ? (
        <NavItem key={label} icon={Icon} label={label} active={activeNav === key} onClick={handleClick} />
      ) : sidebarOpen ? (
        <NavItem key={label} icon={Icon} label={label} active={activeNav === key} onClick={handleClick} />
      ) : (
        <button
          key={label}
          onClick={handleClick}
          title={label}
          className={`w-full flex items-center justify-center py-2.5 transition-colors ${activeNav === key ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon size={16} strokeWidth={activeNav === key ? 2 : 1.5} />
        </button>
      );
    });
  }

  const syncLabel = isHydrating
    ? "LOADING"
    : syncState === "saving"
      ? "SYNCING"
      : syncState === "saved"
        ? "SAVED"
        : syncState === "error"
          ? "ERROR"
          : syncState === "offline"
            ? "LOCAL"
            : "READY";

  const syncClassName = isHydrating
    ? "border-accent/30 text-accent"
    : syncState === "saved"
      ? "border-emerald-500/30 text-emerald-400"
      : syncState === "error"
        ? "border-destructive/40 text-destructive"
        : syncState === "offline"
          ? "border-border text-muted-foreground"
          : "border-primary/30 text-primary";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Barlow', sans-serif" }}>
      {isPhone && mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} aria-label="Close menu" />
          <aside className="relative z-10 flex h-full w-64 flex-col border-r border-border bg-sidebar">
            <div className="flex items-center gap-2.5 border-b border-border px-4" style={{ height: "56px" }}>
              <div className="w-6 h-6 bg-primary flex items-center justify-center flex-shrink-0">
                <Activity size={13} strokeWidth={2.5} className="text-primary-foreground" />
              </div>
              <span className="text-foreground flex-1 truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px", fontWeight: 700, letterSpacing: "0.05em" }}>
                AXIOM OPS
              </span>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <p className="text-muted-foreground px-3 mb-1" style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>MONITORING</p>
              {renderNavSection(MONITORING_ITEMS, true)}
              <p className="text-muted-foreground px-3 mt-3 mb-1" style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>OPERATIONS</p>
              {renderNavSection(OPERATIONS_ITEMS, true)}
            </nav>
          </aside>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col border-r border-border bg-sidebar h-full overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? "224px" : "48px", display: isPhone ? "none" : "flex" }}
      >
        {/* Logo row */}
        <div className="flex items-center border-b border-border flex-shrink-0" style={{ height: "56px", paddingLeft: sidebarOpen ? "16px" : "0", paddingRight: sidebarOpen ? "8px" : "0" }}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-6 h-6 bg-primary flex items-center justify-center flex-shrink-0">
                <Activity size={13} strokeWidth={2.5} className="text-primary-foreground" />
              </div>
              <span className="text-foreground truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px", fontWeight: 700, letterSpacing: "0.05em" }}>
                AXIOM OPS
              </span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center">
              <div className="w-6 h-6 bg-primary flex items-center justify-center">
                <Activity size={13} strokeWidth={2.5} className="text-primary-foreground" />
              </div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title="收起側欄"
            >
              <PanelLeftClose size={15} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none" }}>
          {sidebarOpen && (
            <p className="text-muted-foreground px-3 mb-1" style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>MONITORING</p>
          )}
          {renderNavSection(MONITORING_ITEMS)}

          {sidebarOpen ? (
            <p className="text-muted-foreground px-3 mt-3 mb-1" style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>OPERATIONS</p>
          ) : (
            <div className="mx-3 my-2 h-px bg-border" />
          )}

          {renderNavSection(OPERATIONS_ITEMS)}
        </nav>

        {/* User / expand */}
        <div className="border-t border-border flex-shrink-0">
          {sidebarOpen ? (
            <div className="px-4 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Users size={13} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate" style={{ fontSize: "12px", fontWeight: 600 }}>Marcus Holt</p>
                <p className="text-muted-foreground truncate" style={{ fontSize: "11px" }}>Platform Lead</p>
              </div>
              <Settings size={13} className="text-muted-foreground flex-shrink-0 cursor-pointer hover:text-foreground transition-colors" />
            </div>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-full flex items-center justify-center py-3 text-muted-foreground hover:text-foreground transition-colors"
              title="展開側欄"
            >
              <PanelLeftOpen size={15} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className={`flex items-center gap-3 border-b border-border bg-background flex-shrink-0 ${isPhone ? "px-3 py-3" : "px-6 py-3.5"}`}>
          {isPhone && (
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title="Open menu"
            >
              <Menu size={18} strokeWidth={1.75} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-foreground truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: isPhone ? "15px" : "18px", fontWeight: 700, letterSpacing: "0.04em" }}>
              PNC Dashboard 
            </h1>
            <p className="text-muted-foreground truncate" style={{ fontSize: isPhone ? "10px" : "11px" }}>
              Click any title to rename · Click any panel to edit content · Drag to reposition · {syncMessage}
            </p>
          </div>
          <button
            onClick={addPanel}
            className={`flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors ${isPhone ? "px-2.5 py-1.5" : "px-3 py-1.5"}`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
          >
            <Plus size={12} strokeWidth={2.5} />
            {isPhone ? "ADD" : "ADD PANEL"}
          </button>
          <button
            onClick={reset}
            className={`${isPhone ? "px-2.5 py-1.5" : "px-3 py-1.5"} border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 600 }}
          >
            {isPhone ? "RESET" : "RESET"}
          </button>
          <div
            className={`px-3 py-1.5 border transition-colors ${syncClassName}`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
            title={syncMessage}
          >
            {isPhone ? syncLabel.slice(0, 4) : syncLabel}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border hover:border-primary/50 hover:text-primary transition-colors"
              title={darkMode ? "切換 Light 模式" : "切換 Dark 模式"}
            >
              {darkMode
                ? <Sun size={14} strokeWidth={1.75} />
                : <Moon size={14} strokeWidth={1.75} />}
              <span style={{ display: isPhone ? "none" : "inline", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}>
                {darkMode ? "LIGHT" : "DARK"}
              </span>
            </button>
            {!isTabletOrBelow && <button className="p-1.5 hover:text-foreground transition-colors relative">
              <Bell size={16} strokeWidth={1.5} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive rounded-full" />
            </button>}
            {!isTabletOrBelow && <button className="p-1.5 hover:text-foreground transition-colors">
              <Search size={16} strokeWidth={1.5} />
            </button>}
          </div>
        </header>

        {/* Grid */}
        <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-2" style={{ scrollbarWidth: "none" }}>
          {useStackedLayout ? (
            <div className={`grid gap-2 py-2 ${isPhone ? "grid-cols-1" : "grid-cols-2"}`}>
              {orderedPanels.map((panel) => {
                const item = desktopLayoutMap.get(panel.id);
                const estimatedHeight = isPhone
                  ? estimateMobileRows(panel, item ?? { i: panel.id, x: 0, y: 0, w: MOBILE_COLS, h: 6, minW: 1, minH: 4 }) * 34
                  : Math.max(item?.h ?? 6, 7) * 38;
                const minHeight = Math.max(
                  estimatedHeight,
                  isPhone ? PHONE_PANEL_MIN_HEIGHT : TABLET_PANEL_MIN_HEIGHT,
                );

                return (
                  <div
                    key={panel.id}
                    className="min-w-0"
                    style={{ minHeight: `${minHeight}px` }}
                  >
                    <Panel
                      data={panel}
                      onTitleChange={(v) => updateTitle(panel.id, v)}
                      onContentChange={(v) => updateContent(panel.id, v)}
                      onTitleSizeChange={(v) => updateTitleSize(panel.id, v)}
                      onBodySizeChange={(v) => updateBodySize(panel.id, v)}
                      onModeChange={(m) => updateMode(panel.id, m)}
                      onApiUrlChange={(v) => updateApiUrl(panel.id, v)}
                    onLiveUrlChange={(v) => updateLiveUrl(panel.id, v)}
                    onEmbedUrlChange={(v) => updateEmbedUrl(panel.id, v)}
                    onPosterUrlChange={(v) => updatePosterUrl(panel.id, v)}
                      onApiFetch={() => fetchApi(panel.id)}
                      onRemove={() => removePanel(panel.id)}
                      compact
                      availableTextPanels={orderedPanels.map(({ id, title }) => ({ id, title }))}
                      onCopyLayoutToPanel={copyLayoutToPanel}
                    />
                  </div>
                );
              })}
            </div>
          ) : containerWidth > 0 && (
            <ResponsiveGridLayout
              key={containerWidth}
              layouts={responsiveLayouts}
              breakpoints={BREAKPOINTS}
              cols={GRID_COLS}
              rowHeight={isPhone ? 34 : ROW_HEIGHT}
              width={containerWidth}
              margin={isPhone ? [6, 6] : MARGIN}
              draggableHandle=".drag-handle"
              onBreakpointChange={(breakpoint) => setCurrentBreakpoint(breakpoint as BreakpointKey)}
              onLayoutChange={(_, allLayouts) => {
                if (allLayouts.lg?.length) setLayout(allLayouts.lg);
              }}
              isDraggable={!isCompactLayout}
              isResizable={!isCompactLayout}
              resizeHandles={isCompactLayout ? ["se"] : ["se", "sw", "ne", "nw", "e", "w", "n", "s"]}
              useCSSTransforms
            >
              {panels.map((panel) => (
                <div key={panel.id}>
                  <Panel
                    data={panel}
                    onTitleChange={(v) => updateTitle(panel.id, v)}
                    onContentChange={(v) => updateContent(panel.id, v)}
                    onTitleSizeChange={(v) => updateTitleSize(panel.id, v)}
                    onBodySizeChange={(v) => updateBodySize(panel.id, v)}
                    onModeChange={(m) => updateMode(panel.id, m)}
                    onApiUrlChange={(v) => updateApiUrl(panel.id, v)}
                    onLiveUrlChange={(v) => updateLiveUrl(panel.id, v)}
                    onEmbedUrlChange={(v) => updateEmbedUrl(panel.id, v)}
                    onPosterUrlChange={(v) => updatePosterUrl(panel.id, v)}
                    onApiFetch={() => fetchApi(panel.id)}
                    onRemove={() => removePanel(panel.id)}
                    compact={false}
                    availableTextPanels={panels.map(({ id, title }) => ({ id, title }))}
                    onCopyLayoutToPanel={copyLayoutToPanel}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </div>

      <style>{`
        .react-resizable-handle {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .react-grid-item:hover .react-resizable-handle {
          opacity: 1;
        }
        .react-resizable-handle::after {
          border-color: #00c8ff !important;
          opacity: 0.5;
        }
        .react-grid-item.react-grid-placeholder {
          background: rgba(0, 200, 255, 0.06) !important;
          border: 1px solid rgba(0, 200, 255, 0.25) !important;
          border-radius: 0 !important;
        }
        .react-grid-item.react-draggable-dragging {
          opacity: 0.88;
          z-index: 100;
          box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        }
      `}</style>
    </div>
  );
}
