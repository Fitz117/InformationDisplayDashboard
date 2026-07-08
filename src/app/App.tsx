import { useState, useRef, useEffect } from "react";
import { ResponsiveGridLayout } from "react-grid-layout";
import type { Layout, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
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
  AlertTriangle,
  Loader,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type PanelMode = "text" | "api";

interface PanelData {
  id: string;
  title: string;
  content: string;
  titleSize: number;
  bodySize: number;
  mode: PanelMode;
  apiUrl: string;
  apiResponse: string | null;
  apiError: string | null;
  apiLoading: boolean;
}

// ── Default panels ─────────────────────────────────────────────────────────────

function makePanel(id: string, title: string, content: string): PanelData {
  return { id, title, content, titleSize: 11, bodySize: 12, mode: "text", apiUrl: "", apiResponse: null, apiError: null, apiLoading: false };
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

// Mobile: single column, each panel full-width
const MOBILE_LAYOUT: Layout[] = DEFAULT_PANELS.map((p, i) => ({
  i: p.id, x: 0, y: i * 7, w: 4, h: 7, minW: 4, minH: 4,
}));

const DEFAULT_LAYOUTS: Layouts = {
  lg: DEFAULT_LAYOUT,
  md: DEFAULT_LAYOUT,
  sm: MOBILE_LAYOUT,
  xs: MOBILE_LAYOUT,
  xxs: MOBILE_LAYOUT,
};

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

function EditableBody({ value, onChange, fontSize }: { value: string; onChange: (v: string) => void; fontSize: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      placeholder="Start typing…"
      className="w-full h-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/30 outline-none leading-relaxed"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: `${fontSize}px`,
        fontWeight: 400,
        scrollbarWidth: "none",
        whiteSpace: "pre",
        overflowX: "auto",
      }}
    />
  );
}

// ── Mode selector dropdown ─────────────────────────────────────────────────────

