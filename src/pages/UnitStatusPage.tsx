import { useMemo, useState } from "react"
import { allLoops } from "../data/mockData"
import type { AppState, Loop, Unit } from "../types"
import { useOperationalState } from "../state/OperationalState"

type ViewMode = "card" | "list"
type LoopGroup = "total" | "auto" | "manual" | "unused"

interface LoopDialogState {
  unitId: string
  group: LoopGroup
  label: string
}

function modeLabel(mode: Loop["mode"]) {
  return mode === "auto" ? "自动" : mode === "manual" ? "手动" : "未投用"
}

function getGroupLoops(loops: Loop[], group: LoopGroup, isRunning: boolean) {
  if (group === "total") return loops
  if (group === "unused" && !isRunning) return loops
  return loops.filter((loop) => loop.mode === group)
}

function StatusBadge({ running }: { running: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 20,
        background: running ? "#EFF9EC" : "#F1F3F6",
        border: `1px solid ${running ? "rgba(57,197,35,0.3)" : "#E0E4E9"}`,
        color: running ? "#237D17" : "#626972",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: running ? "#39C523" : "#9FA1A4" }} />
      {running ? "运行中" : "停车中"}
    </span>
  )
}

function StatButton({
  label,
  value,
  onClick,
  compact = false,
}: {
  label: string
  value: number
  onClick: () => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`查看${label}回路`}
        style={{
          padding: "3px 8px",
          border: "1px solid #D9EAF7",
          borderRadius: 6,
          background: "#EEF5FB",
          color: "#004B8D",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          minWidth: 34,
        }}
      >
        {value}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "8px 10px",
        textAlign: "left",
        background: "#F9FAFB",
        border: "1px solid transparent",
        borderRadius: 7,
        cursor: "pointer",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = "#EEF5FB"
        event.currentTarget.style.borderColor = "#D9EAF7"
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "#F9FAFB"
        event.currentTarget.style.borderColor = "transparent"
      }}
    >
      <span style={{ display: "block", fontSize: 10, color: "#9FA6AF", marginBottom: 3 }}>{label}</span>
      <span className="font-data" style={{ fontSize: 16, fontWeight: 700, color: "#004B8D", textDecoration: "underline", textDecorationColor: "#B8D8EE", textUnderlineOffset: 3 }}>
        {value}
      </span>
    </button>
  )
}

