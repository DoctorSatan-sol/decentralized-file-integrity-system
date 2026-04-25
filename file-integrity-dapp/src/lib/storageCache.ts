export type CachedFileVersion = {
    fileHash: `0x${string}`
    cid: string
    size: number
    versionNumber: number
    userAddress: string
}

export type CachedFile = {
    fileId: number
    name: string
    description: string
    userAddress: string
    latestVersionNumber: number
    exists: boolean
    versions: CachedFileVersion[]
}

export type CachedStorage = {
    storageAddress: `0x${string}`
    updatedAt: number
    files: CachedFile[]
}

export const CACHE_UPDATED_EVENT = 'file-integrity-cache-updated'

function getStorageKey(storageAddress: string) {
    return `file-integrity-storage-cache:${storageAddress.toLowerCase()}`
}

function notifyCacheUpdated(storageAddress: string) {
    if (typeof window === 'undefined') return

    window.dispatchEvent(
        new CustomEvent(CACHE_UPDATED_EVENT, {
            detail: { storageAddress: storageAddress.toLowerCase() },
        })
    )
}

export function getCachedStorage(storageAddress: string): CachedStorage | null {
    if (typeof window === 'undefined') return null

    const raw = localStorage.getItem(getStorageKey(storageAddress))
    if (!raw) return null

    try {
        return JSON.parse(raw) as CachedStorage
    } catch {
        return null
    }
}

export function getCachedFile(
    storageAddress: string,
    fileId: number
): CachedFile | null {
    const storage = getCachedStorage(storageAddress)
    if (!storage) return null

    return storage.files.find((file) => file.fileId === fileId) ?? null
}

export function isFileFullyCached(
    storageAddress: string,
    fileId: number,
    latestVersionNumber: number
) {
    const file = getCachedFile(storageAddress, fileId)
    if (!file) return false

    return (
        file.latestVersionNumber === latestVersionNumber &&
        file.versions.length === latestVersionNumber
    )
}

export function saveCachedStorage(storage: CachedStorage) {
    if (typeof window === 'undefined') return

    localStorage.setItem(getStorageKey(storage.storageAddress), JSON.stringify(storage))
    notifyCacheUpdated(storage.storageAddress)
}

export function clearCachedStorage(storageAddress: string) {
    if (typeof window === 'undefined') return

    localStorage.removeItem(getStorageKey(storageAddress))
    notifyCacheUpdated(storageAddress)
}

export function upsertCachedFile(
    storageAddress: `0x${string}`,
    file: CachedFile
) {
    const current = getCachedStorage(storageAddress) ?? {
        storageAddress,
        updatedAt: Date.now(),
        files: [],
    }

    const existing = current.files.find((item) => item.fileId === file.fileId)

    const nextFile: CachedFile = {
        ...file,
        versions: existing?.versions ?? file.versions ?? [],
    }

    const nextFiles = [...current.files]
    const index = nextFiles.findIndex((item) => item.fileId === file.fileId)

    if (index === -1) {
        nextFiles.push(nextFile)
    } else {
        nextFiles[index] = nextFile
    }

    saveCachedStorage({
        storageAddress,
        updatedAt: Date.now(),
        files: nextFiles.sort((a, b) => a.fileId - b.fileId),
    })
}

export function upsertCachedVersion(
    storageAddress: `0x${string}`,
    fileId: number,
    version: CachedFileVersion
) {
    const current = getCachedStorage(storageAddress)
    if (!current) return

    const nextFiles = current.files.map((file) => {
        if (file.fileId !== fileId) return file

        const nextVersions = [...file.versions]
        const index = nextVersions.findIndex(
            (item) => item.versionNumber === version.versionNumber
        )

        if (index === -1) {
            nextVersions.push(version)
        } else {
            nextVersions[index] = version
        }

        return {
            ...file,
            latestVersionNumber: Math.max(file.latestVersionNumber, version.versionNumber),
            versions: nextVersions.sort((a, b) => a.versionNumber - b.versionNumber),
        }
    })

    saveCachedStorage({
        ...current,
        updatedAt: Date.now(),
        files: nextFiles,
    })
}