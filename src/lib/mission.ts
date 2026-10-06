// Mission de la semaine : un seul objectif, choisi d'après tes points faibles mesurés,
// et suivi automatiquement sur les parties de la semaine.
import type { GameAnalysis } from './analysis'
import { engineSummary } from './engineStats'
import type { Color, Game } from './games'
import { castleBeforeMove10, queenBeforeMove5 } from './indicators'
import type { PuzzleResult } from './puzzles'
import { lossBreakdown, openingFamily, openingStats, recordOf, score } from './stats'

export type MissionKind = 'puzzles' | 'no-timeout' | 'castle' | 'queen' | 'opening' | 'play'

export interface MissionChoice {
  kind: MissionKind
  /** Pour la mission « ouverture » : laquelle, avec quelle couleur. */
  opening?: { name: string; color: Color }
}

export interface Mission extends MissionChoice {
  title: string
  /** Pourquoi cette mission : le chiffre mesuré qui l'a déclenchée. */
  why: string
}

export interface MissionProgress {
  current: number
  target: number
  done: boolean
  detail: string
}

/** Lundi 00:00 (heure locale) de la semaine de `now`. */
export function weekStart(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = (d.getDay() + 6) % 7 // lundi = 0
  d.setDate(d.getDate() - day)
  return d
}

export function weekKey(now: Date): string {
  const d = weekStart(now)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export interface MissionContext {
  /** Parties de la période (pour mesurer les points faibles). */
  games: readonly Game[]
  analyses: ReadonlyMap<string, GameAnalysis>
  puzzles: ReadonlyMap<string, PuzzleResult>
  /** Nombre de puzzles disponibles (gaffes analysées). */
  puzzleCount: number
}

/**
 * Toutes les missions pertinentes, de la plus prioritaire à la moins prioritaire.
 * Ordre : gaffes (ce qui coûte le plus de points) > temps > roque > dame > ouverture.
 */
export function candidateMissions(ctx: MissionContext): Mission[] {
  const out: Mission[] = []
  const { games } = ctx

  const engine = engineSummary(games, ctx.analyses)
  if (engine.analyzed >= 3 && engine.blundersPerGame >= 0.5 && ctx.puzzleCount >= 5) {
    out.push({
      kind: 'puzzles',
      title: 'Résous 10 puzzles tirés de tes propres gaffes',
      why: `${engine.blundersPerGame.toLocaleString('fr-FR')} gaffe(s) par partie analysée.`,
    })
  }

  const losses = lossBreakdown(games)
  const totalLosses = losses.reduce((s, l) => s + l.count, 0)
  const timeouts = losses.find((l) => l.kind === 'timeout')?.count ?? 0
  if (timeouts >= 3 && timeouts / totalLosses >= 0.25) {
    out.push({
      kind: 'no-timeout',
      title: 'Aucune défaite au temps sur au moins 5 parties',
      why: `${Math.round((timeouts / totalLosses) * 100)} % de tes défaites viennent de la pendule.`,
    })
  }

  const castle = castleBeforeMove10(games)
  if (castle.eligible >= 10 && castle.rate !== null && castle.rate < 70) {
    out.push({
      kind: 'castle',
      title: 'Roque avant le coup 10 dans au moins 8 parties sur 10',
      why: `Tu roques tôt dans ${castle.rate} % de tes parties.`,
    })
  }

  const queen = queenBeforeMove5(games)
  if (queen.eligible >= 10 && queen.rate !== null && queen.rate >= 15) {
    out.push({
      kind: 'queen',
      title: 'Garde ta dame à la maison : aucune sortie avant le coup 5 sur 5 parties',
      why: `Ta dame sort avant le coup 5 dans ${queen.rate} % de tes parties.`,
    })
  }

  const weak = openingStats(games, 5)
    .filter((o) => o.score < 45)
    .sort((a, b) => a.score - b.score)[0]
  if (weak) {
    out.push({
      kind: 'opening',
      opening: { name: weak.name, color: weak.color },
      title: `Remonte ta ${weak.name} (${weak.color === 'white' ? 'blancs' : 'noirs'}) : 50 % sur 5 parties`,
      why: `Score de ${weak.score} % sur ${weak.games} parties.`,
    })
  }

  out.push({
    kind: 'play',
    title: 'Joue 10 parties et analyse tes défaites',
    why: 'Pas de point faible net sur la période : on accumule des parties à analyser.',
  })
  return out
}

/** Progression de la mission sur les parties jouées depuis lundi. */
export function missionProgress(
  mission: MissionChoice,
  weekGames: readonly Game[],
  puzzles: ReadonlyMap<string, PuzzleResult>,
  since: Date,
): MissionProgress {
  const n = weekGames.length
  switch (mission.kind) {
    case 'puzzles': {
      const solved = [...puzzles.values()].filter(
        (r) => r.solved && r.lastAt >= since.getTime(),
      ).length
      return {
        current: solved,
        target: 10,
        done: solved >= 10,
        detail: `${solved} / 10 puzzles résolus`,
      }
    }
    case 'no-timeout': {
      const timeouts = weekGames.filter(
        (g) => g.outcome === 'loss' && g.result === 'timeout',
      ).length
      return {
        current: Math.min(n, 5),
        target: 5,
        done: n >= 5 && timeouts === 0,
        detail:
          timeouts === 0
            ? `${n} partie(s) sans défaite au temps`
            : `${timeouts} défaite(s) au temps cette semaine : on repart lundi prochain`,
      }
    }
    case 'castle': {
      const ind = castleBeforeMove10(weekGames)
      return {
        current: ind.hits,
        target: Math.max(8, Math.ceil(ind.eligible * 0.8)),
        done: ind.eligible >= 10 && (ind.rate ?? 0) >= 80,
        detail: `Roque avant le coup 10 : ${ind.hits} / ${ind.eligible} parties`,
      }
    }
    case 'queen': {
      const ind = queenBeforeMove5(weekGames)
      const clean = ind.eligible - ind.hits
      return {
        current: ind.hits === 0 ? Math.min(clean, 5) : 0,
        target: 5,
        done: ind.eligible >= 5 && ind.hits === 0,
        detail:
          ind.hits === 0
            ? `${clean} partie(s) sans sortie précoce de la dame`
            : `${ind.hits} sortie(s) précoce(s) cette semaine`,
      }
    }
    case 'opening': {
      const o = mission.opening
      const played = weekGames.filter(
        (g) => o && g.color === o.color && openingFamily(g.opening) === o.name,
      )
      const s = score(recordOf(played))
      return {
        current: Math.min(played.length, 5),
        target: 5,
        done: played.length >= 5 && s >= 50,
        detail: `${played.length} partie(s) jouée(s), score ${played.length ? s : 0} %`,
      }
    }
    case 'play':
      return {
        current: Math.min(n, 10),
        target: 10,
        done: n >= 10,
        detail: `${n} partie(s) cette semaine`,
      }
  }
}
