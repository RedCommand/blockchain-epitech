import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

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

  // 5. Deploy Simple AMM
  const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
  const amm = await SimpleAMM.deploy(await gold.getAddress(), registryAddress);
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  console.log("SimpleAMM deployed to:", ammAddress);

  // 6. Whitelist AMM (so it can hold tokens)
  const whitelistTx = await registry.setWhitelist(ammAddress, true);
  await whitelistTx.wait();
  console.log("AMM whitelisted in ComplianceRegistry");

  // 7. Optional: seed initial liquidity (requires env vars)
  const initEth = process.env.INIT_LIQUIDITY_ETH;
  const initToken = process.env.INIT_LIQUIDITY_TOKEN;

  if (initEth && initToken) {
    const ethAmount = ethers.parseEther(initEth);
    const tokenAmount = ethers.parseEther(initToken);

    const mintTx = await gold.mint(deployer.address, tokenAmount);
    await mintTx.wait();

    const approveTx = await gold.approve(ammAddress, tokenAmount);
    await approveTx.wait();

    const addLiqTx = await amm.addLiquidity(tokenAmount, { value: ethAmount });
    await addLiqTx.wait();

    console.log("Initial liquidity added:", initEth, "ETH and", initToken, "tokens");
  }

  // Generate and save config
  const chainId = network.config.chainId || 1337;
  const config = {
    network: network.name,
    chainId: chainId,
    contracts: {
      ComplianceRegistry: registryAddress,
      MineralToken: await gold.getAddress(),
      DiamondCollection: await diamonds.getAddress(),
      SimpleOracle: await oracle.getAddress(),
      SimpleAMM: ammAddress,
    },
  };

  const configContent = JSON.stringify(config, null, 2);

  // Resolve paths relative to this script
  // __dirname is contracts/scripts, so ../../ goes to project root
  const frontendPath = path.resolve(__dirname, "../../frontend/app/contracts-config.json");
  const backendPath = path.resolve(__dirname, "../../backend/src/contracts-config.json");

  fs.writeFileSync(frontendPath, configContent);
  fs.writeFileSync(backendPath, configContent);

  console.log(`Config saved to:
    - ${frontendPath}
    - ${backendPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
