import { pgTable, serial, timestamp, varchar, text, integer, real, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"

// 保留系统表（禁止删除）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户档案表（基于设备ID）
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    device_id: varchar("device_id", { length: 100 }).notNull().unique(),
    nickname: varchar("nickname", { length: 50 }),
    avatar_url: text("avatar_url"),
    // 孩子信息（JSON数组，支持多个孩子）
    children_info: jsonb("children_info"), // [{age: 3, gender: 'male', interests: ['park','museum']}]
    // 偏好设置
    preferred_location: jsonb("preferred_location"), // {latitude, longitude, city}
    preferred_distance: integer("preferred_distance").default(10), // 默认10km
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_profiles_device_id_idx").on(table.device_id),
  ]
);

// 亲子场所表
export const places = pgTable(
  "places",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 200 }).notNull(),
    // 场所类型：park-公园, museum-博物馆, farm-农场, playground-游乐场, science_center-科技馆, zoo-动物园, mall-商场, other-其他
    category: varchar("category", { length: 50 }).notNull(),
    // 标签（JSON数组）
    tags: jsonb("tags"), // ["室内", "户外", "适合0-3岁", "有母婴室", "免费停车"]
    description: text("description"),
    address: text("address").notNull(),
    // 地理位置
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    // 适合年龄范围
    min_age: integer("min_age").default(0),
    max_age: integer("max_age").default(12),
    // 图片（JSON数组）
    images: jsonb("images"), // [{url, is_cover}]
    // 营业信息
    opening_hours: text("opening_hours"), // "09:00-18:00"
    is_free: boolean("is_free").default(false),
    price_range: varchar("price_range", { length: 50 }), // "免费" 或 "50-100元"
    // 设施信息
    has_parking: boolean("has_parking").default(false),
    has_baby_care_room: boolean("has_baby_care_room").default(false),
    has_restaurant: boolean("has_restaurant").default(false),
    // 统计信息
    avg_rating: real("avg_rating").default(0),
    review_count: integer("review_count").default(0),
    checkin_count: integer("checkin_count").default(0),
    // 状态
    is_active: boolean("is_active").default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("places_category_idx").on(table.category),
    index("places_location_idx").on(table.latitude, table.longitude),
    index("places_is_active_idx").on(table.is_active),
    index("places_avg_rating_idx").on(table.avg_rating),
  ]
);

// 家长评价表
export const reviews = pgTable(
  "reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    place_id: varchar("place_id", { length: 36 }).notNull().references(() => places.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
    // 评分 1-5
    rating: integer("rating").notNull(),
    content: text("content").notNull(),
    // 适合年龄反馈
    suitable_age_min: integer("suitable_age_min"),
    suitable_age_max: integer("suitable_age_max"),
    // 设施评价（JSON）
    facility_ratings: jsonb("facility_ratings"), // {parking: 5, baby_care: 4, cleanliness: 5}
    // 图片（JSON数组）
    images: jsonb("images"), // [url1, url2]
    // 推荐标签
    recommend_tags: jsonb("recommend_tags"), // ["停车方便", "母婴室干净", "适合小宝宝"]
    is_approved: boolean("is_approved").default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("reviews_place_id_idx").on(table.place_id),
    index("reviews_user_id_idx").on(table.user_id),
    index("reviews_rating_idx").on(table.rating),
    index("reviews_created_at_idx").on(table.created_at),
  ]
);

// 行程规划表
export const itineraries = pgTable(
  "itineraries",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    // 行程类型：half_day-半日游, full_day-一日游
    duration_type: varchar("duration_type", { length: 20 }).notNull(),
    // 包含的场所ID列表（JSON数组，有序）
    place_ids: jsonb("place_ids").notNull(), // [place_id_1, place_id_2, place_id_3]
    // 适合年龄
    suitable_age_min: integer("suitable_age_min"),
    suitable_age_max: integer("suitable_age_max"),
    // 封面图
    cover_image: text("cover_image"),
    // 预计花费
    estimated_cost: varchar("estimated_cost", { length: 50 }),
    // 统计
    like_count: integer("like_count").default(0),
    share_count: integer("share_count").default(0),
    is_public: boolean("is_public").default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("itineraries_user_id_idx").on(table.user_id),
    index("itineraries_duration_type_idx").on(table.duration_type),
    index("itineraries_is_public_idx").on(table.is_public),
    index("itineraries_created_at_idx").on(table.created_at),
  ]
);

// 打卡记录表
export const checkins = pgTable(
  "checkins",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    place_id: varchar("place_id", { length: 36 }).notNull().references(() => places.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
    content: text("content"),
    // 图片（JSON数组）
    images: jsonb("images"), // [url1, url2, url3]
    // 天气
    weather: varchar("weather", { length: 20 }), // sunny, cloudy, rainy
    // 心情
    mood: varchar("mood", { length: 20 }), // happy, excited, relaxed
    // 互动统计
    like_count: integer("like_count").default(0),
    comment_count: integer("comment_count").default(0),
    is_public: boolean("is_public").default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("checkins_place_id_idx").on(table.place_id),
    index("checkins_user_id_idx").on(table.user_id),
    index("checkins_is_public_idx").on(table.is_public),
    index("checkins_created_at_idx").on(table.created_at),
  ]
);

// Schema factory for validation
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// Export insert schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).pick({
  device_id: true,
  nickname: true,
  avatar_url: true,
  children_info: true,
  preferred_location: true,
  preferred_distance: true,
});

export const insertPlaceSchema = createInsertSchema(places).pick({
  name: true,
  category: true,
  tags: true,
  description: true,
  address: true,
  latitude: true,
  longitude: true,
  min_age: true,
  max_age: true,
  images: true,
  opening_hours: true,
  is_free: true,
  price_range: true,
  has_parking: true,
  has_baby_care_room: true,
  has_restaurant: true,
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  place_id: true,
  user_id: true,
  rating: true,
  content: true,
  suitable_age_min: true,
  suitable_age_max: true,
  facility_ratings: true,
  images: true,
  recommend_tags: true,
});

export const insertItinerarySchema = createInsertSchema(itineraries).pick({
  user_id: true,
  title: true,
  description: true,
  duration_type: true,
  place_ids: true,
  suitable_age_min: true,
  suitable_age_max: true,
  cover_image: true,
  estimated_cost: true,
  is_public: true,
});

export const insertCheckinSchema = createInsertSchema(checkins).pick({
  place_id: true,
  user_id: true,
  content: true,
  images: true,
  weather: true,
  mood: true,
  is_public: true,
});

// Export types
export type UserProfile = typeof userProfiles.$inferSelect;
export type Place = typeof places.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Itinerary = typeof itineraries.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
