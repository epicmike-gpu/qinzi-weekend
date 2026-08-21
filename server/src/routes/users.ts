import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// 获取或创建用户档案（通过设备ID）
router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    // 先查找是否存在
    let { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) throw error;

    // 如果不存在，创建新用户
    if (!data) {
      const result = await client
        .from('user_profiles')
        .insert({ device_id: deviceId })
        .select()
        .single();

      if (result.error) throw result.error;
      data = result.data;
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('获取用户档案失败:', err);
    res.status(500).json({ success: false, message: '获取用户档案失败' });
  }
});

// 更新用户档案
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nickname,
      avatar_url,
      children_info,
      preferred_location,
      preferred_distance
    } = req.body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (children_info !== undefined) updateData.children_info = children_info;
    if (preferred_location !== undefined) updateData.preferred_location = preferred_location;
    if (preferred_distance !== undefined) updateData.preferred_distance = preferred_distance;

    const { data, error } = await client
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('更新用户档案失败:', err);
    res.status(500).json({ success: false, message: '更新用户档案失败' });
  }
});

// 更新孩子信息
router.put('/:id/children', async (req, res) => {
  try {
    const { id } = req.params;
    const { children_info } = req.body;

    if (!Array.isArray(children_info)) {
      return res.status(400).json({ success: false, message: 'children_info必须是数组' });
    }

    const { data, error } = await client
      .from('user_profiles')
      .update({
        children_info,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('更新孩子信息失败:', err);
    res.status(500).json({ success: false, message: '更新孩子信息失败' });
  }
});

// 更新位置偏好
router.put('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, city, preferred_distance } = req.body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (latitude !== undefined && longitude !== undefined) {
      updateData.preferred_location = { latitude, longitude, city };
    }
    if (preferred_distance !== undefined) {
      updateData.preferred_distance = preferred_distance;
    }

    const { data, error } = await client
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('更新位置偏好失败:', err);
    res.status(500).json({ success: false, message: '更新位置偏好失败' });
  }
});

// 获取用户统计信息
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取评价数量
    const { data: reviews, error: reviewsError } = await client
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id);

    if (reviewsError) throw reviewsError;

    // 获取打卡数量
    const { data: checkins, error: checkinsError } = await client
      .from('checkins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id);

    if (checkinsError) throw checkinsError;

    // 获取行程数量
    const { data: itineraries, error: itinerariesError } = await client
      .from('itineraries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id);

    if (itinerariesError) throw itinerariesError;

    res.json({
      success: true,
      data: {
        reviewCount: reviews?.length || 0,
        checkinCount: checkins?.length || 0,
        itineraryCount: itineraries?.length || 0
      }
    });
  } catch (err) {
    console.error('获取用户统计失败:', err);
    res.status(500).json({ success: false, message: '获取用户统计失败' });
  }
});

export default router;
