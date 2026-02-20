import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

task("fund", "Funds an account with 1000 ETH")
  .addParam("address", "The account's address")
  .setAction(async (taskArgs, hre) => {
    const [sender] = await hre.ethers.getSigners();
    const recipient = taskArgs.address;
    const amount = hre.ethers.parseEther("1000");

    console.log(`Funding ${recipient} with 1000 ETH from ${sender.address}...`);

    const tx = await sender.sendTransaction({
      to: recipient,
      value: amount,
    });

    console.log(`Transferred 1000 ETH. Transaction hash: ${tx.hash}`);
  });

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
