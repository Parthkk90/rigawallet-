const ethers = require('ethers');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function sendFunds() {
  console.log("💸 Fund Deployment Wallet for Monad Contracts\n");
  
  const DEPLOYMENT_ADDRESS = "0xC4E7CB310a33F85D05C7B25C134510919c10aD8a";
  
  try {
    // Get your main wallet private key
    const yourPrivateKey = await question("Enter your main wallet private key (has SEP ETH): ");
    
    if (!yourPrivateKey || yourPrivateKey.length < 64) {
      console.log("❌ Invalid private key");
      rl.close();
      return;
    }
    
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    
    // Create wallet from your private key
    const senderWallet = new ethers.Wallet(yourPrivateKey, provider);
    
    console.log("\n📤 From:", senderWallet.address);
    console.log("📥 To:", DEPLOYMENT_ADDRESS);
    
    // Check sender balance
    const senderBalance = await provider.getBalance(senderWallet.address);
    console.log("💰 Your balance:", ethers.formatEther(senderBalance), "SEP ETH");
    
    if (senderBalance < ethers.parseEther("0.03")) {
      console.log("❌ Insufficient balance in your wallet");
      rl.close();
      return;
    }
    
    // Ask for amount
    const amountStr = await question("\nAmount to send (SEP ETH) [default: 0.03]: ") || "0.03";
    const amount = ethers.parseEther(amountStr);
    
    if (amount > senderBalance) {
      console.log("❌ Amount exceeds your balance");
      rl.close();
      return;
    }
    
    console.log("\n⚠️  About to send", amountStr, "SEP ETH to deployment wallet");
    const confirm = await question("Confirm? (yes/no): ");
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log("❌ Cancelled");
      rl.close();
      return;
    }
    
    console.log("\n🔄 Sending transaction...");
    
    // Send transaction
    const tx = await senderWallet.sendTransaction({
      to: DEPLOYMENT_ADDRESS,
      value: amount
    });
    
    console.log("📝 Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    await tx.wait();
    
    console.log("✅ Transaction confirmed!");
    
    // Check new balance
    const newBalance = await provider.getBalance(DEPLOYMENT_ADDRESS);
    console.log("💰 Deployment wallet balance:", ethers.formatEther(newBalance), "SEP ETH");
    
    console.log("\n✅ Ready to deploy! Run: npx hardhat run scripts/deploy.js --network sepolia");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
  
  rl.close();
}

sendFunds();
