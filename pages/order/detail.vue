<template>
<view class="container detail-page" :class="{ 'has-bottom-bar': hasOrder && detailActions.length > 0 }" :style="miniNavPageStyle()">
	<!-- 导航区 -->
	<view class="detail-nav" :style="miniNavBarStyle()">
		<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
		<text class="title" :style="miniNavTitleStyle()">团购订单</text>
	</view>

	<view class="page" v-if="loading">
		<view class="empty-panel">
			<text class="empty-title">订单加载中</text>
		</view>
	</view>

	<view class="page" v-else-if="hasOrder">
		<!-- 状态区 -->
		<view class="status-panel" :class="detailStatusTone">
			<view class="status-icon">{{ detailStatusIcon }}</view>
			<view class="status-copy">
				<text class="status-title">{{ detailStatusTitle }}</text>
				<view class="status-sub" v-if="Number(displayOrder.status) === 0 && !isPayExpired">
					<text>请在 </text>
					<text class="pay-time-left">{{ payDeadlineText || '00:00:00' }}</text>
					<text> 内完成支付</text>
				</view>
				<text class="status-sub" v-else-if="statusSubText">{{ statusSubText }}</text>
			</view>
		</view>

		<!-- 自提区 -->
		<view class="section station-section" v-if="displayOrder.pointName || displayOrder.pointAddress">
			<view class="section-head station-head">
				<text>顾客自提</text>
				<view v-if="canMakeQr" class="qr-entry" @click="showOrderQr">
					<text>生成核销码</text>
					<text class="row-arrow">›</text>
				</view>
			</view>
			<view class="station-body">
				<view class="station-icon"></view>
				<view class="station-content">
					<view class="station-title">服务驿站</view>
					<view class="station-contact">
						<text>{{ displayOrder.pointPerson || displayOrder.pointName || '服务驿站' }}</text>
						<text v-if="displayOrder.pointPhone" class="phone-text">{{ displayOrder.pointPhone }}</text>
						<text v-if="displayOrder.pointPhone" class="phone-action" @click="callPhone(displayOrder.pointPhone)">联系</text>
					</view>
					<view class="station-address" v-if="displayOrder.pointAddress">
						<text>{{ displayOrder.pointAddress }}</text>
						<text class="copy-btn" @click="copyText(displayOrder.pointAddress)">复制</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 商品区 -->
		<view class="section goods-section">
			<view class="shop-row" @click="goGroupDetail">
				<image class="shop-avatar" src="/static/image/head.png" mode="aspectFill"></image>
				<text class="shop-name">{{ displayOrder.shopName || '团长店铺' }}</text>
				<text class="group-name">{{ displayOrder.groupName || '团购活动' }}</text>
				<text class="row-arrow">›</text>
			</view>
			<view v-if="displayOrder.goods.length == 0" class="goods-empty">暂无商品信息</view>
			<view class="goods-row" v-for="goods in displayOrder.goods" :key="goods.id || goods.goodsId">
				<image v-if="goods.img" class="goods-image" :src="goods.img" mode="aspectFill"></image>
				<view v-else class="goods-image goods-placeholder">
					<text>{{ goods.name.slice(0, 1) || '商' }}</text>
				</view>
				<view class="goods-info">
					<text class="goods-name">{{ goods.name || '商品' }}</text>
					<text v-if="goods.specText" class="goods-spec">{{ goods.specText }}</text>
					<text v-else class="goods-spec">共{{ goods.num }}件</text>
					<view v-if="goods.statusList && goods.statusList.length" class="goods-status-list">
						<text v-for="status in goods.statusList" :key="status.key" class="goods-status" :class="status.tone">{{ status.text }}</text>
					</view>
				</view>
				<view class="goods-side">
					<text class="goods-price">￥{{ formatAmount(goods.price) }}</text>
					<text class="goods-num">x{{ goods.num }}</text>
				</view>
			</view>
			<view class="goods-total-row">
				<text>{{ displayOrder.orderTime || '--' }}</text>
				<view>
					<text>共{{ orderGoodsCount }}件</text>
					<text class="actual-price"> 实收￥{{ formatAmount(displayOrder.orderPrice) }}</text>
				</view>
			</view>
		</view>

		<!-- 订单信息区 -->
		<view class="section info-section">
			<view class="section-head">订单信息</view>
			<view class="info-row"><text>跟团号：</text><text>{{ displayOrder.groupId || '--' }}</text></view>
			<view class="info-row" v-if="displayOrder.trueName || displayOrder.nickname">
				<text>下单人：</text>
				<text>{{ displayOrder.trueName || displayOrder.nickname }}</text>
			</view>
			<view class="info-row" v-if="displayOrder.remark">
				<text>备注：</text>
				<text>{{ displayOrder.remark }}</text>
			</view>
			<view class="info-row">
				<text>订单编号：</text>
				<view class="info-value">
					<text>{{ displayOrder.orderNo }}</text>
					<text class="copy-btn" @click="copyText(displayOrder.orderNo)">复制</text>
				</view>
			</view>
			<view class="info-row" v-if="displayOrder.orderTime"><text>下单时间：</text><text>{{ displayOrder.orderTime }}</text></view>
			<view class="info-row" v-if="displayOrder.payTime"><text>支付时间：</text><text>{{ displayOrder.payTime }}</text></view>
			<view class="info-row" v-if="displayOrder.receiptTime"><text>提货时间：</text><text>{{ formatTime(displayOrder.receiptTime) }}</text></view>
		</view>

		<!-- 推荐区 -->
		<view class="section recommend-section" v-if="recommendGoods.length">
			<view class="section-head">团长更多好货</view>
			<view class="recommend-card" @click="goGroupDetail">
				<view class="recommend-title-row">
					<text class="recommend-title">{{ displayOrder.groupName || '商品标题' }}</text>
					<text class="recommend-count">{{ displayOrder.groupJoinText }}</text>
				</view>
				<text class="recommend-price">￥{{ recommendPrice }}</text>
				<view class="recommend-images">
					<image
						v-for="goods in recommendGoods"
						:key="goods.id || goods.goodsId"
						class="recommend-image"
						:src="goods.img || '/static/image/head.png'"
						mode="aspectFill"
					></image>
				</view>
			</view>
		</view>
	</view>

	<view class="page" v-else>
		<view class="empty-panel">
			<text class="empty-title">{{ orderNo ? '订单加载失败' : '缺少订单编号' }}</text>
			<text class="empty-desc">{{ orderNo ? '请稍后在我的订单中查看' : '请返回订单列表重新进入' }}</text>
		</view>
	</view>

	<view class="bottom-bar" v-if="hasOrder && detailActions.length > 0">
		<button
			v-for="action in detailActions"
			:key="action.key"
			class="bar-btn"
			:class="[action.tone, action.disabled ? 'disabled' : '']"
			:disabled="action.disabled"
			@click="handleDetailAction(action.key)"
		>{{ action.text }}</button>
	</view>

	<view v-if="qrVisible" class="mask" @click="qrVisible = false">
		<view class="qr-dialog" @click.stop>
			<text class="dialog-title">核销码</text>
			<image class="qr-image" :src="qrImage" mode="aspectFit"></image>
			<text class="qr-code" v-if="displayOrder.receiptCode">{{ displayOrder.receiptCode }}</text>
		</view>
	</view>

