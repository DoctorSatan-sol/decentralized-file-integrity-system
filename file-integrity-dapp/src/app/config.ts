import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
    appName: 'File Integrity DApp',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    chains: [mainnet, sepolia],
    ssr: true,
    transports: {
        [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL!),
        [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!),
    },
})