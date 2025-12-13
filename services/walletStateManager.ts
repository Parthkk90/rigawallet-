
// Global Wallet State Management
interface WalletState {
  address: string | null;
  balance: string;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
}

interface WalletStateListener {
  (state: WalletState): void;
}

class WalletStateManager {
  private state: WalletState = {
    address: null,
    balance: '0.000',
    isInitialized: false,
    isInitializing: false,
    error: null,
  };
  
  private listeners: Set<WalletStateListener> = new Set();
  private static instance: WalletStateManager;

  private constructor() {}

  // Singleton pattern - ensure only one instance exists
  static getInstance(): WalletStateManager {
    if (!WalletStateManager.instance) {
      WalletStateManager.instance = new WalletStateManager();
    }
    return WalletStateManager.instance;
  }

  // Get current state
  getState(): WalletState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: WalletStateListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Update state and notify all listeners
  private updateState(updates: Partial<WalletState>): void {
    this.state = { ...this.state, ...updates };
    console.log('💫 Global wallet state updated:', this.state);
    
    // Notify all subscribers
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in wallet state listener:', error);
      }
    });
  }

  // Set wallet address
  setWalletAddress(address: string): void {
    this.updateState({ address, isInitialized: true, error: null });
  }

  // Set wallet balance
  setBalance(balance: string): void {
    this.updateState({ balance });
  }

  // Set initialization status
  setInitializing(isInitializing: boolean): void {
    this.updateState({ isInitializing });
  }

  // Set error state
  setError(error: string | null): void {
    this.updateState({ error, isInitializing: false });
  }

  // Reset state (for logout, etc.)
  reset(): void {
    this.updateState({
      address: null,
      balance: '0.000',
      isInitialized: false,
      isInitializing: false,
      error: null,
    });
  }

  // Check if wallet is ready for operations
  isWalletReady(): boolean {
    return this.state.isInitialized && !!this.state.address && !this.state.isInitializing;
  }

  // Convenience method to get address
  getAddress(): string | null {
    return this.state.address;
  }

  // Convenience method to get balance
  getBalance(): string {
    return this.state.balance;
  }
}

// Export singleton instance
export const walletStateManager = WalletStateManager.getInstance();
export default walletStateManager;
export type { WalletState, WalletStateListener };
