import { useState, useMemo } from "react"
import { allLoops, plant } from "../data/mockData"
import type { AppState, FaultEntry, Loop } from "../types"

const FAULT_TYPES = ["PV周期震荡", "PID参数需调整", "阀门黏滞", "仪表故障", "通信异常", "工艺原因", "其他"]

const FAULT_TYPE_CONFIG: Record<string, { bg: string; color: string; border: string }> = {
  "PV周期震荡":  { bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  "PID参数需调整": { bg: "#FEF9EB", color: "#92620A", border: "#FDE68A" },
  "阀门黏滞":   { bg: "#FFF4E6", color: "#9A3412", border: "#FED7AA" },
  "仪表故障":   { bg: "#F3F0FF", color: "#5B21B6", border: "#DDD6FE" },
  "通信异常":   { bg: "#F0F9FF", color: "#0369A1", border: "#BAE6FD" },
  "工艺原因":   { bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
  "其他":       { bg: "#F7F8FA", color: "#515760", border: "#E0E4E9" },
}

interface EnrichedFault extends FaultEntry {
  loopTag: string
  loopName: string
  unitCode: string
  unitName: string
  loopId: string
}

function FaultTypeBadge({ type }: { type: string }) {
  const cfg = FAULT_TYPE_CONFIG[type] || FAULT_TYPE_CONFIG["其他"]
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
      {type}
    </span>
  )
}

function StatTile({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "18px 22px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "#747A82", fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div className="font-data" style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

export default function FaultAnalysisPage({ navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const [typeFilter, setTypeFilter] = useState("")
  const [unitFilter, setUnitFilter] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "loop">("date")

  const allFaults: EnrichedFault[] = useMemo(() => {
    const result: EnrichedFault[] = []
    for (const loop of allLoops) {
      const unit = plant.units.find((u) => u.id === loop.unitId)
      for (const fault of (loop.faultEntries || [])) {
        result.push({
          ...fault,
          loopTag: loop.tag,
          loopName: loop.name,
          unitCode: unit?.deviceCode || "",
          unitName: unit?.deviceName || "",
          loopId: loop.id,
        })
      }
    }
    return result
  }, [])

  const filtered = useMemo(() => {
    let list = [...allFaults]
    if (typeFilter) list = list.filter((f) => f.faultType === typeFilter)
    if (unitFilter) list = list.filter((f) => {
      const loop = allLoops.find((l) => l.id === f.loopId)
      return loop?.unitId === unitFilter
    })
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((f) =>
        f.loopTag.toLowerCase().includes(q) ||
        f.loopName.toLowerCase().includes(q) ||
        f.faultType.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      if (sortBy === "date") return b.date.localeCompare(a.date)
      return a.loopTag.localeCompare(b.loopTag)
    })
    return list
  }, [allFaults, typeFilter, unitFilter, search, sortBy])

  // Statistics
  const typeCounts: Record<string, number> = {}
  for (const f of allFaults) {
    typeCounts[f.faultType] = (typeCounts[f.faultType] || 0) + 1
  }
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
  const affectedLoops = new Set(allFaults.map((f) => f.loopId)).size

  const unitOptions = plant.units.map((u) => ({ value: u.id, label: `${u.deviceCode} ${u.deviceName}` }))

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>故障分析</h1>
        <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>
          全厂控制回路故障记录汇总，支持按故障类型、单元筛选与归因分析
        </p>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <StatTile label="故障记录总数" value={allFaults.length} color="#004B8D" sub="全厂累计" />
        <StatTile label="涉及回路数" value={affectedLoops} color="#F28C28" sub={`共 ${allLoops.length} 个回路`} />
        <StatTile label="最高频故障类型" value={topType?.[0] || "—"} color="#D93838" sub={`出现 ${topType?.[1] || 0} 次`} />
        <StatTile label="本次筛选" value={filtered.length} color="#39C523" sub="条故障记录" />
      </div>

      {/* Fault type distribution */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B", marginBottom: 12 }}>故障类型分布</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setTypeFilter("")}
            style={{
              padding: "5px 12px", borderRadius: 20, border: typeFilter === "" ? "1px solid #004B8D" : "1px solid #E0E4E9",
              background: typeFilter === "" ? "#EEF5FB" : "#F7F8FA",
              color: typeFilter === "" ? "#004B8D" : "#515760", fontSize: 12, fontWeight: typeFilter === "" ? 600 : 400, cursor: "pointer",
            }}
          >
            全部 ({allFaults.length})
          </button>
          {FAULT_TYPES.map((ft) => {
            const cnt = typeCounts[ft] || 0
            if (cnt === 0) return null
            const cfg = FAULT_TYPE_CONFIG[ft]
            const active = typeFilter === ft
            return (
              <button
                key={ft}
                onClick={() => setTypeFilter(active ? "" : ft)}
                style={{
                  padding: "5px 12px", borderRadius: 20,
                  border: active ? `1px solid ${cfg.color}` : `1px solid ${cfg.border}`,
                  background: active ? cfg.bg : "#F9FAFB",
                  color: active ? cfg.color : "#515760", fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer",
                }}
              >
                {ft} ({cnt})
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid #E0E4E9", padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="搜索位号、名称或描述..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ height: 34, padding: "0 10px", border: "1px solid #CDD2D9", borderRadius: 7, fontSize: 12, outline: "none", width: 200 }}
        />
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          style={{ height: 34, padding: "0 10px", border: "1px solid #CDD2D9", borderRadius: 7, fontSize: 12, color: "#30353B", background: "white", outline: "none" }}
        >
          <option value="">所有单元</option>
          {unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          <span style={{ fontSize: 11, color: "#9FA6AF", alignSelf: "center" }}>排序：</span>
          {([["date", "按时间"], ["loop", "按回路"]] as const).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              style={{
                height: 34, padding: "0 10px", borderRadius: 7,
                border: sortBy === k ? "1px solid #004B8D" : "1px solid #CDD2D9",
                background: sortBy === k ? "#EEF5FB" : "white",
                color: sortBy === k ? "#004B8D" : "#515760", fontSize: 12, cursor: "pointer",
                fontWeight: sortBy === k ? 600 : 400,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#9FA6AF" }}>
          显示 {filtered.length} / {allFaults.length} 条
        </div>
      </div>

      {/* Fault list */}
      {filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #E0E4E9", padding: 48, textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>
          没有符合条件的故障记录
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((fault) => (
            <div
              key={fault.id}
              style={{
                background: "white",
                borderRadius: 12,
                border: "1px solid rgba(96,108,122,0.10)",
                boxShadow: "0 2px 8px rgba(27,39,52,0.05)",
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <FaultTypeBadge type={fault.faultType} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => navigate("loop-detail", { selectedLoopId: fault.loopId })}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                      <span className="font-mono-code" style={{ fontSize: 13, color: "#004B8D", fontWeight: 700 }}>
                        {fault.loopTag}
                      </span>
                    </button>
                    <span style={{ fontSize: 13, color: "#515760" }}>{fault.loopName}</span>
                    <span style={{ fontSize: 11, color: "#9FA6AF", background: "#F7F8FA", padding: "1px 7px", borderRadius: 4 }}>
                      {fault.unitCode} {fault.unitName}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#9FA6AF" }}>{fault.date}</div>
                  <div style={{ fontSize: 11, color: "#747A82", marginTop: 2 }}>记录人：{fault.operator}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#F9FAFB", borderRadius: 7, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#9FA6AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>故障描述</div>
                  <div style={{ fontSize: 12, color: "#30353B", lineHeight: 1.6 }}>{fault.description || "—"}</div>
                </div>
                <div style={{ background: "#F9FAFB", borderRadius: 7, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#9FA6AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>处理措施</div>
                  <div style={{ fontSize: 12, color: "#30353B", lineHeight: 1.6 }}>{fault.action || "—"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
