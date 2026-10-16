import type { Loop, Unit, Plant, TrendPoint, TrendPattern } from "../types"

export function generateTrendData(
  spVal: number,
  range: number,
  opBase: number,
  pattern: TrendPattern,
  hours = 1,
): TrendPoint[] {
  const points: TrendPoint[] = []
  const stepMs = 20_000
  const steps = Math.floor((hours * 3600 * 1000) / stepMs)
  const now = Date.now()
  let pv = spVal

  for (let i = 0; i < steps; i++) {
    const t = now - (steps - i) * stepMs
    let pvVal: number
    let opVal: number

    switch (pattern) {
      case "stable": {
        const noise = (Math.random() - 0.5) * range * 0.06
        pvVal = spVal + noise
        opVal = opBase + (Math.random() - 0.5) * 3
        break
      }
      case "oscillating": {
        const osc = Math.sin(i * 0.11) * range * 0.42
        pvVal = spVal + osc + (Math.random() - 0.5) * range * 0.04
        opVal = opBase + Math.sin(i * 0.11 + Math.PI) * 16 + (Math.random() - 0.5) * 3
        break
      }
      case "sluggish": {
        const target = spVal + Math.sin(i * 0.04) * range * 0.28
        pv = pv + (target - pv) * 0.07 + (Math.random() - 0.5) * range * 0.015
        pvVal = pv
        opVal = opBase + (spVal - pv) * 1.5 + (Math.random() - 0.5) * 2.5
        break
      }
      case "saturating": {
        const drift = range * 0.18 * Math.sin(i * 0.06)
        pvVal = spVal - range * 0.2 + drift + (Math.random() - 0.5) * range * 0.04
        opVal = Math.min(96, opBase + (i / steps) * 38)
        break
      }
      default: {
        pvVal = spVal
        opVal = opBase
      }
    }

    const d = new Date(t)
    const timeStr =
      d.getHours().toString().padStart(2, "0") +
      ":" +
      d.getMinutes().toString().padStart(2, "0")

    points.push({
      time: t,
      timeStr,
      pv: +pvVal.toFixed(2),
      sp: spVal,
      op: +Math.max(0, Math.min(100, opVal)).toFixed(1),
      mode: "auto",
    })
  }
  return points
}

export function generateHistoryData(
  spVal: number,
  range: number,
  opBase: number,
  pattern: TrendPattern,
  days = 1,
): Array<{ timeStr: string; pv: number; sp: number; op: number }> {
  const COUNT = 240
  const now = Date.now()
  const stepMs = (days * 24 * 3600 * 1000) / COUNT
  const result = []
  let pv = spVal

  for (let i = 0; i < COUNT; i++) {
    const t = now - (COUNT - i) * stepMs
    const d = new Date(t)
    let timeStr: string
    if (days <= 1) {
      timeStr = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0")
    } else if (days <= 7) {
      timeStr = (d.getMonth() + 1).toString().padStart(2, "0") + "/" + d.getDate().toString().padStart(2, "0") + " " + d.getHours().toString().padStart(2, "0") + ":00"
    } else {
      timeStr = (d.getMonth() + 1).toString().padStart(2, "0") + "/" + d.getDate().toString().padStart(2, "0")
    }

    let pvVal: number
    let opVal: number

    switch (pattern) {
      case "stable": {
        pvVal = spVal + Math.sin(i * 0.12) * range * 0.15 + (Math.random() - 0.5) * range * 0.06
        opVal = opBase + (Math.random() - 0.5) * 5
        break
      }
      case "oscillating": {
        const osc = Math.sin(i * 0.18) * range * 0.4
        pvVal = spVal + osc + (Math.random() - 0.5) * range * 0.05
        opVal = opBase + Math.sin(i * 0.18 + Math.PI) * 15
        break
      }
      case "sluggish": {
        const target = spVal + Math.sin(i * 0.06) * range * 0.25
        pv = pv + (target - pv) * 0.1
        pvVal = pv + (Math.random() - 0.5) * range * 0.03
        opVal = opBase + (spVal - pv) * 1.2
        break
      }
      default: {
        pvVal = spVal + (Math.random() - 0.5) * range * 0.1
        opVal = opBase + (Math.random() - 0.5) * 5
      }
    }

    result.push({
      timeStr,
      pv: +pvVal.toFixed(2),
      sp: spVal,
      op: +Math.max(0, Math.min(100, opVal)).toFixed(1),
    })
  }
  return result
}

