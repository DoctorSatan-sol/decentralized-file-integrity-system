// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./FileIntegrityRegistry.sol";

contract FileIntegrityRegistryFactory is IFileIntegrityRegistryFactory {
    using EnumerableSet for EnumerableSet.AddressSet;

    error InvalidAddress();
    error UnknownRegistry();

    event RegistryCreated(address indexed registry, address indexed owner);

    mapping(address => bool) public isRegistry;
    mapping(address => EnumerableSet.AddressSet) private userRegistries;

    function createRegistry() external returns (address registryAddress) {
        FileIntegrityRegistry registry = new FileIntegrityRegistry(msg.sender, address(this));
        registryAddress = address(registry);

        isRegistry[registryAddress] = true;
        userRegistries[msg.sender].add(registryAddress);

        emit RegistryCreated(registryAddress, msg.sender);
    }

    function onAccessGranted(address user) external override {
        if (!isRegistry[msg.sender]) revert UnknownRegistry();
        if (user == address(0)) revert InvalidAddress();

        userRegistries[user].add(msg.sender);
    }

    function onAccessRevoked(address user) external override {
        if (!isRegistry[msg.sender]) revert UnknownRegistry();
        if (user == address(0)) revert InvalidAddress();

        userRegistries[user].remove(msg.sender);
    }

    function userRegistryCount(address user) external view returns (uint256) {
        return userRegistries[user].length();
    }

    function getUserRegistriesPage(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory page) {
        uint256 total = userRegistries[user].length();

        if (offset >= total || limit == 0) {
            return new address[](0);
        }

        uint256 remaining = total - offset;
        uint256 size = limit < remaining ? limit : remaining;

        page = new address[](size);

        for (uint256 i = 0; i < size; i++) {
            page[i] = userRegistries[user].at(offset + i);
        }
    }
}