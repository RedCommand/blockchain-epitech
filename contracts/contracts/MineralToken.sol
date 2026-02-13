// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComplianceRegistry.sol";

contract MineralToken is ERC20, Ownable {
    ComplianceRegistry public registry;

    constructor(
        string memory name,
        string memory symbol,
        address _registry
    ) ERC20(name, symbol) Ownable(msg.sender) {
        registry = ComplianceRegistry(_registry);
    }

    function updateRegistry(address _registry) external onlyOwner {
        registry = ComplianceRegistry(_registry);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) && to == address(0)) {
            super._update(from, to, value);
            return;
        }

        require(registry.checkCompliance(from, to), "Compliance: Transfer not allowed");

        super._update(from, to, value);
    }
}
