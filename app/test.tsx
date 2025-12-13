import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { web3Service } from '../services/web3Service';

export default function TestScreen() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.000');
  
  // Test recipient address (you can change this)
  const [recipientAddress, setRecipientAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [testAmount, setTestAmount] = useState('0.001');

  const addLog = (message: string) => {
    console.log(message);
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  // TEST 1: Wallet Initialization
  const testWalletInit = async () => {
    try {
      addLog('🧪 TEST 1: Wallet Initialization');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const walletData = await web3Service.initializeWallet();
      
      if (walletData && walletData.address) {
        setWalletAddress(walletData.address);
        addLog(`✅ Wallet initialized: ${walletData.address}`);
        addLog(`   Is new wallet: ${walletData.isNew}`);
        return true;
      } else {
        addLog('❌ Failed to initialize wallet - no address returned');
        return false;
      }
    } catch (error: any) {
      addLog(`❌ Wallet initialization error: ${error.message}`);
      return false;
    }
  };

  // TEST 2: Network Connectivity
  const testNetwork = async () => {
    try {
      addLog('');
      addLog('🧪 TEST 2: Network Connectivity');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const provider = web3Service['provider'];
      
      // Test 1: Get network info
      const network = await provider.getNetwork();
      addLog(`✅ Connected to network: ${network.name}`);
      addLog(`   Chain ID: ${network.chainId}`);
      
      // Test 2: Get latest block
      const blockNumber = await provider.getBlockNumber();
      addLog(`✅ Latest block number: ${blockNumber}`);
      
      // Test 3: Get block details
      const block = await provider.getBlock(blockNumber);
      if (block) {
        addLog(`✅ Block timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        addLog(`   Transactions in block: ${block.transactions.length}`);
      }
      
      return true;
    } catch (error: any) {
      addLog(`❌ Network test error: ${error.message}`);
      return false;
    }
  };

  // TEST 3: Balance Retrieval
  const testBalance = async () => {
    try {
      addLog('');
      addLog('🧪 TEST 3: Balance Retrieval');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const fetchedBalance = await web3Service.getBalance();
      setBalance(fetchedBalance);
      
      addLog(`✅ Balance retrieved: ${fetchedBalance} MON`);
      
      // Parse balance to check if it's sufficient for testing
      const balanceNum = parseFloat(fetchedBalance);
      if (balanceNum === 0) {
        addLog('⚠️  WARNING: Balance is 0 MON');
        addLog('   You need MON to test transactions');
        addLog('   Get MON from Monad Discord faucet');
        return false;
      } else if (balanceNum < 0.01) {
        addLog('⚠️  WARNING: Low balance');
        addLog('   Consider getting more MON for testing');
      } else {
        addLog(`✅ Sufficient balance for testing`);
      }
      
      return true;
    } catch (error: any) {
      addLog(`❌ Balance retrieval error: ${error.message}`);
      return false;
    }
  };

  // TEST 4: Send Transaction (if balance available)
  const testSendTransaction = async () => {
    try {
      addLog('');
      addLog('🧪 TEST 4: Send Transaction');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Check balance first
      const balanceNum = parseFloat(balance);
      if (balanceNum < parseFloat(testAmount)) {
        addLog(`❌ Insufficient balance`);
        addLog(`   Need: ${testAmount} MON`);
        addLog(`   Have: ${balance} MON`);
        return false;
      }
      
      addLog(`📤 Preparing to send ${testAmount} MON`);
      addLog(`   From: ${walletAddress}`);
      addLog(`   To: ${recipientAddress}`);
      
      // Validate recipient address
      const ethers = await import('ethers');
      if (!ethers.ethers.isAddress(recipientAddress)) {
        addLog(`❌ Invalid recipient address`);
        return false;
      }
      
      addLog(`⏳ Sending transaction...`);
      const txHash = await web3Service.sendETH(recipientAddress, testAmount);
      
      addLog(`✅ Transaction sent!`);
      addLog(`   TX Hash: ${txHash}`);
      addLog(`   View on explorer: https://explorer.testnet.monad.xyz/tx/${txHash}`);
      
      // Refresh balance
      addLog(`🔄 Refreshing balance...`);
      await testBalance();
      
      return true;
    } catch (error: any) {
      addLog(`❌ Send transaction error: ${error.message}`);
      return false;
    }
  };

  // TEST 5: Transaction History
  const testTransactionHistory = async () => {
    try {
      addLog('');
      addLog('🧪 TEST 5: Transaction History');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const history = await web3Service.getTransactionHistory();
      
      addLog(`✅ Retrieved ${history.length} transactions`);
      
      if (history.length > 0) {
        const latest = history[0];
        addLog(`   Latest transaction:`);
        addLog(`   - Type: ${latest.type}`);
        addLog(`   - Amount: ${latest.amount} MON`);
        addLog(`   - To: ${latest.to}`);
        addLog(`   - Status: ${latest.status}`);
      } else {
        addLog(`ℹ️  No transactions yet`);
      }
      
      return true;
    } catch (error: any) {
      addLog(`❌ Transaction history error: ${error.message}`);
      return false;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    clearLogs();
    
    addLog('🚀 Starting Riga Wallet Test Suite');
    addLog('📅 ' + new Date().toLocaleString());
    addLog('🌐 Network: Monad Testnet');
    addLog('');
    
    try {
      // Test 1: Wallet Init
      const test1 = await testWalletInit();
      if (!test1) {
        addLog('');
        addLog('❌ CRITICAL: Wallet initialization failed');
        addLog('⛔ Cannot continue testing');
        setIsRunning(false);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 2: Network
      const test2 = await testNetwork();
      if (!test2) {
        addLog('');
        addLog('⚠️  WARNING: Network test failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 3: Balance
      const test3 = await testBalance();
      if (!test3) {
        addLog('');
        addLog('⚠️  Note: Balance is 0, transaction tests will be skipped');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 5: Transaction History (always works)
      await testTransactionHistory();
      
      addLog('');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog('🏁 Test suite completed!');
      
      if (test1 && test2 && test3) {
        addLog('✅ All critical tests passed');
      } else {
        addLog('⚠️  Some tests had issues - check logs above');
      }
      
    } catch (error: any) {
      addLog('');
      addLog(`❌ Test suite error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1f3a', '#0F1736']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Wallet Test Suite</Text>
          <Text style={styles.headerSubtitle}>Monad Testnet</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Wallet Info */}
        {walletAddress && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Wallet Address</Text>
            <Text style={styles.infoValue}>{walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}</Text>
            
            <Text style={styles.infoLabel}>Balance</Text>
            <Text style={styles.infoValue}>{balance} MON</Text>
          </View>
        )}

        {/* Test Configuration */}
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>Transaction Test Config</Text>
          
          <Text style={styles.inputLabel}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            placeholder="0x..."
            placeholderTextColor="#666F8F"
          />
          
          <Text style={styles.inputLabel}>Amount (MON)</Text>
          <TextInput
            style={styles.input}
            value={testAmount}
            onChangeText={setTestAmount}
            placeholder="0.001"
            keyboardType="decimal-pad"
            placeholderTextColor="#666F8F"
          />
        </View>

        {/* Test Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runAllTests}
            disabled={isRunning}
          >
            <LinearGradient
              colors={isRunning ? ['#666F8F', '#4B5563'] : ['#10B981', '#059669']}
              style={styles.buttonGradient}
            >
              {isRunning ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Run All Tests</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testWalletInit}
            disabled={isRunning}
          >
            <View style={styles.secondaryButton}>
              <Ionicons name="wallet" size={20} color="#10B981" />
              <Text style={styles.secondaryButtonText}>Test Wallet Init</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testBalance}
            disabled={isRunning}
          >
            <View style={styles.secondaryButton}>
              <Ionicons name="cash" size={20} color="#10B981" />
              <Text style={styles.secondaryButtonText}>Test Balance</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testSendTransaction}
            disabled={isRunning || parseFloat(balance) === 0}
          >
            <View style={[styles.secondaryButton, parseFloat(balance) === 0 && styles.disabledButton]}>
              <Ionicons name="send" size={20} color={parseFloat(balance) === 0 ? "#666F8F" : "#10B981"} />
              <Text style={[styles.secondaryButtonText, parseFloat(balance) === 0 && styles.disabledText]}>
                Test Send TX
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={clearLogs}
            disabled={isRunning}
          >
            <View style={styles.secondaryButton}>
              <Ionicons name="trash" size={20} color="#EF4444" />
              <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Clear Logs</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.logsCard}>
          <Text style={styles.logsTitle}>Test Results</Text>
          <ScrollView style={styles.logsScroll} nestedScrollEnabled>
            {testResults.length === 0 ? (
              <Text style={styles.logsEmpty}>No tests run yet. Press "Run All Tests" to start.</Text>
            ) : (
              testResults.map((log, index) => (
                <Text key={index} style={styles.logLine}>{log}</Text>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(17, 24, 62, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 146, 176, 0.1)',
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  configCard: {
    backgroundColor: 'rgba(17, 24, 62, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 146, 176, 0.1)',
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(17, 24, 62, 0.8)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 146, 176, 0.2)',
  },
  buttonGroup: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 24, 62, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    borderColor: 'rgba(139, 146, 176, 0.2)',
  },
  disabledText: {
    color: '#666F8F',
  },
  logsCard: {
    backgroundColor: 'rgba(17, 24, 62, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 146, 176, 0.1)',
    minHeight: 300,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  logsScroll: {
    maxHeight: 400,
  },
  logsEmpty: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 18,
  },
});
