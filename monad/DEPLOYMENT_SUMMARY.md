# 🔐 Cresca Monad Deployment - Wallet Summary

**Generated:** December 12, 2025  
**Network:** Sepolia Testnet (EVM-Compatible)  
**Purpose:** Monad Blitz Hackathon - Pune

---

## 📋 Deployment Status

### ✅ Successfully Deployed Contracts

#### 1. CrescaCalendarPayments
- **Contract Address:** `0x84318e411e13f7d11eb67623b3D8339Fb5329246`
- **Deployed By:** Wallet #1
- **Status:** ✅ Live on Sepolia
- **Purpose:** Scheduled & recurring payments

#### 2. CrescaPayments
- **Contract Address:** `0xe841504f694371c1466ad1A53D66cC999A271BF3`
- **Deployed By:** Wallet #1
- **Status:** ✅ Live on Sepolia
- **Purpose:** Instant payments & tap-to-pay

#### 3. CrescaBucketProtocol
- **Contract Address:** ⏳ Pending Deployment
- **Deploy With:** Wallet #2 (New)
- **Status:** ⏳ Ready to deploy (needs funding)
- **Purpose:** Basket trading with 150x leverage (MVP)

---

## 💳 Wallet #1 (Calendar & Payments Contracts)

**Purpose:** Deployed first 2 contracts  
**Status:** ⚠️ Low balance (used for gas)

```
📍 Address:
0xC4E7CB310a33F85D05C7B25C134510919c10aD8a

🔑 Private Key:
0x77227eed27d2541748946b2feaad8ead3e53a8fef451b6cdc16107b8dc54dd98

📝 Mnemonic (12 words):
thank dismiss into coconut barely once deny disorder brick dry drift sunset
```

**Deployment History:**
- ✅ CrescaCalendarPayments - Gas used: ~0.015 ETH
- ✅ CrescaPayments - Gas used: ~0.016 ETH
- ⚠️ Remaining balance: ~0.018 ETH (insufficient for BucketProtocol)

---

## 💳 Wallet #2 (Bucket Protocol Contract)

**Purpose:** Deploy BucketProtocol (largest contract)  
**Status:** 🆕 New - Needs Funding

```
📍 Address:
0x6dfeF2888256bf83BF24C3F5e2EC1f76F734F41C

🔑 Private Key:
0x08f7ed722988e284ccf91ad90f4dbb6f6309af774e50e4ee7bc9ebb17cf6407a

📝 Mnemonic (12 words):
legend motor side token gym thrive helmet corn bid since voice noodle
```

**Required Funding:**
- Estimated gas needed: 0.03-0.05 SEP ETH
- Get from faucets (see links below)

---

## 🚀 Next Steps

### Step 1: Fund Wallet #2
Fund this address with **0.05 SEP ETH**:
```
0x6dfeF2888256bf83BF24C3F5e2EC1f76F734F41C
```

**Faucets:**
- 🔗 https://sepoliafaucet.com/
- 🔗 https://www.alchemy.com/faucets/ethereum-sepolia
- 🔗 https://faucet.quicknode.com/ethereum/sepolia

### Step 2: Update .env File
```bash
# In monad/.env, add Wallet #2 private key:
PRIVATE_KEY=0x08f7ed722988e284ccf91ad90f4dbb6f6309af774e50e4ee7bc9ebb17cf6407a
```

### Step 3: Deploy BucketProtocol
```bash
cd f:\W3\aptpays\monad
npx hardhat run scripts/deploy.js --network sepolia
```

Or use the npm script:
```bash
npm run deploy:sepolia
```

---

## 🔒 Security Notes

### ⚠️ CRITICAL - Keep These Safe!

1. **Never commit `.env` file to Git**
   - Already in `.gitignore`
   - Contains private keys

2. **Backup Mnemonics**
   - Write down both mnemonics on paper
   - Store in secure location
   - These can recover wallets if private keys lost

3. **Testnet Only**
   - These wallets are for Sepolia testnet only
   - Do NOT use these keys for mainnet
   - Testnet tokens have no real value

4. **After Hackathon**
   - Generate new wallets for production
   - Never reuse testnet keys

---

## 📊 Gas Cost Summary

| Contract | Estimated Gas | Status |
|----------|---------------|--------|
| CrescaCalendarPayments | ~0.015 ETH | ✅ Deployed |
| CrescaPayments | ~0.016 ETH | ✅ Deployed |
| CrescaBucketProtocol | ~0.025 ETH | ⏳ Pending |
| **Total** | **~0.056 ETH** | 2/3 Complete |

---

## 🎯 For Hackathon Demo

### Contract Addresses (Copy for Demo)

```javascript
// Sepolia Testnet - Cresca Contracts
const CRESCA_CONTRACTS = {
  calendarPayments: "0x84318e411e13f7d11eb67623b3D8339Fb5329246",
  payments: "0xe841504f694371c1466ad1A53D66cC999A271BF3",
  bucketProtocol: "PENDING_DEPLOYMENT" // Update after Step 3
};
```

### Verification on Etherscan
Once deployed, verify contracts:
```bash
npx hardhat verify --network sepolia 0x84318e411e13f7d11eb67623b3D8339Fb5329246
npx hardhat verify --network sepolia 0xe841504f694371c1466ad1A53D66cC999A271BF3
npx hardhat verify --network sepolia <BUCKET_PROTOCOL_ADDRESS>
```

### View on Sepolia Etherscan
- Calendar Payments: https://sepolia.etherscan.io/address/0x84318e411e13f7d11eb67623b3D8339Fb5329246
- Payments: https://sepolia.etherscan.io/address/0xe841504f694371c1466ad1A53D66cC999A271BF3
- Bucket Protocol: (pending deployment)

---

## 📞 Quick Commands

```bash
# Check wallet balance
npm run check-balance

# Fund from another wallet
npm run fund-wallet

# Deploy to Sepolia
npm run deploy:sepolia

# Run local tests
npm test

# Compile contracts
npm run compile
```

---

## ✅ Pre-Demo Checklist

- [ ] Wallet #2 funded with 0.05 SEP ETH
- [ ] BucketProtocol deployed successfully
- [ ] All 3 contract addresses recorded
- [ ] Contracts verified on Etherscan
- [ ] Test transactions sent to each contract
- [ ] Demo script prepared with live contract addresses
- [ ] Backup of mnemonics stored safely
- [ ] Screenshots of deployed contracts ready

---

**Generated by Cresca Deployment System**  
**For Monad Blitz Hackathon - December 2025**
