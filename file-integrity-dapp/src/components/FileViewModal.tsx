'use client'

import { useEffect, useState } from 'react'
import { useReadContract } from 'wagmi'
import { registryAbi } from '@/lib/contracts'
import { resolveStoredBlob } from '@/lib/fileEncryption'

type Props = {
    address: `0x${string}`
    fileId: bigint
    name: string
    description: string
    userAddress: string
    latestVersionNumber: bigint
}

type FileVersionStruct = {
    fileHash: `0x${string}`
    cid: string
    size: bigint
    versionNumber: bigint
    userAddress: string
}

const IPFS_GATEWAY_BASE = 'https://ipfs.io/ipfs/'

export default function FileViewModal({
                                          address,
                                          fileId,
                                          name,
                                          description,
                                          userAddress,
                                          latestVersionNumber,
                                      }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedVersion, setSelectedVersion] = useState(1)
    const [downloading, setDownloading] = useState(false)
    const [downloadError, setDownloadError] = useState('')

    const latestVersion = Number(latestVersionNumber)

    useEffect(() => {
        if (isOpen) {
            setSelectedVersion(Math.max(latestVersion, 1))
            setDownloadError('')
        }
    }, [isOpen, latestVersion])

    const versionQuery = useReadContract({
        address,
        abi: registryAbi,
        functionName: 'getFileVersion',
        args: isOpen ? [fileId, BigInt(selectedVersion)] : undefined,
        query: {
            enabled: isOpen && latestVersion > 0,
            staleTime: Infinity,
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const handleClose = () => {
        setIsOpen(false)
        setDownloadError('')
    }

    const handleDownloadSelectedVersion = async () => {
        if (!versionQuery.data) {
            setDownloadError('Failed to load version metadata.')
            return
        }

        const version = versionQuery.data as FileVersionStruct

        if (!version.cid) {
            setDownloadError('CID is missing.')
            return
        }

        setDownloadError('')
        setDownloading(true)

        try {
            const response = await fetch(`${IPFS_GATEWAY_BASE}${version.cid}`)

            if (!response.ok) {
                throw new Error('Failed to download file from IPFS.')
            }

            const storedBlob = await response.blob()

            const resolved = await resolveStoredBlob(
                storedBlob,
                async () => window.prompt('Enter password to decrypt this version:')
            )

            const objectUrl = URL.createObjectURL(resolved.blob)

            const link = document.createElement('a')
            link.href = objectUrl
            link.download =
                resolved.fileName || name || `file-${Number(fileId)}-v${selectedVersion}`

            document.body.appendChild(link)
            link.click()
            link.remove()

            setTimeout(() => {
                URL.revokeObjectURL(objectUrl)
            }, 1000)
        } catch (err) {
            setDownloadError(err instanceof Error ? err.message : 'Download failed.')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <>
            <button className="secondary-btn" onClick={() => setIsOpen(true)}>
                View
            </button>

            {isOpen && (
                <div className="modal-backdrop" onClick={handleClose}>
                    <div className="modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-top">
                            <h2 className="modal-title">File Details</h2>
                            <button className="modal-close" onClick={handleClose}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="file-view-grid">
                                <div className="file-view-block">
                                    <h3 className="info-card-title">General</h3>
                                    <p className="info-card-value"><strong>Name:</strong> {name}</p>
                                    <p className="info-card-value">
                                        <strong>Description:</strong> {description || 'No description'}
                                    </p>
                                    <p className="info-card-value">
                                        <strong>File ID:</strong> {Number(fileId)}
                                    </p>
                                    <p className="info-card-value">
                                        <strong>Owner:</strong> {userAddress}
                                    </p>
                                    <p className="info-card-value">
                                        <strong>Latest Version:</strong> {latestVersion}
                                    </p>
                                </div>

                                <div className="file-view-block">
                                    <div className="version-nav">
                                        <h3 className="info-card-title">Version</h3>

                                        <div className="version-nav-buttons">
                                            <button
                                                className="secondary-btn"
                                                onClick={() => setSelectedVersion((v) => Math.max(1, v - 1))}
                                                disabled={selectedVersion <= 1}
                                            >
                                                Previous
                                            </button>

                                            <span className="pagination-text">
                        {selectedVersion} / {latestVersion}
                      </span>

                                            <button
                                                className="secondary-btn"
                                                onClick={() =>
                                                    setSelectedVersion((v) => Math.min(latestVersion, v + 1))
                                                }
                                                disabled={selectedVersion >= latestVersion}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>

                                    {versionQuery.isPending && (
                                        <p className="empty-text">Loading version...</p>
                                    )}

                                    {versionQuery.isError && (
                                        <p className="empty-text">Failed to load version.</p>
                                    )}

                                    {!versionQuery.isPending && !versionQuery.isError && versionQuery.data && (
                                        <>
                                            {(() => {
                                                const version = versionQuery.data as FileVersionStruct

                                                return (
                                                    <div className="version-details">
                                                        <p className="info-card-value">
                                                            <strong>Version Number:</strong>{' '}
                                                            {Number(version.versionNumber)}
                                                        </p>
                                                        <p className="info-card-value">
                                                            <strong>Size:</strong> {Number(version.size)} bytes
                                                        </p>
                                                        <p className="info-card-value">
                                                            <strong>User Address:</strong> {version.userAddress}
                                                        </p>
                                                        <p className="info-card-value">
                                                            <strong>CID:</strong> {version.cid}
                                                        </p>
                                                        <p className="info-card-value">
                                                            <strong>Hash:</strong> {version.fileHash}
                                                        </p>

                                                        <div className="view-version-actions">
                                                            <button
                                                                className="secondary-btn"
                                                                onClick={handleDownloadSelectedVersion}
                                                                disabled={downloading}
                                                            >
                                                                {downloading ? 'Downloading...' : 'Download This Version'}
                                                            </button>
                                                        </div>

                                                        {downloadError && (
                                                            <p className="file-action-error">{downloadError}</p>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="secondary-btn" onClick={handleClose}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}