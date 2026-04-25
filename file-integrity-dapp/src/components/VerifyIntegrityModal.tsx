'use client'

import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { registryAbi } from '@/lib/contracts'
import { resolveStoredBlob } from '@/lib/fileEncryption'

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

type IntegrityResult = {
    blockchain: {
        hash: string
        size: number
        cid: string
        versionNumber: number
    }
    local: {
        hash: string
        size: number
        name: string
    }
    ipfs: {
        hash: string
        size: number
    }
    matches: {
        localVsBlockchainHash: boolean
        localVsBlockchainSize: boolean
        ipfsVsBlockchainHash: boolean
        ipfsVsBlockchainSize: boolean
        localVsIpfsHash: boolean
        localVsIpfsSize: boolean
        all: boolean
    }
}

const IPFS_GATEWAY_BASE = 'https://ipfs.io/ipfs/'

function bytesToHex(bytes: Uint8Array) {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

async function sha256FromBlob(blob: Blob): Promise<`0x${string}`> {
    const arrayBuffer = await blob.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hex = bytesToHex(new Uint8Array(digest))
    return `0x${hex}` as `0x${string}`
}

export default function VerifyIntegrityModal({
                                                 address,
                                                 fileId,
                                                 latestVersionNumber,
                                             }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [checking, setChecking] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<IntegrityResult | null>(null)

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

    const handleClose = () => {
        setIsOpen(false)
        setFile(null)
        setChecking(false)
        setError('')
        setResult(null)
    }

    const handleRunCheck = async () => {
        if (!file) {
            setError('Please select a file.')
            return
        }

        if (!versionQuery.data) {
            setError('Failed to load blockchain metadata.')
            return
        }

        const version = versionQuery.data as FileVersionStruct

        if (!version.cid) {
            setError('CID is missing.')
            return
        }

        setError('')
        setResult(null)
        setChecking(true)

        try {
            const blockchainHash = version.fileHash.toLowerCase()
            const blockchainSize = Number(version.size)
            const blockchainCid = version.cid
            const blockchainVersionNumber = Number(version.versionNumber)

            const localHash = (await sha256FromBlob(file)).toLowerCase()
            const localSize = file.size

            const response = await fetch(`${IPFS_GATEWAY_BASE}${blockchainCid}`)

            if (!response.ok) {
                throw new Error('Failed to download file from IPFS.')
            }

            const storedIpfsBlob = await response.blob()

            const resolvedIpfs = await resolveStoredBlob(
                storedIpfsBlob,
                async () => window.prompt('Enter password to decrypt the stored file, if needed:')
            )

            const ipfsHash = (await sha256FromBlob(resolvedIpfs.blob)).toLowerCase()
            const ipfsSize = resolvedIpfs.blob.size

            const matches = {
                localVsBlockchainHash: localHash === blockchainHash,
                localVsBlockchainSize: localSize === blockchainSize,
                ipfsVsBlockchainHash: ipfsHash === blockchainHash,
                ipfsVsBlockchainSize: ipfsSize === blockchainSize,
                localVsIpfsHash: localHash === ipfsHash,
                localVsIpfsSize: localSize === ipfsSize,
                all:
                    localHash === blockchainHash &&
                    localSize === blockchainSize &&
                    ipfsHash === blockchainHash &&
                    ipfsSize === blockchainSize &&
                    localHash === ipfsHash &&
                    localSize === ipfsSize,
            }

            setResult({
                blockchain: {
                    hash: blockchainHash,
                    size: blockchainSize,
                    cid: blockchainCid,
                    versionNumber: blockchainVersionNumber,
                },
                local: {
                    hash: localHash,
                    size: localSize,
                    name: file.name,
                },
                ipfs: {
                    hash: ipfsHash,
                    size: ipfsSize,
                },
                matches,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Integrity check failed.')
        } finally {
            setChecking(false)
        }
    }

    return (
        <>
            <button className="secondary-btn" onClick={() => setIsOpen(true)}>
                Verify Integrity
            </button>

            {isOpen && (
                <div className="modal-backdrop" onClick={handleClose}>
                    <div className="modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-top">
                            <h2 className="modal-title">Verify Integrity</h2>
                            <button className="modal-close" onClick={handleClose}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <p className="info-card-value">
                                <strong>File ID:</strong> {Number(fileId)}
                            </p>
                            <p className="info-card-value">
                                <strong>Latest Version:</strong> {Number(latestVersionNumber)}
                            </p>

                            <label className="form-label">
                                Local File
                                <input
                                    className="form-input"
                                    type="file"
                                    onChange={(event) => {
                                        const nextFile = event.target.files?.[0] ?? null
                                        setFile(nextFile)
                                        setError('')
                                        setResult(null)
                                    }}
                                />
                            </label>

                            {file && (
                                <div className="upload-meta">
                                    <p><strong>Selected file:</strong> {file.name}</p>
                                    <p><strong>Size:</strong> {file.size} bytes</p>
                                </div>
                            )}

                            {versionQuery.isPending && (
                                <p className="empty-text">Loading blockchain metadata...</p>
                            )}

                            {versionQuery.isError && (
                                <p className="form-error">Failed to load blockchain metadata.</p>
                            )}

                            {error && <p className="form-error">{error}</p>}

                            {result && (
                                <div className="integrity-result">
                                    <div className="integrity-status">
                    <span className={result.matches.all ? 'status-ok' : 'status-bad'}>
                      {result.matches.all ? 'Integrity Verified' : 'Integrity Mismatch'}
                    </span>
                                    </div>

                                    <div className="integrity-grid">
                                        <div className="integrity-block">
                                            <h3 className="info-card-title">Blockchain</h3>
                                            <p className="info-card-value">
                                                <strong>Version:</strong> {result.blockchain.versionNumber}
                                            </p>
                                            <p className="info-card-value">
                                                <strong>Size:</strong> {result.blockchain.size} bytes
                                            </p>
                                            <p className="info-card-value">
                                                <strong>CID:</strong> {result.blockchain.cid}
                                            </p>
                                            <p className="info-card-value">
                                                <strong>Hash:</strong> {result.blockchain.hash}
                                            </p>
                                        </div>

                                        <div className="integrity-block">
                                            <h3 className="info-card-title">Local File</h3>
                                            <p className="info-card-value">
                                                <strong>Name:</strong> {result.local.name}
                                            </p>
                                            <p className="info-card-value">
                                                <strong>Size:</strong> {result.local.size} bytes
                                            </p>
                                            <p className="info-card-value">
                                                <strong>Hash:</strong> {result.local.hash}
                                            </p>
                                        </div>

                                        <div className="integrity-block">
                                            <h3 className="info-card-title">IPFS File</h3>
                                            <p className="info-card-value">
                                                <strong>Size:</strong> {result.ipfs.size} bytes
                                            </p>
                                            <p className="info-card-value">
                                                <strong>Hash:</strong> {result.ipfs.hash}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="integrity-checks">
                                        <p className="info-card-value">
                                            <strong>Local vs Blockchain Hash:</strong>{' '}
                                            {result.matches.localVsBlockchainHash ? 'Match' : 'Mismatch'}
                                        </p>
                                        <p className="info-card-value">
                                            <strong>Local vs Blockchain Size:</strong>{' '}
                                            {result.matches.localVsBlockchainSize ? 'Match' : 'Mismatch'}
                                        </p>
                                        <p className="info-card-value">
                                            <strong>IPFS vs Blockchain Hash:</strong>{' '}
                                            {result.matches.ipfsVsBlockchainHash ? 'Match' : 'Mismatch'}
                                        </p>
                                        <p className="info-card-value">
                                            <strong>IPFS vs Blockchain Size:</strong>{' '}
                                            {result.matches.ipfsVsBlockchainSize ? 'Match' : 'Mismatch'}
                                        </p>
                                        <p className="info-card-value">
                                            <strong>Local vs IPFS Hash:</strong>{' '}
                                            {result.matches.localVsIpfsHash ? 'Match' : 'Mismatch'}
                                        </p>
                                        <p className="info-card-value">
                                            <strong>Local vs IPFS Size:</strong>{' '}
                                            {result.matches.localVsIpfsSize ? 'Match' : 'Mismatch'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button className="secondary-btn" onClick={handleClose} disabled={checking}>
                                Close
                            </button>

                            <button
                                className="create-btn"
                                onClick={handleRunCheck}
                                disabled={!file || checking || versionQuery.isPending || versionQuery.isError}
                            >
                                {checking ? 'Checking...' : 'Run Check'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}