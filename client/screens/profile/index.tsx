import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi, checkinsApi, type UserProfile } from '@/utils/api';
import { Screen } from '@/components/Screen';

interface UserStats {
  reviewCount: number;
  checkinCount: number;
  itineraryCount: number;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    reviewCount: 0,
    checkinCount: 0,
    itineraryCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // 获取用户信息
  const fetchUser = useCallback(async () => {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', deviceId);
      }

      const res = await usersApi.getOrCreateByDevice(deviceId);
      if (res.success) {
        setUser(res.data);
        
        // 获取统计
        const statsRes = await usersApi.getStats(res.data.id);
        if (statsRes.success) {
          setStats(statsRes.data);
        }
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // 更新昵称
  const handleUpdateNickname = useCallback(() => {
    Alert.prompt?.(
      '修改昵称',
      '请输入新昵称',
      async (nickname) => {
        if (!user || !nickname) return;
        
        try {
          const res = await usersApi.update(user.id, { nickname });
          if (res.success) {
            setUser(res.data);
            Alert.alert('成功', '昵称已更新');
          }
        } catch (err) {
          Alert.alert('错误', '更新失败');
        }
      }
    );
  }, [user]);

  // 渲染统计卡片
  const renderStats = () => (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.checkinCount}</Text>
        <Text style={styles.statLabel}>打卡</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.reviewCount}</Text>
        <Text style={styles.statLabel}>评价</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.itineraryCount}</Text>
        <Text style={styles.statLabel}>行程</Text>
      </View>
    </View>
  );

  // 渲染孩子信息
  const renderChildrenInfo = () => {
    const children = user?.children_info || [];
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>我的孩子</Text>
          <TouchableOpacity>
            <Text style={styles.sectionAction}>
              {children.length > 0 ? '编辑' : '添加'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {children.length === 0 ? (
          <TouchableOpacity style={styles.addChildCard}>
            <Feather name="plus" size={24} color="#FF7A59" />
            <Text style={styles.addChildText}>添加孩子信息</Text>
            <Text style={styles.addChildDesc}>获取更精准的推荐</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.childrenList}>
            {children.map((child, index) => (
              <View key={index} style={styles.childCard}>
                <View style={styles.childAvatar}>
                  <Feather
                    name={child.gender === 'male' ? 'user' : 'user'}
                    size={20}
                    color={child.gender === 'male' ? '#0984E3' : '#FF6584'}
                  />
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childAge}>{child.age}岁</Text>
                  {child.interests && child.interests.length > 0 && (
                    <Text style={styles.childInterests}>
                      喜欢: {child.interests.join('、')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // 渲染菜单项
  const renderMenuItem = (
    icon: keyof typeof Feather.glyphMap,
    title: string,
    subtitle?: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIcon}>
        <Feather name={icon} size={20} color="#FF7A59" />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={18} color="#B2BEC3" />
    </TouchableOpacity>
  );

  // 渲染菜单
  const renderMenu = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>设置</Text>
      <View style={styles.menuCard}>
        {renderMenuItem('map-pin', '位置偏好', '设置默认位置', () => {})}
        {renderMenuItem('bell', '消息通知', '管理通知设置', () => {})}
        {renderMenuItem('help-circle', '帮助与反馈', '', () => {})}
        {renderMenuItem('info', '关于我们', '版本 1.0.0', () => {})}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>我的</Text>
          </View>

          {/* 用户信息卡片 */}
          <View style={styles.profileCard}>
            <Image
              source={{
                uri: user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
              }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <TouchableOpacity onPress={handleUpdateNickname}>
                <Text style={styles.nickname}>
                  {user?.nickname || '点击设置昵称'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.userId}>ID: {user?.device_id?.slice(0, 8)}...</Text>
            </View>
          </View>

          {/* 统计 */}
          {renderStats()}

          {/* 孩子信息 */}
          {renderChildrenInfo()}

          {/* 菜单 */}
          {renderMenu()}
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#D4CFC7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F0F3',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  nickname: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
  },
  userId: {
    fontSize: 13,
    color: '#B2BEC3',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    justifyContent: 'space-around',
    shadowColor: '#D4CFC7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF7A59',
  },
  statLabel: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F3',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
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
  addChildCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#FF7A59',
  },
  addChildText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF7A59',
    marginTop: 8,
  },
  addChildDesc: {
    fontSize: 12,
    color: '#B2BEC3',
    marginTop: 4,
  },
  childrenList: {
    gap: 10,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 122, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInfo: {
    marginLeft: 12,
    flex: 1,
  },
  childAge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  childInterests: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 122, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#B2BEC3',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#636E72',
  },
});
