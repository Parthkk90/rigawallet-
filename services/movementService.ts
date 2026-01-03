import { AptosClient, AptosAccount, Types } from 'aptos';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

// Movement Network Configuration (Bardock Testnet)
export const MOVEMENT_CONFIG = {
  testnet: {
    rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
    faucetUrl: 'https://faucet.testnet.movementnetwork.xyz',
    indexerUrl: 'https://hasura.testnet.movementnetwork.xyz/v1/graphql',
    chainId: 250,
    name: 'Movement Testnet (Bardock)',
    explorerUrl: 'https://explorer.movementnetwork.xyz/?network=bardock+testnet',
  },
};

// Contract Address on Movement Testnet (Deployed December 31, 2025)
export const CONTRACT_ADDRESS = '0x3aa36fb1c8226096d5216f0c5b45bd24b3b37cc55a7e68cdfd2762c5f82e3796';

// Deployed Modules
export const MODULES = {
  WALLET: `${CONTRACT_ADDRESS}::wallet`,
  PAYMENTS: `${CONTRACT_ADDRESS}::payments`,
  BUCKET_PROTOCOL: `${CONTRACT_ADDRESS}::bucket_protocol`,
};

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
   * Initialize payment history using deployed contract
   * NOTE: Payments module initialization may fail if contract not fully deployed
   * This is optional - the app works without it
   */
  async initializePayments(): Promise<string> {
    if (!this.account) {
      throw new Error('Wallet not initialized - call initializeWallet() first');
    }

    try {
      // Check if already initialized first
      const isInit = await this.isPaymentInitialized(this.account.address().hex());
      if (isInit) {
        console.log('ℹ️ Payment history already initialized');
        return '';
      }

      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${MODULES.PAYMENTS}::initialize`,
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

      console.log('✅ Payment history initialized:', txnResult.hash);
      return txnResult.hash;
    } catch (error: any) {
      // Handle common errors gracefully - payments module is OPTIONAL
      if (error?.message?.includes('RESOURCE_ALREADY_EXISTS')) {
        console.log('ℹ️ Payment history already initialized');
        return '';
      }
      if (error?.message?.includes('JSON Parse')) {
        console.log('ℹ️ Movement Network API unavailable - skipping initialization');
        return '';
      }
      if (error?.message?.includes("doesn't exist")) {
        console.log('⚠️ Payments module not available - app will work without it');
        return '';
      }
      console.error('❌ Error initializing payments:', error?.message || error);
      // Don't throw - gracefully continue without payments
      return '';
    }
  }

  /**
   * Check if payment history is initialized
   */
  async isPaymentInitialized(address: string): Promise<boolean> {
    try {
      const [isInit] = await this.client.view({
        function: `${MODULES.PAYMENTS}::is_initialized`,
        type_arguments: [],
        arguments: [address],
      });
      return Boolean(isInit);
    } catch (error) {
      // If view fails, assume not initialized
      return false;
    }
  }

  /**
   * Send payment using native Aptos coin transfer
   * The custom wallet module is not deployed, so use Aptos framework instead
   */
  async sendPayment(
    recipientAddress: string,
    amount: string,
    memo: string = ''
  ): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const amountInOctas = Math.floor(parseFloat(amount) * 100000000);

      // Use native Aptos framework coin transfer (works without custom contracts)
      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: '0x1::coin::transfer',
        type_arguments: ['0x1::aptos_coin::AptosCoin'],
        arguments: [recipientAddress, amountInOctas.toString()],
      };

      const txnRequest = await this.client.generateTransaction(
        this.account.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(this.account, txnRequest);
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      // Save transaction to local history
      await this.saveTransactionToHistory({
        hash: txnResult.hash,
        type: 'sent',
        from: this.account.address().hex(),
        to: recipientAddress,
        amount: parseFloat(amount),
        memo: memo || 'Payment sent',
        timestamp: Date.now(),
      });

      console.log('✅ Payment sent via Aptos framework:', txnResult.hash);
      return txnResult.hash;
    } catch (error) {
      console.error('❌ Error sending payment:', error);
      throw error;
    }
  }

  /**
   * Tap to pay using native Aptos coin transfer
   */
  async tapToPay(recipientAddress: string, amount: string): Promise<string> {
    if (!this.account) throw new Error('Wallet not initialized');

    try {
      const amountInOctas = Math.floor(parseFloat(amount) * 100000000);

      // Use native Aptos framework coin transfer
      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: '0x1::coin::transfer',
        type_arguments: ['0x1::aptos_coin::AptosCoin'],
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
   * Save transaction to local history
   */
  private async saveTransactionToHistory(transaction: any): Promise<void> {
    try {
      const historyKey = `${STORAGE_KEYS.TRANSACTION_HISTORY}_${this.account?.address().hex()}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Add new transaction at the beginning
      history.unshift(transaction);
      
      // Keep only last 100 transactions
      const trimmedHistory = history.slice(0, 100);
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('⚠️ Error saving transaction history:', error);
    }
  }

  /**
   * Get transaction history from local storage
   */
  async getTransactionHistory(limit: number = 10): Promise<any[]> {
    try {
      if (!this.account) return [];

      // Get from local storage
      const historyKey = `${STORAGE_KEYS.TRANSACTION_HISTORY}_${this.account.address().hex()}`;
      const storedHistory = await AsyncStorage.getItem(historyKey);
      
      if (!storedHistory) {
        console.log('ℹ️ No transaction history found');
        return [];
      }

      const history = JSON.parse(storedHistory);
      const recentHistory = history.slice(0, limit);
      
      console.log(`✅ Loaded ${recentHistory.length} transactions from history`);
      return recentHistory;
    } catch (error: any) {
      console.error('❌ Error loading transaction history:', error);
      return [];
    }
  }
}

export const movementService = new MovementService();
export default movementService;
