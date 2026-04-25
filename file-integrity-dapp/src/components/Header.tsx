'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import SettingsModal from './SettingsModal'

export default function Header() {
    return (
        <header className="header">
            <div className="container header-inner">
                <Link href="/" className="home-link">
                    File Integrity
                </Link>

                <div className="header-actions">
                    <SettingsModal />
                    <ConnectButton chainStatus="full" />
                </div>
            </div>
        </header>
    )
}