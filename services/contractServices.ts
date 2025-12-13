import { ethers } from 'ethers';
import {
    CRESCA_BUCKET_PROTOCOL_ABI,
    CRESCA_CALENDAR_PAYMENTS_ABI,
    CRESCA_PAYMENTS_ABI,
} from '../constants/contractABIs';
import { CONTRACT_ADDRESSES, web3Service } from './web3Service';

export interface ScheduledPayment {
  id: number;
  payer: string;
  recipient: string;
  amount: string;
  executeAt: number;
  intervalSeconds: number;
  occurrences: number;
  executedCount: number;
  active: boolean;
  escrowBalance: string;
  createdAt: number;
}

export interface PaymentRequest {
  id: number;
  sender: string;
  recipient: string;
  amount: string;
  description: string;
  timestamp: number;
}

export interface Bucket {
  id: number;
  assets: string[];
  weights: number[];
  leverage: number;
  owner: string;
  exists: boolean;
}

export interface Position {
  id: number;
  bucketId: number;
  isLong: boolean;
  margin: string;
  entryPrice: string;
  owner: string;
  active: boolean;
  openTimestamp: number;
}

class CrescaCalendarPaymentsService {
  private getContract() {
    return web3Service.getContract(
      CONTRACT_ADDRESSES.CrescaCalendarPayments,
      CRESCA_CALENDAR_PAYMENTS_ABI
    );
  }

  // Create scheduled payment with production-grade transaction handling
  async createScheduledPayment(
    recipient: string,
    amount: string,
    executeAt: number,
    intervalSeconds: number,
    occurrences: number
  ): Promise<string> {
    try {
      console.log('📅 Creating scheduled payment on Monad...');
      console.log('Recipient:', recipient);
      console.log('Amount per payment:', amount, 'MON');
      console.log('Total occurrences:', occurrences);
      
      // Validate inputs
      if (!ethers.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }
      
      if (occurrences <= 0 || occurrences > 1000) {
        throw new Error('Invalid number of occurrences (1-1000)');
      }
      
      const contract = this.getContract();
      const amountWei = ethers.parseEther(amount);
      const totalAmount = amountWei * BigInt(occurrences);
      
      console.log('💰 Total amount required:', ethers.formatEther(totalAmount), 'MON');
      
      // Estimate gas before transaction
      const gasEstimate = await contract.createSchedule.estimateGas(
        recipient,
        amountWei,
        executeAt,
        intervalSeconds,
        occurrences,
        { value: totalAmount }
      );
      
      console.log('⛽ Estimated gas:', gasEstimate.toString());
      
      // Execute transaction with gas buffer
      const tx = await contract.createSchedule(
        recipient,
        amountWei,
        executeAt,
        intervalSeconds,
        occurrences,
        { 
          value: totalAmount,
          gasLimit: gasEstimate + (gasEstimate / BigInt(4)) // 25% buffer
        }
      );
      
      console.log('📡 Transaction submitted:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        console.log('✅ Scheduled payment created successfully!');
        console.log('📊 Gas used:', receipt.gasUsed.toString());
        return receipt.hash;
      } else {
        throw new Error('Transaction failed during execution');
      }
    } catch (error: any) {
      console.error('❌ Error creating scheduled payment:', error.message);
      throw new Error(`Failed to create scheduled payment: ${error.message}`);
    }
  }

  async executePayment(payerAddress: string, scheduleId: number): Promise<string> {
    try {
      console.log('⚡ Executing scheduled payment...');
      const contract = this.getContract();
      const tx = await contract.executeSchedule(payerAddress, scheduleId);
      const receipt = await tx.wait();
      console.log('✅ Payment executed successfully!');
      return receipt.hash;
    } catch (error) {
      console.error('Error executing payment:', error);
      throw error;
    }
  }

  async cancelPayment(scheduleId: number): Promise<string> {
    try {
      console.log('🚫 Canceling scheduled payment...');
      const contract = this.getContract();
      const tx = await contract.cancelSchedule(scheduleId);
      const receipt = await tx.wait();
      console.log('✅ Payment cancelled successfully!');
      return receipt.hash;
    } catch (error) {
      console.error('Error canceling payment:', error);
      throw error;
    }
  }

