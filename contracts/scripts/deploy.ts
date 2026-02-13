import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Compliance Registry
  const Registry = await ethers.getContractFactory("ComplianceRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ComplianceRegistry deployed to:", registryAddress);

  // 2. Deploy Mineral Token (Gold)
  const MineralToken = await ethers.getContractFactory("MineralToken");
  const gold = await MineralToken.deploy("Gold Token", "GLD", registryAddress);
  await gold.waitForDeployment();
  console.log("Gold Token deployed to:", await gold.getAddress());

  // 3. Deploy Diamond Collection
  const DiamondCollection = await ethers.getContractFactory("DiamondCollection");
  const diamonds = await DiamondCollection.deploy(registryAddress);
  await diamonds.waitForDeployment();
  console.log("DiamondCollection deployed to:", await diamonds.getAddress());

  // 4. Deploy Oracle
  const SimpleOracle = await ethers.getContractFactory("SimpleOracle");
  const oracle = await SimpleOracle.deploy();
  await oracle.waitForDeployment();
  console.log("SimpleOracle deployed to:", await oracle.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
