import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// 获取场所的评价列表
router.get('/place/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { page = 1, limit = 20, sort = 'newest' } = req.query;

    let query = client
      .from('reviews')
      .select('*, user_profiles(nickname, avatar_url)')
      .eq('place_id', placeId)
      .eq('is_approved', true);

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'rating_high') {
      query = query.order('rating', { ascending: false });
    } else if (sort === 'rating_low') {
      query = query.order('rating', { ascending: true });
    }

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
    console.error('获取评价列表失败:', err);
    res.status(500).json({ success: false, message: '获取评价列表失败' });
  }
});

// 获取用户的评价列表
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const { data, error, count } = await client
      .from('reviews')
      .select('*, places(name, category, images)')
      .eq('user_id', userId)
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
    console.error('获取用户评价失败:', err);
    res.status(500).json({ success: false, message: '获取用户评价失败' });
  }
});

// 创建评价
router.post('/', async (req, res) => {
  try {
    const {
      place_id,
      user_id,
      rating,
      content,
      suitable_age_min,
      suitable_age_max,
      facility_ratings,
      images,
      recommend_tags
    } = req.body;

    // 验证必填字段
    if (!place_id || !user_id || !rating || !content) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }

    // 验证评分范围
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: '评分必须在1-5之间' });
    }

    // 插入评价
    const { data, error } = await client
      .from('reviews')
      .insert({
        place_id,
        user_id,
        rating,
        content,
        suitable_age_min,
        suitable_age_max,
        facility_ratings,
        images,
        recommend_tags
      })
      .select()
      .single();

    if (error) throw error;

    // 更新场所的评分统计
    await updatePlaceRating(place_id);

    res.json({ success: true, data });
  } catch (err) {
    console.error('创建评价失败:', err);
    res.status(500).json({ success: false, message: '创建评价失败' });
  }
});

// 更新评价
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, content, suitable_age_min, suitable_age_max, facility_ratings, images, recommend_tags } = req.body;

    const { data, error } = await client
      .from('reviews')
      .update({
        rating,
        content,
        suitable_age_min,
        suitable_age_max,
        facility_ratings,
        images,
        recommend_tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 更新场所的评分统计
    if (data?.place_id) {
      await updatePlaceRating(data.place_id);
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('更新评价失败:', err);
    res.status(500).json({ success: false, message: '更新评价失败' });
  }
});

// 删除评价
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 先获取评价信息用于更新场所统计
    const { data: review } = await client
      .from('reviews')
      .select('place_id')
      .eq('id', id)
      .single();

    const { error } = await client
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // 更新场所的评分统计
    if (review?.place_id) {
      await updatePlaceRating(review.place_id);
    }

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除评价失败:', err);
    res.status(500).json({ success: false, message: '删除评价失败' });
  }
});

// 获取评价统计（某场所的评分分布）
router.get('/stats/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    const { data, error } = await client
      .from('reviews')
      .select('rating')
      .eq('place_id', placeId)
      .eq('is_approved', true);

    if (error) throw error;

    const reviews = data || [];
    const total = reviews.length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    reviews.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++;
      sum += r.rating;
    });

    const avgRating = total > 0 ? sum / total : 0;

    res.json({
      success: true,
      data: {
        total,
        avgRating: Math.round(avgRating * 10) / 10,
        distribution
      }
    });
  } catch (err) {
    console.error('获取评价统计失败:', err);
    res.status(500).json({ success: false, message: '获取评价统计失败' });
  }
});

// 更新场所的评分统计
async function updatePlaceRating(placeId: string) {
  try {
    const { data, error } = await client
      .from('reviews')
      .select('rating')
      .eq('place_id', placeId)
      .eq('is_approved', true);

    if (error) throw error;

    const reviews = data || [];
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = total > 0 ? sum / total : 0;

    await client
      .from('places')
      .update({
        avg_rating: Math.round(avgRating * 10) / 10,
        review_count: total
      })
      .eq('id', placeId);
  } catch (err) {
    console.error('更新场所评分失败:', err);
  }
}

export default router;
