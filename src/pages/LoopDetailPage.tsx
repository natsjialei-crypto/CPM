import { useState, useRef, useMemo } from "react"
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import { calculateLoopIAE, getLoopById, plant, generateHistoryData, generateTrendData } from "../data/mockData"
import type { AppState, TrendPoint, RelatedLoopEntry, FaultEntry } from "../types"
import TrendTimeControls, { defaultRangeForGranularity } from "../components/TrendTimeControls"
import type { TrendGranularity } from "../components/TrendTimeControls"

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
    <span style={{ background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 5, display: "inline-block" }}>
      {c.label}
    </span>
  )
}

function ModeBadge({ mode }: { mode: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    auto: { label: "自动", bg: "#EFF9EC", color: "#237D17" },
    manual: { label: "手动", bg: "#FEF9EB", color: "#92620A" },
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
        <span className="font-data" style={{ fontSize: 26, fontWeight: 700, color: warn ? "#D93838" : "#171A1E", lineHeight: 1 }}>
          {value.toFixed(1)}
        </span>
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
      <span className="font-data" style={{ fontSize: 15, fontWeight: 700, color: isWarn ? "#D93838" : "#237D17", marginRight: 4 }}>
        {value.toFixed(3)}
      </span>
      <span style={{ fontSize: 11, color: "#9FA6AF", width: 20 }}>{u}</span>
      <span style={{ marginLeft: 12, fontSize: 11, background: isWarn ? "#FECACA" : "#EFF9EC", color: isWarn ? "#991B1B" : "#237D17", padding: "1px 6px", borderRadius: 4, fontWeight: 500, whiteSpace: "nowrap" }}>
        {isWarn ? "异常" : "正常"}
      </span>
    </div>
  )
}

interface AttributeItem {
  label: string
  value: string | number
  unit?: string
}

