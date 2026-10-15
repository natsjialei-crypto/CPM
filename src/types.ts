export type LoopMode = "auto" | "manual" | "unused"
export type UnusedReason = "process" | "strategy" | "config" | "pid" | "other"
export type ProcessType = "flow" | "pressure" | "level" | "temperature" | "composition"
export type LoopType = "single" | "cascade" | "split" | "override" | "feedforward"
export type UnitStatus = "running" | "shutdown"
export type PerfLevel = 1 | 2 | 3 | 4 | 5
export type TrendPattern = "stable" | "oscillating" | "sluggish" | "saturating"
export type ModelType = "first-order" | "second-order"
export type ServiceStatus = "in-service" | "out-of-service"

export interface PIDParams {
  P: number
  I: number
  D: number
  pvFilter: number
  outputHi: number
  outputLo: number
  arwHi: number
  arwLo: number
  spHi: number
  spLo: number
}

export interface TrendPoint {
  time: number
  timeStr: string
  pv: number
  sp: number
  op: number
  mode: "auto" | "manual"
}

export interface PIDRecord {
  id: string
  date: string
  operator: string
  reason: string
  beforeP: number
  beforeI: number
  beforeD: number
  afterP: number
  afterI: number
  afterD: number
  result: string
  eliminatedOscillation: boolean
}

export interface RelatedLoopEntry {
  id: string
  tag: string
  name: string
  description: string
  unitId: string
  notes: string
  direction?: "outgoing" | "incoming" | "coupled"
}

export interface FaultEntry {
  id: string
  date: string
  operator: string
  faultType: string
  description: string
  action: string
}

export interface Loop {
  id: string
  tag: string
  name: string
  unitId: string
  sectionId: string
  loopType: LoopType
  processType: ProcessType
  modelType: ModelType
  serviceStatus: ServiceStatus
  controlStrategy: string
  mode: LoopMode
  unusedReason?: UnusedReason
  opcItem: string

  autoRate: number
  effectiveAutoRate: number
  accuracy: number
  speed: number
  stability: number
  saturationRate: number
  performanceScore: number
  performanceLevel: PerfLevel

  oscillationRate: number
  stickiness: number
  goodValueRate: number
  steadyStateTime: number
  travelIndex: number

  pid: PIDParams
  pidRecords: PIDRecord[]
  relatedLoopEntries: RelatedLoopEntry[]
  faultEntries: FaultEntry[]

  upstreamTags: string[]
  downstreamTags: string[]
  coupledTags: string[]

  trendSP: number
  trendRange: number
  trendOpBase: number
  trendPattern: TrendPattern
  trendUnit: string
}

export interface Section {
  id: string
  name: string
  unitId: string
  loops: Loop[]
}

export interface Unit {
  id: string
  name: string
  deviceCode: string
  deviceName: string
  status: UnitStatus
  statusChangedAt: string
  operatedBy: string
  sections: Section[]
}

export interface Plant {
  id: string
  name: string
  shortName: string
  units: Unit[]
}

export interface CustomStatus {
  id: string
  name: string
  color: string
  description: string
}

export interface UnitStatusConfig {
  unitId: string
  customStatuses: CustomStatus[]
  activeStatusId: string
}

export type NavPage =
  | "dashboard"
  | "loop-list"
  | "loop-detail"
  | "pid"
  | "unit-status"
  | "unit-config"
  | "unit-manage"
  | "loop-monitor"
  | "performance-monitor"
  | "history-data"
  | "fault-analysis"
  | "event-analysis"
  | "related-loop-analysis"

export interface AppState {
  page: NavPage
  selectedLoopId?: string
  selectedUnitId?: string
}
