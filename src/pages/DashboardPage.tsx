import { plant, allLoops, computeUnitStats, getAllLoopsFromUnit } from "../data/mockData"
import type { AppState, Unit } from "../types"

function PerfLevelBadge({ level, small }: { level: number; small?: boolean }) {
  const configs: Record<number, { label: string; bg: string; color: string }> = {
    1: { label: "一级", bg: "#004B8D", color: "white" },
    2: { label: "二级", bg: "#0069A8", color: "white" },
    3: { label: "三级", bg: "#FEF3C7", color: "#92400E" },
    4: { label: "四级", bg: "#FEE2C5", color: "#9A3412" },
    5: { label: "五级", bg: "#FECACA", color: "#991B1B" },
  }
  const c = configs[level] || configs[5]
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        padding: small ? "1px 5px" : "2px 7px",
        borderRadius: 4,
        display: "inline-block",
        fontFamily: '"Inter Tight", sans-serif',
      }}
    >
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
    <span
      style={{
        background: c.bg,
        color: c.color,
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 7px",
        borderRadius: 4,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />
      {c.label}
    </span>
  )
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 90 ? "#004B8D" : score >= 80 ? "#0069A8" : score >= 70 ? "#F2B544" : score >= 60 ? "#F28C28" : "#D93838"

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E0E4E9" strokeWidth={size * 0.1} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.1}
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 600ms" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dy="0.35em"
        fontSize={size * 0.22}
        fontFamily='"Inter Tight", sans-serif'
        fontWeight={600}
        fill="#171A1E"
      >
        {score.toFixed(0)}
      </text>
    </svg>
  )
}

