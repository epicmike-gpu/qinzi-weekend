import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { placesApi, type Place } from '@/utils/api';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getCurrentPositionWithAMap } from '@/utils/amap';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 场所类型图标映射
const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  park: 'map-pin',
  museum: 'home',
  farm: 'sun',
  playground: 'smile',
  science_center: 'cpu',
  zoo: 'compass',
  mall: 'shopping-bag',
  other: 'map-pin',
};

const CATEGORY_COLORS: Record<string, string> = {
  park: '#00B894',
  museum: '#6C63FF',
  farm: '#FDCB6E',
  playground: '#FF6584',
  science_center: '#0984E3',
  zoo: '#E17055',
  mall: '#A29BFE',
  other: '#636E72',
};

export default function DiscoverScreen() {
  const router = useSafeRouter();
  const [places, setPlaces] = useState<(Place & { distance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedDistance, setSelectedDistance] = useState(5);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'fallback' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  // 获取位置
  const requestLocation = useCallback(async () => {
    setLocationStatus('loading');
    
    // Web平台优先使用高德地图高精度定位，失败时回退到浏览器Geolocation
    if (Platform.OS === 'web') {
      try {
        const pos = await getCurrentPositionWithAMap();
        setLocation({ latitude: pos.latitude, longitude: pos.longitude });
        setLocationStatus('success');
        return;
      } catch (amapError) {
        console.log('高德定位失败，回退到浏览器定位:', (amapError as Error).message);
      }

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationStatus('success');
          },
          (error) => {
            console.error('Web定位失败:', error.message);
            // 使用默认位置（北京）
            setLocation({ latitude: 39.9042, longitude: 116.4074 });
            setLocationStatus('fallback');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } else {
        // 浏览器不支持定位
        setLocation({ latitude: 39.9042, longitude: 116.4074 });
        setLocationStatus('fallback');
      }
      return;
    }

    // 原生平台使用expo-location
    try {
      // 先检查权限
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // 请求权限
        const requestResult = await Location.requestForegroundPermissionsAsync();
        if (requestResult.status !== 'granted') {
          console.log('位置权限被拒绝');
          // 使用默认位置（北京）
          setLocation({ latitude: 39.9042, longitude: 116.4074 });
          setLocationStatus('fallback');
          return;
        }
      }

      // 获取位置，使用高精度
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });
      setLocationStatus('success');
    } catch (err) {
      console.error('获取位置失败:', err);
      // 尝试使用最后已知位置
      try {
        const lastLocation = await Location.getLastKnownPositionAsync();
        if (lastLocation) {
          setLocation({
            latitude: lastLocation.coords.latitude,
            longitude: lastLocation.coords.longitude,
          });
          setLocationStatus('success');
          return;
        }
      } catch (e) {
        console.error('获取最后位置也失败:', e);
      }
      // 使用默认位置（北京）
      setLocation({ latitude: 39.9042, longitude: 116.4074 });
      setLocationStatus('fallback');
    }
  }, []);

  // 获取附近场所
  const fetchNearbyPlaces = useCallback(async () => {
    if (!location) return;

    try {
      setLoading(true);
      const res = await placesApi.getNearby(
        location.latitude,
        location.longitude,
        selectedDistance,
        20
      );
      if (res.success) {
        setPlaces(res.data);
      }
    } catch (err) {
      console.error('获取附近场所失败:', err);
    } finally {
      setLoading(false);
    }
  }, [location, selectedDistance]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (location) {
      fetchNearbyPlaces();
    }
  }, [location, fetchNearbyPlaces]);

  // 渲染距离筛选
  const renderDistanceFilter = () => {
    const distances = [3, 5, 10, 20];
    return (
      <View style={styles.distanceFilter}>
        {distances.map((dist) => (
          <TouchableOpacity
            key={dist}
            style={[
              styles.distanceChip,
              selectedDistance === dist && styles.distanceChipActive,
            ]}
            onPress={() => setSelectedDistance(dist)}
          >
            <Text
              style={[
                styles.distanceChipText,
                selectedDistance === dist && styles.distanceChipTextActive,
              ]}
            >
              {dist}km内
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // 渲染场所卡片（大卡片样式）
  const renderPlaceCard = (place: Place & { distance: number }) => {
    const categoryIcon = CATEGORY_ICONS[place.category] || 'map-pin';
    const categoryColor = CATEGORY_COLORS[place.category] || '#636E72';

    return (
      <TouchableOpacity
        key={place.id}
        style={styles.placeCard}
        onPress={() => router.push(`/place-detail?id=${place.id}`)}
        activeOpacity={0.8}
      >
        <Image
          source={{
            uri: place.images?.[0]?.url || 'https://images.unsplash.com/photo-1597953601374-1ff2d5640c85?w=400',
          }}
          style={styles.placeImage}
        />
        <View style={styles.placeOverlay}>
          <View style={styles.placeCategoryBadge}>
            <Feather name={categoryIcon} size={12} color={categoryColor} />
            <Text style={[styles.placeCategoryText, { color: categoryColor }]}>
              {getCategoryLabel(place.category)}
            </Text>
          </View>
          <View style={styles.placeBottomInfo}>
            <Text style={styles.placeName} numberOfLines={1}>
              {place.name}
            </Text>
            <View style={styles.placeMetaRow}>
              <View style={styles.placeRating}>
                <Feather name="star" size={12} color="#FFD700" />
                <Text style={styles.placeRatingText}>
                  {place.avg_rating?.toFixed(1) || '暂无'}
                </Text>
              </View>
              <View style={styles.placeDistance}>
                <Feather name="navigation" size={12} color="#FFFFFF" />
                <Text style={styles.placeDistanceText}>
                  {place.distance < 1 ? `${(place.distance * 1000).toFixed(0)}m` : `${place.distance.toFixed(1)}km`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 渲染列表
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A59" />
          <Text style={styles.loadingText}>正在查找附近场所...</Text>
        </View>
      );
    }

    if (places.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="map" size={48} color="#B2BEC3" />
          <Text style={styles.emptyText}>附近暂无场所</Text>
          <Text style={styles.emptySubText}>尝试扩大搜索范围</Text>
        </View>
      );
    }

    return (
      <View style={styles.placeGrid}>
        {places.map(renderPlaceCard)}
      </View>
    );
  };

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>附近发现</Text>
              <View style={styles.locationStatusRow}>
                {locationStatus === 'loading' && (
                  <>
                    <ActivityIndicator size="small" color="#FF7A59" />
                    <Text style={styles.locationStatusText}>正在获取位置...</Text>
                  </>
                )}
                {locationStatus === 'success' && (
                  <>
                    <View style={styles.locationDot} />
                    <Text style={styles.locationStatusText}>已定位到当前位置</Text>
                  </>
                )}
                {locationStatus === 'fallback' && (
                  <>
                    <View style={[styles.locationDot, { backgroundColor: '#FDCB6E' }]} />
                    <Text style={styles.locationStatusText}>使用默认位置（北京）</Text>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity 
              style={styles.locationButton} 
              onPress={requestLocation}
              disabled={refreshing}
            >
              <Feather 
                name="crosshair" 
                size={20} 
                color={refreshing ? '#B2BEC3' : '#FF7A59'} 
              />
            </TouchableOpacity>
          </View>

          {/* 定位提示 */}
          {locationStatus === 'fallback' && (
            <View style={styles.locationTip}>
              <Feather name="alert-circle" size={14} color="#FDCB6E" />
              <Text style={styles.locationTipText}>
                定位权限未开启，显示的是默认位置。点击右侧按钮可重新定位。
              </Text>
            </View>
          )}

          {/* 距离筛选 */}
          {renderDistanceFilter()}

          {/* 场所列表 */}
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    park: '公园',
    museum: '博物馆',
    farm: '农场',
    playground: '游乐场',
    science_center: '科技馆',
    zoo: '动物园',
    mall: '商场',
    other: '其他',
  };
  return labels[category] || '其他';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerLeft: {
    flex: 1,
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00B894',
    marginRight: 6,
  },
  locationStatusText: {
    fontSize: 13,
    color: '#636E72',
  },
  locationTip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  locationTipText: {
    fontSize: 12,
    color: '#636E72',
    marginLeft: 6,
    flex: 1,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 122, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceFilter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  distanceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  distanceChipActive: {
    backgroundColor: '#FF7A59',
  },
  distanceChipText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '600',
  },
  distanceChipTextActive: {
    color: '#FFFFFF',
  },
  placeGrid: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  placeCard: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#D4CFC7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  placeImage: {
    width: '100%',
    height: '100%',
  },
  placeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  placeCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  placeCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  placeBottomInfo: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 12,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  placeRatingText: {
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  placeDistance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeDistanceText: {
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 13,
    color: '#B2BEC3',
    marginTop: 4,
  },
});
