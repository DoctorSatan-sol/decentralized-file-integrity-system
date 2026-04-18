import Link from 'next/link'

type StorageCardProps = {
    address: `0x${string}`
}

export default function StorageCard({ address }: StorageCardProps) {
    return (
        <Link href={`/storage/${address}`} className="storage-card">
            <h2 className="storage-card-title">Storage</h2>
            <p className="storage-address">{address}</p>
        </Link>
    )
}