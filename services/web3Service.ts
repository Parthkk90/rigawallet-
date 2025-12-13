import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { createPublicClient, createWalletClient, formatEther, http, defineChain } from 'viem';
import '../utils/globalPolyfills';
import WalletStorage from './walletStorage';

// Monad Testnet Chain Definition for Viem
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://monad-testnet.socialscan.io' },
  },
  testnet: true,
});

// Monad Mainnet Chain Definition for Viem
export const monadMainnet = defineChain({
  id: 10141,
  name: 'Monad Mainnet',
  network: 'monad-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
    },
    public: {
      http: ['https://rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://monad.socialscan.io' },
  },
  testnet: false,
});

// Network Configurations
export const NETWORK_CONFIGS = {
  testnet: {
    chain: monadTestnet,
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    chainId: 10143,
    name: 'Monad Testnet',
    blockExplorerUrl: 'https://monad-testnet.socialscan.io',
  },
  mainnet: {
    chain: monadMainnet,
    rpcUrls: ['https://rpc.monad.xyz'],
    chainId: 10141,
    name: 'Monad Mainnet',
    blockExplorerUrl: 'https://monad.socialscan.io',
  },
};

// Default to testnet (backwards compatibility)
export const MONAD_CONFIG = NETWORK_CONFIGS.testnet;

// Contract Addresses on Monad Testnet
export const CONTRACT_ADDRESSES = {
  CrescaCalendarPayments: '0x2eA1b3CA34eaFC5aB9762c962e68E7Ba490674F2',
  CrescaPayments: '0xE058f9da1354e12AB45322215784cf55a129C5bC',
  CrescaBucketProtocol: '0xA3036Ec7b6F27C6A1cB54FC3e60C39aEB523f2d5',
};

// Storage Keys
export const STORAGE_KEYS = {
  WALLET_ADDRESS: 'wallet_address',
  PRIVATE_KEY: 'private_key',
  WALLET_NAME: 'wallet_name',
  TRANSACTION_HISTORY: 'transaction_history',
  NETWORK_TYPE: 'network_type',
};

class Web3Service {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  private currentRpcIndex: number = 0;
  private currentNetwork: 'testnet' | 'mainnet' = 'testnet';
  
  // Viem clients for better EVM chain support
  private publicClient: any;
  private walletClient: any;
  private viemAccount: any;
  
  // Initialization lock to prevent race conditions
  private initializationPromise: Promise<{ address: string; isNew: boolean }> | null = null;

  constructor() {
    this.loadNetworkPreference();
    this.provider = this.initializeProvider();
    this.initializeViemClients();
  }

  // Load saved network preference
  private async loadNetworkPreference(): Promise<void> {
    try {
      const savedNetwork = await AsyncStorage.getItem(STORAGE_KEYS.NETWORK_TYPE);
      if (savedNetwork === 'mainnet' || savedNetwork === 'testnet') {
        this.currentNetwork = savedNetwork;
        console.log('📡 Loaded network preference:', this.currentNetwork);
      }
    } catch (error) {
      console.error('Error loading network preference:', error);
    }
  }

  // Initialize Viem clients for current network
  private initializeViemClients(): void {
    try {
      const config = NETWORK_CONFIGS[this.currentNetwork];
      console.log('🌐 Initializing Viem clients for', config.name);
      
      this.publicClient = createPublicClient({
        chain: config.chain,
        transport: http(config.rpcUrls[this.currentRpcIndex], {
          batch: true,
          fetchOptions: {
            timeout: 10000,
          },
        }),
      });
      
      console.log('✅ Viem public client initialized for', config.name);
    } catch (error: any) {
      console.error('❌ Failed to initialize Viem clients:', error.message);
    }
  }

