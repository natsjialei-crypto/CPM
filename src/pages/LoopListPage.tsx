import { useState, useMemo } from "react"
import { plant, allLoops } from "../data/mockData"
import type { AppState, Loop, PerfLevel } from "../types"
import { useOperationalState } from "../state/OperationalState"

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

function ServiceBadge({ status }: { status: string }) {
  const inService = status === "in-service"
  return (
    <span
      style={{
        background: inService ? "#EFF9EC" : "#F1F3F6",
        color: inService ? "#237D17" : "#626972",
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 4,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: inService ? "#39C523" : "#9FA1A4" }} />
      {inService ? "In Service" : "Out of Service"}
    </span>
  )
}

function ModelBadge({ type }: { type: string }) {
  return (
    <span
      style={{
        background: type === "first-order" ? "#EEF5FB" : "#F3F0FF",
        color: type === "first-order" ? "#004B8D" : "#5B21B6",
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 7px",
        borderRadius: 4,
      }}
    >
      {type === "first-order" ? "一阶" : "二阶"}
    </span>
  )
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 36,
        padding: "0 32px 0 10px",
        border: "1px solid #CDD2D9",
        borderRadius: 8,
        fontSize: 13,
        color: "#30353B",
        background: "white",
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23747A82' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "calc(100% - 10px) center",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

type SortKey = "tag"
type SortDir = "asc" | "desc"

export default function LoopListPage({
  navigate,
  filterUnitId,
}: {
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
  filterUnitId?: string
}) {
  const { units, isEvaluationEnabled } = useOperationalState()
  const [unitFilter, setUnitFilter] = useState(filterUnitId || "")
  const [modelFilter, setModelFilter] = useState("")
  const [serviceFilter, setServiceFilter] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("tag")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [search, setSearch] = useState("")

  const loopTypeMap: Record<string, string> = {
    single: "单回路",
    cascade: "串级",
    split: "分程",
    override: "超驰",
    feedforward: "前馈",
  }

  const unitOptions = plant.units.map((u) => ({ value: u.id, label: `${u.deviceCode} ${u.deviceName}` }))
  const modelOptions = [
    { value: "first-order", label: "一阶模型" },
    { value: "second-order", label: "二阶模型" },
  ]
  const serviceOptions = [
    { value: "in-service", label: "In Service（启用）" },
    { value: "out-of-service", label: "Out of Service（禁用）" },
  ]
  const filtered = useMemo(() => {
    let list = [...allLoops]
    if (unitFilter) list = list.filter((l) => l.unitId === unitFilter)
    if (modelFilter) list = list.filter((l) => l.modelType === modelFilter)
    if (serviceFilter) {
      list = list.filter((loop) =>
        serviceFilter === "in-service" ? isEvaluationEnabled(loop.id) : !isEvaluationEnabled(loop.id),
      )
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((l) => l.tag.toLowerCase().includes(q) || l.name.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      return mul * a.tag.localeCompare(b.tag)
    })
    return list
  }, [unitFilter, modelFilter, serviceFilter, search, sortKey, sortDir, isEvaluationEnabled])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span style={{ marginLeft: 3, opacity: sortKey === k ? 1 : 0.3 }}>
      {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  )

  const hasFilters = unitFilter || modelFilter || serviceFilter || search

  return (
    <div style={{ padding: "24px" }}>
      <div className="mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: 0 }}>回路台账</h1>
          <p style={{ fontSize: 13, color: "#747A82", margin: "4px 0 0" }}>
            全厂控制回路列表，共 {allLoops.length} 条记录
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid #E0E4E9", padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="搜索位号或名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ height: 36, padding: "0 12px", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 13, color: "#30353B", outline: "none", width: 180 }}
        />
        <Select value={unitFilter} onChange={setUnitFilter} options={unitOptions} placeholder="所有单元" />
        <Select value={modelFilter} onChange={setModelFilter} options={modelOptions} placeholder="模型类型" />
        <Select value={serviceFilter} onChange={setServiceFilter} options={serviceOptions} placeholder="启用状态" />
        {hasFilters && (
          <button
            onClick={() => { setUnitFilter(""); setModelFilter(""); setServiceFilter(""); setSearch("") }}
            style={{ height: 36, padding: "0 12px", background: "none", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 12, color: "#747A82", cursor: "pointer" }}
          >
            清除筛选
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#9FA6AF" }}>
          显示 {filtered.length} / {allLoops.length} 条
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 8px 24px rgba(27,39,52,0.07)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F7F8FA" }}>
              {[
                { label: "位号", key: "tag" as SortKey, sortable: true },
                { label: "回路名称", key: null, sortable: false },
                { label: "单元", key: null, sortable: false },
                { label: "回路类型", key: null, sortable: false },
                { label: "模型类型", key: null, sortable: false },
                { label: "启/禁用", key: null, sortable: false },
                { label: "操作", key: null, sortable: false },
              ].map((h) => (
                <th
                  key={h.label}
                  onClick={() => h.sortable && h.key && handleSort(h.key)}
                  style={{
                    padding: "11px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#747A82",
                    textAlign: "left",
                    borderBottom: "1px solid #E0E4E9",
                    letterSpacing: "0.04em",
                    cursor: h.sortable ? "pointer" : "default",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h.label}
                  {h.sortable && h.key && <SortIcon k={h.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#9FA6AF", fontSize: 13 }}>
                  没有符合条件的回路
                </td>
              </tr>
            ) : (
              filtered.map((loop: Loop, idx) => {
                const unit = units.find((u) => u.id === loop.unitId)
                const isShutdown = unit?.status === "shutdown"
                return (
                  <tr
                    key={loop.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #F1F3F6" : "none", background: isShutdown ? "#FAFBFC" : "white" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isShutdown ? "#FAFBFC" : "white" }}
                  >
                    <td style={{ padding: "11px 14px" }}>
                      <span className="font-mono-code" style={{ fontSize: 12, color: "#004B8D", fontWeight: 600 }}>
                        {loop.tag}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "#30353B" }}>{loop.name}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontSize: 11 }}>
                        <span className="font-mono-code" style={{ color: "#515760" }}>{unit?.deviceCode}</span>
                        <span style={{ marginLeft: 4, color: "#9FA6AF" }}>{unit?.deviceName}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#515760" }}>
                      {loopTypeMap[loop.loopType]}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <ModelBadge type={loop.modelType} />
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <ServiceBadge status={isEvaluationEnabled(loop.id) ? "in-service" : "out-of-service"} />
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <button
                        onClick={() => navigate("loop-detail", { selectedLoopId: loop.id })}
                        style={{
                          fontSize: 12, color: "#004B8D", background: "#EEF5FB",
                          border: "1px solid #D9EAF7", borderRadius: 6,
                          padding: "4px 10px", cursor: "pointer", fontWeight: 500,
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
