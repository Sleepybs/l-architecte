// Mémorise l'identifiant lichess de chaque partie déjà importée,
// pour ne jamais importer deux fois la même partie (et rouvrir directement l'analyse).
import { dbGet, dbPut } from './db'

const memory = new Map<string, string>()
const key = (gameId: string) => `lichess|${gameId}`

export const lichessIds = {
  /** Lecture synchrone de ce qui est déjà en mémoire. */
  peek(gameId: string): string | null {
    return memory.get(gameId) ?? null
  },
  async get(gameId: string): Promise<string | null> {
    const cached = memory.get(gameId)
    if (cached) return cached
    const stored = await dbGet<string>('kv', key(gameId)).catch(() => undefined)
    if (stored) memory.set(gameId, stored)
    return stored ?? null
  },
  async set(gameId: string, lichessId: string): Promise<void> {
    memory.set(gameId, lichessId)
    await dbPut('kv', key(gameId), lichessId).catch(() => undefined)
  },
  clearMemory(): void {
    memory.clear()
  },
}
