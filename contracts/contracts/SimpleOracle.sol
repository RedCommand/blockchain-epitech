// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleOracle is Ownable {
    mapping(bytes32 => uint256) public prices;

    event PriceUpdated(bytes32 indexed assetId, uint256 price);

    constructor() Ownable(msg.sender) {}

    function updatePrice(bytes32 assetId, uint256 price) external onlyOwner {
        prices[assetId] = price;
        emit PriceUpdated(assetId, price);
    }

    function getPrice(bytes32 assetId) external view returns (uint256) {
        return prices[assetId];
    }
}
