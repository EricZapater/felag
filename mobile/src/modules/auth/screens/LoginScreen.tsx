import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useAuthStore } from '../store';

type AuthMethod = 'password' | 'otp';

export default function LoginScreen({ navigation }: any) {
  const [method, setMethod] = useState<AuthMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const {
    login,
    requestOTP,
    verifyOTP,
    isLoading,
    error,
    otpSent,
    clearError,
    resetOtpState,
  } = useAuthStore();

  const handlePasswordLogin = async () => {
    clearError();
    try {
      await login(email, password);
    } catch {
      // Handled in store
    }
  };

  const handleRequestOTP = async () => {
    clearError();
    if (!email.trim()) return;
    try {
      await requestOTP(email.trim());
    } catch {
      // Handled in store
    }
  };

  const handleVerifyOTP = async () => {
    clearError();
    if (!otpCode.trim() || otpCode.length < 6) return;
    try {
      await verifyOTP(email.trim(), otpCode.trim());
    } catch {
      // Handled in store
    }
  };

  const handleMethodChange = (value: string) => {
    clearError();
    resetOtpState();
    setMethod(value as AuthMethod);
    setOtpCode('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Troba gent de la teva terra allà on viatgis
        </Text>

        {/* Mode Selector */}
        <SegmentedButtons
          value={method}
          onValueChange={handleMethodChange}
          buttons={[
            {
              value: 'password',
              label: 'Contrasenya',
              icon: 'lock',
            },
            {
              value: 'otp',
              label: 'Codi per correu',
              icon: 'email-fast',
            },
          ]}
          style={styles.segmentedButtons}
          theme={{
            colors: {
              secondaryContainer: '#FFE8DF',
              onSecondaryContainer: '#C85A32',
            },
          }}
        />

        {error ? (
          <HelperText type="error" visible style={styles.errorText}>
            {error}
          </HelperText>
        ) : null}

        {/* Mode 1: Password Login */}
        {method === 'password' && (
          <View style={styles.form}>
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
              label="Contrasenya"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />

            <Button
              mode="contained"
              onPress={handlePasswordLogin}
              loading={isLoading}
              disabled={isLoading || !email || !password}
              style={styles.button}
              buttonColor="#C85A32"
            >
              Inicia sessió
            </Button>
          </View>
        )}

        {/* Mode 2: OTP / Passwordless Login */}
        {method === 'otp' && (
          <View style={styles.form}>
            {!otpSent ? (
              <>
                <Text style={styles.otpNotice}>
                  ✉️ T'enviarem un codi d'accés de 6 dígits al teu correu per connectar de forma segura sense necessitat de recordar cap contrasenya.
                </Text>

                <TextInput
                  label="Correu electrònic"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  activeOutlineColor="#C85A32"
                  mode="outlined"
                  placeholder="nom@exemple.cat"
                />

                <Button
                  mode="contained"
                  onPress={handleRequestOTP}
                  loading={isLoading}
                  disabled={isLoading || !email.trim()}
                  style={styles.button}
                  buttonColor="#C85A32"
                  icon="send"
                >
                  Enviar codi d'accés
                </Button>
              </>
            ) : (
              <>
                <View style={styles.otpSentBanner}>
                  <Text style={styles.otpSentTitle}>📨 Codi enviat a:</Text>
                  <Text style={styles.otpSentEmail}>{email}</Text>
                  <Text style={styles.otpSentSub}>
                    Introdueix el codi de 6 dígits que has rebut al teu correu.
                  </Text>
                </View>

                <TextInput
                  label="Codi de 6 dígits"
                  value={otpCode}
                  onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, styles.otpInput]}
                  activeOutlineColor="#C85A32"
                  mode="outlined"
                  placeholder="123456"
                />

                <Button
                  mode="contained"
                  onPress={handleVerifyOTP}
                  loading={isLoading}
                  disabled={isLoading || otpCode.length < 6}
                  style={styles.button}
                  buttonColor="#C85A32"
                  icon="check-circle"
                >
                  Verificar i accedir
                </Button>

                <View style={styles.otpActions}>
                  <TouchableOpacity
                    onPress={handleRequestOTP}
                    disabled={isLoading}
                    style={styles.otpLink}
                  >
                    <Text style={styles.otpLinkText}>Reenviar codi</Text>
                  </TouchableOpacity>

                  <Text style={styles.otpDot}>•</Text>

                  <TouchableOpacity
                    onPress={() => resetOtpState()}
                    disabled={isLoading}
                    style={styles.otpLink}
                  >
                    <Text style={styles.otpLinkText}>Canviar correu</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        <Divider style={{ marginVertical: 24, backgroundColor: '#E8E2D9' }} />

        {/* Link to Register */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerPrompt}>No tens compte a FELAG?</Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            textColor="#C85A32"
          >
            Registra't de franc
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F9F6F0',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 190,
    height: 64,
  },
  subtitle: {
    color: '#786C65',
    textAlign: 'center',
    marginBottom: 24,
  },
  segmentedButtons: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  form: {
    width: '100%',
  },
  errorText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 28,
  },
  otpNotice: {
    fontSize: 13,
    color: '#6B5E55',
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#F4ECE1',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDCFBF',
  },
  otpSentBanner: {
    backgroundColor: '#F4ECE1',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDCFBF',
    marginBottom: 16,
    alignItems: 'center',
  },
  otpSentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#786C65',
  },
  otpSentEmail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C221E',
    marginTop: 2,
  },
  otpSentSub: {
    fontSize: 11,
    color: '#703817',
    marginTop: 4,
    textAlign: 'center',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  otpLink: {
    padding: 6,
  },
  otpLinkText: {
    color: '#C85A32',
    fontSize: 13,
    fontWeight: '600',
  },
  otpDot: {
    color: '#786C65',
  },
  registerContainer: {
    alignItems: 'center',
  },
  registerPrompt: {
    color: '#786C65',
    fontSize: 13,
    marginBottom: 4,
  },
});
