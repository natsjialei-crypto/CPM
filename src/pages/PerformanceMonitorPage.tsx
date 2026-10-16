import { useState, useEffect, useRef, useMemo } from "react"
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { plant, allLoops, calculateLoopIAE } from "../data/mockData"
import type { AppState, Unit, Loop } from "../types"
import { LoopList, VerticalBar, ModeBadge, perfColor, levelLabel, levelColor } from "./LoopMonitorPage"
import TrendTimeControls, { defaultRangeForGranularity } from "../components/TrendTimeControls"
import type { TrendGranularity } from "../components/TrendTimeControls"

// ── Performance loop view ─────────────────────────────────────────────────────
const KPI_DEFS = [
  { key: "performanceScore", label: "性能评分", unit: "分", color: "#004B8D" },
  { key: "autoRate",         label: "自控率",   unit: "%",  color: "#0069A8" },
  { key: "effectiveAutoRate",label: "有效自控率",unit: "%",  color: "#3E8FC3" },
  { key: "accuracy",         label: "准确率",   unit: "%",  color: "#1A7A0A" },
  { key: "speed",            label: "快速率",   unit: "%",  color: "#39A820" },
  { key: "stability",        label: "稳定率",   unit: "%",  color: "#0E766B" },
  { key: "iae",              label: "累计控制偏差（IAE）", unit: "", color: "#C35200" },
] as const
type KpiKey = typeof KPI_DEFS[number]["key"]

function generateKpiHistory(loop: Loop, hours = 24) {
  const pts = Math.max(2, Math.min(2000, Math.ceil(hours * 12)))
  const seed = loop.id.charCodeAt(loop.id.length - 1)
  return Array.from({ length: pts }, (_, i) => {
    const frac = i / (pts - 1)
    const t = new Date(Date.now() - (1 - frac) * hours * 3600_000)
    const pad = (n: number) => String(n).padStart(2, "0")
    const label = `${pad(t.getHours())}:${pad(t.getMinutes())}`
    const noise = (k: number) => Math.sin(i * 0.3 + seed * k) * 0.04 + (Math.random() - 0.5) * 0.02
    return {
      label,
      performanceScore: +(loop.performanceScore * (1 + noise(1))).toFixed(1),
      autoRate:          +(loop.autoRate          * (1 + noise(2))).toFixed(1),
      effectiveAutoRate: +(loop.effectiveAutoRate  * (1 + noise(3))).toFixed(1),
      accuracy:          +(loop.accuracy           * (1 + noise(4))).toFixed(1),
      speed:             +(loop.speed              * (1 + noise(5))).toFixed(1),
      stability:         +(loop.stability          * (1 + noise(6))).toFixed(1),
      iae:               +(calculateLoopIAE(loop)  * (1 + noise(7))).toFixed(1),
    }
  })
}