</view>
</template>

<script>
import { getPayCache, removePayCache, savePayCache } from "@/utils/payCache.js"
import { getErcodeInfo, getGroupPoint, getOpenId, getOrderInfo, getRefundRecords, payOrder as requestPayOrder } from "@/api/group.js"
import { buildMemberErcodeParams, canMemberOrderApplyRefund, canMemberOrderMakeQr, mergeMemberOrderRefundRecords, normalizeMemberOrder } from "@/utils/memberOrder.js"
import { clearPaidCheckoutSessionState, normalizeGroupPickupPoint } from "@/utils/groupPurchase.js"

export default {
	data() {
		return {
			orderNo: '',
			orderInfo: normalizeMemberOrder({}),
			paidSuccessHint: false,
			loading: true,
			loaded: false,
			qrVisible: false,
			qrImage: '',
			nowTick: Date.now(),
			countdownTimer: null,
			isRequesting: false
		}
	},
	computed: {
		hasOrder() {
			return this.loaded && Boolean(this.orderInfo.orderNo)
		},
		displayOrder() {
			return this.orderInfo
		},
		canMakeQr() {
			return canMemberOrderMakeQr(this.displayOrder)
		},
		canRefund() {
			return canMemberOrderApplyRefund(this.displayOrder)
		},
		hasRefundInfo() {
			return [4, 5].includes(Number(this.orderInfo.status)) ||
				this.orderInfo.refundStatusText !== '无售后' ||
				this.orderInfo.goods.some(goods => Number(goods.applyRefund || 0) > 0 || Number(goods.refundGoodsNum || 0) > 0)
		},
		detailStatusIcon() {
			const status = Number(this.displayOrder.status)
			return status === 0 ? '¥' : '✓'
		},
		detailStatusTitle() {
			if (this.isPayExpired) return '支付已超时'
			const titleMap = {
				0: '待支付',
				1: '待收货',
				2: '部分收货',
				3: '已提货',
				4: '已退款',
				5: '售后',
				6: '已取消'
			}
			return titleMap[Number(this.displayOrder.status)] || this.displayOrder.statusText
		},
		detailStatusTone() {
			return this.isPayExpired ? 'muted' : this.displayOrder.statusTone
		},
		orderGoodsCount() {
			return this.displayOrder.goods.reduce((total, goods) => total + Number(goods.num || 0), 0)
		},
		payDeadlineText() {
			const remain = this.payRemainMs
			if (remain === null) return ''
			const hour = Math.floor(remain / 3600000)
			const minute = Math.floor((remain % 3600000) / 60000)
			const second = Math.floor((remain % 60000) / 1000)
			const pad = value => String(value).padStart(2, '0')
			return `${pad(hour)}:${pad(minute)}:${pad(second)}`
		},
		payRemainMs() {
			if (Number(this.displayOrder.status) !== 0 || !this.displayOrder.orderTime) return null
			const deadline = this.parseOrderTime(this.displayOrder.orderTime) + 15 * 60 * 1000
			return Math.max(deadline - this.nowTick, 0)
		},
		isPayExpired() {
			return this.payRemainMs === 0
		},
		statusSubText() {
			const status = Number(this.displayOrder.status)
			if (status === 0) return this.isPayExpired ? '支付已超时，请重新下单' : ''
			if ([1, 2].includes(status)) return '请按约定时间到服务驿站自提'
			if (status === 3) return this.displayOrder.receiptTime ? `提货时间 ${this.formatTime(this.displayOrder.receiptTime)}` : '订单已完成提货'
			if (status === 4) return '订单已退款'
			if (status === 5) return '退款申请处理中'
			if (status === 6) return '订单已取消'
			return this.displayOrder.orderTime || ''
		},
		recommendGoods() {
			return this.displayOrder.goods.slice(0, 3)
		},
		recommendPrice() {
			const first = this.displayOrder.goods[0]
			return this.formatAmount(first ? first.price : this.displayOrder.orderPrice)
		},
		detailActions() {
			const status = Number(this.displayOrder.status)
			if (status === 0) {
				return [{
					key: 'pay',
					text: this.isPayExpired ? '支付已超时' : '继续支付',
					tone: this.isPayExpired ? 'muted' : 'primary',
					disabled: this.isPayExpired
				}]
			}
			const actions = []
			if (this.canRefund) actions.push({ key: 'refund', text: '申请退款', tone: 'danger' })
			if (this.hasRefundInfo) actions.push({ key: 'refundDetail', text: '查看售后', tone: status === 5 ? 'primary' : 'light' })
			if (actions.length) return actions
			const readonlyMap = {
				6: { text: '订单已取消', tone: 'muted' }
			}
			const readonlyAction = readonlyMap[status]
			return readonlyAction ? [Object.assign({ key: 'readonly', disabled: true }, readonlyAction)] : []
		}
	},
	onLoad(options = {}) {
		const token = uni.getStorageSync('token')
		if (!token) {
			uni.redirectTo({ url: '/pages/login/index' })
			return
		}
		this.orderNo = options.orderNo || options.id || ''
		this.paidSuccessHint = options.paid == 1 || options.paid === 'true'
		this.initOrderInfo()
		this.startCountdown()
	},
	onUnload() {
		if (this.countdownTimer) clearInterval(this.countdownTimer)
	},
	methods: {
		startCountdown() {
			if (this.countdownTimer) clearInterval(this.countdownTimer)
			this.countdownTimer = setInterval(() => {
				this.nowTick = Date.now()
			}, 1000)
		},
		async initOrderInfo() {
			if (!this.orderNo) {
				this.loading = false
				this.loaded = false
				return
			}
			this.loading = true
			try {
				const res = await getOrderInfo({ orderNo: this.orderNo })
				let order = normalizeMemberOrder(res.data || {})
				order = await this.loadPickupPointContact(order)
				if (this.shouldLoadRefundRecords(order)) {
					order = await this.loadRefundRecords(order)
				}
				this.orderInfo = order
				this.orderNo = this.orderInfo.orderNo || this.orderNo
				this.loaded = Boolean(this.orderInfo.orderNo)
			} catch (err) {
				console.log('加载订单详情失败：', err)
				this.loaded = false
				uni.showToast({ title: '订单加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async loadPickupPointContact(order) {
			const leaderId = Number(order.leaderId || 0)
			const pointId = Number(order.pointId || 0)
			if (!leaderId || !pointId || order.pointPhone) return order
			try {
				const res = await getGroupPoint({ id: leaderId })
				const point = (Array.isArray(res.data) ? res.data : [])
					.map(normalizeGroupPickupPoint)
					.find(item => Number(item.id) === pointId)
				if (!point) return order
				return Object.assign({}, order, {
					pointName: point.name || order.pointName,
					pointAddress: point.address || order.pointAddress,
					pointPerson: point.person || order.pointPerson,
					pointPhone: point.phone || ''
				})
			} catch (err) {
				console.log('加载自提点联系方式失败：', err)
				return order
			}
		},
		shouldLoadRefundRecords(order) {
			return [4, 5].includes(Number(order.status)) ||
				order.refundStatusText !== '无售后' ||
				order.goods.some(goods => Number(goods.applyRefund || 0) > 0 || Number(goods.refundGoodsNum || 0) > 0)
		},
		async loadRefundRecords(order) {
			try {
				const res = await getRefundRecords({ orderNo: order.orderNo || this.orderNo })
				const records = Array.isArray(res.data) ? res.data : []
				return mergeMemberOrderRefundRecords(order, records)
			} catch (err) {
				console.log('加载售后记录失败：', err)
				return order
			}
		},
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		async showOrderQr() {
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.redirectTo({ url: '/pages/login/index' })
				return
			}
			const params = buildMemberErcodeParams(this.orderInfo, token)
			try {
				this.qrImage = ''
				const res = await getErcodeInfo(params, token)
				this.qrImage = res.data || ''
				this.qrVisible = Boolean(this.qrImage || this.orderInfo.receiptCode)
			} catch (err) {
				console.log('生成核销码失败：', err)
				uni.showToast({ title: (err && err.msg) || '生成失败', icon: 'none' })
			}
		},
		handleDetailAction(action) {
			if (action === 'pay') {
				this.payOrder()
				return
			}
			if (action === 'qr') {
				this.showOrderQr()
				return
			}
			if (action === 'refund') {
				this.goRefundApply()
				return
			}
			if (action === 'refundDetail') {
				this.goRefundDetail()
			}
		},
		async payOrder() {
			if (this.isRequesting) return
			if (this.isPayExpired) {
				uni.showToast({ title: '支付已超时，请重新下单', icon: 'none' })
				return
			}
			this.isRequesting = true
			let payParams = getPayCache(this.orderInfo.orderNo)
			try {
				if (!payParams) {
					const openid = await this.ensureOpenId()
					if (!openid) {
						const err = new Error('获取openid失败')
						err.silentToast = true
						uni.showToast({ title: '获取openid失败', icon: 'none' })
						throw err
					}
					const res = await requestPayOrder({ orderNo: this.orderInfo.orderNo, openid })
					payParams = res.data
				}
				await uni.requestPayment({
					provider: 'wxpay',
					timeStamp: payParams.timeStamp,
					nonceStr: payParams.nonceStr,
					package: payParams.package,
					signType: payParams.signType,
					paySign: payParams.paySign
				})
				removePayCache(this.orderInfo.orderNo)
				Object.assign(getApp().globalData, clearPaidCheckoutSessionState(getApp().globalData, this.orderInfo.orderNo))
				uni.showToast({ title: '支付成功', icon: 'success' })
				this.initOrderInfo()
			} catch (err) {
				console.log('订单详情支付失败：', err)
				if (payParams) savePayCache(this.orderInfo.orderNo, payParams)
				if (!err.silentToast) {
					uni.showToast({ title: (err && err.msg) || (err && err.message) || '支付失败', icon: 'none' })
				}
			} finally {
				this.isRequesting = false
			}
		},
		async ensureOpenId() {
			let openid = uni.getStorageSync('openid')
			if (openid) return openid
			try {
				const loginRes = await uni.login({ provider: 'weixin' })
				const code = loginRes.code
				if (!code) return ''
				const res = await getOpenId({ code })
				openid = res.data || ''
				if (openid) uni.setStorageSync('openid', openid)
				return openid
			} catch (err) {
				console.log('获取openid失败：', err)
				return ''
			}
		},
		goRefundApply() {
			const url = `/pages/order/refund?orderNo=${encodeURIComponent(this.orderInfo.orderNo)}`
			uni.navigateTo({ url })
		},
		goRefundDetail() {
			const url = `/pages/order/refundDetail?orderNo=${encodeURIComponent(this.orderInfo.orderNo)}`
			uni.navigateTo({ url })
		},
		parseOrderTime(value) {
			if (!value) return 0
			if (typeof value === 'number') return value > 1000000000000 ? value : value * 1000
			return new Date(String(value).replace(/-/g, '/')).getTime() || 0
		},
		formatAmount(value) {
			const amount = Number(value || 0)
			return amount.toFixed(2).replace(/\.?0+$/, '')
		},
		copyText(value) {
			if (!value) return
			uni.setClipboardData({ data: String(value) })
		},
		callPhone(phone) {
			if (!phone) return
			uni.makePhoneCall({ phoneNumber: String(phone) })
		},
		goGroupDetail() {
			const groupId = Number(this.displayOrder.groupId || 0)
			const leaderId = Number(this.displayOrder.leaderId || 0)
			if (!groupId || !leaderId) return
			uni.navigateTo({ url: `/pages/group/index?id=${groupId}&lid=${leaderId}` })
		},
		formatTime(value) {
			const num = Number(value || 0)
			if (!num) return ''
			const date = new Date(num * 1000)
			const pad = item => String(item).padStart(2, '0')
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
		}
	}
}
</script>

<style lang="scss" scoped>
.detail-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 36rpx;
	box-sizing: border-box;
	color: #222;
}

.detail-page.has-bottom-bar {
	padding-bottom: 174rpx;
}

.detail-nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 30;
	background: #fff;
	box-sizing: border-box;
}

