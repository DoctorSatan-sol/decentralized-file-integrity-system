'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Header() {
    return (
        <header className="header">
            <div className="container header-inner">
                <Link href="/" className="home-link">
                    File Integrity
                </Link>

                <ConnectButton />
            </div>
        </header>
    )
}