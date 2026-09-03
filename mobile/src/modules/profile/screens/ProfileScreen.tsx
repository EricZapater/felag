import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { useProfileStore } from '../store';
import { useAuthStore } from '@/modules/auth/store';

export default function ProfileScreen({ navigation }: any) {
  const { profile, fetchProfile, updateProfile, isLoading, error } = useProfileStore();
  const { user, logout } = useAuthStore();

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
    } catch (err) {
      // Handled in store
    }
  };

  const originStr = profile?.origin
    ? `${profile.origin.country.name} ➔ ${profile.origin.region.name} ➔ ${profile.origin.town.name}`
    : 'Cap origen definit';

  return (
    <ScrollView style={styles.container}>
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

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Informació del perfil
          </Text>

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}
          {successMsg ? <HelperText type="info" visible style={{ color: '#2e7d32' }}>{successMsg}</HelperText> : null}

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

      <Button mode="text" onPress={logout} textColor="#d32f2f" style={{ marginVertical: 24 }}>
        Tancar sessió
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9F6F0',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
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
    marginBottom: 12,
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
});
