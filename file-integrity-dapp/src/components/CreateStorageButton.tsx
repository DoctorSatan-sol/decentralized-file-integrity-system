'use client'

import { useWriteContract } from 'wagmi'
import { FACTORY_ADDRESS, factoryAbi } from '@/lib/contracts'

export default function CreateStorageButton() {
    const { writeContract, isPending } = useWriteContract()

    const handleCreateStorage = () => {
        writeContract(
            {
                address: FACTORY_ADDRESS,
                abi: factoryAbi,
                functionName: 'createRegistry',
            },
            {
                onSuccess() {
                    setTimeout(() => {
                        window.location.reload()
                    }, 1500)
                },
            }
        )
    }

    return (
        <button
            className="create-btn"
            onClick={handleCreateStorage}
            disabled={isPending}
        >
            {isPending ? 'Creating...' : 'Create Storage'}
        </button>
    )
}