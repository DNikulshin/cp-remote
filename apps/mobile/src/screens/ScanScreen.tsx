import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useNavigation } from '@react-navigation/native'
import { useDevicesStore } from '../store/devices'

export default function ScanScreen() {
  const navigation = useNavigation()
  const { bindDevice } = useDevicesStore()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [nameModal, setNameModal] = useState(false)
  const [pendingData, setPendingData] = useState<{
    deviceId: string
    secret: string
  } | null>(null)

  const handleScan = ({ data }: { data: string }) => {
    if (scanned) return
    setScanned(true)

    try {
      const parsed = JSON.parse(data) as { deviceId: string; secret: string }
      if (!parsed.deviceId || !parsed.secret) throw new Error('Invalid QR')

      setPendingData(parsed)
      setNameModal(true)
    } catch {
      Alert.alert('Ошибка', 'Неверный QR-код', [
        { text: 'OK', onPress: () => setScanned(false) },
      ])
    }
  }

  const handleBind = async () => {
    if (!pendingData || !deviceName.trim()) return

    try {
      await bindDevice(pendingData.deviceId, pendingData.secret, deviceName.trim())
      Alert.alert('✓ Устройство привязано', deviceName, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch {
      Alert.alert('Ошибка', 'Не удалось привязать устройство')
      setScanned(false)
      setNameModal(false)
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Нужен доступ к камере</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Разрешить</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleScan}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>Наведите камеру на QR-код агента</Text>
      </View>

      {nameModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Название устройства</Text>
            <TextInput
              style={styles.input}
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Например: Мой ПК"
              placeholderTextColor="#666"
              autoFocus
            />
            <TouchableOpacity style={styles.button} onPress={handleBind}>
              <Text style={styles.buttonText}>Привязать</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 16, marginBottom: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#6c63ff',
    borderRadius: 16,
    marginBottom: 24,
  },
  hint: { color: '#fff', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 32,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 16 },
  input: {
    backgroundColor: '#0f0f23',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6c63ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})