import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// 获取场所列表（支持筛选、分页、位置排序）
router.get('/', async (req, res) => {
  try {
    const {
      category,
      min_age,
      max_age,
      latitude,
      longitude,
      distance = 10,
      is_free,
      has_parking,
      has_baby_care_room,
      page = 1,
      limit = 20,
      sort = 'rating' // rating | distance | newest
    } = req.query;

    let query = client
      .from('places')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // 分类筛选
    if (category) {
      query = query.eq('category', category as string);
    }

    // 年龄筛选
    if (min_age) {
      query = query.lte('min_age', Number(min_age));
    }
    if (max_age) {
      query = query.gte('max_age', Number(max_age));
    }

    // 设施筛选
    if (is_free === 'true') {
      query = query.eq('is_free', true);
    }
    if (has_parking === 'true') {
      query = query.eq('has_parking', true);
    }
    if (has_baby_care_room === 'true') {
      query = query.eq('has_baby_care_room', true);
    }

    // 排序
    if (sort === 'rating') {
      query = query.order('avg_rating', { ascending: false });
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    }

    // 分页
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // 如果有位置信息，计算距离并排序
    let places = data || [];
    if (latitude && longitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      places = places.map(place => {
        const dist = calculateDistance(lat, lng, place.latitude, place.longitude);
        return { ...place, distance: dist };
      });
      if (sort === 'distance') {
        places.sort((a, b) => a.distance - b.distance);
      }
      // 距离过滤
      places = places.filter(p => p.distance <= Number(distance));
    }

    res.json({
      success: true,
      data: places,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (err) {
    console.error('获取场所列表失败:', err);
    res.status(500).json({ success: false, message: '获取场所列表失败' });
  }
});

// 智能推荐（根据年龄、位置、兴趣）
router.get('/recommend/smart', async (req, res) => {
  try {
    const {
      age,
      interests,
      latitude,
      longitude,
      distance = 10,
      limit = 10
    } = req.query;

    let query = client
      .from('places')
      .select('*')
      .eq('is_active', true);

    // 年龄匹配
    if (age) {
      const ageNum = Number(age);
      query = query.lte('min_age', ageNum).gte('max_age', ageNum);
    }

    // 获取高分场所
    query = query.order('avg_rating', { ascending: false }).limit(Number(limit) * 2);

    const { data, error } = await query;
    if (error) throw error;

    let places = data || [];

    // 如果有位置信息，计算距离
    if (latitude && longitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      places = places.map(place => {
        const dist = calculateDistance(lat, lng, place.latitude, place.longitude);
        return { ...place, distance: dist };
      });
      // 距离过滤
      places = places.filter(p => p.distance <= Number(distance));
      // 按距离和评分综合排序
      places.sort((a, b) => {
        const scoreA = a.avg_rating * 0.6 + (1 - a.distance / Number(distance)) * 4 * 0.4;
        const scoreB = b.avg_rating * 0.6 + (1 - b.distance / Number(distance)) * 4 * 0.4;
        return scoreB - scoreA;
      });
    }

    // 兴趣标签匹配加分
    if (interests) {
      const interestList = (interests as string).split(',');
      places = places.map(place => {
        const tags = (place.tags as string[]) || [];
        const matchCount = tags.filter(tag => interestList.some(i => tag.includes(i))).length;
        return { ...place, matchScore: matchCount };
      });
      places.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    res.json({
      success: true,
      data: places.slice(0, Number(limit))
    });
  } catch (err) {
    console.error('智能推荐失败:', err);
    res.status(500).json({ success: false, message: '获取推荐失败' });
  }
});

// 获取附近场所
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, distance = 5, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: '请提供位置信息' });
    }

    const { data, error } = await client
      .from('places')
      .select('*')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })
      .limit(100); // 先取100条再过滤

    if (error) throw error;

    const lat = Number(latitude);
    const lng = Number(longitude);
    const maxDist = Number(distance);

    const places = (data || [])
      .map(place => {
        const dist = calculateDistance(lat, lng, place.latitude, place.longitude);
        return { ...place, distance: dist };
      })
      .filter(p => p.distance <= maxDist)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, Number(limit));

    res.json({ success: true, data: places });
  } catch (err) {
    console.error('获取附近场所失败:', err);
    res.status(500).json({ success: false, message: '获取附近场所失败' });
  }
});

// 获取场所详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await client
      .from('places')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: '场所不存在' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('获取场所详情失败:', err);
    res.status(500).json({ success: false, message: '获取场所详情失败' });
  }
});

// 创建场所（管理员）
router.post('/', async (req, res) => {
  try {
    const {
      name,
      category,
      tags,
      description,
      address,
      latitude,
      longitude,
      min_age,
      max_age,
      images,
      opening_hours,
      is_free,
      price_range,
      has_parking,
      has_baby_care_room,
      has_restaurant
    } = req.body;

    const { data, error } = await client
      .from('places')
      .insert({
        name,
        category,
        tags,
        description,
        address,
        latitude,
        longitude,
        min_age: min_age || 0,
        max_age: max_age || 12,
        images,
        opening_hours,
        is_free: is_free || false,
        price_range,
        has_parking: has_parking || false,
        has_baby_care_room: has_baby_care_room || false,
        has_restaurant: has_restaurant || false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('创建场所失败:', err);
    res.status(500).json({ success: false, message: '创建场所失败' });
  }
});

// 更新场所
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await client
      .from('places')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('更新场所失败:', err);
    res.status(500).json({ success: false, message: '更新场所失败' });
  }
});

// 删除场所（软删除）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await client
      .from('places')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除场所失败:', err);
    res.status(500).json({ success: false, message: '删除场所失败' });
  }
});

// 获取场所分类统计
router.get('/stats/categories', async (req, res) => {
  try {
    const { data, error } = await client
      .from('places')
      .select('category')
      .eq('is_active', true);

    if (error) throw error;

    const stats: Record<string, number> = {};
    (data || []).forEach(place => {
      stats[place.category] = (stats[place.category] || 0) + 1;
    });

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('获取分类统计失败:', err);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 计算两点间距离（Haversine公式）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球半径（公里）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default router;
