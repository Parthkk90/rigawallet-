import { useCallback, useEffect, useState } from 'react';
import { walletStateManager, type WalletState } from '../services/walletStateManager';
import { web3Service } from '../services/web3Service';

// Custom hook for accessing global wallet state
export const useWalletState = () => {
  const [walletState, setWalletState] = useState<WalletState>(() => walletStateManager.getState());

  useEffect(() => {
    // Subscribe to wallet state changes
    const unsubscribe = walletStateManager.subscribe(setWalletState);
    return unsubscribe;
  }, []);

  // Auto-initialize wallet if not already done
  const initializeWallet = useCallback(async () => {
    try {
      if (!walletState.isInitialized && !walletState.isInitializing) {
        await web3Service.initializeWallet();
      }
    } catch (error) {
      console.error('Error initializing wallet in hook:', error);
    }
  }, [walletState.isInitialized, walletState.isInitializing]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    try {
      if (walletState.address) {
        await web3Service.getBalance();
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  }, [walletState.address]);

  return {
    ...walletState,
    initializeWallet,
    refreshBalance,
    isReady: walletStateManager.isWalletReady(),
  };
};

export default useWalletState;