.back {
	position: absolute;
	left: 30rpx;
	width: 58rpx;
	text-align: left;
	font-size: 50rpx;
	font-weight: 300;
	color: #444;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	text-align: center;
	font-size: 34rpx;
	font-weight: 500;
}

.page {
	padding: 18rpx 0 0;
	box-sizing: border-box;
}

.status-panel {
	min-height: 202rpx;
	padding: 54rpx 58rpx 34rpx;
	display: flex;
	align-items: center;
	gap: 22rpx;
	background: #fff;
	box-sizing: border-box;
}

.status-icon {
	width: 52rpx;
	height: 52rpx;
	line-height: 50rpx;
	border: 3rpx solid #18c66a;
	border-radius: 50%;
	text-align: center;
	font-size: 30rpx;
	font-weight: 500;
	color: #18c66a;
	box-sizing: border-box;
}

.status-panel.danger .status-icon,
.status-panel.muted .status-icon {
	color: #999;
	border-color: #cfcfcf;
}

.status-copy {
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.status-title {
	font-size: 42rpx;
	line-height: 54rpx;
	font-weight: 500;
	color: #222;
}

.status-sub {
	margin-top: 2rpx;
	font-size: 26rpx;
	line-height: 36rpx;
	color: #777;
}

.status-panel.warning .status-sub {
	color: #777;
}

.section {
	margin-top: 16rpx;
	background: #fff;
	box-sizing: border-box;
}

.section-head {
	min-height: 78rpx;
	padding: 0 34rpx;
	display: flex;
	align-items: center;
	border-bottom: 1rpx solid #eeeeee;
	font-size: 30rpx;
	line-height: 42rpx;
	color: #222;
	box-sizing: border-box;
}

.station-head {
	justify-content: space-between;
	gap: 20rpx;
}

.qr-entry {
	display: flex;
	align-items: center;
	gap: 8rpx;
	font-size: 26rpx;
	line-height: 38rpx;
	color: #999;
	white-space: nowrap;
}

.qr-entry .row-arrow {
	width: auto;
	color: #bbb;
}

.station-body {
	display: flex;
	gap: 16rpx;
	padding: 26rpx 34rpx 26rpx;
	box-sizing: border-box;
}

.station-icon {
	position: relative;
	width: 32rpx;
	height: 40rpx;
	margin-top: 4rpx;
	flex-shrink: 0;
}

.station-icon::before {
	content: '';
	position: absolute;
	top: 0;
	left: 5rpx;
	width: 22rpx;
	height: 28rpx;
	border: 4rpx solid #18c66a;
	border-radius: 18rpx 18rpx 18rpx 4rpx;
	transform: rotate(-45deg);
	box-sizing: border-box;
}

.station-icon::after {
	content: '';
	position: absolute;
	top: 9rpx;
	left: 13rpx;
	width: 8rpx;
	height: 8rpx;
	background: #18c66a;
	border-radius: 50%;
}

.station-content {
	flex: 1;
	min-width: 0;
}

.station-title {
	font-size: 28rpx;
	line-height: 38rpx;
	color: #333;
}

.station-contact,
.station-address {
	margin-top: 14rpx;
	display: flex;
	align-items: center;
	gap: 14rpx;
	font-size: 26rpx;
	line-height: 38rpx;
	color: #666;
}

.station-address text:first-child {
	flex: 1;
	min-width: 0;
}

.phone-text {
	color: #666;
}

.phone-action {
	color: #18c66a;
	font-size: 24rpx;
}

.pay-time-left {
	color: #ff3b30;
}

.copy-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 54rpx;
	height: 34rpx;
	padding: 0 10rpx;
	border: 1rpx solid #dcdcdc;
	border-radius: 4rpx;
	font-size: 22rpx;
	line-height: 32rpx;
	color: #777;
	box-sizing: border-box;
}

