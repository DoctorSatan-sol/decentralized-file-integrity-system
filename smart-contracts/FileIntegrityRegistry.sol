// SPDX-License-Identifier: MIT

pragma solidity 0.8.34;

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
    uint256 public nextFileId = 1;

    constructor () {
        storageOwner = msg.sender;
        authorizedUsers[msg.sender] = true;
    }

    mapping (uint256 => File) private files;
    mapping (uint256 => mapping (uint256 => FileVersion)) private fileVersions;
    mapping (address => bool) public authorizedUsers;

    function grantEditorAccess(address user) external {
        require(msg.sender == storageOwner, "No access");
        require(user != address(0), "Invalid address");
        require(!authorizedUsers[user], "Already authorized");
        authorizedUsers[user] = true;

        emit EditorAccessGranted(user);
    }

    function revokeEditorAccess(address user) external {
        require(msg.sender == storageOwner, "No access");
        require(user != storageOwner, "Cannot revoke owner access");
        require(authorizedUsers[user], "User not authorized");
        authorizedUsers[user] = false;

        emit EditorAccessRevoked(user);
    }

    function createFile(
        string memory _name, 
        string memory _description, 
        uint256 _size, bytes32 _fileHash, 
        string memory _cid
    ) external {
        require(authorizedUsers[msg.sender], "No access");
        require(bytes(_name).length > 0, "Empty name");
        require(bytes(_cid).length > 0, "Empty CID");
        require(_fileHash != bytes32(0), "Empty hash");
        require(bytes(_name).length <= 200, "Name too long");
        require(bytes(_description).length <= 1000, "Description too long");

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
    ) external {
        require(authorizedUsers[msg.sender], "No access");
        require(files[_fileId].exists, "File does not exist");
        require(bytes(_cid).length > 0, "Empty CID");
        require(_fileHash != bytes32(0), "Empty hash");

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
        require(files[_fileId].exists, "File does not exist");
        return files[_fileId];
    }

    function getFileVersion(uint256 _fileId, uint256 _versionNumber) external view returns (FileVersion memory) {
        require(files[_fileId].exists, "File does not exist");
        require(_versionNumber > 0 && _versionNumber <= files[_fileId].latestVersionNumber, "Version does not exist");
        return fileVersions[_fileId][_versionNumber];
    }
}