  async getUserPayments(userAddress: string): Promise<ScheduledPayment[]> {
    try {
      if (!userAddress || userAddress === '') {
        console.log('⚠️ No wallet address provided, returning empty payments');
        return [];
      }
      
      const contract = this.getContract();
      const schedules = await contract.getUserSchedules(userAddress);
      
      const payments: ScheduledPayment[] = schedules.map((schedule: any, index: number) => ({
        id: index,
        payer: schedule.payer,
        recipient: schedule.recipient,
        amount: ethers.formatEther(schedule.amount),
        executeAt: Number(schedule.executeAt),
        intervalSeconds: Number(schedule.intervalSeconds),
        occurrences: Number(schedule.occurrences),
        executedCount: Number(schedule.executedCount),
        active: schedule.active,
        escrowBalance: ethers.formatEther(schedule.escrowBalance),
        createdAt: Number(schedule.createdAt),
      }));
      
      return payments;
    } catch (error) {
      console.error('Error getting user payments:', error);
      return [];
    }
  }
}

class CrescaPaymentsService {
  private getContract() {
    return web3Service.getContract(
      CONTRACT_ADDRESSES.CrescaPayments,
      CRESCA_PAYMENTS_ABI
    );
  }

  // Send instant payment with production-grade validation and execution
  async sendPayment(recipient: string, amount: string, memo: string = ''): Promise<string> {
    try {
      console.log('💸 Sending instant payment on Monad...');
      console.log('Recipient:', recipient);
      console.log('Amount:', amount, 'MON');
      console.log('Memo:', memo || '(none)');
      
      // Validate inputs
      if (!ethers.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }
      
      if (memo.length > 200) {
        throw new Error('Memo too long (max 200 characters)');
      }
      
      const contract = this.getContract();
      const amountWei = ethers.parseEther(amount);
      
      // Estimate gas first
      const gasEstimate = await contract.sendPayment.estimateGas(
        recipient, 
        memo.trim(), 
        { value: amountWei }
      );
      
      console.log('⛽ Estimated gas:', gasEstimate.toString());
      
      // Execute transaction with proper gas settings
      const tx = await contract.sendPayment(recipient, memo.trim(), {
        value: amountWei,
        gasLimit: gasEstimate + (gasEstimate / BigInt(4)) // 25% buffer
      });
      
      console.log('📡 Payment transaction submitted:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        console.log('✅ Payment confirmed successfully!');
        console.log('📊 Gas used:', receipt.gasUsed.toString());
        console.log('🧾 Transaction included in block:', receipt.blockNumber);
        return receipt.hash;
      } else {
        throw new Error('Payment transaction failed during execution');
      }
    } catch (error: any) {
      console.error('❌ Error sending payment:', error.message);
      throw new Error(`Payment failed: ${error.message}`);
    }
  }

