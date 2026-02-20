import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Seeding liquidity with account:", deployer.address);

  // Addresses from your deployment
  const REGISTRY_ADDRESS = "0xbbdaAc2985316608B78370639181155bEf289A7c";
  const TOKEN_ADDRESS = "0x14d679950BD4B5117C85f620d8D785e258f89678";
  const AMM_ADDRESS = "0x3B7a6142319D0E09b284033077277d130fD10314";

  // Get contract instances
  const registry = await ethers.getContractAt("ComplianceRegistry", REGISTRY_ADDRESS);
  const token = await ethers.getContractAt("MineralToken", TOKEN_ADDRESS);
  const amm = await ethers.getContractAt("SimpleAMM", AMM_ADDRESS);

  // 1. Whitelist deployer and AMM if not already done
  console.log("\n1. Checking whitelist status...");
  const isDeployerWhitelisted = await registry.isWhitelisted(deployer.address);
  const isAmmWhitelisted = await registry.isWhitelisted(AMM_ADDRESS);

  if (!isDeployerWhitelisted) {
    console.log("   Whitelisting deployer...");
    const tx1 = await registry.setWhitelist(deployer.address, true);
    await tx1.wait();
    console.log("   ✓ Deployer whitelisted");
  } else {
    console.log("   ✓ Deployer already whitelisted");
  }

  if (!isAmmWhitelisted) {
    console.log("   Whitelisting AMM...");
    const tx2 = await registry.setWhitelist(AMM_ADDRESS, true);
    await tx2.wait();
    console.log("   ✓ AMM whitelisted");
  } else {
    console.log("   ✓ AMM already whitelisted");
  }

  // 2. Mint tokens
  const tokenAmount = ethers.parseEther("10000"); // 10,000 GLD
  console.log("\n2. Minting 10,000 GLD tokens...");
  const mintTx = await token.mint(deployer.address, tokenAmount);
  await mintTx.wait();
  console.log("   ✓ Minted 10,000 GLD");

  // 3. Approve AMM to spend tokens
  console.log("\n3. Approving AMM to spend tokens...");
  const approveTx = await token.approve(AMM_ADDRESS, tokenAmount);
  await approveTx.wait();
  console.log("   ✓ AMM approved");

  // 4. Add liquidity
  const ethAmount = ethers.parseEther("0.1"); // 0.1 ETH
  console.log("\n4. Adding liquidity: 0.1 ETH + 10,000 GLD...");
  const addLiqTx = await amm.addLiquidity(tokenAmount, { value: ethAmount });
  await addLiqTx.wait();
  console.log("   ✓ Liquidity added!");

  // 5. Check pool reserves
  console.log("\n5. Pool Status:");
  const ethBalance = await ethers.provider.getBalance(AMM_ADDRESS);
  const tokenBalance = await token.balanceOf(AMM_ADDRESS);
  console.log("   ETH Reserve:", ethers.formatEther(ethBalance), "ETH");
  console.log("   GLD Reserve:", ethers.formatEther(tokenBalance), "GLD");

  console.log("\n✅ Liquidity pool seeded successfully!");
  console.log("\nYou can now test swaps on your frontend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
