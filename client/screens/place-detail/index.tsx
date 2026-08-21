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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeSearchParams } from '@/hooks/useSafeRouter';
import { placesApi, reviewsApi, type Place, type Review } from '@/utils/api';
import { Screen } from '@/components/Screen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlaceDetailScreen() {
  const { id } = useSafeSearchParams<{ id: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // 获取场所详情
  const fetchPlace = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const res = await placesApi.getDetail(id);
      if (res.success) {
        setPlace(res.data);
        
        // 获取评价
        const reviewsRes = await reviewsApi.getByPlace(id);
        if (reviewsRes.success) {
          setReviews(reviewsRes.data);
        }
      }
    } catch (err) {
      console.error('获取场所详情失败:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchPlace();
    }, [fetchPlace])
  );

  // 渲染图片轮播
  const renderImageCarousel = () => {
    if (!place?.images || place.images.length === 0) {
      return (
        <View style={styles.imagePlaceholder}>
          <Feather name="image" size={48} color="#B2BEC3" />
        </View>
      );
    }

    return (
      <View style={styles.imageCarousel}>
        <FlatList
          data={place.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveImageIndex(index);
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item.url }} style={styles.carouselImage} />
          )}
          keyExtractor={(item) => item.url}
        />
        {place.images.length > 1 && (
          <View style={styles.imageIndicator}>
            <Text style={styles.imageIndicatorText}>
              {activeImageIndex + 1} / {place.images.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // 渲染基本信息
  const renderBasicInfo = () => {
    if (!place) return null;

    return (
      <View style={styles.basicInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.placeName}>{place.name}</Text>
          {place.is_free && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>免费</Text>
            </View>
          )}
        </View>
        
        <View style={styles.ratingRow}>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Feather
                key={star}
                name="star"
                size={16}
                color={star <= (place.avg_rating || 0) ? '#FFD700' : '#E0E0E0'}
              />
            ))}
          </View>
          <Text style={styles.ratingValue}>{place.avg_rating?.toFixed(1) || '暂无'}</Text>
          <Text style={styles.reviewCount}>({place.review_count || 0}条评价)</Text>
        </View>

        <View style={styles.categoryBadge}>
          <Feather name={getCategoryIcon(place.category)} size={14} color="#FF7A59" />
          <Text style={styles.categoryText}>{getCategoryLabel(place.category)}</Text>
        </View>

        {/* 适合年龄 */}
        <View style={styles.ageRange}>
          <Feather name="users" size={14} color="#636E72" />
          <Text style={styles.ageRangeText}>
            适合 {place.min_age || 0}-{place.max_age || 12}岁
          </Text>
        </View>

        {/* 地址 */}
        <View style={styles.addressRow}>
          <Feather name="map-pin" size={14} color="#636E72" />
          <Text style={styles.addressText}>{place.address}</Text>
        </View>

        {/* 标签 */}
        <View style={styles.tagsRow}>
          {place.has_parking && (
            <View style={styles.tag}>
              <Feather name="truck" size={12} color="#4ECDC4" />
              <Text style={styles.tagText}>有停车场</Text>
            </View>
          )}
          {place.has_baby_care_room && (
            <View style={styles.tag}>
              <Feather name="heart" size={12} color="#FF6584" />
              <Text style={styles.tagText}>母婴室</Text>
            </View>
          )}
          {place.has_restaurant && (
            <View style={styles.tag}>
              <Feather name="coffee" size={12} color="#FDCB6E" />
              <Text style={styles.tagText}>有餐饮</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // 渲染描述
  const renderDescription = () => {
    if (!place?.description) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>场所介绍</Text>
        <Text style={styles.description}>{place.description}</Text>
      </View>
    );
  };

  // 渲染评价
  const renderReviews = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>家长评价</Text>
        <TouchableOpacity>
          <Text style={styles.sectionAction}>写评价</Text>
        </TouchableOpacity>
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptyReviews}>
          <Text style={styles.emptyReviewsText}>暂无评价，快来抢沙发吧！</Text>
        </View>
      ) : (
        <View style={styles.reviewsList}>
          {reviews.slice(0, 3).map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image
                  source={{
                    uri: review.user_profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
                  }}
                  style={styles.reviewAvatar}
                />
                <View style={styles.reviewUserInfo}>
                  <Text style={styles.reviewUserName}>
                    {review.user_profiles?.nickname || '匿名用户'}
                  </Text>
                  <View style={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Feather
                        key={star}
                        name="star"
                        size={12}
                        color={star <= review.rating ? '#FFD700' : '#E0E0E0'}
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewDate}>
                  {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                </Text>
              </View>
              
              <Text style={styles.reviewContent}>{review.content}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <Screen>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF7A59" />
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  if (!place) {
    return (
      <Screen>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>场所不存在</Text>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 图片轮播 */}
          {renderImageCarousel()}

          {/* 基本信息 */}
          {renderBasicInfo()}

          {/* 描述 */}
          {renderDescription()}

          {/* 评价 */}
          {renderReviews()}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function getCategoryIcon(category: string): keyof typeof Feather.glyphMap {
  const icons: Record<string, keyof typeof Feather.glyphMap> = {
    park: 'map-pin',
    museum: 'home',
    farm: 'sun',
    playground: 'smile',
    science_center: 'cpu',
    zoo: 'compass',
    mall: 'shopping-bag',
    other: 'map-pin',
  };
  return icons[category] || 'map-pin';
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
  imageCarousel: {
    height: 280,
    position: 'relative',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 280,
  },
  imagePlaceholder: {
    height: 280,
    backgroundColor: '#F0F0F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageIndicatorText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  basicInfo: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#D4CFC7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
    flex: 1,
  },
  freeBadge: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginLeft: 8,
  },
  reviewCount: {
    fontSize: 13,
    color: '#B2BEC3',
    marginLeft: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 122, 89, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 13,
    color: '#FF7A59',
    fontWeight: '600',
    marginLeft: 4,
  },
  ageRange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  ageRangeText: {
    fontSize: 14,
    color: '#636E72',
    marginLeft: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#636E72',
    marginLeft: 8,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  sectionAction: {
    fontSize: 14,
    color: '#FF7A59',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 22,
  },
  emptyReviews: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyReviewsText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
  },
  reviewUserInfo: {
    flex: 1,
    marginLeft: 10,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  reviewRating: {
    flexDirection: 'row',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#B2BEC3',
  },
  reviewContent: {
    fontSize: 14,
    color: '#2D3436',
    marginTop: 10,
    lineHeight: 20,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  reviewTag: {
    backgroundColor: 'rgba(255, 122, 89, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  reviewTagText: {
    fontSize: 11,
    color: '#FF7A59',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#636E72',
  },
});