function PerformanceLoopView({
  loop,
  onBack,
  backLabel = "返回",
}: {
  loop: Loop
  onBack: () => void
  backLabel?: string
}) {
  const unit = plant.units.find((u) => u.id === loop.unitId)
  const isShutdown = unit?.status === "shutdown"

  const hiPV = loop.trendSP + loop.trendRange * 2
  const loPV = Math.max(0, loop.trendSP - loop.trendRange * 2)

  const [live, setLive] = useState({ pv: loop.trendSP + (Math.random() - 0.5) * loop.trendRange * 0.4, sp: loop.trendSP, op: loop.trendOpBase })
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

  const pc = perfColor(loop.performanceScore)
  const lc = levelColor(loop.performanceLevel)
  const iae = calculateLoopIAE(loop).toFixed(1)

  // KPI trend
  const [activeTab, setActiveTab] = useState<"趋势图表" | "诊断结果" | "PID参数" | "操作分析" | "相关回路" | "故障分析">("趋势图表")
  const [kpiWindowHours, setKpiWindowHours] = useState<number | null>(8)
  const [kpiPanOffset, setKpiPanOffset] = useState(0)
  const [kpiGranularity, setKpiGranularity] = useState<TrendGranularity>("hour")
  const initialKpiRange = defaultRangeForGranularity("hour")
  const [kpiCustomStart, setKpiCustomStart] = useState(initialKpiRange.start)
  const [kpiCustomEnd, setKpiCustomEnd] = useState(initialKpiRange.end)
  const [selectedKpis, setSelectedKpis] = useState<Set<KpiKey>>(new Set(KPI_DEFS.map((k) => k.key)))
  const kpiCustomHours = (new Date(kpiCustomEnd).getTime() - new Date(kpiCustomStart).getTime()) / 3600_000
  const kpiCustomError = kpiWindowHours === null && (!Number.isFinite(kpiCustomHours) || kpiCustomHours <= 0)
  const kpiHistory = useMemo(() => generateKpiHistory(loop, kpiWindowHours === null && !kpiCustomError ? kpiCustomHours : 24), [kpiCustomError, kpiCustomHours, kpiWindowHours, loop])
  const kpiWindowSteps = Math.max(3, Math.floor((kpiWindowHours ?? 1) * 12))
  const kpiMaxOffset = Math.max(0, kpiHistory.length - kpiWindowSteps)
  const kpiPanStep = Math.max(1, Math.floor(kpiWindowSteps / 2))
  const quickKpiHistory = useMemo(() => {
    const end = Math.max(0, kpiHistory.length - kpiPanOffset)
    const start = Math.max(0, end - kpiWindowSteps)
    return kpiHistory.slice(start, end)
  }, [kpiHistory, kpiPanOffset, kpiWindowSteps])
  const displayKpiHistory = useMemo(() => {
    if (kpiWindowHours !== null) return quickKpiHistory
    if (kpiCustomError) return []
    const desired = kpiGranularity === "hour"
      ? Math.ceil(kpiCustomHours)
      : kpiGranularity === "day"
        ? Math.ceil(kpiCustomHours / 24)
        : Math.ceil(kpiCustomHours / (24 * 30))
    const count = Math.max(2, Math.min(kpiHistory.length, desired))
    if (count >= kpiHistory.length) return kpiHistory
    return Array.from({ length: count }, (_, index) =>
      kpiHistory[Math.round((index * (kpiHistory.length - 1)) / (count - 1))],
    )
  }, [kpiCustomError, kpiCustomHours, kpiGranularity, kpiHistory, kpiWindowHours, quickKpiHistory])
  const kpiXInterval = Math.max(1, Math.floor(displayKpiHistory.length / 8))
  const toggleKpi = (key: KpiKey) => setSelectedKpis((prev) => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  const processTypeMap: Record<string, string> = { flow: "流量", pressure: "压力", level: "液位", temperature: "温度", composition: "成分" }
  const loopTypeMap: Record<string, string> = { single: "单回路", cascade: "串级", split: "分程", override: "超驰", feedforward: "前馈" }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "13px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#004B8D", padding: 0, display: "flex", alignItems: "center", gap: 4, fontWeight: 500, fontSize: 13 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {backLabel}
            </button>
            <span style={{ color: "#CDD2D9" }}>/</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{loop.tag}</span>
            <span style={{ fontSize: 14, color: "#30353B", fontWeight: 500 }}>{loop.name}</span>
            <ModeBadge mode={loop.mode} />
            {!isShutdown && <PerfLevelBadge level={loop.performanceLevel} />}
          </div>
          <span style={{ fontSize: 12, color: "#9FA6AF" }}>{unit?.deviceCode} {unit?.deviceName} · {loopTypeMap[loop.loopType]} · {processTypeMap[loop.processType]}</span>
        </div>
      </div>

      {/* Top row: DCS faceplate | loop info + live KPIs */}
      <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
        {/* Left: original PID panel structure with light theme */}
        <div style={{ flexShrink: 0, width: 272 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #CDD2D9", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "18px 20px", fontFamily: "monospace", height: "100%", boxSizing: "border-box" }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#004B8D", letterSpacing: 1 }}>{loop.tag}</div>
              <div style={{ fontSize: 10, color: "#747A82", marginTop: 2 }}>{loop.name}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, background: "#EEF5FB", border: "1px solid #B8D8EE", borderRadius: 4, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#004B8D" }}>{live.op.toFixed(1)}</div>
              </div>
              <div style={{ flex: 1, background: "#FEF9EC", border: "1px solid #F7D98A", borderRadius: 4, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#92600A" }}>{live.pv.toFixed(1)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#747A82" }}>%</div>
              <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#747A82" }}>{loop.trendUnit}</div>
            </div>
            <div style={{ display: "flex", marginBottom: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginRight: 14, paddingTop: 20 }}>
                {["AUTO", "MAN", "Mode..."].map((mode) => {
                  const active = mode === "AUTO" && loop.mode === "auto"
                  return (
                    <div key={mode} style={{ padding: "4px 8px", fontSize: 10, fontWeight: 700, background: active ? "#EEF5FB" : "#F1F3F6", color: active ? "#004B8D" : "#9FA6AF", border: `1px solid ${active ? "#82B9DD" : "#CDD2D9"}`, borderRadius: 3, textAlign: "center", userSelect: "none" }}>{mode}</div>
                  )
                })}
              </div>
              <div style={{ flex: 1, display: "flex", gap: 16, justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: "#747A82" }}>100</div>
                  <VerticalBar value={live.op} hi={100} lo={0} fillColor="#3E8FC3" variant="light" />
                  <div style={{ fontSize: 9, color: "#747A82" }}>0</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: "#747A82" }}>{hiPV.toFixed(1)}</div>
                  <div style={{ position: "relative" }}>
                    <VerticalBar value={live.pv} hi={hiPV} lo={loPV} fillColor="#F2B544" spValue={live.sp} showSP variant="light" />
                  </div>
                  <div style={{ fontSize: 9, color: "#747A82" }}>{loPV.toFixed(1)}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#747A82", borderTop: "1px solid #E0E4E9", paddingTop: 10 }}>
              <span>SP <span style={{ color: "#004B8D" }}>{live.sp.toFixed(1)}</span></span>
              <span>PV <span style={{ color: "#92600A" }}>{live.pv.toFixed(1)}</span></span>
              <span>OUT <span style={{ color: "#004B8D" }}>{live.op.toFixed(1)}</span></span>
            </div>
          </div>
        </div>

        {/* Right: loop info + live KPI */}
        <div style={{ flex: 1, minWidth: 0, background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Loop info rows */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9FA6AF", marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>回路信息</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
              {[
                { label: "回路位号",  value: loop.tag,          mono: true },
                { label: "回路名称",  value: loop.name },
                { label: "归属单元",  value: `${unit?.deviceCode} ${unit?.deviceName}` },
                { label: "回路类型",  value: loopTypeMap[loop.loopType] },
                { label: "过程类型",  value: processTypeMap[loop.processType] },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "5px 0", borderBottom: "1px solid #F8F9FA" }}>
                  <span style={{ fontSize: 11, color: "#9FA6AF", flexShrink: 0, width: 72 }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: "#30353B", fontFamily: item.mono ? "monospace" : "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live KPI list */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9FA6AF", marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>实时性能指标</div>
            <div style={{ display: "flex", flexDirection: "column", borderRadius: 8, border: "1px solid #E0E4E9", overflow: "hidden" }}>
              {[
                { label: "性能评分", value: loop.performanceScore.toFixed(1), unit: "分", color: pc.color },
                { label: "定级",     value: levelLabel(loop.performanceLevel), color: lc.color },
                { label: "自控率",   value: `${loop.autoRate.toFixed(1)}%`,            color: "#004B8D" },
                { label: "有效自控率",value: `${loop.effectiveAutoRate.toFixed(1)}%`,  color: "#0069A8" },
                { label: "准确率",   value: `${loop.accuracy.toFixed(1)}%`,            color: "#1A7A0A" },
                { label: "快速率",   value: `${loop.speed.toFixed(1)}%`,               color: "#39A820" },
                { label: "稳定率",   value: `${loop.stability.toFixed(1)}%`,           color: "#0E766B" },
                { label: "累计控制偏差（IAE）", value: iae, unit: `${loop.trendUnit}·h`, color: "#C35200" },
              ].map((k, i, arr) => (
                <div key={k.label} style={{ minHeight: 40, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: i < arr.length - 1 ? "1px solid #F1F3F6" : "none", background: i % 2 === 0 ? "#FAFBFC" : "#FFFFFF" }}>
                  <div style={{ fontSize: 11, color: "#747A82", whiteSpace: "nowrap", fontWeight: 500 }}>{k.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: k.color, fontFamily: "monospace", lineHeight: 1, whiteSpace: "nowrap", textAlign: "right" }}>
                    {k.value}
                    {"unit" in k && k.unit && <span style={{ fontSize: 10, fontWeight: 400, color: "#9FA6AF", marginLeft: 2 }}>{k.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Tab bar */}
        <div style={{ background: "white", borderRadius: "12px 12px 0 0", border: "1px solid rgba(96,108,122,0.12)", borderBottom: "none", boxShadow: "0 -2px 8px rgba(27,39,52,0.04)", padding: "0 20px", display: "flex", gap: 0 }}>
          {(["趋势图表", "诊断结果", "PID参数", "操作分析", "相关回路", "故障分析"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: "12px 18px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "#004B8D" : "#6B7280",
                background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid #004B8D" : "2px solid transparent",
                cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap",
              }}>
              {tab}
            </button>
          ))}
        </div>
        {/* Tab content */}
        <div style={{ background: "white", borderRadius: "0 0 12px 12px", border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden" }}>
          {activeTab === "趋势图表" && (
            <div>
              <TrendTimeControls
                selectedHours={kpiWindowHours}
                onSelectHours={(hours) => {
                  setKpiWindowHours(hours)
                  setKpiPanOffset(0)
                }}
                granularity={kpiGranularity}
                onGranularityChange={(value) => {
                  const range = defaultRangeForGranularity(value)
                  setKpiGranularity(value)
                  setKpiCustomStart(range.start)
                  setKpiCustomEnd(range.end)
                }}
                customStart={kpiCustomStart}
                customEnd={kpiCustomEnd}
                onCustomStartChange={setKpiCustomStart}
                onCustomEndChange={setKpiCustomEnd}
                customError={kpiCustomError ? "结束时间需晚于开始时间" : undefined}
                navigation={{
                  offset: kpiPanOffset,
                  maxOffset: kpiMaxOffset,
                  onOlder: () => setKpiPanOffset((offset) => Math.min(kpiMaxOffset, offset + kpiPanStep)),
                  onNewer: () => setKpiPanOffset((offset) => Math.max(0, offset - kpiPanStep)),
                  onLatest: () => setKpiPanOffset(0),
                  onSlide: setKpiPanOffset,
                }}
              />

              <div style={{ padding: "13px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#9FA6AF" }}>KPI参数</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {KPI_DEFS.map((kd) => {
                    const on = selectedKpis.has(kd.key)
                    return (
                      <button key={kd.key} onClick={() => toggleKpi(kd.key)}
                        style={{ height: 26, padding: "0 10px", borderRadius: 5, border: `1px solid ${on ? kd.color : "#E0E4E9"}`, background: on ? `${kd.color}18` : "white", color: on ? kd.color : "#9FA6AF", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? kd.color : "#E0E4E9", display: "inline-block" }} />
                        {kd.label}
                      </button>
                    )
                  })}
                </div>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#9FA6AF" }}>
                  {displayKpiHistory.length > 0 ? `${displayKpiHistory[0].label} — ${displayKpiHistory[displayKpiHistory.length - 1].label}` : ""}
                </span>
              </div>
              <div style={{ padding: "16px 20px 12px" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={displayKpiHistory} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E4E9" strokeOpacity={0.6} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9FA6AF" }} tickLine={false} axisLine={{ stroke: "#E0E4E9" }} interval={kpiXInterval} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9FA6AF" }} tickLine={false} axisLine={false} width={36} unit="%" />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E0E4E9", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                      formatter={(v: unknown, name: unknown) => {
                        const kd = KPI_DEFS.find((k) => k.label === name)
                        const unit = kd?.key === "iae" ? ` ${loop.trendUnit}·h` : kd?.unit ?? "%"
                        return [`${(v as number).toFixed(1)}${unit}`, name as string]
                      }}
                    />
                    {KPI_DEFS.filter((kd) => selectedKpis.has(kd.key)).map((kd) => (
                      <Line key={kd.key} type="monotone" dataKey={kd.key} name={kd.label}
                        stroke={kd.color} strokeWidth={2} dot={false} strokeOpacity={0.9} />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {activeTab === "诊断结果" && (
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { level: "warning", code: "D-001", title: "设定值跟踪偏差偏大", detail: "当前PV与SP偏差超过阈值 ±5%，建议检查控制参数整定情况。", time: "2h前" },
                  { level: "info", code: "D-002", title: "输出饱和检测", detail: "近24小时内OP触及上限 (100%) 累计时长 3.2h，占比 13%。", time: "6h前" },
                  { level: "ok", code: "D-003", title: "模式切换频率正常", detail: "自动/手动切换次数在正常范围内 (本周 2 次)。", time: "1天前" },
                ].map((d) => {
                  const color = d.level === "warning" ? "#C35200" : d.level === "info" ? "#004B8D" : "#1A7A0A"
                  const bg = d.level === "warning" ? "#FFF7ED" : d.level === "info" ? "#EEF5FB" : "#F0FDF4"
                  return (
                    <div key={d.code} style={{ background: bg, borderRadius: 8, border: `1px solid ${color}28`, padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}20`, padding: "2px 6px", borderRadius: 3, fontFamily: "monospace" }}>{d.code}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>{d.title}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "#9FA6AF" }}>{d.time}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#515760", lineHeight: 1.6 }}>{d.detail}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {activeTab === "PID参数" && (
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { group: "比例参数", items: [{ label: "比例增益 Kp", value: (2.4 + (loop.id.charCodeAt(0) % 5) * 0.3).toFixed(2) }, { label: "微分先行", value: "开启" }] },
                  { group: "积分参数", items: [{ label: "积分时间 Ti", value: `${(120 + (loop.id.charCodeAt(1) % 60)).toFixed(0)} s` }, { label: "积分饱和限幅", value: "±100%" }] },
                  { group: "微分参数", items: [{ label: "微分时间 Td", value: `${(8 + (loop.id.charCodeAt(2) % 12)).toFixed(0)} s` }, { label: "微分滤波系数", value: "0.1" }] },
                  { group: "输出限幅", items: [{ label: "输出上限", value: "100%" }, { label: "输出下限", value: "0%" }] },
                  { group: "死区设置", items: [{ label: "正死区", value: "0.5%" }, { label: "负死区", value: "0.5%" }] },
                  { group: "采样周期", items: [{ label: "采样时间", value: "1.0 s" }, { label: "执行方式", value: "位置型" }] },
                ].map((g) => (
                  <div key={g.group} style={{ background: "#FAFBFC", borderRadius: 8, border: "1px solid #F1F3F6", padding: "12px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9FA6AF", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{g.group}</div>
                    {g.items.map((item) => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", borderBottom: "1px solid #F1F3F6" }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#004B8D", fontFamily: "monospace" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "操作分析" && (
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  {[
                    { label: "手动操作次数", value: `${3 + (loop.id.charCodeAt(0) % 8)} 次`, color: "#C35200" },
                    { label: "SP调整次数", value: `${2 + (loop.id.charCodeAt(1) % 5)} 次`, color: "#004B8D" },
                    { label: "模式切换次数", value: `${1 + (loop.id.charCodeAt(2) % 3)} 次`, color: "#7C3AED" },
                    { label: "平均手动时长", value: `${(4.2 + (loop.id.charCodeAt(3) % 30) * 0.5).toFixed(1)} min`, color: "#0E766B" },
                  ].map((s) => (
                    <div key={s.label} style={{ flex: 1, background: "#FAFBFC", borderRadius: 8, border: "1px solid #F1F3F6", padding: "10px 14px" }}>
                      <div style={{ fontSize: 10, color: "#9FA6AF", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {[
                  { time: "09:14", op: "张工", type: "手动", action: "OP 调整至 62.5%", duration: "8 min" },
                  { time: "11:02", op: "李工", type: "SP调整", action: "SP 由 48.0 调整至 52.0", duration: "—" },
                  { time: "14:35", op: "张工", type: "模式", action: "AUTO → MAN → AUTO", duration: "3 min" },
                  { time: "16:50", op: "王工", type: "手动", action: "OP 强制输出至 30.0%", duration: "12 min" },
                ].map((ev) => (
                  <div key={ev.time} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#FAFBFC", borderRadius: 8, border: "1px solid #F1F3F6" }}>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "#9FA6AF", flexShrink: 0 }}>{ev.time}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: ev.type === "手动" ? "#FFF7ED" : ev.type === "SP调整" ? "#EEF5FB" : "#F5F3FF", color: ev.type === "手动" ? "#C35200" : ev.type === "SP调整" ? "#004B8D" : "#7C3AED", padding: "2px 6px", borderRadius: 3, flexShrink: 0 }}>{ev.type}</span>
                    <span style={{ fontSize: 12, color: "#30353B", flex: 1 }}>{ev.action}</span>
                    <span style={{ fontSize: 11, color: "#9FA6AF" }}>操作员: {ev.op}</span>
                    {ev.duration !== "—" && <span style={{ fontSize: 11, color: "#9FA6AF" }}>历时 {ev.duration}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "相关回路" && (
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {loop.relatedLoopEntries && loop.relatedLoopEntries.length > 0
                  ? loop.relatedLoopEntries.map((entry) => {
                    const rel = allLoops.find((l) => l.id === entry.id)
                    if (!rel) return null
                    const rpc = perfColor(rel.performanceScore)
                    const relUnit = plant.units.find((u) => u.id === rel.unitId)
                    return (
                      <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#FAFBFC", borderRadius: 8, border: "1px solid #F1F3F6" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{rel.tag}</span>
                            <span style={{ fontSize: 12, color: "#515760" }}>{rel.name}</span>
                          </div>
                          <span style={{ fontSize: 11, color: "#9FA6AF" }}>{relUnit?.deviceCode} {relUnit?.deviceName}</span>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: rpc.color, fontFamily: "monospace" }}>{rel.performanceScore.toFixed(1)}<span style={{ fontSize: 10, color: "#9FA6AF", marginLeft: 2 }}>分</span></div>
                      </div>
                    )
                  })
                  : <div style={{ padding: 40, textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>暂无关联回路</div>
                }
              </div>
            </div>
          )}
          {activeTab === "故障分析" && (
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { severity: "high", code: "F-021", title: "传感器漂移疑似故障", desc: "PV信号在过去72小时内出现渐进性偏差，趋势分析显示可能存在仪表漂移。建议安排标定。", ts: "2天前" },
                  { severity: "medium", code: "F-018", title: "执行机构响应迟缓", desc: "阶跃测试显示执行机构响应时间较基准值增加约35%，建议检查气源压力及定位器。", ts: "5天前" },
                  { severity: "low", code: "F-005", title: "回路振荡（已恢复）", desc: "检测到轻微周期振荡，频率约0.08 Hz，已通过参数调整恢复正常。", ts: "12天前" },
                ].map((f) => {
                  const color = f.severity === "high" ? "#DC2626" : f.severity === "medium" ? "#C35200" : "#1A7A0A"
                  const bg = f.severity === "high" ? "#FEF2F2" : f.severity === "medium" ? "#FFF7ED" : "#F0FDF4"
                  const tag = f.severity === "high" ? "严重" : f.severity === "medium" ? "中等" : "轻微"
                  return (
                    <div key={f.code} style={{ background: bg, borderRadius: 8, border: `1px solid ${color}28`, padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}20`, padding: "2px 6px", borderRadius: 3 }}>{tag}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#9FA6AF", fontFamily: "monospace" }}>{f.code}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>{f.title}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "#9FA6AF" }}>{f.ts}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#515760", lineHeight: 1.6 }}>{f.desc}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PerfLevelBadge({ level }: { level: number }) {
  const configs: Record<number, { label: string; bg: string; color: string }> = {
    1: { label: "一级", bg: "#004B8D", color: "white" },
    2: { label: "二级", bg: "#0069A8", color: "white" },
    3: { label: "三级", bg: "#FEF3C7", color: "#92400E" },
    4: { label: "四级", bg: "#FEE2C5", color: "#9A3412" },
    5: { label: "五级", bg: "#FECACA", color: "#991B1B" },
  }
  const c = configs[level] || configs[5]
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>
      {c.label}
    </span>
  )
}

function KPICard({ label, value, unit, color, subLabel }: { label: string; value: string | number; unit?: string; color: string; subLabel?: string }) {
  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "20px 24px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: "#747A82", fontWeight: 500, marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
        <span className="font-data" style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: "#9FA6AF", marginBottom: 3 }}>{unit}</span>}
      </div>
      {subLabel && <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 6 }}>{subLabel}</div>}
    </div>
  )
}

type Selection = { type: "plant" } | { type: "unit"; unitId: string } | { type: "loop"; loopId: string }

export default function PerformanceMonitorPage({
  navigate,
  selectedLoopId,
}: {
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
  selectedLoopId?: string
}) {
  const [selection, setSelection] = useState<Selection>(
    selectedLoopId && allLoops.some((loop) => loop.id === selectedLoopId)
      ? { type: "loop", loopId: selectedLoopId }
      : { type: "plant" },
  )
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(plant.units.map((u) => u.id)))
  const [liveLoopMetrics, setLiveLoopMetrics] = useState<Record<string, { stability: number; score: number; autoRate: number }>>({})
  const tickRef = useRef(0)

  useEffect(() => {
    const tick = () => {
      tickRef.current++
      if (selection.type === "loop") {
        const loop = allLoops.find((l) => l.id === (selection as { type: "loop"; loopId: string }).loopId)
        if (loop) {
          setLiveLoopMetrics({
            [loop.id]: {
              stability: Math.max(60, Math.min(100, loop.stability + (Math.random() - 0.5) * 3)),
              score: Math.max(50, Math.min(100, loop.performanceScore + (Math.random() - 0.5) * 2)),
              autoRate: Math.max(60, Math.min(100, loop.autoRate + (Math.random() - 0.5) * 1.5)),
            },
          })
        }
      }
    }
    const id = setInterval(tick, 3000)
    return () => clearInterval(id)
  }, [selection])

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  const selectedLoop = selection.type === "loop"
    ? allLoops.find((l) => l.id === (selection as { type: "loop"; loopId: string }).loopId)
    : null
  const selectedUnit = selection.type === "unit"
    ? plant.units.find((u) => u.id === (selection as { type: "unit"; unitId: string }).unitId)
    : null

  const liveMetrics = selectedLoop && liveLoopMetrics[selectedLoop.id]
    ? liveLoopMetrics[selectedLoop.id]
    : selectedLoop
      ? { stability: selectedLoop.stability, score: selectedLoop.performanceScore, autoRate: selectedLoop.autoRate }
      : null

  const unitLoops = (unit: Unit) =>
    allLoops.filter((l) => l.unitId === unit.id)

  const avgOf = (loops: Loop[], key: keyof Loop) => {
    if (loops.length === 0) return 0
    return (loops.reduce((s, l) => s + (l[key] as number), 0) / loops.length)
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Left panel — hierarchy tree */}
      <div
        style={{
          width: 240,
          flexShrink: 0,
          background: "white",
          borderRight: "1px solid #E0E4E9",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "16px 14px 8px", fontSize: 11, fontWeight: 600, color: "#9FA6AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          设备层级
        </div>

        {/* Plant level */}
        <button
          onClick={() => setSelection({ type: "plant" })}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
            background: selection.type === "plant" ? "#EEF5FB" : "transparent",
            border: "none", cursor: "pointer", textAlign: "left", width: "100%",
            borderLeft: selection.type === "plant" ? "3px solid #004B8D" : "3px solid transparent",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="4" width="12" height="9" rx="1.5" stroke={selection.type === "plant" ? "#004B8D" : "#747A82"} strokeWidth="1.5" />
            <path d="M4 4V3a3 3 0 0 1 6 0v1" stroke={selection.type === "plant" ? "#004B8D" : "#747A82"} strokeWidth="1.5" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: selection.type === "plant" ? "#004B8D" : "#30353B" }}>
            {plant.shortName}
          </span>
        </button>

        {plant.units.map((unit) => {
          const loops = unitLoops(unit)
          const isExpanded = expandedUnits.has(unit.id)
          const isUnitSel = selection.type === "unit" && (selection as { type: "unit"; unitId: string }).unitId === unit.id

          return (
            <div key={unit.id}>
              {/* Unit row */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={() => toggleUnit(unit.id)}
                  style={{ padding: "6px 6px 6px 20px", background: "none", border: "none", cursor: "pointer", color: "#9FA6AF", fontSize: 10 }}
                >
                  {isExpanded ? "▼" : "▶"}
                </button>
                <button
                  onClick={() => setSelection({ type: "unit", unitId: unit.id })}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 7, padding: "7px 14px 7px 0",
                    background: isUnitSel ? "#EEF5FB" : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    borderLeft: isUnitSel ? "3px solid #004B8D" : "3px solid transparent",
                  }}
                >
                  <span
                    style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: unit.status === "running" ? "#39C523" : "#9FA1A4",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 500, color: isUnitSel ? "#004B8D" : "#30353B" }}>
                    {unit.deviceCode}
                  </span>
                  <span style={{ fontSize: 11, color: "#9FA6AF" }}>{unit.deviceName}</span>
                </button>
              </div>

              {/* Loop rows */}
              {isExpanded && loops.map((loop) => {
                const isLoopSel = selection.type === "loop" && (selection as { type: "loop"; loopId: string }).loopId === loop.id
                return (
                  <button
                    key={loop.id}
                    onClick={() => setSelection({ type: "loop", loopId: loop.id })}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 14px 5px 38px",
                      background: isLoopSel ? "#EEF5FB" : "transparent",
                      border: "none", cursor: "pointer", textAlign: "left",
                      borderLeft: isLoopSel ? "3px solid #004B8D" : "3px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: 9, color: "#CDD2D9" }}>—</span>
                    <span className="font-mono-code" style={{ fontSize: 11, color: isLoopSel ? "#004B8D" : "#515760" }}>
                      {loop.tag}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, minWidth: 0 }}>
        {/* Plant level */}
        {selection.type === "plant" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>全厂性能概览</h2>
              <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>
                {plant.name} — 实时性能汇总
              </p>
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
              <KPICard
                label="平均稳定率"
                value={avgOf(allLoops, "stability").toFixed(1)}
                unit="%"
                color="#004B8D"
                subLabel="全厂控制回路"
              />
              <KPICard
                label="平均性能评分"
                value={avgOf(allLoops, "performanceScore").toFixed(1)}
                unit="分"
                color={avgOf(allLoops, "performanceScore") >= 80 ? "#004B8D" : "#D93838"}
                subLabel="GB/T 44693.2-2024"
              />
              <KPICard
                label="平均自控率"
                value={avgOf(allLoops, "autoRate").toFixed(1)}
                unit="%"
                color={avgOf(allLoops, "autoRate") >= 90 ? "#39C523" : "#F28C28"}
                subLabel="自动模式运行比例"
              />
            </div>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #E0E4E9", fontSize: 14, fontWeight: 600, color: "#30353B" }}>
                单元性能汇总
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F7F8FA" }}>
                    {["单元", "状态", "回路数", "稳定率", "性能评分", "自控率", "最差回路"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#747A82", textAlign: "left", borderBottom: "1px solid #E0E4E9", letterSpacing: "0.04em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plant.units.map((unit, idx) => {
                    const loops = unitLoops(unit)
                    const worst = loops.reduce<Loop | null>((w, l) => (!w || l.performanceScore < w.performanceScore) ? l : w, null)
                    return (
                      <tr
                        key={unit.id}
                        style={{ borderBottom: idx < plant.units.length - 1 ? "1px solid #F1F3F6" : "none", cursor: "pointer" }}
                        onClick={() => setSelection({ type: "unit", unitId: unit.id })}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "white" }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>{unit.deviceCode}</div>
                          <div style={{ fontSize: 11, color: "#9FA6AF" }}>{unit.deviceName}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 11, fontWeight: 500, background: unit.status === "running" ? "#EFF9EC" : "#F1F3F6", color: unit.status === "running" ? "#237D17" : "#626972", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: unit.status === "running" ? "#39C523" : "#9FA1A4" }} />
                            {unit.status === "running" ? "运行" : "停车"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="font-data" style={{ fontSize: 18, fontWeight: 700, color: "#171A1E" }}>{loops.length}</span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {unit.status === "shutdown" ? <span style={{ color: "#9FA6AF", fontSize: 12 }}>—</span> : (
                            <span className="font-data" style={{ fontSize: 15, fontWeight: 700, color: avgOf(loops, "stability") >= 80 ? "#004B8D" : "#D93838" }}>
                              {avgOf(loops, "stability").toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {unit.status === "shutdown" ? <span style={{ color: "#9FA6AF", fontSize: 12 }}>—</span> : (
                            <span className="font-data" style={{ fontSize: 15, fontWeight: 700, color: avgOf(loops, "performanceScore") >= 80 ? "#004B8D" : "#F28C28" }}>
                              {avgOf(loops, "performanceScore").toFixed(1)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {unit.status === "shutdown" ? <span style={{ color: "#9FA6AF", fontSize: 12 }}>—</span> : (
                            <span className="font-data" style={{ fontSize: 15, fontWeight: 700, color: avgOf(loops, "autoRate") >= 90 ? "#39C523" : "#F28C28" }}>
                              {avgOf(loops, "autoRate").toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {worst && unit.status === "running" ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelection({ type: "loop", loopId: worst.id })
                              }}
                              style={{ padding: "4px 8px", border: "1px solid #FECACA", borderRadius: 6, background: "#FEF2F2", color: "#D93838", fontSize: 11, fontWeight: 600, fontFamily: "monospace", cursor: "pointer" }}
                            >
                              {worst.tag} · 进入回路
                            </button>
                          ) : <span style={{ color: "#9FA6AF", fontSize: 12 }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Unit level — loop list from LoopMonitorPage */}
        {selection.type === "unit" && selectedUnit && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#9FA6AF", marginBottom: 4 }}>
                <button onClick={() => setSelection({ type: "plant" })} style={{ background: "none", border: "none", color: "#004B8D", cursor: "pointer", fontSize: 12, padding: 0 }}>全厂概览</button>
                {" / "}
                {selectedUnit.deviceCode}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>
                {selectedUnit.deviceCode} — {selectedUnit.deviceName}
              </h2>
              <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>{selectedUnit.deviceName}，共 {unitLoops(selectedUnit).length} 个控制回路</p>
            </div>
            <LoopList
              key={selectedUnit.id}
              defaultUnitId={selectedUnit.id}
              defaultSortKey="performanceScore"
              defaultSortDir="asc"
              actionLabel="进入回路"
              hideHeader
              onSelect={(loop) => setSelection({ type: "loop", loopId: loop.id })}
            />
          </>
        )}

        {/* Loop level */}
        {selection.type === "loop" && selectedLoop && (
          <PerformanceLoopView
            loop={selectedLoop}
            onBack={() => setSelection({ type: "unit", unitId: selectedLoop.unitId })}
            backLabel={(() => { const u = plant.units.find((u) => u.id === selectedLoop.unitId); return u ? `${u.deviceCode} 回路列表` : "返回" })()}
          />
        )}
      </div>
    </div>
  )
}