const loops: Record<string, Loop> = {
  FIC_10130: {
    id: "l001",
    tag: "FIC_10130",
    name: "进料流量控制",
    unitId: "u001",
    sectionId: "s001",
    loopType: "single",
    processType: "flow",
    modelType: "first-order",
    serviceStatus: "in-service",
    controlStrategy: "单回路比例积分控制，将反应釜进料流量稳定在设定值，进料源压力稳定时无需前馈补偿。",
    mode: "auto",
    opcItem: "PPA01.R101.FIC_10130",
    autoRate: 96.3,
    effectiveAutoRate: 94.1,
    accuracy: 95.2,
    speed: 91.3,
    stability: 96.8,
    saturationRate: 2.1,
    performanceScore: 94.1,
    performanceLevel: 1,
    oscillationRate: 0.03,
    stickiness: 0.05,
    goodValueRate: 99.2,
    steadyStateTime: 45,
    travelIndex: 12.3,
    pid: { P: 1.2, I: 0.8, D: 0, pvFilter: 2.0, outputHi: 100, outputLo: 0, arwHi: 95, arwLo: 5, spHi: 200, spLo: 20 },
    pidRecords: [
      {
        id: "pr001",
        date: "2024-03-15 10:30",
        operator: "张工",
        reason: "流量波动较大，积分时间偏短导致超调",
        beforeP: 1.5, beforeI: 1.2, beforeD: 0,
        afterP: 1.2, afterI: 0.8, afterD: 0,
        result: "整定后流量平稳，超调消除，性能由三级提升至一级",
        eliminatedOscillation: true,
      },
    ],
    relatedLoopEntries: [
      { id: "rl001", tag: "LIC_10301", name: "进料罐液位控制", description: "上游液位控制，影响进料稳定性", unitId: "u001", notes: "液位变化会引起本回路扰动", direction: "incoming" },
      { id: "rl002", tag: "TIC_10201", name: "反应温度控制", description: "下游温度控制，受进料流量影响", unitId: "u001", notes: "进料量变化导致温度波动", direction: "outgoing" },
    ],
    faultEntries: [],
    upstreamTags: [],
    downstreamTags: ["TIC_10201"],
    coupledTags: [],
    trendSP: 120.0, trendRange: 8, trendOpBase: 48, trendPattern: "stable", trendUnit: "t/h",
  },
  TIC_10201: {
    id: "l002",
    tag: "TIC_10201",
    name: "反应温度控制",
    unitId: "u001",
    sectionId: "s001",
    loopType: "cascade",
    processType: "temperature",
    modelType: "second-order",
    serviceStatus: "in-service",
    controlStrategy: "串级控制：主回路（温度）→ 副回路（蒸汽流量），主回路输出作为副回路设定值，适应蒸汽压力波动。",
    mode: "auto",
    opcItem: "PPA01.R101.TIC_10201",
    autoRate: 88.5,
    effectiveAutoRate: 85.2,
    accuracy: 86.1,
    speed: 78.4,
    stability: 84.6,
    saturationRate: 5.3,
    performanceScore: 75.3,
    performanceLevel: 3,
    oscillationRate: 0.14,
    stickiness: 0.09,
    goodValueRate: 98.5,
    steadyStateTime: 145,
    travelIndex: 19.8,
    pid: { P: 2.5, I: 1.2, D: 0.1, pvFilter: 5.0, outputHi: 100, outputLo: 0, arwHi: 90, arwLo: 10, spHi: 180, spLo: 80 },
    pidRecords: [],
    relatedLoopEntries: [
      { id: "rl003", tag: "FIC_10130", name: "进料流量控制", description: "上游流量控制，进料变化影响温度", unitId: "u001", notes: "", direction: "incoming" },
    ],
    faultEntries: [
      { id: "fe001", date: "2024-03-10 09:15", operator: "张工", faultType: "PV周期震荡", description: "温度测量值出现周期性波动，周期约15分钟，幅值±3°C，疑似与蒸汽压力波动有关", action: "建议检查蒸汽管网压力稳定性，考虑增加前馈补偿" },
      { id: "fe002", date: "2024-02-28 14:30", operator: "李工", faultType: "PID参数需调整", description: "积分时间过短，导致控制器响应过快，引起超调", action: "已将积分时间从0.8增至1.2，观察效果" },
    ],
    upstreamTags: ["FIC_10130"],
    downstreamTags: [],
    coupledTags: [],
    trendSP: 135.0, trendRange: 12, trendOpBase: 55, trendPattern: "sluggish", trendUnit: "°C",
  },
  PIC_10045: {
    id: "l003",
    tag: "PIC_10045",
    name: "反应器压力控制",
    unitId: "u001",
    sectionId: "s002",
    loopType: "single",
    processType: "pressure",
    modelType: "second-order",
    serviceStatus: "out-of-service",
    controlStrategy: "单回路压力控制，通过调节顶部放空阀开度维持反应器操作压力，当前因PID参数不合适导致持续振荡。",
    mode: "manual",
    unusedReason: "pid",
    opcItem: "PPA01.R101.PIC_10045",
    autoRate: 62.1,
    effectiveAutoRate: 58.3,
    accuracy: 72.1,
    speed: 65.4,
    stability: 58.9,
    saturationRate: 18.2,
    performanceScore: 52.3,
    performanceLevel: 5,
    oscillationRate: 0.41,
    stickiness: 0.31,
    goodValueRate: 95.6,
    steadyStateTime: 290,
    travelIndex: 47.8,
    pid: { P: 4.0, I: 0.5, D: 0.2, pvFilter: 3.0, outputHi: 100, outputLo: 0, arwHi: 95, arwLo: 5, spHi: 6.0, spLo: 0.5 },
    pidRecords: [
      {
        id: "pr002",
        date: "2024-01-20 14:15",
        operator: "李工",
        reason: "压力持续振荡，尝试减小比例增益、增大积分时间",
        beforeP: 5.0, beforeI: 0.3, beforeD: 0.2,
        afterP: 4.0, afterI: 0.5, afterD: 0.2,
        result: "振荡略有改善但未消除，建议检查控制阀黏滞情况",
        eliminatedOscillation: false,
      },
    ],
    relatedLoopEntries: [
      { id: "rl004", tag: "LIC_10301", name: "进料罐液位控制", description: "耦合关系，压力变化影响液位", unitId: "u001", notes: "耦合较强，需协调控制", direction: "coupled" },
    ],
    faultEntries: [
      { id: "fe003", date: "2024-01-18 08:00", operator: "王工", faultType: "PV周期震荡", description: "压力PV出现持续周期振荡，周期约8分钟，幅值约0.3MPa，已超出工艺允许范围", action: "切换至手动控制，待PID重新整定后恢复自动" },
      { id: "fe004", date: "2024-01-20 16:00", operator: "李工", faultType: "阀门黏滞", description: "通过黏滞系数分析判断控制阀存在黏滞，导致振荡无法消除", action: "已申请阀门检修，计划下次停车时处理" },
    ],
    upstreamTags: [],
    downstreamTags: [],
    coupledTags: ["LIC_10301"],
    trendSP: 2.8, trendRange: 0.8, trendOpBase: 50, trendPattern: "oscillating", trendUnit: "MPaG",
  },
  LIC_10301: {
    id: "l004",
    tag: "LIC_10301",
    name: "进料罐液位控制",
    unitId: "u001",
    sectionId: "s002",
    loopType: "single",
    processType: "level",
    modelType: "first-order",
    serviceStatus: "in-service",
    controlStrategy: "单回路比例积分控制，维持进料缓冲罐操作液位，下游进料泵吸液。",
    mode: "auto",
    opcItem: "PPA01.V111.LIC_10301",
    autoRate: 94.2,
    effectiveAutoRate: 92.8,
    accuracy: 93.1,
    speed: 90.5,
    stability: 94.8,
    saturationRate: 3.2,
    performanceScore: 88.4,
    performanceLevel: 2,
    oscillationRate: 0.05,
    stickiness: 0.07,
    goodValueRate: 99.5,
    steadyStateTime: 68,
    travelIndex: 14.2,
    pid: { P: 1.8, I: 1.5, D: 0, pvFilter: 1.0, outputHi: 100, outputLo: 5, arwHi: 95, arwLo: 5, spHi: 90, spLo: 20 },
    pidRecords: [],
    relatedLoopEntries: [
      { id: "rl005", tag: "FIC_10130", name: "进料流量控制", description: "下游流量控制，液位直接影响进料量", unitId: "u001", notes: "", direction: "outgoing" },
    ],
    faultEntries: [],
    upstreamTags: [],
    downstreamTags: ["FIC_10130"],
    coupledTags: ["PIC_10045"],
    trendSP: 55.0, trendRange: 6, trendOpBase: 45, trendPattern: "stable", trendUnit: "%",
  },
  FIC_20110: {
    id: "l005",
    tag: "FIC_20110",
    name: "主反应器进料A",
    unitId: "u002",
    sectionId: "s003",
    loopType: "single",
    processType: "flow",
    modelType: "first-order",
    serviceStatus: "in-service",
    controlStrategy: "单回路流量控制，控制A组分进料量，与B组分保持工艺要求配比（A:B = 2.5:1）。",
    mode: "auto",
    opcItem: "PPA01.R201.FIC_20110",
    autoRate: 91.8,
    effectiveAutoRate: 89.3,
    accuracy: 90.2,
    speed: 88.6,
    stability: 91.1,
    saturationRate: 4.2,
    performanceScore: 86.3,
    performanceLevel: 2,
    oscillationRate: 0.06,
    stickiness: 0.09,
    goodValueRate: 98.9,
    steadyStateTime: 55,
    travelIndex: 16.8,
    pid: { P: 1.5, I: 0.9, D: 0, pvFilter: 2.0, outputHi: 100, outputLo: 0, arwHi: 95, arwLo: 5, spHi: 300, spLo: 30 },
    pidRecords: [],
    relatedLoopEntries: [
      { id: "rl006", tag: "FIC_20115", name: "主反应器进料B", description: "耦合回路，A/B配比联锁", unitId: "u002", notes: "A:B=2.5:1，修改A设定值需同步调整B", direction: "coupled" },
      { id: "rl007", tag: "TIC_20201", name: "主反应器温度控制", description: "下游温度，受进料量影响", unitId: "u002", notes: "", direction: "outgoing" },
    ],
    faultEntries: [],
    upstreamTags: [],
    downstreamTags: ["TIC_20201"],
    coupledTags: ["FIC_20115"],
    trendSP: 180.0, trendRange: 10, trendOpBase: 52, trendPattern: "stable", trendUnit: "kg/h",
  },
  FIC_20115: {
    id: "l006",
    tag: "FIC_20115",
    name: "主反应器进料B",
    unitId: "u002",
    sectionId: "s003",
    loopType: "single",
    processType: "flow",
    modelType: "first-order",
    serviceStatus: "in-service",
    controlStrategy: "单回路流量控制，控制B组分进料量，与A组分配比联锁，怀疑控制阀存在黏滞导致性能不佳。",
    mode: "auto",
    opcItem: "PPA01.R201.FIC_20115",
    autoRate: 74.5,
    effectiveAutoRate: 71.2,
    accuracy: 78.9,
    speed: 69.3,
    stability: 72.1,
    saturationRate: 11.8,
    performanceScore: 63.5,
    performanceLevel: 4,
    oscillationRate: 0.27,
    stickiness: 0.35,
    goodValueRate: 96.8,
    steadyStateTime: 198,
    travelIndex: 40.1,
    pid: { P: 2.8, I: 0.7, D: 0.15, pvFilter: 4.0, outputHi: 100, outputLo: 0, arwHi: 90, arwLo: 10, spHi: 150, spLo: 15 },
    pidRecords: [
      {
        id: "pr003",
        date: "2024-02-10 09:00",
        operator: "王工",
        reason: "B组分流量不稳定，黏滞系数高，初步判断控制阀黏滞",
        beforeP: 2.5, beforeI: 0.7, beforeD: 0.1,
        afterP: 2.8, afterI: 0.7, afterD: 0.15,
        result: "调整后改善不明显，建议安排控制阀维护",
        eliminatedOscillation: false,
      },
    ],
    relatedLoopEntries: [
      { id: "rl008", tag: "FIC_20110", name: "主反应器进料A", description: "配比耦合回路", unitId: "u002", notes: "A:B=2.5:1", direction: "coupled" },
    ],
    faultEntries: [
      { id: "fe005", date: "2024-02-08 10:20", operator: "王工", faultType: "阀门黏滞", description: "流量实际值频繁与设定值偏离，且偏差方向随机，黏滞系数0.35超过阈值，初步判断为控制阀黏滞", action: "已记录阀门维护需求，暂时通过加大D参数缓解" },
    ],
    upstreamTags: [],
    downstreamTags: ["TIC_20201"],
    coupledTags: ["FIC_20110"],
    trendSP: 72.0, trendRange: 8, trendOpBase: 53, trendPattern: "oscillating", trendUnit: "kg/h",
  },
  TIC_20201: {
    id: "l007",
    tag: "TIC_20201",
    name: "主反应器温度控制",
    unitId: "u002",
    sectionId: "s003",
    loopType: "cascade",
    processType: "temperature",
    modelType: "second-order",
    serviceStatus: "in-service",
    controlStrategy: "串级控制，主回路控制反应器夹套出口温度，副回路控制冷却水流量，整定良好性能优秀。",
    mode: "auto",
    opcItem: "PPA01.R201.TIC_20201",
    autoRate: 96.8,
    effectiveAutoRate: 95.2,
    accuracy: 96.4,
    speed: 93.1,
    stability: 97.2,
    saturationRate: 1.8,
    performanceScore: 95.2,
    performanceLevel: 1,
    oscillationRate: 0.02,
    stickiness: 0.04,
    goodValueRate: 99.7,
    steadyStateTime: 38,
    travelIndex: 10.1,
    pid: { P: 1.8, I: 0.6, D: 0.05, pvFilter: 3.0, outputHi: 100, outputLo: 10, arwHi: 95, arwLo: 5, spHi: 250, spLo: 100 },
    pidRecords: [],
    relatedLoopEntries: [
      { id: "rl009", tag: "FIC_20110", name: "主反应器进料A", description: "上游进料，影响热负荷", unitId: "u002", notes: "", direction: "incoming" },
      { id: "rl010", tag: "FIC_20115", name: "主反应器进料B", description: "上游进料，影响热负荷", unitId: "u002", notes: "", direction: "incoming" },
    ],
    faultEntries: [],
    upstreamTags: ["FIC_20110", "FIC_20115"],
    downstreamTags: [],
    coupledTags: [],
    trendSP: 168.0, trendRange: 10, trendOpBase: 44, trendPattern: "stable", trendUnit: "°C",
  },
  PIC_20210: {
    id: "l008",
    tag: "PIC_20210",
    name: "主反应器压力控制",
    unitId: "u002",
    sectionId: "s004",
    loopType: "single",
    processType: "pressure",
    modelType: "first-order",
    serviceStatus: "in-service",
    controlStrategy: "单回路压力控制，通过调节尾气排放阀开度维持反应器操作压力。",
    mode: "auto",
    opcItem: "PPA01.R201.PIC_20210",
    autoRate: 93.5,
    effectiveAutoRate: 91.8,
    accuracy: 92.6,
    speed: 90.3,
    stability: 93.8,
    saturationRate: 2.9,
    performanceScore: 90.2,
    performanceLevel: 1,
    oscillationRate: 0.04,
    stickiness: 0.06,
    goodValueRate: 99.3,
    steadyStateTime: 52,
    travelIndex: 13.6,
    pid: { P: 1.2, I: 1.0, D: 0, pvFilter: 2.5, outputHi: 100, outputLo: 0, arwHi: 95, arwLo: 5, spHi: 8.0, spLo: 1.0 },
    pidRecords: [],
    relatedLoopEntries: [],
    faultEntries: [],
    upstreamTags: [],
    downstreamTags: [],
    coupledTags: [],
    trendSP: 4.2, trendRange: 0.4, trendOpBase: 38, trendPattern: "stable", trendUnit: "MPaG",
  },
  LIC_30101: {
    id: "l009",
    tag: "LIC_30101",
    name: "精馏塔釜液位控制",
    unitId: "u003",
    sectionId: "s005",
    loopType: "single",
    processType: "level",
    modelType: "first-order",
    serviceStatus: "out-of-service",
    controlStrategy: "单回路液位控制，维持精馏塔塔釜操作液位，控制采出量。当前装置停车，回路暂停评价。",
    mode: "unused",
    unusedReason: "process",
    opcItem: "PPA01.T301.LIC_30101",
    autoRate: 0, effectiveAutoRate: 0, accuracy: 0, speed: 0, stability: 0, saturationRate: 0,
    performanceScore: 0, performanceLevel: 5, oscillationRate: 0, stickiness: 0, goodValueRate: 0, steadyStateTime: 0, travelIndex: 0,
    pid: { P: 2.0, I: 1.8, D: 0, pvFilter: 1.5, outputHi: 100, outputLo: 5, arwHi: 95, arwLo: 5, spHi: 85, spLo: 25 },
    pidRecords: [],
    relatedLoopEntries: [],
    faultEntries: [],
    upstreamTags: [],
    downstreamTags: [],
    coupledTags: [],
    trendSP: 50.0, trendRange: 4, trendOpBase: 45, trendPattern: "stable", trendUnit: "%",
  },
  TIC_30201: {
    id: "l010",
    tag: "TIC_30201",
    name: "精馏塔回流温度控制",
    unitId: "u003",
    sectionId: "s005",
    loopType: "single",
    processType: "temperature",
    modelType: "second-order",
    serviceStatus: "out-of-service",
    controlStrategy: "单回路温度控制，通过调节回流量控制塔顶温度，间接影响产品纯度。",
    mode: "unused",
    unusedReason: "process",
    opcItem: "PPA01.T301.TIC_30201",
    autoRate: 0, effectiveAutoRate: 0, accuracy: 0, speed: 0, stability: 0, saturationRate: 0,
    performanceScore: 0, performanceLevel: 5, oscillationRate: 0, stickiness: 0, goodValueRate: 0, steadyStateTime: 0, travelIndex: 0,
    pid: { P: 1.5, I: 0.8, D: 0.05, pvFilter: 4.0, outputHi: 100, outputLo: 0, arwHi: 90, arwLo: 10, spHi: 95, spLo: 40 },
    pidRecords: [],
    relatedLoopEntries: [
      { id: "rl011", tag: "FIC_30120", name: "精馏塔回流量控制", description: "耦合回路，温度控制通过调节回流量实现", unitId: "u003", notes: "", direction: "coupled" },
    ],
    faultEntries: [],
    upstreamTags: [],
    downstreamTags: [],
    coupledTags: ["FIC_30120"],
    trendSP: 72.0, trendRange: 6, trendOpBase: 48, trendPattern: "stable", trendUnit: "°C",
  },
  FIC_30120: {
    id: "l011",
    tag: "FIC_30120",
    name: "精馏塔回流量控制",
    unitId: "u003",
    sectionId: "s006",
    loopType: "single",
    processType: "flow",
    modelType: "first-order",
    serviceStatus: "out-of-service",
    controlStrategy: "单回路流量控制，控制精馏塔回流量，与塔顶温度控制回路协调操作。",
    mode: "unused",
    unusedReason: "process",
    opcItem: "PPA01.T301.FIC_30120",
    autoRate: 0, effectiveAutoRate: 0, accuracy: 0, speed: 0, stability: 0, saturationRate: 0,
    performanceScore: 0, performanceLevel: 5, oscillationRate: 0, stickiness: 0, goodValueRate: 0, steadyStateTime: 0, travelIndex: 0,
    pid: { P: 1.0, I: 1.2, D: 0, pvFilter: 2.0, outputHi: 100, outputLo: 0, arwHi: 95, arwLo: 5, spHi: 120, spLo: 10 },
    pidRecords: [],
    relatedLoopEntries: [],
    faultEntries: [],
    upstreamTags: [],
    downstreamTags: ["TIC_30201"],
    coupledTags: [],
    trendSP: 65.0, trendRange: 5, trendOpBase: 42, trendPattern: "stable", trendUnit: "t/h",
  },
  PIC_30210: {
    id: "l012",
    tag: "PIC_30210",
    name: "精馏塔顶压力控制",
    unitId: "u003",
    sectionId: "s006",
    loopType: "single",
    processType: "pressure",
    modelType: "first-order",
    serviceStatus: "out-of-service",
    controlStrategy: "单回路压力控制，通过调节冷凝器冷剂量维持精馏塔塔顶操作压力。",
    mode: "unused",
    unusedReason: "process",
    opcItem: "PPA01.T301.PIC_30210",
    autoRate: 0, effectiveAutoRate: 0, accuracy: 0, speed: 0, stability: 0, saturationRate: 0,
    performanceScore: 0, performanceLevel: 5, oscillationRate: 0, stickiness: 0, goodValueRate: 0, steadyStateTime: 0, travelIndex: 0,
    pid: { P: 0.8, I: 1.5, D: 0, pvFilter: 2.0, outputHi: 100, outputLo: 0, arwHi: 95, arwLo: 5, spHi: 3.0, spLo: 0.2 },
    pidRecords: [],
    relatedLoopEntries: [],
    faultEntries: [],
    upstreamTags: [],
    downstreamTags: [],
    coupledTags: [],
    trendSP: 0.85, trendRange: 0.1, trendOpBase: 55, trendPattern: "stable", trendUnit: "MPaG",
  },
}

