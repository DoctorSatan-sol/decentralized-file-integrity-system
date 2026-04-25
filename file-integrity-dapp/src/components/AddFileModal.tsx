'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    useAccount,
    useReadContract,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi'
import {
    getFourEverlandSettings,
    sha256File,
    uploadFileToFourEverland,
    type UploadedFileMeta,
} from '@/lib/4Everland'
import { findDuplicatesInStorage, type DuplicateMatch } from '@/lib/duplicateCheck'
import { clearCachedStorage } from '@/lib/storageCache'
import { registryAbi } from '@/lib/contracts'
import { encryptFileWithPassword } from '@/lib/fileEncryption'

type Props = {
    address: string
}

function toEvmAddress(value: string): `0x${string}` | null {
    const trimmed = value.trim()

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        return null
    }

    return trimmed.toLowerCase() as `0x${string}`
}

export default function AddFileModal({ address }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [error, setError] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [password, setPassword] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadedMeta, setUploadedMeta] = useState<UploadedFileMeta | null>(null)

    const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
    const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([])

    const queryClient = useQueryClient()
    const { address: walletAddress, isConnected } = useAccount()

    const storageAddress = toEvmAddress(address)

    const accessQuery = useReadContract({
        address: storageAddress ?? undefined,
        abi: registryAbi,
        functionName: 'authorizedUsers',
        args: walletAddress ? [walletAddress] : undefined,
        query: {
            enabled: Boolean(storageAddress && walletAddress),
            staleTime: 5_000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const canWrite = Boolean(accessQuery.data)
    const isCheckingAccess = accessQuery.isPending

    const { data: txHash, writeContract, isPending: isWriting } = useWriteContract()

    const receipt = useWaitForTransactionReceipt({
        hash: txHash,
    })

    useEffect(() => {
        if (!receipt.isSuccess) return

        if (storageAddress) {
            clearCachedStorage(storageAddress)
        }

        queryClient.invalidateQueries()

        setIsOpen(false)
        setError('')
        setName('')
        setDescription('')
        setPassword('')
        setFile(null)
        setUploadedMeta(null)
        setShowDuplicateConfirm(false)
        setDuplicateMatches([])
    }, [receipt.isSuccess, storageAddress, queryClient])

    const handleOpen = () => {
        const settings = getFourEverlandSettings()

        if (!isConnected || !walletAddress) {
            setError('Connect your wallet first.')
            return
        }

        if (!storageAddress) {
            setError('Invalid storage address.')
            return
        }

        if (isCheckingAccess) {
            setError('Checking access...')
            return
        }

        if (!canWrite) {
            setError('You do not have permission to add files to this storage.')
            return
        }

        if (!settings) {
            setError('Please fill in your 4EVERLAND settings first.')
            return
        }

        setError('')
        setIsOpen(true)
    }

    const handleClose = () => {
        setIsOpen(false)
        setError('')
        setPassword('')
        setFile(null)
        setUploadedMeta(null)
        setShowDuplicateConfirm(false)
        setDuplicateMatches([])
    }

    const performUpload = async () => {
        if (!canWrite) {
            setError('You do not have permission to add files to this storage.')
            return
        }

        if (!file) {
            setError('Please select a file.')
            return
        }

        const settings = getFourEverlandSettings()

        if (!settings) {
            setError('Please fill in your 4EVERLAND settings first.')
            return
        }

        setError('')
        setUploading(true)

        try {
            const originalHash = await sha256File(file)
            const originalSize = file.size
            const fileToUpload = password.trim()
                ? await encryptFileWithPassword(file, password)
                : file

            const uploaded = await uploadFileToFourEverland(fileToUpload, settings)

            const meta: UploadedFileMeta = {
                ...uploaded,
                fileHash: originalHash,
                size: originalSize,
                originalName: file.name,
            }

            setUploadedMeta(meta)
            setShowDuplicateConfirm(false)
            setDuplicateMatches([])

            if (!name.trim()) {
                setName(file.name)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed.')
        } finally {
            setUploading(false)
        }
    }

    const handleUpload = async () => {
        if (!canWrite) {
            setError('You do not have permission to add files to this storage.')
            return
        }

        if (!file) {
            setError('Please select a file.')
            return
        }

        if (!storageAddress) {
            setError('Invalid storage address.')
            return
        }

        setError('')
        setUploadedMeta(null)
        setShowDuplicateConfirm(false)
        setDuplicateMatches([])

        try {
            const localHash = await sha256File(file)
            const duplicates = findDuplicatesInStorage(storageAddress, localHash)

            if (duplicates.length > 0) {
                setDuplicateMatches(duplicates)
                setShowDuplicateConfirm(true)
                return
            }

            await performUpload()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Duplicate check failed.')
        }
    }

    const handleContinueDuplicateUpload = async () => {
        await performUpload()
    }

    const handleCreateFile = () => {
        if (!canWrite) {
            setError('You do not have permission to add files to this storage.')
            return
        }

        if (!storageAddress) {
            setError('Invalid storage address.')
            return
        }

        if (!uploadedMeta) {
            setError('Upload the file to IPFS first.')
            return
        }

        if (!name.trim()) {
            setError('Please enter a file name.')
            return
        }

        setError('')

        writeContract({
            address: storageAddress,
            abi: registryAbi,
            functionName: 'createFile',
            args: [
                name.trim(),
                description.trim(),
                BigInt(uploadedMeta.size),
                uploadedMeta.fileHash,
                uploadedMeta.cid,
            ],
        })
    }

    const isBusy = uploading || isWriting || receipt.isLoading

    return (
        <>
            <button
                className="create-btn"
                onClick={handleOpen}
                disabled={!isConnected || isCheckingAccess || !canWrite}
            >
                {isCheckingAccess ? 'Checking Access...' : 'Add File'}
            </button>

            {error && !isOpen && <p className="form-error top-error">{error}</p>}

            {isOpen && (
                <div className="modal-backdrop" onClick={handleClose}>
                    <div className="modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-top">
                            <h2 className="modal-title">Add File</h2>
                            <button className="modal-close" onClick={handleClose}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <label className="form-label">
                                Name
                                <input
                                    className="form-input"
                                    type="text"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="File name"
                                />
                            </label>

                            <label className="form-label">
                                Description
                                <textarea
                                    className="form-textarea"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    placeholder="File description"
                                    rows={4}
                                />
                            </label>

                            <label className="form-label">
                                Password for encryption (optional)
                                <input
                                    className="form-input"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Leave empty to upload without encryption"
                                />
                            </label>

                            <label className="form-label">
                                File
                                <input
                                    className="form-input"
                                    type="file"
                                    onChange={(event) => {
                                        const nextFile = event.target.files?.[0] ?? null
                                        setFile(nextFile)
                                        setUploadedMeta(null)
                                        setError('')
                                        setShowDuplicateConfirm(false)
                                        setDuplicateMatches([])
                                    }}
                                />
                            </label>

                            {file && !uploadedMeta && (
                                <div className="upload-meta">
                                    <p><strong>Selected file:</strong> {file.name}</p>
                                    <p><strong>Size:</strong> {file.size} bytes</p>
                                    <p>
                                        <strong>Encryption:</strong>{' '}
                                        {password.trim() ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                            )}

                            {showDuplicateConfirm && (
                                <div className="upload-meta">
                                    <p className="form-error">
                                        Duplicate hash found in this storage.
                                    </p>

                                    {duplicateMatches.map((match, index) => (
                                        <p key={`${match.fileId}-${match.versionNumber}-${index}`}>
                                            <strong>File ID:</strong> {match.fileId} |{' '}
                                            <strong>Name:</strong> {match.fileName} |{' '}
                                            <strong>Version:</strong> {match.versionNumber}
                                        </p>
                                    ))}

                                    <p>Do you want to cancel or continue anyway?</p>

                                    <div className="modal-actions">
                                        <button
                                            className="secondary-btn"
                                            onClick={() => {
                                                setShowDuplicateConfirm(false)
                                                setDuplicateMatches([])
                                            }}
                                            disabled={isBusy}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            className="create-btn"
                                            onClick={handleContinueDuplicateUpload}
                                            disabled={isBusy}
                                        >
                                            Continue Anyway
                                        </button>
                                    </div>
                                </div>
                            )}

                            {uploadedMeta && (
                                <div className="upload-meta">
                                    <p><strong>CID:</strong> {uploadedMeta.cid}</p>
                                    <p><strong>Hash:</strong> {uploadedMeta.fileHash}</p>
                                    <p><strong>Size:</strong> {uploadedMeta.size} bytes</p>
                                    <p>
                                        <strong>Encryption:</strong>{' '}
                                        {password.trim() ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                            )}

                            {error && <p className="form-error">{error}</p>}
                        </div>

                        <div className="modal-actions">
                            <button
                                className="secondary-btn"
                                onClick={handleClose}
                                disabled={isBusy}
                            >
                                Cancel
                            </button>

                            <button
                                className="secondary-btn"
                                onClick={handleUpload}
                                disabled={!file || isBusy}
                            >
                                {uploading ? 'Uploading...' : 'Upload to IPFS'}
                            </button>

                            <button
                                className="create-btn"
                                onClick={handleCreateFile}
                                disabled={!uploadedMeta || isBusy}
                            >
                                {isWriting || receipt.isLoading ? 'Sending...' : 'Create File'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}