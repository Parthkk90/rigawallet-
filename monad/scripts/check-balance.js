const ethers = require('ethers');

async function fundFromMainWallet() {
  console.log("💰 Funding Deployment Wallet from Your Main Wallet\n");
  
  const DEPLOYMENT_ADDRESS = "0xC4E7CB310a33F85D05C7B25C134510919c10aD8a";
  const REQUIRED_AMOUNT = "0.05"; // 0.05 SEP ETH needed
  
  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  
  // Check current balance
  const currentBalance = await provider.getBalance(DEPLOYMENT_ADDRESS);
  console.log("📊 Current deployment wallet balance:", ethers.formatEther(currentBalance), "SEP ETH");
  
  const needed = ethers.parseEther(REQUIRED_AMOUNT) - currentBalance;
  if (needed <= 0) {
    console.log("✅ Wallet already has enough funds!");
    return;
  }
  
  console.log("💸 Amount needed:", ethers.formatEther(needed), "SEP ETH");
  console.log("\n" + "=".repeat(60));
  console.log("SEND SEPOLIA ETH TO THIS ADDRESS:");
  console.log("=".repeat(60));
  console.log("\n📍 Address:", DEPLOYMENT_ADDRESS);
  console.log("💵 Amount:", ethers.formatEther(needed), "SEP ETH");
  console.log("\n=".repeat(60));
  console.log("\nGet Sepolia ETH from these faucets:");
  console.log("🔗 https://sepoliafaucet.com/");
  console.log("🔗 https://www.alchemy.com/faucets/ethereum-sepolia");
  console.log("🔗 https://faucet.quicknode.com/ethereum/sepolia");
  console.log("\n✅ After funding, run: npm run deploy:sepolia");
}

fundFromMainWallet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
