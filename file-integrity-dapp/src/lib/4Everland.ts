import {
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'

export type FourEverlandSettings = {
    bucketName: string
    accessKey: string
    secretKey: string
}

export const FOUREVERLAND_STORAGE_KEY = 'file-integrity-4everland-settings'

export function getFourEverlandSettings(): FourEverlandSettings | null {
    if (typeof window === 'undefined') return null

    const raw = localStorage.getItem(FOUREVERLAND_STORAGE_KEY)
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as Partial<FourEverlandSettings>

        const bucketName = parsed.bucketName?.trim() ?? ''
        const accessKey = parsed.accessKey?.trim() ?? ''
        const secretKey = parsed.secretKey?.trim() ?? ''

        if (!bucketName || !accessKey || !secretKey) {
            return null
        }

        return {
            bucketName,
            accessKey,
            secretKey,
        }
    } catch {
        return null
    }
}

function createFourEverlandClient(settings: FourEverlandSettings) {
    return new S3Client({
        endpoint: 'https://endpoint.4everland.co',
        region: '4everland',
        credentials: {
            accessKeyId: settings.accessKey,
            secretAccessKey: settings.secretKey,
        },
    })
}

function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function bytesToHex(bytes: Uint8Array) {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

export async function sha256File(file: File): Promise<`0x${string}`> {
    const arrayBuffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hex = bytesToHex(new Uint8Array(digest))
    return `0x${hex}` as `0x${string}`
}

export type UploadedFileMeta = {
    cid: string
    fileHash: `0x${string}`
    size: number
    key: string
    originalName: string
}

export async function uploadFileToFourEverland(
    file: File,
    settings: FourEverlandSettings
): Promise<UploadedFileMeta> {
    const client = createFourEverlandClient(settings)

    const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
    const body = new Uint8Array(await file.arrayBuffer())
    const fileHash = await sha256File(file)

    await client.send(
        new PutObjectCommand({
            Bucket: settings.bucketName,
            Key: key,
            Body: body,
            ContentType: file.type || 'application/octet-stream',
        })
    )

    const head = await client.send(
        new HeadObjectCommand({
            Bucket: settings.bucketName,
            Key: key,
        })
    )

    const cid = head.Metadata?.['ipfs-hash']

    if (!cid) {
        throw new Error('Upload succeeded, but CID was not returned.')
    }

    return {
        cid,
        fileHash,
        size: file.size,
        key,
        originalName: file.name,
    }
}