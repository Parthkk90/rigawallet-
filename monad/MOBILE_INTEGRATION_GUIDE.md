# 📱 Cresca Mobile App - Smart Contract Integration Guide

**For React Native Development**  
**Network**: Sepolia Testnet (Ethereum-compatible)  
**Date**: December 12, 2025

---

## 🔐 Wallet Configuration

### Deployment Wallets (Testnet Only - Do NOT use in production)

**Wallet #1** (Calendar & Payments contracts):
```javascript
const WALLET_1 = {
  address: "0xC4E7CB310a33F85D05C7B25C134510919c10aD8a",
  privateKey: "0x77227eed27d2541748946b2feaad8ead3e53a8fef451b6cdc16107b8dc54dd98",
  mnemonic: "thank dismiss into coconut barely once deny disorder brick dry drift sunset"
};
```

**Wallet #2** (Bucket Protocol contract):
```javascript
const WALLET_2 = {
  address: "0x6dfeF2888256bf83BF24C3F5e2EC1f76F734F41C",
  privateKey: "0x08f7ed722988e284ccf91ad90f4dbb6f6309af774e50e4ee7bc9ebb17cf6407a",
  mnemonic: "legend motor side token gym thrive helmet corn bid since voice noodle"
};
```

⚠️ **CRITICAL**: These are testnet wallets only. Never use for production/mainnet!

---

## 📍 Deployed Contract Addresses

```javascript
// Sepolia Testnet
const CRESCA_CONTRACTS = {
  calendarPayments: "0x84318e411e13f7d11eb67623b3D8339Fb5329246",
  payments: "0xe841504f694371c1466ad1A53D66cC999A271BF3",
  bucketProtocol: "0x2eA1b3CA34eaFC5aB9762c962e68E7Ba490674F2"
};

const NETWORK_CONFIG = {
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  chainId: 11155111,
  networkName: "Sepolia Testnet",
  blockExplorer: "https://sepolia.etherscan.io"
};
```

---

## 🔧 Setup for React Native

### 1. Install Dependencies

```bash
npm install ethers@6.16.0
# or
yarn add ethers@6.16.0
```

### 2. Basic Setup

```javascript
import { ethers } from 'ethers';

// Connect to Sepolia
const provider = new ethers.JsonRpcProvider(
  'https://ethereum-sepolia-rpc.publicnode.com'
);

// Create wallet instance (for transactions)
const wallet = new ethers.Wallet(WALLET_1.privateKey, provider);

// Connect to contracts
const calendarPayments = new ethers.Contract(
  CRESCA_CONTRACTS.calendarPayments,
  CALENDAR_PAYMENTS_ABI, // See below
  wallet
);
```

---

## 📝 Contract ABIs & Functions

### 1️⃣ CrescaCalendarPayments Contract

**Address**: `0x84318e411e13f7d11eb67623b3D8339Fb5329246`

#### Key Functions

##### Create Schedule (Unified function for one-time & recurring)
```javascript
// Function signature
createSchedule(
  address _recipient,      // Who receives the payment
  uint256 _amount,        // Amount in wei
  uint256 _executeAt,     // First execution timestamp
  uint256 _intervalSeconds, // Interval between payments (0 for one-time)
  uint256 _occurrences    // Number of payments (1 for one-time)
) payable returns (uint256 scheduleId)

// Example: One-time payment
const oneTimePayment = async (recipientAddress, amountETH, executeTimestamp) => {
  const amount = ethers.parseEther(amountETH); // Convert ETH to wei
  
  const tx = await calendarPayments.createSchedule(
    recipientAddress,
    amount,
    executeTimestamp,
    0,  // No interval
    1,  // One occurrence
    { value: amount } // Send ETH
  );
  
  const receipt = await tx.wait();
  console.log('Schedule created:', receipt.hash);
  return receipt;
};

// Example: Recurring payment (monthly for 12 months)
const recurringPayment = async (recipientAddress, monthlyAmountETH) => {
  const amount = ethers.parseEther(monthlyAmountETH);
  const firstExecution = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const intervalSeconds = 30 * 24 * 60 * 60; // 30 days
  const occurrences = 12; // 12 months
  const totalAmount = amount * BigInt(occurrences);
  
  const tx = await calendarPayments.createSchedule(
    recipientAddress,
    amount,
    firstExecution,
    intervalSeconds,
    occurrences,
    { value: totalAmount }
  );
  
  return await tx.wait();
};
```

