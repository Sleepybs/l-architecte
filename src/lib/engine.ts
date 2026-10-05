// Pilotage de Stockfish (WebAssembly) dans un Web Worker, via le protocole texte UCI.
// Le Worker tourne dans un fil séparé : l'interface reste fluide pendant le calcul.

/** Évaluation d'une position, du point de vue du camp qui a le trait. */
export interface EngineEval {
  /** Avantage en centipions (100 = un pion). null si mat annoncé. */
  cp: number | null
  /** Mat en N coups (positif : le camp au trait mate ; négatif : il se fait mater). */
  mate: number | null
  /** Meilleur coup en notation UCI (ex. « e2e4 », « e7e8q »). */
  bestMove: string | null
  depth: number
}

/** Tout ce qui sait évaluer une position (Stockfish en vrai, un faux moteur dans les tests). */
export interface Evaluator {
  evaluate(fen: string, depth: number): Promise<EngineEval>
}

export const ENGINE_URL = 'engine/stockfish-19-lite-single.js'

/** Lit une ligne « info depth 12 … score cp 35 … pv e2e4 e7e5 ». */
export function parseInfo(line: string): (Omit<EngineEval, 'bestMove'> & { pv: string[] }) | null {
  if (!line.startsWith('info ') || !line.includes(' score ')) return null
  // On ignore les bornes provisoires (« lowerbound/upperbound ») : ce ne sont pas des évaluations finales.
  if (/ (lower|upper)bound/.test(line)) return null
  const depth = /\bdepth (\d+)/.exec(line)
  const score = /\bscore (cp|mate) (-?\d+)/.exec(line)
  if (!depth?.[1] || !score?.[2]) return null
  const value = Number(score[2])
  const pv = /\bpv (.+)$/.exec(line)?.[1]?.trim().split(/\s+/) ?? []
  return {
    depth: Number(depth[1]),
    cp: score[1] === 'cp' ? value : null,
    mate: score[1] === 'mate' ? value : null,
    pv,
  }
}

export function parseBestMove(line: string): string | null | undefined {
  const m = /^bestmove (\S+)/.exec(line)
  if (!m) return undefined // pas une ligne bestmove
  return m[1] === '(none)' ? null : (m[1] ?? null)
}

export class StockfishEngine implements Evaluator {
  private readonly worker: Worker
  private listeners = new Set<(line: string) => void>()
  // Les commandes sont mises en file : le moteur ne traite qu'une position à la fois.
  private queue: Promise<unknown> = Promise.resolve()
  private cancels = new Set<(reason: string) => void>()
  private stopped = false

  private constructor(url: string) {
    this.worker = new Worker(url)
    this.worker.onmessage = (e: MessageEvent) => {
      const text = typeof e.data === 'string' ? e.data : String(e.data)
      for (const line of text.split('\n')) for (const l of this.listeners) l(line)
    }
    this.worker.onerror = () =>
      this.terminate('Impossible de démarrer Stockfish dans ce navigateur.')
  }

  /** Démarre le moteur et attend qu'il soit prêt. */
  static async create(url = new URL(ENGINE_URL, document.baseURI).href): Promise<StockfishEngine> {
    const engine = new StockfishEngine(url)
    const ready = engine.waitFor((l) => l === 'uciok', 30_000)
    engine.send('uci')
    await ready
    engine.send('setoption name Hash value 32')
    const ok = engine.waitFor((l) => l === 'readyok', 30_000)
    engine.send('isready')
    await ok
    return engine
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd)
  }

  private waitFor(match: (line: string) => boolean, timeoutMs: number): Promise<string> {
    if (this.stopped) return Promise.reject(new Error('Moteur arrêté.'))
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer)
        this.listeners.delete(listener)
        this.cancels.delete(cancel)
      }
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('Le moteur ne répond pas.'))
      }, timeoutMs)
      const listener = (line: string) => {
        if (!match(line)) return
        cleanup()
        resolve(line)
      }
      const cancel = (reason: string) => {
        cleanup()
        reject(new Error(reason))
      }
      this.listeners.add(listener)
      this.cancels.add(cancel)
    })
  }

  /** Analyse une position jusqu'à `depth` (et au plus `maxMs` millisecondes). */
  evaluate(fen: string, depth: number, maxMs = 4000): Promise<EngineEval> {
    const run = async (): Promise<EngineEval> => {
      // Objet plutôt que variable : TypeScript suit mal les affectations faites dans une closure.
      const seen: { last: ReturnType<typeof parseInfo> } = { last: null }
      const collect = (line: string) => {
        const info = parseInfo(line)
        // multipv 1 : on garde la ligne la plus profonde.
        if (info && (!seen.last || info.depth >= seen.last.depth)) seen.last = info
      }
      this.listeners.add(collect)
      try {
        const done = this.waitFor((l) => l.startsWith('bestmove '), maxMs + 15_000)
        this.send(`position fen ${fen}`)
        this.send(`go depth ${depth} movetime ${maxMs}`)
        const bestLine = await done
        const result = seen.last
        return {
          cp: result?.cp ?? null,
          mate: result?.mate ?? null,
          depth: result?.depth ?? 0,
          bestMove: parseBestMove(bestLine) ?? null,
        }
      } finally {
        this.listeners.delete(collect)
      }
    }
    const next = this.queue.then(run, run)
    this.queue = next.catch(() => undefined)
    return next
  }

  /** Arrête le Worker et fait échouer immédiatement les attentes en cours. */
  terminate(reason = 'Moteur arrêté.') {
    this.stopped = true
    this.worker.terminate()
    for (const cancel of [...this.cancels]) cancel(reason)
    this.listeners.clear()
  }
}