function AttributeGroup({
  title,
  code,
  items,
}: {
  title: string
  code: string
  items: AttributeItem[]
}) {
  return (
    <div style={{ border: "1px solid #E0E4E9", borderRadius: 10, overflow: "hidden", background: "#FFFFFF" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, background: "#F7F8FA", borderBottom: "1px solid #E0E4E9" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>{title}</span>
        <span style={{ fontSize: 10, color: "#9FA6AF", fontFamily: "monospace" }}>{code}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {items.map((item, index) => (
          <div
            key={item.label}
            style={{
              minHeight: 39,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderRight: index % 2 === 0 ? "1px solid #F1F3F6" : "none",
              borderBottom: index < items.length - (items.length % 2 === 0 ? 2 : 1) ? "1px solid #F1F3F6" : "none",
              background: Math.floor(index / 2) % 2 === 0 ? "#FFFFFF" : "#FAFBFC",
            }}
          >
            <span style={{ fontSize: 11, color: "#747A82" }}>{item.label}</span>
            <span className="font-data" style={{ fontSize: 12, fontWeight: 600, color: "#30353B", textAlign: "right" }}>
              {item.value}
              {item.unit && <span style={{ marginLeft: 3, fontSize: 10, fontWeight: 400, color: "#9FA6AF" }}>{item.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoopDetailPage({
  loopId,
  navigate,
}: {
  loopId: string
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
}) {
  const loop = getLoopById(loopId)
  const [activeTab, setActiveTab] = useState("perf")
  const [windowHours, setWindowHours] = useState<number | null>(0.25)
  const [panOffset, setPanOffset] = useState(0)
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("hour")
  const initialTrendRange = defaultRangeForGranularity("hour")
  const [trendCustomStart, setTrendCustomStart] = useState(initialTrendRange.start)
  const [trendCustomEnd, setTrendCustomEnd] = useState(initialTrendRange.end)
  const trendCustomDays = (new Date(trendCustomEnd).getTime() - new Date(trendCustomStart).getTime()) / 86400_000
  const trendCustomError = windowHours === null && (!Number.isFinite(trendCustomDays) || trendCustomDays <= 0)

  const trendDataRef = useRef<TrendPoint[]>([])
  if (trendDataRef.current.length === 0 && loop) {
    trendDataRef.current = generateTrendData(
      loop.trendSP,
      loop.trendRange,
      loop.trendOpBase,
      loop.trendPattern,
      24,
    )
  }

  const displayData = useMemo(() => {
    if (!loop) return []
    if (windowHours === null) {
      if (trendCustomError) return []
      const data = generateHistoryData(loop.trendSP, loop.trendRange, loop.trendOpBase, loop.trendPattern, trendCustomDays)
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
    }
    const all = trendDataRef.current
    const stepMs = 20_000
    const windowSteps = Math.floor((windowHours * 3600 * 1000) / stepMs)
    const end = Math.max(0, all.length - panOffset)
    const start = Math.max(0, end - windowSteps)
    return all.slice(start, end)
  }, [loop, panOffset, trendCustomDays, trendCustomError, trendGranularity, windowHours])

  const xInterval = Math.max(1, Math.floor(displayData.length / 8))

  if (!loop) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#9FA6AF" }}>
        回路不存在
      </div>
    )
  }

  const unit = plant.units.find((u) => u.id === loop.unitId)
  const isShutdown = unit?.status === "shutdown"
  const loopIAE = calculateLoopIAE(loop)

  const processTypeMap: Record<string, string> = {
    flow: "流量",
    pressure: "压力",
    level: "液位",
    temperature: "温度",
    composition: "成分",
  }
  const loopTypeMap: Record<string, string> = {
    single: "单回路",
    cascade: "串级",
    split: "分程",
    override: "超驰",
    feedforward: "前馈",
  }
  const unusedReasonMap: Record<string, string> = {
    process: "工艺原因",
    strategy: "控制策略",
    config: "组态错误",
    pid: "PID参数",
    other: "其他",
  }
  const pvSpan = loop.pid.spHi - loop.pid.spLo
  const deviationLimit = Math.max(loop.trendRange * 0.5, pvSpan * 0.05)
  const formatValue = (value: number) => value.toFixed(loop.processType === "pressure" ? 2 : 1)
  const attributeGroups: Array<{ title: string; code: string; items: AttributeItem[] }> = [
    {
      title: "限值参数",
      code: "Limits",
      items: [
        { label: "高高限", value: formatValue(loop.pid.spHi), unit: loop.trendUnit },
        { label: "高限", value: formatValue(loop.pid.spHi - pvSpan * 0.05), unit: loop.trendUnit },
        { label: "高/低偏差限值", value: `+${formatValue(deviationLimit)} / -${formatValue(deviationLimit)}`, unit: loop.trendUnit },
        { label: "低限", value: formatValue(loop.pid.spLo + pvSpan * 0.05), unit: loop.trendUnit },
        { label: "低低限", value: formatValue(loop.pid.spLo), unit: loop.trendUnit },
        { label: "输出高限", value: loop.pid.outputHi, unit: "%" },
        { label: "输出低限", value: loop.pid.outputLo, unit: "%" },
        { label: "抗积分饱和高限", value: loop.pid.arwHi, unit: "%" },
        { label: "抗积分饱和低限", value: loop.pid.arwLo, unit: "%" },
        { label: "设定值高限和低限", value: `${formatValue(loop.pid.spHi)} / ${formatValue(loop.pid.spLo)}`, unit: loop.trendUnit },
        { label: "报警迟滞", value: "0.5", unit: "%" },
      ],
    },
    {
      title: "报警参数",
      code: "Alarms",
      items: [
        { label: "高高报警", value: "严重 · 已启用" },
        { label: "高报警", value: "警告 · 已启用" },
        { label: "高偏差报警", value: "提示 · 已启用" },
        { label: "低偏差报警", value: "提示 · 已启用" },
        { label: "低报警", value: "警告 · 已启用" },
        { label: "低低报警", value: "严重 · 已启用" },
        { label: "模块报警", value: "严重 · 已启用" },
        { label: "报警优先级调整", value: "0" },
      ],
    },
    {
      title: "整定参数",
      code: "Tuning",
      items: [
        { label: "比例项", value: loop.pid.P },
        { label: "积分项", value: loop.pid.I, unit: "s" },
        { label: "微分项", value: loop.pid.D, unit: "s" },
        { label: "被控变量滤波时间常数", value: loop.pid.pvFilter, unit: "s" },
        { label: "设定值滤波时间常数", value: "0.0", unit: "s" },
        { label: "设定值上升/下降速率", value: "0.0 / 0.0", unit: "%/s" },
        { label: "PID结构", value: "PI作用于偏差，D作用于PV" },
        { label: "积分死区", value: "0.0", unit: "%" },
      ],
    },
    {
      title: "高级整定",
      code: "Advanced Tuning",
      items: [
        { label: "PID作用方向", value: loop.processType === "level" ? "正作用" : "反作用" },
        { label: "PID输出方向", value: "输出增加" },
        { label: "PID/AO1输出方式", value: "气开" },
        { label: "AO1输出方向", value: "随PID输出增加" },
      ],
    },
  ]

  const [relatedLoops, setRelatedLoops] = useState<RelatedLoopEntry[]>(loop.relatedLoopEntries || [])
  const [faultEntries, setFaultEntries] = useState<FaultEntry[]>(loop.faultEntries || [])
  const [showAddRelated, setShowAddRelated] = useState(false)
  const [showAddFault, setShowAddFault] = useState(false)
  const [newRelated, setNewRelated] = useState({ tag: "", name: "", description: "", unitId: "", notes: "", direction: "outgoing" as RelatedLoopEntry["direction"] })
  const [newFault, setNewFault] = useState({ faultType: "", description: "", action: "" })

  const tabs = [
    { key: "perf", label: "性能指标" },
    { key: "trend", label: "趋势图表" },
    { key: "diag", label: "诊断结果" },
    { key: "pid", label: "PID参数" },
    { key: "related", label: "相关回路" },
    { key: "fault", label: "故障分析" },
    { key: "info", label: "基本信息" },
  ]

  const panStep = Math.floor(((windowHours ?? 0.25) * 3600 * 1000) / 20_000 / 2)
  const maxOffset = Math.max(0, trendDataRef.current.length - Math.floor(((windowHours ?? 0.25) * 3600 * 1000) / 20_000))

  return (
    <div style={{ padding: "24px" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: "#9FA6AF", marginBottom: 16 }}>
        <button onClick={() => navigate("loop-list")} style={{ background: "none", border: "none", cursor: "pointer", color: "#004B8D", fontSize: 12, padding: 0 }}>
          回路台账
        </button>
        {" / "}
        <span className="font-mono-code">{loop.tag}</span>
        {" "}
        {loop.name}
      </div>

      {/* Header */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid rgba(96,108,122,0.12)",
          boxShadow: "0 8px 24px rgba(27,39,52,0.07)",
          padding: "20px 24px",
          marginBottom: 20,
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono-code" style={{ fontSize: 20, fontWeight: 700, color: "#004B8D" }}>
                {loop.tag}
              </span>
              <ModeBadge mode={loop.mode} />
              {!isShutdown && <PerfLevelBadge level={loop.performanceLevel} />}
              {isShutdown && (
                <span style={{ fontSize: 12, background: "#F1F3F6", color: "#626972", padding: "3px 9px", borderRadius: 5 }}>
                  装置停车
                </span>
              )}
            </div>
            <div style={{ fontSize: 16, color: "#30353B", fontWeight: 500, marginBottom: 4 }}>{loop.name}</div>
            <div className="flex items-center gap-4" style={{ fontSize: 12, color: "#747A82" }}>
              <span>{unit?.deviceCode} {unit?.deviceName}</span>
              <span>·</span>
              <span>{loopTypeMap[loop.loopType]}</span>
              <span>·</span>
              <span>{processTypeMap[loop.processType]}</span>
              {loop.unusedReason && (
                <>
                  <span>·</span>
                  <span style={{ color: "#F28C28" }}>未投用原因：{unusedReasonMap[loop.unusedReason]}</span>
                </>
              )}
            </div>
          </div>
          {!isShutdown && (
            <div className="flex gap-6">
              <div style={{ textAlign: "center" }}>
                <div className="font-data" style={{ fontSize: 28, fontWeight: 700, color: "#171A1E", lineHeight: 1 }}>
                  {loop.performanceScore.toFixed(1)}
                </div>
                <div style={{ fontSize: 10, color: "#747A82", marginTop: 3 }}>性能评分</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="font-data" style={{ fontSize: 28, fontWeight: 700, color: loop.autoRate >= 95 ? "#237D17" : "#D93838", lineHeight: 1 }}>
                  {loop.autoRate.toFixed(1)}
                  <span style={{ fontSize: 13, fontWeight: 400, color: "#747A82" }}>%</span>
                </div>
                <div style={{ fontSize: 10, color: "#747A82", marginTop: 3 }}>自控率</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "white", borderRadius: 10, padding: 4, border: "1px solid #E0E4E9", width: "fit-content" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "7px 16px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#004B8D" : "#515760",
              background: activeTab === tab.key ? "#EEF5FB" : "transparent",
              transition: "all 160ms",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "perf" && (
        <div>
          {isShutdown ? (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #E0E4E9", padding: 40, textAlign: "center", color: "#9FA6AF" }}>
              装置停车期间暂停性能评价计算
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
                <MetricGauge label="自控率 Auto" value={loop.autoRate} unit="%" color="#004B8D" desc="回路处于自动模式的时间比例" />
                <MetricGauge label="有效自控率 R" value={loop.effectiveAutoRate} unit="%" color="#0069A8" desc="自动模式下实际有效运行比例" />
                <MetricGauge label="准确率 A" value={loop.accuracy} unit="%" color="#3E8FC3" desc="PV在SP±容差带内的时间比例" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                <MetricGauge label="快速率 F" value={loop.speed} unit="%" color={loop.speed < 80 ? "#F28C28" : "#004B8D"} warn={loop.speed < 80} desc="响应速度满足要求的时间比例" />
                <MetricGauge label="稳定率 S" value={loop.stability} unit="%" color={loop.stability < 80 ? "#D93838" : "#004B8D"} warn={loop.stability < 80} desc="PV波动在允许范围内的比例" />
                <MetricGauge label="饱和率 Sa" value={loop.saturationRate} unit="%" color={loop.saturationRate > 10 ? "#D93838" : "#39C523"} warn={loop.saturationRate > 10} desc="输出处于饱和状态的时间比例" max={20} />
                <MetricGauge label="累计控制偏差 IAE" value={loopIAE} unit={`${loop.trendUnit}·h`} color="#C35200" max={Math.max(100, loopIAE * 1.2)} desc="统计时段内绝对控制偏差积分" />
              </div>

              {/* Score formula */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #E0E4E9", padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>综合性能评分 P</div>
                <div style={{ fontSize: 11, color: "#747A82", marginBottom: 16 }}>
                  P = [(A·a + F·f + S·s) / (a+f+s)] × R　（按回路类型选取权重系数 a/f/s）
                </div>
                <div className="flex items-center gap-6">
                  <div style={{ textAlign: "center" }}>
                    <div className="font-data" style={{ fontSize: 48, fontWeight: 800, color: loop.performanceScore >= 90 ? "#004B8D" : loop.performanceScore >= 70 ? "#F2B544" : "#D93838", lineHeight: 1 }}>
                      {loop.performanceScore.toFixed(1)}
                    </div>
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
            </>
          )}
        </div>
      )}

      {activeTab === "trend" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", overflow: "hidden" }}>
          <TrendTimeControls
            selectedHours={windowHours}
            onSelectHours={(hours) => {
              setWindowHours(hours)
              setPanOffset(0)
            }}
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
            navigation={{
              offset: panOffset,
              maxOffset,
              onOlder: () => setPanOffset((offset) => Math.min(maxOffset, offset + panStep)),
              onNewer: () => setPanOffset((offset) => Math.max(0, offset - panStep)),
              onLatest: () => setPanOffset(0),
              onSlide: setPanOffset,
            }}
          />

          {/* Chart */}
          <div style={{ padding: "16px 20px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div className="flex items-center gap-4" style={{ fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 20, height: 2, background: "#004B8D", display: "inline-block" }} />
                  <span style={{ color: "#515760" }}>PV — {loop.trendUnit}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 20, height: 2, background: "#3E8FC3", display: "inline-block", borderTop: "2px dashed #3E8FC3" }} />
                  <span style={{ color: "#515760" }}>SP — {loop.trendUnit}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 20, height: 2, background: "#39C523", display: "inline-block" }} />
                  <span style={{ color: "#515760" }}>OUT — %（右轴）</span>
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#9FA6AF" }}>
                {displayData.length > 0 ? `${displayData[0].timeStr} — ${displayData[displayData.length - 1].timeStr}` : ""}
              </span>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={displayData} margin={{ top: 4, right: 52, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E4E9" strokeOpacity={0.7} />
                <XAxis
                  dataKey="timeStr"
                  tick={{ fontSize: 11, fill: "#747A82", fontFamily: "'Inter Tight'" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E0E4E9" }}
                  interval={xInterval}
                />
                <YAxis
                  yAxisId="pv"
                  tick={{ fontSize: 11, fill: "#747A82", fontFamily: "'Inter Tight'" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  unit={` ${loop.trendUnit}`}
                />
                <YAxis
                  yAxisId="op"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#39C523", fontFamily: "'Inter Tight'" }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #CDD2D9",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "'Inter Tight'",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  }}
                  labelStyle={{ color: "#747A82", fontWeight: 600 }}
                />
                <ReferenceLine
                  yAxisId="pv"
                  y={loop.pid.spHi}
                  stroke="#F2B544"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{ value: "SP-H", fill: "#F2B544", fontSize: 9 }}
                />
                <ReferenceLine
                  yAxisId="pv"
                  y={loop.pid.spLo}
                  stroke="#F2B544"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{ value: "SP-L", fill: "#F2B544", fontSize: 9 }}
                />
                <Line
                  yAxisId="pv"
                  type="monotone"
                  dataKey="pv"
                  stroke="#004B8D"
                  strokeWidth={2}
                  dot={false}
                  name="PV"
                  activeDot={{ r: 4, fill: "#004B8D" }}
                />
                <Line
                  yAxisId="pv"
                  type="monotone"
                  dataKey="sp"
                  stroke="#3E8FC3"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                  name="SP"
                />
                <Line
                  yAxisId="op"
                  type="monotone"
                  dataKey="op"
                  stroke="#39C523"
                  strokeWidth={1.5}
                  dot={false}
                  name="OUT"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Hint */}
          {loop.trendPattern === "oscillating" && (
            <div style={{ margin: "0 20px 16px", padding: "8px 12px", background: "#FEF9EB", borderRadius: 6, border: "1px solid #FDE68A", fontSize: 12, color: "#92620A" }}>
              ⚠ 当前趋势图显示明显振荡波形，振荡率 {(loop.oscillationRate * 100).toFixed(1)}%，建议检查PID参数或阀门状况
            </div>
          )}
          {loop.trendPattern === "saturating" && (
            <div style={{ margin: "0 20px 16px", padding: "8px 12px", background: "#FECACA", borderRadius: 6, border: "1px solid #FCA5A5", fontSize: 12, color: "#991B1B" }}>
              ⚠ 输出值呈持续上升趋势，疑似趋向饱和，PV持续偏离SP，请关注
            </div>
          )}
        </div>
      )}

      {activeTab === "diag" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
          {isShutdown ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9FA6AF" }}>装置停车期间暂停诊断计算</div>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 4 }}>诊断指标</div>
              <div style={{ fontSize: 12, color: "#747A82", marginBottom: 16 }}>
                依据 GB/T 44693.2-2024 附录F 计算
              </div>
              <DiagnosticRow label="振荡率 Osc" value={loop.oscillationRate} threshold={0.2} unit="" lowerBetter desc="识别PID参数不当或输出黏滞导致的周期性振荡" />
              <DiagnosticRow label="黏滞系数 St" value={loop.stickiness} threshold={0.25} unit="" lowerBetter desc="识别阀门黏滞、内漏等执行器问题" />
              <DiagnosticRow label="饱和率 Sa" value={loop.saturationRate} threshold={10} unit="%" lowerBetter desc="识别执行器长期处于输出限位的问题" />
              <DiagnosticRow label="好值率 Qu" value={loop.goodValueRate} threshold={95} unit="%" lowerBetter={false} desc="识别通信或仪表故障导致的数据异常" />
              <DiagnosticRow label="行程指数 Trip" value={loop.travelIndex} threshold={30} unit="" lowerBetter desc="识别控制阀行程过度，评估磨损风险" />
              <DiagnosticRow label="稳态时间 T" value={loop.steadyStateTime} threshold={180} unit="s" lowerBetter desc="从扰动到回到设定值所需时间，评估响应速度" />

              {/* Diagnosis summary */}
              <div style={{ marginTop: 20, padding: "14px 16px", background: "#F9FAFB", borderRadius: 8, border: "1px solid #E0E4E9" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 8 }}>初步诊断归因</div>
                {loop.oscillationRate > 0.2 && loop.stickiness > 0.2 ? (
                  <div style={{ fontSize: 12, color: "#D93838", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>执行器故障（怀疑）：</span>黏滞系数和振荡率均偏高，建议检查控制阀，安排维护保养
                  </div>
                ) : loop.oscillationRate > 0.2 ? (
                  <div style={{ fontSize: 12, color: "#F28C28", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>PID参数不合理（怀疑）：</span>振荡率偏高，黏滞正常，建议重新整定P/I/D参数
                  </div>
                ) : loop.performanceScore > 80 ? (
                  <div style={{ fontSize: 12, color: "#237D17", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>运行正常：</span>所有诊断指标均在正常范围内，无明显故障特征
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#515760", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>综合偏差：</span>性能略有不足，建议结合趋势图进行人工分析
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 6 }}>
                  * 诊断归因为初步判断，最终结论需人工确认。参考 GB/T 44693.2 第7章及附录F。
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "pid" && (
        <div>
          {/* Current params */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 16 }}>当前PID参数</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "比例增益 P", value: loop.pid.P },
                { label: "积分时间 I", value: loop.pid.I },
                { label: "微分时间 D", value: loop.pid.D },
                { label: "PV滤波 PVF", value: loop.pid.pvFilter },
                { label: "好值率", value: `${loop.goodValueRate.toFixed(1)}%` },
              ].map((item) => (
                <div key={item.label} style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 14px", border: "1px solid #E0E4E9" }}>
                  <div style={{ fontSize: 10, color: "#747A82", marginBottom: 6 }}>{item.label}</div>
                  <div className="font-data" style={{ fontSize: 20, fontWeight: 700, color: "#171A1E" }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid #E0E4E9", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#515760", marginBottom: 10 }}>限位设定</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "输出上下限", hi: loop.pid.outputHi, lo: loop.pid.outputLo, unit: "%" },
                  { label: "反积分饱和限 ARW", hi: loop.pid.arwHi, lo: loop.pid.arwLo, unit: "%" },
                  { label: "SP高低限", hi: loop.pid.spHi, lo: loop.pid.spLo, unit: loop.trendUnit },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 14px", border: "1px solid #E0E4E9" }}>
                    <div style={{ fontSize: 10, color: "#747A82", marginBottom: 6 }}>{item.label}</div>
                    <div className="font-data" style={{ fontSize: 13, color: "#171A1E" }}>
                      <span style={{ color: "#D93838" }}>HI</span>
                      <span style={{ fontWeight: 700, marginLeft: 4 }}>{item.hi}</span>
                      <span style={{ color: "#9FA6AF", marginLeft: 2 }}>{item.unit}</span>
                      <span style={{ margin: "0 8px", color: "#CDD2D9" }}>|</span>
                      <span style={{ color: "#004B8D" }}>LO</span>
                      <span style={{ fontWeight: 700, marginLeft: 4 }}>{item.lo}</span>
                      <span style={{ color: "#9FA6AF", marginLeft: 2 }}>{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Change history */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>整定记录</div>
            </div>
            {loop.pidRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#9FA6AF", fontSize: 13 }}>暂无整定记录</div>
            ) : (
              loop.pidRecords.map((rec) => (
                <div key={rec.id} style={{ border: "1px solid #E0E4E9", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>{rec.date}</div>
                      <div style={{ fontSize: 12, color: "#747A82", marginTop: 2 }}>整定人：{rec.operator}</div>
                    </div>
                    <span style={{
                      fontSize: 11,
                      background: rec.eliminatedOscillation ? "#EFF9EC" : "#FEF9EB",
                      color: rec.eliminatedOscillation ? "#237D17" : "#92620A",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: 500,
                    }}>
                      {rec.eliminatedOscillation ? "已消除振荡" : "振荡未消除"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#515760", marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>整定原因：</span>{rec.reason}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div style={{ background: "#FEF9EB", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
                      <div style={{ color: "#92620A", fontWeight: 600, marginBottom: 4 }}>整定前</div>
                      <span className="font-mono-code">P={rec.beforeP}  I={rec.beforeI}  D={rec.beforeD}</span>
                    </div>
                    <div style={{ background: "#EFF9EC", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
                      <div style={{ color: "#237D17", fontWeight: 600, marginBottom: 4 }}>整定后</div>
                      <span className="font-mono-code">P={rec.afterP}  I={rec.afterI}  D={rec.afterD}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#515760" }}>
                    <span style={{ fontWeight: 500 }}>整定结果：</span>{rec.result}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "related" && (() => {
        const DIRECTION_META = {
          incoming:  { label: "←被关联", color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" },
          outgoing:  { label: "关联→",   color: "#004B8D", bg: "#EEF5FB", border: "#D9EAF7" },
          coupled:   { label: "⇌ 耦合",  color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
        } as const

        const resolveLoop = (tag: string) => {
          for (const u of plant.units)
            for (const s of u.sections)
              for (const l of s.loops)
                if (l.tag === tag) return l
          return null
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* ── Manual related loops ── */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>
                    关联回路
                    {relatedLoops.length > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "#9FA6AF" }}>（{relatedLoops.length} 个）</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#747A82", marginTop: 2 }}>与本回路存在关联或影响关系的其他回路</div>
                </div>
                <button
                  onClick={() => setShowAddRelated(true)}
                  style={{ fontSize: 12, color: "#004B8D", background: "#EEF5FB", border: "1px solid #D9EAF7", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 500 }}
                >
                  + 新增相关回路
                </button>
              </div>

              {/* Add form */}
              {showAddRelated && (
                <div style={{ background: "#F9FAFB", borderRadius: 8, border: "1px solid #E0E4E9", padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>新增相关回路</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 140px", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>回路位号</div>
                      <input value={newRelated.tag} onChange={(e) => setNewRelated((r) => ({ ...r, tag: e.target.value }))} placeholder="如 FIC_20301"
                        style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>回路名称</div>
                      <input value={newRelated.name} onChange={(e) => setNewRelated((r) => ({ ...r, name: e.target.value }))} placeholder="如 进料流量控制"
                        style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>所属单元</div>
                      <select value={newRelated.unitId} onChange={(e) => setNewRelated((r) => ({ ...r, unitId: e.target.value }))}
                        style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", background: "white", boxSizing: "border-box" }}>
                        <option value="">选择单元</option>
                        {plant.units.map((u) => <option key={u.id} value={u.id}>{u.deviceCode} {u.deviceName}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>关联方向</div>
                      <select value={newRelated.direction} onChange={(e) => setNewRelated((r) => ({ ...r, direction: e.target.value as RelatedLoopEntry["direction"] }))}
                        style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", background: "white", boxSizing: "border-box" }}>
                        <option value="outgoing">关联→（下游）</option>
                        <option value="incoming">←被关联（上游）</option>
                        <option value="coupled">⇌ 耦合</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>描述</div>
                      <input value={newRelated.description} onChange={(e) => setNewRelated((r) => ({ ...r, description: e.target.value }))} placeholder="关联关系描述"
                        style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>备注</div>
                      <input value={newRelated.notes} onChange={(e) => setNewRelated((r) => ({ ...r, notes: e.target.value }))} placeholder="其他说明"
                        style={{ width: "100%", height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowAddRelated(false); setNewRelated({ tag: "", name: "", description: "", unitId: "", notes: "", direction: "outgoing" }) }}
                      style={{ padding: "6px 14px", background: "white", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#515760" }}>
                      取消
                    </button>
                    <button
                      onClick={() => {
                        if (!newRelated.tag) return
                        setRelatedLoops((prev) => [...prev, { ...newRelated, id: `rel-${Date.now()}` }])
                        setShowAddRelated(false)
                        setNewRelated({ tag: "", name: "", description: "", unitId: "", notes: "", direction: "outgoing" })
                      }}
                      style={{ padding: "6px 14px", background: "#004B8D", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "white", fontWeight: 500 }}>
                      确认添加
                    </button>
                  </div>
                </div>
              )}

              {/* Related loop cards */}
              {relatedLoops.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#9FA6AF", fontSize: 13 }}>
                  暂无相关回路记录
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {relatedLoops.map((entry) => {
                    const dir = entry.direction || "outgoing"
                    const dm = DIRECTION_META[dir]
                    const entryUnit = plant.units.find((u) => u.id === entry.unitId)
                    const resolved = resolveLoop(entry.tag)
                    return (
                      <div key={entry.id} style={{
                        background: "#F9FAFB", borderRadius: 10, border: "1px solid #E0E4E9",
                        padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12,
                      }}>
                        {/* Direction badge */}
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5, flexShrink: 0, marginTop: 1,
                          color: dm.color, background: dm.bg, border: `1px solid ${dm.border}`,
                        }}>
                          {dm.label}
                        </span>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span className="font-mono-code" style={{ fontSize: 13, color: "#004B8D", fontWeight: 700 }}>
                              {entry.tag}
                            </span>
                            {resolved && <PerfLevelBadge level={resolved.performanceLevel} />}
                          </div>
                          <div style={{ fontSize: 13, color: "#30353B", marginBottom: 3 }}>{entry.name}</div>
                          {entry.description && (
                            <div style={{ fontSize: 12, color: "#747A82" }}>{entry.description}</div>
                          )}
                          {entry.notes && (
                            <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 2 }}>{entry.notes}</div>
                          )}
                          {entryUnit && (
                            <div style={{ fontSize: 11, color: "#B0B6BF", marginTop: 3 }}>
                              {entryUnit.deviceCode} — {entryUnit.deviceName}
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => setRelatedLoops((prev) => prev.filter((r) => r.id !== entry.id))}
                          style={{ fontSize: 11, color: "#D93838", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, padding: "3px 8px", cursor: "pointer", flexShrink: 0 }}>
                          删除
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── System auto-identified relations ── */}
            {(loop.upstreamTags.length > 0 || loop.downstreamTags.length > 0 || loop.coupledTags.length > 0) && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "18px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 14 }}>
                  系统关联（自动识别）
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {loop.upstreamTags.length > 0 && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#9FA6AF", minWidth: 32, marginTop: 2 }}>上游</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {loop.upstreamTags.map((tag) => {
                          const r = resolveLoop(tag)
                          return (
                            <div key={tag} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#EDFAE8", border: "1px solid #AEEAA2", borderRadius: 7 }}>
                              <span style={{ fontSize: 10, color: "#1A7A0A", fontWeight: 700 }}>←</span>
                              <span className="font-mono-code" style={{ fontSize: 12, color: "#004B8D", fontWeight: 700 }}>{tag}</span>
                              {r && <><span style={{ fontSize: 11, color: "#515760" }}>{r.name}</span><PerfLevelBadge level={r.performanceLevel} /></>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {loop.downstreamTags.length > 0 && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#9FA6AF", minWidth: 32, marginTop: 2 }}>下游</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {loop.downstreamTags.map((tag) => {
                          const r = resolveLoop(tag)
                          return (
                            <div key={tag} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#EEF5FB", border: "1px solid #D9EAF7", borderRadius: 7 }}>
                              <span style={{ fontSize: 10, color: "#004B8D", fontWeight: 700 }}>→</span>
                              <span className="font-mono-code" style={{ fontSize: 12, color: "#004B8D", fontWeight: 700 }}>{tag}</span>
                              {r && <><span style={{ fontSize: 11, color: "#515760" }}>{r.name}</span><PerfLevelBadge level={r.performanceLevel} /></>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {loop.coupledTags.length > 0 && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#9FA6AF", minWidth: 32, marginTop: 2 }}>耦合</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {loop.coupledTags.map((tag) => {
                          const r = resolveLoop(tag)
                          return (
                            <div key={tag} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 7 }}>
                              <span style={{ fontSize: 10, color: "#7C3AED", fontWeight: 700 }}>⇌</span>
                              <span className="font-mono-code" style={{ fontSize: 12, color: "#7C3AED", fontWeight: 700 }}>{tag}</span>
                              {r && <><span style={{ fontSize: 11, color: "#515760" }}>{r.name}</span><PerfLevelBadge level={r.performanceLevel} /></>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {activeTab === "fault" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>故障分析</div>
              <div style={{ fontSize: 12, color: "#747A82", marginTop: 2 }}>记录回路故障原因及处理措施</div>
            </div>
            <button
              onClick={() => setShowAddFault(true)}
              style={{ fontSize: 12, color: "#004B8D", background: "#EEF5FB", border: "1px solid #D9EAF7", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 500 }}
            >
              + 新增故障记录
            </button>
          </div>

          {showAddFault && (
            <div style={{ background: "#F9FAFB", borderRadius: 8, border: "1px solid #E0E4E9", padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>新增故障记录</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>故障类型</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["PV周期震荡", "PID参数需调整", "阀门黏滞", "仪表故障", "通信异常", "工艺原因", "其他"].map((ft) => (
                    <button
                      key={ft}
                      onClick={() => setNewFault((f) => ({ ...f, faultType: ft }))}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: newFault.faultType === ft ? "1px solid #004B8D" : "1px solid #CDD2D9",
                        background: newFault.faultType === ft ? "#EEF5FB" : "white",
                        color: newFault.faultType === ft ? "#004B8D" : "#515760",
                        fontSize: 12,
                        cursor: "pointer",
                        fontWeight: newFault.faultType === ft ? 600 : 400,
                      }}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>故障描述</div>
                  <textarea
                    value={newFault.description}
                    onChange={(e) => setNewFault((f) => ({ ...f, description: e.target.value }))}
                    placeholder="描述故障现象..."
                    rows={3}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#747A82", marginBottom: 4 }}>处理措施</div>
                  <textarea
                    value={newFault.action}
                    onChange={(e) => setNewFault((f) => ({ ...f, action: e.target.value }))}
                    placeholder="记录处理方案..."
                    rows={3}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowAddFault(false); setNewFault({ faultType: "", description: "", action: "" }) }}
                  style={{ padding: "6px 14px", background: "white", border: "1px solid #CDD2D9", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#515760" }}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (!newFault.faultType) return
                    const now = new Date().toISOString().slice(0, 16).replace("T", " ")
                    setFaultEntries((prev) => [
                      { id: `fault-${Date.now()}`, date: now, operator: "操作员", faultType: newFault.faultType, description: newFault.description, action: newFault.action },
                      ...prev,
                    ])
                    setShowAddFault(false)
                    setNewFault({ faultType: "", description: "", action: "" })
                  }}
                  style={{ padding: "6px 14px", background: "#004B8D", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "white", fontWeight: 500 }}
                >
                  提交记录
                </button>
              </div>
            </div>
          )}

          {faultEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9FA6AF", fontSize: 13 }}>暂无故障分析记录</div>
          ) : (
            faultEntries.map((entry) => (
              <div key={entry.id} style={{ border: "1px solid #E0E4E9", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    background: entry.faultType === "PV周期震荡" ? "#FECACA" : entry.faultType === "PID参数需调整" ? "#FEF9EB" : "#EEF5FB",
                    color: entry.faultType === "PV周期震荡" ? "#991B1B" : entry.faultType === "PID参数需调整" ? "#92620A" : "#004B8D",
                    padding: "2px 8px",
                    borderRadius: 5,
                  }}>
                    {entry.faultType}
                  </span>
                  <span style={{ fontSize: 11, color: "#9FA6AF" }}>{entry.date}</span>
                  <span style={{ fontSize: 11, color: "#747A82" }}>记录人：{entry.operator}</span>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => setFaultEntries((prev) => prev.filter((f) => f.id !== entry.id))}
                    style={{ fontSize: 11, color: "#D93838", background: "none", border: "none", cursor: "pointer" }}
                  >
                    删除
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#747A82", marginBottom: 3 }}>故障描述</div>
                    <div style={{ fontSize: 12, color: "#30353B", lineHeight: 1.5 }}>{entry.description || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#747A82", marginBottom: 3 }}>处理措施</div>
                    <div style={{ fontSize: 12, color: "#30353B", lineHeight: 1.5 }}>{entry.action || "—"}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "info" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 14 }}>基本信息</div>
              {[
                { label: "回路位号", value: loop.tag, mono: true },
                { label: "回路名称", value: loop.name },
                { label: "归属单元", value: `${unit?.deviceCode} ${unit?.deviceName}` },
                { label: "回路类型", value: loopTypeMap[loop.loopType] },
                { label: "过程类型", value: processTypeMap[loop.processType] },
                { label: "投用状态", value: loop.mode === "auto" ? "自动" : loop.mode === "manual" ? "手动" : "未投用" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #F1F3F6", fontSize: 13 }}>
                  <span style={{ width: 120, color: "#747A82", flexShrink: 0 }}>{item.label}</span>
                  <span className={item.mono ? "font-mono-code" : ""} style={{ color: "#30353B" }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 14 }}>控制策略</div>
              <div style={{ fontSize: 13, color: "#515760", lineHeight: 1.7, padding: "12px 14px", background: "#F9FAFB", borderRadius: 8, border: "1px solid #E0E4E9" }}>
                {loop.controlStrategy}
              </div>

              {/* Related loops */}
              {(loop.upstreamTags.length > 0 || loop.downstreamTags.length > 0 || loop.coupledTags.length > 0) && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 10 }}>关联回路</div>
                  {loop.upstreamTags.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "#747A82", marginRight: 8 }}>上游回路：</span>
                      {loop.upstreamTags.map((tag) => (
                        <span key={tag} className="font-mono-code" style={{ fontSize: 11, color: "#004B8D", background: "#EEF5FB", padding: "2px 7px", borderRadius: 4, marginRight: 4 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {loop.downstreamTags.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "#747A82", marginRight: 8 }}>下游回路：</span>
                      {loop.downstreamTags.map((tag) => (
                        <span key={tag} className="font-mono-code" style={{ fontSize: 11, color: "#004B8D", background: "#EEF5FB", padding: "2px 7px", borderRadius: 4, marginRight: 4 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {loop.coupledTags.length > 0 && (
                    <div>
                      <span style={{ fontSize: 11, color: "#747A82", marginRight: 8 }}>耦合回路：</span>
                      {loop.coupledTags.map((tag) => (
                        <span key={tag} className="font-mono-code" style={{ fontSize: 11, color: "#515760", background: "#F1F3F6", padding: "2px 7px", borderRadius: 4, marginRight: 4 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #E0E4E9" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#30353B" }}>属性信息</span>
              <span style={{ fontSize: 11, color: "#9FA6AF" }}>控制器限值、报警与整定组态</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {attributeGroups.map((group) => (
                <AttributeGroup key={group.code} title={group.title} code={group.code} items={group.items} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
