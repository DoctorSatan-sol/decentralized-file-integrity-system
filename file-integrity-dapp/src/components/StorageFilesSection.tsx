'use client'

import { useEffect, useMemo, useState } from 'react'
import { useReadContract } from 'wagmi'
import { registryAbi } from '@/lib/contracts'
import {
    CACHE_UPDATED_EVENT,
    getCachedStorage,
} from '@/lib/storageCache'
import { searchFiles } from '@/lib/searchIndex'
import StorageFileCard from './StorageFileCard'
import StorageSearch from './StorageSearch'

type Props = {
    address: string
}

function toEvmAddress(value: string): `0x${string}` | null {
    return /^0x[a-fA-F0-9]{40}$/.test(value)
        ? (value as `0x${string}`)
        : null
}

export default function StorageFilesSection({ address }: Props) {
    const storageAddress = toEvmAddress(address)
    const [searchQuery, setSearchQuery] = useState('')
    const [cacheVersion, setCacheVersion] = useState(0)

    useEffect(() => {
        const handleRefresh = (event?: Event) => {
            if (event instanceof CustomEvent) {
                const updatedStorageAddress = event.detail?.storageAddress

                if (
                    updatedStorageAddress &&
                    storageAddress &&
                    updatedStorageAddress !== storageAddress.toLowerCase()
                ) {
                    return
                }
            }

            setCacheVersion((value) => value + 1)
        }

        window.addEventListener('storage', handleRefresh)
        window.addEventListener(CACHE_UPDATED_EVENT, handleRefresh as EventListener)

        return () => {
            window.removeEventListener('storage', handleRefresh)
            window.removeEventListener(CACHE_UPDATED_EVENT, handleRefresh as EventListener)
        }
    }, [storageAddress])

    const nextFileIdQuery = useReadContract({
        address: storageAddress ?? undefined,
        abi: registryAbi,
        functionName: 'nextFileId',
        query: {
            enabled: Boolean(storageAddress),
            staleTime: 60_000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const cachedStorage = useMemo(() => {
        if (!storageAddress) return null
        return getCachedStorage(storageAddress)
    }, [storageAddress, cacheVersion])

    if (!storageAddress) {
        return <p className="empty-text">Invalid storage address.</p>
    }

    if (nextFileIdQuery.isPending) {
        return <p className="empty-text">Loading files...</p>
    }

    if (nextFileIdQuery.isError || nextFileIdQuery.data === undefined) {
        return <p className="empty-text">Failed to load files.</p>
    }

    const nextFileId = Number(nextFileIdQuery.data)
    const filesCount = Math.max(nextFileId - 1, 0)

    const allFileIds = Array.from({ length: filesCount }, (_, index) => index + 1)

    const matchedFileIds = useMemo(() => {
        if (!searchQuery.trim()) {
            return allFileIds
        }

        if (!cachedStorage) {
            return []
        }

        return searchFiles(cachedStorage.files, searchQuery).map((item) => item.fileId)
    }, [allFileIds, cachedStorage, searchQuery])

    const isIndexing =
        !!searchQuery.trim() &&
        filesCount > 0 &&
        (!cachedStorage || cachedStorage.files.length < filesCount)

    return (
        <section className="storage-files-section">
            <div className="storage-files-top">
                <h2 className="section-title">Files</h2>
                <p className="section-subtitle">Total files: {filesCount}</p>
            </div>

            {filesCount > 0 && (
                <StorageSearch
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    totalFiles={filesCount}
                    visibleFiles={matchedFileIds.length}
                    isIndexing={isIndexing}
                />
            )}

            {filesCount === 0 ? (
                <p className="empty-text">This storage does not have any files yet.</p>
            ) : matchedFileIds.length === 0 && searchQuery.trim() && !isIndexing ? (
                <p className="empty-text">No matching files found.</p>
            ) : (
                <div className="files-grid">
                    {matchedFileIds.map((fileId) => (
                        <StorageFileCard
                            key={fileId}
                            address={storageAddress}
                            fileId={fileId}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}