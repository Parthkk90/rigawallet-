import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Bundle {
  id: string;
  name: string;
  description: string;
  composition: string;
  risk: 'Low' | 'Medium' | 'High';
  icon: string;
  color: string;
  assets: Array<{ symbol: string; weight: number }>;
}

export default function BundlesListScreen() {
  const router = useRouter();

  const bundles: Bundle[] = [
    {
      id: 'standard',
      name: 'The Standard Bundle',
      description: 'Balanced exposure across major cryptocurrencies',
      composition: 'BTC 50% • ETH 30% • SOL 20%',
      risk: 'Medium',
      icon: '⚖️',
      color: '#6C5CE7',
      assets: [
        { symbol: 'BTC', weight: 50 },
        { symbol: 'ETH', weight: 30 },
        { symbol: 'SOL', weight: 20 },
      ],
    },
    {
      id: 'aggressive',
      name: 'Aggressive Growth',
      description: 'High risk, high reward altcoin portfolio',
      composition: 'SOL 40% • ETH 35% • BTC 25%',
      risk: 'High',
      icon: '🚀',
      color: '#EF4444',
      assets: [
        { symbol: 'SOL', weight: 40 },
        { symbol: 'ETH', weight: 35 },
        { symbol: 'BTC', weight: 25 },
      ],
    },
    {
      id: 'conservative',
      name: 'Conservative Blue Chip',
      description: 'Low risk portfolio focused on Bitcoin and Ethereum',
      composition: 'BTC 60% • ETH 40%',
      risk: 'Low',
      icon: '🛡️',
      color: '#10B981',
      assets: [
        { symbol: 'BTC', weight: 60 },
        { symbol: 'ETH', weight: 40 },
      ],
    },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low':
        return { bg: '#D1FAE5', text: '#059669' };
      case 'Medium':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'High':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const handleBundlePress = (bundle: Bundle) => {
    router.push({
      pathname: '/bundleTrade',
      params: {
        bundleId: bundle.id,
        bundleName: bundle.name,
        composition: bundle.composition,
        risk: bundle.risk,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bundle Trading</Text>
        <Text style={styles.headerSubtitle}>Choose your investment strategy</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#6C5CE7" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>What are Bundles?</Text>
            <Text style={styles.infoDescription}>
              Bundles are pre-built portfolios of cryptocurrencies. Trade them with leverage up to 150x.
            </Text>
          </View>
        </View>

        {/* Bundles List */}
        <View style={styles.bundlesContainer}>
          {bundles.map((bundle) => {
            const riskColors = getRiskColor(bundle.risk);
            
            return (
              <TouchableOpacity
                key={bundle.id}
                style={styles.bundleCard}
                onPress={() => handleBundlePress(bundle)}
                activeOpacity={0.7}
              >
                <View style={[styles.bundleIconContainer, { backgroundColor: bundle.color }]}>
                  <Text style={styles.bundleIcon}>{bundle.icon}</Text>
                </View>

                <View style={styles.bundleContent}>
                  <View style={styles.bundleHeader}>
                    <Text style={styles.bundleName}>{bundle.name}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: riskColors.bg }]}>
                      <Text style={[styles.riskText, { color: riskColors.text }]}>
                        {bundle.risk} Risk
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.bundleDescription}>{bundle.description}</Text>
                  <Text style={styles.bundleComposition}>{bundle.composition}</Text>

                  {/* Asset Pills */}
                  <View style={styles.assetPills}>
                    {bundle.assets.map((asset) => (
                      <View key={asset.symbol} style={styles.assetPill}>
                        <Text style={styles.assetPillText}>
                          {asset.symbol} {asset.weight}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <Ionicons name="shield-checkmark" size={20} color="#6C5CE7" />
          <Text style={styles.bottomInfoText}>
            All bundles are executed on Monad Testnet with smart contracts
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0F3FF',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  bundlesContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  bundleCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bundleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bundleIcon: {
    fontSize: 24,
  },
  bundleContent: {
    flex: 1,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bundleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bundleDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  bundleComposition: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 10,
  },
  assetPills: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  assetPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  assetPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  bottomInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});
