import type { AppState } from "../types"

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="5" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="2.5" cy="4" r="1" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1" fill="currentColor" />
      <circle cx="2.5" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function IconMonitor() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="11" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="3,9 5,6 7,8 9,4 11,6 13,4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="8,5 8,8 10,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSliders() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="1" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5" cy="4" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="8" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="12" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconActivity() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <polyline points="1,8 4,5 7,10 10,3 13,7 15,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconConfig() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.27 1.27M11.33 11.33l1.27 1.27M12.6 3.4l-1.27 1.27M4.67 11.33l-1.27 1.27" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IconLoopMonitor() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="5" width="6" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="4" y1="10" x2="4" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="12" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="2.5" y1="5" x2="5.5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconManage() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="4" x2="5" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="3" y1="6.5" x2="5" y2="6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="9" y="1" width="6" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="11" y1="6.5" x2="13" y2="6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="1" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

function IconNetwork() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="2.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="2.5" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="3.6" y1="4.1" x2="6.4" y2="6.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12.4" y1="4.1" x2="9.6" y2="6.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3.6" y1="11.9" x2="6.4" y2="9.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12.4" y1="11.9" x2="9.6" y2="9.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left"
      style={{
        background: active ? "#EEF5FB" : "transparent",
        color: active ? "#004B8D" : "#515760",
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        border: "none",
        cursor: "pointer",
        transition: "background 120ms",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "#F7F8FA"
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 18,
            background: "#004B8D",
            borderRadius: "0 2px 2px 0",
          }}
        />
      )}
      <span style={{ color: active ? "#004B8D" : "#747A82" }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function NavGroup({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "#9FA6AF",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 600,
        padding: "12px 12px 4px",
      }}
    >
      {label}
    </div>
  )
}

interface SidebarProps {
  appState: AppState
  navigate: (page: AppState["page"], extra?: Partial<AppState>) => void
}

export default function Sidebar({ appState, navigate }: SidebarProps) {
  const page = appState.page

  return (
    <aside
      className="flex-shrink-0 flex flex-col"
      style={{ width: 216, background: "white", borderRight: "1px solid #E0E4E9" }}
    >
      <nav className="flex-1 overflow-y-auto" style={{ padding: "8px 8px 12px" }}>
        <NavGroup label="监控" />
        <NavItem
          icon={<IconDashboard />}
          label="总览"
          active={page === "dashboard"}
          onClick={() => navigate("dashboard")}
        />
        <NavItem
          icon={<IconMonitor />}
          label="性能监控"
          active={page === "performance-monitor"}
          onClick={() => navigate("performance-monitor")}
        />
        <NavItem
          icon={<IconLoopMonitor />}
          label="回路监控"
          active={page === "loop-monitor"}
          onClick={() => navigate("loop-monitor")}
        />
        <NavItem
          icon={<IconHistory />}
          label="趋势分析"
          active={page === "history-data"}
          onClick={() => navigate("history-data")}
        />

        <NavGroup label="异常诊断" />
        <NavItem
          icon={<IconAlert />}
          label="故障分析"
          active={page === "fault-analysis"}
          onClick={() => navigate("fault-analysis")}
        />
        <NavItem
          icon={<IconHistory />}
          label="事件分析"
          active={page === "event-analysis"}
          onClick={() => navigate("event-analysis")}
        />
        <NavItem
          icon={<IconNetwork />}
          label="关联性分析"
          active={page === "related-loop-analysis"}
          onClick={() => navigate("related-loop-analysis")}
        />

        <NavGroup label="管理" />
        <NavItem
          icon={<IconList />}
          label="回路台账"
          active={page === "loop-list" || page === "loop-detail"}
          onClick={() => navigate("loop-list")}
        />
        <NavItem
          icon={<IconSliders />}
          label="PID参数管理"
          active={page === "pid"}
          onClick={() => navigate("pid")}
        />
        <NavItem
          icon={<IconActivity />}
          label="单元状态管理"
          active={page === "unit-status"}
          onClick={() => navigate("unit-status")}
        />
        <NavItem
          icon={<IconConfig />}
          label="状态配置"
          active={page === "unit-config"}
          onClick={() => navigate("unit-config")}
        />
        <NavItem
          icon={<IconManage />}
          label="单元管理"
          active={page === "unit-manage"}
          onClick={() => navigate("unit-manage")}
        />
      </nav>

      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #E0E4E9",
          fontSize: 10,
          color: "#9FA6AF",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>GB/T 44693.2-2024</span>
        <span>v0.1 Demo</span>
      </div>
    </aside>
  )
}
