import { getCachedStorage } from '@/lib/storageCache'

export type DuplicateMatch = {
    fileId: number
    fileName: string
    versionNumber: number
}

export function findDuplicatesInStorage(
    storageAddress: `0x${string}`,
    fileHash: `0x${string}`
): DuplicateMatch[] {
    const cachedStorage = getCachedStorage(storageAddress)

    if (!cachedStorage) {
        return []
    }

    const normalizedHash = fileHash.toLowerCase()

    const matches: DuplicateMatch[] = []

    for (const file of cachedStorage.files) {
        for (const version of file.versions) {
            if (version.fileHash.toLowerCase() === normalizedHash) {
                matches.push({
                    fileId: file.fileId,
                    fileName: file.name,
                    versionNumber: version.versionNumber,
                })
            }
        }
    }

    return matches
}