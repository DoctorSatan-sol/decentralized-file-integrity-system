// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

interface IFileIntegrityRegistryFactory {
    function onAccessGranted(address user) external;
    function onAccessRevoked(address user) external;
}

struct FileVersion {
    bytes32 fileHash;
    string cid;
    uint256 size;
    uint256 versionNumber;
    address userAddress;
}

struct File {
    uint256 fileId;
    string name;
    string description;
    address userAddress;
    uint256 latestVersionNumber;
    bool exists;
}

contract FileIntegrityRegistry {
    error NoAccess();
    error InvalidAddress();
    error AlreadyAuthorized();
    error UserNotAuthorized();
    error CannotRevokeOwnerAccess();
    error EmptyName();
    error EmptyCID();
    error EmptyHash();
    error NameTooLong();
    error DescriptionTooLong();
    error FileDoesNotExist();
    error VersionDoesNotExist();

    event EditorAccessGranted(address indexed user);
    event EditorAccessRevoked(address indexed user);

    event FileCreated(
        uint256 indexed fileId,
        uint256 indexed versionNumber,
        address indexed userAddress,
        string name,
        string description,
        uint256 size,
        bytes32 fileHash,
        string cid
    );

    event FileVersionAdded(
        uint256 indexed fileId,
        uint256 indexed versionNumber,
        address indexed userAddress,
        uint256 size,
        bytes32 fileHash,
        string cid
    );

    address public immutable storageOwner;
    address public immutable factory;
    uint256 public nextFileId = 1;

    mapping(uint256 => File) private files;
    mapping(uint256 => mapping(uint256 => FileVersion)) private fileVersions;
    mapping(address => bool) public authorizedUsers;

    constructor(address _storageOwner, address _factory) {
        if (_storageOwner == address(0) || _factory == address(0)) revert InvalidAddress();

        storageOwner = _storageOwner;
        factory = _factory;
        authorizedUsers[_storageOwner] = true;
    }

    modifier onlyOwner() {
        if (msg.sender != storageOwner) revert NoAccess();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedUsers[msg.sender]) revert NoAccess();
        _;
    }

    function grantEditorAccess(address user) external onlyOwner {
        if (user == address(0)) revert InvalidAddress();
        if (authorizedUsers[user]) revert AlreadyAuthorized();

        authorizedUsers[user] = true;

        IFileIntegrityRegistryFactory(factory).onAccessGranted(user);

        emit EditorAccessGranted(user);
    }

    function revokeEditorAccess(address user) external onlyOwner {
        if (user == storageOwner) revert CannotRevokeOwnerAccess();
        if (!authorizedUsers[user]) revert UserNotAuthorized();

        authorizedUsers[user] = false;

        IFileIntegrityRegistryFactory(factory).onAccessRevoked(user);

        emit EditorAccessRevoked(user);
    }

    function createFile(
        string memory _name,
        string memory _description,
        uint256 _size,
        bytes32 _fileHash,
        string memory _cid
    ) external onlyAuthorized {
        if (bytes(_name).length == 0) revert EmptyName();
        if (bytes(_cid).length == 0) revert EmptyCID();
        if (_fileHash == bytes32(0)) revert EmptyHash();
        if (bytes(_name).length > 200) revert NameTooLong();
        if (bytes(_description).length > 1000) revert DescriptionTooLong();

        uint256 fileId = nextFileId;
        uint256 versionNumber = 1;

        files[fileId] = File({
            fileId: fileId,
            name: _name,
            description: _description,
            userAddress: msg.sender,
            latestVersionNumber: versionNumber,
            exists: true
        });

        fileVersions[fileId][versionNumber] = FileVersion({
            fileHash: _fileHash,
            cid: _cid,
            size: _size,
            versionNumber: versionNumber,
            userAddress: msg.sender
        });

        nextFileId++;

        emit FileCreated(
            fileId,
            versionNumber,
            msg.sender,
            _name,
            _description,
            _size,
            _fileHash,
            _cid
        );
    }

    function addFileVersion(
        uint256 _fileId,
        uint256 _size,
        bytes32 _fileHash,
        string memory _cid
    ) external onlyAuthorized {
        if (!files[_fileId].exists) revert FileDoesNotExist();
        if (bytes(_cid).length == 0) revert EmptyCID();
        if (_fileHash == bytes32(0)) revert EmptyHash();

        uint256 newVersion = files[_fileId].latestVersionNumber + 1;

        fileVersions[_fileId][newVersion] = FileVersion({
            fileHash: _fileHash,
            cid: _cid,
            size: _size,
            versionNumber: newVersion,
            userAddress: msg.sender
        });

        files[_fileId].latestVersionNumber = newVersion;

        emit FileVersionAdded(
            _fileId,
            newVersion,
            msg.sender,
            _size,
            _fileHash,
            _cid
        );
    }

    function getFile(uint256 _fileId) external view returns (File memory) {
        if (!files[_fileId].exists) revert FileDoesNotExist();
        return files[_fileId];
    }

    function getFileVersion(
        uint256 _fileId,
        uint256 _versionNumber
    ) external view returns (FileVersion memory) {
        if (!files[_fileId].exists) revert FileDoesNotExist();
        if (_versionNumber == 0 || _versionNumber > files[_fileId].latestVersionNumber) {
            revert VersionDoesNotExist();
        }

        return fileVersions[_fileId][_versionNumber];
    }
}