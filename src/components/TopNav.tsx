import { useState, useEffect } from "react"

export default function TopNav() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  return (
    <header
      className="flex-shrink-0 flex items-center px-5 gap-4"
      style={{
        height: 60,
        background: "#004B8D",
        borderBottom: "1px solid rgba(0,0,0,0.12)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center font-data font-bold text-sm"
          style={{
            width: 34,
            height: 34,
            background: "white",
            borderRadius: 4,
            color: "#004B8D",
            letterSpacing: "-0.5px",
          }}
        >
          Em
        </div>
        <div>
          <div
            className="font-data font-semibold leading-none tracking-widest"
            style={{ color: "white", fontSize: 11, letterSpacing: "0.18em" }}
          >
            EMERSON
          </div>
          <div
            className="font-data leading-none mt-0.5"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, letterSpacing: "0.12em" }}
          >
            AUTOMATION
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.2)" }} />

      {/* App title */}
      <div>
        <span className="font-data font-medium" style={{ color: "white", fontSize: 15 }}>
          控制回路性能管理系统
        </span>
        <span
          className="font-data ml-3"
          style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}
        >
          CPM · PPA01 某精细化工厂
        </span>
      </div>

      <div className="flex-1" />

      {/* OPC status */}
      <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
        <div
          style={{ width: 7, height: 7, borderRadius: "50%", background: "#39C523", flexShrink: 0 }}
        />
        <span className="font-data">OPC-UA 连接正常</span>
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />

      {/* Time */}
      <span className="font-data" style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
        {timeStr}
      </span>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />

      {/* User */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            color: "white",
            fontSize: 11,
          }}
        >
          仪
        </div>
        <span className="font-data" style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
          仪表工程师
        </span>
      </div>
    </header>
  )
}
