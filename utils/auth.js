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

export function getCachedWxAccessToken() {
	return uni.getStorageSync(WX_ACCESS_TOKEN_STORAGE_KEY) || ''
}
