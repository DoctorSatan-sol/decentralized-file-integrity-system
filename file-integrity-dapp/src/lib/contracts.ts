export const FACTORY_ADDRESS = '0x22203B9F0994a0A86d3449DEa020510cb3c11aD1'

export const factoryAbi = [
    {
        "inputs": [],
        "name": "createRegistry",
        "outputs": [
            {
                "internalType": "address",
                "name": "registryAddress",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "InvalidAddress",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "onAccessGranted",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "onAccessRevoked",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "UnknownRegistry",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "registry",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "RegistryCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "offset",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "limit",
                "type": "uint256"
            }
        ],
        "name": "getUserRegistriesPage",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "page",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "isRegistry",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "userRegistryCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const

export const registryAbi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_storageOwner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_factory",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "AlreadyAuthorized",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "CannotRevokeOwnerAccess",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "DescriptionTooLong",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "EmptyCID",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "EmptyHash",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "EmptyName",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "FileDoesNotExist",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidAddress",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NameTooLong",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NoAccess",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "UserNotAuthorized",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "VersionDoesNotExist",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "EditorAccessGranted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "EditorAccessRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "fileId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "versionNumber",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "userAddress",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "description",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "size",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "fileHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "cid",
                "type": "string"
            }
        ],
        "name": "FileCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "fileId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "versionNumber",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "userAddress",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "size",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "fileHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "cid",
                "type": "string"
            }
        ],
        "name": "FileVersionAdded",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_fileId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_size",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "_fileHash",
                "type": "bytes32"
            },
            {
                "internalType": "string",
                "name": "_cid",
                "type": "string"
            }
        ],
        "name": "addFileVersion",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "authorizedUsers",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_name",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_description",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_size",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "_fileHash",
                "type": "bytes32"
            },
            {
                "internalType": "string",
                "name": "_cid",
                "type": "string"
            }
        ],
        "name": "createFile",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "factory",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_fileId",
                "type": "uint256"
            }
        ],
        "name": "getFile",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "fileId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "name",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "description",
                        "type": "string"
                    },
                    {
                        "internalType": "address",
                        "name": "userAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "latestVersionNumber",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bool",
                        "name": "exists",
                        "type": "bool"
                    }
                ],
                "internalType": "struct File",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_fileId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_versionNumber",
                "type": "uint256"
            }
        ],
        "name": "getFileVersion",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "bytes32",
                        "name": "fileHash",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "string",
                        "name": "cid",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "size",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "versionNumber",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "userAddress",
                        "type": "address"
                    }
                ],
                "internalType": "struct FileVersion",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "grantEditorAccess",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "nextFileId",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "revokeEditorAccess",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "storageOwner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const