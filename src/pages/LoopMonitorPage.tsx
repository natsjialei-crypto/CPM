import { useState, useEffect, useRef, useMemo } from "react"
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts"
import { allLoops, plant, generateTrendData } from "../data/mockData"
import type { AppState, Loop, TrendPoint, RelatedLoopEntry, FaultEntry } from "../types"

// ── event generation ──────────────────────────────────────────────────────────
type LoopEventType = "alarm" | "manual"
interface LoopEvent {
  id: string; time: string; rawMs: number
  type: LoopEventType; subtype: string; description: string
  operator?: string; value?: string
}

function generateLoopEvents(loop: Loop, days: number): LoopEvent[] {
  const now = Date.now()
  const msPerDay = 86400_000
  const alarmTemplates = [
    { subtype: "PV高限报警", description: `PV超过上限 ${(loop.trendSP + loop.trendRange).toFixed(1)} ${loop.trendUnit}`, value: `PV=${(loop.trendSP + loop.trendRange * 1.2).toFixed(2)}` },
    { subtype: "PV低限报警", description: `PV低于下限 ${(loop.trendSP - loop.trendRange).toFixed(1)} ${loop.trendUnit}`, value: `PV=${(loop.trendSP - loop.trendRange * 1.1).toFixed(2)}` },
    { subtype: "OP饱和报警", description: "输出长时间处于饱和状态（>95%），请检查阀门或工艺扰动", value: "OP=98.3%" },
    { subtype: "振荡报警",   description: `检测到持续振荡，振幅超过正常范围的2倍，振荡率 ${(loop.oscillationRate * 100).toFixed(1)}%`, value: `Amp=±${(loop.trendRange * 0.8).toFixed(1)}` },
    { subtype: "偏差报警",   description: `PV持续偏离SP超过 ${(loop.trendRange * 0.3).toFixed(1)} ${loop.trendUnit} 超过10分钟`, value: "Δ=持续偏高" },
  ]
  const manualTemplates = [
    { subtype: "切换手动",    description: "操作员将回路从自动切换至手动模式，进行阀门检查", operator: "张工" },
    { subtype: "恢复自动",    description: "检查完成，回路恢复自动模式运行", operator: "张工" },
    { subtype: "修改设定值",  description: `SP从 ${loop.trendSP.toFixed(1)} 调整至 ${(loop.trendSP * 1.04).toFixed(1)} ${loop.trendUnit}，配合工况调整`, operator: "李工", value: `${loop.trendSP.toFixed(1)} → ${(loop.trendSP * 1.04).toFixed(1)}` },
    { subtype: "PID参数调整", description: `积分时间 I 从 ${loop.pid.I.toFixed(2)} 调整至 ${(loop.pid.I * 0.85).toFixed(2)}，改善响应速度`, operator: "王工", value: `I: ${loop.pid.I.toFixed(2)}→${(loop.pid.I * 0.85).toFixed(2)}` },
    { subtype: "修改量程",    description: "SP上限调整，配合本次工艺负荷变化", operator: "张工", value: `SPH: ${loop.pid.spHi}` },
  ]
  const seed = loop.id.charCodeAt(loop.id.length - 1) + days * 7
  const count = Math.min(14, Math.max(3, Math.floor(loop.oscillationRate * 100 + days * 1.5)))
  const events: LoopEvent[] = []
  for (let i = 0; i < count; i++) {
    const offsetMs = (seed * (i + 1) * 0x9B3C) % (days * msPerDay)
    const rawMs = now - offsetMs
    const t = new Date(rawMs)
    const isAlarm = (seed + i) % 3 !== 0
    const list = isAlarm ? alarmTemplates : manualTemplates
    const tmpl = list[(seed + i * 3) % list.length]
    const pad = (n: number) => String(n).padStart(2, "0")
    const timeStr = days <= 1
      ? `${pad(t.getHours())}:${pad(t.getMinutes())}`
      : `${pad(t.getMonth() + 1)}/${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`
    events.push({ id: `ev-${loop.id}-${i}`, time: timeStr, rawMs, type: isAlarm ? "alarm" : "manual", ...tmpl })
  }
  return events.sort((a, b) => b.rawMs - a.rawMs)
}

// ── helpers ────────────────────────────────────────────────────────────────────
function unitForLoop(loop: Loop) {
  return plant.units.find((u) => u.id === loop.unitId)
}

export function perfColor(score: number) {
  if (score >= 80) return { color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" }
  if (score >= 60) return { color: "#92600A", bg: "#FEF9EC", border: "#F7D98A" }
  return { color: "#A01515", bg: "#FEF2F2", border: "#FECACA" }
}

export function levelLabel(level: number) {
  return ["", "一级", "二级", "三级", "四级", "五级"][level] ?? "—"
}
export function levelColor(level: number) {
  if (level <= 2) return { color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" }
  if (level === 3) return { color: "#92600A", bg: "#FEF9EC", border: "#F7D98A" }
  return { color: "#A01515", bg: "#FEF2F2", border: "#FECACA" }
}

function avg(loops: Loop[], key: keyof Loop): number {
  if (!loops.length) return 0
  return loops.reduce((s, l) => s + (l[key] as number), 0) / loops.length
}

// ── Faceplate component ────────────────────────────────────────────────────────
export interface FaceplateData {
  pv: number; sp: number; op: number
}

export function VerticalBar({
  value, hi, lo, fillColor, spValue, showSP,
}: {
  value: number; hi: number; lo: number; fillColor: string; spValue?: number; showSP?: boolean
}) {
  const range = hi - lo
  const fillPct = Math.max(0, Math.min(100, ((value - lo) / range) * 100))
  const spPct = spValue != null ? Math.max(0, Math.min(100, ((spValue - lo) / range) * 100)) : null
  const BAR_H = 220

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
      {/* Bar */}
      <div style={{ position: "relative", width: 36, height: BAR_H, background: "#3A3A3A", border: "1px solid #555", borderRadius: 2 }}>
        {/* Fill */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: `${fillPct}%`,
          background: fillColor,
          borderRadius: "0 0 2px 2px",
          transition: "height 0.8s ease",
        }} />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((t) => (
          <div key={t} style={{
            position: "absolute", left: 0, right: 0,
            bottom: `${t}%`,
            borderTop: "1px solid rgba(255,255,255,0.2)",
          }} />
        ))}
        {/* SP triangle marker (right side) */}
        {showSP && spPct != null && (
          <div style={{
            position: "absolute",
            right: -14,
            bottom: `calc(${spPct}% - 7px)`,
            width: 0, height: 0,
            borderTop: "7px solid transparent",
            borderBottom: "7px solid transparent",
            borderRight: "12px solid #E0E0E0",
            transition: "bottom 0.8s ease",
          }} />
        )}
      </div>
      {/* SP value label */}
      {showSP && spPct != null && spValue != null && (
        <div style={{
          position: "absolute",
          right: -52,
          bottom: `calc(${spPct}% - 9px)`,
          fontSize: 11, color: "#E0E0E0", fontFamily: "monospace", whiteSpace: "nowrap",
        }}>
          {spValue.toFixed(1)}
        </div>
      )}
    </div>
  )
}

