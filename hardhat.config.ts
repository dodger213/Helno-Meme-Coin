import { HardhatUserConfig } from "hardhat/config";
import "dotenv/config";

import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";

const infuraKey: string = process.env.INFURA_API_KEY as string;
const privateKey: string = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY as string: "";
const etherscanKey: string = process.env.ETHERSCAN_KEY ? process.env.ETHERSCAN_KEY as string : "";
const bscscanKey: string = process.env.BSCSCAN_KEY ? process.env.BSCSCAN_KEY as string : "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${infuraKey}`,
      accounts: [privateKey],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${infuraKey}`,
      accounts: [privateKey],
    },
    bnb_testnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      accounts: [privateKey],
    },
    bnb_mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      accounts: [privateKey],
    },
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: etherscanKey,
      sepolia: etherscanKey,
      bnb_testnet: bscscanKey,
      bnb_mainnet: bscscanKey,
    },
  },
  gasReporter: {
    enabled: true,
  },
  sourcify: {
    enabled: true,
  },
};

export default config;

