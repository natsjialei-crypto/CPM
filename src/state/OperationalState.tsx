import { createContext, useContext, useMemo, useState } from "react"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { allLoops, plant } from "../data/mockData"
import type { Loop, Unit } from "../types"

function uniqueLoopIds(loops: Loop[]) {
  return Array.from(new Set(loops.map((loop) => loop.id)))
}

function createInitialAssetLoops(): Record<string, string[]> {
  const map: Record<string, string[]> = { [plant.id]: uniqueLoopIds(allLoops) }
  for (const unit of plant.units) {
    map[unit.id] = uniqueLoopIds(unit.sections.flatMap((section) => section.loops))
    for (const section of unit.sections) {
      map[section.id] = uniqueLoopIds(section.loops)
    }
  }
  return map
}

function createInitialEvaluationState(): Record<string, boolean> {
  return Object.fromEntries(allLoops.map((loop) => [loop.id, loop.serviceStatus === "in-service"]))
}

interface OperationalStateValue {
  units: Unit[]
  setUnits: Dispatch<SetStateAction<Unit[]>>
  assetLoops: Record<string, string[]>
  setAssetLoops: Dispatch<SetStateAction<Record<string, string[]>>>
  manualEvaluationEnabled: Record<string, boolean>
  setManualEvaluationEnabled: Dispatch<SetStateAction<Record<string, boolean>>>
  getMountedUnits: (loopId: string) => Unit[]
  getBlockingUnits: (loopId: string) => Unit[]
  isEvaluationEnabled: (loopId: string) => boolean
}

const OperationalStateContext = createContext<OperationalStateValue | null>(null)

export function OperationalStateProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<Unit[]>(() => plant.units.map((unit) => ({ ...unit })))
  const [assetLoops, setAssetLoops] = useState<Record<string, string[]>>(createInitialAssetLoops)
  const [manualEvaluationEnabled, setManualEvaluationEnabled] = useState<Record<string, boolean>>(createInitialEvaluationState)

  const value = useMemo<OperationalStateValue>(() => {
    const getMountedUnits = (loopId: string) =>
      units.filter((unit) => {
        if ((assetLoops[unit.id] || []).includes(loopId)) return true
        return unit.sections.some((section) => (assetLoops[section.id] || []).includes(loopId))
      })

    const getBlockingUnits = (loopId: string) =>
      getMountedUnits(loopId).filter((unit) => unit.status === "shutdown")

    return {
      units,
      setUnits,
      assetLoops,
      setAssetLoops,
      manualEvaluationEnabled,
      setManualEvaluationEnabled,
      getMountedUnits,
      getBlockingUnits,
      isEvaluationEnabled: (loopId: string) =>
        (manualEvaluationEnabled[loopId] ?? true) && getBlockingUnits(loopId).length === 0,
    }
  }, [assetLoops, manualEvaluationEnabled, units])

  return <OperationalStateContext.Provider value={value}>{children}</OperationalStateContext.Provider>
}

export function useOperationalState() {
  const context = useContext(OperationalStateContext)
  if (!context) throw new Error("useOperationalState must be used within OperationalStateProvider")
  return context
}