.shop-row {
	min-height: 72rpx;
	padding: 0 34rpx;
	display: flex;
	align-items: center;
	gap: 14rpx;
	border-bottom: 1rpx solid #eeeeee;
	box-sizing: border-box;
}

.shop-avatar {
	width: 34rpx;
	height: 34rpx;
	border-radius: 50%;
	background: #f0f0f0;
	flex-shrink: 0;
}

.shop-name {
	max-width: 210rpx;
	font-size: 28rpx;
	line-height: 38rpx;
	color: #222;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.group-name {
	flex: 1;
	min-width: 0;
	font-size: 28rpx;
	line-height: 38rpx;
	color: #222;
	text-align: right;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.row-arrow {
	width: 22rpx;
	text-align: right;
	font-size: 34rpx;
	color: #bbb;
}

.goods-empty {
	padding: 30rpx 34rpx;
	font-size: 26rpx;
	color: #999;
}

.goods-row {
	display: flex;
	gap: 22rpx;
	padding: 20rpx 34rpx;
	border-bottom: 1rpx solid #eeeeee;
	box-sizing: border-box;
}

.goods-image {
	width: 128rpx;
	height: 128rpx;
	border-radius: 6rpx;
	background: #f2f2f2;
	flex-shrink: 0;
}

.goods-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999;
	font-size: 42rpx;
	font-weight: 600;
}

