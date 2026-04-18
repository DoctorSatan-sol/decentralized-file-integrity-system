import StorageDetails from '@/components/StorageDetails'

type PageProps = {
    params: Promise<{
        address: string
    }>
}

export default async function StoragePage({ params }: PageProps) {
    const { address } = await params

    return (
        <main className="page-content">
            <div className="container">
                <StorageDetails address={address} />
            </div>
        </main>
    )
}