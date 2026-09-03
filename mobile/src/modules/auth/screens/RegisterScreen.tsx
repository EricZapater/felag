import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useAuthStore } from '../store';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading, error } = useAuthStore();

  const handleRegister = async () => {
    try {
      await register(name, email, password);
    } catch (err) {
      // Handled in store
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        FELAG
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Crea el teu compte i connecta amb la teva gent
      </Text>

      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      <TextInput
        label="Nom complet"
        value={name}
        onChangeText={setName}
        style={styles.input}
        activeOutlineColor="#C85A32"
        mode="outlined"
      />

      <TextInput
        label="Correu electrònic"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        activeOutlineColor="#C85A32"
        mode="outlined"
      />

      <TextInput
        label="Contrasenya (mín. 8 caràcters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        activeOutlineColor="#C85A32"
        mode="outlined"
      />

      <Button
        mode="contained"
        onPress={handleRegister}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
        buttonColor="#C85A32"
      >
        Crear compte
      </Button>

      <Button
        mode="text"
        onPress={() => navigation.navigate('Login')}
        textColor="#C85A32"
        style={styles.link}
      >
        Ja tens compte? Inicia sessió
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F9F6F0',
  },
  title: {
    color: '#C85A32',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#786C65',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
    borderRadius: 28,
  },
  link: {
    marginTop: 16,
  },
});