.goods-info {
	flex: 1;
	min-width: 0;
	padding-top: 6rpx;
	display: flex;
	flex-direction: column;
}

.goods-name {
	font-size: 30rpx;
	line-height: 42rpx;
	color: #222;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.goods-spec {
	margin-top: 14rpx;
	font-size: 26rpx;
	line-height: 36rpx;
	color: #777;
}

.goods-status-list {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
	margin-top: 10rpx;
}

.goods-status {
	padding: 2rpx 8rpx;
	border-radius: 4rpx;
	font-size: 20rpx;
	line-height: 30rpx;
}

.goods-status.pending {
	color: #d78320;
	background: #fff6e8;
}

.goods-status.verified {
	color: #13a953;
	background: #edf9f1;
}

.goods-status.processing {
	color: #e97a26;
	background: #fff3eb;
}

.goods-status.refunded {
	color: #8a6390;
	background: #f7eff9;
}

.goods-side {
	width: 120rpx;
	padding-top: 34rpx;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex-shrink: 0;
}

.goods-price {
	font-size: 28rpx;
	line-height: 38rpx;
	color: #222;
}

.goods-num {
	margin-top: 12rpx;
	font-size: 24rpx;
	color: #999;
}

.goods-total-row {
	min-height: 76rpx;
	padding: 0 34rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	font-size: 26rpx;
	color: #999;
	box-sizing: border-box;
}

