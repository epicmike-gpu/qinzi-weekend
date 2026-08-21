import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { itinerariesApi, type Place } from '@/utils/api';
import { Screen } from '@/components/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DURATION_OPTIONS = [
  { key: 'half_day', label: '半日游', icon: 'sun', desc: '轻松半天' },
  { key: 'full_day', label: '一日游', icon: 'calendar', desc: '充实一天' },
];

const AGE_OPTIONS = [
  { key: '0-3', label: '0-3岁', min: 0, max: 3 },
  { key: '3-6', label: '3-6岁', min: 3, max: 6 },
  { key: '6-12', label: '6-12岁', min: 6, max: 12 },
];

export default function ItineraryScreen() {
  const [selectedDuration, setSelectedDuration] = useState('half_day');
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [generatedItinerary, setGeneratedItinerary] = useState<{
    title: string;
    description: string;
    places: Place[];
    estimated_cost: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // 生成行程
  const handleGenerate = useCallback(async () => {
    if (!selectedAge) {
      Alert.alert('提示', '请先选择孩子年龄');
      return;
    }

    setLoading(true);
    try {
      const ageOption = AGE_OPTIONS.find(a => a.key === selectedAge);
      const age = ageOption ? (ageOption.min + ageOption.max) / 2 : 5;

      const res = await itinerariesApi.generate({
        age,
        duration_type: selectedDuration,
        distance: 10,
      });

      if (res.success) {
        setGeneratedItinerary(res.data);
      }
    } catch (err) {
      console.error('生成行程失败:', err);
      Alert.alert('错误', '生成行程失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [selectedAge, selectedDuration]);

  // 保存行程
  const handleSave = useCallback(async () => {
    if (!generatedItinerary) return;

    try {
      // 获取用户ID
      const deviceId = await AsyncStorage.getItem('device_id') || 'default';
      const userRes = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/device/${deviceId}`);
      const userData = await userRes.json();
      
      if (!userData.success) {
        Alert.alert('错误', '获取用户信息失败');
        return;
      }

      const res = await itinerariesApi.create({
        user_id: userData.data.id,
        title: generatedItinerary.title,
        description: generatedItinerary.description,
        duration_type: selectedDuration,
        place_ids: generatedItinerary.places.map(p => p.id),
        estimated_cost: generatedItinerary.estimated_cost,
        is_public: true,
      });

      if (res.success) {
        Alert.alert('成功', '行程已保存');
        setGeneratedItinerary(null);
      }
    } catch (err) {
      console.error('保存行程失败:', err);
      Alert.alert('错误', '保存行程失败');
    }
  }, [generatedItinerary, selectedDuration]);

  // 渲染时长选择
  const renderDurationSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>选择行程时长</Text>
      <View style={styles.durationRow}>
        {DURATION_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.durationCard,
              selectedDuration === option.key && styles.durationCardActive,
            ]}
            onPress={() => setSelectedDuration(option.key)}
          >
            <Feather
              name={option.icon as keyof typeof Feather.glyphMap}
              size={24}
              color={selectedDuration === option.key ? '#FF7A59' : '#636E72'}
            />
            <Text
              style={[
                styles.durationLabel,
                selectedDuration === option.key && styles.durationLabelActive,
              ]}
            >
              {option.label}
            </Text>
            <Text style={styles.durationDesc}>{option.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 渲染年龄选择
  const renderAgeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>孩子年龄</Text>
      <View style={styles.ageRow}>
        {AGE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.ageChip,
              selectedAge === option.key && styles.ageChipActive,
            ]}
            onPress={() => setSelectedAge(option.key)}
          >
            <Text
              style={[
                styles.ageChipText,
                selectedAge === option.key && styles.ageChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 渲染生成的行程
  const renderGeneratedItinerary = () => {
    if (!generatedItinerary) return null;

    return (
      <View style={styles.resultSection}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{generatedItinerary.title}</Text>
          <TouchableOpacity onPress={handleSave}>
            <View style={styles.saveButton}>
              <Feather name="save" size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>保存行程</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.resultDesc}>{generatedItinerary.description}</Text>
        
        <View style={styles.costBadge}>
          <Feather name="dollar-sign" size={14} color="#00B894" />
          <Text style={styles.costText}>预计花费: {generatedItinerary.estimated_cost}</Text>
        </View>

        <View style={styles.placesList}>
          {generatedItinerary.places.map((place, index) => (
            <View key={place.id} style={styles.placeItem}>
              <View style={styles.placeNumber}>
                <Text style={styles.placeNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {place.address}
                </Text>
                <View style={styles.placeMeta}>
                  <View style={styles.placeRating}>
                    <Feather name="star" size={12} color="#FFD700" />
                    <Text style={styles.placeRatingText}>
                      {place.avg_rating?.toFixed(1) || '暂无'}
                    </Text>
                  </View>
                  {place.is_free && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeText}>免费</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>行程规划</Text>
            <Text style={styles.headerSubtitle}>一键生成周末遛娃方案</Text>
          </View>

          {/* 时长选择 */}
          {renderDurationSelector()}

          {/* 年龄选择 */}
          {renderAgeSelector()}

          {/* 生成按钮 */}
          <TouchableOpacity
            style={[styles.generateButton, (!selectedAge || loading) && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={!selectedAge || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="zap" size={20} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>智能生成行程</Text>
              </>
            )}
          </TouchableOpacity>

          {/* 生成结果 */}
          {renderGeneratedItinerary()}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F3',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#D4CFC7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  durationCardActive: {
    backgroundColor: 'rgba(255, 122, 89, 0.1)',
    borderWidth: 2,
    borderColor: '#FF7A59',
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginTop: 8,
  },
  durationLabelActive: {
    color: '#FF7A59',
  },
  durationDesc: {
    fontSize: 12,
    color: '#B2BEC3',
    marginTop: 4,
  },
  ageRow: {
    flexDirection: 'row',
  },
  ageChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  ageChipActive: {
    backgroundColor: '#FF7A59',
  },
  ageChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  ageChipTextActive: {
    color: '#FFFFFF',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7A59',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#FF7A59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonDisabled: {
    backgroundColor: '#B2BEC3',
    shadowOpacity: 0,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  resultSection: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#D4CFC7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  resultDesc: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
    lineHeight: 20,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  costText: {
    fontSize: 13,
    color: '#00B894',
    fontWeight: '600',
    marginLeft: 4,
  },
  placesList: {
    marginTop: 20,
  },
  placeItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  placeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF7A59',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3436',
  },
  placeAddress: {
    fontSize: 12,
    color: '#B2BEC3',
    marginTop: 2,
  },
  placeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  placeRatingText: {
    fontSize: 12,
    color: '#636E72',
    marginLeft: 2,
  },
  freeBadge: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeText: {
    fontSize: 11,
    color: '#00B894',
    fontWeight: '600',
  },
});
