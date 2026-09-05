import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, Button, Divider, Searchbar, Text } from 'react-native-paper';
import { tripsApi } from '../api';
import { FelagiUserSummary } from '../types';

interface CompanionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (companion: FelagiUserSummary) => void;
  excludedUserIds?: string[];
}

export default function CompanionPickerModal({
  visible,
  onClose,
  onSelect,
  excludedUserIds = [],
}: CompanionPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<FelagiUserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUsers(searchQuery);
    }
  }, [visible]);

  const loadUsers = async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await tripsApi.searchUsers(q);
      const filtered = data.filter((u) => !excludedUserIds.includes(u.id));
      setResults(filtered);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSearch = (query: string) => {
    setSearchQuery(query);
    loadUsers(query);
  };

  const handleSelect = (item: FelagiUserSummary) => {
    onSelect(item);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title}>
              Afegir Acompanyant 👥
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Tancar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Cerca usuaris de FELAG pel seu nom o municipi d'origen per afegir-los al teu grup de viatge.
          </Text>

          <Searchbar
            placeholder="Cerca per nom o municipi..."
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
                    {searchQuery.trim().length < 2
                      ? 'Escriu almenys 2 caràcters per cercar viatgers.'
                      : 'No hem trobat cap felagi amb aquest nom o origen.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemRow}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Avatar.Text
                    size={36}
                    label={(item.name || 'F').slice(0, 2).toUpperCase()}
                    style={styles.avatar}
                    color="#FFFFFF"
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.town_name ? `📍 ${item.town_name}` : item.origin_summary || 'FELAGI'}
                    </Text>
                  </View>
                  <Button
                    mode="contained"
                    compact
                    buttonColor="#C85A32"
                    textColor="#FFFFFF"
                    style={styles.addBtn}
                    onPress={() => handleSelect(item)}
                  >
                    Afegir
                  </Button>
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
    minHeight: '60%',
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
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    color: '#2C221E',
  },
  subtitle: {
    fontSize: 13,
    color: '#786C65',
    marginBottom: 14,
    lineHeight: 18,
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
  avatar: {
    backgroundColor: '#C85A32',
    marginRight: 12,
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
  addBtn: {
    borderRadius: 10,
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
  },
});