function LevelBar({ dist, total }: { dist: Record<number, number>; total: number }) {
  const colors = ["#004B8D", "#0069A8", "#F2B544", "#F28C28", "#D93838"]
  const labels = ["一", "二", "三", "四", "五"]
  return (
    <div className="flex flex-col gap-1">
      {[1, 2, 3, 4, 5].map((lvl) => {
        const count = dist[lvl] || 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={lvl} className="flex items-center gap-1.5" style={{ fontSize: 10 }}>
            <span style={{ width: 16, color: "#747A82", flexShrink: 0 }}>{labels[lvl - 1]}</span>
            <div style={{ flex: 1, height: 5, background: "#E0E4E9", borderRadius: 3, overflow: "hidden" }}>
              {pct > 0 && (
                <div
                  style={{ width: `${pct}%`, height: "100%", background: colors[lvl - 1], borderRadius: 3, transition: "width 500ms" }}
                />
              )}
            </div>
            <span style={{ width: 12, textAlign: "right", color: "#515760" }}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function UnitCard({ unit, onNavigate }: { unit: Unit; navigate?: Function; onNavigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const stats = computeUnitStats(unit)
  const isShutdown = unit.status === "shutdown"

  return (
    <div
      onClick={() => !isShutdown && onNavigate("loop-list", { selectedUnitId: unit.id })}
      style={{
        background: "white",
        borderRadius: 12,
        border: "1px solid rgba(96,108,122,0.12)",
        boxShadow: "0 8px 24px rgba(27,39,52,0.07), inset 0 1px 0 rgba(255,255,255,0.8)",
        padding: "20px",
        cursor: isShutdown ? "default" : "pointer",
        transition: "box-shadow 180ms",
        opacity: isShutdown ? 0.75 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isShutdown) (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(27,39,52,0.12), inset 0 1px 0 rgba(255,255,255,0.8)"
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(27,39,52,0.07), inset 0 1px 0 rgba(255,255,255,0.8)"
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-code" style={{ fontSize: 13, color: "#004B8D", fontWeight: 600 }}>
              {unit.deviceCode}
            </span>
            <span style={{ fontSize: 13, color: "#30353B", fontWeight: 500 }}>{unit.deviceName}</span>
          </div>
          <div style={{ fontSize: 11, color: "#747A82", marginTop: 2 }}>{unit.name}</div>
        </div>
        {isShutdown ? (
          <span style={{ fontSize: 11, background: "#F1F3F6", color: "#626972", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>
            停车中
          </span>
        ) : (
          <span style={{ fontSize: 11, background: "#EFF9EC", color: "#237D17", padding: "2px 8px", borderRadius: 4, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#39C523" }} />
            运行中
          </span>
        )}
      </div>

      {isShutdown ? (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#9FA6AF", fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⏸</div>
          <div>装置停车，暂停性能评价</div>
          <div style={{ marginTop: 4, fontSize: 11 }}>停车时间：{unit.statusChangedAt}</div>
          <div style={{ marginTop: 2, fontSize: 11 }}>共 {stats.total} 个回路</div>
        </div>
      ) : (
        <>
          {/* Score ring + metrics */}
          <div className="flex items-center gap-4 mb-4">
            <ScoreRing score={stats.avgScore} size={72} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#747A82", marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" }}>
                性能评分
              </div>
              <div className="flex flex-col gap-1.5">
                <MetricRow label="自控率" value={`${stats.auto}/${stats.total}`} sub={`${stats.total > 0 ? ((stats.auto / stats.total) * 100).toFixed(0) : 0}%`} />
                <MetricRow label="回路数" value={stats.total} />
                {stats.criticalCount > 0 && (
                  <MetricRow label="需关注" value={stats.criticalCount} warn />
                )}
              </div>
            </div>
          </div>

          {/* Level distribution */}
          <div style={{ borderTop: "1px solid #E0E4E9", paddingTop: 12 }}>
            <div style={{ fontSize: 10, color: "#747A82", marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" }}>
              性能定级分布
            </div>
            <LevelBar dist={stats.levelDist} total={stats.auto + stats.manual} />
          </div>
        </>
      )}
    </div>
  )
}

function MetricRow({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 11, color: "#747A82" }}>{label}</span>
      <span className="font-data" style={{ fontSize: 12, color: warn ? "#D93838" : "#171A1E", fontWeight: 600 }}>
        {value}
        {sub && <span style={{ fontSize: 10, color: "#747A82", fontWeight: 400, marginLeft: 3 }}>{sub}</span>}
      </span>
    </div>
  )
}

function KPICard({ label, value, unit: u, icon, color, sub }: { label: string; value: string | number; unit?: string; icon: string; color: string; sub?: string }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        border: "1px solid rgba(96,108,122,0.12)",
        boxShadow: "0 8px 24px rgba(27,39,52,0.07), inset 0 1px 0 rgba(255,255,255,0.8)",
        padding: "18px 20px",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div style={{ fontSize: 12, color: "#747A82" }}>{label}</div>
        <div style={{ fontSize: 20 }}>{icon}</div>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="font-data" style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>
          {value}
        </span>
        {u && <span style={{ fontSize: 12, color: "#747A82", marginBottom: 2 }}>{u}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function DashboardPage({
  navigate,
}: {
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
}) {
  const runningLoops = allLoops.filter((l) => {
    const unit = plant.units.find((u) => u.id === l.unitId)
    return unit?.status === "running"
  })
  const autoLoops = runningLoops.filter((l) => l.mode === "auto")
  const autoRate = runningLoops.length > 0 ? (autoLoops.length / runningLoops.length) * 100 : 0
  const avgScore =
    autoLoops.length > 0 ? autoLoops.reduce((s, l) => s + l.performanceScore, 0) / autoLoops.length : 0
  const criticalLoops = runningLoops.filter((l) => l.performanceLevel >= 4 || l.mode === "manual")

  // Worst 5 running loops
  const worstLoops = [...runningLoops]
    .filter((l) => l.mode !== "unused")
    .sort((a, b) => a.performanceScore - b.performanceScore)
    .slice(0, 5)

  const processTypeMap: Record<string, string> = {
    flow: "流量",
    pressure: "压力",
    level: "液位",
    temperature: "温度",
    composition: "成分",
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1440 }}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: 0 }}>总览</h1>
          <p style={{ fontSize: 13, color: "#747A82", margin: "4px 0 0" }}>
            PPA01 某精细化工厂 · 实时控制回路性能概览
          </p>
        </div>
        <div style={{ fontSize: 11, color: "#9FA6AF", background: "white", padding: "6px 12px", borderRadius: 8, border: "1px solid #E0E4E9" }}>
          数据更新周期：3秒
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard
          label="在线回路总数"
          value={runningLoops.length}
          icon="⚙"
          color="#171A1E"
          sub={`共 ${allLoops.length} 个回路，${allLoops.length - runningLoops.length} 个停车`}
        />
        <KPICard
          label="实时自控率"
          value={autoRate.toFixed(1)}
          unit="%"
          icon="▲"
          color={autoRate >= 95 ? "#237D17" : autoRate >= 80 ? "#004B8D" : "#D93838"}
          sub={`${autoLoops.length}/${runningLoops.length} 个回路处于自动模式`}
        />
        <KPICard
          label="平均性能评分"
          value={avgScore.toFixed(1)}
          icon="◎"
          color={avgScore >= 90 ? "#004B8D" : avgScore >= 80 ? "#0069A8" : avgScore >= 70 ? "#F2B544" : "#D93838"}
          sub={`目标值 ≥ 80.0`}
        />
        <KPICard
          label="需关注回路"
          value={criticalLoops.length}
          icon="⚠"
          color={criticalLoops.length === 0 ? "#237D17" : "#D93838"}
          sub={criticalLoops.length === 0 ? "所有回路性能正常" : `${criticalLoops.length} 个回路需要处理`}
        />
      </div>

      {/* Unit health cards */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#30353B", margin: "0 0 14px" }}>
          工艺单元健康度
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {plant.units.map((unit) => (
          <UnitCard key={unit.id} unit={unit} onNavigate={navigate} />
        ))}
      </div>

      {/* Worst performers */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid rgba(96,108,122,0.12)",
          boxShadow: "0 8px 24px rgba(27,39,52,0.07), inset 0 1px 0 rgba(255,255,255,0.8)",
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: "16px 20px", borderBottom: "1px solid #E0E4E9" }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#30353B", margin: 0 }}>
            性能较差回路 TOP 5
          </h2>
          <button
            onClick={() => navigate("loop-list")}
            style={{
              fontSize: 12,
              color: "#004B8D",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            查看全部 →
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F7F8FA" }}>
              {["位号", "回路名称", "单元", "过程类型", "自控率", "性能评分", "定级", "投用状态", "操作"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#747A82",
                    textAlign: "left",
                    borderBottom: "1px solid #E0E4E9",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {worstLoops.map((loop, idx) => {
              const unit = plant.units.find((u) => u.id === loop.unitId)
              return (
                <tr
                  key={loop.id}
                  style={{ borderBottom: idx < worstLoops.length - 1 ? "1px solid #F1F3F6" : "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FAFBFC" }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "white" }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <span className="font-mono-code" style={{ fontSize: 12, color: "#004B8D" }}>
                      {loop.tag}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#30353B" }}>{loop.name}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="font-mono-code" style={{ fontSize: 11, color: "#515760" }}>
                      {unit?.deviceCode}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#515760" }}>
                    {processTypeMap[loop.processType]}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="font-data" style={{ fontSize: 13, fontWeight: 600, color: loop.autoRate >= 95 ? "#237D17" : loop.autoRate >= 80 ? "#171A1E" : "#D93838" }}>
                      {loop.autoRate.toFixed(1)}
                      <span style={{ fontSize: 10, color: "#747A82", fontWeight: 400 }}>%</span>
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="font-data" style={{ fontSize: 13, fontWeight: 700, color: "#171A1E" }}>
                      {loop.performanceScore.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <PerfLevelBadge level={loop.performanceLevel} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <ModeBadge mode={loop.mode} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => navigate("loop-detail", { selectedLoopId: loop.id })}
                      style={{
                        fontSize: 12,
                        color: "#004B8D",
                        background: "#EEF5FB",
                        border: "1px solid #D9EAF7",
                        borderRadius: 6,
                        padding: "4px 10px",
                        cursor: "pointer",
                        fontWeight: 500,
                        transition: "all 120ms",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#D9EAF7" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#EEF5FB" }}
                    >
                      详情
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
