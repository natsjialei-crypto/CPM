import { useMemo, useState } from "react"
import { allLoops, plant } from "../data/mockData"
import type { AppState, Loop } from "../types"
import { useOperationalState } from "../state/OperationalState"

type AssetKind = "plant" | "device" | "section"

interface AssetNode {
  id: string
  kind: AssetKind
  name: string
  subtitle: string
}

function loopById(id: string) {
  return allLoops.find((loop) => loop.id === id)
}

function performanceStyle(score: number) {
  if (score >= 80) return { color: "#1A7A0A", background: "#EDFAE8", border: "#AEEAA2" }
  if (score >= 60) return { color: "#92600A", background: "#FEF9EC", border: "#F7D98A" }
  return { color: "#A01515", background: "#FEF2F2", border: "#FECACA" }
}

function modeLabel(mode: string) {
  return mode === "auto" ? "自动" : mode === "manual" ? "手动" : "未用"
}

function modeStyle(mode: string) {
  if (mode === "auto") return { color: "#1A7A0A", background: "#EDFAE8", border: "#AEEAA2" }
  if (mode === "manual") return { color: "#92600A", background: "#FEF9EC", border: "#F7D98A" }
  return { color: "#747A82", background: "#F1F3F6", border: "#E0E4E9" }
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms", flexShrink: 0 }}
    >
      <path d="M4 3l4 3-4 3" stroke="#9FA6AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Checkbox({ checked, indeterminate = false }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        background: checked || indeterminate ? "#004B8D" : "#FFFFFF",
        border: `1.5px solid ${checked || indeterminate ? "#004B8D" : "#CDD2D9"}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {indeterminate && !checked ? (
        <span style={{ width: 8, height: 2, background: "#FFFFFF", borderRadius: 1 }} />
      ) : checked ? (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

function Toggle({ enabled, disabled, onChange }: { enabled: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "禁用该回路的性能评估" : "启用该回路的性能评估"}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 38,
        height: 21,
        padding: 2,
        border: "none",
        borderRadius: 12,
        background: enabled ? "#39C523" : "#B7BDC5",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.72 : 1,
        transition: "background 150ms",
      }}
    >
      <span
        style={{
          display: "block",
          width: 17,
          height: 17,
          borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(23,26,30,0.24)",
          transform: enabled ? "translateX(17px)" : "translateX(0)",
          transition: "transform 150ms",
        }}
      />
    </button>
  )
}

export default function UnitManagePage({ navigate: _navigate }: { navigate: (page: AppState["page"], extra?: Partial<AppState>) => void }) {
  const {
    assetLoops,
    setAssetLoops,
    manualEvaluationEnabled,
    setManualEvaluationEnabled,
    getBlockingUnits,
    isEvaluationEnabled,
  } = useOperationalState()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState(new Set(plant.units.map((unit) => unit.id)))
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState("")
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set())
  const [saveFlash, setSaveFlash] = useState(false)

  const selectedNode = useMemo<AssetNode | null>(() => {
    if (selectedNodeId === plant.id) {
      return { id: plant.id, kind: "plant", name: plant.shortName, subtitle: plant.name }
    }
    for (const unit of plant.units) {
      if (selectedNodeId === unit.id) {
        return { id: unit.id, kind: "device", name: unit.deviceCode, subtitle: unit.deviceName }
      }
      const section = unit.sections.find((item) => item.id === selectedNodeId)
      if (section) {
        return {
          id: section.id,
          kind: "section",
          name: section.name,
          subtitle: `${unit.deviceCode} ${unit.deviceName}`,
        }
      }
    }
    return null
  }, [selectedNodeId])

  const currentLoops = useMemo(() => {
    if (!selectedNodeId) return []
    return (assetLoops[selectedNodeId] || []).map(loopById).filter(Boolean) as Loop[]
  }, [assetLoops, selectedNodeId])

  const pickerLoops = useMemo(() => {
    const currentIds = new Set(assetLoops[selectedNodeId || ""] || [])
    const query = pickerSearch.trim().toLowerCase()
    return allLoops.filter((loop) => {
      if (currentIds.has(loop.id)) return false
      return !query || loop.tag.toLowerCase().includes(query) || loop.name.toLowerCase().includes(query)
    })
  }, [assetLoops, pickerSearch, selectedNodeId])

  const loopAssetLabels = useMemo(() => {
    const labels: Record<string, string[]> = {}
    const nodes: AssetNode[] = [
      { id: plant.id, kind: "plant", name: plant.shortName, subtitle: plant.name },
      ...plant.units.flatMap((unit) => [
        { id: unit.id, kind: "device" as const, name: unit.deviceCode, subtitle: unit.deviceName },
        ...unit.sections.map((section) => ({
          id: section.id,
          kind: "section" as const,
          name: section.name,
          subtitle: unit.deviceCode,
        })),
      ]),
    ]
    for (const node of nodes) {
      for (const loopId of assetLoops[node.id] || []) {
        labels[loopId] = [...(labels[loopId] || []), node.name]
      }
    }
    return labels
  }, [assetLoops])

  const enabledCount = currentLoops.filter((loop) => isEvaluationEnabled(loop.id)).length
  const allRowsSelected = currentLoops.length > 0 && currentLoops.every((loop) => selectedRows.has(loop.id))
  const someRowsSelected = currentLoops.some((loop) => selectedRows.has(loop.id))
  const allPickerSelected = pickerLoops.length > 0 && pickerLoops.every((loop) => pickerSelected.has(loop.id))
  const somePickerSelected = pickerLoops.some((loop) => pickerSelected.has(loop.id))

  const selectNode = (id: string) => {
    setSelectedNodeId(id)
    setSelectedRows(new Set())
    setPickerOpen(false)
    setPickerSelected(new Set())
  }

  const openPicker = () => {
    setPickerSearch("")
    setPickerSelected(new Set())
    setPickerOpen(true)
  }

  const closePicker = () => {
    setPickerOpen(false)
    setPickerSearch("")
    setPickerSelected(new Set())
  }

  const confirmAdd = () => {
    if (!selectedNodeId || pickerSelected.size === 0) return
    setAssetLoops((previous) => ({
      ...previous,
      [selectedNodeId]: Array.from(new Set([...(previous[selectedNodeId] || []), ...pickerSelected])),
    }))
    closePicker()
  }

  const removeSelected = () => {
    if (!selectedNodeId || selectedRows.size === 0) return
    setAssetLoops((previous) => ({
      ...previous,
      [selectedNodeId]: (previous[selectedNodeId] || []).filter((id) => !selectedRows.has(id)),
    }))
    setSelectedRows(new Set())
  }

  const save = () => {
    setSaveFlash(true)
    window.setTimeout(() => setSaveFlash(false), 2000)
  }

  const kindLabel = selectedNode?.kind === "plant" ? "厂区" : selectedNode?.kind === "device" ? "装置" : "单元"

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", marginBottom: 4 }}>单元管理</div>
          <div style={{ fontSize: 13, color: "#747A82" }}>按资产节点维护回路范围，并配置回路是否参与性能评估与报表</div>
        </div>
        <button
          type="button"
          onClick={save}
          style={{
            height: 38,
            padding: "0 20px",
            background: saveFlash ? "#39C523" : "#004B8D",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {saveFlash ? "已保存" : "保存配置"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "250px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #F1F3F6", fontSize: 11, fontWeight: 600, color: "#9FA6AF", letterSpacing: "0.1em" }}>
            资产树
          </div>
          <div
            onClick={() => selectNode(plant.id)}
            style={{
              padding: "11px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              background: selectedNodeId === plant.id ? "#EEF5FB" : "#FFFFFF",
              borderLeft: selectedNodeId === plant.id ? "3px solid #004B8D" : "3px solid transparent",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="4" width="12" height="9" rx="1.5" fill="#D9EAF7" stroke="#004B8D" strokeWidth="1.1" />
              <path d="M4 4V3a3 3 0 016 0v1" stroke="#004B8D" strokeWidth="1.1" />
            </svg>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#004B8D" }}>{plant.shortName}</span>
            <span style={{ fontSize: 10, color: "#747A82" }}>{(assetLoops[plant.id] || []).length}</span>
          </div>

          <div style={{ paddingBottom: 8 }}>
            {plant.units.map((unit) => {
              const expanded = expandedUnits.has(unit.id)
              const selected = selectedNodeId === unit.id
              return (
                <div key={unit.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 14px",
                      cursor: "pointer",
                      background: selected ? "#EEF5FB" : "transparent",
                      borderLeft: selected ? "3px solid #004B8D" : "3px solid transparent",
                    }}
                  >
                    <span
                      onClick={(event) => {
                        event.stopPropagation()
                        setExpandedUnits((previous) => {
                          const next = new Set(previous)
                          if (next.has(unit.id)) next.delete(unit.id)
                          else next.add(unit.id)
                          return next
                        })
                      }}
                      style={{ display: "flex", padding: 2 }}
                    >
                      <ChevronIcon open={expanded} />
                    </span>
                    <div onClick={() => selectNode(unit.id)} style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: selected ? "#004B8D" : "#30353B" }}>{unit.deviceCode}</div>
                      <div style={{ fontSize: 11, color: "#9FA6AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit.deviceName}</div>
                    </div>
                    <span style={{ fontSize: 10, color: "#747A82" }}>{(assetLoops[unit.id] || []).length}</span>
                  </div>

                  {expanded && unit.sections.map((section) => {
                    const isSelected = selectedNodeId === section.id
                    return (
                      <div
                        key={section.id}
                        onClick={() => selectNode(section.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "9px 14px 9px 34px",
                          cursor: "pointer",
                          background: isSelected ? "#EEF5FB" : "transparent",
                          borderLeft: isSelected ? "3px solid #004B8D" : "3px solid transparent",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <rect x="1" y="1" width="11" height="11" rx="2" stroke={isSelected ? "#004B8D" : "#CDD2D9"} strokeWidth="1.3" />
                          <path d="M3.5 4.5h6M3.5 6.5h4M3.5 8.5h5" stroke={isSelected ? "#004B8D" : "#9FA6AF"} strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? "#004B8D" : "#515760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {section.name}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 10, color: isSelected ? "#004B8D" : "#747A82", background: isSelected ? "#D9EAF7" : "#F1F3F6" }}>
                          {(assetLoops[section.id] || []).length}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {!selectedNode ? (
          <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", padding: "64px 32px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F1F5FB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#9FA6AF" strokeWidth="1.5" />
                <path d="M7 8h10M7 12h7M7 16h8" stroke="#9FA6AF" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#515760", marginBottom: 6 }}>请选择一个资产节点</div>
            <div style={{ fontSize: 13, color: "#9FA6AF" }}>厂区、装置和单元节点均可维护回路范围</div>
          </div>
        ) : (
          <div style={{ position: "relative", minWidth: 0 }}>
            <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(96,108,122,0.12)", boxShadow: "0 4px 16px rgba(27,39,52,0.07)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "#EEF5FB", color: "#004B8D", border: "1px solid #D9EAF7" }}>{kindLabel}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#30353B" }}>{selectedNode.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9FA6AF" }}>
                    {selectedNode.subtitle} · 维护 {currentLoops.length} 个回路 · <span style={{ color: "#1A7A0A" }}>{enabledCount} 个参与评估</span>
                  </div>
                </div>
                <button type="button" onClick={openPicker} style={{ height: 36, padding: "0 16px", display: "flex", alignItems: "center", gap: 6, background: "#004B8D", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  批量添加回路
                </button>
              </div>

              {currentLoops.length === 0 ? (
                <div style={{ padding: "56px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#9FA6AF", marginBottom: 12 }}>该节点暂无维护回路</div>
                  <button type="button" onClick={openPicker} style={{ height: 34, padding: "0 16px", background: "#EEF5FB", color: "#004B8D", border: "1px solid #D9EAF7", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    批量添加回路
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ minHeight: 48, padding: "8px 20px", display: "flex", alignItems: "center", gap: 12, background: selectedRows.size > 0 ? "#EEF5FB" : "#F9FAFB", borderBottom: "1px solid #E0E4E9" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedRows(allRowsSelected ? new Set() : new Set(currentLoops.map((loop) => loop.id)))}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: 0, background: "none", border: "none", color: "#515760", fontSize: 12, cursor: "pointer" }}
                    >
                      <Checkbox checked={allRowsSelected} indeterminate={someRowsSelected && !allRowsSelected} />
                      {allRowsSelected ? "取消全选" : "全选"}
                    </button>
                    <span style={{ fontSize: 12, color: selectedRows.size > 0 ? "#004B8D" : "#9FA6AF" }}>
                      {selectedRows.size > 0 ? `已选择 ${selectedRows.size} 个回路` : "勾选回路后可批量删除"}
                    </span>
                    <button
                      type="button"
                      disabled={selectedRows.size === 0}
                      onClick={removeSelected}
                      style={{
                        marginLeft: "auto",
                        height: 30,
                        padding: "0 12px",
                        color: selectedRows.size > 0 ? "#D93838" : "#9FA6AF",
                        background: selectedRows.size > 0 ? "#FEF2F2" : "#F1F3F6",
                        border: `1px solid ${selectedRows.size > 0 ? "#FECACA" : "#E0E4E9"}`,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: selectedRows.size > 0 ? "pointer" : "not-allowed",
                      }}
                    >
                      批量删除{selectedRows.size > 0 ? `（${selectedRows.size}）` : ""}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "28px 142px minmax(150px, 1fr) 76px 76px 118px 64px", padding: "9px 20px", background: "#F9FAFB", borderBottom: "1px solid #F1F3F6", fontSize: 11, fontWeight: 600, color: "#9FA6AF", gap: 10 }}>
                    <span />
                    <span>位号</span>
                    <span>名称</span>
                    <span style={{ textAlign: "center" }}>运行模式</span>
                    <span style={{ textAlign: "center" }}>性能得分</span>
                    <span style={{ textAlign: "center" }}>参与性能评估</span>
                    <span style={{ textAlign: "center" }}>模型</span>
                  </div>

                  {currentLoops.map((loop, index) => {
                    const selected = selectedRows.has(loop.id)
                    const scoreStyle = performanceStyle(loop.performanceScore)
                    const currentModeStyle = modeStyle(loop.mode)
                    const enabled = isEvaluationEnabled(loop.id)
                    const manuallyEnabled = manualEvaluationEnabled[loop.id] ?? true
                    const blockingUnits = getBlockingUnits(loop.id)
                    const interlocked = blockingUnits.length > 0
                    return (
                      <div key={loop.id} style={{ display: "grid", gridTemplateColumns: "28px 142px minmax(150px, 1fr) 76px 76px 118px 64px", padding: "12px 20px", gap: 10, alignItems: "center", background: selected ? "#F5F9FE" : "#FFFFFF", borderBottom: index < currentLoops.length - 1 ? "1px solid #F1F3F6" : "none" }}>
                        <button
                          type="button"
                          aria-label={`选择 ${loop.tag}`}
                          onClick={() => setSelectedRows((previous) => {
                            const next = new Set(previous)
                            if (next.has(loop.id)) next.delete(loop.id)
                            else next.add(loop.id)
                            return next
                          })}
                          style={{ display: "flex", padding: 0, border: "none", background: "none", cursor: "pointer" }}
                        >
                          <Checkbox checked={selected} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{loop.tag}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: enabled ? "#515760" : "#9FA6AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loop.name}</div>
                          {interlocked && (
                            <div style={{ marginTop: 2, fontSize: 10, color: "#D93838", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {blockingUnits.map((unit) => unit.deviceCode).join("、")} 停车，已联锁暂停评价
                            </div>
                          )}
                        </div>
                        <span style={{ justifySelf: "center", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, ...currentModeStyle }}>{modeLabel(loop.mode)}</span>
                        <span style={{ justifySelf: "center", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 5, ...scoreStyle }}>{loop.performanceScore}</span>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                          <Toggle
                            enabled={enabled}
                            disabled={interlocked}
                            onChange={() => setManualEvaluationEnabled((previous) => ({ ...previous, [loop.id]: !manuallyEnabled }))}
                          />
                          <span style={{ width: 24, fontSize: 11, color: enabled ? "#1A7A0A" : interlocked ? "#D93838" : "#747A82" }}>
                            {enabled ? "启用" : interlocked ? "暂停" : "禁用"}
                          </span>
                        </div>
                        <span style={{ justifySelf: "center", fontSize: 10, color: "#747A82", background: "#F1F3F6", border: "1px solid #E0E4E9", padding: "2px 6px", borderRadius: 4 }}>
                          {loop.modelType === "first-order" ? "一阶" : "二阶"}
                        </span>
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {pickerOpen && (
              <>
                <div onClick={closePicker} style={{ position: "fixed", inset: 0, background: "rgba(27,39,52,0.25)", zIndex: 40, backdropFilter: "blur(1px)" }} />
                <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, background: "#FFFFFF", boxShadow: "-8px 0 32px rgba(27,39,52,0.18)", zIndex: 50, display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F1F3F6" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#30353B" }}>从全量回路中选择</div>
                        <div style={{ fontSize: 12, color: "#9FA6AF", marginTop: 2 }}>添加到：{selectedNode.name}（{kindLabel}）</div>
                      </div>
                      <button type="button" aria-label="关闭" onClick={closePicker} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9FA6AF", padding: 4, display: "flex" }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", height: 36, background: "#F7F8FA", borderRadius: 8, border: "1px solid #E0E4E9" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="6" cy="6" r="4.5" stroke="#9FA6AF" strokeWidth="1.3" />
                        <path d="M9.5 9.5L13 13" stroke="#9FA6AF" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      <input autoFocus value={pickerSearch} onChange={(event) => setPickerSearch(event.target.value)} placeholder="搜索位号或名称" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#30353B" }} />
                      {pickerSearch && <button type="button" aria-label="清空搜索" onClick={() => setPickerSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9FA6AF", padding: 0 }}>清除</button>}
                    </div>
                  </div>

                  {pickerLoops.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPickerSelected(allPickerSelected ? new Set() : new Set(pickerLoops.map((loop) => loop.id)))}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", border: "none", borderBottom: "1px solid #F1F3F6", cursor: "pointer", background: "#FAFBFC", textAlign: "left" }}
                    >
                      <Checkbox checked={allPickerSelected} indeterminate={somePickerSelected && !allPickerSelected} />
                      <span style={{ fontSize: 12, color: "#747A82" }}>全选当前结果（{pickerLoops.length}）</span>
                      {pickerSelected.size > 0 && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#004B8D", background: "#EEF5FB", padding: "2px 8px", borderRadius: 10, border: "1px solid #D9EAF7" }}>已选 {pickerSelected.size}</span>}
                    </button>
                  )}

                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {pickerLoops.length === 0 ? (
                      <div style={{ padding: "48px 24px", textAlign: "center", color: "#9FA6AF", fontSize: 13 }}>{pickerSearch ? "未找到匹配回路" : "全量回路均已添加到当前节点"}</div>
                    ) : pickerLoops.map((loop, index) => {
                      const checked = pickerSelected.has(loop.id)
                      const labels = (loopAssetLabels[loop.id] || []).filter((label) => label !== selectedNode.name)
                      return (
                        <button
                          type="button"
                          key={loop.id}
                          onClick={() => setPickerSelected((previous) => {
                            const next = new Set(previous)
                            if (next.has(loop.id)) next.delete(loop.id)
                            else next.add(loop.id)
                            return next
                          })}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", border: "none", borderBottom: index < pickerLoops.length - 1 ? "1px solid #F1F3F6" : "none", cursor: "pointer", background: checked ? "#F5F9FE" : "#FFFFFF", textAlign: "left" }}
                        >
                          <Checkbox checked={checked} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#004B8D", fontFamily: "monospace" }}>{loop.tag}</span>
                              <span style={{ fontSize: 11, color: "#747A82", background: "#F1F3F6", borderRadius: 4, padding: "1px 6px" }}>{loop.processType}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#515760" }}>{loop.name}</div>
                            {labels.length > 0 && <div style={{ fontSize: 11, color: "#9FA6AF", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>已维护于：{labels.slice(0, 3).join("、")}{labels.length > 3 ? ` 等 ${labels.length} 个节点` : ""}</div>}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ padding: "14px 20px", borderTop: "1px solid #F1F3F6", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#9FA6AF", flex: 1 }}>{pickerSelected.size > 0 ? `已选 ${pickerSelected.size} 个回路` : "勾选回路后确认添加"}</span>
                    <button type="button" onClick={closePicker} style={{ height: 36, padding: "0 16px", background: "#FFFFFF", border: "1px solid #CDD2D9", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#515760" }}>取消</button>
                    <button
                      type="button"
                      onClick={confirmAdd}
                      disabled={pickerSelected.size === 0}
                      style={{ height: 36, padding: "0 20px", background: pickerSelected.size > 0 ? "#004B8D" : "#E0E4E9", color: pickerSelected.size > 0 ? "#FFFFFF" : "#9FA6AF", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: pickerSelected.size > 0 ? "pointer" : "not-allowed" }}
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
