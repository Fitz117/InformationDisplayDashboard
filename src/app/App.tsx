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

function TextModeEditor({
  value,
  onChange,
  fontSize,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  fontSize: number;
  compact: boolean;
}) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function insertAtCursor(snippet: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${value.endsWith("\n") || !value ? "" : "\n"}${snippet}`);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + snippet.length;
      textarea.setSelectionRange(caret, caret);
    });
  }

  function insertTableTemplate() {
    const columnInput = window.prompt("請輸入表格欄數（1 - 8）", "3");
    if (columnInput === null) return;

    const rowInput = window.prompt("請輸入表格列數（1 - 12）", "4");
    if (rowInput === null) return;

    const columns = Number.parseInt(columnInput.trim(), 10);
    const rows = Number.parseInt(rowInput.trim(), 10);
    const prefix = value && !value.endsWith("\n") ? "\n" : "";
    insertAtCursor(`${prefix}${buildWordTableTemplate(rows, columns)}\n`);
  }

  function insertImageTemplate() {
    const imageUrl = window.prompt("請輸入圖片網址", "https://");
    if (!imageUrl) return;

    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return;

    const altText = window.prompt("請輸入圖片說明", "Dashboard 圖片")?.trim() ?? "";
    const widthPercent = askImageWidthPercent(100);
    if (widthPercent === null) return;
    const prefix = value && !value.endsWith("\n") ? "\n" : "";
    insertAtCursor(`${prefix}${buildImageSnippet(altText, trimmedUrl, widthPercent)}\n`);
  }

  const updateImageWidth = useCallback((lineIndex: number, widthPercent: number) => {
    const lines = value.replace(/\r\n/g, "\n").split("\n");
    const originalLine = lines[lineIndex];
    if (originalLine === undefined) return;

    const trimmedLine = originalLine.trim();
    const imageMatch = trimmedLine.match(IMAGE_BLOCK_PATTERN);
    if (!imageMatch) return;

    const leadingWhitespace = originalLine.match(/^\s*/)?.[0] ?? "";
    const trailingWhitespace = originalLine.match(/\s*$/)?.[0] ?? "";
    lines[lineIndex] = `${leadingWhitespace}${buildImageSnippet(imageMatch[1], imageMatch[2], widthPercent)}${trailingWhitespace}`;
    onChange(lines.join("\n"));
  }, [onChange, value]);

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

      const prefix = value && !value.endsWith("\n") ? "\n" : "";
      insertAtCursor(`${prefix}${buildImageSnippet(fileBaseName, data.publicUrl, widthPercent)}\n`);
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
      </div>

      <div className="text-muted-foreground/60 flex-shrink-0" style={{ fontFamily: "'Barlow', sans-serif", fontSize: "11px" }}>
        可直接輸入文字、插入帶文字的 Word 風格表格，並用 <code>![圖片說明](圖片網址){"{width=60%}"}</code> 顯示與調整圖片大小
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

      <div className={`flex-1 min-h-0 ${compact ? "flex flex-col gap-3" : "flex gap-3"}`}>
        <div className="min-h-0 flex-1 border border-border bg-background/30 p-2">
          <div className="mb-2 text-muted-foreground/70" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}>
            文字內容
          </div>
          <div className="h-[calc(100%-24px)] min-h-[180px]">
            <EditableBody
              value={value}
              onChange={onChange}
              fontSize={fontSize}
              compact={compact}
              textareaRef={textareaRef}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 border border-border bg-background/30 p-2">
          <div className="mb-2 text-muted-foreground/70" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}>
            即時顯示
          </div>
          <div className="h-[calc(100%-24px)] min-h-[180px]">
            <RichTextPreview value={value} fontSize={fontSize} compact={compact} onImageWidthChange={updateImageWidth} />
          </div>
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
            <TextModeEditor value={data.content} onChange={onContentChange} fontSize={data.bodySize} compact={compact} />
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
