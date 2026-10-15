import { useState, useMemo } from "react"
import { allLoops, plant } from "../data/mockData"
import type { AppState, Loop } from "../types"

// ── event generation (mirrored from HistoryDataPage) ──────────────────────────
type EventType = "alarm" | "manual"

interface LoopEvent {
  id: string
  loopId: string
  loopTag: string
  loopName: string
  unitId: string
  time: string
  rawMs: number
  type: EventType
  subtype: string
  description: string
  operator?: string
  value?: string
}

function generateEventsForLoop(loop: Loop, days: number): LoopEvent[] {
  const now = Date.now()
  const msPerDay = 86400_000

  const alarmTemplates = [
    { subtype: "PV高限报警", description: `PV超过上限 ${(loop.trendSP + loop.trendRange).toFixed(1)} ${loop.trendUnit}`, value: `PV=${(loop.trendSP + loop.trendRange * 1.2).toFixed(2)}` },
    { subtype: "PV低限报警", description: `PV低于下限 ${(loop.trendSP - loop.trendRange).toFixed(1)} ${loop.trendUnit}`, value: `PV=${(loop.trendSP - loop.trendRange * 1.1).toFixed(2)}` },
    { subtype: "OP饱和报警", description: "输出长时间处于饱和状态（>95%），请检查阀门或工艺扰动", value: "OP=98.3%" },
    { subtype: "振荡报警",   description: "检测到持续振荡，振幅超过正常范围的2倍，建议检查PID参数", value: `Amp=±${(loop.trendRange * 0.8).toFixed(1)}` },
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
  const count = Math.min(12, Math.max(3, Math.floor((loop.oscillationRate * 100 + days * 1.5))))
  const events: LoopEvent[] = []

  for (let i = 0; i < count; i++) {
    const offsetMs = ((seed * (i + 1) * 0x9B3C) % (days * msPerDay))
    const rawMs = now - offsetMs
    const t = new Date(rawMs)
    const isAlarm = (seed + i) % 3 !== 0
    const templateList = isAlarm ? alarmTemplates : manualTemplates
    const tmpl = templateList[(seed + i * 3) % templateList.length]

    const pad = (n: number) => String(n).padStart(2, "0")
    const timeStr = days <= 1
      ? `${pad(t.getHours())}:${pad(t.getMinutes())}`
      : `${pad(t.getMonth() + 1)}/${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`

    events.push({
      id: `ev-${loop.id}-${i}`,
      loopId: loop.id,
      loopTag: loop.tag,
      loopName: loop.name,
      unitId: loop.unitId,
      time: timeStr,
      rawMs,
      type: isAlarm ? "alarm" : "manual",
      ...tmpl,
    })
  }

  return events
}

const RANGE_OPTIONS = [
  { label: "24小时", days: 1  },
  { label: "7天",    days: 7  },
  { label: "30天",   days: 30 },
]

const TYPE_LABELS: Record<EventType, string> = { alarm: "报警", manual: "人工干预" }
const TYPE_COLORS: Record<EventType, { color: string; bg: string; border: string }> = {
  alarm:  { color: "#A01515", bg: "#FEF2F2", border: "#FECACA" },
  manual: { color: "#5B21B6", bg: "#F5F3FF", border: "#DDD6FE" },
}

export default function EventAnalysisPage({ navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const [days, setDays] = useState(7)
  const [typeFilter, setTypeFilter] = useState<"all" | "alarm" | "manual">("all")
  const [unitFilter, setUnitFilter] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const allEvents = useMemo(() => {
    const evs: LoopEvent[] = []
    for (const loop of allLoops) {
      evs.push(...generateEventsForLoop(loop, days))
    }
    return evs.sort((a, b) => b.rawMs - a.rawMs)
  }, [days])

  const filtered = useMemo(() => {
    return allEvents.filter((ev) => {
      if (typeFilter !== "all" && ev.type !== typeFilter) return false
      if (unitFilter && ev.unitId !== unitFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return ev.loopTag.toLowerCase().includes(q) || ev.loopName.toLowerCase().includes(q) || ev.subtype.includes(q)
      }
      return true
    })
  }, [allEvents, typeFilter, unitFilter, search])

  // Reset to page 1 on filter change
  const pageSlice = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  }, [filtered, page])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const alarmCount  = filtered.filter((e) => e.type === "alarm").length
  const manualCount = filtered.filter((e) => e.type === "manual").length

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>事件分析</h1>
        <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>全厂所有控制回路报警事件与人工干预事件汇总</p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "事件总数", value: filtered.length, color: "#004B8D" },
          { label: "报警事件", value: alarmCount,       color: "#A01515" },
          { label: "人工干预", value: manualCount,      color: "#5B21B6" },
        ].map((s) => (
          <div key={s.label} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 2px 8px rgba(27,39,52,0.06)", padding: "14px 22px", minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#9FA6AF", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Time range */}
        <div style={{ display: "flex", gap: 2, background: "white", borderRadius: 8, border: "1px solid #E0E4E9", padding: 3 }}>
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.days}
              onClick={() => { setDays(r.days); setPage(1) }}
              style={{
                padding: "4px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
                background: days === r.days ? "#004B8D" : "transparent",
                color: days === r.days ? "white" : "#515760",
                transition: "background 120ms",
              }}
            >{r.label}</button>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ display: "flex", gap: 2, background: "white", borderRadius: 8, border: "1px solid #E0E4E9", padding: 3 }}>
          {(["all", "alarm", "manual"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1) }}
              style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
                background: typeFilter === t ? "#004B8D" : "transparent",
                color: typeFilter === t ? "white" : "#515760",
                transition: "background 120ms",
              }}
            >{t === "all" ? "全部" : TYPE_LABELS[t]}</button>
          ))}
        </div>

        {/* Unit filter */}
        <select value={unitFilter} onChange={(e) => { setUnitFilter(e.target.value); setPage(1) }}
          style={{ height: 36, padding: "0 10px", border: "1px solid #E0E4E9", borderRadius: 8, fontSize: 13, color: "#515760", background: "white", outline: "none" }}>
          <option value="">所有装置</option>
          {plant.units.map((u) => <option key={u.id} value={u.id}>{u.deviceCode} {u.deviceName}</option>)}
        </select>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 36, background: "white", borderRadius: 8, border: "1px solid #E0E4E9", minWidth: 200 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4.5" stroke="#9FA6AF" strokeWidth="1.3" />
            <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#9FA6AF" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="搜索位号/名称/事件类型…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#30353B" }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "140px 140px 160px 80px 120px 1fr 130px",
          padding: "10px 20px", background: "#F9FAFB", borderBottom: "1px solid #F1F3F6",
          fontSize: 11, fontWeight: 600, color: "#9FA6AF", gap: 10,
        }}>
          <span>时间</span>
          <span>位号</span>
          <span>回路名称</span>
          <span>类型</span>
          <span>事件子类</span>
          <span>描述</span>
          <span>操作员 / 数值</span>
        </div>

        {pageSlice.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>
            当前筛选条件下无事件记录
          </div>
        ) : (
          pageSlice.map((ev, idx) => {
            const tc = TYPE_COLORS[ev.type]
            const unit = plant.units.find((u) => u.id === ev.unitId)
            return (
              <div
                key={ev.id}
                style={{
                  display: "grid", gridTemplateColumns: "140px 140px 160px 80px 120px 1fr 130px",
                  padding: "11px 20px", gap: 10, alignItems: "center",
                  borderBottom: idx < pageSlice.length - 1 ? "1px solid #F1F3F6" : "none",
                  transition: "background 100ms",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <span style={{ fontSize: 11, color: "#747A82", fontFamily: "monospace" }}>{ev.time}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{ev.loopTag}</div>
                  <div style={{ fontSize: 10, color: "#9FA6AF" }}>{unit?.deviceCode}</div>
                </div>
                <span style={{ fontSize: 11, color: "#515760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.loopName}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                  color: tc.color, background: tc.bg, border: `1px solid ${tc.border}`,
                  whiteSpace: "nowrap", display: "inline-block",
                }}>
                  {TYPE_LABELS[ev.type]}
                </span>
                <span style={{ fontSize: 11, color: "#30353B", fontWeight: 500 }}>{ev.subtype}</span>
                <span style={{ fontSize: 11, color: "#747A82", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.description}</span>
                <div style={{ fontSize: 11, color: "#515760" }}>
                  {ev.operator && <div style={{ color: "#9FA6AF", fontWeight: 500 }}>{ev.operator}</div>}
                  {ev.value && <div style={{ fontFamily: "monospace", color: "#30353B", fontSize: 10 }}>{ev.value}</div>}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: "5px 14px", border: "1px solid #E0E4E9", borderRadius: 7, background: "white", cursor: page === 1 ? "default" : "pointer", fontSize: 12, color: page === 1 ? "#CDD2D9" : "#515760" }}
          >上一页</button>
          <span style={{ fontSize: 12, color: "#747A82" }}>第 {page} / {totalPages} 页，共 {filtered.length} 条</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: "5px 14px", border: "1px solid #E0E4E9", borderRadius: 7, background: "white", cursor: page === totalPages ? "default" : "pointer", fontSize: 12, color: page === totalPages ? "#CDD2D9" : "#515760" }}
          >下一页</button>
        </div>
      )}
    </div>
  )
}
