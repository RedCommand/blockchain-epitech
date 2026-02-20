import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const NEW_OWNER = process.env.NEW_OWNER;

  if (!NEW_OWNER) {
    console.error("Error: NEW_OWNER environment variable is not set.");
    console.error("Usage: NEW_OWNER=<ADDRESS> npx hardhat run scripts/transfer-ownership.ts --network localhost");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);
  console.log("Transferring ownership to:", NEW_OWNER);

  // Load config
  const configPath = path.resolve(__dirname, "../../frontend/app/contracts-config.json");
  if (!fs.existsSync(configPath)) {
    console.error("Config not found at", configPath);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const contracts = config.contracts;

  // 1. ComplianceRegistry
  if (contracts.ComplianceRegistry) {
    const registry = await ethers.getContractAt("ComplianceRegistry", contracts.ComplianceRegistry);
    console.log("Transferring ComplianceRegistry ownership...");
    const tx = await registry.transferOwnership(NEW_OWNER);
    await tx.wait();
    console.log("ComplianceRegistry owner updated.");
  }

  // 2. MineralToken
  if (contracts.MineralToken) {
    const token = await ethers.getContractAt("MineralToken", contracts.MineralToken);
    console.log("Transferring MineralToken ownership...");
    const tx = await token.transferOwnership(NEW_OWNER);
    await tx.wait();
    console.log("MineralToken owner updated.");
  }

  // 3. DiamondCollection
  if (contracts.DiamondCollection) {
    // Check if DiamondCollection is Ownable (assuming yes based on pattern)
    try {
      const diamonds = await ethers.getContractAt("DiamondCollection", contracts.DiamondCollection);
      const tx = await diamonds.transferOwnership(NEW_OWNER);
      await tx.wait();
      console.log("DiamondCollection owner updated.");
    } catch (e) {
      console.log("DiamondCollection might not be Ownable or transfer failed.");
    }
  }

  // 4. SimpleOracle
  if (contracts.SimpleOracle) {
    try {
      const oracle = await ethers.getContractAt("SimpleOracle", contracts.SimpleOracle);
      // Check if Ownable
      const tx = await oracle.transferOwnership(NEW_OWNER);
      await tx.wait();
      console.log("SimpleOracle owner updated.");
    } catch (e) {
       console.log("SimpleOracle might not be Ownable.");
    }
  }

  // Fund the new owner with ETH
  console.log("Funding new owner with 1000 ETH...");
  const fundTx = await deployer.sendTransaction({
    to: NEW_OWNER,
    value: ethers.parseEther("1000")
  });
  await fundTx.wait();
  console.log("Funded 1000 ETH.");

  console.log("All ownerships transferred!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
