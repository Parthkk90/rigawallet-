// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Cresca Payments
 * @dev Simple send/receive and tap-to-pay functionality
 * @notice Instant P2P transfers on Monad
 */
contract CrescaPayments {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    struct Payment {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string memo;
        bool completed;
    }
    
    // Payment tracking
    mapping(address => Payment[]) public sentPayments;
    mapping(address => Payment[]) public receivedPayments;
    mapping(bytes32 => Payment) public paymentsByHash;
    
    uint256 public totalPayments;
    uint256 public totalVolume;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event PaymentSent(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp,
        bytes32 paymentHash
    );
    
    event PaymentReceived(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    event TapToPayCompleted(
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );
    
    // ============================================
    // ERRORS
    // ============================================
    
    error InvalidAmount();
    error InvalidRecipient();
    error TransferFailed();
    error InsufficientBalance();
    
    // ============================================
    // CORE FUNCTIONS
    // ============================================
    
    /**
     * @dev Send payment with optional memo
     * @param _to Recipient address
     * @param _memo Optional payment memo/note
     */
    function sendPayment(address _to, string memory _memo) 
        external 
        payable 
        returns (bytes32) 
    {
        if (msg.value == 0) revert InvalidAmount();
        if (_to == address(0)) revert InvalidRecipient();
        
        bytes32 paymentHash = keccak256(
            abi.encodePacked(msg.sender, _to, msg.value, block.timestamp, totalPayments)
        );
        
        Payment memory newPayment = Payment({
            from: msg.sender,
            to: _to,
            amount: msg.value,
            timestamp: block.timestamp,
            memo: _memo,
            completed: true
        });
        
        // Store payment
        sentPayments[msg.sender].push(newPayment);
        receivedPayments[_to].push(newPayment);
        paymentsByHash[paymentHash] = newPayment;
        
        totalPayments++;
        totalVolume += msg.value;
        
        // Transfer funds
        (bool success, ) = payable(_to).call{value: msg.value}("");
        if (!success) revert TransferFailed();
        
        emit PaymentSent(msg.sender, _to, msg.value, block.timestamp, paymentHash);
        emit PaymentReceived(msg.sender, _to, msg.value, block.timestamp);
        
        return paymentHash;
    }
    
    /**
     * @dev Quick send without memo (tap-to-pay use case)
     * @param _to Recipient address
     */
    function tapToPay(address _to) external payable returns (bool) {
        if (msg.value == 0) revert InvalidAmount();
        if (_to == address(0)) revert InvalidRecipient();
        
        Payment memory quickPayment = Payment({
            from: msg.sender,
            to: _to,
            amount: msg.value,
            timestamp: block.timestamp,
            memo: "Tap to Pay",
            completed: true
        });
        
        sentPayments[msg.sender].push(quickPayment);
        receivedPayments[_to].push(quickPayment);
        
        totalPayments++;
        totalVolume += msg.value;
        
        (bool success, ) = payable(_to).call{value: msg.value}("");
        if (!success) revert TransferFailed();
        
        emit TapToPayCompleted(msg.sender, _to, msg.value);
        
        return true;
    }
    
    /**
     * @dev Batch send to multiple recipients
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts (must match recipients length)
     */
    function batchSend(
        address[] memory _recipients,
        uint256[] memory _amounts
    ) external payable returns (bool) {
        require(_recipients.length == _amounts.length, "Length mismatch");
        
        uint256 totalRequired = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalRequired += _amounts[i];
        }
        
        if (msg.value < totalRequired) revert InsufficientBalance();
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (_amounts[i] > 0 && _recipients[i] != address(0)) {
                Payment memory batchPayment = Payment({
                    from: msg.sender,
                    to: _recipients[i],
                    amount: _amounts[i],
                    timestamp: block.timestamp,
                    memo: "Batch Payment",
                    completed: true
                });
                
                sentPayments[msg.sender].push(batchPayment);
                receivedPayments[_recipients[i]].push(batchPayment);
                
                (bool success, ) = payable(_recipients[i]).call{value: _amounts[i]}("");
                if (!success) revert TransferFailed();
                
                emit PaymentSent(msg.sender, _recipients[i], _amounts[i], block.timestamp, bytes32(0));
            }
        }
        
        totalPayments += _recipients.length;
        totalVolume += totalRequired;
        
        // Refund excess
        if (msg.value > totalRequired) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalRequired}("");
            if (!success) revert TransferFailed();
        }
        
        return true;
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @dev Get sent payment history
     */
    function getSentPayments(address _user) 
        external 
        view 
        returns (Payment[] memory) 
    {
        return sentPayments[_user];
    }
    
    /**
     * @dev Get received payment history
     */
    function getReceivedPayments(address _user) 
        external 
        view 
        returns (Payment[] memory) 
    {
        return receivedPayments[_user];
    }
    
    /**
     * @dev Get payment by hash
     */
    function getPaymentByHash(bytes32 _hash) 
        external 
        view 
        returns (Payment memory) 
    {
        return paymentsByHash[_hash];
    }
    
    /**
     * @dev Get recent payments (last N)
     */
    function getRecentPayments(address _user, uint256 _count, bool _sent) 
        external 
        view 
        returns (Payment[] memory) 
    {
        Payment[] storage allPayments = _sent ? sentPayments[_user] : receivedPayments[_user];
        
        uint256 length = allPayments.length;
        uint256 resultCount = _count > length ? length : _count;
        
        Payment[] memory recentPayments = new Payment[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            recentPayments[i] = allPayments[length - 1 - i];
        }
        
        return recentPayments;
    }
    
    /**
     * @dev Get payment count for user
     */
    function getPaymentCount(address _user) 
        external 
        view 
        returns (uint256 sent, uint256 received) 
    {
        return (sentPayments[_user].length, receivedPayments[_user].length);
    }
    
    /**
     * @dev Get total volume for user
     */
    function getUserVolume(address _user) 
        external 
        view 
        returns (uint256 sentVolume, uint256 receivedVolume) 
    {
        Payment[] storage sent = sentPayments[_user];
        Payment[] storage received = receivedPayments[_user];
        
        uint256 totalSent = 0;
        uint256 totalReceived = 0;
        
        for (uint256 i = 0; i < sent.length; i++) {
            totalSent += sent[i].amount;
        }
        
        for (uint256 i = 0; i < received.length; i++) {
            totalReceived += received[i].amount;
        }
        
        return (totalSent, totalReceived);
    }
    
    // ============================================
    // RECEIVE FUNCTION
    // ============================================
    
    receive() external payable {
        // Allow direct receives (anonymous payments)
        Payment memory directPayment = Payment({
            from: msg.sender,
            to: address(this),
            amount: msg.value,
            timestamp: block.timestamp,
            memo: "Direct Transfer",
            completed: true
        });
        
        sentPayments[msg.sender].push(directPayment);
        totalPayments++;
        totalVolume += msg.value;
    }
}
