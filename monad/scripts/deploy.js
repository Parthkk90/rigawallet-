const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Cresca Contracts to Monad...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log("");

  // 1. Deploy CrescaCalendarPayments
  console.log("📅 Deploying CrescaCalendarPayments...");
  const CrescaCalendarPayments = await hre.ethers.getContractFactory("CrescaCalendarPayments");
  const calendarPayments = await CrescaCalendarPayments.deploy();
  await calendarPayments.waitForDeployment();
  const calendarAddress = await calendarPayments.getAddress();
  console.log("✅ CrescaCalendarPayments deployed to:", calendarAddress);
  console.log("");

  // 2. Deploy CrescaPayments
  console.log("💸 Deploying CrescaPayments...");
  const CrescaPayments = await hre.ethers.getContractFactory("CrescaPayments");
  const payments = await CrescaPayments.deploy();
  await payments.waitForDeployment();
  const paymentsAddress = await payments.getAddress();
  console.log("✅ CrescaPayments deployed to:", paymentsAddress);
  console.log("");

  // 3. Deploy CrescaBucketProtocol
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
  console.log("Contract Addresses:");
  console.log("-".repeat(60));
  console.log("CrescaCalendarPayments:", calendarAddress);
  console.log("CrescaPayments        :", paymentsAddress);
  console.log("CrescaBucketProtocol  :", bucketAddress);
  console.log("");
  console.log("Save these addresses to your .env file!");
  console.log("");

  // Verification commands
  console.log("To verify on block explorer, run:");
  console.log("-".repeat(60));
  console.log(`npx hardhat verify --network ${hre.network.name} ${calendarAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${paymentsAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${bucketAddress}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
