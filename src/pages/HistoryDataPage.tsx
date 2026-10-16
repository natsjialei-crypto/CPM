import { useEffect, useMemo, useState } from "react"
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts"
import { allLoops, generateHistoryData, plant } from "../data/mockData"
import type { AppState, Loop } from "../types"
import TrendTimeControls, { defaultRangeForGranularity, QUICK_TREND_WINDOWS } from "../components/TrendTimeControls"
import type { TrendGranularity } from "../components/TrendTimeControls"

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
    { subtype: "OUT饱和报警", description: "输出长时间处于饱和状态（>95%），请检查阀门或工艺扰动", value: "OUT=98.3%" },
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
  const seed = loop.id.charCodeAt(loop.id.length - 1) + Math.round(days * 1440)

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

function RangeIndicator({
  value,
  min,
  max,
  color,
  unit,
  compact = false,
}: {
  value: number
  min: number
  max: number
  color: string
  unit?: string
  compact?: boolean
}) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / Math.max(max - min, 0.0001)) * 100))
  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height: compact ? 5 : 7, borderRadius: 4, background: "#E0E4E9" }}>
        <div style={{ position: "absolute", inset: 0, width: `${percentage}%`, borderRadius: 4, background: `${color}20` }} />
        <span
          style={{
            position: "absolute",
            left: `${percentage}%`,
            top: compact ? -4 : -5,
            width: 2,
            height: compact ? 13 : 17,
            borderRadius: 1,
            background: color,
            boxShadow: "0 0 0 2px #FFFFFF",
            transform: "translateX(-1px)",
          }}
        />
      </div>
      {!compact && (
        <div style={{ marginTop: 5, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9FA6AF" }}>
          <span>下限 {min}{unit ? ` ${unit}` : ""}</span>
          <span>上限 {max}{unit ? ` ${unit}` : ""}</span>
        </div>
      )}
    </div>
  )
}

