// In-memory mock for expo-secure-store (native module unavailable in Node.js)
const store: Record<string, string> = {}

export const getItemAsync = jest.fn(async (key: string) => store[key] ?? null)
export const setItemAsync = jest.fn(async (key: string, value: string) => { store[key] = value })
export const deleteItemAsync = jest.fn(async (key: string) => { delete store[key] })

/** Сбрасывает хранилище между тестами */
export function __clearStore() {
  for (const key of Object.keys(store)) delete store[key]
}
