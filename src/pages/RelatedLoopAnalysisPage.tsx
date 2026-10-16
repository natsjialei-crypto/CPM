import { useState, useMemo } from "react"
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { allLoops, plant, generateHistoryData, generateTrendData } from "../data/mockData"
import type { AppState, Loop } from "../types"
import TrendTimeControls, { defaultRangeForGranularity } from "../components/TrendTimeControls"
import type { TrendGranularity } from "../components/TrendTimeControls"

// ── event generation (mirrors LoopMonitorPage logic) ──────────────────────────
type LoopEventType = "alarm" | "manual"
interface LoopEvent {
  id: string; time: string; rawMs: number
  type: LoopEventType; subtype: string; description: string
  loopTag: string; loopId: string
  operator?: string; value?: string
}

function generateLoopEvents(loop: Loop, days: number): LoopEvent[] {
  const now = Date.now()
  const msPerDay = 86400_000
  const alarmTemplates = [
    { subtype: "PV高限报警", description: `PV超过上限 ${(loop.trendSP + loop.trendRange).toFixed(1)} ${loop.trendUnit}`, value: `PV=${(loop.trendSP + loop.trendRange * 1.2).toFixed(2)}` },
    { subtype: "PV低限报警", description: `PV低于下限 ${(loop.trendSP - loop.trendRange).toFixed(1)} ${loop.trendUnit}`, value: `PV=${(loop.trendSP - loop.trendRange * 1.1).toFixed(2)}` },
    { subtype: "OP饱和报警", description: "输出长时间处于饱和状态（>95%）", value: "OP=98.3%" },
    { subtype: "振荡报警",   description: `检测到持续振荡，振荡率 ${(loop.oscillationRate * 100).toFixed(1)}%`, value: `Amp=±${(loop.trendRange * 0.8).toFixed(1)}` },
    { subtype: "偏差报警",   description: `PV持续偏离SP超过 ${(loop.trendRange * 0.3).toFixed(1)} ${loop.trendUnit} 超过10分钟` },
  ]
  const manualTemplates = [
    { subtype: "切换手动",    description: "操作员将回路切换至手动模式", operator: "张工" },
    { subtype: "恢复自动",    description: "检查完成，回路恢复自动模式", operator: "张工" },
    { subtype: "修改设定值",  description: `SP从 ${loop.trendSP.toFixed(1)} 调整至 ${(loop.trendSP * 1.04).toFixed(1)} ${loop.trendUnit}`, operator: "李工", value: `${loop.trendSP.toFixed(1)} → ${(loop.trendSP * 1.04).toFixed(1)}` },
    { subtype: "PID参数调整", description: `积分时间 I 从 ${loop.pid.I.toFixed(2)} 调整至 ${(loop.pid.I * 0.85).toFixed(2)}`, operator: "王工" },
    { subtype: "修改量程",    description: "SP上限调整，配合本次工艺负荷变化", operator: "张工" },
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
    events.push({ id: `ev-${loop.id}-${i}`, time: timeStr, rawMs, type: isAlarm ? "alarm" : "manual", loopTag: loop.tag, loopId: loop.id, ...tmpl })
  }
  return events
}

// ── data model ─────────────────────────────────────────────────────────────────
type GroupType = "cascade" | "coupled" | "upstream-downstream" | "custom"

interface LoopGroup {
  id: string
  name: string
  description: string
  type: GroupType
  loopIds: string[]
  createdAt: string
  createdBy: string
}

interface SystemSuggestion {
  id: string
  reason: string
  loopIds: string[]
  type: GroupType
  confidence: "high" | "medium" | "low"
  dismissed?: boolean
}

