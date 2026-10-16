export type TrendGranularity = "hour" | "day" | "month"

export const QUICK_TREND_WINDOWS = [
  { label: "15分钟", hours: 0.25 },
  { label: "30分钟", hours: 0.5 },
  { label: "1小时", hours: 1 },
  { label: "4小时", hours: 4 },
  { label: "8小时", hours: 8 },
] as const

export function toDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function defaultRangeForGranularity(granularity: TrendGranularity) {
  const end = new Date()
  const start = new Date(end)
  if (granularity === "hour") start.setHours(start.getHours() - 1)
  if (granularity === "day") start.setHours(0, 0, 0, 0)
  if (granularity === "month") {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }
  return { start: toDateTimeLocal(start), end: toDateTimeLocal(end) }
}

interface NavigationConfig {
  offset: number
  maxOffset: number
  onOlder: () => void
  onNewer: () => void
  onLatest: () => void
  onSlide: (offset: number) => void
}

export default function TrendTimeControls({
  selectedHours,
  onSelectHours,
  granularity,
  onGranularityChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  customError,
  navigation,
}: {
  selectedHours: number | null
  onSelectHours: (hours: number | null) => void
  granularity: TrendGranularity
  onGranularityChange: (granularity: TrendGranularity) => void
  customStart: string
  customEnd: string
  onCustomStartChange: (value: string) => void
  onCustomEndChange: (value: string) => void
  customError?: string
  navigation?: NavigationConfig
}) {
  return (
    <>
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #E0E4E9", flexWrap: "wrap" }}>
        <span style={{ marginRight: 4, fontSize: 12, color: "#747A82" }}>时间窗口：</span>
        {QUICK_TREND_WINDOWS.map((option) => (
          <button
            type="button"
            key={option.hours}
            onClick={() => onSelectHours(option.hours)}
            style={{ height: 30, padding: "0 11px", borderRadius: 6, border: selectedHours === option.hours ? "1px solid #004B8D" : "1px solid #CDD2D9", background: selectedHours === option.hours ? "#EEF5FB" : "#FFFFFF", color: selectedHours === option.hours ? "#004B8D" : "#515760", fontSize: 12, fontWeight: selectedHours === option.hours ? 600 : 400, cursor: "pointer" }}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelectHours(null)}
          style={{ height: 30, padding: "0 11px", borderRadius: 6, border: selectedHours === null ? "1px solid #004B8D" : "1px solid #CDD2D9", background: selectedHours === null ? "#EEF5FB" : "#FFFFFF", color: selectedHours === null ? "#004B8D" : "#515760", fontSize: 12, fontWeight: selectedHours === null ? 600 : 400, cursor: "pointer" }}
        >
          自定义
        </button>

        {navigation && selectedHours !== null && (
          <>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={navigation.onOlder} disabled={navigation.offset >= navigation.maxOffset} style={{ height: 30, padding: "0 12px", borderRadius: 6, border: "1px solid #CDD2D9", background: "#FFFFFF", color: navigation.offset >= navigation.maxOffset ? "#B7BDC5" : "#515760", fontSize: 12, cursor: navigation.offset >= navigation.maxOffset ? "not-allowed" : "pointer" }}>◀ 向前</button>
            <button type="button" onClick={navigation.onNewer} disabled={navigation.offset === 0} style={{ height: 30, padding: "0 12px", borderRadius: 6, border: "1px solid #CDD2D9", background: "#FFFFFF", color: navigation.offset === 0 ? "#B7BDC5" : "#515760", fontSize: 12, cursor: navigation.offset === 0 ? "not-allowed" : "pointer" }}>向后 ▶</button>
            <button type="button" onClick={navigation.onLatest} style={{ height: 30, padding: "0 14px", borderRadius: 6, border: "1px solid #004B8D", background: navigation.offset === 0 ? "#004B8D" : "#FFFFFF", color: navigation.offset === 0 ? "#FFFFFF" : "#004B8D", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>最新</button>
          </>
        )}
      </div>

      {selectedHours === null && (
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #E0E4E9", background: customError ? "#FEF2F2" : "#F9FAFB", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#515760" }}>自定义时间</span>
          <input type="datetime-local" value={customStart} onChange={(event) => onCustomStartChange(event.target.value)} style={{ height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, color: "#30353B", fontSize: 11 }} />
          <span style={{ fontSize: 11, color: "#9FA6AF" }}>至</span>
          <input type="datetime-local" value={customEnd} onChange={(event) => onCustomEndChange(event.target.value)} style={{ height: 32, padding: "0 8px", border: "1px solid #CDD2D9", borderRadius: 6, color: "#30353B", fontSize: 11 }} />
          <span style={{ marginLeft: 8, fontSize: 11, color: "#9FA6AF" }}>粒度</span>
          {([
            { label: "小时", value: "hour" },
            { label: "日", value: "day" },
            { label: "月", value: "month" },
          ] as const).map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => onGranularityChange(option.value)}
              style={{ height: 28, padding: "0 10px", borderRadius: 5, border: granularity === option.value ? "1px solid #004B8D" : "1px solid #CDD2D9", background: granularity === option.value ? "#EEF5FB" : "#FFFFFF", color: granularity === option.value ? "#004B8D" : "#747A82", fontSize: 11, fontWeight: granularity === option.value ? 600 : 400, cursor: "pointer" }}
            >
              {option.label}
            </button>
          ))}
          {customError && <span style={{ fontSize: 11, color: "#D93838" }}>{customError}</span>}
        </div>
      )}

      {navigation && selectedHours !== null && (
        <div style={{ padding: "0 20px 12px" }}>
          <input type="range" min={0} max={navigation.maxOffset} value={navigation.maxOffset - navigation.offset} onChange={(event) => navigation.onSlide(navigation.maxOffset - Number(event.target.value))} style={{ width: "100%", accentColor: "#004B8D" }} />
          <div style={{ marginTop: 2, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9FA6AF" }}>
            <span>较早</span>
            <span>最新</span>
          </div>
        </div>
      )}
    </>
  )
}
