// API 基础配置
// Vercel 同域部署时该变量为空，使用相对路径 /api/v1/...；Coze 沙箱下由系统注入
const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';

// 通用请求函数
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// 场所相关API
export const placesApi = {
  /**
   * 服务端文件：server/src/routes/places.ts
   * 接口：GET /api/v1/places
   * Query 参数：category?: string, min_age?: number, max_age?: number, 
   *            latitude?: number, longitude?: number, distance?: number,
   *            is_free?: boolean, has_parking?: boolean, has_baby_care_room?: boolean,
   *            page?: number, limit?: number, sort?: 'rating' | 'distance' | 'newest'
   */
  getList: (params?: Record<string, string | number | boolean | undefined>) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request<{ success: boolean; data: Place[]; pagination: Pagination }>(`/places${query}`);
  },

  /**
   * 服务端文件：server/src/routes/places.ts
   * 接口：GET /api/v1/places/:id
   * Path 参数：id: string
   */
  getDetail: (id: string) => {
    return request<{ success: boolean; data: Place }>(`/places/${id}`);
  },

  /**
   * 服务端文件：server/src/routes/places.ts
   * 接口：GET /api/v1/places/recommend/smart
   * Query 参数：age?: number, interests?: string, latitude?: number, longitude?: number, 
   *            distance?: number, limit?: number
   */
  getSmartRecommend: (params?: Record<string, string | number | undefined>) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request<{ success: boolean; data: Place[] }>(`/places/recommend/smart${query}`);
  },

  /**
   * 服务端文件：server/src/routes/places.ts
   * 接口：GET /api/v1/places/nearby
   * Query 参数：latitude: number, longitude: number, distance?: number, limit?: number
   */
  getNearby: (latitude: number, longitude: number, distance?: number, limit?: number) => {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      ...(distance && { distance: String(distance) }),
      ...(limit && { limit: String(limit) }),
    });
    return request<{ success: boolean; data: (Place & { distance: number })[] }>(`/places/nearby?${params}`);
  },

  /**
   * 服务端文件：server/src/routes/places.ts
   * 接口：GET /api/v1/places/stats/categories
   */
  getCategoryStats: () => {
    return request<{ success: boolean; data: Record<string, number> }>('/places/stats/categories');
  },
};

