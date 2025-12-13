// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Cresca Bucket Protocol
 * @dev Leveraged basket trading protocol with up to 150x leverage
 * @notice Converted from Move for Monad EVM compatibility
 */
contract CrescaBucketProtocol {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    struct Bucket {
        address[] assets;
        uint64[] weights;
        uint8 leverage;
        address owner;
        bool exists;
    }
    
    struct Position {
        uint64 bucketId;
        bool isLong;
        uint256 margin;
        uint256 entryPrice;
        address owner;
        bool active;
        uint256 openTimestamp;
    }
    
    struct Collateral {
        address owner;
        uint256 balance;
    }
    
    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }
    
    // Storage mappings
    mapping(address => Bucket[]) public userBuckets;
    mapping(address => Position[]) public userPositions;
    mapping(address => uint256) public collateralBalances;
    mapping(address => PriceData) public assetPrices; // Mock oracle
    mapping(address => int256) public fundingRates;
    
    // Global counters
    uint256 public totalPositions;
    uint256 public totalBuckets;
    
    // Constants
    uint8 public constant MAX_LEVERAGE = 150;
    uint8 public constant MIN_LEVERAGE = 1;
    uint256 public constant LIQUIDATION_THRESHOLD = 5; // 5% remaining margin
    uint256 public constant PRICE_PRECISION = 1e8;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event BucketCreated(
        uint64 indexed bucketId,
        address indexed owner,
        address[] assets,
        uint64[] weights,
        uint8 leverage
    );
    
    event PositionOpened(
        uint256 indexed positionId,
        uint64 indexed bucketId,
        address indexed owner,
        bool isLong,
        uint256 margin,
        uint256 entryPrice
    );
    
    event PositionClosed(
        uint256 indexed positionId,
        address indexed owner,
        int256 pnl
    );
    
    event BucketRebalanced(
        uint64 indexed bucketId,
        uint64[] newWeights
    );
    
    event CollateralDeposited(
        address indexed user,
        uint256 amount
    );
    
    event CollateralWithdrawn(
        address indexed user,
        uint256 amount
    );
    
    event Liquidation(
        uint256 indexed positionId,
        address indexed owner,
        string reason
    );
    
    event OracleUpdated(
        address indexed asset,
        uint256 price,
        int256 fundingRate
    );
    
    // ============================================
    // ERRORS
    // ============================================
    
    error InvalidLeverage();
    error InvalidWeights();
    error InsufficientCollateral();
    error PositionNotFound();
    error Unauthorized();
    error BucketNotFound();
    error InvalidAssets();
    error TransferFailed();
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier validLeverage(uint8 _leverage) {
        if (_leverage < MIN_LEVERAGE || _leverage > MAX_LEVERAGE) {
            revert InvalidLeverage();
        }
        _;
    }
    
    // ============================================
    // CORE FUNCTIONS
    // ============================================
    
    /**
     * @dev Create a custom basket with specified assets and weights
     * @param _assets Array of asset addresses (token addresses)
     * @param _weights Array of weights (must sum to 100)
     * @param _leverage Leverage multiplier (1-150x)
     */
    function createBucket(
        address[] memory _assets,
        uint64[] memory _weights,
        uint8 _leverage
    ) external validLeverage(_leverage) returns (uint64) {
        if (_assets.length != _weights.length || _assets.length == 0) {
            revert InvalidWeights();
        }
        
        // Validate weights sum to 100%
        uint64 totalWeight = 0;
        for (uint256 i = 0; i < _weights.length; i++) {
            totalWeight += _weights[i];
        }
        if (totalWeight != 100) {
            revert InvalidWeights();
        }
        
        uint64 bucketId = uint64(userBuckets[msg.sender].length);
        
        Bucket memory newBucket = Bucket({
            assets: _assets,
            weights: _weights,
            leverage: _leverage,
            owner: msg.sender,
            exists: true
        });
        
        userBuckets[msg.sender].push(newBucket);
        totalBuckets++;
        
        emit BucketCreated(bucketId, msg.sender, _assets, _weights, _leverage);
        
        return bucketId;
    }
    
    /**
     * @dev Deposit collateral for trading (native ETH/Monad)
     */
    function depositCollateral() external payable {
        if (msg.value == 0) revert InsufficientCollateral();
        
        collateralBalances[msg.sender] += msg.value;
        
        emit CollateralDeposited(msg.sender, msg.value);
    }
    
    /**
     * @dev Withdraw collateral
     * @param _amount Amount to withdraw
     */
    function withdrawCollateral(uint256 _amount) external {
        if (collateralBalances[msg.sender] < _amount) {
            revert InsufficientCollateral();
        }
        
        collateralBalances[msg.sender] -= _amount;
        
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        if (!success) revert TransferFailed();
        
        emit CollateralWithdrawn(msg.sender, _amount);
    }
    
    /**
     * @dev Open a leveraged position on a basket
     * @param _bucketId ID of the bucket to trade
     * @param _isLong True for long, false for short
     * @param _margin Margin amount to use
     */
    function openPosition(
        uint64 _bucketId,
        bool _isLong,
        uint256 _margin
    ) external returns (uint256) {
        if (_bucketId >= userBuckets[msg.sender].length) {
            revert BucketNotFound();
        }
        
        Bucket storage bucket = userBuckets[msg.sender][_bucketId];
        if (!bucket.exists) revert BucketNotFound();
        
        if (collateralBalances[msg.sender] < _margin) {
            revert InsufficientCollateral();
        }
        
        // Deduct margin from collateral
        collateralBalances[msg.sender] -= _margin;
        
        // Calculate basket entry price (weighted average)
        uint256 entryPrice = calculateBasketPrice(bucket.assets, bucket.weights);
        
        uint256 positionId = userPositions[msg.sender].length;
        
        Position memory newPosition = Position({
            bucketId: _bucketId,
            isLong: _isLong,
            margin: _margin,
            entryPrice: entryPrice,
            owner: msg.sender,
            active: true,
            openTimestamp: block.timestamp
        });
        
        userPositions[msg.sender].push(newPosition);
        totalPositions++;
        
        emit PositionOpened(positionId, _bucketId, msg.sender, _isLong, _margin, entryPrice);
        
        return positionId;
    }
    
    /**
     * @dev Close a position and realize P&L
     * @param _positionId ID of the position to close
     */
    function closePosition(uint256 _positionId) external returns (int256) {
        if (_positionId >= userPositions[msg.sender].length) {
            revert PositionNotFound();
        }
        
        Position storage position = userPositions[msg.sender][_positionId];
        
        if (!position.active) revert PositionNotFound();
        if (position.owner != msg.sender) revert Unauthorized();
        
        // Get bucket for current price calculation
        Bucket storage bucket = userBuckets[msg.sender][position.bucketId];
        uint256 exitPrice = calculateBasketPrice(bucket.assets, bucket.weights);
        
        // Calculate P&L
        int256 pnl = calculatePnL(position, exitPrice, bucket.leverage);
        
        // Mark position as closed
        position.active = false;
        
        // Return margin + P&L to collateral
        uint256 returnAmount = position.margin;
        if (pnl > 0) {
            returnAmount += uint256(pnl);
        } else if (pnl < 0) {
            uint256 loss = uint256(-pnl);
            if (loss >= returnAmount) {
                returnAmount = 0; // Total loss
            } else {
                returnAmount -= loss;
            }
        }
        
        collateralBalances[msg.sender] += returnAmount;
        
        emit PositionClosed(_positionId, msg.sender, pnl);
        
        return pnl;
    }
    
    /**
     * @dev Rebalance bucket weights (owner only)
     * @param _bucketId Bucket ID to rebalance
     * @param _newWeights New weight distribution
     */
    function rebalanceBucket(
        uint64 _bucketId,
        uint64[] memory _newWeights
    ) external {
        if (_bucketId >= userBuckets[msg.sender].length) {
            revert BucketNotFound();
        }
        
        Bucket storage bucket = userBuckets[msg.sender][_bucketId];
        
        if (bucket.owner != msg.sender) revert Unauthorized();
        if (_newWeights.length != bucket.assets.length) revert InvalidWeights();
        
        // Validate weights sum to 100%
        uint64 totalWeight = 0;
        for (uint256 i = 0; i < _newWeights.length; i++) {
            totalWeight += _newWeights[i];
        }
        if (totalWeight != 100) revert InvalidWeights();
        
        bucket.weights = _newWeights;
        
        emit BucketRebalanced(_bucketId, _newWeights);
    }
    
    // ============================================
    // ORACLE FUNCTIONS (Mock for Hackathon)
    // ============================================
    
    /**
     * @dev Update asset prices (mock oracle - in production use Chainlink/Pyth)
     * @param _assets Array of asset addresses
     * @param _prices Array of prices
     * @param _fundingRates Array of funding rates
     */
    function updateOracle(
        address[] memory _assets,
        uint256[] memory _prices,
        int256[] memory _fundingRates
    ) external {
        require(_assets.length == _prices.length && _prices.length == _fundingRates.length, "Length mismatch");
        
        for (uint256 i = 0; i < _assets.length; i++) {
            assetPrices[_assets[i]] = PriceData({
                price: _prices[i],
                timestamp: block.timestamp
            });
            fundingRates[_assets[i]] = _fundingRates[i];
            
            emit OracleUpdated(_assets[i], _prices[i], _fundingRates[i]);
        }
    }
    
    // ============================================
    // LIQUIDATION FUNCTIONS
    // ============================================
    
    /**
     * @dev Liquidate undercollateralized position (anyone can call)
     * @param _owner Position owner
     * @param _positionId Position ID
     */
    function liquidatePosition(
        address _owner,
        uint256 _positionId
    ) external {
        if (_positionId >= userPositions[_owner].length) {
            revert PositionNotFound();
        }
        
        Position storage position = userPositions[_owner][_positionId];
        
        if (!position.active) revert PositionNotFound();
        
        // Get current price and calculate unrealized P&L
        Bucket storage bucket = userBuckets[_owner][position.bucketId];
        uint256 currentPrice = calculateBasketPrice(bucket.assets, bucket.weights);
        int256 unrealizedPnL = calculatePnL(position, currentPrice, bucket.leverage);
        
        // Check if position should be liquidated
        uint256 remainingMargin = position.margin;
        if (unrealizedPnL < 0) {
            uint256 loss = uint256(-unrealizedPnL);
            if (loss >= remainingMargin) {
                remainingMargin = 0;
            } else {
                remainingMargin -= loss;
            }
        }
        
        // Liquidate if remaining margin < threshold
        uint256 liquidationThreshold = (position.margin * LIQUIDATION_THRESHOLD) / 100;
        if (remainingMargin > liquidationThreshold) {
            revert("Position not liquidatable");
        }
        
        position.active = false;
        
        emit Liquidation(_positionId, _owner, "Insufficient margin");
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @dev Get user's buckets
     */
    function getUserBuckets(address _user) external view returns (Bucket[] memory) {
        return userBuckets[_user];
    }
    
    /**
     * @dev Get user's positions
     */
    function getUserPositions(address _user) external view returns (Position[] memory) {
        return userPositions[_user];
    }
    
    /**
     * @dev Get active positions for user
     */
    function getActivePositions(address _user) external view returns (Position[] memory) {
        Position[] storage allPositions = userPositions[_user];
        uint256 activeCount = 0;
        
        // Count active positions
        for (uint256 i = 0; i < allPositions.length; i++) {
            if (allPositions[i].active) {
                activeCount++;
            }
        }
        
        // Create array of active positions
        Position[] memory activePositions = new Position[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allPositions.length; i++) {
            if (allPositions[i].active) {
                activePositions[index] = allPositions[i];
                index++;
            }
        }
        
        return activePositions;
    }
    
    /**
     * @dev Get collateral balance
     */
    function getCollateralBalance(address _user) external view returns (uint256) {
        return collateralBalances[_user];
    }
    
    /**
     * @dev Calculate unrealized P&L for a position
     */
    function getUnrealizedPnL(address _owner, uint256 _positionId) external view returns (int256) {
        if (_positionId >= userPositions[_owner].length) {
            revert PositionNotFound();
        }
        
        Position storage position = userPositions[_owner][_positionId];
        if (!position.active) return 0;
        
        Bucket storage bucket = userBuckets[_owner][position.bucketId];
        uint256 currentPrice = calculateBasketPrice(bucket.assets, bucket.weights);
        
        return calculatePnL(position, currentPrice, bucket.leverage);
    }
    
    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================
    
    /**
     * @dev Calculate weighted basket price
     */
    function calculateBasketPrice(
        address[] storage _assets,
        uint64[] storage _weights
    ) internal view returns (uint256) {
        uint256 weightedSum = 0;
        
        for (uint256 i = 0; i < _assets.length; i++) {
            uint256 assetPrice = assetPrices[_assets[i]].price;
            if (assetPrice == 0) {
                assetPrice = PRICE_PRECISION; // Default price
            }
            weightedSum += (assetPrice * _weights[i]) / 100;
        }
        
        return weightedSum;
    }
    
    /**
     * @dev Calculate P&L for a position
     */
    function calculatePnL(
        Position storage _position,
        uint256 _exitPrice,
        uint8 _leverage
    ) internal view returns (int256) {
        int256 priceChange;
        
        if (_position.isLong) {
            priceChange = int256(_exitPrice) - int256(_position.entryPrice);
        } else {
            priceChange = int256(_position.entryPrice) - int256(_exitPrice);
        }
        
        // P&L = (priceChange / entryPrice) * margin * leverage
        int256 pnl = (priceChange * int256(_position.margin) * int256(uint256(_leverage))) / int256(_position.entryPrice);
        
        return pnl;
    }
    
    // ============================================
    // EMERGENCY FUNCTIONS
    // ============================================
    
    /**
     * @dev Receive function to accept native tokens
     */
    receive() external payable {
        collateralBalances[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }
}
