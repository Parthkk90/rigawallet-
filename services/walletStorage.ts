// Simple global wallet storage - stores wallet data once and shares it everywhere
class WalletStorage {
  private static walletAddress: string | null = null;
  private static walletBalance: string = '0.000';
  private static isInitialized: boolean = false;

  // Set wallet data when initialized
  static setWalletData(address: string, balance: string = '0.000') {
    console.log('💾 Storing wallet data globally:', address, balance);
    this.walletAddress = address;
    this.walletBalance = balance;
    this.isInitialized = true;
  }

  // Get wallet address
  static getAddress(): string | null {
    return this.walletAddress;
  }

  // Get wallet balance
  static getBalance(): string {
    return this.walletBalance;
  }

  // Update just the balance
  static updateBalance(balance: string) {
    console.log('💰 Updating global wallet balance:', balance);
    this.walletBalance = balance;
  }

  // Check if wallet is ready
  static isWalletReady(): boolean {
    return this.isInitialized && this.walletAddress !== null;
  }

  // Clear wallet data
  static clear() {
    this.walletAddress = null;
    this.walletBalance = '0.000';
    this.isInitialized = false;
  }
}

export default WalletStorage;