import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { priceService } from '../services/priceService';

interface CryptoAsset {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  icon: string;
  color: string;
}

interface NFTAsset {
  id: string;
  name: string;
  collection: string;
  floorPrice: number;
  change24h: number;
  volume24h: number;
  imageUrl: string;
  priceHistory: { value: number; label?: string }[];
}

export default function MarketsScreen() {
  const router = useRouter();
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [nftAssets, setNftAssets] = useState<NFTAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'alphabetical' | 'price' | 'change'>('alphabetical');
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');

  useEffect(() => {
    loadMarketData();
    
    const interval = setInterval(() => {
      loadMarketData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadMarketData = async () => {
    try {
      // Generate dynamic prices with slight variations to simulate real-time updates
      const baseTime = Date.now();
      const variation = (Math.sin(baseTime / 10000) + 1) / 2; // 0 to 1
      
      // Monad-deployed tokens with simulated real-time prices
      const marketData: CryptoAsset[] = [
        {
          id: 'mon',
          name: 'Monad',
          symbol: 'MON',
          price: 0.85 + (variation * 0.05), // 0.85 - 0.90
          change24h: 5.23 + (variation * 2),
          icon: 'M',
          color: '#6C5CE7',
        },
        {
          id: 'wmon',
          name: 'Wrapped Monad',
          symbol: 'WMON',
          price: 0.84 + (variation * 0.04), // 0.84 - 0.88
          change24h: 5.15 + (variation * 1.8),
          icon: 'W',
          color: '#8B7FE8',
        },
        {
          id: 'musd',
          name: 'Monad USD',
          symbol: 'mUSD',
          price: 1.0 + (variation * 0.01 - 0.005), // 0.995 - 1.005
          change24h: 0.12 + (variation * 0.3 - 0.15),
          icon: '$',
          color: '#10B981',
        },
        {
          id: 'mbtc',
          name: 'Monad BTC',
          symbol: 'mBTC',
          price: 43500 + (variation * 1000 - 500), // Wrapped BTC
          change24h: -2.1 + (variation * 4),
          icon: '₿',
          color: '#F7931A',
        },
        {
          id: 'meth',
          name: 'Monad ETH',
          symbol: 'mETH',
          price: 2300 + (variation * 100 - 50), // Wrapped ETH
          change24h: -3.4 + (variation * 6),
          icon: 'Ξ',
          color: '#627EEA',
        },
      ];
      
      setAssets(marketData);

      // Generate NFT price history data for charts
      const generatePriceHistory = (basePrice: number) => {
        const history = [];
        for (let i = 23; i >= 0; i--) {
          const timeVariation = Math.sin((baseTime / 5000) - i) * 0.1;
          const value = basePrice * (1 + timeVariation);
          history.push({ value, label: i === 0 ? 'Now' : `${i}h` });
        }
        return history;
      };

      // Monad NFT Collections with simulated real-time floor prices
      const nftData: NFTAsset[] = [
        {
          id: 'monad-genesis',
          name: 'Monad Genesis #1337',
          collection: 'Monad Genesis',
          floorPrice: 12.5 + (variation * 2), // 12.5 - 14.5 MON
          change24h: 8.5 + (variation * 3),
          volume24h: 1250 + (variation * 200),
          imageUrl: '🎨',
          priceHistory: generatePriceHistory(12.5),
        },
        {
          id: 'monad-punks',
          name: 'Monad Punk #4242',
          collection: 'Monad Punks',
          floorPrice: 8.2 + (variation * 1.5), // 8.2 - 9.7 MON
          change24h: -2.3 + (variation * 5),
          volume24h: 890 + (variation * 150),
          imageUrl: '👾',
          priceHistory: generatePriceHistory(8.2),
        },
        {
          id: 'monad-apes',
          name: 'Monad Ape #777',
          collection: 'Bored Monad Apes',
          floorPrice: 25.8 + (variation * 3), // 25.8 - 28.8 MON
          change24h: 15.2 + (variation * 4),
          volume24h: 2100 + (variation * 300),
          imageUrl: '🦍',
          priceHistory: generatePriceHistory(25.8),
        },
        {
          id: 'monad-ordinals',
          name: 'Monad Ordinal #100',
          collection: 'Monad Ordinals',
          floorPrice: 5.5 + (variation * 1), // 5.5 - 6.5 MON
          change24h: 3.8 + (variation * 2),
          volume24h: 450 + (variation * 100),
          imageUrl: '📜',
          priceHistory: generatePriceHistory(5.5),
        },
        {
          id: 'monad-degens',
          name: 'Monad Degen #5000',
          collection: 'Monad Degens',
          floorPrice: 18.3 + (variation * 2.5), // 18.3 - 20.8 MON
          change24h: 12.1 + (variation * 3.5),
          volume24h: 1680 + (variation * 250),
          imageUrl: '🔥',
          priceHistory: generatePriceHistory(18.3),
        },
      ];

      setNftAssets(nftData);
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical':
        return a.name.localeCompare(b.name);
      case 'price':
        return b.price - a.price;
      case 'change':
        return b.change24h - a.change24h;
      default:
        return 0;
    }
  });

  const handleAssetPress = (asset: CryptoAsset) => {
    router.push({
      pathname: '/assetDetail',
      params: {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        price: asset.price.toString(),
        change24h: asset.change24h.toString(),
        icon: asset.icon,
        color: asset.color,
      },
    });
  };

  const renderAsset = ({ item }: { item: CryptoAsset }) => (
    <TouchableOpacity style={styles.assetCard} onPress={() => handleAssetPress(item)} activeOpacity={0.7}>
      <View style={[styles.assetIcon, { backgroundColor: item.color }]}>
        <Text style={styles.assetIconText}>{item.icon}</Text>
      </View>
      
      <View style={styles.assetInfo}>
        <Text style={styles.assetName}>{item.name}</Text>
        <Text style={styles.assetSymbol}>{item.symbol}</Text>
      </View>
      
      <View style={styles.assetPriceContainer}>
        <Text style={styles.assetPrice}>${item.price.toLocaleString()}</Text>
        <View style={[
          styles.changeBadge,
          item.change24h >= 0 ? styles.changeBadgePositive : styles.changeBadgeNegative
        ]}>
          <Text style={[
            styles.changeText,
            item.change24h >= 0 ? styles.changeTextPositive : styles.changeTextNegative
          ]}>
            {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
          </Text>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderNFT = ({ item }: { item: NFTAsset }) => (
    <TouchableOpacity style={styles.nftCard} activeOpacity={0.7}>
      <View style={styles.nftHeader}>
        <View style={styles.nftIconContainer}>
          <Text style={styles.nftIcon}>{item.imageUrl}</Text>
        </View>
        <View style={styles.nftInfo}>
          <Text style={styles.nftName}>{item.name}</Text>
          <Text style={styles.nftCollection}>{item.collection}</Text>
        </View>
      </View>

      {/* Mini Price Chart */}
      <View style={styles.nftChartContainer}>
        <LineChart
          data={item.priceHistory}
          width={320}
          height={80}
          curved
          hideDataPoints
          hideRules
          hideYAxisText
          hideAxesAndRules
          color={item.change24h >= 0 ? '#10B981' : '#EF4444'}
          thickness={2}
          startFillColor={item.change24h >= 0 ? '#10B981' : '#EF4444'}
          endFillColor={item.change24h >= 0 ? '#D1FAE5' : '#FEE2E2'}
          startOpacity={0.3}
          endOpacity={0.1}
          areaChart
          yAxisOffset={item.floorPrice * 0.9}
        />
      </View>

      <View style={styles.nftFooter}>
        <View style={styles.nftPriceInfo}>
          <Text style={styles.nftPriceLabel}>Floor Price</Text>
          <Text style={styles.nftPrice}>{item.floorPrice.toFixed(2)} MON</Text>
        </View>
        <View style={styles.nftStatsRow}>
          <View style={[
            styles.changeBadge,
            item.change24h >= 0 ? styles.changeBadgePositive : styles.changeBadgeNegative
          ]}>
            <Text style={[
              styles.changeText,
              item.change24h >= 0 ? styles.changeTextPositive : styles.changeTextNegative
            ]}>
              {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
            </Text>
          </View>
          <Text style={styles.nftVolume}>Vol: {item.volume24h.toFixed(0)} MON</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.sortButton}>
            <Ionicons name="arrow-up" size={16} color="#6C5CE7" />
            <Text style={styles.sortText}>Alphabet wise (a-z)</Text>
            <Ionicons name="chevron-down" size={16} color="#6C5CE7" />
          </TouchableOpacity>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tokens' && styles.tabActive]}
            onPress={() => setActiveTab('tokens')}
          >
            <Ionicons 
              name="logo-bitcoin" 
              size={18} 
              color={activeTab === 'tokens' ? '#6C5CE7' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeTab === 'tokens' && styles.tabTextActive]}>
              Tokens
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'nfts' && styles.tabActive]}
            onPress={() => setActiveTab('nfts')}
          >
            <Ionicons 
              name="images" 
              size={18} 
              color={activeTab === 'nfts' ? '#6C5CE7' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeTab === 'nfts' && styles.tabTextActive]}>
              NFTs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Asset List */}
      {activeTab === 'tokens' ? (
        <FlatList
          data={sortedAssets}
          renderItem={renderAsset}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={nftAssets}
          renderItem={renderNFT}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  sortText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetIconText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  assetSymbol: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  assetPriceContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  assetPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  changeBadgePositive: {
    backgroundColor: '#D1FAE5',
  },
  changeBadgeNegative: {
    backgroundColor: '#FEE2E2',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changeTextPositive: {
    color: '#10B981',
  },
  changeTextNegative: {
    color: '#EF4444',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#6C5CE7',
  },
  nftCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  nftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nftIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nftIcon: {
    fontSize: 28,
  },
  nftInfo: {
    flex: 1,
  },
  nftName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  nftCollection: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  nftChartContainer: {
    marginVertical: 12,
    marginLeft: -16,
    overflow: 'hidden',
  },
  nftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  nftPriceInfo: {
    flex: 1,
  },
  nftPriceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  nftPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  nftStatsRow: {
    alignItems: 'flex-end',
    gap: 6,
  },
  nftVolume: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
});
