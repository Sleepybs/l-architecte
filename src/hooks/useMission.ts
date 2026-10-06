import { useEffect, useMemo, useState } from 'react'
import { dbGet, dbPut } from '../lib/db'
import type { Game, TimeClass } from '../lib/games'
import {
  candidateMissions,
  missionProgress,
  weekKey,
  weekStart,
  type Mission,
  type MissionContext,
} from '../lib/mission'

const KINDS = new Set(['puzzles', 'no-timeout', 'castle', 'queen', 'opening', 'play'])

/** Une mission relue depuis le stockage est revalidée avant usage. */
function isMission(x: unknown): x is Mission {
  const m = x as Mission | null
  return (
    !!m && typeof m.title === 'string' && typeof m.why === 'string' && KINDS.has(String(m.kind))
  )
}

const same = (a: Mission, b: Mission) =>
  a.kind === b.kind && a.opening?.name === b.opening?.name && a.opening?.color === b.opening?.color

/** Mission de la semaine : choisie une fois par semaine et par cadence, puis suivie. */
export function useMission(
  username: string | null,
  timeClass: TimeClass,
  ctx: MissionContext,
  now = new Date(),
) {
  const week = weekKey(now)
  const since = weekStart(now)
  const key = username ? `mission|${username}|${timeClass}|${week}` : null
  const candidates = useMemo(() => candidateMissions(ctx), [ctx])

  // Mission mémorisée pour cette clé (joueur + cadence + semaine).
  const [stored, setStored] = useState<{ key: string | null; mission: Mission | null }>({
    key: null,
    mission: null,
  })

  useEffect(() => {
    if (!key) return
    let alive = true
    void dbGet<unknown>('kv', key)
      .catch(() => undefined)
      .then((m) => {
        if (alive) setStored({ key, mission: isMission(m) ? m : null })
      })
    return () => {
      alive = false
    }
  }, [key])

  const loaded = stored.key === key
  // Pas encore de mission cette semaine : la plus prioritaire.
  const mission = (loaded ? stored.mission : null) ?? candidates[0] ?? null

  // On enregistre le choix pour qu'il ne change plus de la semaine.
  useEffect(() => {
    if (key && loaded && !stored.mission && mission) {
      void dbPut('kv', key, mission).catch(() => undefined)
    }
  }, [key, loaded, stored.mission, mission])

  // Filtrage simple et rapide : pas besoin de mémoïser.
  const weekGames = ctx.games.filter((g: Game) => g.endTime >= since.getTime())
  const progress = mission ? missionProgress(mission, weekGames, ctx.puzzles, since) : null

  function change() {
    if (!key || !mission || candidates.length < 2) return
    const i = candidates.findIndex((c) => same(c, mission))
    const next = candidates[(i + 1) % candidates.length]
    if (!next) return
    setStored({ key, mission: next })
    void dbPut('kv', key, next).catch(() => undefined)
  }

  return { mission, progress, change, canChange: candidates.length > 1, weekGames }
}
