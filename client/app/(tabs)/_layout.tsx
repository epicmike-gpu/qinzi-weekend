import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [background, muted, accent, border] = useCSSVariable([
    '--color-background',
    '--color-muted',
    '--color-accent',
    '--color-border',
  ]) as string[];

  const tabBarStyle: Record<string, string | number> = {
    backgroundColor: background,
    borderTopWidth: 1,
    borderTopColor: border,
    paddingBottom: insets.bottom > 0 ? 8 : 4,
    paddingTop: 8,
    height: Platform.OS === 'web' ? 'auto' : 60 + (insets.bottom || 0),
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#FF7A59',
        tabBarInactiveTintColor: muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: '发现',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="compass" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          title: '行程',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="map" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '社区',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="users" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
