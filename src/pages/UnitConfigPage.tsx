import { useState, useMemo } from "react"
import { plant } from "../data/mockData"
import type { AppState } from "../types"

// ── fixed statuses (only startup / shutdown for now) ──────────────────────────
interface StatusDef {
  id: string
  name: string
  color: string
  dotColor: string
  description: string
}

const STATUSES: StatusDef[] = [
  {
    id: "startup",
    name: "开车",
    color: "#1A7A0A",
    dotColor: "#39C523",
    description: "装置正常生产运行，控制回路参与性能评价",
  },
  {
    id: "shutdown",
    name: "停车",
    color: "#92600A",
    dotColor: "#F2B544",
    description: "装置停工，控制回路暂停评价计入",
  },
]

// ── node types ─────────────────────────────────────────────────────────────────
type NodeType = "unit" | "section"

interface TreeNode {
  type: NodeType
  id: string
  label: string
  sub: string
}

// ── state: nodeKey → enabled status ids ───────────────────────────────────────
function nodeKey(type: NodeType, id: string) {
  return `${type}:${id}`
}

function initActiveMap(): Record<string, Set<string>> {
  const m: Record<string, Set<string>> = {}
  for (const unit of plant.units) {
    const uk = nodeKey("unit", unit.id)
    m[uk] = new Set(unit.status === "running" ? ["startup"] : ["shutdown"])
    for (const sec of unit.sections) {
      const sk = nodeKey("section", sec.id)
      m[sk] = new Set(unit.status === "running" ? ["startup"] : ["shutdown"])
    }
  }
  return m
}

// ── toggle switch component ────────────────────────────────────────────────────
function Toggle({ checked, onChange, color }: { checked: boolean; onChange: () => void; color: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
        background: checked ? color : "#CDD2D9",
        position: "relative", transition: "background 200ms", flexShrink: 0,
        padding: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        transition: "left 200ms",
      }} />
    </button>
  )
}

// ── chevron ────────────────────────────────────────────────────────────────────
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms", flexShrink: 0 }}>
      <path d="M4 3l4 3-4 3" stroke="#9FA6AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────
