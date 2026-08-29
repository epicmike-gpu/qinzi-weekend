/**
 * 高德地图 Web服务 API 封装
 * 使用「Web服务」类型 Key（区别于前端 JS API Key）
 * 支持周边搜索 / 关键字搜索，用于获取真实的亲子场所 POI 数据
 */

const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY || '9b9736fba943568a9f87dc99215d1df4';
const AMAP_BASE = 'https://restapi.amap.com/v3';

/** 亲子应用支持的高德 POI 分类编码映射 */
export const AMAP_TYPES: Record<string, string> = {
  all: '110000|140000',      // 风景名胜(公园/动物园/游乐园) + 科教文化(博物馆/科技馆)
  park: '110101',            // 公园
  zoo: '110102',             // 动物园
  theme_park: '110105',      // 游乐园
  museum: '140100',          // 博物馆
  science_center: '140000',  // 科教文化服务(科技馆/展览馆/文化馆)
};

/** 高德 POI type 描述 → 应用内分类 */
function mapCategory(type: string): string {
  const t = type || '';
  if (t.includes('动物园')) return 'zoo';
  if (t.includes('植物园')) return 'park';
  if (t.includes('公园') || t.includes('广场')) return 'park';
  if (t.includes('游乐园') || t.includes('游乐场')) return 'theme_park';
  if (t.includes('博物馆')) return 'museum';
  if (t.includes('科技馆') || t.includes('科学馆') || t.includes('展览馆') || t.includes('文化馆')) return 'science_center';
  if (t.includes('农场') || t.includes('农家乐') || t.includes('采摘')) return 'farm';
  return 'attraction';
}

export interface NearbyPoiParams {
  latitude: number;
  longitude: number;
  radius?: number;      // 米，最大 50000
  category?: string;    // 应用分类（映射为高德 types）
  keywords?: string;    // 关键字
  page?: number;
  pageSize?: number;
}

export interface AmapPoi {
  id: string;
  name: string;
  type: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;     // 距离用户（米）
  images: string[];
  tel: string;
}

/**
 * 周边搜索 POI
 * 文档: https://lbs.amap.com/api/webservice/guide/api/search#around
 */
export async function searchNearbyPOIs(params: NearbyPoiParams): Promise<{ total: number; pois: AmapPoi[] }> {
  const {
    latitude,
    longitude,
    radius = 5000,
    category = 'all',
    keywords,
    page = 1,
    pageSize = 20,
  } = params;

  // 高德要求 经度,纬度 顺序
  const location = `${longitude},${latitude}`;

  const url = new URL(`${AMAP_BASE}/place/around`);
  url.searchParams.set('key', AMAP_WEB_KEY);
  url.searchParams.set('location', location);
  url.searchParams.set('radius', String(Math.min(Math.max(radius, 500), 50000)));
  url.searchParams.set('offset', String(Math.min(Math.max(pageSize, 1), 25)));
  url.searchParams.set('page', String(Math.max(page, 1)));
  url.searchParams.set('sortrule', 'distance');

  const types = AMAP_TYPES[category] || AMAP_TYPES.all;
  if (category === 'farm') {
    // 农场无独立分类编码，用关键字搜索
    url.searchParams.set('keywords', keywords || '农场|农家乐|采摘园');
  } else {
    url.searchParams.set('types', types);
    if (keywords) url.searchParams.set('keywords', keywords);
  }

  const res = await fetch(url.toString());
  const data: any = await res.json();

  if (data.status !== '1') {
    throw new Error(`高德API错误: ${data.info || '未知错误'} (infocode: ${data.infocode || '-'})`);
  }

  const pois: AmapPoi[] = (data.pois || []).map((poi: any) => {
    const [lng, lat] = String(poi.location || '0,0').split(',');
    return {
      id: poi.id,
      name: poi.name,
      type: poi.type || '',
      category: mapCategory(poi.type),
      address: String(poi.address || '').replace(/\[\]/g, ''),
      latitude: Number(lat),
      longitude: Number(lng),
      distance: Number(poi.distance || 0),
      images: (poi.photos || []).map((p: any) => p.url).filter(Boolean),
      tel: poi.tel || '',
    };
  });

  return { total: Number(data.count || 0), pois };
}
