# Cresca - Monad Implementation 🚀

> **Built for Monad Blitz Hackathon - Pune, December 2025**

Cresca is a next-generation DeFi super wallet bringing institutional-grade trading, scheduled payments, and privacy features to Monad's parallel EVM chain.

## 🎯 Features

### 1. **Calendar Payments** 📅
- Schedule one-time and recurring payments
- Automated execution when due
- Support for bills, subscriptions, DCA strategies
- Gas-efficient escrow system

### 2. **Instant Payments** 💸
- Simple send/receive functionality
- Tap-to-pay ready
- Zero-knowledge privacy options (coming soon)
- Multi-recipient batch transfers

### 3. **Basket Trading Protocol** 🪣 (MVP Feature)
- **Custom crypto baskets**: Mix BTC, ETH, SOL in any proportion
- **Up to 150x leverage** via Merkle Trade integration
- **Auto-rebalancing**: Maintain risk profile automatically
- **Long & Short positions**: Trade both directions
- **One-transaction execution**: Open complex positions instantly

## 📦 Smart Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| `CrescaCalendarPayments.sol` | TBD | Scheduled & recurring payments |
| `CrescaPayments.sol` | TBD | Instant transfers & tap-to-pay |
| `CrescaBucketProtocol.sol` | TBD | Leveraged basket perpetual trading |

## 🛠️ Installation

```bash
# Clone repository
git clone https://github.com/Parthkk90/Cresca-.git
cd aptpays/monad

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your private key

# Compile contracts
npx hardhat compile
```

## 🚀 Deployment

### Deploy to Monad Testnet
```bash
npx hardhat run scripts/deploy.js --network monadTestnet
```

### Deploy to Monad Mainnet
```bash
npx hardhat run scripts/deploy.js --network monadMainnet
```

### Test on Local Network
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy and test
npx hardhat run scripts/test-contracts.js --network localhost
```

## 📖 Usage Examples

### Calendar Payments

#### Create One-Time Payment
```javascript
const CrescaCalendarPayments = await ethers.getContractAt(
  "CrescaCalendarPayments", 
  CALENDAR_ADDRESS
);

const executeAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour later
const amount = ethers.parseEther("1.0");

const tx = await CrescaCalendarPayments.createOneTimePayment(
  recipientAddress,
  amount,
  executeAt,
  { value: amount }
);
await tx.wait();
```

#### Create Recurring Payment (e.g., Monthly Subscription)
```javascript
const firstExecutionAt = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
const intervalDays = 30; // Monthly
const occurrences = 12; // 12 months
const monthlyAmount = ethers.parseEther("0.5");
const totalAmount = monthlyAmount * BigInt(occurrences);

const tx = await CrescaCalendarPayments.createRecurringPayment(
  recipientAddress,
  monthlyAmount,
  firstExecutionAt,
  intervalDays,
  occurrences,
  { value: totalAmount }
);
await tx.wait();
```

#### Execute Due Payment
```javascript
const tx = await CrescaCalendarPayments.executeSchedule(
  payerAddress,
  scheduleId
);
await tx.wait();
```

### Instant Payments

#### Send Payment
```javascript
const CrescaPayments = await ethers.getContractAt(
  "CrescaPayments",
  PAYMENTS_ADDRESS
);

const tx = await CrescaPayments.sendPayment(
  recipientAddress,
  { value: ethers.parseEther("0.1") }
);
await tx.wait();
```

#### Batch Payments
```javascript
const recipients = [address1, address2, address3];
const amounts = [
  ethers.parseEther("0.1"),
  ethers.parseEther("0.2"),
  ethers.parseEther("0.15")
];
const totalAmount = amounts.reduce((a, b) => a + b, 0n);

const tx = await CrescaPayments.sendBatchPayment(
  recipients,
  amounts,
  { value: totalAmount }
);
await tx.wait();
```

### Basket Trading (MVP Feature)

#### Open Long Position (50% BTC, 30% ETH, 20% SOL with 10x leverage)
```javascript
const CrescaBucketProtocol = await ethers.getContractAt(
  "CrescaBucketProtocol",
  BUCKET_ADDRESS
);

const btcWeight = 5000; // 50.00%
const ethWeight = 3000; // 30.00%
const solWeight = 2000; // 20.00%
const leverage = 10; // 10x
const margin = ethers.parseEther("1.0"); // 1 ETH margin

const tx = await CrescaBucketProtocol.openPosition(
  true, // isLong (true = long, false = short)
  btcWeight,
  ethWeight,
  solWeight,
  leverage,
  { value: margin }
);
await tx.wait();
```

#### Close Position
```javascript
const positionId = 0;
const tx = await CrescaBucketProtocol.closePosition(positionId);
await tx.wait();
```

#### View Active Positions
```javascript
const positions = await CrescaBucketProtocol.getUserPositions(userAddress);
console.log("Active positions:", positions.length);

for (let i = 0; i < positions.length; i++) {
  const pos = positions[i];
  console.log(`Position ${i}:`, {
    margin: ethers.formatEther(pos.margin),
    leverage: pos.leverage,
    direction: pos.isLong ? "LONG" : "SHORT",
    btcWeight: pos.btcWeight / 100,
    ethWeight: pos.ethWeight / 100,
    solWeight: pos.solWeight / 100,
    active: pos.active
  });
}
```

## 🧪 Testing

### Run Unit Tests
```bash
npx hardhat test
```

### Run Integration Tests
```bash
npx hardhat run scripts/test-contracts.js --network localhost
```

### Gas Reporter
```bash
REPORT_GAS=true npx hardhat test
```

## 🏗️ Architecture

### Calendar Payments Flow
```
User → createSchedule() → Escrow Locked
                             ↓
                    Time Passes (interval)
                             ↓
        Anyone → executeSchedule() → Payment Sent
                             ↓
                    Repeat if recurring
```

### Basket Trading Flow
```
User → openPosition() → Margin Locked → Oracle Prices Fetched
                             ↓
                    Position Active (150x leverage)
                             ↓
                    Auto-rebalancing (if enabled)
                             ↓
        User → closePosition() → P&L Settled → Margin Released
```

## 🔐 Security

- ✅ **Compiled with Solidity 0.8.20** (built-in overflow protection)
- ✅ **OpenZeppelin libraries** for battle-tested security
- ✅ **ReentrancyGuard** on all fund transfer functions
- ✅ **Custom errors** for gas efficiency
- 🔄 **Audit pending** before mainnet deployment

## 🌐 Monad Network Details

### Testnet
- **RPC**: `https://testnet-rpc.monad.xyz`
- **Chain ID**: 10000 (Update if different)
- **Explorer**: TBD
- **Faucet**: TBD

### Mainnet
- **RPC**: `https://rpc.monad.xyz`
- **Chain ID**: 10001 (Update if different)
- **Explorer**: TBD

## 📝 Contract ABIs

ABIs are automatically generated in `artifacts/contracts/` after compilation.

## 🤝 Contributing

This project was built for Monad Blitz Hackathon. Contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Monad Foundation** for the parallel EVM infrastructure
- **Merkle Trade** for leverage trading protocol integration
- **OpenZeppelin** for secure smart contract libraries

## 📞 Contact

- **Twitter**: [@CrescaDeFi](https://twitter.com/CrescaDeFi)
- **GitHub**: [Parthkk90/Cresca-](https://github.com/Parthkk90/Cresca-)
- **Email**: team@cresca.io

---

**Built with ⚡ for Monad Blitz - Pune, December 2025**