##### Convenience Functions
```javascript
// One-time payment shortcut
createOneTimePayment(
  address _recipient,
  uint256 _amount,
  uint256 _executeAt
) payable returns (uint256)

// Recurring payment shortcut
createRecurringPayment(
  address _recipient,
  uint256 _amount,
  uint256 _firstExecutionAt,
  uint256 _intervalDays,    // Days, not seconds!
  uint256 _occurrences
) payable returns (uint256)
```

##### Execute Schedule
```javascript
// Execute due payment (anyone can call)
executeSchedule(
  address _payer,
  uint256 _scheduleId
) returns (bool)

// Example
const executePayment = async (payerAddress, scheduleId) => {
  const tx = await calendarPayments.executeSchedule(payerAddress, scheduleId);
  return await tx.wait();
};
```

##### Cancel Schedule
```javascript
// Cancel and refund remaining balance
cancelSchedule(uint256 _scheduleId)

// Example
const cancelPayment = async (scheduleId) => {
  const tx = await calendarPayments.cancelSchedule(scheduleId);
  return await tx.wait();
};
```

##### View Functions (Read-only, no gas)
```javascript
// Get single schedule
getSchedule(address _payer, uint256 _scheduleId) 
  returns (Schedule memory)

// Get all user schedules
getUserSchedules(address _user) 
  returns (Schedule[] memory)

// Get only active schedules
getActiveSchedules(address _user) 
  returns (Schedule[] memory)

// Schedule struct
struct Schedule {
  address payer;
  address recipient;
  uint256 amount;
  uint256 executeAt;
  uint256 intervalSeconds;
  uint256 occurrences;
  uint256 executedCount;
  uint256 escrowBalance;
  bool active;
}

// Example: Get user's schedules
const getMySchedules = async (userAddress) => {
  const schedules = await calendarPayments.getUserSchedules(userAddress);
  return schedules.map(s => ({
    payer: s.payer,
    recipient: s.recipient,
    amount: ethers.formatEther(s.amount),
    executeAt: new Date(Number(s.executeAt) * 1000),
    occurrences: Number(s.occurrences),
    executed: Number(s.executedCount),
    active: s.active
  }));
};
```

#### UI Components Needed

1. **Schedule Payment Screen**
   - Recipient address input
   - Amount input (ETH)
   - Date/time picker for execution
   - Toggle: One-time vs Recurring
   - If recurring: interval (days) and occurrences

2. **My Schedules Screen**
   - List of active schedules
   - Show: recipient, amount, next execution, progress (2/12 paid)
   - Action buttons: Cancel, Execute Now

3. **Payment History**
   - Past executed payments
   - Filter by date, recipient

---

### 2️⃣ CrescaPayments Contract

**Address**: `0xe841504f694371c1466ad1A53D66cC999A271BF3`

#### Key Functions

##### Send Payment
```javascript
// Send payment with memo
sendPayment(
  address _to,
  string memory _memo
) payable returns (bytes32)

// Example
const sendInstantPayment = async (recipientAddress, amountETH, memo) => {
  const amount = ethers.parseEther(amountETH);
  
  const tx = await payments.sendPayment(
    recipientAddress,
    memo,
    { value: amount }
  );
  
  return await tx.wait();
};

// Example: Tap-to-pay (scan QR code for address)
const tapToPay = async (qrCodeAddress, amountETH) => {
  return await sendInstantPayment(qrCodeAddress, amountETH, "Tap to Pay");
};
```

##### Batch Payments
```javascript
// Send to multiple recipients at once
sendBatchPayment(
  address[] memory _recipients,
  uint256[] memory _amounts
) payable

// Example: Split bill
const splitBill = async (friendAddresses, totalAmountETH) => {
  const perPerson = ethers.parseEther(totalAmountETH) / BigInt(friendAddresses.length);
  const amounts = friendAddresses.map(() => perPerson);
  const totalAmount = perPerson * BigInt(friendAddresses.length);
  
  const tx = await payments.sendBatchPayment(
    friendAddresses,
    amounts,
    { value: totalAmount }
  );
  
  return await tx.wait();
};
```

##### Request Payment
```javascript
// Create payment request
requestPayment(
  address _from,
  uint256 _amount,
  string memory _reason
) returns (bytes32)

// Pay request
fulfillPaymentRequest(bytes32 _requestId) payable

// Example: Request payment from friend
const requestFromFriend = async (friendAddress, amountETH, reason) => {
  const amount = ethers.parseEther(amountETH);
  const tx = await payments.requestPayment(friendAddress, amount, reason);
  return await tx.wait();
};
```

##### View Functions
```javascript
// Get payment history
getPaymentHistory(address _user, uint256 _offset, uint256 _limit)
  returns (Payment[] memory)

// Get pending requests
getPendingRequests(address _user)
  returns (PaymentRequest[] memory)

// Example: Load payment history
const loadHistory = async (userAddress, page = 0, pageSize = 20) => {
  const offset = page * pageSize;
  const history = await payments.getPaymentHistory(userAddress, offset, pageSize);
  
  return history.map(p => ({
    from: p.from,
    to: p.to,
    amount: ethers.formatEther(p.amount),
    memo: p.memo,
    timestamp: new Date(Number(p.timestamp) * 1000)
  }));
};
```

#### UI Components Needed

1. **Send Payment Screen**
   - Address input (with QR scanner)
   - Amount input
   - Memo/note field
   - Tap-to-pay button (NFC integration)

2. **Batch Payment Screen**
   - Add multiple recipients
   - Individual amounts or split equally
   - Total calculation

3. **Request Payment Screen**
   - Enter requester address
   - Amount and reason
   - Send request

4. **Payment History**
   - Sent/Received transactions
   - Search and filter
   - Transaction details with Etherscan link

---

### 3️⃣ CrescaBucketProtocol Contract (MVP Feature)

**Address**: `0x2eA1b3CA34eaFC5aB9762c962e68E7Ba490674F2`

#### Key Functions

##### Deposit/Withdraw Collateral
```javascript
// Deposit ETH as collateral
depositCollateral() payable

// Withdraw collateral
withdrawCollateral(uint256 _amount)

// Check collateral balance
getCollateralBalance(address _user) view returns (uint256)

// Example
const depositFunds = async (amountETH) => {
  const amount = ethers.parseEther(amountETH);
  const tx = await bucketProtocol.depositCollateral({ value: amount });
  return await tx.wait();
};

const withdrawFunds = async (amountETH) => {
  const amount = ethers.parseEther(amountETH);
  const tx = await bucketProtocol.withdrawCollateral(amount);
  return await tx.wait();
};
```

##### Create Basket
```javascript
// Create custom crypto basket
createBucket(
  address[] memory _assets,   // Token addresses
  uint64[] memory _weights,   // Weights (must sum to 100)
  uint8 _leverage            // 1-150x
) returns (uint64 bucketId)

// Example: Create BTC/ETH/SOL basket
const createMyBasket = async () => {
  const assets = [
    "0x0000000000000000000000000000000000000001", // BTC (mock)
    "0x0000000000000000000000000000000000000002", // ETH (mock)
    "0x0000000000000000000000000000000000000003"  // SOL (mock)
  ];
  
  const weights = [50, 30, 20]; // 50% BTC, 30% ETH, 20% SOL
  const leverage = 10; // 10x leverage
  
  const tx = await bucketProtocol.createBucket(assets, weights, leverage);
  const receipt = await tx.wait();
  
  // Get bucket ID from events
  const event = receipt.logs.find(log => 
    log.topics[0] === ethers.id("BucketCreated(uint64,address,address[],uint64[],uint8)")
  );
  
  return receipt;
};
```

##### Open Position
```javascript
// Open leveraged position
openPosition(
  uint64 _bucketId,
  bool _isLong,      // true = LONG, false = SHORT
  uint256 _margin
) returns (uint256 positionId)

// Example: Open 10x LONG position
const openLongPosition = async (bucketId, marginETH) => {
  const margin = ethers.parseEther(marginETH);
  const tx = await bucketProtocol.openPosition(bucketId, true, margin);
  return await tx.wait();
};

// Example: Open SHORT position
const openShortPosition = async (bucketId, marginETH) => {
  const margin = ethers.parseEther(marginETH);
  const tx = await bucketProtocol.openPosition(bucketId, false, margin);
  return await tx.wait();
};
```

##### Close Position
```javascript
// Close position and realize P&L
closePosition(uint256 _positionId)

// Example
const closeMyPosition = async (positionId) => {
  const tx = await bucketProtocol.closePosition(positionId);
  return await tx.wait();
};
```

##### View Functions
```javascript
// Get user's buckets
getUserBuckets(address _user) view returns (Bucket[] memory)

// Get user's positions
getUserPositions(address _user) view returns (Position[] memory)

// Get active positions only
getActivePositions(address _user) view returns (Position[] memory)

// Get unrealized P&L
getUnrealizedPnL(address _owner, uint256 _positionId) 
  view returns (int256)

// Bucket struct
struct Bucket {
  address[] assets;
  uint64[] weights;
  uint8 leverage;
  address owner;
  bool exists;
}

// Position struct
struct Position {
  uint64 bucketId;
  bool isLong;
  uint256 margin;
  uint256 entryPrice;
  uint256 entryTime;
  bool active;
}

// Example: Get portfolio overview
const getPortfolio = async (userAddress) => {
  const buckets = await bucketProtocol.getUserBuckets(userAddress);
  const positions = await bucketProtocol.getActivePositions(userAddress);
  
  const portfolio = {
    buckets: buckets.map((b, i) => ({
      id: i,
      assets: b.assets,
      weights: b.weights.map(w => Number(w)),
      leverage: Number(b.leverage)
    })),
    positions: await Promise.all(positions.map(async (p, i) => {
      const pnl = await bucketProtocol.getUnrealizedPnL(userAddress, i);
      return {
        id: i,
        bucketId: Number(p.bucketId),
        direction: p.isLong ? "LONG" : "SHORT",
        margin: ethers.formatEther(p.margin),
        entryPrice: ethers.formatEther(p.entryPrice),
        pnl: ethers.formatEther(pnl),
        active: p.active
      };
    }))
  };
  
  return portfolio;
};
```

#### UI Components Needed

1. **Deposit/Withdraw Screen**
   - Balance display
   - Deposit amount input
   - Withdraw amount input
   - Available balance

2. **Create Basket Screen**
   - Asset selector (BTC, ETH, SOL, etc.)
   - Weight sliders (must total 100%)
   - Leverage selector (1x - 150x)
   - Preview basket composition

3. **Open Position Screen**
   - Select basket from user's buckets
   - Direction toggle (LONG/SHORT)
   - Margin amount input
   - Calculate notional exposure (margin × leverage)
   - Show potential liquidation price

4. **Positions Dashboard**
   - Active positions list
   - Real-time P&L
   - Entry price, current price
   - Close position button
   - Position details

5. **Trading History**
   - Past positions
   - Realized P&L
   - Win/loss statistics

---

## 📱 Complete React Native Example

```javascript
// CrescaService.js
import { ethers } from 'ethers';

const NETWORK_CONFIG = {
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  chainId: 11155111
};

const CONTRACTS = {
  calendarPayments: '0x84318e411e13f7d11eb67623b3D8339Fb5329246',
  payments: '0xe841504f694371c1466ad1A53D66cC999A271BF3',
  bucketProtocol: '0x2eA1b3CA34eaFC5aB9762c962e68E7Ba490674F2'
};

// Initialize provider
const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

class CrescaService {
  constructor(privateKey) {
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.initContracts();
  }
  
  initContracts() {
    // Load ABIs from files (see below for ABI export)
    const calendarABI = require('./abis/CrescaCalendarPayments.json');
    const paymentsABI = require('./abis/CrescaPayments.json');
    const bucketABI = require('./abis/CrescaBucketProtocol.json');
    
    this.calendarPayments = new ethers.Contract(
      CONTRACTS.calendarPayments,
      calendarABI,
      this.wallet
    );
    
    this.payments = new ethers.Contract(
      CONTRACTS.payments,
      paymentsABI,
      this.wallet
    );
    
    this.bucketProtocol = new ethers.Contract(
      CONTRACTS.bucketProtocol,
      bucketABI,
      this.wallet
    );
  }
  
  // Calendar Payments
  async scheduleOneTimePayment(recipient, amountETH, executeAt) {
    const amount = ethers.parseEther(amountETH);
    const tx = await this.calendarPayments.createOneTimePayment(
      recipient,
      amount,
      executeAt,
      { value: amount }
    );
    return await tx.wait();
  }
  
  async getMySchedules() {
    return await this.calendarPayments.getUserSchedules(this.wallet.address);
  }
  
  // Instant Payments
  async sendPayment(recipient, amountETH, memo) {
    const amount = ethers.parseEther(amountETH);
    const tx = await this.payments.sendPayment(
      recipient,
      memo,
      { value: amount }
    );
    return await tx.wait();
  }
  
  // Bucket Trading
  async depositCollateral(amountETH) {
    const amount = ethers.parseEther(amountETH);
    const tx = await this.bucketProtocol.depositCollateral({ value: amount });
    return await tx.wait();
  }
  
  async createBasket(assets, weights, leverage) {
    const tx = await this.bucketProtocol.createBucket(assets, weights, leverage);
    return await tx.wait();
  }
  
  async openPosition(bucketId, isLong, marginETH) {
    const margin = ethers.parseEther(marginETH);
    const tx = await this.bucketProtocol.openPosition(bucketId, isLong, margin);
    return await tx.wait();
  }
  
  async getMyPositions() {
    return await this.bucketProtocol.getActivePositions(this.wallet.address);
  }
}

export default CrescaService;

// Usage in React Native component
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import CrescaService from './CrescaService';

const HomeScreen = () => {
  const [cresca, setCresca] = useState(null);
  const [positions, setPositions] = useState([]);
  
  useEffect(() => {
    // Initialize with user's private key (from secure storage)
    const service = new CrescaService(USER_PRIVATE_KEY);
    setCresca(service);
    
    loadPositions();
  }, []);
  
  const loadPositions = async () => {
    const pos = await cresca.getMyPositions();
    setPositions(pos);
  };
  
  const handleSendPayment = async () => {
    try {
      const receipt = await cresca.sendPayment(
        '0xRecipientAddress',
        '0.01',
        'Coffee payment'
      );
      alert('Payment sent! TX: ' + receipt.hash);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };
  
  return (
    <View>
      <Text>My Positions: {positions.length}</Text>
      <Button title="Send Payment" onPress={handleSendPayment} />
    </View>
  );
};
```

---

## 📦 Export Contract ABIs

From your monad directory, run:

```bash
# Export ABIs for mobile app
mkdir -p abis
cp artifacts/contracts/CrescaCalendarPayments.sol/CrescaCalendarPayments.json abis/
cp artifacts/contracts/CrescaPayments.sol/CrescaPayments.json abis/
cp artifacts/contracts/CrescaBucketProtocol.sol/CrescaBucketProtocol.json abis/
```

Then share the `abis/` folder with your React Native developer.

---

## 🔒 Security Best Practices for Mobile App

1. **Never hardcode private keys in the app**
   - Use React Native Keychain/Secure Storage
   - Encrypt keys at rest

2. **User wallet management**
   - Let users import their own wallets (mnemonic/private key)
   - Or use WalletConnect for external wallet connection
   - Biometric authentication before transactions

3. **Transaction confirmation**
   - Always show transaction details before sending
   - Display gas fees
   - Require confirmation for large amounts

4. **Error handling**
   - Catch insufficient balance errors
   - Handle network timeouts
   - Show user-friendly error messages

5. **Network switching**
   - For production, switch from Sepolia to Monad mainnet
   - Update RPC URLs and contract addresses

---

## 🎯 Recommended App Flow

### Onboarding
1. Create new wallet OR import existing
2. Secure with biometrics
3. Show backup mnemonic (must save!)
4. Request testnet tokens (faucet link)

### Main Dashboard
- Balance display (ETH + USD)
- Quick actions: Send, Request, Schedule, Trade
- Recent transactions
- Active positions (if any)

### Features Navigation
- **Payments Tab**: Send, request, history
- **Scheduled Tab**: Active schedules, create new
- **Trading Tab**: Positions, create basket, deposit
- **Profile Tab**: Settings, security, export keys

---

## 🚀 Testing Checklist

- [ ] Connect to Sepolia testnet
- [ ] Load contract ABIs correctly
- [ ] Send test payment (0.001 ETH)
- [ ] Schedule one-time payment
- [ ] Create recurring payment
- [ ] Cancel schedule
- [ ] Deposit collateral (0.01 ETH)
- [ ] Create basket
- [ ] Open position
- [ ] Check real-time P&L
- [ ] Close position
- [ ] Withdraw collateral

---

## 📞 Support & Resources

- **Contract Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com
- **Ethers.js Docs**: https://docs.ethers.org/v6/
- **React Native Ethers**: https://github.com/ethers-io/ethers.js

---

**Last Updated**: December 12, 2025  
**Version**: 1.0.0  
**Network**: Sepolia Testnet (ChainID: 11155111)
