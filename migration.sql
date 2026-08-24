-- 亲子周末应用数据库迁移脚本
-- 目标：Supabase 海外实例（US West 或 Singapore）

-- ============================================
-- 1. 创建表结构
-- ============================================

-- 用户档案表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  child_name TEXT,
  child_age INTEGER,
  child_interests TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 场所表
CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[],
  description TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  min_age INTEGER DEFAULT 0,
  max_age INTEGER DEFAULT 12,
  images JSONB DEFAULT '[]'::jsonb,
  opening_hours TEXT,
  is_free BOOLEAN DEFAULT false,
  price_range TEXT,
  has_parking BOOLEAN DEFAULT false,
  has_baby_care_room BOOLEAN DEFAULT false,
  has_restaurant BOOLEAN DEFAULT false,
  avg_rating DOUBLE PRECISION DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  checkin_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 评价表
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  child_age_at_visit INTEGER,
  visit_date DATE,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 行程表
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('half_day', 'full_day')),
  child_age INTEGER,
  places JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost DOUBLE PRECISION DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 打卡表
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  content TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 健康检查表（用于测试）
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  status TEXT DEFAULT 'ok',
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_places_is_active ON places(is_active);
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_place_id ON checkins(place_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_device_id ON user_profiles(device_id);

-- ============================================
-- 3. 插入示例数据
-- ============================================

INSERT INTO places (id, name, category, description, address, latitude, longitude, min_age, max_age, images, is_free, has_parking, has_baby_care_room, has_restaurant, avg_rating, review_count) VALUES
('8f7d67f4-f38e-447f-8a0e-1dbc6ec03964', '朝阳公园', 'park', '北京市四环内最大的城市公园，有广阔的草坪、儿童游乐设施和游船码头。适合全家出游，春天可以赏花，夏天可以划船。', '北京市朝阳区朝阳公园南路1号', 39.934, 116.473, 0, 12, '[{"url": "https://images.unsplash.com/photo-1597953601374-1ff2d5640c85?w=800"}, {"url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"}]', false, true, true, true, 4.6, 128),
('644aabe7-bc26-410f-99ea-9e4f823c8357', '中国科学技术馆', 'science_center', '国家级综合性科技馆，有四大常设展厅和多个儿童科学乐园。互动展品丰富，是培养孩子科学兴趣的好去处。', '北京市朝阳区北辰东路5号', 39.992, 116.396, 3, 12, '[{"url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800"}, {"url": "https://images.unsplash.com/photo-1569091791584-83c6f8a1d4f5?w=800"}]', false, true, true, true, 4.8, 256),
('de9f2e45-de46-40bc-9314-2b475745294a', '北京动物园', 'zoo', '中国历史最悠久的动物园之一，拥有大熊猫、金丝猴等珍稀动物。园内还有儿童动物园区域，可以近距离接触小动物。', '北京市西城区西直门外大街137号', 39.939, 116.338, 0, 12, '[{"url": "https://images.unsplash.com/photo-1535941324861-b29e8464ecb8?w=800"}, {"url": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800"}]', false, true, true, true, 4.5, 342),
('7e673bea-85e9-4563-9b0b-a0b29fa098d8', '奥林匹克森林公园', 'park', '北京最大的城市公园，南北两园通过生态廊道连接。有专门的儿童游乐区、湿地景观和跑步道。免费开放，是周末遛娃的首选。', '北京市朝阳区科荟路33号', 40.018, 116.386, 0, 12, '[{"url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"}, {"url": "https://images.unsplash.com/photo-1588714477688-cf28a50e94f2?w=800"}]', true, true, true, false, 4.7, 189),
('de39cc3b-e61c-48fd-b609-85a27adf7a87', '北京自然博物馆', 'museum', '展示自然历史和生物多样性的大型博物馆。有恐龙化石、动物标本和互动展区，是孩子们了解自然科学的好地方。', '北京市东城区天桥南大街126号', 39.886, 116.397, 3, 12, '[{"url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800"}, {"url": "https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=800"}]', true, false, true, false, 4.4, 167),
('c6e0c800-9b33-44f8-b9e5-69c3fbd59b18', '蓝调庄园', 'farm', '集农业观光、采摘体验、亲子活动于一体的生态庄园。有草莓采摘、小动物喂养、亲子DIY等活动。', '北京市朝阳区金盏乡楼梓庄蓝调庄园', 39.972, 116.558, 0, 12, '[{"url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"}, {"url": "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800"}]', false, true, true, true, 4.3, 98);

-- 插入健康检查记录
INSERT INTO health_check (status) VALUES ('ok');

-- ============================================
-- 4. 完成提示
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '迁移完成！已创建 6 个表和 6 个示例场所数据。';
END $$;