// 评价相关API
export const reviewsApi = {
  /**
   * 服务端文件：server/src/routes/reviews.ts
   * 接口：GET /api/v1/reviews/place/:placeId
   * Path 参数：placeId: string
   * Query 参数：page?: number, limit?: number, sort?: 'newest' | 'rating_high' | 'rating_low'
   */
  getByPlace: (placeId: string, page?: number, sort?: string) => {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (sort) params.append('sort', sort);
    const query = params.toString() ? `?${params}` : '';
    return request<{ success: boolean; data: Review[]; pagination: Pagination }>(`/reviews/place/${placeId}${query}`);
  },

  /**
   * 服务端文件：server/src/routes/reviews.ts
   * 接口：POST /api/v1/reviews
   * Body 参数：place_id: string, user_id: string, rating: number, content: string,
   *           suitable_age_min?: number, suitable_age_max?: number, 
   *           facility_ratings?: object, images?: string[], recommend_tags?: string[]
   */
  create: (data: {
    place_id: string;
    user_id: string;
    rating: number;
    content: string;
    suitable_age_min?: number;
    suitable_age_max?: number;
    facility_ratings?: Record<string, number>;
    images?: string[];
    recommend_tags?: string[];
  }) => {
    return request<{ success: boolean; data: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 服务端文件：server/src/routes/reviews.ts
   * 接口：GET /api/v1/reviews/stats/:placeId
   * Path 参数：placeId: string
   */
  getStats: (placeId: string) => {
    return request<{ 
      success: boolean; 
      data: { total: number; avgRating: number; distribution: Record<number, number> } 
    }>(`/reviews/stats/${placeId}`);
  },
};

// 行程相关API
export const itinerariesApi = {
  /**
   * 服务端文件：server/src/routes/itineraries.ts
   * 接口：GET /api/v1/itineraries
   * Query 参数：page?: number, limit?: number, duration_type?: string, user_id?: string
   */
  getList: (params?: Record<string, string | number | undefined>) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request<{ success: boolean; data: Itinerary[]; pagination: Pagination }>(`/itineraries${query}`);
  },

  /**
   * 服务端文件：server/src/routes/itineraries.ts
   * 接口：GET /api/v1/itineraries/:id
   * Path 参数：id: string
   */
  getDetail: (id: string) => {
    return request<{ success: boolean; data: Itinerary & { places: Place[] } }>(`/itineraries/${id}`);
  },

  /**
   * 服务端文件：server/src/routes/itineraries.ts
   * 接口：POST /api/v1/itineraries
   * Body 参数：user_id: string, title: string, description?: string, duration_type: string,
   *           place_ids: string[], suitable_age_min?: number, suitable_age_max?: number,
   *           cover_image?: string, estimated_cost?: string, is_public?: boolean
   */
  create: (data: {
    user_id: string;
    title: string;
    description?: string;
    duration_type: string;
    place_ids: string[];
    suitable_age_min?: number;
    suitable_age_max?: number;
    cover_image?: string;
    estimated_cost?: string;
    is_public?: boolean;
  }) => {
    return request<{ success: boolean; data: Itinerary }>('/itineraries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 服务端文件：server/src/routes/itineraries.ts
   * 接口：POST /api/v1/itineraries/generate
   * Body 参数：age?: number, interests?: string, latitude?: number, longitude?: number,
   *           duration_type?: string, distance?: number
   */
  generate: (data: {
    age?: number;
    interests?: string;
    latitude?: number;
    longitude?: number;
    duration_type?: string;
    distance?: number;
  }) => {
    return request<{ 
      success: boolean; 
      data: { 
        title: string; 
        description: string; 
        duration_type: string; 
        place_ids: string[]; 
        places: Place[];
        suitable_age_min: number;
        suitable_age_max: number;
        estimated_cost: string;
      } 
    }>('/itineraries/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 服务端文件：server/src/routes/itineraries.ts
   * 接口：POST /api/v1/itineraries/:id/like
   * Path 参数：id: string
   */
  like: (id: string) => {
    return request<{ success: boolean; data: Itinerary }>(`/itineraries/${id}/like`, {
      method: 'POST',
    });
  },
};

// 打卡相关API
export const checkinsApi = {
  /**
   * 服务端文件：server/src/routes/checkins.ts
   * 接口：GET /api/v1/checkins
   * Query 参数：page?: number, limit?: number, place_id?: string, user_id?: string
   */
  getList: (params?: Record<string, string | number | undefined>) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request<{ success: boolean; data: Checkin[]; pagination: Pagination }>(`/checkins${query}`);
  },

  /**
   * 服务端文件：server/src/routes/checkins.ts
   * 接口：POST /api/v1/checkins
   * Body 参数：place_id: string, user_id: string, content?: string, images?: string[],
   *           weather?: string, mood?: string, is_public?: boolean
   */
  create: (data: {
    place_id: string;
    user_id: string;
    content?: string;
    images?: string[];
    weather?: string;
    mood?: string;
    is_public?: boolean;
  }) => {
    return request<{ success: boolean; data: Checkin }>('/checkins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 服务端文件：server/src/routes/checkins.ts
   * 接口：POST /api/v1/checkins/:id/like
   * Path 参数：id: string
   */
  like: (id: string) => {
    return request<{ success: boolean; data: Checkin }>(`/checkins/${id}/like`, {
      method: 'POST',
    });
  },

  /**
   * 服务端文件：server/src/routes/checkins.ts
   * 接口：GET /api/v1/checkins/user/:userId/stats
   * Path 参数：userId: string
   */
  getUserStats: (userId: string) => {
    return request<{ 
      success: boolean; 
      data: { totalCheckins: number; uniquePlaces: number; recentPlaces: Place[] } 
    }>(`/checkins/user/${userId}/stats`);
  },
};

// 用户相关API
export const usersApi = {
  /**
   * 服务端文件：server/src/routes/users.ts
   * 接口：GET /api/v1/users/device/:deviceId
   * Path 参数：deviceId: string
   */
  getOrCreateByDevice: (deviceId: string) => {
    return request<{ success: boolean; data: UserProfile }>(`/users/device/${deviceId}`);
  },

  /**
   * 服务端文件：server/src/routes/users.ts
   * 接口：PUT /api/v1/users/:id
   * Path 参数：id: string
   * Body 参数：nickname?: string, avatar_url?: string, children_info?: array,
   *           preferred_location?: object, preferred_distance?: number
   */
  update: (id: string, data: {
    nickname?: string;
    avatar_url?: string;
    children_info?: Array<{ age: number; gender?: string; interests?: string[] }>;
    preferred_location?: { latitude: number; longitude: number; city?: string };
    preferred_distance?: number;
  }) => {
    return request<{ success: boolean; data: UserProfile }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 服务端文件：server/src/routes/users.ts
   * 接口：PUT /api/v1/users/:id/children
   * Path 参数：id: string
   * Body 参数：children_info: array
   */
  updateChildren: (id: string, children_info: Array<{ age: number; gender?: string; interests?: string[] }>) => {
    return request<{ success: boolean; data: UserProfile }>(`/users/${id}/children`, {
      method: 'PUT',
      body: JSON.stringify({ children_info }),
    });
  },

  /**
   * 服务端文件：server/src/routes/users.ts
   * 接口：PUT /api/v1/users/:id/location
   * Path 参数：id: string
   * Body 参数：latitude?: number, longitude?: number, city?: string, preferred_distance?: number
   */
  updateLocation: (id: string, data: {
    latitude?: number;
    longitude?: number;
    city?: string;
    preferred_distance?: number;
  }) => {
    return request<{ success: boolean; data: UserProfile }>(`/users/${id}/location`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 服务端文件：server/src/routes/users.ts
   * 接口：GET /api/v1/users/:id/stats
   * Path 参数：id: string
   */
  getStats: (id: string) => {
    return request<{ 
      success: boolean; 
      data: { reviewCount: number; checkinCount: number; itineraryCount: number } 
    }>(`/users/${id}/stats`);
  },
};

// 类型定义
export interface Place {
  id: string;
  name: string;
  category: string;
  tags?: string[];
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  min_age?: number;
  max_age?: number;
  images?: Array<{ url: string; is_cover?: boolean }>;
  opening_hours?: string;
  is_free?: boolean;
  price_range?: string;
  has_parking?: boolean;
  has_baby_care_room?: boolean;
  has_restaurant?: boolean;
  avg_rating?: number;
  review_count?: number;
  checkin_count?: number;
  is_active?: boolean;
  created_at?: string;
  distance?: number;
}

export interface Review {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  content: string;
  suitable_age_min?: number;
  suitable_age_max?: number;
  facility_ratings?: Record<string, number>;
  images?: string[];
  recommend_tags?: string[];
  is_approved?: boolean;
  created_at?: string;
  user_profiles?: { nickname?: string; avatar_url?: string };
  places?: { name: string; category: string; images?: Array<{ url: string }> };
}

export interface Itinerary {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  duration_type: string;
  place_ids: string[];
  suitable_age_min?: number;
  suitable_age_max?: number;
  cover_image?: string;
  estimated_cost?: string;
  like_count?: number;
  share_count?: number;
  is_public?: boolean;
  created_at?: string;
  user_profiles?: { nickname?: string; avatar_url?: string };
}

export interface Checkin {
  id: string;
  place_id: string;
  user_id: string;
  content?: string;
  images?: string[];
  weather?: string;
  mood?: string;
  like_count?: number;
  comment_count?: number;
  is_public?: boolean;
  created_at?: string;
  user_profiles?: { nickname?: string; avatar_url?: string };
  places?: { name: string; category: string; images?: Array<{ url: string }> };
}

export interface UserProfile {
  id: string;
  device_id: string;
  nickname?: string;
  avatar_url?: string;
  children_info?: Array<{ age: number; gender?: string; interests?: string[] }>;
  preferred_location?: { latitude: number; longitude: number; city?: string };
  preferred_distance?: number;
  created_at?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
