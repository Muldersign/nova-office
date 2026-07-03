export type WorkspaceStore = {
  read<T>(key: string, fallback: T): T
  write<T>(key: string, value: T): void
  remove(key: string): void
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function createWorkspaceStore(storage: StorageLike | undefined, versionKey: string, version: string): WorkspaceStore {
  return {
    read<T>(key: string, fallback: T) {
      if (!storage || storage.getItem(versionKey) !== version) {
        return fallback
      }

      const raw = storage.getItem(key)
      if (!raw) {
        return fallback
      }

      try {
        return JSON.parse(raw) as T
      } catch {
        return fallback
      }
    },
    write<T>(key: string, value: T) {
      if (!storage) {
        return
      }

      storage.setItem(versionKey, version)
      storage.setItem(key, JSON.stringify(value))
    },
    remove(key: string) {
      storage?.removeItem(key)
    },
  }
}

export function createRemoteWorkspaceEndpoint(baseUrl: string) {
  return {
    customers: `${baseUrl}/customers`,
    invoices: `${baseUrl}/invoices`,
    quotes: `${baseUrl}/quotes`,
    products: `${baseUrl}/products`,
    settings: `${baseUrl}/settings`,
    team: `${baseUrl}/team`,
  }
}
