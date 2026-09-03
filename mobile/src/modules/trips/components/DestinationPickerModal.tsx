import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Divider, Searchbar, Text } from 'react-native-paper';
import { communityApi } from '@/modules/community/api';
import { DestinationSummary } from '@/modules/community/types';

interface DestinationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (destination: {
    name: string;
    country_code?: string;
    region_name?: string;
    destination_id?: string;
  }) => void;
}

export default function DestinationPickerModal({
  visible,
  onClose,
  onSelect,
}: DestinationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<DestinationSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadDestinations(searchQuery);
    }
  }, [visible]);

  const loadDestinations = async (q: string) => {
    setLoading(true);
    try {
      const data = await communityApi.searchDestinations(q);
      setResults(data);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSearch = (query: string) => {
    setSearchQuery(query);
    loadDestinations(query);
  };

  const handleSelect = (item: DestinationSummary) => {
    onSelect({
      name: item.name,
      country_code: item.country_code,
      region_name: item.region_name,
      destination_id: item.id,
    });
    onClose();
  };

  const handleUseCustomQuery = () => {
    if (searchQuery.trim()) {
      onSelect({
        name: searchQuery.trim(),
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title}>
              Triar Destinació 🗺️
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Tancar</Text>
            </TouchableOpacity>
          </View>

          <Searchbar
            placeholder="Cerca ciutat, regió o país..."
            onChangeText={handleChangeSearch}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
            iconColor="#C85A32"
          />

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color="#C85A32" />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <Divider style={styles.divider} />}
              style={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? 'No hem trobat cap ciutat amb aquest nom.'
                      : 'Escriu per cercar destinacions.'}
                  </Text>
                  {searchQuery.trim() ? (
                    <Button
                      mode="outlined"
                      textColor="#C85A32"
                      style={styles.customBtn}
                      onPress={handleUseCustomQuery}
                    >
                      Utilitzar "{searchQuery.trim()}"
                    </Button>
                  ) : null}
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemRow}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconBox}>
                    <Text style={styles.itemIcon}>
                      {item.type === 'country' ? '🌐' : '📍'}
                    </Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {[item.region_name, item.country_name || item.country_code]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                  {item.recommendations_count ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>💡 {item.recommendations_count}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 34, 30, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '55%',
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E8E2D9',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '800',
    color: '#2C221E',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#C85A32',
    fontWeight: '600',
  },
  searchbar: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 12,
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
    color: '#2C221E',
  },
  list: {
    flexGrow: 1,
  },
  divider: {
    backgroundColor: '#F0EBE3',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIcon: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C221E',
  },
  itemMeta: {
    fontSize: 12,
    color: '#786C65',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E65100',
  },
  center: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#786C65',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  customBtn: {
    borderColor: '#C85A32',
    borderRadius: 12,
  },
});
