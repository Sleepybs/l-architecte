import 'fake-indexeddb/auto' // IndexedDB simulé en mémoire pour les tests
import { describe, expect, it } from 'vitest'
import { dbDelete, dbDestroy, dbGet, dbGetByPrefix, dbPut } from './db'

describe('db', () => {
  it('écrit, lit et supprime', async () => {
    await dbPut('kv', 'a', { x: 1 })
    expect(await dbGet('kv', 'a')).toEqual({ x: 1 })
    await dbDelete('kv', 'a')
    expect(await dbGet('kv', 'a')).toBeUndefined()
  })

  it('lit par préfixe de clé', async () => {
    await dbPut('months', 'alice|1', 1)
    await dbPut('months', 'alice|2', 2)
    await dbPut('months', 'alicia|1', 3)
    expect(await dbGetByPrefix('months', 'alice|')).toEqual([1, 2])
  })

  it('efface toute la base', async () => {
    await dbPut('kv', 'b', 'valeur')
    await dbDestroy()
    expect(await dbGet('kv', 'b')).toBeUndefined()
  })
})
