'use client'

type Props = {
    query: string
    onQueryChange: (value: string) => void
    totalFiles: number
    visibleFiles: number
    isIndexing: boolean
}

export default function StorageSearch({
                                          query,
                                          onQueryChange,
                                          totalFiles,
                                          visibleFiles,
                                          isIndexing,
                                      }: Props) {
    return (
        <section className="storage-search">
            <input
                className="form-input"
                type="text"
                placeholder="Search by name, file ID, hash, CID, or address"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
            />

            {query.trim() && (
                <div className="search-summary">
                    {isIndexing ? (
                        <p className="empty-text">
                            Indexing files... {visibleFiles} / {totalFiles}
                        </p>
                    ) : (
                        <p className="empty-text">
                            Found {visibleFiles} of {totalFiles} file(s)
                        </p>
                    )}
                </div>
            )}
        </section>
    )
}