// Petite surcouche à IndexedDB (la base de données intégrée au navigateur).
// IndexedDB fonctionne par événements ; on l'enveloppe dans des Promises pour utiliser async/await.
// Tout reste sur l'appareil de l'utilisateur : rien n'est envoyé ailleurs.

const DB_NAME = 'l-architecte'
const DB_VERSION = 1

/** Les « tables » de la base. Toutes sont créées dès la v1 pour éviter des migrations. */
export const STORES = ['months', 'kv', 'analyses', 'journal'] as const
export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function open(): Promise<IDBDatabase> {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB indisponible'))
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    // Appelé à la création (ou au changement de version) : on crée les tables manquantes.
    req.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name)
      }
    }
    req.onsuccess = () => {
      const db = req.result
      // Si un autre onglet supprime la base, on ferme proprement.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

async function store(name: StoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return (await open()).transaction(name, mode).objectStore(name)
}

export async function dbGet<T>(name: StoreName, key: string): Promise<T | undefined> {
  return promisify((await store(name, 'readonly')).get(key)) as Promise<T | undefined>
}

export async function dbPut<T>(name: StoreName, key: string, value: T): Promise<void> {
  await promisify((await store(name, 'readwrite')).put(value, key))
}

export async function dbDelete(name: StoreName, key: string): Promise<void> {
  await promisify((await store(name, 'readwrite')).delete(key))
}

/** Toutes les valeurs dont la clé commence par `prefix`. */
export async function dbGetByPrefix<T>(name: StoreName, prefix: string): Promise<T[]> {
  // '￿' est le plus grand caractère : la plage couvre toutes les clés « prefix… ».
  const range = IDBKeyRange.bound(prefix, `${prefix}￿`)
  return promisify((await store(name, 'readonly')).getAll(range)) as Promise<T[]>
}

/** Supprime toute la base (bouton « Effacer mes données »). */
export async function dbDestroy(): Promise<void> {
  if (dbPromise) {
    ;(await dbPromise.catch(() => null))?.close()
    dbPromise = null
  }
  if (!('indexedDB' in globalThis)) return
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve() // un autre onglet la garde ouverte : elle sera supprimée à sa fermeture
  })
}
