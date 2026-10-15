import { useState } from "react"
import { plant, getAllLoopsFromUnit, computeUnitStats } from "../data/mockData"
import type { AppState, Unit, UnitStatus } from "../types"

function ConfirmModal({ unit, targetStatus, onConfirm, onCancel }: {
  unit: Unit
  targetStatus: UnitStatus
  onConfirm: (reason: string, operator: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState("")
  const [operator, setOperator] = useState("")
  const isStartup = targetStatus === "running"

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 14,
          boxShadow: "0 16px 40px rgba(20,34,48,0.18)",
          padding: "28px 32px",
          width: 480,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#171A1E", margin: "0 0 6px" }}>
          {isStartup ? "确认开车" : "确认停车"}
        </h3>
        <p style={{ fontSize: 13, color: "#747A82", margin: "0 0 20px" }}>
          单元：<strong style={{ color: "#30353B" }}>{unit.name}</strong>
          {isStartup ? "，将恢复该单元下所有回路的性能评价计算。" : "，将暂停该单元下所有回路的性能评价计算，并将所有回路置为【未投用-未开工】状态。"}
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#515760", display: "block", marginBottom: 5, fontWeight: 500 }}>
            操作人 *
          </label>
          <input
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder="请输入操作人姓名"
            style={{
              width: "100%",
              height: 38,
              padding: "0 12px",
              border: "1px solid #CDD2D9",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#004B8D" }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#CDD2D9" }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#515760", display: "block", marginBottom: 5, fontWeight: 500 }}>
            {isStartup ? "开车原因/备注" : "停车原因 *"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isStartup ? "计划开车，请说明..." : "停车原因，如：计划停车检修..."}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #CDD2D9",
              borderRadius: 8,
              fontSize: 13,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
            onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "#004B8D" }}
            onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "#CDD2D9" }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ height: 38, padding: "0 18px", background: "white", color: "#515760", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
          >
            取消
          </button>
          <button
            onClick={() => {
              if (!operator.trim()) { alert("请填写操作人"); return }
              if (!isStartup && !reason.trim()) { alert("请填写停车原因"); return }
              onConfirm(reason, operator)
            }}
            style={{
              height: 38,
              padding: "0 18px",
              background: isStartup ? "#004B8D" : "#D93838",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            确认{isStartup ? "开车" : "停车"}
          </button>
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
  const [units, setUnits] = useState(() => plant.units.map((u) => ({ ...u })))
  const [confirmTarget, setConfirmTarget] = useState<{ unit: Unit; targetStatus: UnitStatus } | null>(null)
  const [history, setHistory] = useState<Array<{ unitName: string; action: string; operator: string; time: string; reason: string }>>([
    { unitName: "T301 精馏塔", action: "停车", operator: "操作班B", time: "2024-03-01 06:30", reason: "计划停车检修，预计3天" },
  ])

  const handleStatusChange = (unit: Unit, target: UnitStatus) => {
    setConfirmTarget({ unit, targetStatus: target })
  }

  const handleConfirm = (reason: string, operator: string) => {
    if (!confirmTarget) return
    const now = new Date().toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    setUnits((prev) =>
      prev.map((u) =>
        u.id === confirmTarget.unit.id
          ? { ...u, status: confirmTarget.targetStatus, statusChangedAt: now, operatedBy: operator }
          : u,
      ),
    )
    setHistory((prev) => [
      {
        unitName: confirmTarget.unit.name,
        action: confirmTarget.targetStatus === "running" ? "开车" : "停车",
        operator,
        time: now,
        reason: reason || "—",
      },
      ...prev,
    ])
    setConfirmTarget(null)
  }

  return (
    <div style={{ padding: "24px" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: 0 }}>单元状态管理</h1>
          <p style={{ fontSize: 13, color: "#747A82", margin: "4px 0 0" }}>
            管理各工艺单元的开停车状态，停车期间自动暂停性能评价计算
          </p>
        </div>
        <div style={{ fontSize: 12, color: "#9FA6AF", background: "white", padding: "6px 12px", borderRadius: 8, border: "1px solid #E0E4E9" }}>
          依据 GB/T 44693.2 §6.1.4
        </div>
      </div>

      {/* Unit cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {units.map((unit) => {
          const loops = getAllLoopsFromUnit(unit)
          const stats = computeUnitStats(unit)
          const isRunning = unit.status === "running"

          return (
            <div
              key={unit.id}
              style={{
                background: "white",
                borderRadius: 12,
                border: isRunning ? "1px solid rgba(57, 197, 35, 0.25)" : "1px solid rgba(96,108,122,0.12)",
                boxShadow: "0 8px 24px rgba(27,39,52,0.07), inset 0 1px 0 rgba(255,255,255,0.8)",
                padding: "20px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: isRunning ? "#39C523" : "#9FA1A4",
                }}
              />

              <div className="flex items-start justify-between mb-4 mt-2">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span className="font-mono-code" style={{ fontSize: 15, fontWeight: 700, color: "#004B8D" }}>
                      {unit.deviceCode}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "#30353B" }}>{unit.deviceName}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#747A82" }}>{unit.name}</div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: isRunning ? "#EFF9EC" : "#F1F3F6",
                    border: `1px solid ${isRunning ? "rgba(57,197,35,0.3)" : "#E0E4E9"}`,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: isRunning ? "#39C523" : "#9FA1A4" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: isRunning ? "#237D17" : "#626972" }}>
                    {isRunning ? "运行中" : "停车中"}
                  </span>
                </div>
              </div>

              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "回路总数", value: stats.total },
                  { label: "自动模式", value: isRunning ? stats.auto : "—" },
                  { label: "手动模式", value: isRunning ? stats.manual : "—" },
                  { label: "未投用", value: isRunning ? stats.unused : stats.total },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#F9FAFB", borderRadius: 7, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#9FA6AF", marginBottom: 3 }}>{item.label}</div>
                    <div className="font-data" style={{ fontSize: 16, fontWeight: 700, color: "#30353B" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Last change info */}
              <div style={{ fontSize: 11, color: "#9FA6AF", marginBottom: 16, display: "flex", gap: 12 }}>
                <span>状态变更：{unit.statusChangedAt}</span>
                <span>操作人：{unit.operatedBy}</span>
              </div>

              {/* Action button */}
              <button
                onClick={() => handleStatusChange(unit, isRunning ? "shutdown" : "running")}
                style={{
                  width: "100%",
                  height: 38,
                  borderRadius: 8,
                  border: isRunning ? "1px solid #FCA5A5" : "1px solid #D9EAF7",
                  background: isRunning ? "#FEF2F2" : "#EEF5FB",
                  color: isRunning ? "#991B1B" : "#004B8D",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 160ms",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = isRunning ? "#FECACA" : "#D9EAF7"
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = isRunning ? "#FEF2F2" : "#EEF5FB"
                }}
              >
                {isRunning ? "⏸ 执行停车" : "▶ 执行开车"}
              </button>
            </div>
          )
        })}
      </div>

      {/* History */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid rgba(96,108,122,0.12)",
          boxShadow: "0 8px 24px rgba(27,39,52,0.07)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E0E4E9" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#30353B", margin: 0 }}>状态变更历史</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F7F8FA" }}>
              {["单元", "操作", "操作人", "时间", "原因/备注"].map((h) => (
                <th
                  key={h}
                  style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#747A82", textAlign: "left", borderBottom: "1px solid #E0E4E9", letterSpacing: "0.04em" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((rec, idx) => (
              <tr
                key={idx}
                style={{ borderBottom: idx < history.length - 1 ? "1px solid #F1F3F6" : "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "white" }}
              >
                <td style={{ padding: "11px 16px", fontSize: 13, color: "#30353B" }}>{rec.unitName}</td>
                <td style={{ padding: "11px 16px" }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: rec.action === "开车" ? "#EFF9EC" : "#F1F3F6",
                    color: rec.action === "开车" ? "#237D17" : "#626972",
                  }}>
                    {rec.action}
                  </span>
                </td>
                <td style={{ padding: "11px 16px", fontSize: 13, color: "#515760" }}>{rec.operator}</td>
                <td style={{ padding: "11px 16px", fontSize: 13, color: "#515760" }}>
                  <span className="font-data">{rec.time}</span>
                </td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: "#747A82" }}>{rec.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      {confirmTarget && (
        <ConfirmModal
          unit={confirmTarget.unit}
          targetStatus={confirmTarget.targetStatus}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}