  // Update Viem clients when switching RPC endpoints or networks
  private updateViemClients(): void {
    try {
      const config = NETWORK_CONFIGS[this.currentNetwork];
      const newRpcUrl = config.rpcUrls[this.currentRpcIndex];
      console.log('🔄 Updating Viem clients to:', newRpcUrl);
      
      this.publicClient = createPublicClient({
        chain: config.chain,
        transport: http(newRpcUrl, {
          batch: true,
          fetchOptions: {
            timeout: 10000,
          },
        }),
      });
      
      // Update wallet client if account exists
      if (this.viemAccount) {
        this.walletClient = createWalletClient({
          account: this.viemAccount,
          chain: config.chain,
          transport: http(newRpcUrl),
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to update Viem clients:', error.message);
    }
  }

  // Initialize provider with current network settings
  private initializeProvider(): ethers.JsonRpcProvider {
    const config = NETWORK_CONFIGS[this.currentNetwork];
    const rpcUrl = config.rpcUrls[this.currentRpcIndex];
    console.log('🔗 Connecting to', config.name, 'RPC:', rpcUrl);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl, {
      chainId: config.chainId,
      name: config.name,
    }, {
      // Optimize for Monad performance
      polling: true,
      pollingInterval: 1000, // 1 second for Monad's high-speed blocks
      batchMaxCount: 1,
      batchMaxSize: 512,
    });

    // Set up error handling with automatic failover
    provider.on('error', (error) => {
      console.warn('⚠️ RPC connection issue:', error.message);
      console.log('🔄 Auto-switching to next endpoint...');
      this.switchToFallbackRPC();
    });

    return provider;
  }

  // Switch to next available RPC endpoint
  private switchToFallbackRPC(): void {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % MONAD_CONFIG.rpcUrls.length;
    const newRpcUrl = MONAD_CONFIG.rpcUrls[this.currentRpcIndex];
    console.log('🔄 Switching to fallback RPC:', newRpcUrl);
    
    this.provider = new ethers.JsonRpcProvider(newRpcUrl, {
      chainId: NETWORK_CONFIG.chainId,
      name: NETWORK_CONFIG.name,
    });

    // Reconnect wallet if it exists
    if (this.wallet) {
      this.wallet = this.wallet.connect(this.provider);
    }
    
    // Update Viem clients with new RPC
    this.updateViemClients();
  }

  // Enhanced RPC call with retry mechanism (optimized for testnet)
  private async performRpcCall<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout to each RPC call
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC call timeout')), 8000)
          )
        ]) as T;
        return result;
      } catch (error: any) {
        console.error(`❌ RPC call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
        
        if (attempt < maxRetries) {
          console.log('🔄 Switching to next RPC endpoint...');
          this.switchToFallbackRPC();
          await this.delay(1000 + (attempt * 500)); // Progressive delay
        } else {
          throw error;
        }
      }
    }
    throw new Error('All RPC endpoints failed');
  }

  // Check if error is RPC-related
  private isRpcError(error: any): boolean {
    const rpcErrors = ['server response', 'network error', 'timeout', 'quota', 'rate limit'];
    return rpcErrors.some(errorType => error.message?.toLowerCase().includes(errorType));
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Initialize wallet from stored credentials or import your specific wallet
  async initializeWallet(): Promise<{ address: string; isNew: boolean }> {
    // If initialization is already in progress, return the same promise
    if (this.initializationPromise) {
      const result = await this.initializationPromise;
      return result;
    }
    
    // If wallet is already initialized, return it
    if (this.wallet && WalletStorage.isWalletReady()) {
      console.log('✅ Wallet already initialized:', this.wallet.address);
      return { address: this.wallet.address, isNew: false };
    }
    
    // Start initialization and store the promise
    this.initializationPromise = this.performInitialization();
    
    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      // Clear the promise once initialization is complete
      this.initializationPromise = null;
    }
  }
  
  // Actual initialization logic
  private async performInitialization(): Promise<{ address: string; isNew: boolean }> {
    try {
      console.log('🔐 Initializing wallet...');
      console.log('🌐 Using Monad Testnet');
      
      const storedPrivateKey = await SecureStore.getItemAsync(STORAGE_KEYS.PRIVATE_KEY);
      const storedAddress = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
      
      // Your specific wallet details
      const yourPrivateKey = '0x08f7ed722988e284ccf91ad90f4dbb6f6309af774e50e4ee7bc9ebb17cf6407a';
      const yourAddress = '0x6dfeF2888256bf83BF24C3F5e2EC1f76F734F41C';
      
      if (storedPrivateKey) {
        console.log('🔑 Loading wallet from secure storage...');
        const wallet = new ethers.Wallet(storedPrivateKey, this.provider);
        
        // Check if it's your wallet, if not, import your wallet
        if (wallet.address.toLowerCase() !== yourAddress.toLowerCase()) {
          console.log('🔄 Different wallet detected, importing your specific wallet...');
          return await this.importSpecificWallet();
        }
        
        this.wallet = wallet;
        console.log('✅ Wallet loaded successfully:', this.wallet.address);
        
        // Store in global wallet storage
        WalletStorage.setWalletData(this.wallet.address);
        
        // Load balance and store it globally
        this.loadBalanceInBackground();
        
        // Verify network in background (non-blocking)
        this.verifyNetworkAsync();
        
        return { address: this.wallet.address, isNew: false };
      } else {
        console.log('🔄 No wallet found, importing your specific wallet...');
        return await this.importSpecificWallet();
      }
    } catch (error: any) {
      console.error('❌ Error initializing wallet:', error.message);
      // Try to import your specific wallet as fallback
      console.log('🔄 Attempting to import your specific wallet as fallback...');
      try {
        return await this.importSpecificWallet();
      } catch (importError: any) {
        throw new Error(`Wallet initialization failed: ${importError.message}`);
      }
    }
  }

  // Verify network connectivity with Viem + ethers.js (async, non-blocking, optimized for Monad testnet)
  private async verifyNetworkAsync(): Promise<void> {
    try {
      console.log('🔍 Quick network check using Viem...');
      
      // Try Viem first for better EVM chain support
      try {
        const chainId = await Promise.race([
          this.publicClient.getChainId(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Viem network check timeout')), 3000))
        ]) as number;
        
        if (chainId !== 10143) {
          console.warn(`⚠️ Chain ID mismatch: expected 10143, got ${chainId}`);
        } else {
          console.log('✅ Monad testnet verified via Viem - Chain ID:', chainId);
        }
        
        // Test block number for connection health
        const blockNumber = await this.publicClient.getBlockNumber();
        console.log('📦 Latest block via Viem:', blockNumber);
        return;
        
      } catch (viemError: any) {
        console.log('🔄 Viem network check failed, trying ethers.js...');
        
        // Fallback to ethers.js
        const network = await Promise.race([
          this.performRpcCall(() => this.provider.getNetwork()),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ethers network check timeout')), 5000))
        ]) as any;
        
        if (network.chainId !== BigInt(NETWORK_CONFIG.chainId)) {
          console.warn(`⚠️ Chain ID mismatch: expected ${NETWORK_CONFIG.chainId}, got ${network.chainId}`);
        } else {
          console.log('✅ Monad testnet verified via ethers.js - Chain ID:', network.chainId.toString());
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Network check failed (app continues):', error.message);
      console.log('💡 This is normal for testnet - balance retrieval will attempt RPC failover');
    }
  }

  // Load balance in background and store globally (non-blocking)
  private loadBalanceInBackground(): void {
    if (!this.wallet) return;
    
    this.getBalance(this.wallet.address)
      .then(balance => {
        if (balance) {
          WalletStorage.updateBalance(balance);
          console.log('💰 Background balance loaded:', balance);
        }
      })
      .catch(error => {
        console.warn('⚠️ Background balance load failed:', error.message);
      });
  }

  // Create new wallet (optimized for testnet)
  async createNewWallet(): Promise<{ address: string; isNew: boolean }> {
    try {
      console.log('🔄 Generating new wallet...');
      const newWallet = ethers.Wallet.createRandom();
      this.wallet = newWallet.connect(this.provider);
      
      console.log('🎉 New wallet created:', this.wallet.address);
      console.log('💾 Storing wallet securely...');
      
      // Store securely
      await SecureStore.setItemAsync(STORAGE_KEYS.PRIVATE_KEY, newWallet.privateKey);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, newWallet.address);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_NAME, 'Cresca Wallet');
      
      console.log('✅ Wallet stored successfully');
      
      // Verify network in background
      this.verifyNetworkAsync();
      
      return { address: newWallet.address, isNew: true };
    } catch (error: any) {
      console.error('❌ Error creating wallet:', error.message);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  // Import wallet from private key
  async importWallet(privateKey: string): Promise<string> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      this.wallet = wallet;
      
      // Store securely
      await SecureStore.setItemAsync(STORAGE_KEYS.PRIVATE_KEY, privateKey);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, wallet.address);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_NAME, 'Imported Wallet');
      
      return wallet.address;
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw error;
    }
  }

  // Get wallet balance with Viem + ethers.js for optimal Sepolia support
  async getBalance(): Promise<string> {
    try {
      if (!this.wallet) {
        console.log('⚠️ Wallet not initialized, initializing now...');
        await this.initializeWallet();
      }
      
      if (!this.wallet) {
        console.warn('❌ Wallet still not available');
        return '0.000';
      }
      
      console.log('💰 Fetching balance for:', this.wallet.address);
      console.log('🌐 Using Monad Testnet (Viem + ethers.js)');
      
      // Try Viem first (better for EVM chains)
      try {
        console.log('🔄 Attempting balance retrieval with Viem...');
        const viemBalance = await this.publicClient.getBalance({
          address: this.wallet.address as `0x${string}`,
        });
        
        const balanceEth = formatEther(viemBalance);
        console.log('✅ Balance retrieved with Viem:', balanceEth, 'MON');
        
        // Update global storage
        WalletStorage.updateBalance(balanceEth);
        return balanceEth;
      } catch (viemError: any) {
        console.log('🔄 Viem failed, trying ethers.js fallback...');
        
        // Fallback to ethers.js with direct call
        try {
          const balance = await this.provider.getBalance(this.wallet.address);
          const balanceEth = ethers.formatEther(balance);
          console.log('✅ Balance retrieved with ethers.js:', balanceEth, 'MON');
          
          // Update global storage
          WalletStorage.updateBalance(balanceEth);
          return balanceEth;
        } catch (ethersError: any) {
          console.log('🔄 Direct ethers.js failed, trying with RPC failover...');
          
          // Final fallback with RPC switching
          const balance = await this.performRpcCall(() => 
            this.provider.getBalance(this.wallet!.address)
          );
          
          const balanceEth = ethers.formatEther(balance);
          console.log('✅ Balance retrieved with RPC failover:', balanceEth, 'MON');
          
          // Update global storage
          WalletStorage.updateBalance(balanceEth);
          return balanceEth;
        }
      }
    } catch (error: any) {
      console.error('❌ All balance retrieval methods failed:', error.message);
      console.log('💡 Get Monad testnet tokens from Monad Discord faucet');
      console.log('📱 App continues with 0.000 balance - all features still work!');
      return '0.000';
    }
  }

  // Get current wallet address (check global storage first)
  getWalletAddress(): string | null {
    // Check global storage first
    const globalAddress = WalletStorage.getAddress();
    if (globalAddress) {
      return globalAddress;
    }
    
    // Fallback to instance
    if (!this.wallet) {
      return null;
    }
    return this.wallet.address;
  }

  // Check if wallet is already initialized
  isWalletInitialized(): boolean {
    return this.wallet !== null;
  }

  // Send MON with genuine transaction signing and production-grade validation
  async sendETH(to: string, amount: string): Promise<string> {
    try {
      if (!this.wallet) {
        throw new Error('Wallet not initialized - call initializeWallet() first');
      }
      
      console.log('📤 Preparing MON transaction...');
      console.log('To:', to);
      console.log('Amount:', amount, 'MON');
      
      // Validate recipient address
      if (!ethers.isAddress(to)) {
        throw new Error('Invalid recipient address format');
      }
      
      const amountWei = ethers.parseEther(amount);
      
      // Check sufficient balance
      const balance = await this.performRpcCall(() => 
        this.provider.getBalance(this.wallet!.address)
      );
      
      if (balance < amountWei) {
        throw new Error(`Insufficient balance. Available: ${ethers.formatEther(balance)} MON`);
      }
      
      // Get current gas pricing and estimate gas limit
      const [feeData, gasEstimate] = await Promise.all([
        this.performRpcCall(() => this.provider.getFeeData()),
        this.performRpcCall(() => this.provider.estimateGas({
          to: to,
          value: amountWei,
          from: this.wallet!.address
        }))
      ]);
      
      // Build transaction with production-grade settings for Monad
      const txRequest = {
        to: to,
        value: amountWei,
        gasLimit: gasEstimate + (gasEstimate / BigInt(4)), // Add 25% gas buffer
        gasPrice: feeData.gasPrice,
        type: 0, // Legacy transaction for maximum compatibility
        nonce: await this.performRpcCall(() => 
          this.provider.getTransactionCount(this.wallet!.address, 'pending')
        )
      };
      
      const totalCostWei = amountWei + (txRequest.gasLimit * txRequest.gasPrice!);
      if (balance < totalCostWei) {
        const totalCostEth = ethers.formatEther(totalCostWei);
        throw new Error(`Insufficient balance for transaction + gas. Required: ${totalCostEth} MON`);
      }
      
      console.log('⛽ Gas estimate:', gasEstimate.toString());
      console.log('💰 Gas price:', ethers.formatUnits(feeData.gasPrice!, 'gwei'), 'gwei');
      console.log('📊 Total cost:', ethers.formatEther(totalCostWei), 'MON');
      
      // Sign and broadcast transaction
      console.log('✍️ Signing transaction...');
      const signedTx = await this.wallet.signTransaction(txRequest);
      
      console.log('📡 Broadcasting transaction...');
      const txResponse = await this.performRpcCall(() => 
        this.provider.broadcastTransaction(signedTx)
      );
      
      console.log('✅ Transaction broadcasted:', txResponse.hash);
      console.log('⏳ Waiting for confirmation...');
      
      // Wait for confirmation
      const receipt = await txResponse.wait(1);
      
      if (receipt?.status === 1) {
        console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
        
        // Save to transaction history with full details
        await this.saveTransaction(
          receipt.hash,
          'sent', 
          amount, 
          to,
          'confirmed'
        );
        
        return receipt.hash;
      } else {
        throw new Error('Transaction failed during execution');
      }
    } catch (error: any) {
      console.error('❌ Error sending ETH:', error.message);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  // Get transaction history
  async getTransactionHistory(): Promise<any[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTION_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  // Save transaction to history
  private async saveTransaction(
    hash: string,
    type: string,
    amount: string,
    to: string,
    status: string = 'confirmed'
  ): Promise<void> {
    try {
      const history = await this.getTransactionHistory();
      const newTransaction = {
        hash,
        type,
        amount,
        to,
        timestamp: Date.now(),
        status,
      };
      
      history.unshift(newTransaction);
      await AsyncStorage.setItem(
        STORAGE_KEYS.TRANSACTION_HISTORY,
        JSON.stringify(history.slice(0, 100)) // Keep last 100 transactions
      );
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }

  // Get contract instance with production validation
  getContract(contractAddress: string, abi: any[]): ethers.Contract {
    if (!this.wallet) {
      throw new Error('Wallet not initialized - call initializeWallet() first');
    }
    
    if (!ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }
    
    console.log('📄 Creating contract instance for:', contractAddress);
    return new ethers.Contract(contractAddress, abi, this.wallet);
  }

  // Get current network type
  getCurrentNetwork(): 'testnet' | 'mainnet' {
    return this.currentNetwork;
  }

  // Get current network config
  getCurrentNetworkConfig() {
    const config = NETWORK_CONFIGS[this.currentNetwork];
    return {
      type: this.currentNetwork,
      name: config.name,
      chainId: config.chainId,
      rpcUrl: config.rpcUrls[this.currentRpcIndex],
      blockExplorerUrl: config.blockExplorerUrl,
    };
  }

  // Switch network between testnet and mainnet
  async switchNetwork(networkType: 'testnet' | 'mainnet'): Promise<void> {
    try {
      if (this.currentNetwork === networkType) {
        console.log('Already on', networkType);
        return;
      }

      console.log('🔄 Switching network from', this.currentNetwork, 'to', networkType);
      this.currentNetwork = networkType;
      this.currentRpcIndex = 0;

      // Save network preference
      await AsyncStorage.setItem(STORAGE_KEYS.NETWORK_TYPE, networkType);

      // Reinitialize provider and clients with new network
      this.provider = this.initializeProvider();
      this.initializeViemClients();

      // Reconnect wallet if already initialized
      if (this.wallet) {
        this.wallet = this.wallet.connect(this.provider);
        console.log('✅ Wallet reconnected to', networkType);
      }

      console.log('✅ Network switched to', networkType);
    } catch (error) {
      console.error('❌ Failed to switch network:', error);
      throw error;
    }
  }

  // Reset wallet (for development)
  async resetWallet(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.PRIVATE_KEY);
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_ADDRESS);
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_NAME);
      await AsyncStorage.removeItem(STORAGE_KEYS.TRANSACTION_HISTORY);
      this.wallet = null;
    } catch (error) {
      console.error('Error resetting wallet:', error);
      throw error;
    }
  }

  // Import specific wallet (your wallet) with proper return format
  async importSpecificWallet(): Promise<{ address: string; isNew: boolean }> {
    try {
      // Your specific wallet details
      const privateKey = '0x08f7ed722988e284ccf91ad90f4dbb6f6309af774e50e4ee7bc9ebb17cf6407a';
      const expectedAddress = '0x6dfeF2888256bf83BF24C3F5e2EC1f76F734F41C';
      
      console.log('🔄 Importing your specific wallet...');
      
      // Clear existing wallet first
      await this.resetWallet();
      
      // Import your wallet
      const wallet = new ethers.Wallet(privateKey, this.provider);
      this.wallet = wallet;
      
      // Verify address matches
      if (wallet.address.toLowerCase() !== expectedAddress.toLowerCase()) {
        throw new Error(`Address mismatch: expected ${expectedAddress}, got ${wallet.address}`);
      }
      
      // Store securely
      await SecureStore.setItemAsync(STORAGE_KEYS.PRIVATE_KEY, privateKey);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, wallet.address);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_NAME, 'Your Cresca Wallet');
      
      console.log('✅ Successfully imported your wallet:', wallet.address);
      
      // Verify network in background (non-blocking)
      this.verifyNetworkAsync();
      
      return { address: wallet.address, isNew: false };
    } catch (error) {
      console.error('Error importing your specific wallet:', error);
      throw error;
    }
  }
}

// Export simple instance
export const web3Service = new Web3Service();
export default Web3Service;