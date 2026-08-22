import { Platform } from 'react-native';

// 高德地图 Web端(JS API) 配置
const AMAP_KEY = 'a0022ea99e67cf9ecc12a4227bf3d510';
const AMAP_SECURITY_CODE = 'c876edbd51cb20283e3b908d0e263fd7';

let aMapLoadPromise: Promise<any> | null = null;

/**
 * 加载高德地图 JS API 2.0（仅 Web 平台）
 * 加载前必须先配置安全密钥 jscode
 */
function loadAMap(): Promise<any> {
  if (Platform.OS !== 'web') {
    return Promise.reject(new Error('AMap JS API 仅支持 Web 平台'));
  }
  if (aMapLoadPromise) return aMapLoadPromise;

  aMapLoadPromise = new Promise((resolve, reject) => {
    const w = window as any;
    if (w.AMap) {
      resolve(w.AMap);
      return;
    }
    // 必须在加载脚本前配置安全密钥
    w._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_CODE,
    };
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Geolocation`;
    script.onload = () => {
      if (w.AMap) {
        resolve(w.AMap);
      } else {
        reject(new Error('高德地图加载失败'));
      }
    };
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.head.appendChild(script);
  });
  return aMapLoadPromise;
}

export interface AMapPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

/**
 * 使用高德地图高精度定位（GPS + WiFi + 基站混合定位）
 * 仅 Web 平台，失败时抛出错误由调用方兜底
 */
export async function getCurrentPositionWithAMap(): Promise<AMapPosition> {
  const AMap = await loadAMap();
  return new Promise((resolve, reject) => {
    try {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true, // 高精度模式
        timeout: 10000, // 超时 10 秒
        zoomToAccuracy: true, // 定位成功后缩放至精度范围
        GeoLocationFirst: true, // 优先使用浏览器定位
      });
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          resolve({
            latitude: result.position.lat,
            longitude: result.position.lng,
            accuracy: result.accuracy,
            address: result.formattedAddress,
          });
        } else {
          // 带上高德返回的 info 码与 message，便于排查（如 INVALID_USER_DOMAIN=白名单问题）
          const info = result?.info || '';
          const msg = result?.message || '高德定位失败';
          console.error('[AMap] 定位失败 status=', status, 'info=', info, 'message=', msg);
          reject(new Error(`${msg}(${info})`));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 判断高德地图是否可用（仅 Web）
 */
export function isAMapSupported(): boolean {
  return Platform.OS === 'web';
}
