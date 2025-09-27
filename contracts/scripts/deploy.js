const hre = require("hardhat");

async function main() {
  console.log("Deploying DiceVault contract to Ronin Testnet...");
  
  const DiceVault = await hre.ethers.getContractFactory("DiceVault");
  const diceVault = await DiceVault.deploy();
  
  await diceVault.deployed();
  
  console.log("DiceVault deployed to:", diceVault.address);
  console.log("Contract owner:", await diceVault.owner());
  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });