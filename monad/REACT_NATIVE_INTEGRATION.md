# 📱 Cresca React Native Integration Guide

**Complete guide for building Cresca mobile app on Monad Testnet**  
**Last Updated**: December 13, 2025  
**Network**: Monad Testnet (Chain ID: 10143)

---

## 🚀 Quick Start Summary

### Deployed Contract Addresses (Monad Testnet)

```javascript
const CRESCA_CONTRACTS = {
  calendarPayments: "0x2eA1b3CA34eaFC5aB9762c962e68E7Ba490674F2",
  payments: "0xE058f9da1354e12AB45322215784cf55a129C5bC",
  bucketProtocol: "0xA3036Ec7b6F27C6A1cB54FC3e60C39aEB523f2d5"
};

const NETWORK_CONFIG = {
  rpcUrl: "https://testnet-rpc.monad.xyz",
  chainId: 10143,
  networkName: "Monad Testnet",
  blockExplorer: "https://explorer.testnet.monad.xyz" // Update when available
};
```

---

## 📦 Step 1: Install Dependencies

```bash
# Core dependencies
npm install ethers@6.16.0
npm install @react-native-async-storage/async-storage
npm install react-native-get-random-values  # For crypto random numbers

# UI components (optional but recommended)
npm install @react-navigation/native
npm install react-native-safe-area-context
```

---

## 🔧 Step 2: Basic Setup Code

### Create `src/config/contracts.js`

```javascript
import { ethers } from 'ethers';

// Network Configuration
export const MONAD_TESTNET = {
  rpcUrl: "https://testnet-rpc.monad.xyz",
  chainId: 10143,
  networkName: "Monad Testnet",
  symbol: "MON",
  decimals: 18,
  blockExplorer: "https://explorer.testnet.monad.xyz"
};

// Contract Addresses
export const CONTRACTS = {
  calendarPayments: "0x2eA1b3CA34eaFC5aB9762c962e68E7Ba490674F2",
  payments: "0xE058f9da1354e12AB45322215784cf55a129C5bC",
  bucketProtocol: "0xA3036Ec7b6F27C6A1cB54FC3e60C39aEB523f2d5"
};

// Initialize Provider
export const getProvider = () => {
  return new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrl);
};

// Initialize Wallet (use user's private key from secure storage)
export const getWallet = (privateKey) => {
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
};
```

### Create `src/config/abis.js`

```javascript
// Calendar Payments ABI
export const CALENDAR_PAYMENTS_ABI = [
  "function createSchedule(address _recipient, uint256 _amount, uint256 _executeAt, uint256 _intervalSeconds, uint256 _occurrences) payable returns (uint256)",
  "function createOneTimePayment(address _recipient, uint256 _amount, uint256 _executeAt) payable returns (uint256)",
  "function createRecurringPayment(address _recipient, uint256 _amount, uint256 _firstExecutionAt, uint256 _intervalDays, uint256 _occurrences) payable returns (uint256)",
  "function executeSchedule(address _payer, uint256 _scheduleId) returns (bool)",
  "function cancelSchedule(uint256 _scheduleId)",
  "function getSchedule(address _payer, uint256 _scheduleId) view returns (tuple(address payer, address recipient, uint256 amount, uint256 executeAt, uint256 intervalSeconds, uint256 occurrences, uint256 executedCount, bool active, uint256 escrowBalance, uint256 createdAt))",
  "function getUserSchedules(address _user) view returns (tuple(address payer, address recipient, uint256 amount, uint256 executeAt, uint256 intervalSeconds, uint256 occurrences, uint256 executedCount, bool active, uint256 escrowBalance, uint256 createdAt)[])",
  "function totalSchedules() view returns (uint256)",
  "event ScheduleCreated(address indexed payer, uint256 indexed scheduleId, address indexed recipient, uint256 amount, uint256 executeAt, bool isRecurring)",
  "event PaymentExecuted(address indexed payer, uint256 indexed scheduleId, address indexed recipient, uint256 amount, uint256 executionNumber)"
];

// Instant Payments ABI
export const PAYMENTS_ABI = [
  "function sendPayment(address _to, string _memo) payable returns (bytes32)",
  "function tapToPay(address _to) payable returns (bool)",
  "function batchSendPayments(address[] _recipients, uint256[] _amounts, string[] _memos) payable returns (bool)",
  "function getSentPayments(address _user) view returns (tuple(address from, address to, uint256 amount, uint256 timestamp, string memo, bool completed)[])",
  "function getReceivedPayments(address _user) view returns (tuple(address from, address to, uint256 amount, uint256 timestamp, string memo, bool completed)[])",
  "function totalPayments() view returns (uint256)",
  "function totalVolume() view returns (uint256)",
  "event PaymentSent(address indexed from, address indexed to, uint256 amount, string memo, bytes32 paymentId)",
  "event TapToPayExecuted(address indexed from, address indexed to, uint256 amount)"
];

// Bucket Protocol ABI
export const BUCKET_PROTOCOL_ABI = [
  "function createBucket(address[] _assets, uint64[] _weights, uint8 _leverage) returns (uint64)",
  "function openPosition(uint64 _bucketId, bool _isLong, uint256 _margin) returns (uint256)",
  "function closePosition(uint256 _positionId) returns (int256)",
  "function depositCollateral() payable",
  "function withdrawCollateral(uint256 _amount)",
  "function getCollateralBalance(address _user) view returns (uint256)",
  "function getUserBuckets(address _user) view returns (tuple(address[] assets, uint64[] weights, uint8 leverage, address owner, bool exists)[])",
  "function getUserPositions(address _user) view returns (tuple(uint64 bucketId, bool isLong, uint256 margin, uint256 entryPrice, address owner, bool active, uint256 openTimestamp)[])",
  "function getActivePositions(address _user) view returns (tuple(uint64 bucketId, bool isLong, uint256 margin, uint256 entryPrice, address owner, bool active, uint256 openTimestamp)[])",
  "function getUnrealizedPnL(address _owner, uint256 _positionId) view returns (int256)",
  "function updateOracle(address[] _assets, uint256[] _prices, int256[] _fundingRates)",
  "function rebalanceBucket(uint64 _bucketId, uint64[] _newWeights)",
  "function MIN_LEVERAGE() view returns (uint8)",
  "function MAX_LEVERAGE() view returns (uint8)",
  "event BucketCreated(uint64 indexed bucketId, address indexed owner, address[] assets, uint64[] weights, uint8 leverage)",
  "event PositionOpened(uint256 indexed positionId, uint64 indexed bucketId, address indexed owner, bool isLong, uint256 margin, uint256 entryPrice)",
  "event PositionClosed(uint256 indexed positionId, address indexed owner, int256 pnl)"
];
```

---

## 💼 Step 3: Wallet Management Service

### Create `src/services/WalletService.js`

```javascript
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';

const WALLET_KEY = '@cresca_wallet_private_key';

class WalletService {
  
  // Create new wallet
  async createWallet() {
    const wallet = ethers.Wallet.createRandom();
    await AsyncStorage.setItem(WALLET_KEY, wallet.privateKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase
    };
  }

  // Import wallet from private key
  async importWalletFromPrivateKey(privateKey) {
    const wallet = new ethers.Wallet(privateKey);
    await AsyncStorage.setItem(WALLET_KEY, privateKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  // Import wallet from mnemonic
  async importWalletFromMnemonic(mnemonic) {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    await AsyncStorage.setItem(WALLET_KEY, wallet.privateKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: mnemonic
    };
  }

  // Get stored wallet
  async getWallet() {
    const privateKey = await AsyncStorage.getItem(WALLET_KEY);
    if (!privateKey) return null;
    
    const wallet = new ethers.Wallet(privateKey);
    return {
      address: wallet.address,
      privateKey: privateKey
    };
  }

  // Get balance
  async getBalance(address, provider) {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  // Clear wallet (logout)
  async clearWallet() {
    await AsyncStorage.removeItem(WALLET_KEY);
  }
}

export default new WalletService();
```

---

## 📅 Step 4: Calendar Payments Service

### Create `src/services/CalendarPaymentsService.js`

```javascript
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import { CALENDAR_PAYMENTS_ABI } from '../config/abis';

class CalendarPaymentsService {
  
  constructor(wallet) {
    this.contract = new ethers.Contract(
      CONTRACTS.calendarPayments,
      CALENDAR_PAYMENTS_ABI,
      wallet
    );
  }

  // Create one-time payment
  async createOneTimePayment(recipientAddress, amountMON, executeTimestamp) {
    try {
      const amount = ethers.parseEther(amountMON.toString());
      
      const tx = await this.contract.createOneTimePayment(
        recipientAddress,
        amount,
        executeTimestamp,
        { value: amount }
      );
      
      const receipt = await tx.wait();
      console.log('One-time payment created:', receipt.hash);
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Create one-time payment error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create recurring payment (e.g., monthly subscription)
  async createRecurringPayment(recipientAddress, amountPerPayment, startTimestamp, intervalDays, totalPayments) {
    try {
      const amount = ethers.parseEther(amountPerPayment.toString());
      const totalAmount = amount * BigInt(totalPayments);
      
      const tx = await this.contract.createRecurringPayment(
        recipientAddress,
        amount,
        startTimestamp,
        intervalDays,
        totalPayments,
        { value: totalAmount }
      );
      
      const receipt = await tx.wait();
      console.log('Recurring payment created:', receipt.hash);
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Create recurring payment error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's schedules
  async getUserSchedules(userAddress) {
    try {
      const schedules = await this.contract.getUserSchedules(userAddress);
      return schedules.map((schedule, index) => ({
        id: index,
        recipient: schedule.recipient,
        amount: ethers.formatEther(schedule.amount),
        executeAt: new Date(Number(schedule.executeAt) * 1000),
        isRecurring: schedule.intervalSeconds > 0,
        totalPayments: Number(schedule.occurrences),
        executedPayments: Number(schedule.executedCount),
        active: schedule.active,
        escrowBalance: ethers.formatEther(schedule.escrowBalance)
      }));
    } catch (error) {
      console.error('Get schedules error:', error);
      return [];
    }
  }

  // Cancel schedule
  async cancelSchedule(scheduleId) {
    try {
      const tx = await this.contract.cancelSchedule(scheduleId);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Cancel schedule error:', error);
      return { success: false, error: error.message };
    }
  }

  // Execute due payment
  async executeSchedule(payerAddress, scheduleId) {
    try {
      const tx = await this.contract.executeSchedule(payerAddress, scheduleId);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Execute schedule error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default CalendarPaymentsService;
```

---

## 💸 Step 5: Instant Payments Service

### Create `src/services/PaymentsService.js`

```javascript
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import { PAYMENTS_ABI } from '../config/abis';

class PaymentsService {
  
  constructor(wallet) {
    this.contract = new ethers.Contract(
      CONTRACTS.payments,
      PAYMENTS_ABI,
      wallet
    );
  }

  // Send payment with memo
  async sendPayment(toAddress, amountMON, memo = "") {
    try {
      const amount = ethers.parseEther(amountMON.toString());
      
      const tx = await this.contract.sendPayment(
        toAddress,
        memo,
        { value: amount }
      );
      
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Send payment error:', error);
      return { success: false, error: error.message };
    }
  }

  // Tap to pay (instant payment)
  async tapToPay(toAddress, amountMON) {
    try {
      const amount = ethers.parseEther(amountMON.toString());
      
      const tx = await this.contract.tapToPay(
        toAddress,
        { value: amount }
      );
      
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Tap to pay error:', error);
      return { success: false, error: error.message };
    }
  }

  // Batch send payments
  async batchSendPayments(recipients, amounts, memos) {
    try {
      const parsedAmounts = amounts.map(a => ethers.parseEther(a.toString()));
      const totalAmount = parsedAmounts.reduce((a, b) => a + b, BigInt(0));
      
      const tx = await this.contract.batchSendPayments(
        recipients,
        parsedAmounts,
        memos,
        { value: totalAmount }
      );
      
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Batch send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get sent payments
  async getSentPayments(userAddress) {
    try {
      const payments = await this.contract.getSentPayments(userAddress);
      return payments.map(payment => ({
        from: payment.from,
        to: payment.to,
        amount: ethers.formatEther(payment.amount),
        timestamp: new Date(Number(payment.timestamp) * 1000),
        memo: payment.memo,
        completed: payment.completed
      }));
    } catch (error) {
      console.error('Get sent payments error:', error);
      return [];
    }
  }

  // Get received payments
  async getReceivedPayments(userAddress) {
    try {
      const payments = await this.contract.getReceivedPayments(userAddress);
      return payments.map(payment => ({
        from: payment.from,
        to: payment.to,
        amount: ethers.formatEther(payment.amount),
        timestamp: new Date(Number(payment.timestamp) * 1000),
        memo: payment.memo,
        completed: payment.completed
      }));
    } catch (error) {
      console.error('Get received payments error:', error);
      return [];
    }
  }
}

export default PaymentsService;
```

---

## 🪣 Step 6: Basket Trading Service

### Create `src/services/BucketProtocolService.js`

```javascript
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import { BUCKET_PROTOCOL_ABI } from '../config/abis';

class BucketProtocolService {
  
  constructor(wallet) {
    this.contract = new ethers.Contract(
      CONTRACTS.bucketProtocol,
      BUCKET_PROTOCOL_ABI,
      wallet
    );
  }

  // Create custom basket
  async createBucket(assetAddresses, weights, leverage) {
    try {
      // weights must sum to 10000 (100%)
      const tx = await this.contract.createBucket(
        assetAddresses,
        weights,
        leverage
      );
      
      const receipt = await tx.wait();
      
      // Parse BucketCreated event to get bucketId
      const event = receipt.logs.find(log => 
        log.topics[0] === ethers.id("BucketCreated(uint64,address,address[],uint64[],uint8)")
      );
      
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Create bucket error:', error);
      return { success: false, error: error.message };
    }
  }

  // Deposit collateral
  async depositCollateral(amountMON) {
    try {
      const amount = ethers.parseEther(amountMON.toString());
      const tx = await this.contract.depositCollateral({ value: amount });
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Deposit collateral error:', error);
      return { success: false, error: error.message };
    }
  }

  // Open position (long or short)
  async openPosition(bucketId, isLong, marginMON) {
    try {
      const margin = ethers.parseEther(marginMON.toString());
      
      const tx = await this.contract.openPosition(
        bucketId,
        isLong,
        margin
      );
      
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Open position error:', error);
      return { success: false, error: error.message };
    }
  }

  // Close position
  async closePosition(positionId) {
    try {
      const tx = await this.contract.closePosition(positionId);
      const receipt = await tx.wait();
      
      // Get PnL from event
      const event = receipt.logs.find(log => 
        log.topics[0] === ethers.id("PositionClosed(uint256,address,int256)")
      );
      
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error('Close position error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's buckets
  async getUserBuckets(userAddress) {
    try {
      const buckets = await this.contract.getUserBuckets(userAddress);
      return buckets.map((bucket, index) => ({
        id: index,
        assets: bucket.assets,
        weights: bucket.weights.map(w => Number(w)),
        leverage: Number(bucket.leverage),
        owner: bucket.owner,
        exists: bucket.exists
      }));
    } catch (error) {
      console.error('Get user buckets error:', error);
      return [];
    }
  }

  // Get active positions
  async getActivePositions(userAddress) {
    try {
      const positions = await this.contract.getActivePositions(userAddress);
      return positions.map((pos, index) => ({
        id: index,
        bucketId: Number(pos.bucketId),
        isLong: pos.isLong,
        margin: ethers.formatEther(pos.margin),
        entryPrice: ethers.formatEther(pos.entryPrice),
        active: pos.active,
        openTimestamp: new Date(Number(pos.openTimestamp) * 1000)
      }));
    } catch (error) {
      console.error('Get active positions error:', error);
      return [];
    }
  }

  // Get unrealized P&L
  async getUnrealizedPnL(userAddress, positionId) {
    try {
      const pnl = await this.contract.getUnrealizedPnL(userAddress, positionId);
      return ethers.formatEther(pnl);
    } catch (error) {
      console.error('Get PnL error:', error);
      return "0";
    }
  }

  // Get collateral balance
  async getCollateralBalance(userAddress) {
    try {
      const balance = await this.contract.getCollateralBalance(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Get collateral balance error:', error);
      return "0";
    }
  }

  // Get leverage limits
  async getLeverageLimits() {
    try {
      const min = await this.contract.MIN_LEVERAGE();
      const max = await this.contract.MAX_LEVERAGE();
      return { min: Number(min), max: Number(max) };
    } catch (error) {
      console.error('Get leverage limits error:', error);
      return { min: 1, max: 150 };
    }
  }
}

export default BucketProtocolService;
```

---

## 🎯 Step 7: Usage Examples in React Native Components

### Example: Send Payment Screen

```javascript
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { getWallet } from '../config/contracts';
import PaymentsService from '../services/PaymentsService';
import WalletService from '../services/WalletService';

const SendPaymentScreen = () => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendPayment = async () => {
    try {
      setLoading(true);
      
      // Get user's wallet
      const walletData = await WalletService.getWallet();
      if (!walletData) {
        Alert.alert('Error', 'No wallet found');
        return;
      }
      
      // Initialize wallet with provider
      const wallet = getWallet(walletData.privateKey);
      
      // Create payments service
      const paymentsService = new PaymentsService(wallet);
      
      // Send payment
      const result = await paymentsService.sendPayment(recipient, amount, memo);
      
      if (result.success) {
        Alert.alert('Success', `Payment sent! TX: ${result.txHash}`);
        // Clear form
        setRecipient('');
        setAmount('');
        setMemo('');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Recipient Address"
        value={recipient}
        onChangeText={setRecipient}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Amount (MON)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Memo (optional)"
        value={memo}
        onChangeText={setMemo}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button 
        title={loading ? "Sending..." : "Send Payment"} 
        onPress={handleSendPayment}
        disabled={loading || !recipient || !amount}
      />
    </View>
  );
};

export default SendPaymentScreen;
```

### Example: Create Scheduled Payment

```javascript
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { getWallet } from '../config/contracts';
import CalendarPaymentsService from '../services/CalendarPaymentsService';
import WalletService from '../services/WalletService';

const SchedulePaymentScreen = () => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [intervalDays, setIntervalDays] = useState('30');
  const [totalPayments, setTotalPayments] = useState('12');
  const [loading, setLoading] = useState(false);

  const handleSchedulePayment = async () => {
    try {
      setLoading(true);
      
      const walletData = await WalletService.getWallet();
      const wallet = getWallet(walletData.privateKey);
      const calendarService = new CalendarPaymentsService(wallet);
      
      // Start 1 day from now
      const startTimestamp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
      
      const result = await calendarService.createRecurringPayment(
        recipient,
        amount,
        startTimestamp,
        parseInt(intervalDays),
        parseInt(totalPayments)
      );
      
      if (result.success) {
        Alert.alert('Success', 'Recurring payment scheduled!');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Recipient Address"
        value={recipient}
        onChangeText={setRecipient}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Amount per payment (MON)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Interval (days)"
        value={intervalDays}
        onChangeText={setIntervalDays}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Total Payments"
        value={totalPayments}
        onChangeText={setTotalPayments}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button 
        title={loading ? "Creating..." : "Schedule Recurring Payment"} 
        onPress={handleSchedulePayment}
        disabled={loading}
      />
    </View>
  );
};

export default SchedulePaymentScreen;
```

---

## 🔒 Security Best Practices

### 1. Never Hardcode Private Keys
```javascript
// ❌ WRONG
const privateKey = "0x123abc...";

// ✅ CORRECT - Store in secure storage
import AsyncStorage from '@react-native-async-storage/async-storage';
const privateKey = await AsyncStorage.getItem('@wallet_private_key');
```

### 2. Use React Native Keychain for Production
```bash
npm install react-native-keychain
```

```javascript
import * as Keychain from 'react-native-keychain';

// Store private key securely
await Keychain.setGenericPassword('wallet', privateKey);

// Retrieve private key
const credentials = await Keychain.getGenericPassword();
const privateKey = credentials.password;
```

### 3. Validate All User Inputs
```javascript
const isValidAddress = (address) => {
  return ethers.isAddress(address);
};

const isValidAmount = (amount) => {
  return !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
};
```

---

## 🧪 Testing Guide

### Test with Small Amounts First
```javascript
// Test payment with 0.001 MON
const testAmount = "0.001";
await paymentsService.sendPayment(testAddress, testAmount, "Test payment");
```

### Get Testnet MON Tokens
- Request from developer: `0x6dfeF2888256bf83BF24C3F5e2EC1f76F734F41C` has MON
- Monad Testnet Faucet: Check Monad Discord for faucet links

---

## 📚 Additional Resources

- **Ethers.js Documentation**: https://docs.ethers.org/v6/
- **React Native**: https://reactnative.dev/
- **Monad Documentation**: https://docs.monad.xyz/

---

## 🆘 Common Issues & Solutions

### Issue: "Insufficient funds for gas"
**Solution**: Ensure wallet has enough MON for transaction + gas fees

### Issue: "Network request failed"
**Solution**: Check RPC URL is correct and network is accessible

### Issue: "Transaction reverted"
**Solution**: Check contract function parameters match expected types

---

## 📞 Support

For developer support:
- GitHub: https://github.com/Parthkk90/Cresca-
- Contract addresses verified on Monad Testnet
- All contracts deployed and tested on December 13, 2025

---

**Ready to build! 🚀**
