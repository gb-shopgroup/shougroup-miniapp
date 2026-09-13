// payCache.js
const EXPIRE_DURATION = 30 * 60 * 1000; // 半个小时过期
const STORAGE_KEY = 'unpaid_pay_cache_map';

// 清理所有过期缓存
export function clearExpiredPayCache() {
  
	try {
		const cacheStr = uni.getStorageSync(STORAGE_KEY);
		let cacheMap = cacheStr ? JSON.parse(cacheStr) : {};
		const now = Date.now();
		let hasChange = false;
		
		// 过滤掉过期数据
		Object.keys(cacheMap).forEach(orderId => {
			const item = cacheMap[orderId];
			if (now > item.expireTime) {
				delete cacheMap[orderId];
				hasChange = true;
			}
		});

		// 有删除才重新写入存储
		if (hasChange) {
			uni.setStorageSync(STORAGE_KEY, JSON.stringify(cacheMap));
		}
	} catch (e) {
		console.error('清理过期支付缓存异常', e);
	}
}

/**
 * 保存订单支付参数到本地缓存
 * @param {string} orderId 订单唯一ID
 * @param {Object} payParams 微信JSAPI支付参数
 */
export function savePayCache(orderId, payParams) {

	// 存之前先清过期数据
	clearExpiredPayCache(); 
	
	const cacheStr = uni.getStorageSync(STORAGE_KEY);
	const cacheMap = cacheStr ? JSON.parse(cacheStr) : {};
	const now = Date.now();
	
	cacheMap[orderId] = {
		payParams,
		createTime: now,
		expireTime: now + EXPIRE_DURATION
	};
	
	uni.setStorageSync(STORAGE_KEY, JSON.stringify(cacheMap));
}

/**
 * 获取订单缓存的支付参数，不存在/过期返回null
 * @param {string} orderId
 * @returns {Object|null} payParams
 */
export function getPayCache(orderId) {
	
	// 存之前先清过期数据
	clearExpiredPayCache();
	
	const cacheStr = uni.getStorageSync(STORAGE_KEY);
	const cacheMap = cacheStr ? JSON.parse(cacheStr) : {};
	const item = cacheMap[orderId];
	if (!item) return null;

	// 二次校验时间
	if (Date.now() > item.expireTime) {
		removePayCache(orderId);
		return null;
	}
	
	return item.payParams;
}

/**
 * 主动删除指定订单缓存（支付成功/取消订单调用）
 * @param {string} orderId
 */
export function removePayCache(orderId) {

	const cacheStr = uni.getStorageSync(STORAGE_KEY);
	const cacheMap = cacheStr ? JSON.parse(cacheStr) : {};
	delete cacheMap[orderId];
	uni.setStorageSync(STORAGE_KEY, JSON.stringify(cacheMap));
}

// 清空全部未支付缓存
export function clearAllPayCache() {
	uni.removeStorageSync(STORAGE_KEY);
}