.goods-total-row > view {
	flex-shrink: 0;
	color: #666;
}

.actual-price {
	font-size: 34rpx;
	color: #ff3b30;
}

.info-section {
	padding-bottom: 22rpx;
}

.info-row {
	min-height: 48rpx;
	padding: 0 34rpx;
	display: flex;
	align-items: center;
	gap: 10rpx;
	font-size: 26rpx;
	line-height: 38rpx;
	color: #666;
	box-sizing: border-box;
}

.info-row > text:first-child {
	flex-shrink: 0;
}

.info-row > text:last-child,
.info-value {
	flex: 1;
	min-width: 0;
	color: #333;
	word-break: break-all;
}

.info-value {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.recommend-section {
	padding-bottom: 26rpx;
}

.recommend-card {
	padding: 22rpx 34rpx 0;
	box-sizing: border-box;
}

.recommend-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.recommend-title {
	flex: 1;
	min-width: 0;
	font-size: 30rpx;
	line-height: 42rpx;
	color: #222;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.recommend-count {
	font-size: 24rpx;
	color: #b5b5b5;
}

.recommend-price {
	display: block;
	margin-top: 8rpx;
	font-size: 30rpx;
	line-height: 42rpx;
	color: #ff3b30;
}

.recommend-images {
	margin-top: 14rpx;
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12rpx;
}

.recommend-image {
	width: 100%;
	height: 190rpx;
	border-radius: 6rpx;
	background: #f1f1f1;
}

.empty-panel {
	min-height: 360rpx;
	margin: 20rpx 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: #fff;
	border-radius: 8rpx;
}

.empty-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
}