// ── mock data ──────────────────────────────────────────────────────────────────
const LOOP_GROUPS: LoopGroup[] = [
  {
    id: "g001",
    name: "R101 进料-温度协调控制组",
    description: "反应釜进料流量与釜温存在强耦合，进料波动直接影响温度稳定性，纳入同组进行协调分析。",
    type: "coupled",
    loopIds: ["l001", "l002"],
    createdAt: "2024-02-15",
    createdBy: "张工",
  },
  {
    id: "g002",
    name: "R201 进料串级控制组",
    description: "主进料量与副进料量构成比值控制结构，TIC_20201 作为温度主控回路对上游流量产生设定值指令。",
    type: "cascade",
    loopIds: ["l005", "l006", "l007"],
    createdAt: "2024-03-01",
    createdBy: "李工",
  },
  {
    id: "g003",
    name: "T301 精馏塔全回路组",
    description: "精馏塔液位、温度、进料流量及塔压四个回路相互约束，任一异常均可能引发连锁波动。",
    type: "coupled",
    loopIds: ["l009", "l010", "l011", "l012"],
    createdAt: "2024-03-10",
    createdBy: "王工",
  },
  {
    id: "g004",
    name: "R201→T301 跨单元物料平衡组",
    description: "主反应器出料流量与精馏塔进料流量的上下游传递关系，出料扰动约 8 min 后传递至精馏段。",
    type: "upstream-downstream",
    loopIds: ["l008", "l011"],
    createdAt: "2024-03-18",
    createdBy: "张工",
  },
]

const SUGGESTIONS: SystemSuggestion[] = [
  {
    id: "sg001",
    reason: "检测到 FIC_10130 上游标记包含 TIC_10201，且二者位于同一单元，评价周期内振荡模式高度相关（相关系数 0.83），建议建立耦合关联组。",
    loopIds: ["l001", "l002"],
    type: "coupled",
    confidence: "high",
  },
  {
    id: "sg002",
    reason: "FIC_20110 与 FIC_20115 存在明确的上下游关系标记，响应延迟约 3 min，建议纳入串级结构分析组。",
    loopIds: ["l005", "l006"],
    type: "cascade",
    confidence: "high",
  },
  {
    id: "sg003",
    reason: "PIC_20210 与 LIC_30101 在近 30 天均出现间歇性振荡，波动周期接近（约 12 min），推测存在跨单元压力-液位耦合，建议观察。",
    loopIds: ["l008", "l009"],
    type: "coupled",
    confidence: "medium",
  },
  {
    id: "sg004",
    reason: "TIC_30201 与 FIC_30120 同属 T301 精馏段，温度回路多次出现跟随流量扰动的响应特征，建议建立协调分析组。",
    loopIds: ["l010", "l011"],
    type: "upstream-downstream",
    confidence: "medium",
  },
]

// ── helpers ────────────────────────────────────────────────────────────────────
function loopById(id: string) { return allLoops.find((l) => l.id === id) }

function unitForLoop(id: string) {
  const l = loopById(id)
  if (!l) return null
  return plant.units.find((u) => u.id === l.unitId) || null
}

