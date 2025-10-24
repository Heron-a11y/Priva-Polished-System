import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaginationMeta } from '../hooks/usePagination';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isSmallMobile = width < 375;
const isMediumMobile = width >= 375 && width < 414;
const isLargeMobile = width >= 414 && width < 768;

interface PaginationControlsProps {
  pagination: PaginationMeta | null;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  showPerPageSelector?: boolean;
  perPageOptions?: number[];
  currentPerPage?: number;
  compact?: boolean;
}

export default function PaginationControls({
  pagination,
  loading = false,
  onPageChange,
  onPerPageChange,
  showPerPageSelector = true,
  perPageOptions = [10, 15, 20, 50],
  currentPerPage = 15,
  compact = false
}: PaginationControlsProps) {
  if (!pagination) return null;

  const { current_page, last_page, total, from, to, has_more_pages } = pagination;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = compact ? 3 : 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, current_page - halfVisible);
    let endPage = Math.min(last_page, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(
        <TouchableOpacity
          key={1}
          style={[styles.pageButton, current_page === 1 && styles.activePageButton]}
          onPress={() => onPageChange(1)}
          disabled={loading}
        >
          <Text style={[styles.pageText, current_page === 1 && styles.activePageText]}>1</Text>
        </TouchableOpacity>
      );

      if (startPage > 2) {
        pages.push(
          <View key="ellipsis1" style={styles.ellipsis}>
            <Text style={styles.ellipsisText}>...</Text>
          </View>
        );
      }
    }

    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <TouchableOpacity
          key={i}
          style={[styles.pageButton, current_page === i && styles.activePageButton]}
          onPress={() => onPageChange(i)}
          disabled={loading}
        >
          <Text style={[styles.pageText, current_page === i && styles.activePageText]}>{i}</Text>
        </TouchableOpacity>
      );
    }

    // Add last page and ellipsis if needed
    if (endPage < last_page) {
      if (endPage < last_page - 1) {
        pages.push(
          <View key="ellipsis2" style={styles.ellipsis}>
            <Text style={styles.ellipsisText}>...</Text>
          </View>
        );
      }

      pages.push(
        <TouchableOpacity
          key={last_page}
          style={[styles.pageButton, current_page === last_page && styles.activePageButton]}
          onPress={() => onPageChange(last_page)}
          disabled={loading}
        >
          <Text style={[styles.pageText, current_page === last_page && styles.activePageText]}>
            {last_page}
          </Text>
        </TouchableOpacity>
      );
    }

    return pages;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactInfo}>
          <Text style={styles.compactText}>
            Showing {from || 0}-{to || 0} of {total}
          </Text>
        </View>
        <View style={styles.compactControls}>
          <TouchableOpacity
            style={[styles.navButton, current_page === 1 && styles.disabledButton]}
            onPress={() => onPageChange(current_page - 1)}
            disabled={loading || current_page === 1}
          >
            <Ionicons name="chevron-back" size={16} color={current_page === 1 ? '#9CA3AF' : '#374151'} />
          </TouchableOpacity>
          
          <Text style={styles.currentPageText}>
            {current_page} of {last_page}
          </Text>
          
          <TouchableOpacity
            style={[styles.navButton, !has_more_pages && styles.disabledButton]}
            onPress={() => onPageChange(current_page + 1)}
            disabled={loading || !has_more_pages}
          >
            <Ionicons name="chevron-forward" size={16} color={!has_more_pages ? '#9CA3AF' : '#374151'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          Showing {from || 0} to {to || 0} of {total} results
        </Text>
        
        {showPerPageSelector && onPerPageChange && (
          <View style={styles.perPageSelector}>
            <Text style={styles.perPageLabel}>Show:</Text>
            <View style={styles.perPageButtons}>
              {perPageOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.perPageButton,
                    currentPerPage === option && styles.activePerPageButton
                  ]}
                  onPress={() => onPerPageChange(option)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.perPageText,
                    currentPerPage === option && styles.activePerPageText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Pagination Controls */}
      <View style={styles.controlsSection}>
        <TouchableOpacity
          style={[styles.navButton, current_page === 1 && styles.disabledButton]}
          onPress={() => onPageChange(1)}
          disabled={loading || current_page === 1}
        >
          <Ionicons name="chevron-back" size={16} color={current_page === 1 ? '#9CA3AF' : '#374151'} />
          <Text style={[styles.navText, current_page === 1 && styles.disabledText]}>First</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, current_page === 1 && styles.disabledButton]}
          onPress={() => onPageChange(current_page - 1)}
          disabled={loading || current_page === 1}
        >
          <Ionicons name="chevron-back" size={16} color={current_page === 1 ? '#9CA3AF' : '#374151'} />
          <Text style={[styles.navText, current_page === 1 && styles.disabledText]}>Previous</Text>
        </TouchableOpacity>

        <View style={styles.pageNumbers}>
          {renderPageNumbers()}
        </View>

        <TouchableOpacity
          style={[styles.navButton, !has_more_pages && styles.disabledButton]}
          onPress={() => onPageChange(current_page + 1)}
          disabled={loading || !has_more_pages}
        >
          <Text style={[styles.navText, !has_more_pages && styles.disabledText]}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color={!has_more_pages ? '#9CA3AF' : '#374151'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, !has_more_pages && styles.disabledButton]}
          onPress={() => onPageChange(last_page)}
          disabled={loading || !has_more_pages}
        >
          <Text style={[styles.navText, !has_more_pages && styles.disabledText]}>Last</Text>
          <Ionicons name="chevron-forward" size={16} color={!has_more_pages ? '#9CA3AF' : '#374151'} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#014D40" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
    paddingVertical: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    flexWrap: 'wrap',
  },
  infoText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  perPageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  perPageLabel: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  perPageButtons: {
    flexDirection: 'row',
    gap: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
  },
  perPageButton: {
    paddingHorizontal: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    paddingVertical: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
    borderRadius: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  activePerPageButton: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  perPageText: {
    fontSize: isSmallMobile ? 11 : isMediumMobile ? 12 : isLargeMobile ? 13 : 13,
    color: '#374151',
    fontWeight: '500',
  },
  activePerPageText: {
    color: '#fff',
  },
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 12,
    flexWrap: 'wrap',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 16,
    paddingVertical: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 12,
    borderRadius: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    gap: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
  },
  disabledButton: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  navText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#374151',
    fontWeight: '500',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  pageNumbers: {
    flexDirection: 'row',
    gap: isSmallMobile ? 2 : isMediumMobile ? 4 : isLargeMobile ? 6 : 8,
    marginHorizontal: isSmallMobile ? 8 : isMediumMobile ? 12 : isLargeMobile ? 16 : 20,
  },
  pageButton: {
    paddingHorizontal: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 16,
    paddingVertical: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 12,
    borderRadius: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    minWidth: isSmallMobile ? 32 : isMediumMobile ? 36 : isLargeMobile ? 40 : 44,
    alignItems: 'center',
  },
  activePageButton: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  pageText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#374151',
    fontWeight: '500',
  },
  activePageText: {
    color: '#fff',
    fontWeight: '600',
  },
  ellipsis: {
    paddingHorizontal: isSmallMobile ? 4 : isMediumMobile ? 6 : isLargeMobile ? 8 : 8,
    paddingVertical: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ellipsisText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  compactInfo: {
    flex: 1,
  },
  compactText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  compactControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  currentPageText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#374151',
    fontWeight: '600',
    marginHorizontal: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