// ── Detail sub-components ──────────────────────────────────────────────────────
export function PerfLevelBadge({ level }: { level: number }) {
  const configs: Record<number, { label: string; bg: string; color: string }> = {
    1: { label: "一级", bg: "#004B8D", color: "white" },
    2: { label: "二级", bg: "#0069A8", color: "white" },
    3: { label: "三级", bg: "#FEF3C7", color: "#92400E" },
    4: { label: "四级", bg: "#FEE2C5", color: "#9A3412" },
    5: { label: "五级", bg: "#FECACA", color: "#991B1B" },
  }
  const c = configs[level] || configs[5]
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 5, display: "inline-block" }}>
      {c.label}
    </span>
  )
}

export function ModeBadge({ mode }: { mode: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    auto:   { label: "自动",   bg: "#EFF9EC", color: "#237D17" },
    manual: { label: "手动",   bg: "#FEF9EB", color: "#92620A" },
    unused: { label: "未投用", bg: "#F1F3F6", color: "#626972" },
  }
  const c = map[mode] || map.unused
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 12, fontWeight: 500, padding: "3px 9px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />
      {c.label}
    </span>
  )
}

function MetricGauge({ label, value, unit: u, color, max = 100, warn, desc }: { label: string; value: number; unit?: string; color: string; max?: number; warn?: boolean; desc?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "14px 16px", border: "1px solid #E0E4E9" }}>
      <div style={{ fontSize: 11, color: "#747A82", marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: warn ? "#D93838" : "#171A1E", lineHeight: 1, fontFamily: "monospace" }}>{value.toFixed(1)}</span>
        {u && <span style={{ fontSize: 11, color: "#747A82", marginBottom: 2 }}>{u}</span>}
      </div>
      <div style={{ height: 5, background: "#E0E4E9", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 500ms" }} />
      </div>
      {desc && <div style={{ fontSize: 10, color: "#9FA6AF", marginTop: 5 }}>{desc}</div>}
    </div>
  )
}

function DiagnosticRow({ label, value, threshold, unit: u, lowerBetter = true, desc }: { label: string; value: number; threshold: number; unit?: string; lowerBetter?: boolean; desc?: string }) {
  const isWarn = lowerBetter ? value > threshold : value < threshold
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F1F3F6" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "#30353B" }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 1 }}>{desc}</div>}
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: isWarn ? "#D93838" : "#237D17", marginRight: 4, fontFamily: "monospace" }}>{value.toFixed(3)}</span>
      <span style={{ fontSize: 11, color: "#9FA6AF", width: 20 }}>{u}</span>
      <span style={{ marginLeft: 12, fontSize: 11, background: isWarn ? "#FECACA" : "#EFF9EC", color: isWarn ? "#991B1B" : "#237D17", padding: "1px 6px", borderRadius: 4, fontWeight: 500, whiteSpace: "nowrap" }}>
        {isWarn ? "异常" : "正常"}
      </span>
    </div>
  )
}

