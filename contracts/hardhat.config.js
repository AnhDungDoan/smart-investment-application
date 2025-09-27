require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

const PRIVATE_KEY = "cfcf889debf5f61e49124937d113c67668ce5ae460ff1a681c0a0922dd0f4136";

module.exports = {
  solidity: "0.8.19",
  networks: {
    ronin_testnet: {
      url: "https://saigon-testnet.roninchain.com/rpc",
      chainId: 2021,
      accounts: [PRIVATE_KEY],
      gasPrice: 25000000000,
    },
  },
};