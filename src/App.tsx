import { useState } from "react"
import type { AppState } from "./types"
import TopNav from "./components/TopNav"
import Sidebar from "./components/Sidebar"
import DashboardPage from "./pages/DashboardPage"
import LoopListPage from "./pages/LoopListPage"
import LoopDetailPage from "./pages/LoopDetailPage"
import PIDPage from "./pages/PIDPage"
import UnitStatusPage from "./pages/UnitStatusPage"
import PerformanceMonitorPage from "./pages/PerformanceMonitorPage"
import HistoryDataPage from "./pages/HistoryDataPage"
import FaultAnalysisPage from "./pages/FaultAnalysisPage"
import RelatedLoopAnalysisPage from "./pages/RelatedLoopAnalysisPage"
import UnitConfigPage from "./pages/UnitConfigPage"
import UnitManagePage from "./pages/UnitManagePage"
import LoopMonitorPage from "./pages/LoopMonitorPage"
import EventAnalysisPage from "./pages/EventAnalysisPage"

export default function App() {
  const [appState, setAppState] = useState<AppState>({ page: "dashboard" })

  const navigate = (page: AppState["page"], extra?: Partial<AppState>) => {
    setAppState({ page, ...extra })
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <TopNav />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar appState={appState} navigate={navigate} />
        <main style={{ flex: 1, overflowY: "auto", background: "#E9EDF2" }}>
          {appState.page === "dashboard" && <DashboardPage navigate={navigate} />}
          {appState.page === "loop-list" && (
            <LoopListPage navigate={navigate} filterUnitId={appState.selectedUnitId} />
          )}
          {appState.page === "loop-detail" && appState.selectedLoopId && (
            <LoopDetailPage loopId={appState.selectedLoopId} navigate={navigate} />
          )}
          {appState.page === "pid" && <PIDPage navigate={navigate} />}
          {appState.page === "unit-status" && <UnitStatusPage navigate={navigate} />}
          {appState.page === "loop-monitor" && <LoopMonitorPage navigate={navigate} />}
          {appState.page === "performance-monitor" && (
            <PerformanceMonitorPage navigate={navigate} />
          )}
          {appState.page === "history-data" && <HistoryDataPage navigate={navigate} />}
          {appState.page === "fault-analysis" && <FaultAnalysisPage navigate={navigate} />}
          {appState.page === "event-analysis" && <EventAnalysisPage navigate={navigate} />}
          {appState.page === "related-loop-analysis" && <RelatedLoopAnalysisPage navigate={navigate} />}
          {appState.page === "unit-config" && <UnitConfigPage navigate={navigate} />}
          {appState.page === "unit-manage" && <UnitManagePage navigate={navigate} />}
        </main>
      </div>
    </div>
  )
}
