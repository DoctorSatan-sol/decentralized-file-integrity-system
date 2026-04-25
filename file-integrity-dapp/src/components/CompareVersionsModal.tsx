'use client'

import { useEffect, useMemo, useState } from 'react'
import { useReadContract } from 'wagmi'
import { registryAbi } from '@/lib/contracts'
import { detectTextFromBlob, resolveStoredBlob } from '@/lib/fileEncryption'

type Props = {
    address: `0x${string}`
    fileId: bigint
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

export default function CompareVersionsModal({
                                                 address,
                                                 fileId,
                                                 latestVersionNumber,
                                             }: Props) {
    const [isOpen, setIsOpen] = useState(false)

    const latestVersion = Number(latestVersionNumber)
    const hasEnoughVersions = latestVersion >= 2

    const versionOptions = useMemo(() => {
        return Array.from({ length: latestVersion }, (_, index) => index + 1)
    }, [latestVersion])

    const [selectedVersionA, setSelectedVersionA] = useState(1)
    const [selectedVersionB, setSelectedVersionB] = useState(
        Math.max(latestVersion, 1)
    )

    const [isTextFile, setIsTextFile] = useState(false)
    const [textA, setTextA] = useState('')
    const [textB, setTextB] = useState('')
    const [textLoading, setTextLoading] = useState(false)
    const [textError, setTextError] = useState('')

    useEffect(() => {
        if (!isOpen) return

        setSelectedVersionA(1)
        setSelectedVersionB(Math.max(latestVersion, 1))
        setIsTextFile(false)
        setTextA('')
        setTextB('')
        setTextError('')
    }, [isOpen, latestVersion])

    const versionAQuery = useReadContract({
        address,
        abi: registryAbi,
        functionName: 'getFileVersion',
        args:
            isOpen && hasEnoughVersions
                ? [fileId, BigInt(selectedVersionA)]
                : undefined,
        query: {
            enabled: isOpen && hasEnoughVersions,
            staleTime: Infinity,
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const versionBQuery = useReadContract({
        address,
        abi: registryAbi,
        functionName: 'getFileVersion',
        args:
            isOpen && hasEnoughVersions
                ? [fileId, BigInt(selectedVersionB)]
                : undefined,
        query: {
            enabled: isOpen && hasEnoughVersions,
            staleTime: Infinity,
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const handleClose = () => {
        setIsOpen(false)
    }

    const versionA =
        !versionAQuery.isPending && !versionAQuery.isError && versionAQuery.data
            ? (versionAQuery.data as FileVersionStruct)
            : null

    const versionB =
        !versionBQuery.isPending && !versionBQuery.isError && versionBQuery.data
            ? (versionBQuery.data as FileVersionStruct)
            : null

    useEffect(() => {
        if (!isOpen || !versionA || !versionB) {
            setIsTextFile(false)
            setTextA('')
            setTextB('')
            setTextError('')
            return
        }

        let isCancelled = false

        const loadTexts = async () => {
            setTextLoading(true)
            setTextError('')
            setIsTextFile(false)
            setTextA('')
            setTextB('')

            try {
                const [responseA, responseB] = await Promise.all([
                    fetch(`${IPFS_GATEWAY_BASE}${versionA.cid}`),
                    fetch(`${IPFS_GATEWAY_BASE}${versionB.cid}`),
                ])

                if (!responseA.ok || !responseB.ok) {
                    throw new Error('Failed to load one or both versions from IPFS.')
                }

                const [storedBlobA, storedBlobB] = await Promise.all([
                    responseA.blob(),
                    responseB.blob(),
                ])

                let sharedPassword: string | null | undefined = undefined

                const getPassword = async () => {
                    if (sharedPassword !== undefined) {
                        return sharedPassword
                    }

                    const value = window.prompt('Enter password to decrypt file versions, if needed:')
                    sharedPassword = value

                    return sharedPassword
                }

                const [resolvedA, resolvedB] = await Promise.all([
                    resolveStoredBlob(storedBlobA, getPassword),
                    resolveStoredBlob(storedBlobB, getPassword),
                ])

                const [detectedA, detectedB] = await Promise.all([
                    detectTextFromBlob(resolvedA.blob),
                    detectTextFromBlob(resolvedB.blob),
                ])

                if (isCancelled) return

                const bothText = detectedA.isText && detectedB.isText

                setIsTextFile(bothText)

                if (bothText) {
                    setTextA(detectedA.text)
                    setTextB(detectedB.text)
                }
            } catch (err) {
                if (isCancelled) return
                setTextError(err instanceof Error ? err.message : 'Failed to load text diff.')
            } finally {
                if (!isCancelled) {
                    setTextLoading(false)
                }
            }
        }

        loadTexts()

        return () => {
            isCancelled = true
        }
    }, [isOpen, versionA, versionB])

    const comparison =
        versionA && versionB
            ? {
                sameVersionNumber:
                    Number(versionA.versionNumber) === Number(versionB.versionNumber),
                sameSize: Number(versionA.size) === Number(versionB.size),
                sameUserAddress:
                    versionA.userAddress.toLowerCase() ===
                    versionB.userAddress.toLowerCase(),
                sameCid: versionA.cid === versionB.cid,
                sameHash:
                    versionA.fileHash.toLowerCase() ===
                    versionB.fileHash.toLowerCase(),
            }
            : null

    const allEqual =
        comparison &&
        comparison.sameVersionNumber &&
        comparison.sameSize &&
        comparison.sameUserAddress &&
        comparison.sameCid &&
        comparison.sameHash

    const diffRows = useMemo(() => {
        if (!isTextFile) return []

        const leftLines = textA.split('\n')
        const rightLines = textB.split('\n')
        const maxLines = Math.max(leftLines.length, rightLines.length)

        return Array.from({ length: maxLines }, (_, index) => {
            const left = leftLines[index] ?? ''
            const right = rightLines[index] ?? ''

            return {
                lineNumber: index + 1,
                left,
                right,
                changed: left !== right,
            }
        })
    }, [isTextFile, textA, textB])

    return (
        <>
            <button
                className="secondary-btn"
                onClick={() => setIsOpen(true)}
                disabled={!hasEnoughVersions}
            >
                Compare Versions
            </button>

            {isOpen && (
                <div className="modal-backdrop" onClick={handleClose}>
                    <div
                        className="modal modal-large"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-top">
                            <h2 className="modal-title">Compare Versions</h2>
                            <button className="modal-close" onClick={handleClose}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <p className="info-card-value">
                                <strong>File ID:</strong> {Number(fileId)}
                            </p>

                            {!hasEnoughVersions && (
                                <p className="empty-text">
                                    At least 2 versions are required for comparison.
                                </p>
                            )}

                            {hasEnoughVersions && (
                                <>
                                    <div className="compare-selectors">
                                        <label className="form-label">
                                            Version A
                                            <select
                                                className="form-input"
                                                value={selectedVersionA}
                                                onChange={(event) =>
                                                    setSelectedVersionA(Number(event.target.value))
                                                }
                                            >
                                                {versionOptions.map((version) => (
                                                    <option key={version} value={version}>
                                                        Version {version}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="form-label">
                                            Version B
                                            <select
                                                className="form-input"
                                                value={selectedVersionB}
                                                onChange={(event) =>
                                                    setSelectedVersionB(Number(event.target.value))
                                                }
                                            >
                                                {versionOptions.map((version) => (
                                                    <option key={version} value={version}>
                                                        Version {version}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    {(versionAQuery.isPending || versionBQuery.isPending) && (
                                        <p className="empty-text">Loading versions...</p>
                                    )}

                                    {(versionAQuery.isError || versionBQuery.isError) && (
                                        <p className="form-error">
                                            Failed to load one or both versions.
                                        </p>
                                    )}

                                    {versionA && versionB && comparison && (
                                        <div className="compare-result">
                                            <div className="integrity-status">
                        <span className={allEqual ? 'status-ok' : 'status-bad'}>
                          {allEqual ? 'Versions Match' : 'Versions Differ'}
                        </span>
                                            </div>

                                            <div className="compare-grid">
                                                <div className="compare-block">
                                                    <h3 className="info-card-title">
                                                        Version {Number(versionA.versionNumber)}
                                                    </h3>
                                                    <p className="info-card-value">
                                                        <strong>Size:</strong> {Number(versionA.size)} bytes
                                                    </p>
                                                    <p className="info-card-value">
                                                        <strong>User Address:</strong> {versionA.userAddress}
                                                    </p>
                                                    <p className="info-card-value">
                                                        <strong>CID:</strong> {versionA.cid}
                                                    </p>
                                                    <p className="info-card-value">
                                                        <strong>Hash:</strong> {versionA.fileHash}
                                                    </p>
                                                </div>

                                                <div className="compare-block">
                                                    <h3 className="info-card-title">
                                                        Version {Number(versionB.versionNumber)}
                                                    </h3>
                                                    <p className="info-card-value">
                                                        <strong>Size:</strong> {Number(versionB.size)} bytes
                                                    </p>
                                                    <p className="info-card-value">
                                                        <strong>User Address:</strong> {versionB.userAddress}
                                                    </p>
                                                    <p className="info-card-value">
                                                        <strong>CID:</strong> {versionB.cid}
                                                    </p>
                                                    <p className="info-card-value">
                                                        <strong>Hash:</strong> {versionB.fileHash}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="integrity-checks">
                                                <p className="info-card-value">
                                                    <strong>Version Number:</strong>{' '}
                                                    {comparison.sameVersionNumber ? 'Match' : 'Different'}
                                                </p>
                                                <p className="info-card-value">
                                                    <strong>Size:</strong>{' '}
                                                    {comparison.sameSize ? 'Match' : 'Different'}
                                                </p>
                                                <p className="info-card-value">
                                                    <strong>User Address:</strong>{' '}
                                                    {comparison.sameUserAddress ? 'Match' : 'Different'}
                                                </p>
                                                <p className="info-card-value">
                                                    <strong>CID:</strong>{' '}
                                                    {comparison.sameCid ? 'Match' : 'Different'}
                                                </p>
                                                <p className="info-card-value">
                                                    <strong>Hash:</strong>{' '}
                                                    {comparison.sameHash ? 'Match' : 'Different'}
                                                </p>
                                            </div>

                                            {isTextFile ? (
                                                <div className="text-diff-section">
                                                    <h3 className="info-card-title">Text Difference</h3>

                                                    {textLoading && (
                                                        <p className="empty-text">Loading text diff...</p>
                                                    )}

                                                    {textError && <p className="form-error">{textError}</p>}

                                                    {!textLoading && !textError && diffRows.length > 0 && (
                                                        <div className="text-diff-table">
                                                            <div className="text-diff-header">
                                                                <div>Version {selectedVersionA}</div>
                                                                <div>Version {selectedVersionB}</div>
                                                            </div>

                                                            {diffRows.map((row) => (
                                                                <div
                                                                    key={row.lineNumber}
                                                                    className={`text-diff-row ${
                                                                        row.changed ? 'text-diff-row-changed' : ''
                                                                    }`}
                                                                >
                                                                    <div className="text-diff-cell">
                                    <span className="text-diff-line-number">
                                      {row.lineNumber}
                                    </span>
                                                                        <pre className="text-diff-code">
                                      {row.left}
                                    </pre>
                                                                    </div>

                                                                    <div className="text-diff-cell">
                                    <span className="text-diff-line-number">
                                      {row.lineNumber}
                                    </span>
                                                                        <pre className="text-diff-code">
                                      {row.right}
                                    </pre>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {!textLoading && !textError && diffRows.length === 0 && (
                                                        <p className="empty-text">
                                                            No text content to compare.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="empty-text">
                                                    Text diff is not available for this file type.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
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