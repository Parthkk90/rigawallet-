const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying CrescaBucketProtocol to Sepolia...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.025")) {
    console.log("\n⚠️  WARNING: Balance may be insufficient for deployment");
    console.log("Recommended: At least 0.03 ETH");
  }
  
  console.log("");

  // Deploy CrescaBucketProtocol
  console.log("🪣 Deploying CrescaBucketProtocol...");
  const CrescaBucketProtocol = await hre.ethers.getContractFactory("CrescaBucketProtocol");
  const bucketProtocol = await CrescaBucketProtocol.deploy();
  await bucketProtocol.waitForDeployment();
  const bucketAddress = await bucketProtocol.getAddress();
  console.log("✅ CrescaBucketProtocol deployed to:", bucketAddress);
  console.log("");

  // Summary
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("");
  console.log("All Cresca Contracts on Sepolia:");
  console.log("-".repeat(60));
  console.log("CrescaCalendarPayments: 0x84318e411e13f7d11eb67623b3D8339Fb5329246");
  console.log("CrescaPayments        : 0xe841504f694371c1466ad1A53D66cC999A271BF3");
  console.log("CrescaBucketProtocol  :", bucketAddress);
  console.log("");
  console.log("Save this address to your .env file!");
  console.log("");

  // Verification command
  console.log("To verify on Etherscan, run:");
  console.log("-".repeat(60));
  console.log(`npx hardhat verify --network sepolia ${bucketAddress}`);
  console.log("");
  
  console.log("View on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${bucketAddress}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
