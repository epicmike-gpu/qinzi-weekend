import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// 获取打卡列表（公开的）
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, place_id, user_id } = req.query;

    let query = client
      .from('checkins')
      .select('*, user_profiles(nickname, avatar_url), places(name, category, images)')
      .eq('is_public', true);

    if (place_id) {
      query = query.eq('place_id', place_id as string);
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
    console.error('获取打卡列表失败:', err);
    res.status(500).json({ success: false, message: '获取打卡列表失败' });
  }
});

// 获取场所的打卡列表
router.get('/place/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const { data, error, count } = await client
      .from('checkins')
      .select('*, user_profiles(nickname, avatar_url)')
      .eq('place_id', placeId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

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
    console.error('获取场所打卡失败:', err);
    res.status(500).json({ success: false, message: '获取场所打卡失败' });
  }
});

// 创建打卡
router.post('/', async (req, res) => {
  try {
    const {
      place_id,
      user_id,
      content,
      images,
      weather,
      mood,
      is_public = true
    } = req.body;

    // 验证必填字段
    if (!place_id || !user_id) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }

    const { data, error } = await client
      .from('checkins')
      .insert({
        place_id,
        user_id,
        content,
        images,
        weather,
        mood,
        is_public
      })
      .select()
      .single();

    if (error) throw error;

    // 更新场所的打卡计数
    await updatePlaceCheckinCount(place_id, 1);

    res.json({ success: true, data });
  } catch (err) {
    console.error('创建打卡失败:', err);
    res.status(500).json({ success: false, message: '创建打卡失败' });
  }
});

// 更新打卡
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, images, weather, mood, is_public } = req.body;

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (images !== undefined) updateData.images = images;
    if (weather !== undefined) updateData.weather = weather;
    if (mood !== undefined) updateData.mood = mood;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data, error } = await client
      .from('checkins')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('更新打卡失败:', err);
    res.status(500).json({ success: false, message: '更新打卡失败' });
  }
});

// 删除打卡
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 先获取打卡信息
    const { data: checkin } = await client
      .from('checkins')
      .select('place_id')
      .eq('id', id)
      .single();

    const { error } = await client
      .from('checkins')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // 更新场所的打卡计数
    if (checkin?.place_id) {
      await updatePlaceCheckinCount(checkin.place_id, -1);
    }

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除打卡失败:', err);
    res.status(500).json({ success: false, message: '删除打卡失败' });
  }
});

// 点赞打卡
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: checkin, error: getError } = await client
      .from('checkins')
      .select('like_count')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    const newCount = (checkin?.like_count || 0) + 1;

    const { data, error } = await client
      .from('checkins')
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

// 获取用户的打卡统计
router.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await client
      .from('checkins')
      .select('place_id, created_at')
      .eq('user_id', userId)
      .eq('is_public', true);

    if (error) throw error;

    const checkins = data || [];
    const totalCheckins = checkins.length;
    const uniquePlaces = new Set(checkins.map(c => c.place_id)).size;

    // 获取去过的场所名称
    const placeIds = [...new Set(checkins.map(c => c.place_id))];
    let places: Array<{ id: string; name: string; images: unknown }> = [];

    if (placeIds.length > 0) {
      const { data: placesData } = await client
        .from('places')
        .select('id, name, images')
        .in('id', placeIds.slice(0, 10)); // 最多取10个

      places = placesData || [];
    }

    res.json({
      success: true,
      data: {
        totalCheckins,
        uniquePlaces,
        recentPlaces: places
      }
    });
  } catch (err) {
    console.error('获取用户打卡统计失败:', err);
    res.status(500).json({ success: false, message: '获取打卡统计失败' });
  }
});

// 更新场所的打卡计数
async function updatePlaceCheckinCount(placeId: string, delta: number) {
  try {
    const { data: place } = await client
      .from('places')
      .select('checkin_count')
      .eq('id', placeId)
      .single();

    const newCount = Math.max(0, (place?.checkin_count || 0) + delta);

    await client
      .from('places')
      .update({ checkin_count: newCount })
      .eq('id', placeId);
  } catch (err) {
    console.error('更新场所打卡计数失败:', err);
  }
}

export default router;
