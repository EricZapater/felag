import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Card, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { useProfileStore } from '../store';
import { useAuthStore } from '@/modules/auth/store';

export default function ProfileScreen({ navigation }: any) {
  const { profile, fetchProfile, updateProfile, isLoading, error } = useProfileStore();
  const { user, devices, fetchDevices, revokeDevice, logout } = useAuthStore();

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchDevices();
  }, [fetchProfile, fetchDevices]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhoneNumber(profile.phone_number || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSuccessMsg('');
    try {
      await updateProfile(name, phoneNumber, bio);
      setSuccessMsg('Perfil actualitzat amb èxit!');
    } catch {
      // Handled in store
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    setRevokingId(deviceId);
    try {
      await revokeDevice(deviceId);
    } finally {
      setRevokingId(null);
    }
  };

  const originStr = profile?.origin
    ? `${profile.origin.country.name} ➔ ${profile.origin.region.name} ➔ ${profile.origin.town.name}`
    : 'Cap origen definit';

  const currentPlatformLabel =
    Platform.OS === 'ios'
      ? 'iPhone (iOS)'
      : Platform.OS === 'android'
      ? 'Android'
      : 'Web App';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <Card style={styles.card}>
        <Card.Content style={styles.profileHeader}>
          <Avatar.Text
            size={80}
            label={user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
            style={{ backgroundColor: '#F4ECE1' }}
            color="#703817"
          />
          <Text variant="titleLarge" style={styles.userName}>
            {profile?.name || user?.name}
          </Text>
          <Text variant="bodyMedium" style={styles.userEmail}>
            {profile?.email || user?.email}
          </Text>
          {profile?.phone_number ? (
            <Text variant="bodySmall" style={{ color: '#C85A32', marginTop: 4 }}>
              📱 {profile.phone_number} (MFA)
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      {/* Origin */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            El teu origen
          </Text>
          <View style={styles.originBox}>
            <Text variant="labelSmall" style={{ color: '#8C7A70', textTransform: 'uppercase' }}>
              Jerarquia
            </Text>
            <Text variant="bodyLarge" style={styles.originPath}>
              {originStr}
            </Text>
          </View>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('OriginSelector')}
            textColor="#C85A32"
            style={{ borderColor: '#C85A32' }}
          >
            Canviar origen
          </Button>
        </Card.Content>
      </Card>

      {/* Edit Profile Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Informació del perfil
          </Text>

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}
          {successMsg ? (
            <HelperText type="info" visible style={{ color: '#2e7d32' }}>
              {successMsg}
            </HelperText>
          ) : null}

          <TextInput
            label="Nom complet"
            value={name}
            onChangeText={setName}
            style={styles.input}
            activeOutlineColor="#C85A32"
            mode="outlined"
          />

          <TextInput
            label="Telèfon de contacte / MFA"
            placeholder="+34 612 34 56 78"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            style={styles.input}
            activeOutlineColor="#C85A32"
            mode="outlined"
          />

          <TextInput
            label="Biografia curta"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            style={styles.input}
            activeOutlineColor="#C85A32"
            mode="outlined"
          />

          <Button
            mode="contained"
            onPress={handleSave}
            loading={isLoading}
            disabled={isLoading}
            buttonColor="#C85A32"
            style={{ marginTop: 12 }}
          >
            Desar canvis
          </Button>
        </Card.Content>
      </Card>

      {/* Dispositius connectats 📱 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Dispositius connectats 📱
            </Text>
            <Chip icon="shield-check" compact style={styles.securityChip}>
              Sessió segura
            </Chip>
          </View>

          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            Gestiona els telèfons, tauletes i navegadors que tenen accés permanent al teu compte FELAG.
          </Text>

          {/* Current Device Card */}
          <View style={styles.deviceItemCurrent}>
            <View style={styles.deviceIconBox}>
              <Text style={styles.deviceEmoji}>
                {Platform.OS === 'ios' ? '🍏' : Platform.OS === 'android' ? '🤖' : '💻'}
              </Text>
            </View>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceTitleRow}>
                <Text style={styles.deviceName}>{currentPlatformLabel}</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Aquest dispositiu</Text>
                </View>
              </View>
              <Text style={styles.deviceMeta}>
                🟢 Sessió activa ara mateix • App Mòbil FELAG
              </Text>
            </View>
          </View>

          {/* Other Devices from API */}
          {devices && devices.length > 0
            ? devices
                .filter((d) => !d.device_name?.includes('Aquest dispositiu'))
                .map((dev) => (
                  <View key={dev.id || dev.device_id} style={styles.deviceItem}>
                    <View style={styles.deviceIconBox}>
                      <Text style={styles.deviceEmoji}>
                        {dev.platform === 'ios' ? '📱' : dev.platform === 'android' ? '🤖' : '💻'}
                      </Text>
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{dev.device_name}</Text>
                      <Text style={styles.deviceMeta}>
                        Última activitat: {new Date(dev.last_active_at).toLocaleDateString('ca-ES')}
                      </Text>
                    </View>
                    <Button
                      mode="text"
                      textColor="#d32f2f"
                      loading={revokingId === dev.id || revokingId === dev.device_id}
                      onPress={() => handleRevokeDevice(dev.id || dev.device_id)}
                      compact
                    >
                      Desconnectar
                    </Button>
                  </View>
                ))
            : null}
        </Card.Content>
      </Card>

      {/* Logout button */}
      <Button
        mode="contained-tonal"
        onPress={logout}
        textColor="#d32f2f"
        icon="logout"
        style={styles.logoutButton}
      >
        Tancar sessió
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F6F0',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderRadius: 12,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  userName: {
    fontWeight: 'bold',
    color: '#2C221E',
    marginTop: 8,
  },
  userEmail: {
    color: '#786C65',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#786C65',
    marginBottom: 14,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  securityChip: {
    backgroundColor: '#E8F5E9',
    height: 28,
  },
  originBox: {
    backgroundColor: '#F4ECE1',
    borderColor: '#DDCFBF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  originPath: {
    fontWeight: 'bold',
    color: '#703817',
    marginTop: 4,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  deviceItemCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F3EC',
    borderColor: '#C85A32',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  deviceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderColor: '#E8E2D9',
    borderWidth: 1,
  },
  deviceEmoji: {
    fontSize: 18,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
  },
  activeBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  deviceMeta: {
    fontSize: 11,
    color: '#786C65',
    marginTop: 2,
  },
  logoutButton: {
    marginVertical: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 24,
    paddingVertical: 4,
  },
});
