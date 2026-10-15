import { useState, useMemo } from "react"
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts"
import { allLoops, generateHistoryData, plant } from "../data/mockData"
import type { AppState, Loop } from "../types"

const RANGE_OPTIONS = [
  { label: "24小时", days: 1 },
  { label: "7天",    days: 7 },
  { label: "30天",   days: 30 },
]

// ── mock event generation ──────────────────────────────────────────────────────
type EventType = "alarm" | "manual"

interface LoopEvent {
  id: string
  time: string
  type: EventType
  subtype: string
  description: string
  operator?: string
  value?: string
}

function generateEvents(loop: Loop, days: number): LoopEvent[] {
  const now = Date.now()
  const msPerDay = 86400_000
  const events: LoopEvent[] = []

  const alarmTemplates = [
    { subtype: "PV高限报警", description: `PV超过上限 ${(loop.trendSP + loop.trendRange).toFixed(1)} ${loop.trendUnit}`, value: `PV=${(loop.trendSP + loop.trendRange * 1.2).toFixed(2)}` },
    { subtype: "PV低限报警", description: `PV低于下限 ${(loop.trendSP - loop.trendRange).toFixed(1)} ${loop.trendUnit}`, value: `PV=${(loop.trendSP - loop.trendRange * 1.1).toFixed(2)}` },
    { subtype: "OP饱和报警", description: "输出长时间处于饱和状态（>95%），请检查阀门或工艺扰动", value: "OP=98.3%" },
    { subtype: "振荡报警",   description: "检测到持续振荡，振幅超过正常范围的2倍，建议检查PID参数", value: `Amp=±${(loop.trendRange * 0.8).toFixed(1)}` },
    { subtype: "偏差报警",   description: `PV持续偏离SP超过 ${(loop.trendRange * 0.3).toFixed(1)} ${loop.trendUnit} 超过10分钟`, value: "Δ=持续偏高" },
  ]

  const manualTemplates = [
    { subtype: "切换手动", description: "操作员将回路从自动切换至手动模式，进行阀门检查", operator: "张工" },
    { subtype: "恢复自动", description: "检查完成，回路恢复自动模式运行", operator: "张工" },
    { subtype: "修改设定值", description: `SP从 ${loop.trendSP.toFixed(1)} 调整至 ${(loop.trendSP * 1.04).toFixed(1)} ${loop.trendUnit}，配合工况调整`, operator: "李工", value: `${loop.trendSP.toFixed(1)} → ${(loop.trendSP * 1.04).toFixed(1)}` },
    { subtype: "PID参数调整", description: `积分时间 I 从 ${loop.pid.I.toFixed(2)} 调整至 ${(loop.pid.I * 0.85).toFixed(2)}，改善响应速度`, operator: "王工", value: `I: ${loop.pid.I.toFixed(2)}→${(loop.pid.I * 0.85).toFixed(2)}` },
    { subtype: "修改量程",  description: "SP上限从原值调整，配合本次工艺负荷变化", operator: "张工", value: `SPH: ${loop.pid.spHi}` },
  ]

  // Seed deterministically from loop id + days
  const seed = loop.id.charCodeAt(loop.id.length - 1) + days * 7

  const count = Math.min(12, Math.max(3, Math.floor((loop.oscillationRate * 100 + days * 1.5))))
  for (let i = 0; i < count; i++) {
    const offsetMs = ((seed * (i + 1) * 0x9B3C) % (days * msPerDay))
    const t = new Date(now - offsetMs)
    const isAlarm = (seed + i) % 3 !== 0
    const templateList = isAlarm ? alarmTemplates : manualTemplates
    const tmpl = templateList[(seed + i * 3) % templateList.length]

    const pad = (n: number) => String(n).padStart(2, "0")
    const timeStr = days <= 1
      ? `${pad(t.getHours())}:${pad(t.getMinutes())}`
      : `${pad(t.getMonth() + 1)}/${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`

    events.push({
      id: `ev-${loop.id}-${i}`,
      time: timeStr,
      type: isAlarm ? "alarm" : "manual",
      ...tmpl,
    })
  }

  // Sort by time string descending (most recent first)
  return events.sort((a, b) => b.time.localeCompare(a.time))
}

