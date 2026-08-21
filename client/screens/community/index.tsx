import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { checkinsApi, type Checkin } from '@/utils/api';
import { Screen } from '@/components/Screen';

// 心情图标映射
const MOOD_ICONS: Record<string, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  happy: { icon: 'smile', color: '#FDCB6E' },
  excited: { icon: 'star', color: '#FF6584' },
  relaxed: { icon: 'moon', color: '#6C63FF' },
};

// 天气图标映射
const WEATHER_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  sunny: 'sun',
  cloudy: 'cloud',
  rainy: 'cloud-rain',
};

export default function CommunityScreen() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 获取打卡列表
  const fetchCheckins = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      
      const res = await checkinsApi.getList({ page: pageNum, limit: 10 });
      if (res.success) {
        if (append) {
          setCheckins(prev => [...prev, ...res.data]);
        } else {
          setCheckins(res.data);
        }
        setHasMore(res.data.length === 10);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('获取打卡列表失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 下拉刷新
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCheckins(1, false);
  }, [fetchCheckins]);

  // 加载更多
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchCheckins(page + 1, true);
    }
  }, [loading, hasMore, page, fetchCheckins]);

  // 页面聚焦时刷新
  useFocusEffect(
    useCallback(() => {
      fetchCheckins(1, false);
    }, [fetchCheckins])
  );

  // 点赞
  const handleLike = useCallback(async (checkinId: string) => {
    try {
      const res = await checkinsApi.like(checkinId);
      if (res.success) {
        setCheckins(prev =>
          prev.map(c =>
            c.id === checkinId ? { ...c, like_count: (c.like_count || 0) + 1 } : c
          )
        );
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  }, []);

  // 渲染打卡卡片
  const renderCheckinCard = (checkin: Checkin) => {
    const moodInfo = checkin.mood ? MOOD_ICONS[checkin.mood] : null;
    const weatherIcon = checkin.weather ? WEATHER_ICONS[checkin.weather] : null;

    return (
      <View key={checkin.id} style={styles.checkinCard}>
        {/* 用户信息 */}
        <View style={styles.userRow}>
          <Image
            source={{
              uri: checkin.user_profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {checkin.user_profiles?.nickname || '匿名用户'}
            </Text>
            <View style={styles.placeRow}>
              <Feather name="map-pin" size={12} color="#B2BEC3" />
              <Text style={styles.placeName}>
                {checkin.places?.name || '未知场所'}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            {weatherIcon && (
              <Feather name={weatherIcon} size={16} color="#636E72" />
            )}
            {moodInfo && (
              <Feather name={moodInfo.icon as keyof typeof Feather.glyphMap} size={16} color={moodInfo.color} />
            )}
          </View>
        </View>

        {/* 内容 */}
        {checkin.content && (
          <Text style={styles.content}>{checkin.content}</Text>
        )}

        {/* 图片 */}
        {checkin.images && checkin.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesContainer}
          >
            {checkin.images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={styles.checkinImage}
              />
            ))}
          </ScrollView>
        )}

        {/* 操作栏 */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(checkin.id)}
          >
            <Feather name="heart" size={18} color="#FF6584" />
            <Text style={styles.actionText}>{checkin.like_count || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="message-circle" size={18} color="#636E72" />
            <Text style={styles.actionText}>{checkin.comment_count || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="share-2" size={18} color="#636E72" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 渲染内容
  const renderContent = () => {
    if (loading && checkins.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A59" />
        </View>
      );
    }

    if (checkins.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="camera" size={48} color="#B2BEC3" />
          <Text style={styles.emptyText}>还没有打卡记录</Text>
          <Text style={styles.emptySubText}>快去遛娃并分享吧！</Text>
        </View>
      );
    }

    return (
      <View style={styles.checkinList}>
        {checkins.map(renderCheckinCard)}
        {hasMore && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
            <Text style={styles.loadMoreText}>加载更多</Text>
          </TouchableOpacity>
        )}
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
            <Text style={styles.headerTitle}>遛娃社区</Text>
            <Text style={styles.headerSubtitle}>看看其他家长都带娃去了哪里</Text>
          </View>

          {/* 内容 */}
          {renderContent()}
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
  checkinList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  checkinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#D4CFC7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F3',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3436',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  placeName: {
    fontSize: 12,
    color: '#B2BEC3',
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    fontSize: 14,
    color: '#2D3436',
    marginTop: 12,
    lineHeight: 20,
  },
  imagesContainer: {
    marginTop: 12,
  },
  checkinImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#F0F0F3',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 13,
    color: '#636E72',
    marginLeft: 4,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
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
  loadMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#FF7A59',
    fontWeight: '600',
  },
});