export const plant: Plant = {
  id: "p001",
  name: "PPA01 某精细化工厂",
  shortName: "PPA01",
  units: [
    {
      id: "u001",
      name: "R101 反应釜",
      deviceCode: "R101",
      deviceName: "反应釜",
      status: "running",
      statusChangedAt: "2024-01-10 08:00",
      operatedBy: "操作班A",
      sections: [
        { id: "s001", name: "进料与温度控制", unitId: "u001", loops: [loops.FIC_10130, loops.TIC_10201] },
        { id: "s002", name: "压力与液位控制", unitId: "u001", loops: [loops.PIC_10045, loops.LIC_10301] },
      ],
    },
    {
      id: "u002",
      name: "R201 主反应器",
      deviceCode: "R201",
      deviceName: "主反应器",
      status: "running",
      statusChangedAt: "2024-01-10 08:00",
      operatedBy: "操作班A",
      sections: [
        { id: "s003", name: "进料与温度控制", unitId: "u002", loops: [loops.FIC_20110, loops.FIC_20115, loops.TIC_20201] },
        { id: "s004", name: "压力控制", unitId: "u002", loops: [loops.PIC_20210] },
      ],
    },
    {
      id: "u003",
      name: "T301 精馏塔",
      deviceCode: "T301",
      deviceName: "精馏塔",
      status: "shutdown",
      statusChangedAt: "2024-03-01 06:30",
      operatedBy: "操作班B",
      sections: [
        { id: "s005", name: "液位与温度控制", unitId: "u003", loops: [loops.LIC_30101, loops.TIC_30201] },
        { id: "s006", name: "流量与压力控制", unitId: "u003", loops: [loops.FIC_30120, loops.PIC_30210] },
      ],
    },
  ],
}