export default function UnitConfigPage({ navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const [activeMap, setActiveMap] = useState<Record<string, Set<string>>>(initActiveMap)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(plant.units.map((u) => u.id)))
  const [saveFlash, setSaveFlash] = useState(false)

  const toggleStatus = (key: string, statusId: string) => {
    setActiveMap((prev) => {
      const cur = new Set(prev[key] || [])
      cur.has(statusId) ? cur.delete(statusId) : cur.add(statusId)
      return { ...prev, [key]: cur }
    })
  }

  // resolve selected node label for the right panel header
  const selectedNode = useMemo((): TreeNode | null => {
    if (!selectedKey) return null
    for (const unit of plant.units) {
      if (nodeKey("unit", unit.id) === selectedKey)
        return { type: "unit", id: unit.id, label: unit.deviceCode, sub: unit.deviceName }
      for (const sec of unit.sections) {
        if (nodeKey("section", sec.id) === selectedKey)
          return { type: "section", id: sec.id, label: sec.name, sub: `${unit.deviceCode} · ${unit.deviceName}` }
      }
    }
    return null
  }, [selectedKey])

  const activeIds = selectedKey ? (activeMap[selectedKey] || new Set<string>()) : new Set<string>()

  const handleSave = () => {
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 2000)
  }

  // dot indicators for tree node
  const activeDots = (key: string) => {
    const ids = activeMap[key] || new Set<string>()
    return STATUSES.filter((s) => ids.has(s.id))
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>状态配置</h1>
          <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>
            为装置或单元节点启用/停用状态标签，多个状态可同时开启
          </p>
        </div>
        <button
          onClick={handleSave}
          style={{
            height: 38, padding: "0 20px",
            background: saveFlash ? "#39C523" : "#004B8D",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            transition: "background 300ms",
          }}
        >
          {saveFlash ? "✓ 已保存" : "保存配置"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        {/* ── Left: asset tree (single-select) ── */}
        <div style={{
          background: "white", borderRadius: 12,
          border: "1px solid rgba(96,108,122,0.12)",
          boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #F1F3F6" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9FA6AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              资产树
            </span>
          </div>

          {/* 基地 */}
          <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="4" width="12" height="9" rx="1.5" fill="#D9EAF7" stroke="#004B8D" strokeWidth="1.1" />
              <path d="M4 4V3a3 3 0 016 0v1" stroke="#004B8D" strokeWidth="1.1" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#004B8D" }}>{plant.shortName}</span>
            <span style={{ fontSize: 11, color: "#9FA6AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>
              {plant.name.replace(plant.shortName, "").trim()}
            </span>
          </div>

          <div style={{ paddingBottom: 8 }}>
            {plant.units.map((unit) => {
              const uk = nodeKey("unit", unit.id)
              const expanded = expandedUnits.has(unit.id)
              const unitSel = selectedKey === uk
              const dots = activeDots(uk)

              return (
                <div key={unit.id}>
                  {/* 装置 row */}
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                      cursor: "pointer",
                      background: unitSel ? "#EEF5FB" : "transparent",
                      borderLeft: unitSel ? "3px solid #004B8D" : "3px solid transparent",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) => { if (!unitSel) (e.currentTarget as HTMLElement).style.background = "#F7F8FA" }}
                    onMouseLeave={(e) => { if (!unitSel) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  >
                    {/* chevron to expand/collapse — stops propagation */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedUnits((prev) => { const n = new Set(prev); n.has(unit.id) ? n.delete(unit.id) : n.add(unit.id); return n })
                      }}
                      style={{ display: "flex", alignItems: "center", padding: 2, cursor: "pointer" }}
                    >
                      <ChevronIcon open={expanded} />
                    </div>

                    {/* click label area to select */}
                    <div
                      onClick={() => setSelectedKey(unitSel ? null : uk)}
                      style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: unitSel ? "#004B8D" : "#30353B" }}>
                          {unit.deviceCode}
                        </div>
                        <div style={{ fontSize: 11, color: "#9FA6AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {unit.deviceName}
                        </div>
                      </div>
                      {/* active status dots */}
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        {dots.map((s) => (
                          <span key={s.id} title={s.name} style={{ width: 8, height: 8, borderRadius: "50%", background: s.dotColor }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 单元 rows */}
                  {expanded && unit.sections.map((sec) => {
                    const sk = nodeKey("section", sec.id)
                    const secSel = selectedKey === sk
                    const secDots = activeDots(sk)
                    return (
                      <div
                        key={sec.id}
                        onClick={() => setSelectedKey(secSel ? null : sk)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "9px 14px 9px 32px",
                          cursor: "pointer",
                          background: secSel ? "#EEF5FB" : "transparent",
                          borderLeft: secSel ? "3px solid #004B8D" : "3px solid transparent",
                          transition: "background 100ms",
                        }}
                        onMouseEnter={(e) => { if (!secSel) (e.currentTarget as HTMLElement).style.background = "#F7F8FA" }}
                        onMouseLeave={(e) => { if (!secSel) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                          <rect x="1" y="1" width="11" height="11" rx="2" stroke={secSel ? "#004B8D" : "#CDD2D9"} strokeWidth="1.3" />
                          <line x1="3.5" y1="4.5" x2="9.5" y2="4.5" stroke={secSel ? "#004B8D" : "#9FA6AF"} strokeWidth="1.2" strokeLinecap="round" />
                          <line x1="3.5" y1="6.5" x2="7.5" y2="6.5" stroke={secSel ? "#004B8D" : "#9FA6AF"} strokeWidth="1.2" strokeLinecap="round" />
                          <line x1="3.5" y1="8.5" x2="8.5" y2="8.5" stroke={secSel ? "#004B8D" : "#9FA6AF"} strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: secSel ? 600 : 400, color: secSel ? "#004B8D" : "#515760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sec.name}
                          </div>
                          <div style={{ fontSize: 10, color: "#B0B6BF" }}>{sec.loops.length} 个回路</div>
                        </div>
                        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                          {secDots.map((s) => (
                            <span key={s.id} title={s.name} style={{ width: 7, height: 7, borderRadius: "50%", background: s.dotColor }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: status config panel ── */}
        {!selectedNode ? (
          <div style={{
            background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
            boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "64px 32px", textAlign: "center",
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F1F5FB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#9FA6AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#515760", marginBottom: 6 }}>请在左侧资产树中选择节点</div>
            <div style={{ fontSize: 13, color: "#9FA6AF" }}>点击装置或单元节点，配置其状态开关</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Node header */}
            <div style={{
              background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
              boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "16px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                  background: "#EEF5FB", color: "#004B8D", border: "1px solid #D9EAF7",
                }}>
                  {selectedNode.type === "unit" ? "装置" : "单元"}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#30353B" }}>{selectedNode.label}</span>
                <span style={{ fontSize: 13, color: "#9FA6AF" }}>{selectedNode.sub}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {STATUSES.filter((s) => activeIds.has(s.id)).map((s) => (
                    <span key={s.id} style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                      color: s.color,
                      background: s.id === "startup" ? "#EDFAE8" : "#FEF9EC",
                      border: `1px solid ${s.id === "startup" ? "#AEEAA2" : "#F7D98A"}`,
                    }}>
                      {s.name}
                    </span>
                  ))}
                  {activeIds.size === 0 && (
                    <span style={{ fontSize: 11, color: "#9FA6AF" }}>无启用状态</span>
                  )}
                </div>
              </div>
            </div>

            {/* Status cards */}
            <div style={{
              background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
              boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden",
            }}>
              {/* Panel header */}
              <div style={{ padding: "13px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>状态列表</span>
                {/* disabled add button */}
                <button
                  disabled
                  title="当前仅维护开车与停车两种状态"
                  style={{
                    height: 30, padding: "0 12px", background: "#F7F8FA",
                    color: "#CDD2D9", border: "1px solid #E0E4E9",
                    borderRadius: 7, fontSize: 12, cursor: "not-allowed",
                  }}
                >
                  + 新增状态
                </button>
              </div>

              {STATUSES.map((status, idx) => {
                const enabled = activeIds.has(status.id)
                const bgColor = status.id === "startup" ? "#EDFAE8" : "#FEF9EC"
                const borderColor = status.id === "startup" ? "#AEEAA2" : "#F7D98A"

                return (
                  <div
                    key={status.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 16, padding: "20px 20px",
                      borderBottom: idx < STATUSES.length - 1 ? "1px solid #F1F3F6" : "none",
                      background: enabled ? "#FDFEFF" : "white",
                      transition: "background 200ms",
                    }}
                  >
                    {/* Color dot */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: enabled ? bgColor : "#F7F8FA",
                      border: `1.5px solid ${enabled ? borderColor : "#E0E4E9"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 200ms",
                    }}>
                      <span style={{ width: 14, height: 14, borderRadius: "50%", background: enabled ? status.dotColor : "#CDD2D9", transition: "background 200ms" }} />
                    </div>

                    {/* Name + description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: enabled ? status.color : "#515760", transition: "color 200ms" }}>
                          {status.name}
                        </span>
                        {enabled && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                            color: status.color, background: bgColor, border: `1px solid ${borderColor}`,
                          }}>
                            已启用
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#9FA6AF" }}>{status.description}</div>
                    </div>

                    {/* Toggle */}
                    <Toggle
                      checked={enabled}
                      color={status.dotColor}
                      onChange={() => toggleStatus(selectedKey!, status.id)}
                    />
                  </div>
                )
              })}
            </div>

            {/* Legend / note */}
            <div style={{ padding: "12px 16px", background: "#F9FAFB", borderRadius: 10, border: "1px solid #E0E4E9" }}>
              <div style={{ fontSize: 11, color: "#9FA6AF", lineHeight: 1.7 }}>
                <strong style={{ color: "#747A82" }}>说明：</strong>
                多个状态可同时开启。开车状态启用时，该节点下的控制回路纳入性能评价；停车状态启用时，回路评价数据将标注停车标记。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
