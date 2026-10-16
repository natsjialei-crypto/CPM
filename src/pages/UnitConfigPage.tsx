import { useState } from "react"
import type { AppState } from "../types"

interface StatusDefinition {
  id: string
  code: string
  name: string
  color: string
  surface: string
  border: string
  description: string
  evaluationRule: string
}

const INITIAL_STATUSES: StatusDefinition[] = [
  {
    id: "startup",
    code: "RUNNING",
    name: "开车",
    color: "#1A7A0A",
    surface: "#EDFAE8",
    border: "#AEEAA2",
    description: "装置处于正常生产运行工况",
    evaluationRule: "关联回路可参与性能评价",
  },
  {
    id: "shutdown",
    code: "SHUTDOWN",
    name: "停车",
    color: "#92600A",
    surface: "#FEF9EC",
    border: "#F7D98A",
    description: "装置处于停工、检修或非生产工况",
    evaluationRule: "关联回路整体暂停性能评价",
  },
]

export default function UnitConfigPage({
  navigate: _navigate,
}: {
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
}) {
  const [statuses, setStatuses] = useState(INITIAL_STATUSES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: "", description: "" })
  const [saveFlash, setSaveFlash] = useState(false)

  const startEditing = (status: StatusDefinition) => {
    setEditingId(status.id)
    setDraft({ name: status.name, description: status.description })
  }

  const confirmEditing = () => {
    if (!editingId || !draft.name.trim()) return
    setStatuses((previous) =>
      previous.map((status) =>
        status.id === editingId
          ? { ...status, name: draft.name.trim(), description: draft.description.trim() }
          : status,
      ),
    )
    setEditingId(null)
  }

  const handleSave = () => {
    setSaveFlash(true)
    window.setTimeout(() => setSaveFlash(false), 2000)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#171A1E", marginBottom: 4 }}>状态配置</div>
          <div style={{ fontSize: 13, color: "#747A82" }}>维护系统使用的静态状态字典，不在此处配置或展示节点当前状态</div>
        </div>
        <button
          type="button"
          onClick={handleSave}
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
            transition: "background 300ms",
          }}
        >
          {saveFlash ? "已保存" : "保存配置"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 300px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            border: "1px solid rgba(96,108,122,0.12)",
            boxShadow: "0 4px 16px rgba(27,39,52,0.07)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E0E4E9" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 3 }}>状态字典</div>
            <div style={{ fontSize: 12, color: "#9FA6AF" }}>当前系统固定维护开车、停车两种互斥状态</div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "170px 130px minmax(180px, 1fr) minmax(180px, 1fr) 74px",
              gap: 12,
              padding: "10px 20px",
              background: "#F7F8FA",
              borderBottom: "1px solid #E0E4E9",
              fontSize: 11,
              fontWeight: 600,
              color: "#747A82",
            }}
          >
            <span>状态</span>
            <span>状态编码</span>
            <span>状态说明</span>
            <span>评价规则</span>
            <span style={{ textAlign: "right" }}>操作</span>
          </div>

          {statuses.map((status, index) => {
            const editing = editingId === status.id
            return (
              <div
                key={status.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "170px 130px minmax(180px, 1fr) minmax(180px, 1fr) 74px",
                  gap: 12,
                  padding: "18px 20px",
                  alignItems: "center",
                  borderBottom: index < statuses.length - 1 ? "1px solid #F1F3F6" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: status.surface,
                      border: `1px solid ${status.border}`,
                    }}
                  >
                    <span style={{ width: 11, height: 11, borderRadius: "50%", background: status.color }} />
                  </span>
                  {editing ? (
                    <input
                      autoFocus
                      value={draft.name}
                      onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                      style={{
                        width: "100%",
                        height: 34,
                        padding: "0 9px",
                        border: "1px solid #82B9DD",
                        borderRadius: 7,
                        color: "#30353B",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: status.color }}>{status.name}</span>
                  )}
                </div>

                <span
                  className="font-mono-code"
                  style={{
                    width: "fit-content",
                    padding: "3px 7px",
                    borderRadius: 4,
                    background: "#F1F3F6",
                    color: "#515760",
                    fontSize: 11,
                  }}
                >
                  {status.code}
                </span>

                {editing ? (
                  <input
                    value={draft.description}
                    onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
                    style={{
                      width: "100%",
                      height: 34,
                      padding: "0 9px",
                      border: "1px solid #82B9DD",
                      borderRadius: 7,
                      color: "#30353B",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: "#515760", lineHeight: 1.6 }}>{status.description}</span>
                )}

                <span style={{ fontSize: 12, color: "#515760", lineHeight: 1.6 }}>{status.evaluationRule}</span>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{ padding: "4px 7px", border: "1px solid #CDD2D9", borderRadius: 5, background: "#FFFFFF", color: "#747A82", fontSize: 11, cursor: "pointer" }}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={confirmEditing}
                        style={{ padding: "4px 7px", border: "1px solid #004B8D", borderRadius: 5, background: "#004B8D", color: "#FFFFFF", fontSize: 11, cursor: "pointer" }}
                      >
                        确定
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(status)}
                      style={{ padding: "4px 10px", border: "1px solid #D9EAF7", borderRadius: 6, background: "#EEF5FB", color: "#004B8D", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
                    >
                      编辑
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              border: "1px solid rgba(96,108,122,0.12)",
              boxShadow: "0 4px 16px rgba(27,39,52,0.07)",
              padding: "18px",
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 9, background: "#EEF5FB", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 13 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 6.5h10M5 10h10M5 13.5h6" stroke="#004B8D" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="2.5" y="2.5" width="15" height="15" rx="3" stroke="#004B8D" strokeWidth="1.3" />
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#30353B", marginBottom: 7 }}>当前状态由接口驱动</div>
            <div style={{ fontSize: 12, color: "#747A82", lineHeight: 1.8 }}>
              每个节点同一时刻只有一个当前状态。状态识别、切换及当前状态高亮由程序通过专用接口处理，本配置页不展示实时结果。
            </div>
          </div>

          <div style={{ padding: "14px 16px", background: "#F9FAFB", borderRadius: 10, border: "1px solid #E0E4E9" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#747A82", marginBottom: 7 }}>配置约束</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 11, color: "#9FA6AF", lineHeight: 1.6 }}>
              <span>状态编码用于接口映射，保持固定且不可编辑。</span>
              <span>状态之间互斥，不设置启用或禁用开关。</span>
              <span>本页仅维护静态字典，不参与实时状态判定。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
