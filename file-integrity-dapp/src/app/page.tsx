import CreateStorageButton from '@/components/CreateStorageButton'
import StorageGrid from '@/components/StorageGrid'

export default function HomePage() {
    return (
        <main className="page-content">
            <div className="container">
                <div className="page-top">
                    <h1 className="page-title">My Storages</h1>
                    <CreateStorageButton />
                </div>

                <StorageGrid />
            </div>
        </main>
    )
}