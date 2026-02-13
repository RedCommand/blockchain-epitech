// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ComplianceRegistry is Ownable {
    mapping(address => bool) public isWhitelisted;
    mapping(address => bool) public isBlacklisted;

    event UserWhitelisted(address indexed user, bool status);
    event UserBlacklisted(address indexed user, bool status);

    constructor() Ownable(msg.sender) {}

    function setWhitelist(address user, bool status) external onlyOwner {
        isWhitelisted[user] = status;
        emit UserWhitelisted(user, status);
    }

    function setBlacklist(address user, bool status) external onlyOwner {
        isBlacklisted[user] = status;
        emit UserBlacklisted(user, status);
    }

    function checkCompliance(address from, address to) external view returns (bool) {
        if (isBlacklisted[from] || isBlacklisted[to]) {
            return false;
        }
        if (!isWhitelisted[from] && from != address(0)) {
            // Allow minting (from=0) even if from is not whitelisted (it is impossible for address(0) to be whitelisted anyway)
            // But usually minting is done by owner.
            // If from is 0, it means minting. Let's allow minting to non-whitelisted if needed?
            // Requirement: "Only whitelisted addresses can hold and/or trade".
            // So recipient of mint must be whitelisted.
            return false;
        }
        if (!isWhitelisted[to] && to != address(0)) {
            // Allow burning (to=0)
            return false;
        }
        return true;
    }
}