// ── sub-components ─────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color, sub }: { label: string; value: string; unit?: string; color?: string; sub?: string }) {
  return (
    <div style={{
      background: "white", borderRadius: 10, padding: "14px 18px",
      border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 2px 8px rgba(27,39,52,0.06)",
      flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: "#747A82", marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span className="font-data" style={{ fontSize: 24, fontWeight: 800, color: color || "#171A1E", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: "#9FA6AF" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, color: "#B0B6BF", marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function AlarmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L12.5 11H1.5L7 1.5Z" stroke="#D93838" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="7" y1="5.5" x2="7" y2="8" stroke="#D93838" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="9.5" r="0.7" fill="#D93838" />
    </svg>
  )
}

function ManualIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="#7C3AED" strokeWidth="1.3" />
      <line x1="7" y1="4" x2="7" y2="7.5" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="9.5" r="0.7" fill="#7C3AED" />
    </svg>
  )
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function HistoryDataPage({ navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const [selectedLoopId, setSelectedLoopId] = useState(allLoops[0]?.id || "")
  const [days, setDays] = useState(1)
  const [showOP, setShowOP] = useState(true)
  const [showSP, setShowSP] = useState(true)
  const [eventTab, setEventTab] = useState<"all" | "alarm" | "manual">("all")

  const loop = allLoops.find((l) => l.id === selectedLoopId) || allLoops[0]
  const unit = loop ? plant.units.find((u) => u.id === loop.unitId) : null

  const histData = useMemo(() => {
    if (!loop) return []
    return generateHistoryData(loop.trendSP, loop.trendRange, loop.trendOpBase, loop.trendPattern, days)
  }, [loop, days])

  const pvVals = histData.map((d) => d.pv)
  const stats = useMemo(() => {
    if (pvVals.length === 0 || !loop) return null
    const mean = pvVals.reduce((s, v) => s + v, 0) / pvVals.length
    const max = Math.max(...pvVals)
    const min = Math.min(...pvVals)
    const variance = pvVals.reduce((s, v) => s + (v - mean) ** 2, 0) / pvVals.length
    const stdDev = Math.sqrt(variance)
    const inBand = pvVals.filter((v) => Math.abs(v - loop.trendSP) <= loop.trendRange * 0.15).length
    const inBandPct = (inBand / pvVals.length) * 100
    return { mean, max, min, stdDev, inBandPct }
  }, [pvVals, loop])

  const events = useMemo(() => loop ? generateEvents(loop, days) : [], [loop, days])
  const alarmEvents  = events.filter((e) => e.type === "alarm")
  const manualEvents = events.filter((e) => e.type === "manual")
  const displayEvents = eventTab === "alarm" ? alarmEvents : eventTab === "manual" ? manualEvents : events

  const xInterval = Math.max(1, Math.floor(histData.length / 10))

  return (
    <div style={{ padding: 24 }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>趋势分析</h1>
        <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>选择回路和时间范围，查看历史趋势、统计指标与操作事件</p>
      </div>

      {/* ── Controls bar ── */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
        boxShadow: "0 2px 8px rgba(27,39,52,0.05)", padding: "14px 18px", marginBottom: 16,
        display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>控制回路</div>
          <select
            value={selectedLoopId}
            onChange={(e) => setSelectedLoopId(e.target.value)}
            style={{
              height: 36, padding: "0 32px 0 10px", minWidth: 240,
              border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 13,
              color: "#30353B", background: "white", outline: "none", appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23747A82' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "calc(100% - 10px) center",
            }}
          >
            {allLoops.map((l) => (
              <option key={l.id} value={l.id}>{l.tag} — {l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>时间范围</div>
          <div style={{ display: "flex", gap: 4 }}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                style={{
                  height: 36, padding: "0 14px", borderRadius: 8, fontSize: 13,
                  border: days === opt.days ? "1px solid #004B8D" : "1px solid #CDD2D9",
                  background: days === opt.days ? "#EEF5FB" : "white",
                  color: days === opt.days ? "#004B8D" : "#515760",
                  fontWeight: days === opt.days ? 600 : 400, cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#515760", cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={showSP} onChange={(e) => setShowSP(e.target.checked)} style={{ accentColor: "#3E8FC3" }} />
            SP
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#515760", cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={showOP} onChange={(e) => setShowOP(e.target.checked)} style={{ accentColor: "#39C523" }} />
            OP
          </label>
        </div>
      </div>

      {/* ── Stats cards (above chart) ── */}
      {stats && loop && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <StatCard label="PV 均值" value={stats.mean.toFixed(2)} unit={loop.trendUnit} color="#004B8D" sub="时段平均过程量" />
          <StatCard label="PV 最大值" value={stats.max.toFixed(2)} unit={loop.trendUnit} color="#D93838" sub={`上限 ${loop.pid.spHi}`} />
          <StatCard label="PV 最小值" value={stats.min.toFixed(2)} unit={loop.trendUnit} color="#0069A8" sub={`下限 ${loop.pid.spLo}`} />
          <StatCard
            label="标准差 σ" value={stats.stdDev.toFixed(3)} unit={loop.trendUnit}
            color={stats.stdDev > loop.trendRange * 0.15 ? "#F28C28" : "#39C523"}
            sub={stats.stdDev > loop.trendRange * 0.15 ? "波动偏大" : "波动正常"}
          />
          <StatCard
            label="带内率" value={stats.inBandPct.toFixed(1)} unit="%"
            color={stats.inBandPct >= 80 ? "#1A7A0A" : "#D93838"}
            sub={stats.inBandPct >= 80 ? "达标 ≥80%" : "未达标 <80%"}
          />
          <StatCard label="报警事件" value={String(alarmEvents.length)} unit="次" color={alarmEvents.length > 0 ? "#D93838" : "#39C523"} sub="时段内" />
          <StatCard label="人工干预" value={String(manualEvents.length)} unit="次" color="#7C3AED" sub="时段内" />
        </div>
      )}

      {/* ── Trend chart ── */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
        boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "18px 20px 12px", marginBottom: 16,
      }}>
        {/* Chart header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#30353B" }}>
              <span className="font-mono-code">{loop?.tag}</span>
              <span style={{ fontWeight: 400, color: "#747A82", marginLeft: 6 }}>{loop?.name}</span>
            </div>
            <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 2 }}>
              {unit?.deviceCode} {unit?.deviceName}
              {" · "}
              {RANGE_OPTIONS.find((o) => o.days === days)?.label} · {histData.length} 个数据点
            </div>
          </div>
          {/* Legend */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 20, height: 2, background: "#004B8D", display: "inline-block" }} />
              <span style={{ color: "#515760" }}>PV ({loop?.trendUnit})</span>
            </span>
            {showSP && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 20, borderTop: "2px dashed #3E8FC3", display: "inline-block" }} />
                <span style={{ color: "#515760" }}>SP</span>
              </span>
            )}
            {showOP && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 20, height: 2, background: "#39C523", display: "inline-block" }} />
                <span style={{ color: "#515760" }}>OP (%)</span>
              </span>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={histData} margin={{ top: 4, right: 52, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E4E9" strokeOpacity={0.7} />
            <XAxis dataKey="timeStr" tick={{ fontSize: 10, fill: "#747A82" }} tickLine={false} axisLine={{ stroke: "#E0E4E9" }} interval={xInterval} />
            <YAxis yAxisId="pv" tick={{ fontSize: 10, fill: "#747A82" }} tickLine={false} axisLine={false} width={52} unit={` ${loop?.trendUnit || ""}`} />
            <YAxis yAxisId="op" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: "#39C523" }} tickLine={false} axisLine={false} unit="%" width={40} />
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              labelStyle={{ color: "#747A82", fontWeight: 600 }}
            />
            {loop && (
              <>
                <ReferenceLine yAxisId="pv" y={loop.pid.spHi} stroke="#F2B544" strokeDasharray="4 3" strokeWidth={1} label={{ value: "SP-H", fill: "#F2B544", fontSize: 9 }} />
                <ReferenceLine yAxisId="pv" y={loop.pid.spLo} stroke="#F2B544" strokeDasharray="4 3" strokeWidth={1} label={{ value: "SP-L", fill: "#F2B544", fontSize: 9 }} />
              </>
            )}
            <Line yAxisId="pv" type="monotone" dataKey="pv" stroke="#004B8D" strokeWidth={1.5} dot={false} name="PV" activeDot={{ r: 3, fill: "#004B8D" }} />
            {showSP && <Line yAxisId="pv" type="monotone" dataKey="sp" stroke="#3E8FC3" strokeWidth={1} strokeDasharray="6 4" dot={false} name="SP" />}
            {showOP && <Line yAxisId="op" type="monotone" dataKey="op" stroke="#39C523" strokeWidth={1.5} dot={false} name="OP" />}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Stat note below chart */}
        <div style={{ fontSize: 11, color: "#9FA6AF", borderTop: "1px solid #F1F3F6", paddingTop: 10, marginTop: 4 }}>
          <span style={{ fontWeight: 600, color: "#747A82" }}>带内率说明：</span>
          PV 在 SP ±15% 范围内的时间占比，参考 GB/T 44693.2-2024 准确率计算方法。标准差越小表示控制越稳定；带内率低于 80% 提示应检查 PID 参数或工艺扰动。
        </div>
      </div>

      {/* ── Event list ── */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
        boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden",
      }}>
        {/* Event list header + tabs */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>事件列表</span>
          <span style={{ fontSize: 12, color: "#9FA6AF" }}>{RANGE_OPTIONS.find((o) => o.days === days)?.label}内共 {events.length} 条事件</span>

          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {([
              { key: "all",    label: `全部 (${events.length})` },
              { key: "alarm",  label: `报警事件 (${alarmEvents.length})` },
              { key: "manual", label: `人工干预 (${manualEvents.length})` },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setEventTab(tab.key)}
                style={{
                  height: 30, padding: "0 12px", borderRadius: 7, fontSize: 12,
                  border: eventTab === tab.key ? "1px solid #004B8D" : "1px solid #E0E4E9",
                  background: eventTab === tab.key ? "#EEF5FB" : "white",
                  color: eventTab === tab.key ? "#004B8D" : "#747A82",
                  fontWeight: eventTab === tab.key ? 600 : 400, cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {displayEvents.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>
            该时段内无{eventTab === "alarm" ? "报警" : eventTab === "manual" ? "人工干预" : ""}事件
          </div>
        ) : (
          <div>
            {/* Table head */}
            <div style={{
              display: "grid", gridTemplateColumns: "110px 100px 140px 1fr 120px",
              padding: "8px 20px", background: "#F9FAFB", borderBottom: "1px solid #F1F3F6",
              fontSize: 11, fontWeight: 600, color: "#9FA6AF", gap: 12,
            }}>
              <span>时间</span>
              <span>类型</span>
              <span>子类</span>
              <span>描述</span>
              <span>值 / 操作员</span>
            </div>

            {displayEvents.map((ev, idx) => {
              const isAlarm = ev.type === "alarm"
              return (
                <div
                  key={ev.id}
                  style={{
                    display: "grid", gridTemplateColumns: "110px 100px 140px 1fr 120px",
                    padding: "12px 20px", gap: 12, alignItems: "center",
                    borderBottom: idx < displayEvents.length - 1 ? "1px solid #F1F3F6" : "none",
                    background: isAlarm ? "#FFFBFB" : "#FDFAFF",
                    borderLeft: `3px solid ${isAlarm ? "#FECACA" : "#DDD6FE"}`,
                  }}
                >
                  {/* Time */}
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#515760" }}>{ev.time}</span>

                  {/* Type badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {isAlarm ? <AlarmIcon /> : <ManualIcon />}
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                      color: isAlarm ? "#A01515" : "#5B21B6",
                      background: isAlarm ? "#FEF2F2" : "#F5F3FF",
                      border: `1px solid ${isAlarm ? "#FECACA" : "#DDD6FE"}`,
                    }}>
                      {isAlarm ? "报警" : "人工干预"}
                    </span>
                  </div>

                  {/* Subtype */}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#30353B" }}>{ev.subtype}</span>

                  {/* Description */}
                  <span style={{ fontSize: 12, color: "#515760", lineHeight: 1.5 }}>{ev.description}</span>

                  {/* Value / operator */}
                  <div style={{ fontSize: 11 }}>
                    {ev.value && (
                      <div style={{ fontFamily: "monospace", color: isAlarm ? "#A01515" : "#5B21B6", fontWeight: 600, marginBottom: ev.operator ? 2 : 0 }}>
                        {ev.value}
                      </div>
                    )}
                    {ev.operator && (
                      <div style={{ color: "#9FA6AF" }}>操作员：{ev.operator}</div>
                    )}
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
