'use client'

import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { registryAbi } from '@/lib/contracts'
import { resolveStoredBlob } from '@/lib/fileEncryption'

type Props = {
    address: `0x${string}`
    fileId: bigint
    latestVersionNumber: bigint
    fileName: string
}

type FileVersionStruct = {
    fileHash: `0x${string}`
    cid: string
    size: bigint
    versionNumber: bigint
    userAddress: string
}

const IPFS_GATEWAY_BASE = 'https://ipfs.io/ipfs/'

export default function DownloadFileButton({
                                               address,
                                               fileId,
                                               latestVersionNumber,
                                               fileName,
                                           }: Props) {
    const [downloading, setDownloading] = useState(false)
    const [error, setError] = useState('')

    const versionQuery = useReadContract({
        address,
        abi: registryAbi,
        functionName: 'getFileVersion',
        args: [fileId, latestVersionNumber],
        query: {
            staleTime: Infinity,
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const handleDownload = async () => {
        if (!versionQuery.data) {
            setError('Failed to load latest version metadata.')
            return
        }

        const version = versionQuery.data as FileVersionStruct

        if (!version.cid) {
            setError('CID is missing.')
            return
        }

        setError('')
        setDownloading(true)

        try {
            const response = await fetch(`${IPFS_GATEWAY_BASE}${version.cid}`)

            if (!response.ok) {
                throw new Error('Failed to download file from IPFS.')
            }

            const storedBlob = await response.blob()

            const resolved = await resolveStoredBlob(
                storedBlob,
                async () => window.prompt('Enter password to decrypt this file:')
            )

            const objectUrl = URL.createObjectURL(resolved.blob)

            const link = document.createElement('a')
            link.href = objectUrl
            link.download = resolved.fileName || fileName || `file-${Number(fileId)}`
            document.body.appendChild(link)
            link.click()
            link.remove()

            setTimeout(() => {
                URL.revokeObjectURL(objectUrl)
            }, 1000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Download failed.')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="file-action-block">
            <button
                className="secondary-btn"
                onClick={handleDownload}
                disabled={versionQuery.isPending || versionQuery.isError || downloading}
            >
                {downloading ? 'Downloading...' : 'Download'}
            </button>

            {error && <p className="file-action-error">{error}</p>}
        </div>
    )
}