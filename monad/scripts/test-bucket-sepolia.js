const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing CrescaBucketProtocol on Sepolia...\n");

  // Contract address
  const BUCKET_ADDRESS = "0x2eA1b3CA34eaFC5aB9762c962e68E7Ba490674F2";
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Connect to deployed contract
  const bucketProtocol = await hre.ethers.getContractAt(
    "CrescaBucketProtocol",
    BUCKET_ADDRESS
  );
  
  console.log("✅ Connected to CrescaBucketProtocol at:", BUCKET_ADDRESS);
  console.log("=".repeat(60));
  console.log("");

  try {
    // Test 1: Deposit Collateral
    console.log("Test 1: Depositing collateral...");
    const depositAmount = hre.ethers.parseEther("0.01"); // 0.01 ETH
    const depositTx = await bucketProtocol.depositCollateral({ value: depositAmount });
    await depositTx.wait();
    console.log("✅ Deposited", hre.ethers.formatEther(depositAmount), "ETH");
    console.log("   Transaction:", depositTx.hash);
    
    // Check collateral balance
    const collateralBalance = await bucketProtocol.getCollateralBalance(deployer.address);
    console.log("   Collateral Balance:", hre.ethers.formatEther(collateralBalance), "ETH");
    console.log("");

    // Test 2: Create Basket
    console.log("Test 2: Creating crypto basket...");
    const assets = [
      "0x0000000000000000000000000000000000000001", // Mock BTC
      "0x0000000000000000000000000000000000000002", // Mock ETH
      "0x0000000000000000000000000000000000000003"  // Mock SOL
    ];
    const weights = [50, 30, 20]; // 50% BTC, 30% ETH, 20% SOL (must sum to 100)
    const leverage = 10; // 10x leverage
    
    const createTx = await bucketProtocol.createBucket(assets, weights, leverage);
    const createReceipt = await createTx.wait();
    console.log("✅ Basket created");
    console.log("   Transaction:", createTx.hash);
    console.log("   Weights: BTC 50%, ETH 30%, SOL 20%");
    console.log("   Leverage:", leverage + "x");
    console.log("");

    // Get user buckets
    const buckets = await bucketProtocol.getUserBuckets(deployer.address);
    console.log("   Total Buckets:", buckets.length);
    console.log("   Bucket[0] Assets:", buckets[0].assets.length);
    console.log("   Bucket[0] Leverage:", buckets[0].leverage.toString() + "x");
    console.log("");

    // Test 3: Open Position
    console.log("Test 3: Opening LONG position...");
    const marginAmount = hre.ethers.parseEther("0.005"); // 0.005 ETH margin
    const openTx = await bucketProtocol.openPosition(
      0, // bucketId
      true, // isLong
      marginAmount
    );
    const openReceipt = await openTx.wait();
    console.log("✅ Position opened");
    console.log("   Transaction:", openTx.hash);
    console.log("   Margin:", hre.ethers.formatEther(marginAmount), "ETH");
    console.log("   Direction: LONG");
    console.log("   Notional Exposure:", hre.ethers.formatEther(marginAmount * BigInt(leverage)), "ETH");
    console.log("");

    // Get positions
    const positions = await bucketProtocol.getUserPositions(deployer.address);
    console.log("   Total Positions:", positions.length);
    if (positions.length > 0) {
      console.log("   Position[0] Margin:", hre.ethers.formatEther(positions[0].margin), "ETH");
      console.log("   Position[0] Direction:", positions[0].isLong ? "LONG" : "SHORT");
      console.log("   Position[0] Active:", positions[0].active);
    }
    console.log("");

    // Test 4: Check Active Positions
    console.log("Test 4: Checking active positions...");
    const activePositions = await bucketProtocol.getActivePositions(deployer.address);
    console.log("✅ Active Positions:", activePositions.length);
    console.log("");

    // Test 5: Close Position
    console.log("Test 5: Closing position...");
    const closeTx = await bucketProtocol.closePosition(0); // positionId 0
    await closeTx.wait();
    console.log("✅ Position closed");
    console.log("   Transaction:", closeTx.hash);
    console.log("");

    // Check updated positions
    const updatedPositions = await bucketProtocol.getUserPositions(deployer.address);
    console.log("   Position[0] Active:", updatedPositions[0].active);
    console.log("");

    // Test 6: Withdraw Collateral
    console.log("Test 6: Withdrawing collateral...");
    const withdrawAmount = hre.ethers.parseEther("0.005");
    const withdrawTx = await bucketProtocol.withdrawCollateral(withdrawAmount);
    await withdrawTx.wait();
    console.log("✅ Withdrawn", hre.ethers.formatEther(withdrawAmount), "ETH");
    console.log("   Transaction:", withdrawTx.hash);
    
    const finalBalance = await bucketProtocol.getCollateralBalance(deployer.address);
    console.log("   Remaining Collateral:", hre.ethers.formatEther(finalBalance), "ETH");
    console.log("");

    // Summary
    console.log("=".repeat(60));
    console.log("🎉 ALL TESTS PASSED!");
    console.log("=".repeat(60));
    console.log("");
    console.log("✅ Deposited collateral");
    console.log("✅ Created custom basket (BTC/ETH/SOL)");
    console.log("✅ Opened 10x leveraged LONG position");
    console.log("✅ Checked active positions");
    console.log("✅ Closed position");
    console.log("✅ Withdrew collateral");
    console.log("");
    console.log("CrescaBucketProtocol is fully functional on Sepolia! 🚀");
    console.log("");
    console.log("View all transactions on Etherscan:");
    console.log("https://sepolia.etherscan.io/address/" + BUCKET_ADDRESS);

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
