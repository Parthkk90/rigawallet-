# 🚀 Monad Blitz Hackathon - Quick Start Guide

## ⚡ Fast Track (5 Minutes to Demo)

### 1. Setup (2 minutes)
```bash
cd monad
npm install
cp .env.example .env
# Add your Monad testnet private key to .env
```

### 2. Compile Contracts (30 seconds)
```bash
npx hardhat compile
```

### 3. Deploy to Monad Testnet (1 minute)
```bash
npx hardhat run scripts/deploy.js --network monadTestnet
```

### 4. Test Locally (1.5 minutes)
```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/test-contracts.js --network localhost
```

## 🎯 Demo Script for Judges

### Feature 1: Calendar Payments (Scheduled Transactions)
**Problem**: Users forget to pay bills on time, miss DCA opportunities  
**Solution**: Automated on-chain scheduled payments

**Live Demo**:
```javascript
// Schedule monthly rent payment
await calendarPayments.createRecurringPayment(
  landlordAddress,
  ethers.parseEther("1.5"), // 1.5 ETH/month
  firstExecutionTimestamp,
  30, // every 30 days
  12  // 12 months
);
```

### Feature 2: Instant Payments (Tap-to-Pay)
**Problem**: Complex wallet UIs, slow transactions  
**Solution**: One-tap instant transfers

**Live Demo**:
```javascript
// Simple tap-to-pay
await payments.sendPayment(
  recipientAddress,
  { value: ethers.parseEther("0.1") }
);
```

### Feature 3: Basket Trading with 150x Leverage (MVP) 🏆
**Problem**: 
- Traders want diversified exposure but CEXs charge per position
- Managing 5 positions = 5x fees + 5x liquidation risk
- No platform offers custom basket perpetuals with high leverage

**Solution**: 
- One transaction = entire basket position
- Custom weights (e.g., 50% BTC, 30% ETH, 20% SOL)
- Up to 150x leverage via Merkle Trade integration
- Auto-rebalancing maintains risk profile

**Live Demo**:
```javascript
// Open 10x leveraged basket: 50% BTC, 30% ETH, 20% SOL
await bucketProtocol.openPosition(
  true,  // Long position
  5000,  // 50% BTC
  3000,  // 30% ETH
  2000,  // 20% SOL
  10,    // 10x leverage
  { value: ethers.parseEther("1.0") } // 1 ETH margin
);

// This gives $10 exposure to custom basket!
```

**Competitive Advantage**:
- **No competitor offers this** (GMX, dYdX = single assets only)
- **3x cheaper** than opening 3 separate positions
- **Lower liquidation risk** (diversified vs. concentrated)
- **Mobile-first** (Monad's speed enables mobile trading)

## 📊 Technical Highlights for Judges

### Why Monad?
1. **Parallel Execution**: Multiple positions can be opened simultaneously
2. **Low Latency**: Critical for 150x leverage (sub-second liquidations)
3. **EVM Compatible**: Reused Ethereum tooling, faster development
4. **Scalability**: Handle 1000s of automated payments without congestion

### Smart Contract Innovation
- **Gas Optimized**: Custom errors, storage packing
- **Security First**: OpenZeppelin, ReentrancyGuard, overflow protection
- **Modular Design**: 3 independent contracts, composable
- **Event-Driven**: Full transaction history via events

### Real-World Use Cases
1. **Traders**: Hedge funds using basket trades for portfolio management
2. **Freelancers**: Automated monthly payments to contractors
3. **DAOs**: Recurring grants and contributor payments
4. **DeFi Users**: DCA strategies without manual intervention

## 🏆 Judging Criteria Alignment

### Innovation (35%)
- ✅ First basket perpetual protocol on Monad
- ✅ No existing competitor offers 150x basket trading
- ✅ Novel auto-rebalancing algorithm

### Technical Implementation (25%)
- ✅ Clean, auditable Solidity code
- ✅ Gas-optimized (custom errors, efficient storage)
- ✅ Full test coverage

### User Experience (20%)
- ✅ One-transaction basket creation
- ✅ Simple API for mobile integration
- ✅ Clear error messages and events

### Market Potential (20%)
- ✅ $1.5T derivatives market TAM
- ✅ Revenue model: 0.3% trading fees
- ✅ Viral potential: Traders want 150x leverage

## 🎤 Pitch Deck Talking Points

**Problem**: 
"Crypto traders want diversified leverage but CEXs charge per position. Opening a 5-asset portfolio = 5x fees, 5x liquidation risk, 5x complexity."

**Solution**: 
"Cresca offers custom basket perpetuals with 150x leverage in ONE transaction. Trade like a hedge fund, pay one fee."

**Why Monad**: 
"Monad's parallel EVM lets us process multiple price feeds simultaneously, enabling real-time basket rebalancing that's impossible on serial chains."

**Traction**: 
"Converted all Move smart contracts from Aptos implementation to Solidity. Ready for mainnet post-audit."

**Business Model**: 
"0.3% fee on trading volume. At $500M annual volume = $1.5M revenue. Wallet features drive user acquisition, trading monetizes."

**Ask**: 
"Win this hackathon, integrate with Monad ecosystem, launch testnet beta."

## 📝 Pre-Demo Checklist

- [ ] Contracts compiled without errors
- [ ] Deployed to Monad testnet with verified addresses
- [ ] Tested all 3 features locally
- [ ] Prepared demo wallet with test tokens
- [ ] Screenshots/screen recording as backup
- [ ] Rehearsed pitch (under 5 minutes)
- [ ] Laptop charged, backup slides ready

## 🐛 Common Issues & Fixes

**Issue**: Contract deployment fails  
**Fix**: Check private key in .env, ensure testnet tokens

**Issue**: Gas estimation failed  
**Fix**: Increase gas limit in hardhat.config.js

**Issue**: Transaction reverts  
**Fix**: Check require() messages, ensure sufficient balance

**Issue**: Can't connect to Monad testnet  
**Fix**: Verify RPC URL, check network status

## 📞 Emergency Contacts

- **Monad Team**: Available during hackathon
- **Mentor Support**: Check Monad Blitz Discord
- **GitHub Issues**: https://github.com/Parthkk90/Cresca-/issues

---

**Good luck! You've got this! 🚀⚡**
