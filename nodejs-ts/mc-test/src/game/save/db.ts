import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SaveData } from './saveSchema'

interface McTestDBSchema extends DBSchema {
  saves: {
    key: string
    value: SaveData
  }
}

const DB_NAME = 'mc-test-db'
const DB_VERSION = 1
const STORE_NAME = 'saves'
const SAVE_KEY = 'current'

let dbPromise: Promise<IDBPDatabase<McTestDBSchema>> | null = null

const getDB = (): Promise<IDBPDatabase<McTestDBSchema>> => {
  if (!dbPromise) {
    dbPromise = openDB<McTestDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
  }
  return dbPromise
}

export const loadSave = async (): Promise<SaveData | null> => {
  const db = await getDB()
  const data = await db.get(STORE_NAME, SAVE_KEY)
  return data ?? null
}

export const saveGame = async (data: SaveData): Promise<void> => {
  const db = await getDB()
  await db.put(STORE_NAME, data, SAVE_KEY)
}

export const deleteSave = async (): Promise<void> => {
  const db = await getDB()
  await db.delete(STORE_NAME, SAVE_KEY)
}

export const hasSave = async (): Promise<boolean> => {
  const data = await loadSave()
  return data !== null
}
