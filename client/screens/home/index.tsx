import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { placesApi, type Place } from '@/utils/api';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 分类配置
const CATEGORIES = [
  { key: 'all', label: '全部', icon: 'grid' },
  { key: 'park', label: '公园', icon: 'tree' },
  { key: 'museum', label: '博物馆', icon: 'home' },
  { key: 'farm', label: '农场', icon: 'sun' },
  { key: 'playground', label: '游乐场', icon: 'smile' },
  { key: 'science_center', label: '科技馆', icon: 'cpu' },
  { key: 'zoo', label: '动物园', icon: 'compass' },
];

// 年龄选项
const AGE_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: '0-3', label: '0-3岁' },
  { key: '3-6', label: '3-6岁' },
  { key: '6-12', label: '6-12岁' },
];

export default function HomeScreen() {
  const router = useSafeRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [recommended, setRecommended] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAge, setSelectedAge] = useState('all');

  // 获取推荐数据
  const fetchRecommended = useCallback(async () => {
    try {
      const res = await placesApi.getSmartRecommend({ limit: 5 });
      if (res.success) {
        setRecommended(res.data);
      }
    } catch (err) {
      console.error('获取推荐失败:', err);
    }
  }, []);

  // 获取场所列表
  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | undefined> = {
        limit: 20,
        sort: 'rating',
      };

      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      if (selectedAge !== 'all') {
        const [min, max] = selectedAge.split('-');
        params.min_age = Number(min);
        params.max_age = Number(max);
      }

      const res = await placesApi.getList(params);
      if (res.success) {
        setPlaces(res.data);
      }
    } catch (err) {
      console.error('获取场所列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedAge]);

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRecommended(), fetchPlaces()]);
    setRefreshing(false);
  }, [fetchRecommended, fetchPlaces]);

  // 页面聚焦时刷新
  useFocusEffect(
    useCallback(() => {
      fetchRecommended();
      fetchPlaces();
    }, [fetchRecommended, fetchPlaces])
  );

  // 初始加载
  useEffect(() => {
    fetchRecommended();
    fetchPlaces();
  }, [fetchRecommended, fetchPlaces]);

  // 渲染推荐轮播
  const renderRecommended = () => {
    if (recommended.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>为你推荐</Text>
          <TouchableOpacity>
            <Text style={styles.sectionMore}>查看更多</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedContainer}
        >
          {recommended.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.recommendedCard}
              onPress={() => router.push(`/place-detail?id=${place.id}`)}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri: place.images?.[0]?.url || 'https://images.unsplash.com/photo-1597953601374-1ff2d5640c85?w=400',
                }}
                style={styles.recommendedImage}
              />
              <View style={styles.recommendedOverlay}>
                <Text style={styles.recommendedTitle} numberOfLines={1}>
                  {place.name}
                </Text>
                <View style={styles.recommendedInfo}>
                  <Feather name="star" size={12} color="#FFD700" />
                  <Text style={styles.recommendedRating}>
                    {place.avg_rating?.toFixed(1) || '5.0'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // 渲染分类筛选
  const renderCategories = () => (
    <View style={styles.section}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryItem,
              selectedCategory === cat.key && styles.categoryItemActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Feather
              name={cat.icon as keyof typeof Feather.glyphMap}
              size={20}
              color={selectedCategory === cat.key ? '#FF7A59' : '#636E72'}
            />
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat.key && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // 渲染年龄筛选
  const renderAgeFilter = () => (
    <View style={styles.ageFilterContainer}>
      {AGE_OPTIONS.map((age) => (
        <TouchableOpacity
          key={age.key}
          style={[
            styles.ageChip,
            selectedAge === age.key && styles.ageChipActive,
          ]}
          onPress={() => setSelectedAge(age.key)}
        >
          <Text
            style={[
              styles.ageChipText,
              selectedAge === age.key && styles.ageChipTextActive,
            ]}
          >
            {age.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 渲染场所卡片
  const renderPlaceCard = (place: Place) => (
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
      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={1}>
          {place.name}
        </Text>
        <View style={styles.placeMeta}>
          <View style={styles.placeRating}>
            <Feather name="star" size={14} color="#FFD700" />
            <Text style={styles.placeRatingText}>
              {place.avg_rating?.toFixed(1) || '暂无'}
            </Text>
          </View>
          <Text style={styles.placeReviewCount}>
            {place.review_count || 0}条评价
          </Text>
        </View>
        <View style={styles.placeTags}>
          {place.is_free && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>免费</Text>
            </View>
          )}
          {place.has_parking && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>有停车场</Text>
            </View>
          )}
          {place.has_baby_care_room && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>母婴室</Text>
            </View>
          )}
        </View>
        <View style={styles.placeAddress}>
          <Feather name="map-pin" size={12} color="#B2BEC3" />
          <Text style={styles.placeAddressText} numberOfLines={1}>
            {place.address}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // 渲染场所列表
  const renderPlaceList = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A59" />
        </View>
      );
    }

    if (places.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={48} color="#B2BEC3" />
          <Text style={styles.emptyText}>暂无相关场所</Text>
        </View>
      );
    }

    return (
      <View style={styles.placeList}>
        {places.map(renderPlaceCard)}
      </View>
    );
  };

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>亲子去哪儿</Text>
              <Text style={styles.headerSubtitle}>发现身边的遛娃好去处</Text>
            </View>
            <TouchableOpacity style={styles.searchButton}>
              <Feather name="search" size={20} color="#FF7A59" />
            </TouchableOpacity>
          </View>

          {/* 推荐轮播 */}
          {renderRecommended()}

          {/* 分类筛选 */}
          {renderCategories()}

          {/* 年龄筛选 */}
          {renderAgeFilter()}

          {/* 场所列表 */}
          {renderPlaceList()}
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
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 122, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  sectionMore: {
    fontSize: 14,
    color: '#FF7A59',
    fontWeight: '600',
  },
  recommendedContainer: {
    paddingRight: 20,
  },
  recommendedCard: {
    width: SCREEN_WIDTH * 0.7,
    height: 180,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
  },
  recommendedImage: {
    width: '100%',
    height: '100%',
  },
  recommendedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recommendedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  recommendedRating: {
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  categoryContainer: {
    paddingRight: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  categoryItemActive: {
    backgroundColor: 'rgba(255, 122, 89, 0.1)',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: '#FF7A59',
  },
  ageFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  ageChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  ageChipActive: {
    backgroundColor: '#FF7A59',
  },
  ageChipText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '600',
  },
  ageChipTextActive: {
    color: '#FFFFFF',
  },
  placeList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  placeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#D4CFC7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  placeImage: {
    width: 120,
    height: 120,
  },
  placeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  placeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeRatingText: {
    fontSize: 13,
    color: '#2D3436',
    marginLeft: 4,
    fontWeight: '600',
  },
  placeReviewCount: {
    fontSize: 12,
    color: '#B2BEC3',
    marginLeft: 8,
  },
  placeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tag: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  placeAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  placeAddressText: {
    fontSize: 12,
    color: '#B2BEC3',
    marginLeft: 4,
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#B2BEC3',
    marginTop: 12,
  },
});