.empty-desc {
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #999;
}

.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 20;
	min-height: 126rpx;
	padding: 22rpx 30rpx 36rpx;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 18rpx;
	background: #fff;
	box-sizing: border-box;
}

.bar-btn {
	min-width: 146rpx;
	height: 68rpx;
	line-height: 68rpx;
	border-radius: 6rpx;
	font-size: 28rpx;
	padding: 0 24rpx;
	margin: 0;
}

.bar-btn::after {
	border: none;
}

.bar-btn.light {
	background: #fff;
	color: #22c55e;
	border: 1rpx solid #22c55e;
}

.bar-btn.muted {
	background: #f3f4f6;
	color: #888;
	border: 1rpx solid #e5e7eb;
}

.bar-btn.danger {
	background: #fff;
	color: #ff4d4f;
	border: 1rpx solid #ff4d4f;
}

.bar-btn.primary {
	background: #22c55e;
	color: #fff;
}

.bar-btn.disabled,
.bar-btn[disabled] {
	opacity: 1;
	color: #999;
	background: #f3f4f6;
	border-color: #e5e7eb;
}

.mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, .45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 40;
}

.qr-dialog {
	width: 580rpx;
	background: #fff;
	border-radius: 16rpx;
	padding: 40rpx;
	box-sizing: border-box;
	text-align: center;
}

.dialog-title {
	display: block;
	font-size: 34rpx;
	font-weight: 600;
	margin-bottom: 28rpx;
}

.qr-image {
	width: 380rpx;
	height: 380rpx;
	margin: 0 auto 22rpx;
	display: block;
	background: #f6f6f6;
}

.qr-code {
	font-size: 28rpx;
	color: #666;
}
</style>