// ── Faceplate (DCS panel + full detail) ───────────────────────────────────────
export function LoopFaceplate({ loop, onBack, backLabel = "回路监控" }: { loop: Loop; onBack: () => void; backLabel?: string }) {
  const unit = unitForLoop(loop)
  const hiPV = loop.trendSP + loop.trendRange * 2
  const loPV = Math.max(0, loop.trendSP - loop.trendRange * 2)
  const hiOP = 100
  const loOP = 0

  // Live DCS state
  const [live, setLive] = useState<FaceplateData>({
    pv: loop.trendSP + (Math.random() - 0.5) * loop.trendRange * 0.4,
    sp: loop.trendSP,
    op: loop.trendOpBase,
  })
  useEffect(() => {
    const id = setInterval(() => {
      setLive((prev) => ({
        pv: Math.max(loPV, Math.min(hiPV, prev.pv + (Math.random() - 0.5) * loop.trendRange * 0.12)),
        sp: prev.sp,
        op: Math.max(0, Math.min(100, prev.op + (Math.random() - 0.5) * 2.5)),
      }))
    }, 1200)
    return () => clearInterval(id)
  }, [loop])

  // Trend chart state
  const [activeTab, setActiveTab] = useState("perf")
  const [windowHours, setWindowHours] = useState(1)
  const [panOffset, setPanOffset] = useState(0)
  const trendDataRef = useRef<TrendPoint[]>([])
  if (trendDataRef.current.length === 0) {
    trendDataRef.current = generateTrendData(loop.trendSP, loop.trendRange, loop.trendOpBase, loop.trendPattern, 4)
  }
  const displayData = useMemo(() => {
    const all = trendDataRef.current
    const stepMs = 20_000
    const windowSteps = Math.floor((windowHours * 3600 * 1000) / stepMs)
    const end = Math.max(0, all.length - panOffset)
    const start = Math.max(0, end - windowSteps)
    return all.slice(start, end)
  }, [windowHours, panOffset])
  const xInterval = Math.max(1, Math.floor(displayData.length / 8))
  const panStep = Math.floor((windowHours * 3600 * 1000) / 20_000 / 2)
  const maxOffset = Math.max(0, trendDataRef.current.length - Math.floor((windowHours * 3600 * 1000) / 20_000))

  // Related loops + faults state
  const [relatedLoops, setRelatedLoops] = useState<RelatedLoopEntry[]>(loop.relatedLoopEntries || [])
  const [faultEntries, setFaultEntries] = useState<FaultEntry[]>(loop.faultEntries || [])
  const [showAddRelated, setShowAddRelated] = useState(false)
  const [showAddFault, setShowAddFault] = useState(false)
  const [newRelated, setNewRelated] = useState({ tag: "", name: "", description: "", unitId: "", notes: "", direction: "outgoing" as RelatedLoopEntry["direction"] })
  const [newFault, setNewFault] = useState({ faultType: "", description: "", action: "" })

  const isShutdown = unit?.status === "shutdown"
  const pc = perfColor(loop.performanceScore)
  const lc = levelColor(loop.performanceLevel)

  const processTypeMap: Record<string, string> = { flow: "流量", pressure: "压力", level: "液位", temperature: "温度", composition: "成分" }
  const loopTypeMap: Record<string, string> = { single: "单回路", cascade: "串级", split: "分程", override: "超驰", feedforward: "前馈" }

  const resolveLoop = (tag: string) => {
    for (const u of plant.units)
      for (const s of u.sections)
        for (const l of s.loops)
          if (l.tag === tag) return l
    return null
  }

  const DIRECTION_META = {
    incoming: { label: "←被关联", color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" },
    outgoing: { label: "关联→",   color: "#004B8D", bg: "#EEF5FB", border: "#D9EAF7" },
    coupled:  { label: "⇌ 耦合",  color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  } as const

  const tabs = [
    { key: "perf",    label: "性能指标" },
    { key: "trend",   label: "趋势图表" },
    { key: "diag",    label: "诊断结果" },
    { key: "pid",     label: "PID参数"  },
    { key: "ops",     label: "操作分析" },
    { key: "related", label: "相关回路" },
    { key: "fault",   label: "故障分析" },
  ]

  // 操作分析 state
  const [eventDays, setEventDays] = useState(7)
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | "alarm" | "manual">("all")
  const events = useMemo(() => generateLoopEvents(loop, eventDays), [loop, eventDays])
  const filteredEvents = useMemo(() =>
    eventTypeFilter === "all" ? events : events.filter((e) => e.type === eventTypeFilter),
    [events, eventTypeFilter]
  )

  // KPI items (7 static performance indicators)
  const kpiItems = [
    { label: "性能评分",   value: loop.performanceScore.toFixed(1), unit: "分", color: pc.color },
    { label: "定级",       value: levelLabel(loop.performanceLevel), unit: "",   color: lc.color },
    { label: "自控率",     value: `${loop.autoRate.toFixed(1)}%`,              color: "#004B8D" },
    { label: "有效自控率", value: `${loop.effectiveAutoRate.toFixed(1)}%`,     color: "#004B8D" },
    { label: "准确率",     value: `${loop.accuracy.toFixed(1)}%`,              color: "#1A7A0A" },
    { label: "快速率",     value: `${loop.speed.toFixed(1)}%`,                 color: "#1A7A0A" },
    { label: "稳定率",     value: `${loop.stability.toFixed(1)}%`,             color: "#1A7A0A" },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Header ── */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#004B8D", padding: 0, display: "flex", alignItems: "center", gap: 4, fontWeight: 500, fontSize: 13 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {backLabel}
            </button>
            <span style={{ color: "#CDD2D9", fontSize: 13 }}>/</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{loop.tag}</span>
              <span style={{ fontSize: 14, color: "#30353B", fontWeight: 500 }}>{loop.name}</span>
              <ModeBadge mode={loop.mode} />
              {!isShutdown && <PerfLevelBadge level={loop.performanceLevel} />}
              {isShutdown && <span style={{ fontSize: 12, background: "#F1F3F6", color: "#626972", padding: "3px 9px", borderRadius: 5 }}>装置停车</span>}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#9FA6AF" }}>{unit?.deviceCode} {unit?.deviceName} · {loopTypeMap[loop.loopType]} · {processTypeMap[loop.processType]}</span>
        </div>
      </div>

      {/* ── Top row: DCS faceplate | basic info ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
        {/* Left: DCS Faceplate */}
        <div style={{ flexShrink: 0, width: 272 }}>
          <div style={{ background: "#2B2B2B", borderRadius: 12, border: "2px solid #444", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", padding: "18px 20px", fontFamily: "monospace", height: "100%", boxSizing: "border-box" }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E8E8", letterSpacing: 1 }}>{loop.tag}</div>
              <div style={{ fontSize: 10, color: "#9FA6AF", marginTop: 2 }}>{loop.name}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, background: "#00BCD4", borderRadius: 4, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0D1117" }}>{live.op.toFixed(1)}</div>
              </div>
              <div style={{ flex: 1, background: "#C8B800", borderRadius: 4, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0D1117" }}>{live.pv.toFixed(1)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#9FA6AF" }}>%</div>
              <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#9FA6AF" }}>{loop.trendUnit}</div>
            </div>
            <div style={{ display: "flex", marginBottom: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginRight: 14, paddingTop: 20 }}>
                {["AUTO", "MAN", "Mode..."].map((m) => {
                  const isActive = m === "AUTO" && loop.mode === "auto"
                  return (
                    <div key={m} style={{ padding: "4px 8px", fontSize: 10, fontWeight: 700, background: isActive ? "#00BCD4" : "#3E3E3E", color: isActive ? "#0D1117" : "#9FA6AF", border: `1px solid ${isActive ? "#00BCD4" : "#555"}`, borderRadius: 3, textAlign: "center", userSelect: "none" }}>{m}</div>
                  )
                })}
              </div>
              <div style={{ flex: 1, display: "flex", gap: 16, justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: "#686E77" }}>{hiOP.toFixed(1)}</div>
                  <VerticalBar value={live.op} hi={hiOP} lo={loOP} fillColor="#00BCD4" />
                  <div style={{ fontSize: 9, color: "#686E77" }}>{loOP.toFixed(1)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: "#686E77" }}>{hiPV.toFixed(1)}</div>
                  <div style={{ position: "relative" }}>
                    <VerticalBar value={live.pv} hi={hiPV} lo={loPV} fillColor="#C8B800" spValue={live.sp} showSP />
                  </div>
                  <div style={{ fontSize: 9, color: "#686E77" }}>{loPV.toFixed(1)}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9FA6AF", borderTop: "1px solid #3E3E3E", paddingTop: 10 }}>
              <span>SP <span style={{ color: "#E0E0E0" }}>{live.sp.toFixed(1)}</span></span>
              <span>PV <span style={{ color: "#C8B800" }}>{live.pv.toFixed(1)}</span></span>
              <span>OP <span style={{ color: "#00BCD4" }}>{live.op.toFixed(1)}</span></span>
            </div>
          </div>
        </div>

        {/* Right: KPI strip + basic info (always visible) */}
        <div style={{ flex: 1, minWidth: 0, background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "18px 24px", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* KPI tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, borderRadius: 8, border: "1px solid #F1F3F6", overflow: "hidden" }}>
            {kpiItems.map((k, i) => (
              <div key={k.label} style={{ padding: "10px 14px", borderRight: i < kpiItems.length - 1 ? "1px solid #F1F3F6" : "none", background: "#FAFBFC" }}>
                <div style={{ fontSize: 10, color: "#9FA6AF", marginBottom: 4, whiteSpace: "nowrap", fontWeight: 500 }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: "monospace", lineHeight: 1, whiteSpace: "nowrap" }}>
                  {k.value}
                  {k.unit && <span style={{ fontSize: 10, fontWeight: 400, color: "#9FA6AF", marginLeft: 2 }}>{k.unit}</span>}
                </div>
              </div>
            ))}
          </div>
          {/* Basic info + control strategy */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flex: 1 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>回路标识</div>
              {[
                { label: "回路位号",    value: loop.tag,        mono: true },
                { label: "回路名称",    value: loop.name },
                { label: "归属单元",    value: `${unit?.deviceCode} ${unit?.deviceName}` },
                { label: "回路类型",    value: loopTypeMap[loop.loopType] },
                { label: "过程类型",    value: processTypeMap[loop.processType] },
                { label: "投用状态",    value: loop.mode === "auto" ? "自动" : loop.mode === "manual" ? "手动" : "未投用" },
                { label: "OPC Item",    value: loop.opcItem,    mono: true },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid #F1F3F6", fontSize: 13 }}>
                  <span style={{ width: 90, color: "#9FA6AF", flexShrink: 0, fontSize: 12 }}>{item.label}</span>
                  <span style={{ color: "#30353B", fontFamily: item.mono ? "monospace" : "inherit", fontSize: 13 }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>控制策略</div>
              <div style={{ fontSize: 12, color: "#515760", lineHeight: 1.7, padding: "10px 12px", background: "#F9FAFB", borderRadius: 8, border: "1px solid #E0E4E9", marginBottom: 16 }}>{loop.controlStrategy}</div>
              {(loop.upstreamTags.length > 0 || loop.downstreamTags.length > 0 || loop.coupledTags.length > 0) && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 8 }}>关联回路</div>
                  {[{ tags: loop.upstreamTags, label: "上游：" }, { tags: loop.downstreamTags, label: "下游：" }, { tags: loop.coupledTags, label: "耦合：" }].filter((g) => g.tags.length > 0).map((g) => (
                    <div key={g.label} style={{ marginBottom: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#9FA6AF", width: 40, flexShrink: 0 }}>{g.label}</span>
                      {g.tags.map((tag) => <span key={tag} style={{ fontSize: 11, color: "#004B8D", background: "#EEF5FB", padding: "2px 7px", borderRadius: 4, fontFamily: "monospace" }}>{tag}</span>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>{/* end basic info grid */}
        </div>
      </div>{/* end top row */}

      {/* ── Tabs section (full width) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Tab nav */}
        <div style={{ display: "flex", gap: 2, background: "white", borderRadius: 10, padding: 4, border: "1px solid #E0E4E9", width: "fit-content" }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400, color: activeTab === tab.key ? "#004B8D" : "#515760", background: activeTab === tab.key ? "#EEF5FB" : "transparent", transition: "all 160ms", whiteSpace: "nowrap" }}>
              {tab.label}
            </button>
          ))}
        </div>

      {/* ── 性能指标 ── */}
      {activeTab === "perf" && (
        isShutdown ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E0E4E9", padding: 40, textAlign: "center", color: "#9FA6AF" }}>装置停车期间暂停性能评价计算</div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              <MetricGauge label="自控率 Auto" value={loop.autoRate} unit="%" color="#004B8D" desc="回路处于自动模式的时间比例" />
              <MetricGauge label="有效自控率 R" value={loop.effectiveAutoRate} unit="%" color="#0069A8" desc="自动模式下实际有效运行比例" />
              <MetricGauge label="准确率 A" value={loop.accuracy} unit="%" color="#3E8FC3" desc="PV在SP±容差带内的时间比例" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              <MetricGauge label="快速率 F" value={loop.speed} unit="%" color={loop.speed < 80 ? "#F28C28" : "#004B8D"} warn={loop.speed < 80} desc="响应速度满足要求的时间比例" />
              <MetricGauge label="稳定率 S" value={loop.stability} unit="%" color={loop.stability < 80 ? "#D93838" : "#004B8D"} warn={loop.stability < 80} desc="PV波动在允许范围内的比例" />
              <MetricGauge label="饱和率 Sa" value={loop.saturationRate} unit="%" color={loop.saturationRate > 10 ? "#D93838" : "#39C523"} warn={loop.saturationRate > 10} desc="输出处于饱和状态的时间比例" max={20} />
            </div>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #E0E4E9", padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>综合性能评分 P</div>
              <div style={{ fontSize: 11, color: "#747A82", marginBottom: 16 }}>P = [(A·a + F·f + S·s) / (a+f+s)] × R　（按回路类型选取权重系数）</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: loop.performanceScore >= 90 ? "#004B8D" : loop.performanceScore >= 70 ? "#F2B544" : "#D93838", lineHeight: 1, fontFamily: "monospace" }}>{loop.performanceScore.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: "#747A82", marginTop: 4 }}>综合评分</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <PerfLevelBadge level={loop.performanceLevel} />
                    <span style={{ fontSize: 12, color: "#515760" }}>
                      {loop.performanceLevel === 1 && "一级（优秀）：评分 ≥ 90"}
                      {loop.performanceLevel === 2 && "二级（良好）：评分 80-90"}
                      {loop.performanceLevel === 3 && "三级（合格）：评分 70-80"}
                      {loop.performanceLevel === 4 && "四级（偏差）：评分 60-70"}
                      {loop.performanceLevel === 5 && "五级（不合格）：评分 < 60，需立即处理"}
                    </span>
                  </div>
                  {loop.performanceLevel >= 4 && (
                    <div style={{ fontSize: 12, color: "#D93838", background: "#FECACA", padding: "8px 12px", borderRadius: 6 }}>
                      ⚠ 此回路性能不达标，建议开展回路诊断并制定优化计划
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── 趋势图表 ── */}
      {activeTab === "trend" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E0E4E9", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#747A82", marginRight: 4 }}>时间窗口：</span>
            {[{ label: "15分", hours: 0.25 }, { label: "30分", hours: 0.5 }, { label: "1小时", hours: 1 }, { label: "4小时", hours: 4 }].map((opt) => (
              <button key={opt.hours} onClick={() => { setWindowHours(opt.hours); setPanOffset(0) }}
                style={{ padding: "5px 12px", borderRadius: 6, border: windowHours === opt.hours ? "1px solid #004B8D" : "1px solid #CDD2D9", background: windowHours === opt.hours ? "#EEF5FB" : "white", color: windowHours === opt.hours ? "#004B8D" : "#515760", fontSize: 12, fontWeight: windowHours === opt.hours ? 600 : 400, cursor: "pointer" }}>
                {opt.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => setPanOffset((p) => Math.min(maxOffset, p + panStep))} disabled={panOffset >= maxOffset}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #CDD2D9", background: "white", color: panOffset >= maxOffset ? "#9FA6AF" : "#515760", fontSize: 12, cursor: panOffset >= maxOffset ? "default" : "pointer" }}>◀ 向前</button>
            <button onClick={() => setPanOffset((p) => Math.max(0, p - panStep))} disabled={panOffset === 0}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #CDD2D9", background: "white", color: panOffset === 0 ? "#9FA6AF" : "#515760", fontSize: 12, cursor: panOffset === 0 ? "default" : "pointer" }}>向后 ▶</button>
            <button onClick={() => setPanOffset(0)}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #004B8D", background: panOffset === 0 ? "#004B8D" : "white", color: panOffset === 0 ? "white" : "#004B8D", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>最新</button>
          </div>
          <div style={{ padding: "16px 20px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 20, height: 2, background: "#004B8D", display: "inline-block" }} /><span style={{ color: "#515760" }}>PV — {loop.trendUnit}</span></span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 20, height: 2, background: "#3E8FC3", display: "inline-block" }} /><span style={{ color: "#515760" }}>SP</span></span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 20, height: 2, background: "#39C523", display: "inline-block" }} /><span style={{ color: "#515760" }}>OP %（右轴）</span></span>
              </div>
              <span style={{ fontSize: 11, color: "#9FA6AF" }}>{displayData.length > 0 ? `${displayData[0].timeStr} — ${displayData[displayData.length - 1].timeStr}` : ""}</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={displayData} margin={{ top: 4, right: 52, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E4E9" strokeOpacity={0.7} />
                <XAxis dataKey="timeStr" tick={{ fontSize: 11, fill: "#747A82" }} tickLine={false} axisLine={{ stroke: "#E0E4E9" }} interval={xInterval} />
                <YAxis yAxisId="pv" tick={{ fontSize: 11, fill: "#747A82" }} tickLine={false} axisLine={false} width={52} unit={` ${loop.trendUnit}`} />
                <YAxis yAxisId="op" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "#39C523" }} tickLine={false} axisLine={false} unit="%" width={40} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} labelStyle={{ color: "#747A82", fontWeight: 600 }} />
                <ReferenceLine yAxisId="pv" y={loop.pid.spHi} stroke="#F2B544" strokeDasharray="4 3" strokeWidth={1} label={{ value: "SP-H", fill: "#F2B544", fontSize: 9 }} />
                <ReferenceLine yAxisId="pv" y={loop.pid.spLo} stroke="#F2B544" strokeDasharray="4 3" strokeWidth={1} label={{ value: "SP-L", fill: "#F2B544", fontSize: 9 }} />
                <Line yAxisId="pv" type="monotone" dataKey="pv" stroke="#004B8D" strokeWidth={2} dot={false} name="PV" activeDot={{ r: 4, fill: "#004B8D" }} />
                <Line yAxisId="pv" type="monotone" dataKey="sp" stroke="#3E8FC3" strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="SP" />
                <Line yAxisId="op" type="monotone" dataKey="op" stroke="#39C523" strokeWidth={1.5} dot={false} name="OP" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: "4px 20px 16px" }}>
            <input type="range" min={0} max={maxOffset} value={panOffset} onChange={(e) => setPanOffset(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#004B8D" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9FA6AF", marginTop: 2 }}><span>较早</span><span>最新</span></div>
          </div>
          {loop.trendPattern === "oscillating" && (
            <div style={{ margin: "0 20px 16px", padding: "8px 12px", background: "#FEF9EB", borderRadius: 6, border: "1px solid #FDE68A", fontSize: 12, color: "#92620A" }}>
              ⚠ 当前趋势图显示明显振荡波形，振荡率 {(loop.oscillationRate * 100).toFixed(1)}%，建议检查PID参数或阀门状况
            </div>
          )}
        </div>
      )}

      {/* ── 诊断结果 ── */}
      {activeTab === "diag" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
          {isShutdown ? <div style={{ textAlign: "center", padding: 40, color: "#9FA6AF" }}>装置停车期间暂停诊断计算</div> : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 4 }}>诊断指标</div>
              <div style={{ fontSize: 12, color: "#747A82", marginBottom: 16 }}>依据 GB/T 44693.2-2024 附录F 计算</div>
              <DiagnosticRow label="振荡率 Osc" value={loop.oscillationRate} threshold={0.2} lowerBetter desc="识别PID参数不当或输出黏滞导致的周期性振荡" />
              <DiagnosticRow label="黏滞系数 St" value={loop.stickiness} threshold={0.25} lowerBetter desc="识别阀门黏滞、内漏等执行器问题" />
              <DiagnosticRow label="饱和率 Sa" value={loop.saturationRate} threshold={10} unit="%" lowerBetter desc="识别执行器长期处于输出限位的问题" />
              <DiagnosticRow label="好值率 Qu" value={loop.goodValueRate} threshold={95} unit="%" lowerBetter={false} desc="识别通信或仪表故障导致的数据异常" />
              <DiagnosticRow label="行程指数 Trip" value={loop.travelIndex} threshold={30} lowerBetter desc="识别控制阀行程过度，评估磨损风险" />
              <DiagnosticRow label="稳态时间 T" value={loop.steadyStateTime} threshold={180} unit="s" lowerBetter desc="从扰动到回到设定值所需时间" />
              <div style={{ marginTop: 20, padding: "14px 16px", background: "#F9FAFB", borderRadius: 8, border: "1px solid #E0E4E9" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 8 }}>初步诊断归因</div>
                {loop.oscillationRate > 0.2 && loop.stickiness > 0.2 ? (
                  <div style={{ fontSize: 12, color: "#D93838" }}><span style={{ fontWeight: 600 }}>执行器故障（怀疑）：</span>黏滞系数和振荡率均偏高，建议检查控制阀，安排维护保养</div>
                ) : loop.oscillationRate > 0.2 ? (
                  <div style={{ fontSize: 12, color: "#F28C28" }}><span style={{ fontWeight: 600 }}>PID参数不合理（怀疑）：</span>振荡率偏高，黏滞正常，建议重新整定P/I/D参数</div>
                ) : loop.performanceScore > 80 ? (
                  <div style={{ fontSize: 12, color: "#237D17" }}><span style={{ fontWeight: 600 }}>运行正常：</span>所有诊断指标均在正常范围内</div>
                ) : (
                  <div style={{ fontSize: 12, color: "#515760" }}><span style={{ fontWeight: 600 }}>综合偏差：</span>性能略有不足，建议结合趋势图进行人工分析</div>
                )}
                <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 6 }}>* 诊断归因为初步判断，最终结论需人工确认。参考 GB/T 44693.2 第7章及附录F。</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PID参数 ── */}
      {activeTab === "pid" && (
        <div>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 16 }}>当前PID参数</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
              {[{ label: "比例增益 P", value: loop.pid.P }, { label: "积分时间 I", value: loop.pid.I }, { label: "微分时间 D", value: loop.pid.D }, { label: "PV滤波 PVF", value: loop.pid.pvFilter }, { label: "好值率", value: `${loop.goodValueRate.toFixed(1)}%` }].map((item) => (
                <div key={item.label} style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 14px", border: "1px solid #E0E4E9" }}>
                  <div style={{ fontSize: 10, color: "#747A82", marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#171A1E", fontFamily: "monospace" }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid #E0E4E9", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#515760", marginBottom: 10 }}>限位设定</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[{ label: "输出上下限", hi: loop.pid.outputHi, lo: loop.pid.outputLo, unit: "%" }, { label: "反积分饱和限 ARW", hi: loop.pid.arwHi, lo: loop.pid.arwLo, unit: "%" }, { label: "SP高低限", hi: loop.pid.spHi, lo: loop.pid.spLo, unit: loop.trendUnit }].map((item) => (
                  <div key={item.label} style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 14px", border: "1px solid #E0E4E9" }}>
                    <div style={{ fontSize: 10, color: "#747A82", marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: "#171A1E", fontFamily: "monospace" }}>
                      <span style={{ color: "#D93838" }}>HI</span><span style={{ fontWeight: 700, marginLeft: 4 }}>{item.hi}</span><span style={{ color: "#9FA6AF", marginLeft: 2 }}>{item.unit}</span>
                      <span style={{ margin: "0 8px", color: "#CDD2D9" }}>|</span>
                      <span style={{ color: "#004B8D" }}>LO</span><span style={{ fontWeight: 700, marginLeft: 4 }}>{item.lo}</span><span style={{ color: "#9FA6AF", marginLeft: 2 }}>{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 16 }}>整定记录</div>
            {loop.pidRecords.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: "#9FA6AF", fontSize: 13 }}>暂无整定记录</div> : loop.pidRecords.map((rec) => (
              <div key={rec.id} style={{ border: "1px solid #E0E4E9", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>{rec.date}</div><div style={{ fontSize: 12, color: "#747A82", marginTop: 2 }}>整定人：{rec.operator}</div></div>
                  <span style={{ fontSize: 11, background: rec.eliminatedOscillation ? "#EFF9EC" : "#FEF9EB", color: rec.eliminatedOscillation ? "#237D17" : "#92620A", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>{rec.eliminatedOscillation ? "已消除振荡" : "振荡未消除"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#515760", marginBottom: 8 }}><span style={{ fontWeight: 500 }}>整定原因：</span>{rec.reason}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ background: "#FEF9EB", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}><div style={{ color: "#92620A", fontWeight: 600, marginBottom: 4 }}>整定前</div><span style={{ fontFamily: "monospace" }}>P={rec.beforeP}  I={rec.beforeI}  D={rec.beforeD}</span></div>
                  <div style={{ background: "#EFF9EC", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}><div style={{ color: "#237D17", fontWeight: 600, marginBottom: 4 }}>整定后</div><span style={{ fontFamily: "monospace" }}>P={rec.afterP}  I={rec.afterI}  D={rec.afterD}</span></div>
                </div>
                <div style={{ fontSize: 12, color: "#515760" }}><span style={{ fontWeight: 500 }}>整定结果：</span>{rec.result}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 操作分析 ── */}
      {activeTab === "ops" && (() => {
        const alarmCount  = filteredEvents.filter((e) => e.type === "alarm").length
        const manualCount = filteredEvents.filter((e) => e.type === "manual").length
        const TYPE_COLORS = {
          alarm:  { color: "#A01515", bg: "#FEF2F2", border: "#FECACA" },
          manual: { color: "#5B21B6", bg: "#F5F3FF", border: "#DDD6FE" },
        }
        const TYPE_LABELS = { alarm: "报警", manual: "人工干预" }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Stats + filters row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Stats */}
              {[
                { label: "事件总数", value: filteredEvents.length, color: "#004B8D" },
                { label: "报警事件", value: events.filter((e) => e.type === "alarm").length,  color: "#A01515" },
                { label: "人工干预", value: events.filter((e) => e.type === "manual").length, color: "#5B21B6" },
              ].map((s) => (
                <div key={s.label} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 2px 8px rgba(27,39,52,0.06)", padding: "10px 18px", display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: "#9FA6AF" }}>{s.label}</span>
                </div>
              ))}
              <div style={{ flex: 1 }} />
              {/* Time range */}
              <div style={{ display: "flex", gap: 2, background: "white", borderRadius: 8, border: "1px solid #E0E4E9", padding: 3 }}>
                {[{ label: "24小时", days: 1 }, { label: "7天", days: 7 }, { label: "30天", days: 30 }].map((r) => (
                  <button key={r.days} onClick={() => setEventDays(r.days)} style={{ padding: "4px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: eventDays === r.days ? "#004B8D" : "transparent", color: eventDays === r.days ? "white" : "#515760", transition: "background 120ms" }}>{r.label}</button>
                ))}
              </div>
              {/* Type filter */}
              <div style={{ display: "flex", gap: 2, background: "white", borderRadius: 8, border: "1px solid #E0E4E9", padding: 3 }}>
                {(["all", "alarm", "manual"] as const).map((t) => (
                  <button key={t} onClick={() => setEventTypeFilter(t)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: eventTypeFilter === t ? "#004B8D" : "transparent", color: eventTypeFilter === t ? "white" : "#515760", transition: "background 120ms" }}>
                    {t === "all" ? "全部" : TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Event list */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "120px 80px 120px 1fr 160px", padding: "10px 20px", background: "#F9FAFB", borderBottom: "1px solid #F1F3F6", fontSize: 11, fontWeight: 600, color: "#9FA6AF", gap: 12 }}>
                <span>时间</span>
                <span>类型</span>
                <span>事件子类</span>
                <span>描述</span>
                <span>操作员 / 数值</span>
              </div>
              {filteredEvents.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>当前时间范围内无事件记录</div>
              ) : filteredEvents.map((ev, idx) => {
                const tc = TYPE_COLORS[ev.type]
                return (
                  <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "120px 80px 120px 1fr 160px", padding: "11px 20px", gap: 12, alignItems: "center", borderBottom: idx < filteredEvents.length - 1 ? "1px solid #F1F3F6" : "none", transition: "background 100ms" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                    <span style={{ fontSize: 11, color: "#747A82", fontFamily: "monospace" }}>{ev.time}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5, color: tc.color, background: tc.bg, border: `1px solid ${tc.border}`, display: "inline-block", whiteSpace: "nowrap" }}>
                      {TYPE_LABELS[ev.type]}
                    </span>
                    <span style={{ fontSize: 12, color: "#30353B", fontWeight: 500 }}>{ev.subtype}</span>
                    <span style={{ fontSize: 12, color: "#747A82", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.description}</span>
                    <div style={{ fontSize: 11 }}>
                      {ev.operator && <div style={{ color: "#9FA6AF", fontWeight: 500 }}>{ev.operator}</div>}
                      {ev.value && <div style={{ fontFamily: "monospace", color: "#515760", fontSize: 10 }}>{ev.value}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── 相关回路 ── */}
      {activeTab === "related" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>关联回路{relatedLoops.length > 0 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "#9FA6AF" }}>（{relatedLoops.length} 个）</span>}</div>
                <div style={{ fontSize: 12, color: "#747A82", marginTop: 2 }}>与本回路存在关联或影响关系的其他回路</div>
              </div>
              <button onClick={() => setShowAddRelated(true)} style={{ fontSize: 12, color: "#004B8D", background: "#EEF5FB", border: "1px solid #D9EAF7", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 500 }}>+ 新增相关回路</button>
            </div>
            {showAddRelated && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, border: "1px solid #E0E4E9", padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>新增相关回路</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 140px", gap: 8, marginBottom: 8 }}>
                  {[{ label: "回路位号", key: "tag" as const, placeholder: "如 FIC_20301" }, { label: "回路名称", key: "name" as const, placeholder: "如 进料流量控制" }].map((f) => (
                    <div key={f.key}><div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>{f.label}</div><input value={newRelated[f.key]} onChange={(e) => setNewRelated((r) => ({ ...r, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" }} /></div>
                  ))}
                  <div><div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>所属单元</div><select value={newRelated.unitId} onChange={(e) => setNewRelated((r) => ({ ...r, unitId: e.target.value }))} style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", background: "white", boxSizing: "border-box" }}><option value="">选择单元</option>{plant.units.map((u) => <option key={u.id} value={u.id}>{u.deviceCode} {u.deviceName}</option>)}</select></div>
                  <div><div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>关联方向</div><select value={newRelated.direction} onChange={(e) => setNewRelated((r) => ({ ...r, direction: e.target.value as RelatedLoopEntry["direction"] }))} style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", background: "white", boxSizing: "border-box" }}><option value="outgoing">关联→（下游）</option><option value="incoming">←被关联（上游）</option><option value="coupled">⇌ 耦合</option></select></div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                  <button onClick={() => { setShowAddRelated(false); setNewRelated({ tag: "", name: "", description: "", unitId: "", notes: "", direction: "outgoing" }) }} style={{ padding: "6px 14px", background: "white", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#515760" }}>取消</button>
                  <button onClick={() => { if (!newRelated.tag) return; setRelatedLoops((prev) => [...prev, { ...newRelated, id: `rel-${Date.now()}` }]); setShowAddRelated(false); setNewRelated({ tag: "", name: "", description: "", unitId: "", notes: "", direction: "outgoing" }) }} style={{ padding: "6px 14px", background: "#004B8D", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "white", fontWeight: 500 }}>确认添加</button>
                </div>
              </div>
            )}
            {relatedLoops.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#9FA6AF", fontSize: 13 }}>暂无相关回路记录</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {relatedLoops.map((entry) => {
                  const dir = entry.direction || "outgoing"
                  const dm = DIRECTION_META[dir]
                  const entryUnit = plant.units.find((u) => u.id === entry.unitId)
                  const resolved = resolveLoop(entry.tag)
                  return (
                    <div key={entry.id} style={{ background: "#F9FAFB", borderRadius: 10, border: "1px solid #E0E4E9", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5, flexShrink: 0, marginTop: 1, color: dm.color, background: dm.bg, border: `1px solid ${dm.border}` }}>{dm.label}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "#004B8D", fontWeight: 700, fontFamily: "monospace" }}>{entry.tag}</span>
                          {resolved && <PerfLevelBadge level={resolved.performanceLevel} />}
                        </div>
                        <div style={{ fontSize: 13, color: "#30353B" }}>{entry.name}</div>
                        {entryUnit && <div style={{ fontSize: 11, color: "#B0B6BF", marginTop: 3 }}>{entryUnit.deviceCode} — {entryUnit.deviceName}</div>}
                      </div>
                      <button onClick={() => setRelatedLoops((prev) => prev.filter((r) => r.id !== entry.id))} style={{ fontSize: 11, color: "#D93838", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>删除</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {(loop.upstreamTags.length > 0 || loop.downstreamTags.length > 0 || loop.coupledTags.length > 0) && (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "18px 24px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 14 }}>系统关联（自动识别）</div>
              {[{ key: "upstream", tags: loop.upstreamTags, label: "上游", iconColor: "#1A7A0A", icon: "←", bg: "#EDFAE8", border: "#AEEAA2" }, { key: "downstream", tags: loop.downstreamTags, label: "下游", iconColor: "#004B8D", icon: "→", bg: "#EEF5FB", border: "#D9EAF7" }, { key: "coupled", tags: loop.coupledTags, label: "耦合", iconColor: "#7C3AED", icon: "⇌", bg: "#F5F3FF", border: "#DDD6FE" }].filter((g) => g.tags.length > 0).map((g) => (
                <div key={g.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#9FA6AF", minWidth: 32, marginTop: 4 }}>{g.label}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {g.tags.map((tag) => {
                      const r = resolveLoop(tag)
                      return (
                        <div key={tag} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: g.bg, border: `1px solid ${g.border}`, borderRadius: 7 }}>
                          <span style={{ fontSize: 10, color: g.iconColor, fontWeight: 700 }}>{g.icon}</span>
                          <span style={{ fontSize: 12, color: "#004B8D", fontWeight: 700, fontFamily: "monospace" }}>{tag}</span>
                          {r && <><span style={{ fontSize: 11, color: "#515760" }}>{r.name}</span><PerfLevelBadge level={r.performanceLevel} /></>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 故障分析 ── */}
      {activeTab === "fault" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div><div style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>故障分析</div><div style={{ fontSize: 12, color: "#747A82", marginTop: 2 }}>记录回路故障原因及处理措施</div></div>
            <button onClick={() => setShowAddFault(true)} style={{ fontSize: 12, color: "#004B8D", background: "#EEF5FB", border: "1px solid #D9EAF7", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 500 }}>+ 新增故障记录</button>
          </div>
          {showAddFault && (
            <div style={{ background: "#F9FAFB", borderRadius: 8, border: "1px solid #E0E4E9", padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>新增故障记录</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#747A82", marginBottom: 6 }}>故障类型</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["PV周期震荡", "PID参数需调整", "阀门黏滞", "仪表故障", "通信异常", "工艺原因", "其他"].map((ft) => (
                    <button key={ft} onClick={() => setNewFault((f) => ({ ...f, faultType: ft }))} style={{ padding: "5px 12px", borderRadius: 6, border: newFault.faultType === ft ? "1px solid #004B8D" : "1px solid #CDD2D9", background: newFault.faultType === ft ? "#EEF5FB" : "white", color: newFault.faultType === ft ? "#004B8D" : "#515760", fontSize: 12, cursor: "pointer", fontWeight: newFault.faultType === ft ? 600 : 400 }}>{ft}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div><div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>故障描述</div><textarea value={newFault.description} onChange={(e) => setNewFault((f) => ({ ...f, description: e.target.value }))} placeholder="描述故障现象..." rows={3} style={{ width: "100%", padding: "6px 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box" }} /></div>
                <div><div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>处理措施</div><textarea value={newFault.action} onChange={(e) => setNewFault((f) => ({ ...f, action: e.target.value }))} placeholder="记录处理方案..." rows={3} style={{ width: "100%", padding: "6px 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setShowAddFault(false); setNewFault({ faultType: "", description: "", action: "" }) }} style={{ padding: "6px 14px", background: "white", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#515760" }}>取消</button>
                <button onClick={() => { if (!newFault.faultType) return; const now = new Date().toISOString().slice(0, 16).replace("T", " "); setFaultEntries((prev) => [{ id: `fault-${Date.now()}`, date: now, operator: "操作员", faultType: newFault.faultType, description: newFault.description, action: newFault.action }, ...prev]); setShowAddFault(false); setNewFault({ faultType: "", description: "", action: "" }) }} style={{ padding: "6px 14px", background: "#004B8D", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "white", fontWeight: 500 }}>提交记录</button>
              </div>
            </div>
          )}
          {faultEntries.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#9FA6AF", fontSize: 13 }}>暂无故障分析记录</div> : faultEntries.map((entry) => (
            <div key={entry.id} style={{ border: "1px solid #E0E4E9", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, background: entry.faultType === "PV周期震荡" ? "#FECACA" : entry.faultType === "PID参数需调整" ? "#FEF9EB" : "#EEF5FB", color: entry.faultType === "PV周期震荡" ? "#991B1B" : entry.faultType === "PID参数需调整" ? "#92620A" : "#004B8D", padding: "2px 8px", borderRadius: 5 }}>{entry.faultType}</span>
                <span style={{ fontSize: 11, color: "#9FA6AF" }}>{entry.date}</span>
                <span style={{ fontSize: 11, color: "#747A82" }}>记录人：{entry.operator}</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => setFaultEntries((prev) => prev.filter((f) => f.id !== entry.id))} style={{ fontSize: 11, color: "#D93838", background: "none", border: "none", cursor: "pointer" }}>删除</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 10, color: "#747A82", marginBottom: 3 }}>故障描述</div><div style={{ fontSize: 12, color: "#30353B", lineHeight: 1.5 }}>{entry.description || "—"}</div></div>
                <div><div style={{ fontSize: 10, color: "#747A82", marginBottom: 3 }}>处理措施</div><div style={{ fontSize: 12, color: "#30353B", lineHeight: 1.5 }}>{entry.action || "—"}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>{/* end tabs section */}
    </div>
  )
}

// ── Sortable column header ─────────────────────────────────────────────────────
type SortKey = "performanceScore" | "autoRate" | "effectiveAutoRate" | "accuracy" | "speed" | "stability" | "oscillationRate" | "saturationRate" | "travelIndex"
type SortDir = "asc" | "desc"

function SortHeader({
  label, sortKey, current, dir, onSort, align = "center",
}: {
  label: string; sortKey: SortKey; current: SortKey | null; dir: SortDir; onSort: (k: SortKey) => void; align?: string
}) {
  const active = current === sortKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 0,
        display: "flex", alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start",
        gap: 3, width: "100%",
        fontSize: 11, fontWeight: 600,
        color: active ? "#004B8D" : "#9FA6AF",
        userSelect: "none",
      }}
    >
      {label}
      <span style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1 }}>
        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
          <path d="M3.5 0L7 5H0L3.5 0Z" fill={active && dir === "asc" ? "#004B8D" : "#CDD2D9"} />
        </svg>
        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
          <path d="M3.5 5L0 0h7L3.5 5Z" fill={active && dir === "desc" ? "#004B8D" : "#CDD2D9"} />
        </svg>
      </span>
    </button>
  )
}

// ── List view ──────────────────────────────────────────────────────────────────
export function LoopList({ onSelect, defaultUnitId, hideHeader }: { onSelect: (loop: Loop) => void; defaultUnitId?: string; hideHeader?: boolean }) {
  const [search, setSearch] = useState("")
  const [unitFilter, setUnitFilter] = useState(defaultUnitId ?? "")
  const [modeFilter, setModeFilter] = useState("")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const filtered = useMemo(() => {
    let list = allLoops.filter((l) => {
      if (unitFilter && l.unitId !== unitFilter) return false
      if (modeFilter && l.mode !== modeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return l.tag.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
      }
      return true
    })
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = a[sortKey] as number
        const bv = b[sortKey] as number
        return sortDir === "asc" ? av - bv : bv - av
      })
    }
    return list
  }, [search, unitFilter, modeFilter, sortKey, sortDir])

  return (
    <div>
      {!hideHeader && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>回路监控</h1>
            <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>
              全厂控制回路实时状态监控，点击查看详情可打开 DCS 面板视图
            </p>
          </div>
        </div>
      )}

      {/* Overall KPI summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 16 }}>
        {(() => {
          const active = filtered.filter((l) => l.mode !== "unused")
          const avgScore = avg(active, "performanceScore")
          const dominantLevel = active.length
            ? Math.round(active.reduce((s, l) => s + l.performanceLevel, 0) / active.length)
            : 0
          const lc = levelColor(dominantLevel)
          const kpis = [
            { label: "性能评分", value: active.length ? avgScore.toFixed(1) : "—", unit: "分", color: perfColor(avgScore).color },
            { label: "定级", value: active.length ? levelLabel(dominantLevel) : "—", unit: "", color: lc.color },
            { label: "自控率",     value: active.length ? `${avg(active, "autoRate").toFixed(1)}%` : "—",          color: "#004B8D" },
            { label: "有效自控率", value: active.length ? `${avg(active, "effectiveAutoRate").toFixed(1)}%` : "—", color: "#004B8D" },
            { label: "准确率",     value: active.length ? `${avg(active, "accuracy").toFixed(1)}%` : "—",          color: "#1A7A0A" },
            { label: "快速率",     value: active.length ? `${avg(active, "speed").toFixed(1)}%` : "—",             color: "#1A7A0A" },
            { label: "稳定率",     value: active.length ? `${avg(active, "stability").toFixed(1)}%` : "—",         color: "#1A7A0A" },
          ]
          return kpis.map((k) => (
            <div key={k.label} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 2px 8px rgba(27,39,52,0.06)", padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#9FA6AF", marginBottom: 5, fontWeight: 500 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: "monospace", lineHeight: 1 }}>
                {k.value}
                {k.unit && <span style={{ fontSize: 11, fontWeight: 400, color: "#9FA6AF", marginLeft: 2 }}>{k.unit}</span>}
              </div>
            </div>
          ))
        })()}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 36, background: "white", borderRadius: 8, border: "1px solid #E0E4E9", flex: 1, minWidth: 200 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4.5" stroke="#9FA6AF" strokeWidth="1.3" />
            <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#9FA6AF" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索位号或名称…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#30353B" }}
          />
        </div>
        <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}
          style={{ height: 36, padding: "0 10px", border: "1px solid #E0E4E9", borderRadius: 8, fontSize: 13, color: "#515760", background: "white", outline: "none" }}>
          <option value="">所有装置</option>
          {plant.units.map((u) => <option key={u.id} value={u.id}>{u.deviceCode} {u.deviceName}</option>)}
        </select>
        <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
          style={{ height: 36, padding: "0 10px", border: "1px solid #E0E4E9", borderRadius: 8, fontSize: 13, color: "#515760", background: "white", outline: "none" }}>
          <option value="">所有模式</option>
          <option value="auto">自动</option>
          <option value="manual">手动</option>
          <option value="unused">未用</option>
        </select>
        <div style={{ fontSize: 13, color: "#9FA6AF", display: "flex", alignItems: "center" }}>
          共 {filtered.length} 个回路
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "140px 1fr 150px 76px 80px 68px 80px 80px 76px 76px 76px 80px",
          padding: "10px 16px", background: "#F9FAFB", borderBottom: "1px solid #F1F3F6",
          fontSize: 11, fontWeight: 600, color: "#9FA6AF", gap: 8,
        }}>
          <span>位号</span>
          <span>名称</span>
          <span>所属装置</span>
          <span style={{ textAlign: "center" }}>模式</span>
          <SortHeader label="性能评分" sortKey="performanceScore" current={sortKey} dir={sortDir} onSort={handleSort} />
          <span style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#9FA6AF" }}>定级</span>
          <SortHeader label="自控率" sortKey="autoRate" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortHeader label="有效自控率" sortKey="effectiveAutoRate" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortHeader label="准确率" sortKey="accuracy" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortHeader label="快速率" sortKey="speed" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortHeader label="稳定率" sortKey="stability" current={sortKey} dir={sortDir} onSort={handleSort} />
          <span />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>
            未找到匹配回路
          </div>
        ) : (
          filtered.map((loop, idx) => {
            const unit = unitForLoop(loop)
            const pc = perfColor(loop.performanceScore)
            const lc = levelColor(loop.performanceLevel)
            const isBad = loop.performanceLevel >= 4
            const modeColor = loop.mode === "auto"
              ? { color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" }
              : loop.mode === "manual"
                ? { color: "#92600A", bg: "#FEF9EC", border: "#F7D98A" }
                : { color: "#747A82", bg: "#F1F3F6", border: "#E0E4E9" }
            const modeLabel = loop.mode === "auto" ? "自动" : loop.mode === "manual" ? "手动" : "未用"
            const rowBase = isBad ? "#FFF8F8" : "transparent"

            const kpiCell = (value: string) => (
              <div style={{ textAlign: "center", fontSize: 12, color: "#30353B", fontFamily: "monospace", fontWeight: 500 }}>
                {value}
              </div>
            )

            return (
              <div
                key={loop.id}
                style={{
                  display: "grid", gridTemplateColumns: "140px 1fr 150px 76px 80px 68px 80px 80px 76px 76px 76px 80px",
                  padding: "11px 16px", gap: 8, alignItems: "center",
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${isBad ? "#FEE2E2" : "#F1F3F6"}` : "none",
                  borderLeft: isBad ? "3px solid #F87171" : "3px solid transparent",
                  background: rowBase,
                  transition: "background 100ms",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isBad ? "#FEF2F2" : "#F9FAFB" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = rowBase }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{loop.tag}</span>
                <span style={{ fontSize: 12, color: "#515760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loop.name}</span>
                <div>
                  <div style={{ fontSize: 11, color: "#30353B", fontWeight: 500 }}>{unit?.deviceCode}</div>
                  <div style={{ fontSize: 10, color: "#9FA6AF" }}>{unit?.deviceName}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5, color: modeColor.color, background: modeColor.bg, border: `1px solid ${modeColor.border}` }}>
                    {modeLabel}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 5, color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }}>
                    {loop.performanceScore}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5, color: lc.color, background: lc.bg, border: `1px solid ${lc.border}` }}>
                    {levelLabel(loop.performanceLevel)}
                  </span>
                </div>
                {kpiCell(`${loop.autoRate.toFixed(1)}%`)}
                {kpiCell(`${loop.effectiveAutoRate.toFixed(1)}%`)}
                {kpiCell(`${loop.accuracy.toFixed(1)}%`)}
                {kpiCell(`${loop.speed.toFixed(1)}%`)}
                {kpiCell(`${loop.stability.toFixed(1)}%`)}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => onSelect(loop)}
                    style={{ fontSize: 11, color: "#004B8D", background: "#EEF5FB", border: "1px solid #D9EAF7", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}
                  >
                    查看详情
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function LoopMonitorPage({ navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const [selectedLoop, setSelectedLoop] = useState<Loop | null>(null)

  return (
    <div style={{ padding: 24 }}>
      {selectedLoop
        ? <LoopFaceplate loop={selectedLoop} onBack={() => setSelectedLoop(null)} />
        : <LoopList onSelect={setSelectedLoop} />}
    </div>
  )
}