function ScoreGauge({ value, color }: { value: number; color: string }) {
  const normalized = Math.max(0, Math.min(100, value))
  const angle = Math.PI + (normalized / 100) * Math.PI
  const pointerX = 70 + Math.cos(angle) * 45
  const pointerY = 56 + Math.sin(angle) * 45

  return (
    <div style={{ width: 150 }}>
      <svg width="150" height="59" viewBox="0 0 140 62">
        <path d="M18 56a52 52 0 01104 0" fill="none" stroke="#E0E4E9" strokeWidth="9" strokeLinecap="round" />
        <path d="M18 56a52 52 0 01104 0" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${normalized * 1.64} 164`} opacity="0.3" />
        <line x1="70" y1="56" x2={pointerX} y2={pointerY} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="70" cy="56" r="4.5" fill="#FFFFFF" stroke={color} strokeWidth="2.5" />
      </svg>
      <div className="font-data" style={{ marginTop: -1, textAlign: "center", fontSize: 19, fontWeight: 800, color, lineHeight: 1 }}>
        {value.toFixed(1)}
        <span style={{ marginLeft: 2, fontSize: 9, fontWeight: 400, color: "#9FA6AF" }}>分</span>
      </div>
    </div>
  )
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function HistoryDataPage({ navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const [selectedLoopId, setSelectedLoopId] = useState(allLoops[0]?.id || "")
  const [selectedHours, setSelectedHours] = useState<number | null>(0.25)
  const [granularity, setGranularity] = useState<TrendGranularity>("hour")
  const initialRange = defaultRangeForGranularity("hour")
  const [customStart, setCustomStart] = useState(initialRange.start)
  const [customEnd, setCustomEnd] = useState(initialRange.end)
  const [showPV, setShowPV] = useState(true)
  const [showOUT, setShowOUT] = useState(true)
  const [showSP, setShowSP] = useState(true)
  const [eventTab, setEventTab] = useState<"all" | "alarm" | "manual">("all")
  const [assetFilter, setAssetFilter] = useState("")
  const [loopNameSearch, setLoopNameSearch] = useState("")

  const filteredLoops = useMemo(() => {
    const query = loopNameSearch.trim().toLowerCase()
    return allLoops.filter((item) => {
      if (assetFilter.startsWith("device:") && item.unitId !== assetFilter.slice(7)) return false
      if (assetFilter.startsWith("section:") && item.sectionId !== assetFilter.slice(8)) return false
      if (query && !item.name.toLowerCase().includes(query)) return false
      return true
    })
  }, [assetFilter, loopNameSearch])

  useEffect(() => {
    if (filteredLoops.length === 0) {
      if (selectedLoopId) setSelectedLoopId("")
      return
    }
    if (!filteredLoops.some((item) => item.id === selectedLoopId)) {
      setSelectedLoopId(filteredLoops[0].id)
    }
  }, [filteredLoops, selectedLoopId])

  const loop = filteredLoops.find((item) => item.id === selectedLoopId) || filteredLoops[0]
  const unit = loop ? plant.units.find((u) => u.id === loop.unitId) : null

  const customDurationDays = (new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400_000
  const customRangeError = selectedHours === null && (
    !Number.isFinite(customDurationDays) ||
    customDurationDays <= 0 ||
    customDurationDays > 60
  )
  const rangeDays = selectedHours === null ? customRangeError ? 1 : customDurationDays : selectedHours / 24
  const rangeLabel = selectedHours === null
    ? customRangeError ? "自定义时间无效" : `${customStart.replace("T", " ")} 至 ${customEnd.replace("T", " ")}`
    : QUICK_TREND_WINDOWS.find((option) => option.hours === selectedHours)?.label || "15分钟"

  const histData = useMemo(() => {
    if (!loop || customRangeError) return []
    const data = generateHistoryData(loop.trendSP, loop.trendRange, loop.trendOpBase, loop.trendPattern, rangeDays)
    const expectedCount = selectedHours !== null
      ? Math.ceil(rangeDays * 1440)
      : granularity === "hour"
        ? Math.ceil(rangeDays * 24)
        : granularity === "day"
          ? Math.ceil(rangeDays)
          : Math.ceil(rangeDays / 30)
    const count = Math.max(2, Math.min(data.length, expectedCount))
    if (count >= data.length) return data
    return Array.from({ length: count }, (_, index) =>
      data[Math.round((index * (data.length - 1)) / (count - 1))],
    )
  }, [customRangeError, granularity, loop, rangeDays, selectedHours])

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
    const spMean = histData.reduce((sum, point) => sum + point.sp, 0) / histData.length
    const outMean = histData.reduce((sum, point) => sum + point.op, 0) / histData.length
    const sampleHours = (rangeDays * 24) / histData.length
    const iae = histData.reduce((sum, point) => sum + Math.abs(point.pv - point.sp) * sampleHours, 0)
    return { mean, max, min, stdDev, inBandPct, spMean, outMean, iae }
  }, [histData, pvVals, loop, rangeDays])

  const events = useMemo(() => loop && !customRangeError ? generateEvents(loop, rangeDays) : [], [customRangeError, loop, rangeDays])
  const alarmEvents  = events.filter((e) => e.type === "alarm")
  const manualEvents = events.filter((e) => e.type === "manual")
  const displayEvents = eventTab === "alarm" ? alarmEvents : eventTab === "manual" ? manualEvents : events

  const xInterval = Math.max(1, Math.floor(histData.length / 10))
  const hasLoopFilters = Boolean(assetFilter || loopNameSearch)

  return (
    <div style={{ padding: 24 }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>趋势分析</h1>
        <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>选择回路和时间范围，查看历史趋势、统计指标与操作事件</p>
      </div>

      {/* ── Controls panel ── */}
      <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 2px 8px rgba(27,39,52,0.05)", marginBottom: 16, overflow: "hidden" }}>
        <div style={{ minHeight: 43, padding: "10px 18px", display: "flex", alignItems: "center", borderBottom: "1px solid #F1F3F6" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>回路定位</span>
            <span style={{ marginLeft: 9, fontSize: 11, color: "#9FA6AF" }}>按装置、单元和名称逐步缩小范围</span>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 11, color: filteredLoops.length > 0 ? "#004B8D" : "#D93838", background: filteredLoops.length > 0 ? "#EEF5FB" : "#FEF2F2", border: `1px solid ${filteredLoops.length > 0 ? "#D9EAF7" : "#FECACA"}`, borderRadius: 10, padding: "2px 8px" }}>
            匹配 {filteredLoops.length} 个回路
          </span>
          {hasLoopFilters && (
            <button
              type="button"
              onClick={() => {
                setAssetFilter("")
                setLoopNameSearch("")
              }}
              style={{ marginLeft: 8, padding: "3px 8px", border: "none", background: "transparent", color: "#004B8D", fontSize: 11, cursor: "pointer" }}
            >
              重置筛选
            </button>
          )}
        </div>

        <div style={{ padding: "14px 18px 16px", display: "grid", gridTemplateColumns: "260px 240px minmax(280px, 1fr)", gap: 14, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 11, color: "#747A82", marginBottom: 5 }}>装置 / 单元</div>
            <select
              value={assetFilter}
              onChange={(event) => setAssetFilter(event.target.value)}
              style={{ width: "100%", height: 38, padding: "0 30px 0 10px", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 13, color: "#30353B", background: "#FFFFFF", outline: "none", cursor: "pointer" }}
            >
              <option value="">全部装置与单元</option>
              {plant.units.map((item) => (
                <optgroup key={item.id} label={`${item.deviceCode} ${item.deviceName}`}>
                  <option value={`device:${item.id}`}>全部 — {item.deviceCode}</option>
                  {item.sections.map((section) => (
                    <option key={section.id} value={`section:${section.id}`}>　{section.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#747A82", marginBottom: 5 }}>回路名称</div>
            <div style={{ height: 38, display: "flex", alignItems: "center", gap: 7, padding: "0 10px", border: "1px solid #CDD2D9", borderRadius: 8, background: "#FFFFFF" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="6" cy="6" r="4.5" stroke="#9FA6AF" strokeWidth="1.3" />
                <path d="M9.5 9.5L13 13" stroke="#9FA6AF" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input value={loopNameSearch} onChange={(event) => setLoopNameSearch(event.target.value)} placeholder="输入名称关键词" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: "#30353B", fontSize: 12 }} />
              {loopNameSearch && (
                <button type="button" aria-label="清空名称搜索" onClick={() => setLoopNameSearch("")} style={{ padding: 0, border: "none", background: "transparent", color: "#9FA6AF", fontSize: 11, cursor: "pointer" }}>清除</button>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "#747A82" }}>控制回路</span>
              {loop && <span className="font-mono-code" style={{ fontSize: 10, color: "#004B8D" }}>当前：{loop.tag}</span>}
            </div>
            <select
              value={selectedLoopId}
              onChange={(event) => setSelectedLoopId(event.target.value)}
              disabled={filteredLoops.length === 0}
              style={{ width: "100%", height: 38, padding: "0 32px 0 10px", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 13, color: filteredLoops.length > 0 ? "#30353B" : "#9FA6AF", background: filteredLoops.length > 0 ? "#FFFFFF" : "#F1F3F6", outline: "none", cursor: filteredLoops.length > 0 ? "pointer" : "not-allowed" }}
            >
              {filteredLoops.length === 0 && <option value="">无匹配回路</option>}
              {filteredLoops.map((item) => (
                <option key={item.id} value={item.id}>{item.tag} — {item.name}</option>
              ))}
            </select>
          </div>
        </div>

        <TrendTimeControls
          selectedHours={selectedHours}
          onSelectHours={setSelectedHours}
          granularity={granularity}
          onGranularityChange={(value) => {
            const range = defaultRangeForGranularity(value)
            setGranularity(value)
            setCustomStart(range.start)
            setCustomEnd(range.end)
          }}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          customError={customRangeError ? "结束时间需晚于开始时间，且范围不能超过60天" : undefined}
        />
      </div>

      {/* ── Process averages + performance metrics ── */}
      {stats && loop && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 0.9fr) minmax(480px, 1.1fr)", gap: 14, marginBottom: 16, alignItems: "stretch" }}>
          <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 2px 8px rgba(27,39,52,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid #E0E4E9" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>过程变量均值</div>
              <div style={{ marginTop: 2, fontSize: 10, color: "#9FA6AF" }}>{rangeLabel}{selectedHours === null ? ` · ${{ hour: "小时", day: "日", month: "月" }[granularity]}粒度` : ""}</div>
            </div>
            {[
              { label: "PV", name: "过程测量值", value: stats.mean, unit: loop.trendUnit, low: loop.pid.spLo, high: loop.pid.spHi, color: "#004B8D" },
              { label: "SP", name: "设定值", value: stats.spMean, unit: loop.trendUnit, low: loop.pid.spLo, high: loop.pid.spHi, color: "#3E8FC3" },
              { label: "OUT", name: "控制输出", value: stats.outMean, unit: "%", low: loop.pid.outputLo, high: loop.pid.outputHi, color: "#39C523" },
            ].map((metric, index) => (
              <div key={metric.label} style={{ minHeight: 63, padding: "9px 14px", display: "grid", gridTemplateColumns: "64px 112px minmax(100px, 1fr) 76px", gap: 10, alignItems: "center", borderBottom: index < 2 ? "1px solid #F1F3F6" : "none", background: index % 2 === 0 ? "#FAFBFC" : "#FFFFFF" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: metric.color }}>{metric.label}</div>
                  <div style={{ marginTop: 1, fontSize: 9, color: "#9FA6AF" }}>{metric.name}</div>
                </div>
                <div className="font-data" style={{ fontSize: 19, fontWeight: 800, color: "#171A1E", whiteSpace: "nowrap" }}>
                  {metric.value.toFixed(2)}
                  <span style={{ marginLeft: 3, fontSize: 9, fontWeight: 400, color: "#9FA6AF" }}>{metric.unit}</span>
                </div>
                <RangeIndicator value={metric.value} min={metric.low} max={metric.high} color={metric.color} compact />
                <div style={{ textAlign: "right", fontSize: 9, color: "#9FA6AF", lineHeight: 1.6 }}>
                  <div>上限 <span className="font-data" style={{ color: "#515760" }}>{metric.high}</span></div>
                  <div>下限 <span className="font-data" style={{ color: "#515760" }}>{metric.low}</span></div>
                </div>
              </div>
            ))}
            <div style={{ minHeight: 32, padding: "7px 14px", display: "flex", alignItems: "center", gap: 18, borderTop: "1px solid #F1F3F6", background: "#F9FAFB", fontSize: 10, color: "#747A82" }}>
              <span>PV 标准差 <strong className="font-data" style={{ color: "#30353B" }}>{stats.stdDev.toFixed(3)}</strong></span>
              <span>带内率 <strong className="font-data" style={{ color: stats.inBandPct >= 80 ? "#1A7A0A" : "#D93838" }}>{stats.inBandPct.toFixed(1)}%</strong></span>
            </div>
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 2px 8px rgba(27,39,52,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid #E0E4E9" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>性能评价指标</div>
              <div style={{ marginTop: 2, fontSize: 10, color: "#9FA6AF" }}>GB/T 44693.2-2024 标准评价结果</div>
            </div>
            <div style={{ minHeight: 96, padding: "8px 16px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 28, background: "#FAFBFC", borderBottom: "1px solid #E0E4E9" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: 1, fontSize: 10, color: "#747A82" }}>性能评分</div>
                <ScoreGauge value={loop.performanceScore} color={loop.performanceScore >= 80 ? "#1A7A0A" : "#D93838"} />
              </div>
              <div style={{ width: 1, height: 54, background: "#E0E4E9" }} />
              <div style={{ width: 90, textAlign: "center" }}>
                <div style={{ marginBottom: 7, fontSize: 10, color: "#9FA6AF" }}>性能定级</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: loop.performanceLevel <= 2 ? "#1A7A0A" : loop.performanceLevel <= 4 ? "#92600A" : "#D93838" }}>
                  {["", "一", "二", "三", "四", "五"][loop.performanceLevel]}级
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {[
                { label: "自控率", numericValue: loop.autoRate, value: loop.autoRate.toFixed(1), unit: "%", color: "#004B8D", ranged: true },
                { label: "有效自控率", numericValue: loop.effectiveAutoRate, value: loop.effectiveAutoRate.toFixed(1), unit: "%", color: "#0069A8", ranged: true },
                { label: "准确率", numericValue: loop.accuracy, value: loop.accuracy.toFixed(1), unit: "%", color: "#1A7A0A", ranged: true },
                { label: "快速率", numericValue: loop.speed, value: loop.speed.toFixed(1), unit: "%", color: "#39A820", ranged: true },
                { label: "稳定率", numericValue: loop.stability, value: loop.stability.toFixed(1), unit: "%", color: "#0E766B", ranged: true },
                { label: "累计控制偏差（IAE）", numericValue: undefined, value: stats.iae.toFixed(1), unit: `${loop.trendUnit}·h`, color: "#C35200", ranged: false },
              ].map((metric, index) => (
                <div
                  key={metric.label}
                  style={{
                    minHeight: 51,
                    padding: "7px 11px",
                    borderRight: index % 2 === 0 ? "1px solid #F1F3F6" : "none",
                    borderBottom: index < 4 ? "1px solid #F1F3F6" : "none",
                    background: Math.floor(index / 2) % 2 === 0 ? "#FFFFFF" : "#FAFBFC",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: metric.ranged ? 7 : 0 }}>
                    <span style={{ fontSize: 10, color: "#747A82" }}>{metric.label}</span>
                    <span className="font-data" style={{ fontSize: 15, fontWeight: 800, color: metric.color }}>
                      {metric.value}
                      <span style={{ marginLeft: 3, fontSize: 9, fontWeight: 400, color: "#9FA6AF" }}>{metric.unit}</span>
                    </span>
                  </div>
                  {metric.ranged && metric.numericValue != null && (
                    <RangeIndicator value={metric.numericValue} min={0} max={100} color={metric.color} compact />
                  )}
                </div>
              ))}
            </div>
          </div>
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
              {rangeLabel} · {histData.length} 个数据点
            </div>
          </div>
          {/* Interactive legend */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ marginRight: 2, fontSize: 11, color: "#9FA6AF" }}>曲线</span>
            {[
              { label: `PV (${loop?.trendUnit || ""})`, checked: showPV, color: "#004B8D", dashed: false, toggle: () => setShowPV((value) => !value) },
              { label: "SP", checked: showSP, color: "#3E8FC3", dashed: true, toggle: () => setShowSP((value) => !value) },
              { label: "OUT (%)", checked: showOUT, color: "#39C523", dashed: false, toggle: () => setShowOUT((value) => !value) },
            ].map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={item.toggle}
                aria-pressed={item.checked}
                title={item.checked ? `隐藏 ${item.label} 曲线` : `显示 ${item.label} 曲线`}
                style={{ height: 30, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: `1px solid ${item.checked ? item.color : "#CDD2D9"}`, background: item.checked ? "#FFFFFF" : "#F1F3F6", color: item.checked ? "#30353B" : "#9FA6AF", fontSize: 11, fontWeight: item.checked ? 600 : 400, cursor: "pointer" }}
              >
                <span style={{ width: 18, borderTop: `2px ${item.dashed ? "dashed" : "solid"} ${item.checked ? item.color : "#B7BDC5"}` }} />
                {item.label}
                <span style={{ fontSize: 9, color: item.checked ? item.color : "#9FA6AF" }}>{item.checked ? "显示" : "隐藏"}</span>
              </button>
            ))}
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
            {showPV && <Line yAxisId="pv" type="monotone" dataKey="pv" stroke="#004B8D" strokeWidth={1.5} dot={false} name="PV" activeDot={{ r: 3, fill: "#004B8D" }} />}
            {showSP && <Line yAxisId="pv" type="monotone" dataKey="sp" stroke="#3E8FC3" strokeWidth={1} strokeDasharray="6 4" dot={false} name="SP" />}
            {showOUT && <Line yAxisId="op" type="monotone" dataKey="op" stroke="#39C523" strokeWidth={1.5} dot={false} name="OUT" />}
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
          <span style={{ fontSize: 12, color: "#9FA6AF" }}>{rangeLabel}内共 {events.length} 条事件</span>

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
