import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isSmallMobile = width < 375;
const isMediumMobile = width >= 375 && width < 414;
const isLargeMobile = width >= 414 && width < 768;

interface PerformanceMetrics {
  database_metrics: {
    total_queries: number;
    slow_queries: number;
    table_sizes: { [key: string]: { size_mb: number; rows: number } };
    connection_pool: {
      current_connections: number;
      max_used_connections: number;
      max_connections: number;
      usage_percentage: number;
    };
  };
  pagination_metrics: {
    [key: string]: {
      total_rows: number;
      estimated_pages: number;
      avg_page_size: number;
    };
  };
  recommendations: Array<{
    type: string;
    recommendation: string;
    [key: string]: any;
  }>;
  system_info: {
    php_version: string;
    laravel_version: string;
    memory_limit: string;
    max_execution_time: string;
  };
}

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/admin/performance/overview');
      if (response.success) {
        setMetrics(response.overview);
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      Alert.alert('Error', 'Failed to fetch performance metrics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  const optimizeDatabase = async () => {
    Alert.alert(
      'Optimize Database',
      'This will analyze and optimize the database tables. This may take a few minutes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Optimize',
          onPress: async () => {
            try {
              setOptimizing(true);
              const response = await apiService.post('/admin/performance/optimize');
              if (response.success) {
                Alert.alert('Success', 'Database optimization completed successfully');
                fetchMetrics(); // Refresh metrics
              } else {
                Alert.alert('Error', 'Database optimization failed');
              }
            } catch (error) {
              console.error('Error optimizing database:', error);
              Alert.alert('Error', 'Failed to optimize database');
            } finally {
              setOptimizing(false);
            }
          }
        }
      ]
    );
  };

  const renderMetricCard = (title: string, value: string | number, icon: string, color: string = '#014D40') => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );

  const renderTableSizes = () => {
    if (!metrics?.database_metrics?.table_sizes) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Table Sizes</Text>
        {Object.entries(metrics.database_metrics.table_sizes).map(([table, size]) => (
          <View key={table} style={styles.tableRow}>
            <Text style={styles.tableName}>{table}</Text>
            <View style={styles.tableInfo}>
              <Text style={styles.tableSize}>{size.size_mb} MB</Text>
              <Text style={styles.tableRows}>{size.rows.toLocaleString()} rows</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!metrics?.recommendations?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Recommendations</Text>
        {metrics.recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.recommendationType}>{rec.type.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.recommendationText}>{rec.recommendation}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#014D40" />
        <Text style={styles.loadingText}>Loading performance metrics...</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={80} color="#DC2626" />
        <Text style={styles.errorTitle}>Failed to Load Metrics</Text>
        <Text style={styles.errorText}>Unable to fetch performance data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMetrics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Performance Dashboard</Text>
        <TouchableOpacity
          style={[styles.optimizeButton, optimizing && styles.optimizeButtonDisabled]}
          onPress={optimizeDatabase}
          disabled={optimizing}
        >
          <Ionicons 
            name={optimizing ? "sync" : "settings"} 
            size={20} 
            color={optimizing ? '#9CA3AF' : '#fff'} 
          />
          <Text style={[styles.optimizeButtonText, optimizing && styles.optimizeButtonTextDisabled]}>
            {optimizing ? 'Optimizing...' : 'Optimize DB'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Database Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Performance</Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Queries',
            metrics.database_metrics.total_queries.toLocaleString(),
            'analytics',
            '#014D40'
          )}
          {renderMetricCard(
            'Slow Queries',
            metrics.database_metrics.slow_queries.toLocaleString(),
            'warning',
            metrics.database_metrics.slow_queries > 10 ? '#DC2626' : '#F59E0B'
          )}
          {renderMetricCard(
            'Connections',
            `${metrics.database_metrics.connection_pool.current_connections}/${metrics.database_metrics.connection_pool.max_connections}`,
            'link',
            metrics.database_metrics.connection_pool.usage_percentage > 80 ? '#DC2626' : '#014D40'
          )}
          {renderMetricCard(
            'Usage %',
            `${metrics.database_metrics.connection_pool.usage_percentage}%`,
            'speedometer',
            metrics.database_metrics.connection_pool.usage_percentage > 80 ? '#DC2626' : '#014D40'
          )}
        </View>
      </View>

      {/* Pagination Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pagination Performance</Text>
        <View style={styles.paginationGrid}>
          {Object.entries(metrics.pagination_metrics).map(([table, data]) => (
            <View key={table} style={styles.paginationCard}>
              <Text style={styles.paginationTableName}>{table}</Text>
              <Text style={styles.paginationRows}>{data.total_rows.toLocaleString()} rows</Text>
              <Text style={styles.paginationPages}>{data.estimated_pages} pages</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Table Sizes */}
      {renderTableSizes()}

      {/* System Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Information</Text>
        <View style={styles.systemInfo}>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>PHP Version:</Text>
            <Text style={styles.systemValue}>{metrics.system_info.php_version}</Text>
          </View>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Laravel Version:</Text>
            <Text style={styles.systemValue}>{metrics.system_info.laravel_version}</Text>
          </View>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Memory Limit:</Text>
            <Text style={styles.systemValue}>{metrics.system_info.memory_limit}</Text>
          </View>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Max Execution Time:</Text>
            <Text style={styles.systemValue}>{metrics.system_info.max_execution_time}s</Text>
          </View>
        </View>
      </View>

      {/* Recommendations */}
      {renderRecommendations()}
    </ScrollView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#014D40',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
    paddingVertical: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: isSmallMobile ? 20 : isMediumMobile ? 22 : isLargeMobile ? 24 : 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    backgroundColor: '#014D40',
    borderRadius: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 12,
    gap: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
  },
  optimizeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  optimizeButtonText: {
    color: '#fff',
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    fontWeight: '600',
  },
  optimizeButtonTextDisabled: {
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
    marginVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderRadius: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    padding: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  metricCard: {
    flex: 1,
    minWidth: isSmallMobile ? 140 : isMediumMobile ? 150 : isLargeMobile ? 160 : 180,
    backgroundColor: '#F9FAFB',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    padding: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    gap: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 10,
  },
  metricTitle: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: isSmallMobile ? 18 : isMediumMobile ? 20 : isLargeMobile ? 22 : 24,
    fontWeight: '700',
  },
  paginationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  paginationCard: {
    flex: 1,
    minWidth: isSmallMobile ? 120 : isMediumMobile ? 130 : isLargeMobile ? 140 : 150,
    backgroundColor: '#F0FDF4',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    padding: isSmallMobile ? 10 : isMediumMobile ? 12 : isLargeMobile ? 14 : 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  paginationTableName: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#014D40',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
  },
  paginationRows: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#111827',
    fontWeight: '700',
  },
  paginationPages: {
    fontSize: isSmallMobile ? 11 : isMediumMobile ? 12 : isLargeMobile ? 13 : 13,
    color: '#6B7280',
    marginTop: isSmallMobile ? 2 : isMediumMobile ? 4 : isLargeMobile ? 6 : 6,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableName: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#111827',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tableInfo: {
    alignItems: 'flex-end',
  },
  tableSize: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#014D40',
    fontWeight: '700',
  },
  tableRows: {
    fontSize: isSmallMobile ? 11 : isMediumMobile ? 12 : isLargeMobile ? 13 : 13,
    color: '#6B7280',
    marginTop: isSmallMobile ? 2 : isMediumMobile ? 4 : isLargeMobile ? 6 : 6,
  },
  systemInfo: {
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 10,
  },
  systemLabel: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  systemValue: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#111827',
    fontWeight: '600',
  },
  recommendationCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    padding: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    marginBottom: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 10,
    gap: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 10,
  },
  recommendationType: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#92400E',
    fontWeight: '700',
  },
  recommendationText: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#111827',
    lineHeight: isSmallMobile ? 20 : isMediumMobile ? 22 : isLargeMobile ? 24 : 24,
  },
});


