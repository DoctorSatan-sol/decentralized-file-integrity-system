'use client'

import { useEffect } from 'react'
import { readContracts } from '@wagmi/core'
import { useReadContract } from 'wagmi'
import { config } from '@/app/config'
import { registryAbi } from '@/lib/contracts'
import {
    isFileFullyCached,
    upsertCachedFile,
    upsertCachedVersion,
} from '@/lib/storageCache'
import FileViewModal from './FileViewModal'
import DownloadFileButton from './DownloadFileButton'
import AddVersionModal from './AddVersionModal'
import VerifyIntegrityModal from './VerifyIntegrityModal'
import CompareVersionsModal from './CompareVersionsModal'

type Props = {
    address: `0x${string}`
    fileId: number
}

type FileStruct = {
    fileId: bigint
    name: string
    description: string
    userAddress: string
    latestVersionNumber: bigint
    exists: boolean
}

type FileVersionStruct = {
    fileHash: `0x${string}`
    cid: string
    size: bigint
    versionNumber: bigint
    userAddress: string
}

export default function StorageFileCard({ address, fileId }: Props) {
    const fileQuery = useReadContract({
        address,
        abi: registryAbi,
        functionName: 'getFile',
        args: [BigInt(fileId)],
        query: {
            staleTime: Infinity,
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    useEffect(() => {
        if (!fileQuery.data) return

        const file = fileQuery.data as FileStruct
        if (!file.exists) return

        const latestVersionNumber = Number(file.latestVersionNumber)

        upsertCachedFile(address, {
            fileId: Number(file.fileId),
            name: file.name,
            description: file.description,
            userAddress: file.userAddress,
            latestVersionNumber,
            exists: file.exists,
            versions: [],
        })

        if (latestVersionNumber <= 0) return
        if (isFileFullyCached(address, Number(file.fileId), latestVersionNumber)) return

        let cancelled = false

        const loadVersions = async () => {
            try {
                const contracts = Array.from({ length: latestVersionNumber }, (_, index) => ({
                    address,
                    abi: registryAbi,
                    functionName: 'getFileVersion' as const,
                    args: [BigInt(fileId), BigInt(index + 1)] as const,
                }))

                const results = await readContracts(config, {
                    contracts,
                    allowFailure: false,
                })

                if (cancelled) return

                results.forEach((result) => {
                    const version = result as FileVersionStruct

                    upsertCachedVersion(address, fileId, {
                        fileHash: version.fileHash,
                        cid: version.cid,
                        size: Number(version.size),
                        versionNumber: Number(version.versionNumber),
                        userAddress: version.userAddress,
                    })
                })
            } catch (error) {
                console.error('Failed to cache file versions', error)
            }
        }

        loadVersions()

        return () => {
            cancelled = true
        }
    }, [address, fileId, fileQuery.data])

    if (fileQuery.isPending) {
        return (
            <div className="file-card">
                <p className="empty-text">Loading file #{fileId}...</p>
            </div>
        )
    }

    if (fileQuery.isError || !fileQuery.data) {
        return (
            <div className="file-card">
                <p className="empty-text">Failed to load file #{fileId}.</p>
            </div>
        )
    }

    const file = fileQuery.data as FileStruct

    if (!file.exists) {
        return null
    }

    return (
        <div className="file-card">
            <div className="file-card-top">
                <div>
                    <h3 className="file-card-title">{file.name}</h3>
                    <p className="file-card-id">File ID: {Number(file.fileId)}</p>
                </div>

                <span className="file-version-badge">
          Version {Number(file.latestVersionNumber)}
        </span>
            </div>

            <p className="file-card-description">
                {file.description || 'No description'}
            </p>

            <div className="file-meta">
                <p>
                    <strong>Owner:</strong> {file.userAddress}
                </p>
            </div>

            <div className="file-actions">
                <FileViewModal
                    address={address}
                    fileId={file.fileId}
                    name={file.name}
                    description={file.description}
                    userAddress={file.userAddress}
                    latestVersionNumber={file.latestVersionNumber}
                />

                <DownloadFileButton
                    address={address}
                    fileId={file.fileId}
                    latestVersionNumber={file.latestVersionNumber}
                    fileName={file.name}
                />

                <AddVersionModal
                    address={address}
                    fileId={file.fileId}
                    latestVersionNumber={file.latestVersionNumber}
                />

                <VerifyIntegrityModal
                    address={address}
                    fileId={file.fileId}
                    latestVersionNumber={file.latestVersionNumber}
                />

                <CompareVersionsModal
                    address={address}
                    fileId={file.fileId}
                    latestVersionNumber={file.latestVersionNumber}
                />
            </div>
        </div>
    )
}