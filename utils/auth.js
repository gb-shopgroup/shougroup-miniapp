export const WX_ACCESS_TOKEN_STORAGE_KEY = 'wx_access_token'
export const MEMBER_BOUND_LEADER_STORAGE_KEY = 'member_bound_leader_id'

export function pickWxAccessToken(userInfo = {}) {
	return userInfo.wxAccessToken || userInfo.accessToken || userInfo.access_token || userInfo.wx_access_token || ''
}

export function pickMemberBoundLeaderId(userInfo = {}) {
	return Number(userInfo.leaderId || userInfo.leader || userInfo.lid || 0)
}

function hasMemberBoundLeaderField(userInfo = {}) {
	return ['leaderId', 'leader', 'lid'].some(key => Object.prototype.hasOwnProperty.call(userInfo, key))
}

export function cacheMemberBoundLeaderId(leaderId) {
	const normalizedLeaderId = Number(leaderId || 0)
	if (!Number.isFinite(normalizedLeaderId) || normalizedLeaderId < 0) return 0
	uni.setStorageSync(MEMBER_BOUND_LEADER_STORAGE_KEY, normalizedLeaderId)
	return normalizedLeaderId
}

export function cacheMemberLoginInfo(userInfo = {}) {
	if (!userInfo) return
	if (Object.prototype.hasOwnProperty.call(userInfo, 'name')) uni.setStorageSync('name', userInfo.name)
	if (userInfo.token) uni.setStorageSync('token', userInfo.token)
	if (Object.prototype.hasOwnProperty.call(userInfo, 'mobile')) uni.setStorageSync('mobile', userInfo.mobile)
	if (Object.prototype.hasOwnProperty.call(userInfo, 'avatar')) uni.setStorageSync('avatar', userInfo.avatar)
	if (hasMemberBoundLeaderField(userInfo)) {
		cacheMemberBoundLeaderId(pickMemberBoundLeaderId(userInfo))
	}
	const wxAccessToken = pickWxAccessToken(userInfo)
	if (wxAccessToken) uni.setStorageSync(WX_ACCESS_TOKEN_STORAGE_KEY, wxAccessToken)
}

// 清除本地会员登录态：token 失效（401）或退出登录时调用。openid 是微信身份非登录态，保留
export function clearMemberLoginInfo() {
	;['token', 'name', 'mobile', 'avatar', WX_ACCESS_TOKEN_STORAGE_KEY, MEMBER_BOUND_LEADER_STORAGE_KEY].forEach(key => {
		try { uni.removeStorageSync(key) } catch (err) {
			console.log('清除登录缓存失败：', key, err)
		}
	})
}

export function getCachedWxAccessToken() {
	return uni.getStorageSync(WX_ACCESS_TOKEN_STORAGE_KEY) || ''
}

// 是否已注册/登录：token 是会员登录态的唯一凭证
export function isMemberLoggedIn() {
	return !!uni.getStorageSync('token')
}

// tabBar 页面：登录后回跳必须用 switchTab（且不能带参数）
const TAB_BAR_PATHS = [
	'/pages/index/index',
	'/pages/order/index',
	'/pages/cart/index',
	'/pages/mine/index'
]

// 当前页面的完整路径（含参数），用于登录后原路返回
export function currentPagePath() {
	const pages = getCurrentPages()
	const page = pages[pages.length - 1]
	if (!page || !page.route) return ''
	const options = page.options || {}
	const params = Object.keys(options)
		.filter(key => options[key] !== undefined && options[key] !== null && options[key] !== '')
		.map(key => `${key}=${encodeURIComponent(options[key])}`)
		.join('&')
	return `/${page.route}${params ? `?${params}` : ''}`
}

function buildLoginPageUrl({ redirect = '', query = {} } = {}) {
	const params = []
	const redirectPath = String(redirect || '').trim()
	if (redirectPath) params.push(`redirect=${encodeURIComponent(redirectPath)}`)
	Object.keys(query || {}).forEach(key => {
		const value = query[key]
		if (value === undefined || value === null || value === '') return
		params.push(`${key}=${encodeURIComponent(value)}`)
	})
	return `/pages/login/index${params.length ? `?${params.join('&')}` : ''}`
}

// 跳转登录注册页：带上来源页，登录成功后回到来源页继续操作
export function goLoginPage(options = {}) {
	const url = buildLoginPageUrl(options)
	uni.navigateTo({
		url,
		fail: () => { uni.redirectTo({ url }) }
	})
}

// 统一登录守卫：未注册/未登录时提示并引导到登录注册页，返回 false 表示操作被拦截。
// 用法：if (!requireMemberLogin()) return
// options: { tip: 提示文案（false/'' 表示不提示）, redirect: 登录后回跳页（默认当前页）, query: 透传给登录页的额外参数（如 id/lid/scene） }
export function requireMemberLogin(options = {}) {
	if (isMemberLoggedIn()) return true
	if (options.tip !== false && options.tip !== '') {
		uni.showToast({ title: options.tip || '请先登录后再操作', icon: 'none' })
	}
	goLoginPage({
		redirect: options.redirect || currentPagePath(),
		query: options.query || {}
	})
	return false
}

// 登录完成后的回跳：tabBar 页走 switchTab，普通页走 redirectTo，均无则回首页
export function backAfterLogin(redirect = '') {
	const path = String(redirect || '').trim()
	if (!path) {
		uni.switchTab({ url: '/pages/index/index' })
		return
	}
	const target = path.startsWith('/') ? path : `/${path}`
	const route = target.split('?')[0]
	if (TAB_BAR_PATHS.includes(route)) {
		uni.switchTab({ url: route })
		return
	}
	uni.redirectTo({
		url: target,
		fail: () => { uni.switchTab({ url: '/pages/index/index' }) }
	})
}
