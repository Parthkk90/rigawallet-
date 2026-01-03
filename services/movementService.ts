import { AptosClient, AptosAccount, Types } from 'aptos';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

// Movement Network Configuration
export const MOVEMENT_CONFIG = {
  testnet: {
    rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
    faucetUrl: 'https://faucet.testnet.movementnetwork.xyz',
    chainId: 250,
    name: 'Movement Testnet',
    explorerUrl: 'https://explorer.testnet.movementnetwork.xyz',
  },
};

// Contract Address on Movement Testnet
export const CONTRACT_ADDRESS = '0x3aa36fb1c8226096d5216f0c5b45bd24b3b37cc55a7e68cdfd2762c5f82e3796';

// Storage Keys
export const STORAGE_KEYS = {
  PRIVATE_KEY: 'movement_private_key',
  WALLET_ADDRESS: 'movement_wallet_address',
  WALLET_NAME: 'movement_wallet_name',
  TRANSACTION_HISTORY: 'movement_transaction_history',
};

class MovementService {
  private client: AptosClient;
  private account: AptosAccount | null = null;
  private config = MOVEMENT_CONFIG.testnet;

  constructor() {
    this.client = new AptosClient(this.config.rpcUrl);
  }

  // ==================== Wallet Management ====================

  /**
   * Initialize or load existing wallet
   */
  async initializeWallet(): Promise<{ address: string; isNew: boolean }> {
    try {
      // Try to load existing wallet
      const existingKey = await SecureStore.getItemAsync(STORAGE_KEYS.PRIVATE_KEY);
      
      if (existingKey) {
        this.account = AptosAccount.fromAptosAccountObject({
          privateKeyHex: existingKey
        });
        console.log('✅ Loaded existing wallet:', this.account.address().hex());
        return { address: this.account.address().hex(), isNew: false };
      }

      // Create new wallet
      this.account = new AptosAccount();
      const privateKeyHex = `0x${Buffer.from(this.account.signingKey.secretKey).toString('hex')}`;
      
      await SecureStore.setItemAsync(STORAGE_KEYS.PRIVATE_KEY, privateKeyHex);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, this.account.address().hex());
      
      console.log('✅ Created new wallet:', this.account.address().hex());
      return { address: this.account.address().hex(), isNew: true };
    } catch (error) {
      console.error('❌ Error initializing wallet:', error);
      throw error;
    }
  }

  /**
   * Import wallet from private key
   */
  async importWallet(privateKeyHex: string): Promise<string> {
    try {
      if (!privateKeyHex.startsWith('0x')) {
        privateKeyHex = '0x' + privateKeyHex;
      }

      this.account = AptosAccount.fromAptosAccountObject({
        privateKeyHex: privateKeyHex
      });

      await SecureStore.setItemAsync(STORAGE_KEYS.PRIVATE_KEY, privateKeyHex);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, this.account.address().hex());

      console.log('✅ Imported wallet:', this.account.address().hex());
      return this.account.address().hex();
    } catch (error) {
      console.error('❌ Error importing wallet:', error);
      throw error;
    }
  }

  /**
   * Get current wallet address
   */
  getWalletAddress(): string | null {
    return this.account ? this.account.address().hex() : null;
  }

  /**
   * Get account balance
   */
  async getBalance(address?: string): Promise<string> {
    try {
      const addr = address || this.account?.address().hex();
      if (!addr) {
        console.warn('⚠️ No wallet address available for balance check');
        return '0.00';
      }

      try {
        const resource = await this.client.getAccountResource(
          addr,
          '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
        );

        const balance = (resource.data as any).coin.value;
        return (Number(balance) / 100000000).toFixed(8); // Convert to MOVE
      } catch (resourceError: any) {
        // Account might not exist yet or no resources
        if (resourceError?.status === 404 || 
            resourceError?.message?.includes('not found') ||
            resourceError?.message?.includes('JSON Parse')) {
          console.log('ℹ️ Account not found on Movement Network - balance is 0');
          return '0.00';
        }
        throw resourceError;
      }
    } catch (error: any) {
      // Catch JSON parse errors from API
      if (error?.message?.includes('JSON Parse')) {
        console.log('ℹ️ Movement Network API unavailable - showing 0 balance');
        return '0.00';
      }
      console.error('❌ Error getting balance:', error?.message || error);
      return '0.00';
    }
  }

  /**
   * Fund account from faucet (testnet only)
   */
  async fundFromFaucet(address?: string): Promise<void> {
    try {
      const addr = address || this.account?.address().hex();
      if (!addr) throw new Error('No wallet address available');

      const response = await fetch(
        `${this.config.faucetUrl}/mint?address=${addr}&amount=100000000`
      );

      if (!response.ok) {
        throw new Error('Faucet request failed');
      }

      console.log('✅ Funded account from faucet');
    } catch (error) {
      console.error('❌ Error funding from faucet:', error);
      throw error;
    }
  }

  // ==================== Payments Module ====================

  /**
   * Initialize payment history (graceful fallback)
   */
  async initializePayments(): Promise<string> {
    // Skip initialization - contracts not deployed yet
    console.log('ℹ️ Payment contract not deployed - skipping initialization');
    return '';
  }

  /**
   * Send payment with memo
   */
  async sendPayment(
    recipientAddress: string,
    amount: string,
    memo: string
  ): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const amountInOctas = Math.floor(parseFloat(amount) * 100000000);
      const memoBytes = Array.from(Buffer.from(memo, 'utf8'));

      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::payments::send_payment`,
        type_arguments: [],
        arguments: [recipientAddress, amountInOctas.toString(), memoBytes],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Payment sent:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error sending payment:', error);
      throw error;
    }
  }

  /**
   * Tap to pay (quick payment)
   */
  async tapToPay(recipientAddress: string, amount: string): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const amountInOctas = Math.floor(parseFloat(amount) * 100000000);

      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::payments::tap_to_pay`,
        type_arguments: [],
        arguments: [recipientAddress, amountInOctas.toString()],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Tap to pay completed:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error in tap to pay:', error);
      throw error;
    }
  }

  /**
   * Batch send to multiple recipients
   */
  async batchSend(
    recipients: string[],
    amounts: string[]
  ): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const amountsInOctas = amounts.map(amt => 
        Math.floor(parseFloat(amt) * 100000000).toString()
      );

      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::payments::batch_send`,
        type_arguments: [],
        arguments: [recipients, amountsInOctas],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Batch send completed:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error in batch send:', error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(address?: string): Promise<{
    sentCount: number;
    receivedCount: number;
    totalSent: string;
    totalReceived: string;
  }> {
    try {
      const addr = address || this.account?.address().hex();
      if (!addr) throw new Error('No wallet address available');

      const [sentCount, receivedCount] = await this.client.view({
        function: `${CONTRACT_ADDRESS}::payments::get_payment_count`,
        type_arguments: [],
        arguments: [addr],
      });

      const [totalSent, totalReceived] = await this.client.view({
        function: `${CONTRACT_ADDRESS}::payments::get_total_volume`,
        type_arguments: [],
        arguments: [addr],
      });

      return {
        sentCount: Number(sentCount),
        receivedCount: Number(receivedCount),
        totalSent: (Number(totalSent) / 100000000).toFixed(8),
        totalReceived: (Number(totalReceived) / 100000000).toFixed(8),
      };
    } catch (error) {
      console.error('❌ Error getting payment stats:', error);
      return { sentCount: 0, receivedCount: 0, totalSent: '0', totalReceived: '0' };
    }
  }

  // ==================== Wallet Module ====================

  /**
   * Initialize wallet module
   */
  async initializeWalletModule(): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::wallet::initialize_wallet`,
        type_arguments: [],
        arguments: [],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Initialized wallet module:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error initializing wallet module:', error);
      throw error;
    }
  }

  /**
   * Schedule a payment
   */
  async schedulePayment(
    recipientAddress: string,
    amount: string,
    executionTime: number,
    interval: number = 0
  ): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const amountInOctas = Math.floor(parseFloat(amount) * 100000000);

      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::wallet::schedule_payment`,
        type_arguments: [],
        arguments: [
          recipientAddress,
          amountInOctas.toString(),
          executionTime.toString(),
          interval.toString(),
        ],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Payment scheduled:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error scheduling payment:', error);
      throw error;
    }
  }

  /**
   * Get scheduled payments for an address
   */
  async getScheduledPayments(address: string): Promise<any[]> {
    try {
      // TODO: Implement when Movement Network supports querying scheduled payments
      console.log('ℹ️ Scheduled payments query not yet implemented');
      return [];
    } catch (error) {
      console.error('❌ Error getting scheduled payments:', error);
      return [];
    }
  }

  /**
   * Execute a scheduled payment
   */
  async executeScheduledPayment(address: string, scheduleId: number): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');
    
    try {
      // TODO: Implement when Movement Network supports execution
      throw new Error('Scheduled payment execution not yet implemented');
    } catch (error) {
      console.error('❌ Error executing scheduled payment:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled payment
   */
  async cancelScheduledPayment(scheduleId: number): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');
    
    try {
      // TODO: Implement when Movement Network supports cancellation
      throw new Error('Scheduled payment cancellation not yet implemented');
    } catch (error) {
      console.error('❌ Error canceling scheduled payment:', error);
      throw error;
    }
  }

  // ==================== Bucket Protocol ====================

  /**
   * Initialize bucket protocol
   */
  async initializeBucketProtocol(): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::bucket_protocol::init`,
        type_arguments: [],
        arguments: [],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Initialized bucket protocol:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error initializing bucket protocol:', error);
      throw error;
    }
  }

  /**
   * Create a bucket
   */
  async createBucket(
    assets: string[],
    weights: number[],
    leverage: number
  ): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const weightsStr = weights.map(w => w.toString());

      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::bucket_protocol::create_bucket`,
        type_arguments: [],
        arguments: [assets, weightsStr, leverage.toString()],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Bucket created:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error creating bucket:', error);
      throw error;
    }
  }

  /**
   * Open a position
   */
  async openPosition(
    bucketId: number,
    isLong: boolean,
    margin: string
  ): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const marginInOctas = Math.floor(parseFloat(margin) * 100000000);

      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::bucket_protocol::open_position`,
        type_arguments: [],
        arguments: [bucketId.toString(), isLong, marginInOctas.toString()],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Position opened:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error opening position:', error);
      throw error;
    }
  }

  /**
   * Close a position
   */
  async closePosition(positionId: number): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::bucket_protocol::close_position`,
        type_arguments: [],
        arguments: [positionId.toString()],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      console.log('✅ Position closed:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error closing position:', error);
      throw error;
    }
  }

  // ==================== View Functions ====================

  /**
   * Check if payments module is initialized
   */
  async isPaymentsInitialized(address?: string): Promise<boolean> {
    try {
      const addr = address || this.account?.address().hex();
      if (!addr) return false;

      const result = await this.client.view({
        function: `${CONTRACT_ADDRESS}::payments::is_initialized`,
        type_arguments: [],
        arguments: [addr],
      });

      return result[0] as boolean;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get transaction history (graceful fallback)
   */
  async getTransactionHistory(limit: number = 10): Promise<any[]> {
    // Return empty - contracts not deployed yet
    console.log('ℹ️ Payment contract not deployed - no transaction history available');
    return [];
  }
}

export const movementService = new MovementService();
export default movementService;
