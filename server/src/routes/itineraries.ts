import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// 获取行程列表（公开的）
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, duration_type, user_id } = req.query;

    let query = client
      .from('itineraries')
      .select('*, user_profiles(nickname, avatar_url)')
      .eq('is_public', true);

    if (duration_type) {
      query = query.eq('duration_type', duration_type as string);
    }

    if (user_id) {
      query = query.eq('user_id', user_id as string);
    }

    query = query.order('created_at', { ascending: false });

    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (err) {
    console.error('获取行程列表失败:', err);
    res.status(500).json({ success: false, message: '获取行程列表失败' });
  }
});

// 获取行程详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await client
      .from('itineraries')
      .select('*, user_profiles(nickname, avatar_url)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: '行程不存在' });
    }

    // 获取行程包含的场所详情
    const placeIds = data.place_ids as string[];
    if (placeIds && placeIds.length > 0) {
      const { data: places, error: placesError } = await client
        .from('places')
        .select('id, name, category, images, address, latitude, longitude, avg_rating, opening_hours')
        .in('id', placeIds);

      if (placesError) throw placesError;

      // 按place_ids的顺序排序
      const orderedPlaces = placeIds.map(pid => places?.find(p => p.id === pid)).filter(Boolean);

      res.json({
        success: true,
        data: {
          ...data,
          places: orderedPlaces
        }
      });
    } else {
      res.json({ success: true, data: { ...data, places: [] } });
    }
  } catch (err) {
    console.error('获取行程详情失败:', err);
    res.status(500).json({ success: false, message: '获取行程详情失败' });
  }
});

// 创建行程
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      duration_type,
      place_ids,
      suitable_age_min,
      suitable_age_max,
      cover_image,
      estimated_cost,
      is_public = true
    } = req.body;

    // 验证必填字段
    if (!user_id || !title || !duration_type || !place_ids) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }

    // 验证duration_type
    if (!['half_day', 'full_day'].includes(duration_type)) {
      return res.status(400).json({ success: false, message: '行程类型无效' });
    }

    // 验证place_ids是数组
    if (!Array.isArray(place_ids) || place_ids.length === 0) {
      return res.status(400).json({ success: false, message: '请至少选择一个场所' });
    }

    const { data, error } = await client
      .from('itineraries')
      .insert({
        user_id,
        title,
        description,
        duration_type,
        place_ids,
        suitable_age_min,
        suitable_age_max,
        cover_image,
        estimated_cost,
        is_public
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('创建行程失败:', err);
    res.status(500).json({ success: false, message: '创建行程失败' });
  }
});

// 更新行程
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      duration_type,
      place_ids,
      suitable_age_min,
      suitable_age_max,
      cover_image,
      estimated_cost,
      is_public
    } = req.body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (duration_type !== undefined) updateData.duration_type = duration_type;
    if (place_ids !== undefined) updateData.place_ids = place_ids;
    if (suitable_age_min !== undefined) updateData.suitable_age_min = suitable_age_min;
    if (suitable_age_max !== undefined) updateData.suitable_age_max = suitable_age_max;
    if (cover_image !== undefined) updateData.cover_image = cover_image;
    if (estimated_cost !== undefined) updateData.estimated_cost = estimated_cost;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data, error } = await client
      .from('itineraries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('更新行程失败:', err);
    res.status(500).json({ success: false, message: '更新行程失败' });
  }
});

// 删除行程
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await client
      .from('itineraries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除行程失败:', err);
    res.status(500).json({ success: false, message: '删除行程失败' });
  }
});

// 点赞行程
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取当前点赞数
    const { data: itinerary, error: getError } = await client
      .from('itineraries')
      .select('like_count')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    const newCount = (itinerary?.like_count || 0) + 1;

    const { data, error } = await client
      .from('itineraries')
      .update({ like_count: newCount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('点赞失败:', err);
    res.status(500).json({ success: false, message: '点赞失败' });
  }
});

// 智能生成行程推荐
router.post('/generate', async (req, res) => {
  try {
    const {
      age,
      interests,
      latitude,
      longitude,
      duration_type = 'half_day',
      distance = 10
    } = req.body;

    // 根据条件获取适合的场所
    let query = client
      .from('places')
      .select('*')
      .eq('is_active', true);

    if (age) {
      query = query.lte('min_age', age).gte('max_age', age);
    }

    query = query.order('avg_rating', { ascending: false }).limit(20);

    const { data, error } = await query;
    if (error) throw error;

    let places = data || [];

    // 计算距离并过滤
    if (latitude && longitude) {
      places = places.map(place => {
        const dist = calculateDistance(latitude, longitude, place.latitude, place.longitude);
        return { ...place, distance: dist };
      });
      places = places.filter(p => p.distance <= distance);
      places.sort((a, b) => a.distance - b.distance);
    }

    // 根据行程类型选择场所数量
    const placeCount = duration_type === 'full_day' ? 3 : 2;
    const selectedPlaces = places.slice(0, placeCount);

    // 生成行程标题和描述
    const categories = selectedPlaces.map(p => p.category);
    const title = generateTitle(categories, duration_type);
    const description = generateDescription(selectedPlaces, duration_type);

    res.json({
      success: true,
      data: {
        title,
        description,
        duration_type,
        place_ids: selectedPlaces.map(p => p.id),
        places: selectedPlaces,
        suitable_age_min: age ? Math.max(0, age - 1) : 0,
        suitable_age_max: age ? Math.min(12, age + 1) : 12,
        estimated_cost: calculateEstimatedCost(selectedPlaces)
      }
    });
  } catch (err) {
    console.error('生成行程失败:', err);
    res.status(500).json({ success: false, message: '生成行程失败' });
  }
});

// 辅助函数
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

function generateTitle(categories: string[], durationType: string): string {
  const categoryNames: Record<string, string> = {
    park: '公园',
    museum: '博物馆',
    farm: '农场',
    playground: '游乐场',
    science_center: '科技馆',
    zoo: '动物园',
    mall: '商场',
    other: '景点'
  };

  const names = categories.map(c => categoryNames[c] || '景点');
  const uniqueNames = [...new Set(names)];

  if (durationType === 'full_day') {
    return `充实一日游：${uniqueNames.join('→')}`;
  }
  return `轻松半日游：${uniqueNames.join('→')}`;
}

function generateDescription(places: Array<{ name: string; distance?: number }>, durationType: string): string {
  const parts = places.map((p, i) => {
    const distText = p.distance ? `（约${p.distance.toFixed(1)}km）` : '';
    return `第${i + 1}站：${p.name}${distText}`;
  });

  const durationText = durationType === 'full_day' ? '一整天' : '半天';
  return `推荐${durationText}行程，${parts.join('，')}。适合带孩子轻松游玩！`;
}

function calculateEstimatedCost(places: Array<{ is_free: boolean; price_range: string | null }>): string {
  const hasPaid = places.some(p => !p.is_free);
  if (!hasPaid) return '免费';

  const paidPlaces = places.filter(p => !p.is_free && p.price_range);
  if (paidPlaces.length === 0) return '约50-100元';

  return '约100-200元';
}

export default router;
