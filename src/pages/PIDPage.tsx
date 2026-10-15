import { useState } from "react"
import { plant, allLoops } from "../data/mockData"
import type { AppState } from "../types"

export default function PIDPage({
  navigate,
}: {
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
}) {
  const [unitFilter, setUnitFilter] = useState("")
  const [processFilter, setProcessFilter] = useState("")
  const [expandedLoop, setExpandedLoop] = useState<string | null>(null)

  const filtered = allLoops.filter((l) => {
    if (unitFilter && l.unitId !== unitFilter) return false
    if (processFilter && l.processType !== processFilter) return false
    return true
  })

  const processTypeMap: Record<string, string> = {
    flow: "流量",
    pressure: "压力",
    level: "液位",
    temperature: "温度",
    composition: "成分",
  }

  const unitOptions = plant.units.map((u) => ({ value: u.id, label: `${u.deviceCode} ${u.deviceName}` }))

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: 0 }}>PID参数管理</h1>
          <p style={{ fontSize: 13, color: "#747A82", margin: "4px 0 0" }}>
            全厂控制回路PID整定参数及变更记录
          </p>
        </div>
        <button
          style={{
            height: 36,
            padding: "0 14px",
            background: "white",
            color: "#515760",
            border: "1px solid #CDD2D9",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          导出参数表
        </button>
      </div>

      {/* Filter bar */}
      <div
        style={{
          background: "white",
          borderRadius: 10,
          border: "1px solid #E0E4E9",
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          style={{ height: 34, padding: "0 10px", border: "1px solid #CDD2D9", borderRadius: 7, fontSize: 12, color: "#30353B", background: "white" }}
        >
          <option value="">所有单元</option>
          {unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={processFilter}
          onChange={(e) => setProcessFilter(e.target.value)}
          style={{ height: 34, padding: "0 10px", border: "1px solid #CDD2D9", borderRadius: 7, fontSize: 12, color: "#30353B", background: "white" }}
        >
          <option value="">过程类型</option>
          <option value="flow">流量</option>
          <option value="pressure">压力</option>
          <option value="level">液位</option>
          <option value="temperature">温度</option>
        </select>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#9FA6AF" }}>
          显示 {filtered.length} / {allLoops.length} 条
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid rgba(96,108,122,0.12)",
          boxShadow: "0 8px 24px rgba(27,39,52,0.07)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F7F8FA" }}>
              {["位号", "名称", "过程", "P", "I", "D", "PVF", "输出限位", "SP限位", "最近整定", "操作"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#747A82",
                    textAlign: "left",
                    borderBottom: "1px solid #E0E4E9",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((loop, idx) => {
              const isExpanded = expandedLoop === loop.id
              const unit = plant.units.find((u) => u.id === loop.unitId)
              const latestRecord = loop.pidRecords.length > 0 ? loop.pidRecords[loop.pidRecords.length - 1] : null

              return (
                <>
                  <tr
                    key={loop.id}
                    style={{
                      borderBottom: isExpanded ? "none" : idx < filtered.length - 1 ? "1px solid #F1F3F6" : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedLoop(isExpanded ? null : loop.id)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "white" }}
                  >
                    <td style={{ padding: "11px 14px" }}>
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 10, color: "#9FA6AF" }}>{isExpanded ? "▼" : "▶"}</span>
                        <span className="font-mono-code" style={{ fontSize: 12, color: "#004B8D", fontWeight: 600 }}>
                          {loop.tag}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#30353B" }}>{loop.name}</td>
                    <td style={{ padding: "11px 14px", fontSize: 11, color: "#747A82" }}>
                      {processTypeMap[loop.processType]}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span className="font-data" style={{ fontSize: 13, fontWeight: 700, color: "#171A1E" }}>{loop.pid.P}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span className="font-data" style={{ fontSize: 13, fontWeight: 700, color: "#171A1E" }}>{loop.pid.I}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span className="font-data" style={{ fontSize: 13, fontWeight: 700, color: "#171A1E" }}>{loop.pid.D}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span className="font-data" style={{ fontSize: 13, color: "#515760" }}>{loop.pid.pvFilter}</span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 11 }}>
                      <span className="font-mono-code" style={{ color: "#515760" }}>
                        {loop.pid.outputLo}~{loop.pid.outputHi}%
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 11 }}>
                      <span className="font-mono-code" style={{ color: "#515760" }}>
                        {loop.pid.spLo}~{loop.pid.spHi} {loop.trendUnit}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      {latestRecord ? (
                        <div>
                          <div style={{ fontSize: 11, color: "#515760" }}>{latestRecord.date.split(" ")[0]}</div>
                          <div style={{ fontSize: 10, color: "#9FA6AF" }}>{latestRecord.operator}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "#9FA6AF" }}>无记录</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate("loop-detail", { selectedLoopId: loop.id })
                        }}
                        style={{
                          fontSize: 11,
                          color: "#004B8D",
                          background: "#EEF5FB",
                          border: "1px solid #D9EAF7",
                          borderRadius: 5,
                          padding: "3px 8px",
                          cursor: "pointer",
                        }}
                      >
                        回路详情
                      </button>
                    </td>
                  </tr>

                  {/* Expanded records row */}
                  {isExpanded && (
                    <tr key={`${loop.id}-exp`}>
                      <td colSpan={11} style={{ padding: "0 14px 14px 36px", background: "#F9FAFB", borderBottom: idx < filtered.length - 1 ? "1px solid #E0E4E9" : "none" }}>
                        <div style={{ paddingTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#515760", marginBottom: 8 }}>
                            整定记录（{loop.pidRecords.length} 条）
                          </div>
                          {loop.pidRecords.length === 0 ? (
                            <div style={{ fontSize: 12, color: "#9FA6AF" }}>暂无整定记录</div>
                          ) : (
                            loop.pidRecords.map((rec) => (
                              <div
                                key={rec.id}
                                style={{
                                  border: "1px solid #E0E4E9",
                                  borderRadius: 8,
                                  padding: "12px 14px",
                                  marginBottom: 8,
                                  background: "white",
                                }}
                              >
                                <div className="flex items-center gap-4 mb-2" style={{ fontSize: 12 }}>
                                  <span style={{ fontWeight: 600, color: "#30353B" }}>{rec.date}</span>
                                  <span style={{ color: "#747A82" }}>整定人：{rec.operator}</span>
                                  <span style={{
                                    background: rec.eliminatedOscillation ? "#EFF9EC" : "#FEF9EB",
                                    color: rec.eliminatedOscillation ? "#237D17" : "#92620A",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    fontWeight: 500,
                                    fontSize: 11,
                                  }}>
                                    {rec.eliminatedOscillation ? "✓ 消除振荡" : "振荡未消除"}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: "#515760", marginBottom: 8 }}>
                                  <span style={{ color: "#747A82" }}>原因：</span>{rec.reason}
                                </div>
                                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                                  <div style={{ background: "#FEF9EB", borderRadius: 6, padding: "6px 10px", fontSize: 11 }}>
                                    <span style={{ color: "#92620A", fontWeight: 600 }}>整定前：</span>
                                    <span className="font-mono-code">P={rec.beforeP}  I={rec.beforeI}  D={rec.beforeD}</span>
                                  </div>
                                  <span style={{ alignSelf: "center", color: "#9FA6AF" }}>→</span>
                                  <div style={{ background: "#EFF9EC", borderRadius: 6, padding: "6px 10px", fontSize: 11 }}>
                                    <span style={{ color: "#237D17", fontWeight: 600 }}>整定后：</span>
                                    <span className="font-mono-code">P={rec.afterP}  I={rec.afterI}  D={rec.afterD}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: 12, color: "#515760" }}>
                                  <span style={{ color: "#747A82" }}>结果：</span>{rec.result}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Stats footer */}
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "有整定记录", value: allLoops.filter((l) => l.pidRecords.length > 0).length, total: allLoops.length, color: "#004B8D" },
          { label: "振荡未消除整定", value: allLoops.filter((l) => l.pidRecords.some((r) => !r.eliminatedOscillation)).length, total: allLoops.length, color: "#F28C28" },
          { label: "30天内有整定", value: 2, total: allLoops.length, color: "#39C523" },
        ].map((item) => (
          <div key={item.label} style={{ background: "white", borderRadius: 10, border: "1px solid #E0E4E9", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="font-data" style={{ fontSize: 28, fontWeight: 700, color: item.color, lineHeight: 1 }}>
              {item.value}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#30353B", fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "#9FA6AF" }}>共 {item.total} 个回路</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