export const allLoops: Loop[] = Object.values(loops)

export function calculateLoopIAE(loop: Loop): number {
  return +(
    (100 - loop.accuracy) * loop.trendRange * 0.6 +
    loop.oscillationRate * 100
  ).toFixed(1)
}

export function getAllLoopsFromUnit(unit: Unit): Loop[] {
  return unit.sections.flatMap((s) => s.loops)
}

export function getUnitById(id: string): Unit | undefined {
  return plant.units.find((u) => u.id === id)
}

export function getLoopById(id: string): Loop | undefined {
  return allLoops.find((l) => l.id === id || l.tag === id)
}

export function getUnitForLoop(loopId: string): Unit | undefined {
  const loop = allLoops.find((l) => l.id === loopId)
  if (!loop) return undefined
  return plant.units.find((u) => u.id === loop.unitId)
}

export function getRunningLoops(): Loop[] {
  return plant.units
    .filter((u) => u.status === "running")
    .flatMap((u) => getAllLoopsFromUnit(u))
}

export interface UnitStats {
  total: number
  auto: number
  manual: number
  unused: number
  avgScore: number
  levelDist: Record<number, number>
  criticalCount: number
}

export function computeUnitStats(unit: Unit): UnitStats {
  const loops = getAllLoopsFromUnit(unit)
  if (unit.status === "shutdown") {
    return { total: loops.length, auto: 0, manual: 0, unused: loops.length, avgScore: 0, levelDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: loops.length }, criticalCount: 0 }
  }
  const auto = loops.filter((l) => l.mode === "auto").length
  const manual = loops.filter((l) => l.mode === "manual").length
  const unused = loops.filter((l) => l.mode === "unused").length
  const activeLoops = loops.filter((l) => l.mode !== "unused")
  const avgScore = activeLoops.length > 0 ? activeLoops.reduce((s, l) => s + l.performanceScore, 0) / activeLoops.length : 0
  const levelDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  activeLoops.forEach((l) => levelDist[l.performanceLevel]++)
  const criticalCount = loops.filter((l) => l.performanceLevel >= 4 || l.mode === "manual").length
  return { total: loops.length, auto, manual, unused, avgScore, levelDist, criticalCount }
}
