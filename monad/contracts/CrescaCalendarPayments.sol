// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Cresca Calendar Payments
 * @dev Scheduled and recurring payment automation on Monad
 * @notice Converted from Move for EVM compatibility
 */
contract CrescaCalendarPayments {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    struct Schedule {
        address payer;
        address recipient;
        uint256 amount;
        uint256 executeAt; // Unix timestamp
        uint256 intervalSeconds; // 0 for one-time, >0 for recurring
        uint256 occurrences; // Total occurrences
        uint256 executedCount; // How many times executed
        bool active;
        uint256 escrowBalance; // Total escrowed funds
        uint256 createdAt;
    }
    
    // Storage
    mapping(address => Schedule[]) public userSchedules;
    mapping(address => uint256) public scheduleCount;
    
    uint256 public totalSchedules;
    uint256 public totalExecuted;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event ScheduleCreated(
        address indexed payer,
        uint256 indexed scheduleId,
        address indexed recipient,
        uint256 amount,
        uint256 executeAt,
        bool isRecurring
    );
    
    event PaymentExecuted(
        address indexed payer,
        uint256 indexed scheduleId,
        address indexed recipient,
        uint256 amount,
        uint256 executionNumber
    );
    
    event ScheduleCancelled(
        address indexed payer,
        uint256 indexed scheduleId,
        uint256 refundAmount
    );
    
    event ScheduleCompleted(
        address indexed payer,
        uint256 indexed scheduleId
    );
    
    // ============================================
    // ERRORS
    // ============================================
    
    error ScheduleNotFound();
    error Unauthorized();
    error InsufficientEscrow();
    error NotYetExecutable();
    error ScheduleAlreadyCompleted();
    error InvalidAmount();
    error InvalidTimestamp();
    error TransferFailed();
    
    // ============================================
    // CORE FUNCTIONS
    // ============================================
    
    /**
     * @dev Create a universal schedule (one-time or recurring)
     * @param _recipient Payment recipient
     * @param _amount Amount per payment
     * @param _executeAt First execution timestamp
     * @param _intervalSeconds 0 for one-time, >0 for recurring (in seconds)
     * @param _occurrences Total number of payments (1 for one-time)
     */
    function createSchedule(
        address _recipient,
        uint256 _amount,
        uint256 _executeAt,
        uint256 _intervalSeconds,
        uint256 _occurrences
    ) public payable returns (uint256) {
        if (_amount == 0) revert InvalidAmount();
        if (_executeAt <= block.timestamp) revert InvalidTimestamp();
        if (_occurrences == 0) revert InvalidAmount();
        if (_recipient == address(0)) revert InvalidAmount();
        
        // Calculate total escrow needed
        uint256 totalRequired = _amount * _occurrences;
        if (msg.value < totalRequired) revert InsufficientEscrow();
        
        uint256 scheduleId = userSchedules[msg.sender].length;
        
        Schedule memory newSchedule = Schedule({
            payer: msg.sender,
            recipient: _recipient,
            amount: _amount,
            executeAt: _executeAt,
            intervalSeconds: _intervalSeconds,
            occurrences: _occurrences,
            executedCount: 0,
            active: true,
            escrowBalance: totalRequired,
            createdAt: block.timestamp
        });
        
        userSchedules[msg.sender].push(newSchedule);
        scheduleCount[msg.sender]++;
        totalSchedules++;
        
        emit ScheduleCreated(
            msg.sender,
            scheduleId,
            _recipient,
            _amount,
            _executeAt,
            _intervalSeconds > 0
        );
        
        // Refund excess if any
        if (msg.value > totalRequired) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalRequired}("");
            if (!success) revert TransferFailed();
        }
        
        return scheduleId;
    }
    
    /**
     * @dev Execute a scheduled payment (anyone can call when due)
     * @param _payer Address of the payer
     * @param _scheduleId Schedule ID to execute
     */
    function executeSchedule(
        address _payer,
        uint256 _scheduleId
    ) external returns (bool) {
        if (_scheduleId >= userSchedules[_payer].length) {
            revert ScheduleNotFound();
        }
        
        Schedule storage schedule = userSchedules[_payer][_scheduleId];
        
        if (!schedule.active) revert ScheduleAlreadyCompleted();
        if (schedule.executedCount >= schedule.occurrences) revert ScheduleAlreadyCompleted();
        
        // Calculate next execution time
        uint256 nextExecutionTime = schedule.executeAt + (schedule.executedCount * schedule.intervalSeconds);
        if (block.timestamp < nextExecutionTime) revert NotYetExecutable();
        
        if (schedule.escrowBalance < schedule.amount) revert InsufficientEscrow();
        
        // Execute payment
        schedule.escrowBalance -= schedule.amount;
        schedule.executedCount++;
        
        // Transfer funds
        (bool success, ) = payable(schedule.recipient).call{value: schedule.amount}("");
        if (!success) revert TransferFailed();
        
        emit PaymentExecuted(
            _payer,
            _scheduleId,
            schedule.recipient,
            schedule.amount,
            schedule.executedCount
        );
        
        // Check if schedule is complete
        if (schedule.executedCount >= schedule.occurrences) {
            schedule.active = false;
            totalExecuted++;
            emit ScheduleCompleted(_payer, _scheduleId);
        }
        
        return true;
    }
    
    /**
     * @dev Cancel a schedule and refund remaining escrow
     * @param _scheduleId Schedule ID to cancel
     */
    function cancelSchedule(uint256 _scheduleId) external {
        if (_scheduleId >= userSchedules[msg.sender].length) {
            revert ScheduleNotFound();
        }
        
        Schedule storage schedule = userSchedules[msg.sender][_scheduleId];
        
        if (schedule.payer != msg.sender) revert Unauthorized();
        if (!schedule.active) revert ScheduleAlreadyCompleted();
        
        uint256 refundAmount = schedule.escrowBalance;
        
        // Mark as inactive
        schedule.active = false;
        schedule.escrowBalance = 0;
        
        // Refund remaining escrow
        if (refundAmount > 0) {
            (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
            if (!success) revert TransferFailed();
        }
        
        emit ScheduleCancelled(msg.sender, _scheduleId, refundAmount);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @dev Get schedule details
     */
    function getSchedule(address _payer, uint256 _scheduleId) 
        external 
        view 
        returns (Schedule memory) 
    {
        if (_scheduleId >= userSchedules[_payer].length) {
            revert ScheduleNotFound();
        }
        return userSchedules[_payer][_scheduleId];
    }
    
    /**
     * @dev Get all schedules for a user
     */
    function getUserSchedules(address _user) 
        external 
        view 
        returns (Schedule[] memory) 
    {
        return userSchedules[_user];
    }
    
    /**
     * @dev Get active schedules for a user
     */
    function getActiveSchedules(address _user) 
        external 
        view 
        returns (Schedule[] memory) 
    {
        Schedule[] storage allSchedules = userSchedules[_user];
        uint256 activeCount = 0;
        
        // Count active schedules
        for (uint256 i = 0; i < allSchedules.length; i++) {
            if (allSchedules[i].active) {
                activeCount++;
            }
        }
        
        // Create array of active schedules
        Schedule[] memory activeSchedules = new Schedule[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allSchedules.length; i++) {
            if (allSchedules[i].active) {
                activeSchedules[index] = allSchedules[i];
                index++;
            }
        }
        
        return activeSchedules;
    }
    
    /**
     * @dev Convenience function: Create one-time payment
     */
    function createOneTimePayment(
        address _recipient,
        uint256 _amount,
        uint256 _executeAt
    ) external payable returns (uint256) {
        return createSchedule(_recipient, _amount, _executeAt, 0, 1);
    }
    
    /**
     * @dev Convenience function: Create recurring payment
     */
    function createRecurringPayment(
        address _recipient,
        uint256 _amount,
        uint256 _firstExecutionAt,
        uint256 _intervalDays,
        uint256 _occurrences
    ) external payable returns (uint256) {
        uint256 intervalSeconds = _intervalDays * 1 days;
        return createSchedule(_recipient, _amount, _firstExecutionAt, intervalSeconds, _occurrences);
    }
    
    /**
     * @dev Check if a schedule is executable
     */
    function isExecutable(address _payer, uint256 _scheduleId) 
        external 
        view 
        returns (bool) 
    {
        if (_scheduleId >= userSchedules[_payer].length) {
            return false;
        }
        
        Schedule storage schedule = userSchedules[_payer][_scheduleId];
        
        if (!schedule.active) return false;
        if (schedule.executedCount >= schedule.occurrences) return false;
        
        uint256 nextExecutionTime = schedule.executeAt + (schedule.executedCount * schedule.intervalSeconds);
        
        return block.timestamp >= nextExecutionTime;
    }
    
    /**
     * @dev Get next execution time for a schedule
     */
    function getNextExecutionTime(address _payer, uint256 _scheduleId) 
        external 
        view 
        returns (uint256) 
    {
        if (_scheduleId >= userSchedules[_payer].length) {
            revert ScheduleNotFound();
        }
        
        Schedule storage schedule = userSchedules[_payer][_scheduleId];
        
        if (!schedule.active || schedule.executedCount >= schedule.occurrences) {
            return 0;
        }
        
        return schedule.executeAt + (schedule.executedCount * schedule.intervalSeconds);
    }
    
    /**
     * @dev Get total escrowed amount for a user
     */
    function getTotalEscrowed(address _user) external view returns (uint256) {
        Schedule[] storage schedules = userSchedules[_user];
        uint256 total = 0;
        
        for (uint256 i = 0; i < schedules.length; i++) {
            if (schedules[i].active) {
                total += schedules[i].escrowBalance;
            }
        }
        
        return total;
    }
    
    /**
     * @dev Batch check executable schedules across multiple users
     * @param _payers Array of payer addresses
     * @return executable Array of booleans indicating executability
     */
    function batchCheckExecutable(
        address[] memory _payers,
        uint256[] memory _scheduleIds
    ) external view returns (bool[] memory) {
        require(_payers.length == _scheduleIds.length, "Length mismatch");
        
        bool[] memory executable = new bool[](_payers.length);
        
        for (uint256 i = 0; i < _payers.length; i++) {
            if (_scheduleIds[i] < userSchedules[_payers[i]].length) {
                Schedule storage schedule = userSchedules[_payers[i]][_scheduleIds[i]];
                
                if (schedule.active && schedule.executedCount < schedule.occurrences) {
                    uint256 nextExecutionTime = schedule.executeAt + (schedule.executedCount * schedule.intervalSeconds);
                    executable[i] = block.timestamp >= nextExecutionTime;
                }
            }
        }
        
        return executable;
    }
    
    // ============================================
    // AUTOMATION HELPER
    // ============================================
    
    /**
     * @dev Execute multiple schedules in one transaction (for automation bots)
     * @param _payers Array of payers
     * @param _scheduleIds Array of schedule IDs
     * @return successCount Number of successful executions
     */
    function batchExecute(
        address[] memory _payers,
        uint256[] memory _scheduleIds
    ) external returns (uint256 successCount) {
        require(_payers.length == _scheduleIds.length, "Length mismatch");
        
        for (uint256 i = 0; i < _payers.length; i++) {
            try this.executeSchedule(_payers[i], _scheduleIds[i]) returns (bool success) {
                if (success) {
                    successCount++;
                }
            } catch {
                // Continue to next schedule on error
                continue;
            }
        }
        
        return successCount;
    }
    
    // ============================================
    // RECEIVE FUNCTION
    // ============================================
    
    receive() external payable {
        revert("Use createSchedule to send funds");
    }
}
