import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Button, RadioButton, Text } from 'react-native-paper';
import { PhotoSharingMode } from '../types';

interface ArrivalPromptModalProps {
  visible: boolean;
  destinationName: string;
  initialMode?: PhotoSharingMode;
  onSave: (mode: PhotoSharingMode) => void;
  onClose: () => void;
}

export default function ArrivalPromptModal({
  visible,
  destinationName,
  initialMode = 'all_felagis',
  onSave,
  onClose,
}: ArrivalPromptModalProps) {
  const [selectedMode, setSelectedMode] = useState<PhotoSharingMode>(initialMode);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedMode);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.bottomSheet}>
              <View style={styles.dragHandle} />

              <Text style={styles.title}>
                Benvingut/da a {destinationName || 'la destinació'}! 📍✨
              </Text>
              <Text style={styles.description}>
                Vols compartir fotos en directe amb altres FELAGIS que estan a la ciutat durant el teu viatge?
              </Text>

              <View style={styles.optionList}>
                {/* Option 1: All Felagis */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    selectedMode === 'all_felagis' && styles.optionCardSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMode('all_felagis')}
                >
                  <RadioButton.Android
                    value="all_felagis"
                    status={selectedMode === 'all_felagis' ? 'checked' : 'unchecked'}
                    onPress={() => setSelectedMode('all_felagis')}
                    color="#C85A32"
                  />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>
                      🌍 Amb tots els FELAGIS coincidents
                    </Text>
                    <Text style={styles.optionSub}>
                      Visible al Feed en Viu de {destinationName || 'la ciutat'} durant el viatge.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: Close Origin */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    selectedMode === 'close_origin' && styles.optionCardSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMode('close_origin')}
                >
                  <RadioButton.Android
                    value="close_origin"
                    status={selectedMode === 'close_origin' ? 'checked' : 'unchecked'}
                    onPress={() => setSelectedMode('close_origin')}
                    color="#C85A32"
                  />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>
                      🏡 Només amb els meus propers
                    </Text>
                    <Text style={styles.optionSub}>
                      Visible només per FELAGIS del teu poble o xats oberts.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option 3: None */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    selectedMode === 'none' && styles.optionCardSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMode('none')}
                >
                  <RadioButton.Android
                    value="none"
                    status={selectedMode === 'none' ? 'checked' : 'unchecked'}
                    onPress={() => setSelectedMode('none')}
                    color="#C85A32"
                  />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>
                      🔒 Amb ningú (Privat)
                    </Text>
                    <Text style={styles.optionSub}>
                      Mantenir el viatge en mode privat.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Button
                mode="contained"
                buttonColor="#C85A32"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                style={styles.saveBtn}
                contentStyle={{ paddingVertical: 8 }}
                labelStyle={{ fontSize: 16, fontWeight: '700' }}
              >
                Desar Preferència 🚀
              </Button>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 34, 30, 0.7)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E8E2D9',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    color: '#2C221E',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#6B5E57',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  optionList: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#E8E2D9',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  optionCardSelected: {
    borderColor: '#C85A32',
    backgroundColor: '#FDF7F4',
  },
  optionContent: {
    flex: 1,
    marginLeft: 4,
    marginTop: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
  },
  optionSub: {
    fontSize: 12,
    color: '#6B5E57',
    marginTop: 2,
    lineHeight: 16,
  },
  saveBtn: {
    borderRadius: 14,
  },
});
