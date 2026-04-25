type CachedFileVersion = {
    fileHash: `0x${string}`
    cid: string
    size: number
    versionNumber: number
    userAddress: string
}

type CachedFile = {
    fileId: number
    name: string
    description: string
    userAddress: string
    latestVersionNumber: number
    exists: boolean
    versions: CachedFileVersion[]
}

export type FileSearchResult = {
    fileId: number
    name: string
    description: string
    userAddress: string
    latestVersionNumber: number
    matchedBy: string[]
}

function normalize(value: string) {
    return value.trim().toLowerCase()
}

function isNumericQuery(value: string) {
    return /^\d+$/.test(value)
}

function isAddressLikeQuery(value: string) {
    return value.startsWith('0x') || value.length >= 8
}

function isCidLikeQuery(value: string) {
    return value.startsWith('bafy') || value.startsWith('qm') || value.length >= 8
}

export function searchFiles(files: CachedFile[], query: string): FileSearchResult[] {
    const normalized = normalize(query)

    if (!normalized) {
        return files.map((file) => ({
            fileId: file.fileId,
            name: file.name,
            description: file.description,
            userAddress: file.userAddress,
            latestVersionNumber: file.latestVersionNumber,
            matchedBy: [],
        }))
    }

    const queryIsNumeric = isNumericQuery(normalized)
    const queryLooksTechnical =
        normalized.startsWith('0x') ||
        normalized.startsWith('bafy') ||
        normalized.startsWith('qm') ||
        normalized.length >= 8

    return files
        .map((file) => {
            const matchedBy = new Set<string>()

            const fileIdString = String(file.fileId)
            const name = normalize(file.name)
            const description = normalize(file.description)
            const userAddress = normalize(file.userAddress)

            if (name.includes(normalized)) matchedBy.add('name')
            if (description.includes(normalized)) matchedBy.add('description')

            if (queryIsNumeric) {
                if (fileIdString === normalized || fileIdString.startsWith(normalized)) {
                    matchedBy.add('fileId')
                }
            }

            if (queryLooksTechnical) {
                if (userAddress.includes(normalized)) matchedBy.add('userAddress')

                for (const version of file.versions) {
                    if (normalize(version.fileHash).includes(normalized)) matchedBy.add('hash')
                    if (normalize(version.cid).includes(normalized)) matchedBy.add('cid')
                    if (normalize(version.userAddress).includes(normalized)) matchedBy.add('versionUser')
                }
            }

            if (matchedBy.size === 0) return null

            return {
                fileId: file.fileId,
                name: file.name,
                description: file.description,
                userAddress: file.userAddress,
                latestVersionNumber: file.latestVersionNumber,
                matchedBy: Array.from(matchedBy),
            }
        })
        .filter((item): item is FileSearchResult => item !== null)
}