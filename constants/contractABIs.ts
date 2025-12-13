// Calendar Payments ABI - Monad Testnet
export const CRESCA_CALENDAR_PAYMENTS_ABI = [
  "function createSchedule(address _recipient, uint256 _amount, uint256 _executeAt, uint256 _intervalSeconds, uint256 _occurrences) payable returns (uint256)",
  "function createOneTimePayment(address _recipient, uint256 _amount, uint256 _executeAt) payable returns (uint256)",
  "function createRecurringPayment(address _recipient, uint256 _amount, uint256 _firstExecutionAt, uint256 _intervalDays, uint256 _occurrences) payable returns (uint256)",
  "function executeSchedule(address _payer, uint256 _scheduleId) returns (bool)",
  "function cancelSchedule(uint256 _scheduleId)",
  "function getSchedule(address _payer, uint256 _scheduleId) view returns (tuple(address payer, address recipient, uint256 amount, uint256 executeAt, uint256 intervalSeconds, uint256 occurrences, uint256 executedCount, bool active, uint256 escrowBalance, uint256 createdAt))",
  "function getUserSchedules(address _user) view returns (tuple(address payer, address recipient, uint256 amount, uint256 executeAt, uint256 intervalSeconds, uint256 occurrences, uint256 executedCount, bool active, uint256 escrowBalance, uint256 createdAt)[])",
  "function getActiveSchedules(address _user) view returns (tuple(address payer, address recipient, uint256 amount, uint256 executeAt, uint256 intervalSeconds, uint256 occurrences, uint256 executedCount, bool active, uint256 escrowBalance, uint256 createdAt)[])",
  "function isExecutable(address _payer, uint256 _scheduleId) view returns (bool)",
  "function getNextExecutionTime(address _payer, uint256 _scheduleId) view returns (uint256)",
  "function getTotalEscrowed(address _user) view returns (uint256)",
  "function batchExecute(address[] _payers, uint256[] _scheduleIds) returns (uint256 successCount)",
  "function totalSchedules() view returns (uint256)",
  "function totalExecuted() view returns (uint256)",
  "function scheduleCount(address) view returns (uint256)",
  "event ScheduleCreated(address indexed payer, uint256 indexed scheduleId, address indexed recipient, uint256 amount, uint256 executeAt, bool isRecurring)",
  "event PaymentExecuted(address indexed payer, uint256 indexed scheduleId, address indexed recipient, uint256 amount, uint256 executionNumber)",
  "event ScheduleCancelled(address indexed payer, uint256 indexed scheduleId, uint256 refundAmount)",
  "event ScheduleCompleted(address indexed payer, uint256 indexed scheduleId)"
];

// Instant Payments ABI - Monad Testnet
export const CRESCA_PAYMENTS_ABI = [
  "function sendPayment(address _to, string _memo) payable returns (bytes32)",
  "function tapToPay(address _to) payable returns (bool)",
  "function batchSend(address[] _recipients, uint256[] _amounts) payable returns (bool)",
  "function getSentPayments(address _user) view returns (tuple(address from, address to, uint256 amount, uint256 timestamp, string memo, bool completed)[])",
  "function getReceivedPayments(address _user) view returns (tuple(address from, address to, uint256 amount, uint256 timestamp, string memo, bool completed)[])",
  "function getPaymentByHash(bytes32 _hash) view returns (tuple(address from, address to, uint256 amount, uint256 timestamp, string memo, bool completed))",
  "function getRecentPayments(address _user, uint256 _count, bool _sent) view returns (tuple(address from, address to, uint256 amount, uint256 timestamp, string memo, bool completed)[])",
  "function getPaymentCount(address _user) view returns (uint256 sent, uint256 received)",
  "function getUserVolume(address _user) view returns (uint256 sentVolume, uint256 receivedVolume)",
  "function totalPayments() view returns (uint256)",
  "function totalVolume() view returns (uint256)",
  "event PaymentSent(address indexed from, address indexed to, uint256 amount, uint256 timestamp, bytes32 paymentHash)",
  "event PaymentReceived(address indexed from, address indexed to, uint256 amount, uint256 timestamp)",
  "event TapToPayCompleted(address indexed sender, address indexed receiver, uint256 amount)"
];

// Bucket Protocol ABI - Monad Testnet
export const CRESCA_BUCKET_PROTOCOL_ABI = [
  "function createBucket(address[] _assets, uint64[] _weights, uint8 _leverage) returns (uint64)",
  "function openPosition(uint64 _bucketId, bool _isLong, uint256 _margin) returns (uint256)",
  "function closePosition(uint256 _positionId) returns (int256)",
  "function depositCollateral() payable",
  "function withdrawCollateral(uint256 _amount)",
  "function rebalanceBucket(uint64 _bucketId, uint64[] _newWeights)",
  "function liquidatePosition(address _owner, uint256 _positionId)",
  "function updateOracle(address[] _assets, uint256[] _prices, int256[] _fundingRates)",
  "function getCollateralBalance(address _user) view returns (uint256)",
  "function getUserBuckets(address _user) view returns (tuple(address[] assets, uint64[] weights, uint8 leverage, address owner, bool exists)[])",
  "function getUserPositions(address _user) view returns (tuple(uint64 bucketId, bool isLong, uint256 margin, uint256 entryPrice, address owner, bool active, uint256 openTimestamp)[])",
  "function getActivePositions(address _user) view returns (tuple(uint64 bucketId, bool isLong, uint256 margin, uint256 entryPrice, address owner, bool active, uint256 openTimestamp)[])",
  "function getUnrealizedPnL(address _owner, uint256 _positionId) view returns (int256)",
  "function totalPositions() view returns (uint256)",
  "function totalBuckets() view returns (uint256)",
  "function collateralBalances(address) view returns (uint256)",
  "function assetPrices(address) view returns (uint256 price, uint256 timestamp)",
  "function fundingRates(address) view returns (int256)",
  "function MIN_LEVERAGE() view returns (uint8)",
  "function MAX_LEVERAGE() view returns (uint8)",
  "function LIQUIDATION_THRESHOLD() view returns (uint256)",
  "function PRICE_PRECISION() view returns (uint256)",
  "event BucketCreated(uint64 indexed bucketId, address indexed owner, address[] assets, uint64[] weights, uint8 leverage)",
  "event PositionOpened(uint256 indexed positionId, uint64 indexed bucketId, address indexed owner, bool isLong, uint256 margin, uint256 entryPrice)",
  "event PositionClosed(uint256 indexed positionId, address indexed owner, int256 pnl)",
  "event BucketRebalanced(uint64 indexed bucketId, uint64[] newWeights)",
  "event CollateralDeposited(address indexed user, uint256 amount)",
  "event CollateralWithdrawn(address indexed user, uint256 amount)",
  "event Liquidation(uint256 indexed positionId, address indexed owner, string reason)",
  "event OracleUpdated(address indexed asset, uint256 price, int256 fundingRate)"
];