const MODE_OPTIONS: { value: PanelMode; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "文字", icon: FileText },
  { value: "api",  label: "API",  icon: Link },
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
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700, width: "100px", minWidth: "100px" }}
      >
        <div className="flex items-center gap-1.5">
          <current.icon size={10} strokeWidth={2} className="text-muted-foreground" />
          <span className="text-foreground">{current.label}</span>
        </div>
        <ChevronDown size={9} strokeWidth={2.5} className={`text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 border border-border bg-card shadow-xl" style={{ width: "100px" }}>
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

// ── API view ───────────────────────────────────────────────────────────────────

function ApiView({
  panel,
  onUrlChange,
  onFetch,
  fontSize,
}: {
  panel: PanelData;
  onUrlChange: (v: string) => void;
  onFetch: () => void;
  fontSize: number;
}) {
  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      {/* URL input row */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          value={panel.apiUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onFetch()}
          placeholder="https://api.example.com/endpoint"
          spellCheck={false}
          className="flex-1 min-w-0 bg-secondary border border-border px-2 py-1.5 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}
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

      {/* Response area */}
      <div className="flex-1 min-h-0 overflow-auto border border-border bg-background/50 p-2" style={{ scrollbarWidth: "none" }}>
        {panel.apiError ? (
          <div className="flex items-start gap-2 text-destructive">
            <AlertTriangle size={12} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: `${fontSize}px`, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {panel.apiError}
            </span>
          </div>
        ) : panel.apiResponse !== null ? (
          <pre
            className="text-accent"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: `${fontSize}px`, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}
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
  onApiFetch,
  onRemove,
}: {
  data: PanelData;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onTitleSizeChange: (v: number) => void;
  onBodySizeChange: (v: number) => void;
  onModeChange: (m: PanelMode) => void;
  onApiUrlChange: (v: string) => void;
  onApiFetch: () => void;
  onRemove: () => void;
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
        <div className="flex items-center gap-0.5 opacity-0 group-hover/panel:opacity-100 transition-opacity flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
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
          className="flex-shrink-0 text-muted-foreground/0 group-hover/panel:text-muted-foreground/40 hover:!text-destructive transition-colors"
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
            <EditableBody value={data.content} onChange={onContentChange} fontSize={data.bodySize} />
          ) : (
            <ApiView panel={data} onUrlChange={onApiUrlChange} onFetch={onApiFetch} fontSize={data.bodySize} />
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
  const [containerWidth, setContainerWidth] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
  const [darkMode, setDarkMode] = useState(() => {
    document.documentElement.classList.add("dark");
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = gridContainerRef.current;
    if (!node) return;
    const measure = () => {
      const w = node.getBoundingClientRect().width || node.offsetWidth;
      if (w > 0) setContainerWidth(w);
    };
    measure();
    setTimeout(measure, 50);
    setTimeout(measure, 200);
    const obs = new ResizeObserver(measure);
    obs.observe(node);
    return () => obs.disconnect();
  }, []);


  function addPanel() {
    const id = `p${++uidCounter}`;
    setPanels((prev) => [...prev, { id, title: "New Panel", content: "", titleSize: 11, bodySize: 12, mode: "text", apiUrl: "", apiResponse: null, apiError: null, apiLoading: false }]);
    setLayouts((prev) => ({
      lg:  [...(prev.lg  ?? []), { i: id, x: 0, y: Infinity, w: 4, h: 5, minW: 2, minH: 3 }],
      md:  [...(prev.md  ?? []), { i: id, x: 0, y: Infinity, w: 4, h: 5, minW: 2, minH: 3 }],
      sm:  [...(prev.sm  ?? []), { i: id, x: 0, y: Infinity, w: 4, h: 7, minW: 4, minH: 4 }],
      xs:  [...(prev.xs  ?? []), { i: id, x: 0, y: Infinity, w: 4, h: 7, minW: 4, minH: 4 }],
      xxs: [...(prev.xxs ?? []), { i: id, x: 0, y: Infinity, w: 4, h: 7, minW: 4, minH: 4 }],
    }));
  }

  function removePanel(id: string) {
    setPanels((prev) => prev.filter((p) => p.id !== id));
    setLayouts((prev) => Object.fromEntries(
      Object.entries(prev).map(([k, v]) => [k, v.filter((l: Layout) => l.i !== id)])
    ) as Layouts);
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

  async function fetchApi(id: string) {
    const panel = panels.find((p) => p.id === id);
    if (!panel || !panel.apiUrl.trim()) return;
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, apiLoading: true, apiError: null } : p));
    try {
      const res = await fetch(panel.apiUrl.trim());
      const text = await res.text();
      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      setPanels((prev) => prev.map((p) => p.id === id ? { ...p, apiLoading: false, apiResponse: formatted, apiError: null } : p));
    } catch (err: any) {
      setPanels((prev) => prev.map((p) => p.id === id ? { ...p, apiLoading: false, apiResponse: null, apiError: err?.message ?? "Request failed" } : p));
    }
  }

  function reset() {
    setPanels(DEFAULT_PANELS);
    setLayouts(DEFAULT_LAYOUTS);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Barlow', sans-serif" }}>

      {/* Mobile sidebar overlay */}
      {isMobile && mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative z-50 w-56 flex flex-col border-r border-border bg-sidebar h-full">
            <div className="flex items-center gap-2.5 px-4 border-b border-border" style={{ height: "56px" }}>
              <div className="w-6 h-6 bg-primary flex items-center justify-center flex-shrink-0">
                <Activity size={13} strokeWidth={2.5} className="text-primary-foreground" />
              </div>
              <span className="text-foreground flex-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px", fontWeight: 700, letterSpacing: "0.05em" }}>AXIOM OPS</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
              <p className="text-muted-foreground px-3 mb-1" style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>MONITORING</p>
              <NavItem icon={LayoutDashboard} label="Overview"  active={activeNav === "overview"} onClick={() => { setActiveNav("overview");  setMobileSidebarOpen(false); }} />
              <NavItem icon={Globe}           label="Traffic"   active={activeNav === "traffic"}  onClick={() => { setActiveNav("traffic");   setMobileSidebarOpen(false); }} />
              <NavItem icon={Server}          label="Services"  active={activeNav === "services"} onClick={() => { setActiveNav("services"); setMobileSidebarOpen(false); }} />
              <NavItem icon={Database}        label="Database"  active={activeNav === "database"} onClick={() => { setActiveNav("database"); setMobileSidebarOpen(false); }} />
              <p className="text-muted-foreground px-3 mt-3 mb-1" style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>OPERATIONS</p>
              <NavItem icon={AlertCircle} label="Incidents" active={activeNav === "alerts"}   onClick={() => { setActiveNav("alerts"); setMobileSidebarOpen(false); }} />
              <NavItem icon={BarChart2}   label="Analytics" active={false} onClick={() => setMobileSidebarOpen(false)} />
              <NavItem icon={TrendingUp}  label="Reports"   active={false} onClick={() => setMobileSidebarOpen(false)} />
            </nav>
            <div className="border-t border-border px-4 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Users size={13} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground truncate" style={{ fontSize: "12px", fontWeight: 600 }}>Marcus Holt</p>
                <p className="text-muted-foreground truncate" style={{ fontSize: "11px" }}>Platform Lead</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar — desktop only */}
      <aside
        className="flex-shrink-0 flex-col border-r border-border bg-sidebar h-full overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? "224px" : "48px", display: isMobile ? "none" : "flex" }}
      >
        {/* Logo row */}
        <div className="flex items-center border-b border-border flex-shrink-0" style={{ height: "56px", paddingLeft: sidebarOpen ? "16px" : "0" }}>
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
          {[
            { icon: LayoutDashboard, label: "Overview", key: "overview" as NavKey },
            { icon: Globe,           label: "Traffic",  key: "traffic"  as NavKey },
            { icon: Server,          label: "Services", key: "services" as NavKey },
            { icon: Database,        label: "Database", key: "database" as NavKey },
          ].map(({ icon: Icon, label, key }) => (
            sidebarOpen ? (
              <NavItem key={key} icon={Icon} label={label} active={activeNav === key} onClick={() => setActiveNav(key)} />
            ) : (
              <button
                key={key}
                onClick={() => setActiveNav(key)}
                title={label}
                className={`w-full flex items-center justify-center py-2.5 transition-colors ${activeNav === key ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon size={16} strokeWidth={activeNav === key ? 2 : 1.5} />
              </button>
            )
          ))}

          {sidebarOpen ? (
            <p className="text-muted-foreground px-3 mt-3 mb-1" style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>OPERATIONS</p>
          ) : (
            <div className="mx-3 my-2 h-px bg-border" />
          )}

          {[
            { icon: AlertCircle, label: "Incidents", key: "alerts"   as NavKey },
            { icon: BarChart2,   label: "Analytics", key: "traffic"  as NavKey },
            { icon: TrendingUp,  label: "Reports",   key: "database" as NavKey },
          ].map(({ icon: Icon, label, key }) => (
            sidebarOpen ? (
              <NavItem key={label} icon={Icon} label={label} active={activeNav === key && label === "Incidents"} onClick={() => label === "Incidents" && setActiveNav("alerts")} />
            ) : (
              <button
                key={label}
                title={label}
                className="w-full flex items-center justify-center py-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon size={16} strokeWidth={1.5} />
              </button>
            )
          ))}
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
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background flex-shrink-0">
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <Menu size={18} strokeWidth={1.75} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-foreground truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: isMobile ? "15px" : "18px", fontWeight: 700, letterSpacing: "0.04em" }}>
              SYSTEM OVERVIEW
            </h1>
            {!isMobile && (
              <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                Click any title to rename · Click any panel to edit content · Drag to reposition
              </p>
            )}
          </div>
          <button
            onClick={addPanel}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}
          >
            <Plus size={12} strokeWidth={2.5} />
            {!isMobile && "ADD PANEL"}
          </button>
          <button
            onClick={reset}
            className="px-2.5 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 600 }}
            title="Reset layout"
          >
            {isMobile ? <RefreshCw size={13} strokeWidth={1.75} /> : "RESET"}
          </button>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border hover:border-primary/50 hover:text-primary transition-colors"
              title={darkMode ? "切換 Light 模式" : "切換 Dark 模式"}
            >
              {darkMode
                ? <Sun size={14} strokeWidth={1.75} />
                : <Moon size={14} strokeWidth={1.75} />}
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}>
                {darkMode ? "LIGHT" : "DARK"}
              </span>
            </button>
            <button className="p-1.5 hover:text-foreground transition-colors relative">
              <Bell size={16} strokeWidth={1.5} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive rounded-full" />
            </button>
            <button className="p-1.5 hover:text-foreground transition-colors">
              <Search size={16} strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Grid */}
        <div ref={gridContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-2" style={{ scrollbarWidth: "none" }}>
          {containerWidth > 0 && (
          <ResponsiveGridLayout
            width={containerWidth}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 4, xs: 4, xxs: 4 }}
            rowHeight={ROW_HEIGHT}
            margin={isMobile ? [6, 6] : MARGIN}
            draggableHandle=".drag-handle"
            onLayoutChange={(_curr, all) => setLayouts(all)}
            resizeHandles={isMobile ? ["se"] : ["se", "sw", "ne", "nw", "e", "w", "n", "s"]}
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
                  onApiFetch={() => fetchApi(panel.id)}
                  onRemove={() => removePanel(panel.id)}
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
