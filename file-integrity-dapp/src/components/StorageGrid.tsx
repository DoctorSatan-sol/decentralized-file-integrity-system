'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { FACTORY_ADDRESS, factoryAbi } from '@/lib/contracts'
import StorageCard from './StorageCard'

const PAGE_SIZE = 6

type EvmAddress = `0x${string}`

export default function StorageGrid() {
    const { address, isConnected } = useAccount()
    const [page, setPage] = useState(1)

    const countQuery = useReadContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'userRegistryCount',
        args: address ? [address] : undefined,
        query: {
            enabled: Boolean(address),
        },
    })

    const totalCount = Number(countQuery.data ?? 0)
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    const offset = (page - 1) * PAGE_SIZE

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages)
        }
    }, [page, totalPages])

    const shouldLoadPage = Boolean(address && totalCount > 0)

    const pageQuery = useReadContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'getUserRegistriesPage',
        args: shouldLoadPage
            ? [address as `0x${string}`, BigInt(offset), BigInt(PAGE_SIZE)]
            : undefined,
        query: {
            enabled: shouldLoadPage,
        },
    })

    const storages = useMemo(
        () => ((pageQuery.data ?? []) as readonly EvmAddress[]),
        [pageQuery.data]
    )

    if (!isConnected) {
        return <p className="empty-text">Connect your wallet to see your storages.</p>
    }

    if (countQuery.isPending) {
        return <p className="empty-text">Loading storages...</p>
    }

    if (countQuery.isError) {
        return <p className="empty-text">Failed to load storages.</p>
    }

    if (totalCount === 0) {
        return <p className="empty-text">You do not have any storages yet.</p>
    }

    if (pageQuery.isPending) {
        return <p className="empty-text">Loading storages...</p>
    }

    if (pageQuery.isError) {
        return <p className="empty-text">Failed to load storages.</p>
    }

    return (
        <>
            <div className="storage-grid">
                {storages.map((storageAddress) => (
                    <StorageCard key={storageAddress} address={storageAddress} />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="secondary-btn"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </button>

                    <span className="pagination-text">
                        Page {page} of {totalPages}
                    </span>

                    <button
                        className="secondary-btn"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </>
    )
}