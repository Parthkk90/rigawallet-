const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing Cresca Contracts...\n");

  // Get test accounts
  const [owner, user1, user2] = await hre.ethers.getSigners();
  
  console.log("Test accounts:");
  console.log("Owner:", owner.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("");

  // Deploy contracts
  console.log("Deploying contracts...");
  const CrescaCalendarPayments = await hre.ethers.getContractFactory("CrescaCalendarPayments");
  const calendarPayments = await CrescaCalendarPayments.deploy();
  await calendarPayments.waitForDeployment();
  
  const CrescaPayments = await hre.ethers.getContractFactory("CrescaPayments");
  const payments = await CrescaPayments.deploy();
  await payments.waitForDeployment();
  
  const CrescaBucketProtocol = await hre.ethers.getContractFactory("CrescaBucketProtocol");
  const bucketProtocol = await CrescaBucketProtocol.deploy();
  await bucketProtocol.waitForDeployment();
  
  console.log("✅ Contracts deployed\n");

  // Test 1: Calendar Payments - One-time payment
  console.log("Test 1: Creating one-time scheduled payment...");
  const oneHourLater = Math.floor(Date.now() / 1000) + 3600;
  const paymentAmount = hre.ethers.parseEther("0.1");
  
  const tx1 = await calendarPayments.connect(user1).createOneTimePayment(
    user2.address,
    paymentAmount,
    oneHourLater,
    { value: paymentAmount }
  );
  await tx1.wait();
  console.log("✅ One-time payment scheduled");
  
  const schedules = await calendarPayments.getUserSchedules(user1.address);
  console.log(`   Schedule ID: ${schedules.length - 1}`);
  console.log(`   Amount: ${hre.ethers.formatEther(schedules[0].amount)} ETH`);
  console.log(`   Recipient: ${schedules[0].recipient}`);
  console.log("");

  // Test 2: Payments - Simple transfer
  console.log("Test 2: Simple payment transfer...");
  const tx2 = await payments.connect(user1).sendPayment(
    user2.address,
    "Test payment", // memo
    { value: hre.ethers.parseEther("0.05") }
  );
  await tx2.wait();
  console.log("✅ Payment sent successfully");
  console.log("");

  // Test 3: Bucket Protocol - Create basket and open position
  console.log("Test 3: Creating basket and opening position...");
  
  // First, deposit collateral
  const collateralAmount = hre.ethers.parseEther("2.0");
  const depositTx = await bucketProtocol.connect(user1).depositCollateral(
    { value: collateralAmount }
  );
  await depositTx.wait();
  console.log("✅ Deposited collateral");
  
  // Define basket assets and weights (BTC 50%, ETH 30%, SOL 20%)
  const assets = [
    "0x0000000000000000000000000000000000000001", // Mock BTC address
    "0x0000000000000000000000000000000000000002", // Mock ETH address
    "0x0000000000000000000000000000000000000003"  // Mock SOL address
  ];
  const weights = [50, 30, 20]; // Must sum to 100
  const leverage = 10;
  
  // Create basket
  const createTx = await bucketProtocol.connect(user1).createBucket(
    assets,
    weights,
    leverage
  );
  await createTx.wait();
  console.log("✅ Basket created");
  
  // Open position
  const marginAmount = hre.ethers.parseEther("1.0");
  const openTx = await bucketProtocol.connect(user1).openPosition(
    0, // bucketId
    true, // isLong
    marginAmount
  );
  await openTx.wait();
  console.log("✅ Position opened");
  
  const positions = await bucketProtocol.getUserPositions(user1.address);
  console.log(`   Position ID: ${positions.length - 1}`);
  console.log(`   Margin: ${hre.ethers.formatEther(positions[0].margin)} ETH`);
  console.log(`   Direction: ${positions[0].isLong ? 'LONG' : 'SHORT'}`);
  console.log("");

  // Test 4: Check position and bucket details
  console.log("Test 4: Checking bucket and position details...");
  const buckets = await bucketProtocol.getUserBuckets(user1.address);
  console.log("   Assets in basket:", buckets[0].assets.length);
  console.log("   Leverage:", buckets[0].leverage + "x");
  console.log("   Weights:", buckets[0].weights.map(w => w.toString() + "%").join(", "));
  
  const activePositions = await bucketProtocol.getActivePositions(user1.address);
  console.log("   Active Positions:", activePositions.length);
  console.log("");

  console.log("=" .repeat(60));
  console.log("🎉 ALL TESTS PASSED!");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
