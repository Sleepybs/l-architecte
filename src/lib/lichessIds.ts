// Mémorise l'identifiant lichess de chaque partie déjà importée,
// pour ne jamais importer deux fois la même partie.
// (Version mémoire ; persistée dans IndexedDB à l'étape 5.)

const memory = new Map<string, string>()

export const lichessIds = {
  /** Lecture synchrone de ce qui est déjà en mémoire. */
  peek(gameId: string): string | null {
    return memory.get(gameId) ?? null
  },
  async get(gameId: string): Promise<string | null> {
    return memory.get(gameId) ?? null
  },
  async set(gameId: string, lichessId: string): Promise<void> {
    memory.set(gameId, lichessId)
  },
}