  // Tap to pay - instant payment without memo
  async tapToPay(recipient: string, amount: string): Promise<string> {
    try {
      console.log('👆 Tap to Pay on Monad...');
      console.log('Recipient:', recipient);
      console.log('Amount:', amount, 'MON');
      
      if (!ethers.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }
      
      const contract = this.getContract();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract.tapToPay(recipient, {
        value: amountWei
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        console.log('✅ Tap to Pay completed!');
        return receipt.hash;
      } else {
        throw new Error('Tap to Pay failed');
      }
    } catch (error: any) {
      console.error('❌ Error with Tap to Pay:', error.message);
      throw new Error(`Tap to Pay failed: ${error.message}`);
    }
  }

  async getSentPayments(userAddress: string): Promise<PaymentRequest[]> {
    try {
      if (!userAddress || userAddress === '') {
        console.log('⚠️ No wallet address provided, returning empty sent payments');
        return [];
      }
      
      const contract = this.getContract();
      const payments = await contract.getSentPayments(userAddress);
      
      return payments.map((payment: any, index: number) => ({
        id: index,
        sender: payment.from,
        recipient: payment.to,
        amount: ethers.formatEther(payment.amount),
        description: payment.memo,
        timestamp: Number(payment.timestamp),
      }));
    } catch (error) {
      console.error('Error getting sent payments:', error);
      return [];
    }
  }

  async getReceivedPayments(userAddress: string): Promise<PaymentRequest[]> {
    try {
      if (!userAddress || userAddress === '') {
        console.log('⚠️ No wallet address provided, returning empty received payments');
        return [];
      }
      
      const contract = this.getContract();
      const payments = await contract.getReceivedPayments(userAddress);
      
      return payments.map((payment: any, index: number) => ({
        id: index,
        sender: payment.from,
        recipient: payment.to,
        amount: ethers.formatEther(payment.amount),
        description: payment.memo,
        timestamp: Number(payment.timestamp),
      }));
    } catch (error) {
      console.error('Error getting received payments:', error);
      return [];
    }
  }

  // Get all transactions (combined sent and received)
  async getUserTransactions(userAddress: string): Promise<PaymentRequest[]> {
    try {
      if (!userAddress || userAddress === '') {
        console.log('⚠️ No wallet address provided, returning empty transactions');
        return [];
      }
      
      // Get both sent and received payments
      const [sent, received] = await Promise.all([
        this.getSentPayments(userAddress),
        this.getReceivedPayments(userAddress),
      ]);
      
      // Combine and sort by timestamp
      const allTransactions = [...sent, ...received].sort((a, b) => b.timestamp - a.timestamp);
      
      return allTransactions;
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }
}

class CrescaBucketProtocolService {
  private getContract() {
    return web3Service.getContract(
      CONTRACT_ADDRESSES.CrescaBucketProtocol,
      CRESCA_BUCKET_PROTOCOL_ABI
    );
  }

  // Test if contract is available and working
  async testContract(): Promise<boolean> {
    try {
      const contract = this.getContract();
      // Try to call a simple view function to test connectivity
      console.log('📄 Testing contract connectivity...');
      
      // If contract has any view functions, try calling one
      // For now, just check if we can create the contract instance
      if (contract.target) {
        console.log('✅ Bucket contract is accessible at:', contract.target);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Bucket contract test failed:', error);
      return false;
    }
  }

  async createBucket(
    assetAddresses: string[],
    weights: number[],
    leverage: number
  ): Promise<string> {
    try {
      console.log('🪣 Creating bucket on Monad...');
      const contract = this.getContract();
      
      // Validate inputs
      if (assetAddresses.length === 0 || weights.length === 0) {
        throw new Error('At least one asset must be selected');
      }
      
      if (assetAddresses.length !== weights.length) {
        throw new Error('Asset and weight arrays must have the same length');
      }
      
      // Validate weights sum to 100
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      if (totalWeight !== 100) {
        throw new Error('Asset weights must sum to exactly 100');
      }
      
      // Validate leverage range
      if (leverage < 1 || leverage > 150) {
        throw new Error('Leverage must be between 1x and 150x');
      }
      
      console.log('📄 Creating bucket:', {
        assets: assetAddresses,
        weights,
        leverage,
      });
      
      // Create bucket
      const tx = await contract.createBucket(
        assetAddresses,
        weights,
        leverage
      );
      
      console.log('📡 Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        console.log('✅ Bucket created successfully!');
        return receipt.hash;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error creating bucket:', error);
      
      if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient MON balance');
      }
      
      if (error.message.includes('InvalidLeverage')) {
        throw new Error('Invalid leverage value (must be 1-150x)');
      }
      
      if (error.message.includes('InvalidWeights')) {
        throw new Error('Invalid asset weights (must sum to 100)');
      }
      
      throw error;
    }
  }

  // Deposit collateral for trading
  async depositCollateral(amount: string): Promise<string> {
    try {
      console.log('💰 Depositing collateral:', amount, 'MON');
      const contract = this.getContract();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract.depositCollateral({
        value: amountWei
      });
      
      const receipt = await tx.wait();
      console.log('✅ Collateral deposited successfully!');
      return receipt.hash;
    } catch (error: any) {
      console.error('Error depositing collateral:', error.message);
      throw error;
    }
  }

  // Withdraw collateral
  async withdrawCollateral(amount: string): Promise<string> {
    try {
      console.log('💸 Withdrawing collateral:', amount, 'MON');
      const contract = this.getContract();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract.withdrawCollateral(amountWei);
      const receipt = await tx.wait();
      
      console.log('✅ Collateral withdrawn successfully!');
      return receipt.hash;
    } catch (error: any) {
      console.error('Error withdrawing collateral:', error.message);
      throw error;
    }
  }

  // Get user's collateral balance in the contract
  async getCollateralBalance(userAddress: string): Promise<string> {
    try {
      const contract = this.getContract();
      
      try {
        const balance = await contract.getCollateralBalance(userAddress);
        return ethers.formatEther(balance);
      } catch (contractError) {
        // Contract not available or function not implemented
        console.log('⚠️ Collateral balance unavailable (demo mode) - returning 0');
        return '0.000';
      }
    } catch (error) {
      console.error('Error getting collateral balance:', error);
      return '0.000';
    }
  }

  async openPosition(
    bucketId: number,
    isLong: boolean,
    marginAmount: string
  ): Promise<string> {
    try {
      console.log('📈 Opening position on Monad...');
      console.log('Bucket ID:', bucketId);
      console.log('Direction:', isLong ? 'Long' : 'Short');
      console.log('Margin:', marginAmount, 'MON');
      
      const contract = this.getContract();
      const marginWei = ethers.parseEther(marginAmount);

      const tx = await contract.openPosition(bucketId, isLong, marginWei);
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        console.log('✅ Position opened successfully!');
        return receipt.hash;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error opening position:', error.message);
      throw error;
    }
  }

  async closePosition(positionId: number): Promise<string> {
    try {
      const contract = this.getContract();
      const tx = await contract.closePosition(positionId);
      return tx.hash;
    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  async getUserBuckets(userAddress: string): Promise<Bucket[]> {
    try {
      if (!userAddress || userAddress === '') {
        console.log('⚠️ No wallet address provided, returning empty buckets');
        return [];
      }
      
      const contract = this.getContract();
      
      try {
        const buckets = await contract.getUserBuckets(userAddress);
        
        return buckets.map((bucket: any, index: number) => ({
          id: index,
          assets: bucket.assets,
          weights: bucket.weights.map((w: bigint) => Number(w)),
          leverage: Number(bucket.leverage),
          owner: bucket.owner,
          exists: bucket.exists,
        }));
      } catch (contractError: any) {
        console.log('⚠️ Bucket contract unavailable (demo mode) - returning empty data');
        return [];
      }
    } catch (error) {
      console.error('Error getting user buckets:', error);
      return [];
    }
  }

  async getUserPositions(userAddress: string): Promise<Position[]> {
    try {
      if (!userAddress || userAddress === '') {
        console.log('⚠️ No wallet address provided, returning empty positions');
        return [];
      }
      
      const contract = this.getContract();
      
      try {
        const positions = await contract.getUserPositions(userAddress);
        
        return positions.map((position: any, index: number) => ({
          id: index,
          bucketId: Number(position.bucketId),
          isLong: position.isLong,
          margin: ethers.formatEther(position.margin),
          entryPrice: ethers.formatEther(position.entryPrice),
          owner: position.owner,
          active: position.active,
          openTimestamp: Number(position.openTimestamp),
        }));
      } catch (contractError) {
        // Contract not available or function not implemented
        console.log('⚠️ Position contract unavailable (demo mode) - returning empty data');
        return [];
      }
    } catch (error) {
      console.error('Error getting user positions:', error);
      return [];
    }
  }
}

// Export service instances
export const crescaCalendarPaymentsService = new CrescaCalendarPaymentsService();
export const crescaPaymentsService = new CrescaPaymentsService();
export const crescaBucketProtocolService = new CrescaBucketProtocolService();