function perfColor(score: number) {
  if (score >= 80) return { color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" }
  if (score >= 60) return { color: "#92600A", bg: "#FEF9EC", border: "#F7D98A" }
  return { color: "#A01515", bg: "#FEF2F2", border: "#FECACA" }
}

const TYPE_META: Record<GroupType, { label: string; color: string; bg: string; border: string }> = {
  cascade:              { label: "串级",     color: "#004B8D", bg: "#EEF5FB", border: "#D9EAF7" },
  coupled:              { label: "耦合",     color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  "upstream-downstream":{ label: "上下游",   color: "#0E766B", bg: "#ECFDF5", border: "#A7F3D0" },
  custom:               { label: "自定义",   color: "#747A82", bg: "#F1F3F6", border: "#E0E4E9" },
}

const CONFIDENCE_META = {
  high:   { label: "高置信", color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" },
  medium: { label: "中置信", color: "#92600A", bg: "#FEF9EC", border: "#F7D98A" },
  low:    { label: "低置信", color: "#747A82", bg: "#F1F3F6", border: "#E0E4E9" },
}

// ── List page ──────────────────────────────────────────────────────────────────
function GroupListPage({
  groups,
  suggestions,
  onDrillDown,
  onAcceptSuggestion,
  onDismissSuggestion,
  navigate,
}: {
  groups: LoopGroup[]
  suggestions: SystemSuggestion[]
  onDrillDown: (id: string) => void
  onAcceptSuggestion: (sg: SystemSuggestion) => void
  onDismissSuggestion: (id: string) => void
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
}) {
  const loopsInGroups = new Set(groups.flatMap((g) => g.loopIds)).size
  const pendingSuggestions = suggestions.filter((s) => !s.dismissed)

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>关联性分析</h1>
          <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>
            管理控制回路关联组，分析耦合影响路径
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "关联组总数", value: groups.length, sub: "已建立", color: "#004B8D" },
          { label: "覆盖回路数", value: loopsInGroups, sub: `共 ${allLoops.length} 个回路`, color: "#7C3AED" },
          { label: "待处理建议", value: pendingSuggestions.length, sub: "系统识别", color: pendingSuggestions.length > 0 ? "#F28C28" : "#39C523" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
            boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "18px 22px",
          }}>
            <div style={{ fontSize: 11, color: "#747A82", fontWeight: 500, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 5 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Group list */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
        boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden", marginBottom: 20,
      }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>关联组列表</span>
          <span style={{ marginLeft: 8, fontSize: 12, color: "#9FA6AF" }}>{groups.length} 个</span>
        </div>

        {groups.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>
            暂无关联组，可从下方采纳系统建议创建
          </div>
        ) : (
          groups.map((group, idx) => {
            const tm = TYPE_META[group.type]
            const loops = group.loopIds.map(loopById).filter(Boolean)
            const units = [...new Set(loops.map((l) => unitForLoop(l!.id)?.deviceCode).filter(Boolean))]
            const avgScore = Math.round(loops.reduce((s, l) => s + (l?.performanceScore || 0), 0) / (loops.length || 1))
            const pc = perfColor(avgScore)

            return (
              <div
                key={group.id}
                onClick={() => onDrillDown(group.id)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 20px",
                  borderBottom: idx < groups.length - 1 ? "1px solid #F1F3F6" : "none",
                  cursor: "pointer", transition: "background 100ms",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                {/* Left: type + name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                      color: tm.color, background: tm.bg, border: `1px solid ${tm.border}`,
                    }}>
                      {tm.label}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#30353B" }}>{group.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#747A82", marginBottom: 8, lineHeight: 1.5 }}>
                    {group.description}
                  </div>
                  {/* Loop tags preview */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {loops.slice(0, 6).map((l) => l && (
                      <span key={l.id} style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                        background: "#F1F3F6", color: "#515760", border: "1px solid #E0E4E9",
                        fontFamily: "monospace",
                      }}>
                        {l.tag}
                      </span>
                    ))}
                    {loops.length > 6 && (
                      <span style={{ fontSize: 11, color: "#9FA6AF", alignSelf: "center" }}>+{loops.length - 6}</span>
                    )}
                  </div>
                </div>

                {/* Right: meta */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0, minWidth: 140 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#9FA6AF" }}>平均性能</span>
                    <span style={{ fontSize: 13, fontWeight: 700, padding: "2px 10px", borderRadius: 5, color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }}>
                      {avgScore}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9FA6AF" }}>
                    {loops.length} 个回路 · {units.join("、")}
                  </div>
                  <div style={{ fontSize: 11, color: "#9FA6AF" }}>
                    {group.createdAt} 由 {group.createdBy} 创建
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#004B8D", fontSize: 12, fontWeight: 500 }}>
                    查看详情
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* System suggestions */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
        boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F28C28", animation: "none" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>系统识别建议</span>
          <span style={{ fontSize: 12, color: "#9FA6AF" }}>基于算法自动分析，供参考采纳</span>
          {pendingSuggestions.length > 0 && (
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#FEF3E2", color: "#C35200", border: "1px solid #FDDCAA" }}>
              {pendingSuggestions.length} 条待处理
            </span>
          )}
        </div>

        {pendingSuggestions.length === 0 ? (
          <div style={{ padding: "36px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>
            所有建议已处理完毕
          </div>
        ) : (
          <div>
            {pendingSuggestions.map((sg, idx) => {
              const cm = CONFIDENCE_META[sg.confidence]
              const tm = TYPE_META[sg.type]
              const loops = sg.loopIds.map(loopById).filter(Boolean)
              return (
                <div
                  key={sg.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: idx < pendingSuggestions.length - 1 ? "1px solid #F1F3F6" : "none",
                    display: "flex", alignItems: "flex-start", gap: 14,
                  }}
                >
                  {/* Confidence indicator */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0, marginTop: 2,
                    background: cm.bg, border: `1.5px solid ${cm.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke={cm.color} strokeWidth="1.3" />
                      <path d="M5.5 8a2.5 2.5 0 015 0c0 1.4-.8 2.5-2.5 3.5C6.3 10.5 5.5 9.4 5.5 8z" fill={cm.color} opacity="0.7" />
                      <circle cx="8" cy="5.5" r="1" fill={cm.color} />
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type + confidence badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, color: tm.color, background: tm.bg, border: `1px solid ${tm.border}` }}>
                        {tm.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, color: cm.color, background: cm.bg, border: `1px solid ${cm.border}` }}>
                        {cm.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#515760", lineHeight: 1.6, marginBottom: 10 }}>
                      {sg.reason}
                    </div>
                    {/* Loop tags */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {loops.map((l) => l && (
                        <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "#F7F8FA", border: "1px solid #E0E4E9" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{l.tag}</span>
                          <span style={{ fontSize: 11, color: "#9FA6AF" }}>{l.name}</span>
                        </div>
                      ))}
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => onAcceptSuggestion(sg)}
                        style={{
                          height: 30, padding: "0 14px", background: "#004B8D",
                          color: "white", border: "none", borderRadius: 7,
                          fontSize: 12, fontWeight: 500, cursor: "pointer",
                        }}
                      >
                        采纳并建组
                      </button>
                      <button
                        onClick={() => onDismissSuggestion(sg.id)}
                        style={{
                          height: 30, padding: "0 12px", background: "white",
                          color: "#747A82", border: "1px solid #CDD2D9", borderRadius: 7,
                          fontSize: 12, cursor: "pointer",
                        }}
                      >
                        忽略
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Detail page ────────────────────────────────────────────────────────────────
function GroupDetailPage({
  group,
  onBack,
  navigate,
}: {
  group: LoopGroup
  onBack: () => void
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
}) {
  const tm = TYPE_META[group.type]
  const loops = group.loopIds.map(loopById).filter(Boolean)
  const avgScore = Math.round(loops.reduce((s, l) => s + (l?.performanceScore || 0), 0) / (loops.length || 1))
  const pc = perfColor(avgScore)
  const units = [...new Set(loops.map((l) => unitForLoop(l!.id)?.deviceCode).filter(Boolean))]

  const [eventDays, setEventDays] = useState(7)
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | "alarm" | "manual">("all")

  // Trend chart state
  const LOOP_COLORS = ["#004B8D", "#7C3AED", "#0E766B", "#C35200", "#D93838", "#0E7490"]
  const SIGNALS = ["pv", "sp", "op"] as const
  type Signal = typeof SIGNALS[number]
  const [enabledLoops, setEnabledLoops] = useState<Set<string>>(() => new Set(loops.map((l) => l!.id)))
  const [enabledSignals, setEnabledSignals] = useState<Set<Signal>>(new Set(["pv", "sp", "op"]))
  const [trendHours, setTrendHours] = useState<number | null>(0.25)
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("hour")
  const initialTrendRange = defaultRangeForGranularity("hour")
  const [trendCustomStart, setTrendCustomStart] = useState(initialTrendRange.start)
  const [trendCustomEnd, setTrendCustomEnd] = useState(initialTrendRange.end)
  const trendCustomDays = (new Date(trendCustomEnd).getTime() - new Date(trendCustomStart).getTime()) / 86400_000
  const trendCustomError = trendHours === null && (!Number.isFinite(trendCustomDays) || trendCustomDays <= 0)

  const trendData = useMemo(() => {
    const perLoop = loops.map((l) => {
      if (!l) return []
      if (trendHours !== null) {
        return generateTrendData(l.trendSP, l.trendRange, l.trendOpBase, l.trendPattern, trendHours)
      }
      if (trendCustomError) return []
      const data = generateHistoryData(l.trendSP, l.trendRange, l.trendOpBase, l.trendPattern, trendCustomDays)
      const desired = trendGranularity === "hour"
        ? Math.ceil(trendCustomDays * 24)
        : trendGranularity === "day"
          ? Math.ceil(trendCustomDays)
          : Math.ceil(trendCustomDays / 30)
      const count = Math.max(2, Math.min(data.length, desired))
      if (count >= data.length) return data
      return Array.from({ length: count }, (_, index) =>
        data[Math.round((index * (data.length - 1)) / (count - 1))],
      )
    })
    const len = Math.min(...perLoop.map((d) => d.length))
    return Array.from({ length: len }, (_, i) => {
      const pt: Record<string, string | number> = { timeStr: perLoop[0]?.[i]?.timeStr ?? "" }
      loops.forEach((l, li) => {
        if (!l) return
        const d = perLoop[li][i]
        if (d) {
          pt[`${l.tag}_pv`] = parseFloat(d.pv.toFixed(2))
          pt[`${l.tag}_sp`] = parseFloat(d.sp.toFixed(2))
          pt[`${l.tag}_op`] = parseFloat(d.op.toFixed(1))
        }
      })
      return pt
    })
  }, [loops, trendCustomDays, trendCustomError, trendGranularity, trendHours])

  // Cross-loop event timeline
  const groupEvents = useMemo(() => {
    const all: LoopEvent[] = []
    for (const l of loops) {
      if (!l) continue
      all.push(...generateLoopEvents(l, eventDays))
    }
    all.sort((a, b) => b.rawMs - a.rawMs)
    return eventTypeFilter === "all" ? all : all.filter((e) => e.type === eventTypeFilter)
  }, [loops, eventDays, eventTypeFilter])

  // Tag each event cluster: events from different loops within 30 min window
  const clusterMap = useMemo(() => {
    const m = new Map<string, boolean>()
    for (let i = 0; i < groupEvents.length; i++) {
      const e = groupEvents[i]
      const WINDOW = 30 * 60 * 1000
      const near = groupEvents.some((o, j) => j !== i && o.loopId !== e.loopId && Math.abs(o.rawMs - e.rawMs) < WINDOW)
      m.set(e.id, near)
    }
    return m
  }, [groupEvents])

  // Build edges between loops in this group (using relatedLoopEntries + upstreamTags)
  const edges = useMemo(() => {
    const result: { from: string; to: string; label: string }[] = []
    const groupTags = new Set(loops.map((l) => l?.tag))
    for (const l of loops) {
      if (!l) continue
      for (const rel of l.relatedLoopEntries || []) {
        if (groupTags.has(rel.tag)) {
          result.push({ from: l.tag, to: rel.tag, label: rel.description || "关联" })
        }
      }
      for (const tag of l.upstreamTags || []) {
        if (groupTags.has(tag)) result.push({ from: tag, to: l.tag, label: "上游→下游" })
      }
    }
    // deduplicate
    const seen = new Set<string>()
    return result.filter((e) => { const k = `${e.from}|${e.to}`; if (seen.has(k)) return false; seen.add(k); return true })
  }, [loops])

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#004B8D", padding: 0, display: "flex", alignItems: "center", gap: 4, fontWeight: 500, fontSize: 13 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          关联组列表
        </button>
        <span style={{ color: "#CDD2D9" }}>/</span>
        <span style={{ color: "#515760" }}>{group.name}</span>
      </div>

      {/* Group header */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
        boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "20px 24px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, color: tm.color, background: tm.bg, border: `1px solid ${tm.border}` }}>
                {tm.label}
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#171A1E", margin: 0 }}>{group.name}</h2>
            </div>
            <p style={{ fontSize: 13, color: "#747A82", margin: "0 0 10px", lineHeight: 1.6 }}>{group.description}</p>
            <div style={{ fontSize: 11, color: "#B0B6BF" }}>
              创建于 {group.createdAt} · 由 {group.createdBy} 建立 · 涉及 {units.join("、")}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "#9FA6AF", marginBottom: 4 }}>组平均性能得分</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: pc.color, lineHeight: 1 }}>{avgScore}</div>
            <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 4 }}>{loops.length} 个回路</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* Loop list */}
        <div style={{
          background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
          boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden",
        }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid #F1F3F6" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>组内回路</span>
          </div>
          {/* Table head */}
          <div style={{
            display: "grid", gridTemplateColumns: "140px 1fr 80px 80px 80px 80px",
            padding: "9px 18px", background: "#F9FAFB", borderBottom: "1px solid #F1F3F6",
            fontSize: 11, fontWeight: 600, color: "#9FA6AF", gap: 10,
          }}>
            <span>位号</span><span>名称</span>
            <span style={{ textAlign: "center" }}>模式</span>
            <span style={{ textAlign: "center" }}>性能分</span>
            <span style={{ textAlign: "center" }}>稳定性</span>
            <span />
          </div>
          {loops.map((loop, idx) => {
            if (!loop) return null
            const pc2 = perfColor(loop.performanceScore)
            const unit = unitForLoop(loop.id)
            return (
              <div
                key={loop.id}
                style={{
                  display: "grid", gridTemplateColumns: "140px 1fr 80px 80px 80px 80px",
                  padding: "12px 18px", gap: 10, alignItems: "center",
                  borderBottom: idx < loops.length - 1 ? "1px solid #F1F3F6" : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{loop.tag}</div>
                  <div style={{ fontSize: 10, color: "#747A82", marginTop: 1 }}>{unit?.deviceCode} {unit?.deviceName}</div>
                </div>
                <div style={{ fontSize: 12, color: "#515760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loop.name}
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                    color: loop.mode === "auto" ? "#1A7A0A" : "#92600A",
                    background: loop.mode === "auto" ? "#EDFAE8" : "#FEF9EC",
                    border: `1px solid ${loop.mode === "auto" ? "#AEEAA2" : "#F7D98A"}`,
                  }}>
                    {loop.mode === "auto" ? "自动" : loop.mode === "manual" ? "手动" : "未用"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 5, color: pc2.color, background: pc2.bg, border: `1px solid ${pc2.border}` }}>
                    {loop.performanceScore}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, color: "#515760" }}>{loop.stability}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => navigate("loop-detail", { selectedLoopId: loop.id })}
                    style={{ fontSize: 11, color: "#004B8D", background: "#EEF5FB", border: "1px solid #D9EAF7", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}
                  >
                    详情
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: relationship edges */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
            boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden",
          }}>
            <div style={{ padding: "13px 18px", borderBottom: "1px solid #F1F3F6" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>组内关联关系</span>
            </div>
            {edges.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "#9FA6AF", fontSize: 12 }}>
                暂未识别到显式关联边
              </div>
            ) : (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {edges.map((edge, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#004B8D", fontFamily: "monospace", flexShrink: 0 }}>{edge.from}</span>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ flex: 1, height: 1, background: "#E0E4E9" }} />
                      <span style={{ fontSize: 9, color: "#9FA6AF", flexShrink: 0, whiteSpace: "nowrap" }}>{edge.label}</span>
                      <div style={{ flex: 1, height: 1, background: "#E0E4E9" }} />
                    </div>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M3 2l4 3-4 3" stroke="#9FA6AF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#004B8D", fontFamily: "monospace", flexShrink: 0 }}>{edge.to}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance summary */}
          <div style={{
            background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
            boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "16px 18px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>性能分布</div>
            {loops.map((l) => {
              if (!l) return null
              const bar = Math.round((l.performanceScore / 100) * 100)
              const bpc = perfColor(l.performanceScore)
              return (
                <div key={l.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#515760" }}>{l.tag}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: bpc.color }}>{l.performanceScore}</span>
                  </div>
                  <div style={{ height: 6, background: "#F1F3F6", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${bar}%`, height: "100%", background: bpc.color, borderRadius: 3, transition: "width 500ms" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Multi-loop trend chart ── */}
      <div style={{ marginTop: 16, background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden" }}>
        <TrendTimeControls
          selectedHours={trendHours}
          onSelectHours={setTrendHours}
          granularity={trendGranularity}
          onGranularityChange={(value) => {
            const range = defaultRangeForGranularity(value)
            setTrendGranularity(value)
            setTrendCustomStart(range.start)
            setTrendCustomEnd(range.end)
          }}
          customStart={trendCustomStart}
          customEnd={trendCustomEnd}
          onCustomStartChange={setTrendCustomStart}
          onCustomEndChange={setTrendCustomEnd}
          customError={trendCustomError ? "结束时间需晚于开始时间" : undefined}
        />
        {/* Header + controls */}
        <div style={{ padding: "13px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>关联回路趋势对比</span>
          <span style={{ fontSize: 12, color: "#9FA6AF" }}>多回路 PV/SP/OUT 叠加</span>
          {/* Signal toggles */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["pv", "sp", "op"] as Signal[]).map((sig) => (
              <button key={sig} onClick={() => setEnabledSignals((prev) => { const n = new Set(prev); n.has(sig) ? n.delete(sig) : n.add(sig); return n })}
                style={{ height: 26, padding: "0 10px", borderRadius: 5, border: enabledSignals.has(sig) ? "1px solid #004B8D" : "1px solid #E0E4E9", background: enabledSignals.has(sig) ? "#EEF5FB" : "white", color: enabledSignals.has(sig) ? "#004B8D" : "#9FA6AF", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase" }}>
                {sig === "op" ? "OUT" : sig}
              </button>
            ))}
          </div>
          <div style={{ width: 1, background: "#E0E4E9", height: 18 }} />
          {/* Loop toggles */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button onClick={() => setEnabledLoops(new Set(loops.map((l) => l!.id)))}
              style={{ height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid #E0E4E9", background: enabledLoops.size === loops.length ? "#F1F3F6" : "white", fontSize: 11, color: "#515760", cursor: "pointer", fontWeight: enabledLoops.size === loops.length ? 600 : 400 }}>
              全部
            </button>
            {loops.map((l, li) => {
              if (!l) return null
              const col = LOOP_COLORS[li % LOOP_COLORS.length]
              const on = enabledLoops.has(l.id)
              return (
                <button key={l.id} onClick={() => setEnabledLoops((prev) => { const n = new Set(prev); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n })}
                  style={{ height: 26, padding: "0 10px", borderRadius: 5, border: `1px solid ${on ? col : "#E0E4E9"}`, background: on ? `${col}18` : "white", color: on ? col : "#9FA6AF", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "monospace" }}>
                  {l.tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: "16px 20px 8px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={trendData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E4E9" strokeOpacity={0.7} />
              <XAxis dataKey="timeStr" tick={{ fontSize: 10, fill: "#9FA6AF" }} tickLine={false} axisLine={{ stroke: "#E0E4E9" }} interval={Math.floor(trendData.length / 6)} />
              <YAxis tick={{ fontSize: 10, fill: "#9FA6AF" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E0E4E9", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                labelStyle={{ fontWeight: 600, marginBottom: 4, color: "#30353B" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                formatter={(value: string) => <span style={{ color: "#515760" }}>{value}</span>}
              />
              {loops.map((l, li) => {
                if (!l || !enabledLoops.has(l.id)) return null
                const col = LOOP_COLORS[li % LOOP_COLORS.length]
                return [
                  enabledSignals.has("pv") && (
                    <Line key={`${l.tag}_pv`} type="monotone" dataKey={`${l.tag}_pv`} name={`${l.tag} PV`}
                      stroke={col} strokeWidth={1.8} dot={false} strokeOpacity={0.9} />
                  ),
                  enabledSignals.has("sp") && (
                    <Line key={`${l.tag}_sp`} type="monotone" dataKey={`${l.tag}_sp`} name={`${l.tag} SP`}
                      stroke={col} strokeWidth={1.2} strokeDasharray="5 3" dot={false} strokeOpacity={0.6} />
                  ),
                  enabledSignals.has("op") && (
                    <Line key={`${l.tag}_op`} type="monotone" dataKey={`${l.tag}_op`} name={`${l.tag} OUT`}
                      stroke={col} strokeWidth={1} strokeDasharray="2 4" dot={false} strokeOpacity={0.5} />
                  ),
                ].filter(Boolean)
              })}
            </ComposedChart>
          </ResponsiveContainer>
          {/* Legend legend */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4, flexWrap: "wrap" }}>
            {[{ dash: "none", label: "PV — 实线" }, { dash: "5 3", label: "SP — 中虚线" }, { dash: "2 4", label: "OUT — 短虚线" }].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#9FA6AF" }}>
                <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#9FA6AF" strokeWidth="1.5" strokeDasharray={s.dash === "none" ? undefined : s.dash} /></svg>
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cross-loop event timeline ── */}
      <div style={{ marginTop: 16, background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "13px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>关联事件时间线</span>
          <span style={{ fontSize: 12, color: "#9FA6AF" }}>跨回路事件聚合，橙色背景表示30分钟内多回路同步触发</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {([["all", "全部"], ["alarm", "报警"], ["manual", "人工干预"]] as [string, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setEventTypeFilter(v as "all" | "alarm" | "manual")}
                style={{ height: 28, padding: "0 10px", borderRadius: 6, border: eventTypeFilter === v ? "1px solid #004B8D" : "1px solid #E0E4E9", background: eventTypeFilter === v ? "#EEF5FB" : "white", color: eventTypeFilter === v ? "#004B8D" : "#515760", fontSize: 12, fontWeight: eventTypeFilter === v ? 600 : 400, cursor: "pointer" }}>
                {l}
              </button>
            ))}
            <div style={{ width: 1, background: "#E0E4E9", margin: "0 2px" }} />
            {([1, 7, 30] as const).map((d) => (
              <button key={d} onClick={() => setEventDays(d)}
                style={{ height: 28, padding: "0 10px", borderRadius: 6, border: eventDays === d ? "1px solid #004B8D" : "1px solid #E0E4E9", background: eventDays === d ? "#EEF5FB" : "white", color: eventDays === d ? "#004B8D" : "#515760", fontSize: 12, fontWeight: eventDays === d ? 600 : 400, cursor: "pointer" }}>
                {d === 1 ? "24小时" : `${d}天`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", borderBottom: "1px solid #F1F3F6" }}>
          {[
            { label: "事件总数", value: groupEvents.length, color: "#30353B" },
            { label: "报警事件", value: groupEvents.filter((e) => e.type === "alarm").length, color: "#D93838" },
            { label: "人工干预", value: groupEvents.filter((e) => e.type === "manual").length, color: "#004B8D" },
            { label: "关联聚集", value: [...clusterMap.values()].filter(Boolean).length, color: "#C35200" },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ flex: 1, padding: "10px 16px", borderRight: i < arr.length - 1 ? "1px solid #F1F3F6" : "none" }}>
              <div style={{ fontSize: 10, color: "#9FA6AF", marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Event list */}
        {groupEvents.length === 0 ? (
          <div style={{ padding: "36px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>
            所选时间范围内无事件记录
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {groupEvents.slice(0, 60).map((ev, idx) => {
              const isCluster = clusterMap.get(ev.id)
              const loopColor = loops.findIndex((l) => l?.id === ev.loopId)
              const dotColors = ["#004B8D", "#7C3AED", "#0E766B", "#C35200", "#D93838"]
              const lc = dotColors[loopColor % dotColors.length]
              return (
                <div
                  key={ev.id}
                  style={{
                    display: "grid", gridTemplateColumns: "100px 110px 1fr auto",
                    padding: "10px 20px", gap: 12, alignItems: "center",
                    borderBottom: idx < Math.min(groupEvents.length, 60) - 1 ? "1px solid #F8F9FA" : "none",
                    background: isCluster ? "rgba(254,243,232,0.6)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#747A82", fontFamily: "monospace", whiteSpace: "nowrap" }}>{ev.time}</span>
                    {isCluster && <span title="关联聚集" style={{ fontSize: 9, color: "#C35200" }}>●</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: lc, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: lc, fontFamily: "monospace" }}>{ev.loopTag}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, flexShrink: 0,
                      color: ev.type === "alarm" ? "#A01515" : "#004B8D",
                      background: ev.type === "alarm" ? "#FEF2F2" : "#EEF5FB",
                      border: `1px solid ${ev.type === "alarm" ? "#FECACA" : "#D9EAF7"}`,
                    }}>
                      {ev.type === "alarm" ? "报警" : "人工"}
                    </span>
                    <span style={{ fontSize: 11, color: "#515760" }}>{ev.subtype}</span>
                    <span style={{ fontSize: 11, color: "#9FA6AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.description}</span>
                  </div>
                  {ev.value && (
                    <span style={{ fontSize: 11, color: "#515760", fontFamily: "monospace", flexShrink: 0 }}>{ev.value}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── root component ─────────────────────────────────────────────────────────────
export default function RelatedLoopAnalysisPage({ navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const [groups, setGroups] = useState<LoopGroup[]>(LOOP_GROUPS)
  const [suggestions, setSuggestions] = useState<SystemSuggestion[]>(SUGGESTIONS)
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null)

  const detailGroup = groups.find((g) => g.id === detailGroupId) || null

  const handleAcceptSuggestion = (sg: SystemSuggestion) => {
    const newGroup: LoopGroup = {
      id: `g-sg-${sg.id}`,
      name: `建议组（${TYPE_META[sg.type].label}）`,
      description: sg.reason,
      type: sg.type,
      loopIds: sg.loopIds,
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: "系统建议",
    }
    setGroups((prev) => [...prev, newGroup])
    setSuggestions((prev) => prev.map((s) => s.id === sg.id ? { ...s, dismissed: true } : s))
  }

  const handleDismissSuggestion = (id: string) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, dismissed: true } : s))
  }

  if (detailGroup) {
    return (
      <div style={{ padding: 24 }}>
        <GroupDetailPage
          group={detailGroup}
          onBack={() => setDetailGroupId(null)}
          navigate={navigate}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <GroupListPage
        groups={groups}
        suggestions={suggestions}
        onDrillDown={(id) => setDetailGroupId(id)}
        onAcceptSuggestion={handleAcceptSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
        navigate={navigate}
      />
    </div>
  )
}