function LoopDialog({
  unit,
  label,
  loops,
  onClose,
  onOpenLoop,
}: {
  unit: Unit
  label: string
  loops: Loop[]
  onClose: () => void
  onOpenLoop: (loopId: string) => void
}) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(27,39,52,0.32)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${unit.deviceCode} ${label}回路`}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(820px, 92vw)",
          maxHeight: "78vh",
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid rgba(69,83,99,0.12)",
          boxShadow: "0 16px 40px rgba(20,34,48,0.18)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", borderBottom: "1px solid #E0E4E9" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span className="font-mono-code" style={{ fontSize: 15, fontWeight: 700, color: "#004B8D" }}>{unit.deviceCode}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#30353B" }}>{label}回路</span>
            </div>
            <div style={{ fontSize: 12, color: "#9FA6AF" }}>{unit.deviceName} · 共 {loops.length} 个回路</div>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 7, background: "#F7F8FA", color: "#747A82", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: "#F7F8FA" }}>
                {["位号", "回路名称", "运行模式", "性能得分", "操作"].map((heading) => (
                  <th key={heading} style={{ padding: "10px 16px", borderBottom: "1px solid #E0E4E9", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#747A82" }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loops.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>当前分类下暂无回路</td>
                </tr>
              ) : loops.map((loop, index) => (
                <tr key={loop.id} style={{ borderBottom: index < loops.length - 1 ? "1px solid #F1F3F6" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="font-mono-code" style={{ fontSize: 12, fontWeight: 600, color: "#004B8D" }}>{loop.tag}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#30353B" }}>{loop.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#515760" }}>{modeLabel(loop.mode)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="font-data" style={{ fontSize: 13, fontWeight: 700, color: loop.performanceScore >= 80 ? "#1A7A0A" : loop.performanceScore >= 60 ? "#92600A" : "#D93838" }}>
                      {loop.performanceScore}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button type="button" onClick={() => onOpenLoop(loop.id)} style={{ padding: "5px 10px", border: "1px solid #D9EAF7", borderRadius: 6, background: "#EEF5FB", color: "#004B8D", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function UnitStatusPage({
  navigate,
}: {
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
}) {
  const { units, assetLoops } = useOperationalState()
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const [dialog, setDialog] = useState<LoopDialogState | null>(null)
  const history = [
    { unitName: "T301 精馏塔", action: "停车", operator: "操作班B", time: "2024-03-01 06:30", reason: "计划停车检修，预计3天" },
  ]

  const unitLoops = useMemo(() => Object.fromEntries(units.map((unit) => {
    const mountedLoopIds = new Set([
      ...(assetLoops[unit.id] || []),
      ...unit.sections.flatMap((section) => assetLoops[section.id] || []),
    ])
    return [unit.id, allLoops.filter((loop) => mountedLoopIds.has(loop.id))]
  })), [assetLoops, units])

  const openGroup = (unit: Unit, group: LoopGroup, label: string) => {
    setDialog({ unitId: unit.id, group, label })
  }

  const getStats = (unit: Unit) => {
    const loops = unitLoops[unit.id] || []
    const running = unit.status === "running"
    return [
      { key: "total" as const, label: "回路总数", value: loops.length },
      { key: "auto" as const, label: "自动模式", value: loops.filter((loop) => loop.mode === "auto").length },
      { key: "manual" as const, label: "手动模式", value: loops.filter((loop) => loop.mode === "manual").length },
      { key: "unused" as const, label: "未投用", value: running ? loops.filter((loop) => loop.mode === "unused").length : loops.length },
    ]
  }

  const dialogUnit = dialog ? units.find((unit) => unit.id === dialog.unitId) : null
  const dialogLoops = dialog && dialogUnit
    ? getGroupLoops(unitLoops[dialogUnit.id] || [], dialog.group, dialogUnit.status === "running")
    : []

  return (
    <div style={{ padding: 24 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#171A1E" }}>单元状态管理</div>
          <div style={{ fontSize: 13, color: "#747A82", marginTop: 4 }}>只读展示程序自动识别的当前状态，点击回路数字可查看明细</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", padding: 3, borderRadius: 8, background: "#E0E4E9" }}>
            {([
              { value: "card" as const, label: "卡片" },
              { value: "list" as const, label: "列表" },
            ]).map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setViewMode(option.value)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  border: "none",
                  borderRadius: 6,
                  background: viewMode === option.value ? "#FFFFFF" : "transparent",
                  color: viewMode === option.value ? "#004B8D" : "#747A82",
                  boxShadow: viewMode === option.value ? "0 1px 3px rgba(27,39,52,0.12)" : "none",
                  fontSize: 12,
                  fontWeight: viewMode === option.value ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#9FA6AF", background: "#FFFFFF", padding: "6px 12px", borderRadius: 8, border: "1px solid #E0E4E9" }}>依据 GB/T 44693.2 §6.1.4</div>
        </div>
      </div>

      {viewMode === "card" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 28 }}>
          {units.map((unit) => {
            const running = unit.status === "running"
            return (
              <div key={unit.id} style={{ background: "#FFFFFF", borderRadius: 12, border: running ? "1px solid rgba(57,197,35,0.25)" : "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", padding: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: running ? "#39C523" : "#9FA1A4" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: 8, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span className="font-mono-code" style={{ fontSize: 15, fontWeight: 700, color: "#004B8D" }}>{unit.deviceCode}</span>
                      <span style={{ fontSize: 15, fontWeight: 500, color: "#30353B" }}>{unit.deviceName}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#747A82" }}>{unit.name}</div>
                  </div>
                  <StatusBadge running={running} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {getStats(unit).map((stat) => (
                    <StatButton key={stat.key} label={stat.label} value={stat.value} onClick={() => openGroup(unit, stat.key, stat.label)} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#9FA6AF", marginBottom: 16, display: "flex", gap: 12 }}>
                  <span>状态变更：{unit.statusChangedAt}</span>
                  <span>操作人：{unit.operatedBy}</span>
                </div>
                <div style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #E0E4E9", background: "#F7F8FA", color: "#747A82", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M3 6.5a3.5 3.5 0 016.1-2.35M10 2.5v2.3H7.7M10 6.5a3.5 3.5 0 01-6.1 2.35M3 10.5V8.2h2.3" stroke="#747A82" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  当前状态由接口自动更新
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", overflow: "hidden", marginBottom: 28 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7F8FA" }}>
                {["单元", "当前状态", "回路总数", "自动模式", "手动模式", "未投用", "最近更新时间"].map((heading) => (
                  <th key={heading} style={{ padding: "11px 16px", borderBottom: "1px solid #E0E4E9", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#747A82" }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((unit, index) => {
                const stats = getStats(unit)
                return (
                  <tr key={unit.id} style={{ borderBottom: index < units.length - 1 ? "1px solid #F1F3F6" : "none" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span className="font-mono-code" style={{ fontSize: 13, fontWeight: 700, color: "#004B8D" }}>{unit.deviceCode}</span>
                        <span style={{ fontSize: 12, color: "#515760" }}>{unit.deviceName}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#9FA6AF", marginTop: 2 }}>{unit.name}</div>
                    </td>
                    <td style={{ padding: "13px 16px" }}><StatusBadge running={unit.status === "running"} /></td>
                    {stats.map((stat) => (
                      <td key={stat.key} style={{ padding: "13px 16px" }}>
                        <StatButton compact label={stat.label} value={stat.value} onClick={() => openGroup(unit, stat.key, stat.label)} />
                      </td>
                    ))}
                    <td style={{ padding: "13px 16px" }}>
                      <div className="font-data" style={{ fontSize: 11, color: "#515760" }}>{unit.statusChangedAt}</div>
                      <div style={{ fontSize: 10, color: "#9FA6AF", marginTop: 2 }}>{unit.operatedBy}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E0E4E9", fontSize: 14, fontWeight: 600, color: "#30353B" }}>状态变更历史</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F7F8FA" }}>
              {["单元", "状态", "数据来源", "时间", "说明"].map((heading) => (
                <th key={heading} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#747A82", textAlign: "left", borderBottom: "1px solid #E0E4E9" }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((record) => (
              <tr key={`${record.unitName}-${record.time}`}>
                <td style={{ padding: "11px 16px", fontSize: 13, color: "#30353B" }}>{record.unitName}</td>
                <td style={{ padding: "11px 16px", fontSize: 12, fontWeight: 600, color: "#626972" }}>{record.action}</td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: "#515760" }}>{record.operator}</td>
                <td className="font-data" style={{ padding: "11px 16px", fontSize: 12, color: "#515760" }}>{record.time}</td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: "#747A82" }}>{record.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog && dialogUnit && (
        <LoopDialog
          unit={dialogUnit}
          label={dialog.label}
          loops={dialogLoops}
          onClose={() => setDialog(null)}
          onOpenLoop={(loopId) => navigate("performance-monitor", { selectedLoopId: loopId })}
        />
      )}
    </div>
  )
}
