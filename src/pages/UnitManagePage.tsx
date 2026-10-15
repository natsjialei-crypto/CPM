import { useState, useMemo } from "react"
import { plant, allLoops } from "../data/mockData"
import type { AppState, Loop } from "../types"

// ── local state: sectionId → loopIds ──────────────────────────────────────────
function initSectionLoops(): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const unit of plant.units) {
    for (const sec of unit.sections) {
      map[sec.id] = sec.loops.map((l) => l.id)
    }
  }
  return map
}

function loopById(id: string): Loop | undefined {
  return allLoops.find((l) => l.id === id)
}

function perfColor(score: number) {
  if (score >= 80) return { color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" }
  if (score >= 60) return { color: "#92600A", bg: "#FEF9EC", border: "#F7D98A" }
  return { color: "#A01515", bg: "#FEF2F2", border: "#FECACA" }
}

function modeLabel(mode: string) {
  return mode === "auto" ? "自动" : mode === "manual" ? "手动" : "未用"
}

function modeStyle(mode: string) {
  if (mode === "auto") return { color: "#1A7A0A", bg: "#EDFAE8", border: "#AEEAA2" }
  if (mode === "manual") return { color: "#92600A", bg: "#FEF9EC", border: "#F7D98A" }
  return { color: "#747A82", bg: "#F1F3F6", border: "#E0E4E9" }
}

// ── small components ───────────────────────────────────────────────────────────
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms", flexShrink: 0 }}>
      <path d="M4 3l4 3-4 3" stroke="#9FA6AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Checkbox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
      background: checked || indeterminate ? "#004B8D" : "white",
      border: `1.5px solid ${checked || indeterminate ? "#004B8D" : "#CDD2D9"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 120ms",
    }}>
      {indeterminate && !checked
        ? <div style={{ width: 8, height: 2, background: "white", borderRadius: 1 }} />
        : checked
          ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : null}
    </div>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────
export default function UnitManagePage({ navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const [sectionLoops, setSectionLoops] = useState<Record<string, string[]>>(initSectionLoops)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(plant.units.map((u) => u.id)))

  // picker drawer state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState("")
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set())

  const [saveFlash, setSaveFlash] = useState(false)

  // resolve selected section + parent unit
  const selectedSection = useMemo(() => {
    for (const unit of plant.units) {
      const section = unit.sections.find((s) => s.id === selectedSectionId)
      if (section) return { unit, section }
    }
    return null
  }, [selectedSectionId])

  // current loops in selected section
  const currentLoops = useMemo(() => {
    if (!selectedSectionId) return []
    return (sectionLoops[selectedSectionId] || []).map(loopById).filter(Boolean) as Loop[]
  }, [selectedSectionId, sectionLoops])

  // where does each loop live currently (for picker badge)
  const loopSectionLabel = useMemo(() => {
    const m: Record<string, string> = {}
    for (const unit of plant.units) {
      for (const sec of unit.sections) {
        for (const id of sectionLoops[sec.id] || []) {
          m[id] = `${unit.deviceCode} · ${sec.name}`
        }
      }
    }
    return m
  }, [sectionLoops])

  // picker candidates: not in current section, filtered by search
  const pickerLoops = useMemo(() => {
    const inCurrent = new Set(sectionLoops[selectedSectionId || ""] || [])
    const q = pickerSearch.toLowerCase()
    return allLoops.filter((l) => {
      if (inCurrent.has(l.id)) return false
      if (!q) return true
      return l.tag.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
    })
  }, [selectedSectionId, sectionLoops, pickerSearch])

  const allChecked = pickerLoops.length > 0 && pickerLoops.every((l) => pickerSelected.has(l.id))
  const someChecked = pickerLoops.some((l) => pickerSelected.has(l.id))

  const openPicker = () => {
    setPickerSearch("")
    setPickerSelected(new Set())
    setPickerOpen(true)
  }

  const closePicker = () => {
    setPickerOpen(false)
    setPickerSelected(new Set())
    setPickerSearch("")
  }

  const confirmAdd = () => {
    if (!selectedSectionId || pickerSelected.size === 0) return
    setSectionLoops((prev) => ({
      ...prev,
      [selectedSectionId]: [...(prev[selectedSectionId] || []), ...Array.from(pickerSelected)],
    }))
    closePicker()
  }

  const handleRemove = (loopId: string) => {
    if (!selectedSectionId) return
    setSectionLoops((prev) => ({
      ...prev,
      [selectedSectionId]: (prev[selectedSectionId] || []).filter((id) => id !== loopId),
    }))
  }

  const handleSelectSection = (sid: string) => {
    setSelectedSectionId(sid)
    setPickerOpen(false)
    setPickerSelected(new Set())
  }

  const handleSave = () => {
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 2000)
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", margin: "0 0 4px" }}>单元管理</h1>
          <p style={{ fontSize: 13, color: "#747A82", margin: 0 }}>
            选择左侧单元节点，查看并配置其控制回路
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

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "start" }}>
        {/* ── Asset tree ── */}
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
            <span style={{ fontSize: 11, color: "#9FA6AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {plant.name.replace(plant.shortName, "").trim()}
            </span>
          </div>

          <div style={{ paddingBottom: 8 }}>
            {plant.units.map((unit) => {
              const expanded = expandedUnits.has(unit.id)
              return (
                <div key={unit.id}>
                  {/* 装置 */}
                  <div
                    onClick={() => setExpandedUnits((prev) => {
                      const n = new Set(prev); n.has(unit.id) ? n.delete(unit.id) : n.add(unit.id); return n
                    })}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", cursor: "pointer", userSelect: "none" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F7F8FA" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  >
                    <ChevronIcon open={expanded} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#30353B" }}>{unit.deviceCode}</div>
                      <div style={{ fontSize: 11, color: "#9FA6AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {unit.deviceName}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: "#9FA6AF", flexShrink: 0 }}>{unit.sections.length} 单元</span>
                  </div>

                  {/* 单元 */}
                  {expanded && unit.sections.map((sec) => {
                    const isSel = selectedSectionId === sec.id
                    const count = (sectionLoops[sec.id] || []).length
                    return (
                      <div
                        key={sec.id}
                        onClick={() => handleSelectSection(sec.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "9px 14px 9px 32px",
                          cursor: "pointer",
                          background: isSel ? "#EEF5FB" : "transparent",
                          borderLeft: isSel ? "3px solid #004B8D" : "3px solid transparent",
                          transition: "background 100ms",
                        }}
                        onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "#F7F8FA" }}
                        onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                          <rect x="1" y="1" width="11" height="11" rx="2" stroke={isSel ? "#004B8D" : "#CDD2D9"} strokeWidth="1.3" />
                          <line x1="3.5" y1="4.5" x2="9.5" y2="4.5" stroke={isSel ? "#004B8D" : "#9FA6AF"} strokeWidth="1.2" strokeLinecap="round" />
                          <line x1="3.5" y1="6.5" x2="7.5" y2="6.5" stroke={isSel ? "#004B8D" : "#9FA6AF"} strokeWidth="1.2" strokeLinecap="round" />
                          <line x1="3.5" y1="8.5" x2="8.5" y2="8.5" stroke={isSel ? "#004B8D" : "#9FA6AF"} strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: isSel ? 600 : 400, color: isSel ? "#004B8D" : "#515760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sec.name}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 10,
                          background: isSel ? "#D9EAF7" : "#F1F3F6",
                          color: isSel ? "#004B8D" : "#747A82", flexShrink: 0,
                        }}>
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: section panel ── */}
        {!selectedSection ? (
          <div style={{
            background: "white", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)",
            boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "64px 32px", textAlign: "center",
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F1F5FB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#9FA6AF" strokeWidth="1.5" />
                <line x1="7" y1="8" x2="17" y2="8" stroke="#9FA6AF" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="7" y1="12" x2="14" y2="12" stroke="#9FA6AF" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="7" y1="16" x2="15" y2="16" stroke="#9FA6AF" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#515760", marginBottom: 6 }}>请在左侧选择一个单元</div>
            <div style={{ fontSize: 13, color: "#9FA6AF" }}>选中单元后，可查看和配置其包含的控制回路</div>
          </div>
        ) : (
          /* wrapper: relative for drawer overlay */
          <div style={{ position: "relative" }}>
            <div style={{
              background: "white", borderRadius: 12,
              border: "1px solid rgba(96,108,122,0.12)",
              boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden",
            }}>
              {/* Section header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "#EEF5FB", color: "#004B8D", border: "1px solid #D9EAF7" }}>
                      单元
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#30353B" }}>
                      {selectedSection.section.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9FA6AF" }}>
                    所属装置：{selectedSection.unit.deviceCode} {selectedSection.unit.deviceName}
                    &nbsp;·&nbsp;当前配置 <strong style={{ color: "#30353B" }}>{currentLoops.length}</strong> 个控制回路
                  </div>
                </div>
                <button
                  onClick={openPicker}
                  style={{
                    height: 36, padding: "0 16px", display: "flex", alignItems: "center", gap: 6,
                    background: "#004B8D", color: "white", border: "none", borderRadius: 8,
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <line x1="7" y1="2" x2="7" y2="12" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="2" y1="7" x2="12" y2="7" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  新增回路
                </button>
              </div>

              {/* Loop table */}
              {currentLoops.length === 0 ? (
                <div style={{ padding: "56px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#9FA6AF", marginBottom: 12 }}>该单元暂无已配置回路</div>
                  <button
                    onClick={openPicker}
                    style={{
                      height: 34, padding: "0 16px", background: "#EEF5FB",
                      color: "#004B8D", border: "1px solid #D9EAF7",
                      borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    + 新增回路
                  </button>
                </div>
              ) : (
                <>
                  {/* Table head */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "160px 1fr 80px 80px 72px 72px",
                    padding: "9px 20px", background: "#F9FAFB", borderBottom: "1px solid #F1F3F6",
                    fontSize: 11, fontWeight: 600, color: "#9FA6AF", gap: 12,
                  }}>
                    <span>位号</span>
                    <span>名称</span>
                    <span style={{ textAlign: "center" }}>运行模式</span>
                    <span style={{ textAlign: "center" }}>性能得分</span>
                    <span style={{ textAlign: "center" }}>模型类型</span>
                    <span />
                  </div>

                  {currentLoops.map((loop, idx) => {
                    const pc = perfColor(loop.performanceScore)
                    const ms = modeStyle(loop.mode)
                    return (
                      <div
                        key={loop.id}
                        style={{
                          display: "grid", gridTemplateColumns: "160px 1fr 80px 80px 72px 72px",
                          padding: "12px 20px", gap: 12, alignItems: "center",
                          borderBottom: idx < currentLoops.length - 1 ? "1px solid #F1F3F6" : "none",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>
                          {loop.tag}
                        </span>
                        <span style={{ fontSize: 12, color: "#515760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {loop.name}
                        </span>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, color: ms.color, background: ms.bg, border: `1px solid ${ms.border}` }}>
                            {modeLabel(loop.mode)}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 5, color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }}>
                            {loop.performanceScore}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, color: "#747A82", background: "#F1F3F6", border: "1px solid #E0E4E9", padding: "2px 6px", borderRadius: 4 }}>
                            {loop.modelType === "first-order" ? "一阶" : "二阶"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleRemove(loop.id)}
                            style={{
                              padding: "4px 10px", fontSize: 11, color: "#D93838",
                              background: "#FEF2F2", border: "1px solid #FECACA",
                              borderRadius: 6, cursor: "pointer",
                            }}
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {/* ── Picker drawer (slides in from right) ── */}
            {pickerOpen && (
              <>
                {/* backdrop */}
                <div
                  onClick={closePicker}
                  style={{
                    position: "fixed", inset: 0, background: "rgba(27,39,52,0.25)",
                    zIndex: 40, backdropFilter: "blur(1px)",
                  }}
                />
                {/* drawer */}
                <div style={{
                  position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
                  background: "white", boxShadow: "-8px 0 32px rgba(27,39,52,0.18)",
                  zIndex: 50, display: "flex", flexDirection: "column",
                }}>
                  {/* Drawer header */}
                  <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F1F3F6" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#30353B" }}>浏览回路</div>
                        <div style={{ fontSize: 12, color: "#9FA6AF", marginTop: 2 }}>
                          添加到：{selectedSection.section.name}
                        </div>
                      </div>
                      <button
                        onClick={closePicker}
                        style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9FA6AF", padding: 4, display: "flex", alignItems: "center" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    {/* Search */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", height: 36, background: "#F7F8FA", borderRadius: 8, border: "1px solid #E0E4E9" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="6" cy="6" r="4.5" stroke="#9FA6AF" strokeWidth="1.3" />
                        <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#9FA6AF" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      <input
                        autoFocus
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder="搜索位号或名称…"
                        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#30353B" }}
                      />
                      {pickerSearch && (
                        <button onClick={() => setPickerSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9FA6AF", padding: 0, lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  </div>

                  {/* Select-all row */}
                  {pickerLoops.length > 0 && (
                    <div
                      onClick={() => {
                        if (allChecked) setPickerSelected(new Set())
                        else setPickerSelected(new Set(pickerLoops.map((l) => l.id)))
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
                        borderBottom: "1px solid #F1F3F6", cursor: "pointer", background: "#FAFBFC",
                        userSelect: "none",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F1F3F6" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FAFBFC" }}
                    >
                      <Checkbox checked={allChecked} indeterminate={someChecked && !allChecked} />
                      <span style={{ fontSize: 12, color: "#747A82" }}>全选（{pickerLoops.length} 个可添加）</span>
                      {pickerSelected.size > 0 && (
                        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#004B8D", background: "#EEF5FB", padding: "2px 8px", borderRadius: 10, border: "1px solid #D9EAF7" }}>
                          已选 {pickerSelected.size}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Loop list */}
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {pickerLoops.length === 0 ? (
                      <div style={{ padding: "48px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>
                        {pickerSearch ? "未找到匹配回路" : "所有回路已配置到本单元"}
                      </div>
                    ) : (
                      pickerLoops.map((loop, idx) => {
                        const checked = pickerSelected.has(loop.id)
                        const pc = perfColor(loop.performanceScore)
                        const ms = modeStyle(loop.mode)
                        const secLabel = loopSectionLabel[loop.id]
                        return (
                          <div
                            key={loop.id}
                            onClick={() => {
                              setPickerSelected((prev) => {
                                const n = new Set(prev); n.has(loop.id) ? n.delete(loop.id) : n.add(loop.id); return n
                              })
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                              borderBottom: idx < pickerLoops.length - 1 ? "1px solid #F1F3F6" : "none",
                              cursor: "pointer",
                              background: checked ? "#F5F9FE" : "transparent",
                              transition: "background 100ms",
                            }}
                            onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "#F7F8FA" }}
                            onMouseLeave={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                          >
                            <Checkbox checked={checked} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>
                                  {loop.tag}
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4, color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }}>
                                  {loop.performanceScore}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4, color: ms.color, background: ms.bg, border: `1px solid ${ms.border}` }}>
                                  {modeLabel(loop.mode)}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: "#515760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {loop.name}
                              </div>
                              {secLabel && (
                                <div style={{ fontSize: 11, color: "#B0B6BF", marginTop: 2 }}>
                                  当前：{secLabel}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Drawer footer */}
                  <div style={{ padding: "14px 20px", borderTop: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#9FA6AF", flex: 1 }}>
                      {pickerSelected.size > 0 ? `已选 ${pickerSelected.size} 个回路` : "勾选回路后点击确认添加"}
                    </span>
                    <button
                      onClick={closePicker}
                      style={{ height: 36, padding: "0 16px", background: "white", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#515760" }}
                    >
                      取消
                    </button>
                    <button
                      onClick={confirmAdd}
                      disabled={pickerSelected.size === 0}
                      style={{
                        height: 36, padding: "0 20px",
                        background: pickerSelected.size > 0 ? "#004B8D" : "#E0E4E9",
                        color: pickerSelected.size > 0 ? "white" : "#9FA6AF",
                        border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: pickerSelected.size > 0 ? "pointer" : "not-allowed",
                        transition: "background 150ms",
                      }}
                    >
                      确认添加{pickerSelected.size > 0 ? `（${pickerSelected.size}）` : ""}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
