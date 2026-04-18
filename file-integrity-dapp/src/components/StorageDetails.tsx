'use client'

import { useReadContract } from 'wagmi'
import { registryAbi } from '@/lib/contracts'

type Props = {
    address: string
}

function isEvmAddress(value: string): value is `0x${string}` {
    return /^0x[a-fA-F0-9]{40}$/.test(value)
}

export default function StorageDetails({ address }: Props) {
    const isValidAddress = isEvmAddress(address)

    const ownerQuery = useReadContract({
        address: isValidAddress ? address : undefined,
        abi: registryAbi,
        functionName: 'storageOwner',
        query: {
            enabled: isValidAddress,
        },
    })

    const factoryQuery = useReadContract({
        address: isValidAddress ? address : undefined,
        abi: registryAbi,
        functionName: 'factory',
        query: {
            enabled: isValidAddress,
        },
    })

    const nextFileIdQuery = useReadContract({
        address: isValidAddress ? address : undefined,
        abi: registryAbi,
        functionName: 'nextFileId',
        query: {
            enabled: isValidAddress,
        },
    })

    if (!isValidAddress) {
        return <p className="empty-text">Invalid storage address.</p>
    }

    if (ownerQuery.isPending || factoryQuery.isPending || nextFileIdQuery.isPending) {
        return <p className="empty-text">Loading storage...</p>
    }

    if (ownerQuery.isError || factoryQuery.isError || nextFileIdQuery.isError) {
        return <p className="empty-text">Failed to load storage.</p>
    }

    const owner = ownerQuery.data as string | undefined
    const factory = factoryQuery.data as string | undefined
    const nextFileId = nextFileIdQuery.data as bigint | undefined

    const filesCount =
        typeof nextFileId === 'bigint'
            ? Math.max(Number(nextFileId) - 1, 0)
            : 0

    return (
        <section className="storage-details">
            <div className="storage-hero">
                <h1 className="page-title">Storage</h1>
                <p className="storage-page-address">{address}</p>
            </div>

            <div className="storage-info-grid">
                <div className="info-card">
                    <h2 className="info-card-title">Owner</h2>
                    <p className="info-card-value">{owner ?? '-'}</p>
                </div>

                <div className="info-card">
                    <h2 className="info-card-title">Factory</h2>
                    <p className="info-card-value">{factory ?? '-'}</p>
                </div>

                <div className="info-card">
                    <h2 className="info-card-title">Files Count</h2>
                    <p className="info-card-value">{filesCount}</p>
                </div>
            </div>
        </section>
    )
}