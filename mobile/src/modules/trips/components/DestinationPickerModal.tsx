import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Divider, Searchbar, Text } from 'react-native-paper';
import { placesApi } from '@/modules/places/api';
import { PlacePrediction, formatDestinationWithCountry } from '@/modules/places/types';
import { communityApi } from '@/modules/community/api';
import { DestinationSummary } from '@/modules/community/types';

interface DestinationItem {
  id?: string;
  google_place_id?: string;
  name: string;
  secondary_text?: string;
  country_code?: string;
  country_name?: string;
  region_name?: string;
  town_id?: string;
}

interface DestinationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (destination: {
    name: string;
    country_code?: string;
    country_name?: string;
    region_name?: string;
    destination_id?: string;
    town_id?: string;
  }) => void;
}

export default function DestinationPickerModal({
  visible,
  onClose,
  onSelect,
}: DestinationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<DestinationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      loadDestinations(searchQuery);
    }
  }, [visible]);

  const loadDestinations = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      // Load initial suggestions from community destinations
      setLoading(true);
      try {
        const data = await communityApi.searchDestinations('', 10);
        setResults(
          data.map((d: DestinationSummary) => ({
            id: d.id,
            name: d.name,
            secondary_text: [d.region_name, d.country_name].filter(Boolean).join(', '),
            country_code: d.country_code,
            country_name: d.country_name,
            region_name: d.region_name,
            town_id: d.id,
          }))
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Search Google Places & cached places
      const predictions = await placesApi.autocomplete(trimmed, 'ca');
      if (predictions && predictions.length > 0) {
        setResults(
          predictions.map((p: PlacePrediction) => ({
            google_place_id: p.google_place_id,
            name: p.main_text || p.full_text,
            secondary_text: p.secondary_text,
          }))
        );
      } else {
        // Fallback to local destinations
        const data = await communityApi.searchDestinations(trimmed, 10);
        setResults(
          data.map((d: DestinationSummary) => ({
            id: d.id,
            name: d.name,
            secondary_text: [d.region_name, d.country_name].filter(Boolean).join(', '),
            country_code: d.country_code,
            country_name: d.country_name,
            region_name: d.region_name,
            town_id: d.id,
          }))
        );
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadDestinations(query);
    }, 250);
  };

  const handleSelect = async (item: DestinationItem) => {
    if (item.google_place_id) {
      setResolving(true);
      try {
        const details = await placesApi.resolvePlace(item.google_place_id, 'ca');
        if (details) {
          const finalName = formatDestinationWithCountry(
            details.name || item.name,
            details.country_name,
            details.country_code,
            item.secondary_text
          );
          onSelect({
            name: finalName,
            country_code: details.country_code,
            country_name: details.country_name,
            region_name: details.region_name,
            town_id: details.town_id,
            destination_id: details.town_id || details.place_id,
          });
          onClose();
          return;
        }
      } catch {
        // Continue with basic selection
      } finally {
        setResolving(false);
      }
    }

    const finalName = formatDestinationWithCountry(
      item.name,
      item.country_name,
      item.country_code,
      item.secondary_text
    );
    onSelect({
      name: finalName,
      country_code: item.country_code,
      country_name: item.country_name,
      region_name: item.region_name,
      destination_id: item.id || item.town_id,
      town_id: item.town_id,
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
            placeholder="Cerca qualsevol ciutat del món..."
            onChangeText={handleChangeSearch}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
            iconColor="#C85A32"
          />

          {loading || resolving ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color="#C85A32" />
              {resolving && (
                <Text style={{ marginTop: 8, fontSize: 12, color: '#786C65' }}>
                  Resolent ubicació...
                </Text>
              )}
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item, index) => item.google_place_id || item.id || `${item.name}-${index}`}
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
                  <Text style={styles.itemIcon}>📍</Text>
                  <View style={styles.itemTexts}>
                    <Text variant="bodyLarge" style={styles.itemName}>
                      {formatDestinationWithCountry(item.name, item.country_name, item.country_code, item.secondary_text)}
                    </Text>
                    {item.secondary_text ? (
                      <Text variant="bodySmall" style={styles.itemSecondary}>
                        {item.secondary_text}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {searchQuery.trim() && results.length > 0 ? (
            <View style={styles.footer}>
              <Button
                mode="text"
                textColor="#786C65"
                onPress={handleUseCustomQuery}
                style={styles.customFooterBtn}
              >
                No la trobes? Utilitza "{searchQuery.trim()}" com a text lliure
              </Button>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1C7BD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE1',
  },
  title: {
    fontWeight: '700',
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
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#F9F6F0',
    borderRadius: 10,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  searchInput: {
    fontSize: 14,
    color: '#2C221E',
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 380,
  },
  divider: {
    backgroundColor: '#F5EFE6',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  itemTexts: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
    color: '#2C221E',
  },
  itemSecondary: {
    color: '#786C65',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#C85A32',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#786C65',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  customBtn: {
    borderColor: '#C85A32',
    borderRadius: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE1',
    alignItems: 'center',
  },
  customFooterBtn: {
    marginTop: 4,
  },
});
