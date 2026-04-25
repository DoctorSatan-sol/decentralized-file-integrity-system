'use client'

import { useEffect, useState } from 'react'

type FourEverlandSettings = {
    bucketName: string
    accessKey: string
    secretKey: string
}

const STORAGE_KEY = 'file-integrity-4everland-settings'

const EMPTY_SETTINGS: FourEverlandSettings = {
    bucketName: '',
    accessKey: '',
    secretKey: '',
}

export default function SettingsModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [settings, setSettings] = useState<FourEverlandSettings>(EMPTY_SETTINGS)
    const [status, setStatus] = useState('')

    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY)

        if (!raw) return

        try {
            const parsed = JSON.parse(raw) as FourEverlandSettings

            setSettings({
                bucketName: parsed.bucketName ?? '',
                accessKey: parsed.accessKey ?? '',
                secretKey: parsed.secretKey ?? '',
            })
        } catch {
            localStorage.removeItem(STORAGE_KEY)
        }
    }, [])

    const handleChange =
        (field: keyof FourEverlandSettings) =>
            (event: React.ChangeEvent<HTMLInputElement>) => {
                setSettings((prev) => ({
                    ...prev,
                    [field]: event.target.value,
                }))
            }

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
        setStatus('Saved.')
    }

    const handleClear = () => {
        localStorage.removeItem(STORAGE_KEY)
        setSettings(EMPTY_SETTINGS)
        setStatus('Cleared.')
    }

    const handleClose = () => {
        setIsOpen(false)
        setStatus('')
    }

    return (
        <>
            <button className="settings-btn" onClick={() => setIsOpen(true)}>
                Settings
            </button>

            {isOpen && (
                <div className="modal-backdrop" onClick={handleClose}>
                    <div className="modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-top">
                            <h2 className="modal-title">4EVERLAND Settings</h2>
                            <button className="modal-close" onClick={handleClose}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <label className="form-label">
                                Bucket Name
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.bucketName}
                                    onChange={handleChange('bucketName')}
                                    placeholder="your-bucket-name"
                                />
                            </label>

                            <label className="form-label">
                                Access Key
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.accessKey}
                                    onChange={handleChange('accessKey')}
                                    placeholder="your-access-key"
                                />
                            </label>

                            <label className="form-label">
                                Secret Key
                                <input
                                    className="form-input"
                                    type="password"
                                    value={settings.secretKey}
                                    onChange={handleChange('secretKey')}
                                    placeholder="your-secret-key"
                                />
                            </label>

                            <p className="form-hint">
                                These settings are stored locally in your browser.
                            </p>

                            {status && <p className="settings-status">{status}</p>}
                        </div>

                        <div className="modal-actions">
                            <button className="secondary-btn" onClick={handleClear}>
                                Clear
                            </button>

                            <button className="create-btn" onClick={handleSave}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}