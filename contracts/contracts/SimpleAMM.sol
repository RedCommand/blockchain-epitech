// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ComplianceRegistry.sol";

contract SimpleAMM is Ownable {
    IERC20 public immutable token;
    ComplianceRegistry public registry;

    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 tokenAmount, uint256 liquidityMinted);
    event LiquidityRemoved(address indexed provider, uint256 ethAmount, uint256 tokenAmount, uint256 liquidityBurned);
    event SwapEthForToken(address indexed user, uint256 ethIn, uint256 tokenOut);
    event SwapTokenForEth(address indexed user, uint256 tokenIn, uint256 ethOut);

    constructor(address _token, address _registry) Ownable(msg.sender) {
        token = IERC20(_token);
        registry = ComplianceRegistry(_registry);
    }

    function updateRegistry(address _registry) external onlyOwner {
        registry = ComplianceRegistry(_registry);
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function addLiquidity(uint256 tokenAmount) external payable returns (uint256 liquidityMinted) {
        require(msg.value > 0, "ETH required");
        require(tokenAmount > 0, "Token required");

        uint256 ethReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));

        if (totalLiquidity == 0) {
            liquidityMinted = _sqrt(msg.value * tokenAmount);
        } else {
            require(ethReserve * tokenAmount == tokenReserve * msg.value, "Bad ratio");
            liquidityMinted = (msg.value * totalLiquidity) / ethReserve;
        }

        totalLiquidity += liquidityMinted;
        liquidity[msg.sender] += liquidityMinted;

        bool ok = token.transferFrom(msg.sender, address(this), tokenAmount);
        require(ok, "Token transfer failed");

        emit LiquidityAdded(msg.sender, msg.value, tokenAmount, liquidityMinted);
    }

    function removeLiquidity(uint256 liquidityAmount) external returns (uint256 ethAmount, uint256 tokenAmount) {
        require(liquidityAmount > 0, "Liquidity required");
        require(liquidity[msg.sender] >= liquidityAmount, "Not enough liquidity");

        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));

        ethAmount = (liquidityAmount * ethReserve) / totalLiquidity;
        tokenAmount = (liquidityAmount * tokenReserve) / totalLiquidity;

        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;

        (bool sent, ) = msg.sender.call{ value: ethAmount }("");
        require(sent, "ETH transfer failed");

        bool ok = token.transfer(msg.sender, tokenAmount);
        require(ok, "Token transfer failed");

        emit LiquidityRemoved(msg.sender, ethAmount, tokenAmount, liquidityAmount);
    }

    function swapEthForToken(uint256 minTokenOut) external payable returns (uint256 tokenOut) {
        require(msg.value > 0, "ETH required");

        uint256 ethReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));

        uint256 ethInWithFee = msg.value * 997 / 1000;
        tokenOut = (tokenReserve * ethInWithFee) / (ethReserve + ethInWithFee);
        require(tokenOut >= minTokenOut, "Slippage");

        bool ok = token.transfer(msg.sender, tokenOut);
        require(ok, "Token transfer failed");

        emit SwapEthForToken(msg.sender, msg.value, tokenOut);
    }

    function swapTokenForEth(uint256 tokenIn, uint256 minEthOut) external returns (uint256 ethOut) {
        require(tokenIn > 0, "Token required");

        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));

        uint256 tokenInWithFee = tokenIn * 997 / 1000;
        ethOut = (ethReserve * tokenInWithFee) / (tokenReserve + tokenInWithFee);
        require(ethOut >= minEthOut, "Slippage");

        bool ok = token.transferFrom(msg.sender, address(this), tokenIn);
        require(ok, "Token transfer failed");

        (bool sent, ) = msg.sender.call{ value: ethOut }("");
        require(sent, "ETH transfer failed");

        emit SwapTokenForEth(msg.sender, tokenIn, ethOut);
    }

    receive() external payable {}
}
