// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComplianceRegistry.sol";

contract DiamondCollection is ERC721URIStorage, Ownable {
    ComplianceRegistry public registry;
    uint256 private _nextTokenId;

    constructor(address _registry) ERC721("Diamond Collection", "DIAMOND") Ownable(msg.sender) {
        registry = ComplianceRegistry(_registry);
    }

    function updateRegistry(address _registry) external onlyOwner {
        registry = ComplianceRegistry(_registry);
    }

    function mint(address to, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Skip check if both are zero (should not happen)
        if (from == address(0) && to == address(0)) {
            return super._update(to, tokenId, auth);
        }

        require(registry.checkCompliance(from, to), "Compliance: Transfer not allowed");

        return super._update(to, tokenId, auth);
    }
}
