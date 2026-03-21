import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParams } from '../navigation'
import { api } from '../api/client'

type Props = NativeStackScreenProps<RootStackParams, 'Schedule'>

interface TimeSlot {
  start: string // HH:MM
  end: string   // HH:MM
}

type DaySlots = Record<string, TimeSlot[]>

interface DeviceSchedule {
  enabled: boolean
  timezone: string
  days: DaySlots
}

// Ключи совпадают с агентом: 0=вс, 1=пн, ..., 6=сб
const DAYS = [
  { key: '1', label: 'Понедельник' },
  { key: '2', label: 'Вторник' },
  { key: '3', label: 'Среда' },
  { key: '4', label: 'Четверг' },
  { key: '5', label: 'Пятница' },
  { key: '6', label: 'Суббота' },
  { key: '0', label: 'Воскресенье' },
]

const TIME_RE = /^\d{2}:\d{2}$/

function formatTime(raw: string): string {
  // Auto-insert colon: "0900" → "09:00"
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
}

export default function ScheduleScreen({ route }: Props) {
  const { deviceId } = route.params

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [days, setDays] = useState<DaySlots>({})
  // Форма добавления слота для каждого дня
  const [addForm, setAddForm] = useState<
    Record<string, { start: string; end: string } | undefined>
  >({})

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      const { data } = await api.get<{ schedule?: DeviceSchedule | null }>(
        `/devices/${deviceId}`
      )
      const s = data.schedule
      if (s) {
        setEnabled(s.enabled)
        setTimezone(s.timezone)
        setDays(s.days ?? {})
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить расписание')
    } finally {
      setLoading(false)
    }
  }

  function openAddForm(key: string) {
    setAddForm((prev) => ({ ...prev, [key]: { start: '09:00', end: '21:00' } }))
  }

  function cancelAddForm(key: string) {
    setAddForm((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function confirmAddSlot(key: string) {
    const form = addForm[key]
    if (!form) return

    if (!TIME_RE.test(form.start) || !TIME_RE.test(form.end)) {
      Alert.alert('Неверный формат', 'Введите время в формате ЧЧ:ММ')
      return
    }

    const [sh = 0, sm = 0] = form.start.split(':').map(Number)
    const [eh = 0, em = 0] = form.end.split(':').map(Number)
    if (sh * 60 + sm >= eh * 60 + em) {
      Alert.alert('Ошибка', 'Начало должно быть раньше окончания')
      return
    }

    setDays((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), { start: form.start, end: form.end }],
    }))
    cancelAddForm(key)
  }

  function removeSlot(key: string, index: number) {
    setDays((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== index),
    }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/devices/${deviceId}/schedule`, { enabled, timezone, days })
      Alert.alert('Сохранено', 'Расписание обновлено')
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить расписание')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6c63ff" size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Включить / выключить */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.cardTitle}>Ограничение по времени</Text>
            <Text style={styles.cardSub}>
              {enabled
                ? 'ПК доступен только в указанные часы'
                : 'ПК доступен в любое время'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#333', true: '#6c63ff' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Дни недели */}
      {enabled && (
        <>
          <Text style={styles.sectionTitle}>Разрешённые часы по дням</Text>

          {DAYS.map(({ key, label }) => {
            const slots = days[key] ?? []
            const form = addForm[key]

            return (
              <View key={key} style={styles.card}>
                <Text style={styles.dayLabel}>{label}</Text>

                {slots.length === 0 && !form && (
                  <Text style={styles.noSlots}>День заблокирован</Text>
                )}

                {slots.map((slot, i) => (
                  <View key={i} style={styles.slotRow}>
                    <Text style={styles.slotTime}>
                      {slot.start} — {slot.end}
                    </Text>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => removeSlot(key, i)}
                    >
                      <Text style={styles.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {form ? (
                  <View style={styles.addForm}>
                    <TextInput
                      style={styles.timeInput}
                      value={form.start}
                      onChangeText={(v) =>
                        setAddForm((prev) => ({
                          ...prev,
                          [key]: { start: formatTime(v), end: prev[key]?.end ?? '21:00' },
                        }))
                      }
                      placeholder="09:00"
                      placeholderTextColor="#555"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Text style={styles.timeSep}>—</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={form.end}
                      onChangeText={(v) =>
                        setAddForm((prev) => ({
                          ...prev,
                          [key]: { start: prev[key]?.start ?? '09:00', end: formatTime(v) },
                        }))
                      }
                      placeholder="21:00"
                      placeholderTextColor="#555"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => confirmAddSlot(key)}
                    >
                      <Text style={styles.confirmBtnText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => cancelAddForm(key)}
                    >
                      <Text style={styles.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => openAddForm(key)}
                  >
                    <Text style={styles.addBtnText}>+ Добавить интервал</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={() => void save()}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0f0f23', justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSub: { color: '#888', fontSize: 13 },

  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },

  dayLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  noSlots: { color: '#555', fontSize: 13, marginBottom: 8 },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f23',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  slotTime: { color: '#6c63ff', fontSize: 15, fontWeight: '500' },
  removeBtn: { color: '#ef4444', fontSize: 16 },

  addForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#0f0f23',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#444',
    textAlign: 'center',
  },
  timeSep: { color: '#888', fontSize: 14 },
  confirmBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confirmBtnText: { color: '#fff', fontSize: 16 },

  addBtn: { marginTop: 4 },
  addBtnText: { color: '#6c63ff', fontSize: 14 },

  saveBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
