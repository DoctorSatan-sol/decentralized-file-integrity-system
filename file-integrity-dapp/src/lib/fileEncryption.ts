const ENCRYPTION_MARKER = 'file-integrity-encrypted-v1'

type EncryptedPackage = {
    marker: string
    version: number
    originalName: string
    mimeType: string
    originalSize: number
    salt: string
    iv: string
    ciphertext: string
}

function bytesToBase64(bytes: Uint8Array) {
    let binary = ''
    const chunkSize = 0x8000

    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize)
        binary += String.fromCharCode(...chunk)
    }

    return btoa(binary)
}

function base64ToBytes(base64: string) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }

    return bytes
}

function toPlainArrayBuffer(bytes: Uint8Array) {
    return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer
}

function normalizeText(value: string) {
    return value.replace(/\r\n/g, '\n')
}

function isTextContentType(contentType: string | null) {
    if (!contentType) return false

    const normalized = contentType.toLowerCase()

    return (
        normalized.startsWith('text/') ||
        normalized.includes('json') ||
        normalized.includes('javascript') ||
        normalized.includes('xml') ||
        normalized.includes('yaml') ||
        normalized.includes('csv')
    )
}

function isProbablyTextBytes(bytes: Uint8Array) {
    if (bytes.length === 0) return true

    let suspicious = 0
    const sampleLength = Math.min(bytes.length, 4096)

    for (let index = 0; index < sampleLength; index += 1) {
        const byte = bytes[index]

        if (byte === 0) {
            return false
        }

        const isPrintable =
            (byte >= 32 && byte <= 126) ||
            byte === 9 ||
            byte === 10 ||
            byte === 13

        if (!isPrintable) {
            suspicious += 1
        }
    }

    return suspicious / sampleLength < 0.3
}

async function deriveKey(password: string, salt: Uint8Array) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    )

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: toPlainArrayBuffer(salt),
            iterations: 250000,
            hash: 'SHA-256',
        },
        keyMaterial,
        {
            name: 'AES-GCM',
            length: 256,
        },
        false,
        ['encrypt', 'decrypt']
    )
}

async function parseEncryptedPackage(blob: Blob): Promise<EncryptedPackage | null> {
    try {
        const text = await blob.text()
        const parsed = JSON.parse(text)

        if (
            parsed &&
            parsed.marker === ENCRYPTION_MARKER &&
            typeof parsed.ciphertext === 'string'
        ) {
            return parsed as EncryptedPackage
        }

        return null
    } catch {
        return null
    }
}

export async function encryptFileWithPassword(file: File, password: string) {
    const trimmedPassword = password.trim()

    if (!trimmedPassword) {
        return file
    }

    const plaintext = await file.arrayBuffer()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(trimmedPassword, salt)

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toPlainArrayBuffer(iv) },
        key,
        plaintext
    )

    const payload: EncryptedPackage = {
        marker: ENCRYPTION_MARKER,
        version: 1,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        originalSize: file.size,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    }

    return new File(
        [JSON.stringify(payload)],
        `${file.name}.enc.json`,
        { type: 'application/json' }
    )
}

export async function resolveStoredBlob(
    blob: Blob,
    getPassword: () => string | Promise<string | null> | null
): Promise<{
    blob: Blob
    fileName?: string
    isEncrypted: boolean
}> {
    const encryptedPackage = await parseEncryptedPackage(blob)

    if (!encryptedPackage) {
        return {
            blob,
            fileName: undefined,
            isEncrypted: false,
        }
    }

    const password = await getPassword()

    if (!password) {
        throw new Error('Password is required to decrypt this file.')
    }

    const ivBytes = base64ToBytes(encryptedPackage.iv)
    const key = await deriveKey(password, base64ToBytes(encryptedPackage.salt))

    let plaintext: ArrayBuffer

    try {
        plaintext = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: toPlainArrayBuffer(ivBytes),
            },
            key,
            base64ToBytes(encryptedPackage.ciphertext)
        )
    } catch {
        throw new Error('Failed to decrypt file. Wrong password or corrupted data.')
    }

    return {
        blob: new Blob([plaintext], {
            type: encryptedPackage.mimeType || 'application/octet-stream',
        }),
        fileName: encryptedPackage.originalName,
        isEncrypted: true,
    }
}

export async function detectTextFromBlob(blob: Blob): Promise<{
    isText: boolean
    text: string
}> {
    const contentType = blob.type || null
    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const looksLikeText =
        isTextContentType(contentType) || isProbablyTextBytes(bytes)

    if (!looksLikeText) {
        return {
            isText: false,
            text: '',
        }
    }

    const text = new TextDecoder().decode(bytes)

    return {
        isText: true,
        text: normalizeText(text),
    }
}