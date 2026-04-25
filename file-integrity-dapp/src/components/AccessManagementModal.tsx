'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { registryAbi } from '@/lib/contracts'

type Props = {
    storageAddress: `0x${string}`
}

function toEvmAddress(value: string): `0x${string}` | null {
    const trimmed = value.trim()

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        return null
    }

    return trimmed.toLowerCase() as `0x${string}`
}

export default function AccessManagementModal({ storageAddress }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [targetInput, setTargetInput] = useState('')
    const [statusMessage, setStatusMessage] = useState('')

    const { address: connectedAddress } = useAccount()
    const targetAddress = useMemo(() => toEvmAddress(targetInput), [targetInput])

    const ownerQuery = useReadContract({
        address: storageAddress,
        abi: registryAbi,
        functionName: 'storageOwner',
        query: {
            staleTime: 60_000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const selfAuthorizedQuery = useReadContract({
        address: storageAddress,
        abi: registryAbi,
        functionName: 'authorizedUsers',
        args: connectedAddress ? [connectedAddress] : undefined,
        query: {
            enabled: Boolean(connectedAddress),
            staleTime: 5_000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const authorizedQuery = useReadContract({
        address: storageAddress,
        abi: registryAbi,
        functionName: 'authorizedUsers',
        args: targetAddress ? [targetAddress] : undefined,
        query: {
            enabled: Boolean(targetAddress),
            staleTime: 5_000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    })

    const { data: txHash, writeContract, isPending: isWriting } = useWriteContract()

    const receipt = useWaitForTransactionReceipt({
        hash: txHash,
    })

    const storageOwner = ownerQuery.data as `0x${string}` | undefined

    const isOwner =
        !!connectedAddress &&
        !!storageOwner &&
        connectedAddress.toLowerCase() === storageOwner.toLowerCase()

    const isSelfAuthorized = Boolean(selfAuthorizedQuery.data)

    const currentUserRole = isOwner
        ? 'Owner'
        : isSelfAuthorized
            ? 'Authorized User'
            : 'Viewer'

    const targetIsOwner =
        !!targetAddress &&
        !!storageOwner &&
        targetAddress.toLowerCase() === storageOwner.toLowerCase()

    const isAuthorized =
        typeof authorizedQuery.data === 'boolean' ? authorizedQuery.data : false

    useEffect(() => {
        if (!receipt.isSuccess) return

        setStatusMessage('Access updated successfully.')
        authorizedQuery.refetch()
    }, [receipt.isSuccess])

    const handleClose = () => {
        setIsOpen(false)
        setStatusMessage('')
    }

    const handleGrant = () => {
        if (!targetAddress) {
            setStatusMessage('Enter a valid wallet address.')
            return
        }

        writeContract({
            address: storageAddress,
            abi: registryAbi,
            functionName: 'grantEditorAccess',
            args: [targetAddress],
        })
    }

    const handleRevoke = () => {
        if (!targetAddress) {
            setStatusMessage('Enter a valid wallet address.')
            return
        }

        writeContract({
            address: storageAddress,
            abi: registryAbi,
            functionName: 'revokeEditorAccess',
            args: [targetAddress],
        })
    }

    const renderStatus = () => {
        if (!targetInput.trim()) return 'Enter wallet address'
        if (!targetAddress) return 'Invalid address'
        if (!storageOwner) return 'Loading owner...'
        if (targetIsOwner) return 'Owner'
        if (authorizedQuery.isPending) return 'Checking access...'
        if (authorizedQuery.isError) return 'Failed to check access'
        return isAuthorized ? 'Authorized' : 'Not Authorized'
    }

    const isBusy = isWriting || receipt.isLoading

    return (
        <>
            <button className="secondary-btn" onClick={() => setIsOpen(true)}>
                Access Management
            </button>

            {isOpen && (
                <div className="modal-backdrop" onClick={handleClose}>
                    <div className="modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-top">
                            <h2 className="modal-title">Access Management</h2>
                            <button className="modal-close" onClick={handleClose}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <p className="info-card-value">
                                <strong>Storage Owner:</strong> {storageOwner ?? 'Loading...'}
                            </p>

                            <p className="info-card-value">
                                <strong>Your Role:</strong> {currentUserRole}
                            </p>

                            <label className="form-label">
                                Wallet Address
                                Wallet Address
                                <input
                                    className="form-input"
                                    type="text"
                                    value={targetInput}
                                    onChange={(event) => {
                                        setTargetInput(event.target.value.trim())
                                        setStatusMessage('')
                                    }}
                                    placeholder="0x..."
                                />
                            </label>

                            <div className="upload-meta">
                                <p>
                                    <strong>Status:</strong> {renderStatus()}
                                </p>
                            </div>

                            {statusMessage && <p className="form-error">{statusMessage}</p>}
                        </div>

                        <div className="modal-actions">
                            <button className="secondary-btn" onClick={handleClose} disabled={isBusy}>
                                Close
                            </button>

                            {isOwner && (
                                <>
                                    <button
                                        className="secondary-btn"
                                        onClick={handleGrant}
                                        disabled={
                                            isBusy ||
                                            !targetAddress ||
                                            targetIsOwner ||
                                            isAuthorized
                                        }
                                    >
                                        Grant Access
                                    </button>

                                    <button
                                        className="create-btn"
                                        onClick={handleRevoke}
                                        disabled={
                                            isBusy ||
                                            !targetAddress ||
                                            targetIsOwner ||
                                            !isAuthorized
                                        }
                                    >
                                        Revoke Access
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}