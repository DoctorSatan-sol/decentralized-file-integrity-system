import './globals.css'
import Providers from './providers'
import Header from '@/components/Header'

export const metadata = {
    title: 'File Integrity DApp',
    description: 'Decentralized file integrity system',
}

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode
}) {
  return (
      <html lang="ru">
      <body>
      <Providers>
        <Header />
        <main className="container page-content">{children}</main>
      </Providers>
      </body>
      </html>
  )
}