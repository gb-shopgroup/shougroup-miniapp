<template>
<view class="container order-page" :style="orderPageStyle">
	<view class="order-nav" :style="miniNavBarStyle()">
		<text class="nav-placeholder"></text>
		<text class="title" :style="miniNavTitleStyle()">{{ paidMode ? '待核销订单' : '团购订单' }}</text>
		<text class="nav-placeholder"></text>
	</view>
	<view class="order-filter" :class="{ 'has-sub-tabs': currentTab === 'refund' }" :style="miniNavTopStyle()" v-if="!paidMode">
		<view class="order-search" :class="{ active: searchFocused || goodsName }">
			<view class="search-placeholder" v-if="!searchFocused && !goodsName">
				<view class="search-icon"></view>
				<text>商品名称</text>
			</view>
			<view class="search-icon input-icon" v-else></view>
			<input
				class="search-input"
				v-model="goodsName"
				placeholder=""
				confirm-type="search"
				@focus="searchFocused = true"
				@blur="searchFocused = false"
				@confirm="searchOrders"
			/>
		</view>
		<view class="order-tabs">
			<view v-for="tab in tabs" :key="tab.key" class="tab-item" :class="{ active: currentTab === tab.key }" @click="switchTab(tab.key)">{{ tab.text }}</view>
		</view>
		<view v-if="currentTab === 'refund'" class="refund-tabs">
			<view v-for="tab in refundTabs" :key="tab.key" class="refund-tab-item" :class="{ active: currentRefundTab === tab.key }" @click="switchRefundTab(tab.key)">{{ tab.text }}</view>
		</view>
	</view>
	<view class="page">
		<view class="order-list">
			<view class="order-card" v-for="order in orderList" :key="order.orderNo" @click="goOrderDetail(order)">
				<view class="order-title-row">
					<view>跟团号：<text class="group-no">{{ order.orderNo }}</text></view>
					<view class="order-status-pill" :class="orderStatusTone(order)">{{ paidMode ? '待核销' : orderStatusText(order) }}</view>
				</view>
				<view class="order-time">{{ order.orderTime }}</view>
				<view class="leader-order-row">
					<image src="/static/image/head.png" mode="aspectFill"></image>
					<text>{{ order.shopName || '团长店铺' }}</text>
					<text class="activity-name">{{ order.groupName }}</text>
					<text>›</text>
				</view>
				<view class="order-product" v-for="goods in order.goods" :key="goods.id || goods.goodsId">
					<view class="product-image">
						<image mode="aspectFill" :src="goods.img"></image>
					</view>
					<view class="product-info">
						<view class="product-name">{{ goods.name }}</view>
						<view class="product-spec" v-if="goods.specText">{{ goods.specText }}</view>
						<view v-if="goods.statusList && goods.statusList.length" class="product-status-list">
							<text v-for="status in goods.statusList" :key="status.key" class="product-status" :class="status.tone">{{ status.text }}</text>
						</view>
						<view class="product-price-num">
							<text class="product-price"><text class="label">¥</text>{{ goods.price }}</text>
							<text class="product-num">x {{ goods.num }}</text>
						</view>
					</view>
				</view>
				<view class="order-total-row">
					<text>共{{ order.goods.length }}件</text>
					<text>实收<text class="total-price">￥{{ order.orderPrice }}</text></text>
				</view>
				<view class="station-card" v-if="order.pointName || order.pointAddress">
					<view class="station-title">服务驿站</view>
					<view v-if="order.pointName">{{ order.pointName }}</view>
					<view v-if="order.pointAddress">{{ order.pointAddress }} <text class="copy-btn" @click.stop="copyStation(order)">复制</text></view>
				</view>
				<view class="order-footer" v-if="hasOrderActions(order)">
					<view></view>
					<view class="order-actions">
						<text class="action-btn refund" v-if="canRefund(order)" @click.stop="goRefundApply(order)">申请退款</text>
						<text class="action-btn confirm2" v-if="canPayOrder(order)" @click.stop="payOrder(order)">支付订单</text>
						<text class="action-btn confirm3" v-else-if="isOrderPayExpired(order)">支付已超时</text>
						<text class="action-btn confirm" v-if="canReceipt(order)" @click.stop="confirmReceipt(order)">确认核销</text>
					</view>
				</view>
			</view>
		</view>
		<view class="empty-state" v-if="!loading && orderList.length === 0">暂无订单</view>
		<view class="load-more" v-if="hasMore && !paidMode">上拉加载更多...</view>
		<view class="no-more" v-else-if="orderList.length > 0">没有更多了</view>
	</view>
</view>
</template>

<script>
import { getPayCache, removePayCache, savePayCache } from "@/utils/payCache.js"
import { getApplyRefundOrderList, getOpenId, getOrderList, getPaidOrders, payOrder as requestPayOrder, receiptOrder } from "@/api/group.js"
import { MEMBER_ORDER_TABS, MEMBER_REFUND_TABS, buildMemberOrderListPayload, buildMemberRefundListPayload, buildMemberReceiptParams, normalizeMemberOrder } from "@/utils/memberOrder.js"
import { clearPaidCheckoutSessionState } from "@/utils/groupPurchase.js"

export default {
	data() {
		return {
			tabs: MEMBER_ORDER_TABS,
			currentTab: 'all',
			refundTabs: MEMBER_REFUND_TABS.filter(item => item.key !== 'all'),
			currentRefundTab: 'pending',
			goodsName: '',
			searchFocused: false,
			shopId: 0,
			paidMode: false,
			orderList: [],
			page: 1,
			pageSize: 10,
			hasMore: false,
			loading: false,
			pendingRefresh: false,
			pendingRefreshCallback: null,
			nowTick: Date.now(),
			countdownTimer: null,
			isRequesting: false
		}
	},
	onLoad(options = {}) {
		const token = uni.getStorageSync('token')
		if (!token) {
			uni.redirectTo({ url: '/pages/login/index'})
			return
		}
		this.applyEntryParams(options)
		this.refreshOrders()
	},
	onPullDownRefresh() {
		this.refreshOrders(() => uni.stopPullDownRefresh())
	},
	onShow() {
		this.startCountdown()
	},
	onUnload() {
		if (this.countdownTimer) clearInterval(this.countdownTimer)
	},
	onReachBottom() {
		if (this.paidMode || this.loading || !this.hasMore) return
		this.page += 1
		this.loadData()
	},
	computed: {
		orderPageStyle() {
			return this.miniNavPageStyle(this.paidMode ? 0 : (this.currentTab === 'refund' ? 200 : 136))
		}
	},
	methods: {
		startCountdown() {
			if (this.countdownTimer) clearInterval(this.countdownTimer)
			this.countdownTimer = setInterval(() => {
				this.nowTick = Date.now()
			}, 1000)
		},
		applyEntryParams(options) {
			const params = Object.assign({}, options)
			if (options.scene) {
				decodeURIComponent(options.scene).split('&').forEach(item => {
					const pair = item.split('=')
					if (pair[0]) params[pair[0]] = pair[1]
				})
			}
			this.shopId = Number(params.shopId || params.sid || 0)
			this.paidMode = Boolean(this.shopId)
		},
		async refreshOrders(callback) {
			this.page = 1
			this.orderList = []
			this.hasMore = false
			// 切换筛选时上一轮请求可能还在路上，不能让最新条件被 loading 锁直接吞掉。
			if (this.loading) {
				this.pendingRefresh = true
				if (callback) this.pendingRefreshCallback = callback
				return
			}
			await this.loadData(callback)
		},
		async loadData(callback) {
			if (this.loading) return
			this.loading = true
			try {
				let list = []
				if (this.paidMode) {
					const res = await getPaidOrders({ shopId: this.shopId })
					list = Array.isArray(res.data) ? res.data : []
					this.hasMore = false
				} else if (this.currentTab === 'refund') {
					const payload = buildMemberRefundListPayload({
						goodsName: this.goodsName,
						tab: this.currentRefundTab,
						page: this.page,
						pageSize: this.pageSize
					})
					const res = await getApplyRefundOrderList(payload)
					list = Array.isArray(res.data) ? res.data : []
					this.hasMore = list.length >= this.pageSize
				} else {
					const payload = buildMemberOrderListPayload({
						goodsName: this.goodsName,
						tab: this.currentTab,
						page: this.page,
						pageSize: this.pageSize
					})
					const res = await getOrderList(payload)
					list = Array.isArray(res.data) ? res.data : []
					this.hasMore = list.length >= this.pageSize
				}
				const normalized = list.map(normalizeMemberOrder)
				this.orderList = this.page === 1 ? normalized : this.orderList.concat(normalized)
			} catch (err) {
				console.log('初始化订单列表失败：', err)
				uni.showToast({ title: '订单加载失败', icon: 'none' })
			} finally {
				this.loading = false
				if (this.pendingRefresh) {
					const nextCallback = this.pendingRefreshCallback
					this.pendingRefresh = false
					this.pendingRefreshCallback = null
					await this.refreshOrders(nextCallback)
				} else {
					callback && callback()
				}
			}
		},
		switchTab(tab) {
			if (tab === this.currentTab) return
			this.currentTab = tab
			this.refreshOrders()
		},
		switchRefundTab(tab) {
			if (tab === this.currentRefundTab) return
			this.currentRefundTab = tab
			this.refreshOrders()
		},
		searchOrders() {
			this.goodsName = this.goodsName.trim()
			this.refreshOrders()
		},
		goOrderDetail(order) {
			if (this.currentTab === 'refund' || order.statusKey === 'refund') {
				this.goRefundDetail(order)
				return
			}
			const url = '/pages/order/detail?orderNo=' + encodeURIComponent(order.orderNo)
			uni.navigateTo({
				url,
				fail: () => { uni.redirectTo({ url }) }
			})
		},
		goRefundApply(order) {
			const url = '/pages/order/refund?orderNo=' + encodeURIComponent(order.orderNo)
			uni.navigateTo({
				url,
				fail: () => { uni.redirectTo({ url }) }
			})
		},
		goRefundDetail(order) {
			const url = '/pages/order/refundDetail?orderNo=' + encodeURIComponent(order.orderNo)
			uni.navigateTo({
				url,
				fail: () => { uni.redirectTo({ url }) }
			})
		},
		canRefund(order) {
			return !this.paidMode && [1, 2, 3].includes(Number(order.status)) && order.goods.some(goods => goods.applyRefund === 0)
		},
		canReceipt(order) {
			return this.paidMode && [1, 2].includes(Number(order.status)) && Number(order.pointId || 0) > 0
		},
		hasOrderActions(order) {
			return this.canRefund(order) || this.canPayOrder(order) || this.isOrderPayExpired(order) || this.canReceipt(order)
		},
		parseOrderTime(value) {
			if (!value) return 0
			if (typeof value === 'number') return value > 1000000000000 ? value : value * 1000
			return new Date(String(value).replace(/-/g, '/')).getTime() || 0
		},
		getOrderPayRemainMs(order) {
			if (!order || Number(order.status) !== 0 || !order.orderTime) return null
			const deadline = this.parseOrderTime(order.orderTime) + 15 * 60 * 1000
			return Math.max(deadline - this.nowTick, 0)
		},
		isOrderPayExpired(order) {
			return this.getOrderPayRemainMs(order) === 0
		},
		canPayOrder(order) {
			return order && order.statusKey === 'unpay' && !this.isOrderPayExpired(order)
		},
		orderStatusText(order) {
			if (this.currentTab === 'refund' && order.refundStatusText && order.refundStatusText !== '无售后') {
				return order.refundStatusText
			}
			return this.isOrderPayExpired(order) ? '支付已超时' : order.statusText
		},
		orderStatusTone(order) {
			if (this.currentTab === 'refund' && order.refundStatusText && order.refundStatusText !== '无售后') {
				return order.refundTone
			}
			return this.isOrderPayExpired(order) ? 'muted' : order.statusTone
		},
		confirmReceipt(order) {
			if (this.isRequesting) return
			uni.showModal({
				title: '确认核销',
				content: '确认核销该订单商品？',
				success: async res => {
					if (!res.confirm) return
					await this.submitReceipt(order)
				}
			})
		},
		async submitReceipt(order) {
			this.isRequesting = true
			try {
				await receiptOrder(buildMemberReceiptParams(order))
				uni.showToast({ title: '核销成功', icon: 'success' })
				this.refreshOrders()
			} catch (err) {
				console.log('确认核销失败：', err)
				uni.showToast({ title: '核销失败', icon: 'none' })
			} finally {
				this.isRequesting = false
			}
		},
		async payOrder(order) {
			if (this.isRequesting) return
			if (this.isOrderPayExpired(order)) {
				uni.showToast({ title: '支付已超时，请重新下单', icon: 'none' })
				return
			}
			this.isRequesting = true
			let payParams = getPayCache(order.orderNo)
			try {
				if (!payParams) {
					const openid = await this.ensureOpenId()
					if (!openid) {
						const err = new Error('获取openid失败')
						err.silentToast = true
						uni.showToast({ title: '获取openid失败', icon: 'none' })
						throw err
					}
					const res = await requestPayOrder({ orderNo: order.orderNo, openid })
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
				removePayCache(order.orderNo)
				Object.assign(getApp().globalData, clearPaidCheckoutSessionState(getApp().globalData, order.orderNo))
				uni.showToast({ title: '支付成功', icon: 'success' })
				this.refreshOrders()
			} catch (err) {
				console.log('订单列表支付失败：', err)
				if (payParams) savePayCache(order.orderNo, payParams)
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
		copyStation(order) {
			uni.setClipboardData({ data: [order.pointName, order.pointAddress].filter(Boolean).join(' ') })
		}
	}
}
</script>

<style lang="scss" scoped>
.order-page {
	min-height: 100vh;
	background: #f6f6f6;
	color: #222;
}

.order-nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	display: grid;
	grid-template-columns: 160rpx minmax(0, 1fr) 160rpx;
	align-items: start;
	padding: 0 28rpx;
	background: #fff;
	box-sizing: border-box;
}

.nav-placeholder {
	display: block;
	min-width: 0;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	font-size: 34rpx;
	font-weight: 600;
	text-align: center;
}

.order-filter {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 19;
	height: 136rpx;
	background: #fff;
	padding: 16rpx 18rpx 0;
	box-sizing: border-box;
}

.order-filter.has-sub-tabs {
	height: 200rpx;
}

.order-search {
	position: relative;
	height: 32rpx;
	background: #f7f7f7;
	border-radius: 4rpx;
	padding: 0 12rpx;
	box-sizing: border-box;
}

.search-placeholder {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	height: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999;
	font-size: 22rpx;
	pointer-events: none;
}

.search-icon {
	position: relative;
	flex-shrink: 0;
	width: 14rpx;
	height: 14rpx;
	margin-right: 8rpx;
	border: 4rpx solid #bbb;
	border-radius: 50%;
	box-sizing: content-box;
}

.input-icon {
	position: absolute;
	left: 16rpx;
	top: 50%;
	margin-right: 0;
	transform: translateY(-50%);
	pointer-events: none;
}

.search-icon::after {
	content: '';
	position: absolute;
	right: -10rpx;
	bottom: -7rpx;
	width: 12rpx;
	height: 4rpx;
	background: #bbb;
	transform: rotate(45deg);
	border-radius: 2rpx;
}

.search-input {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	width: 100%;
	height: 32rpx;
	min-height: 32rpx;
	padding: 0 12rpx 0 52rpx;
	color: #999;
	font-size: 22rpx;
	line-height: 32rpx;
	box-sizing: border-box;
}

.order-search.active .search-input {
	color: #333;
}

.order-tabs {
	display: flex;
	height: 88rpx;
}

.tab-item {
	flex: 1;
	text-align: center;
	line-height: 88rpx;
	font-size: 28rpx;
	color: #666;
	position: relative;
}

.tab-item.active {
	color: #22c55e;
	font-weight: 600;
}

.tab-item.active::after {
	content: '';
	position: absolute;
	left: 50%;
	bottom: 0;
	width: 42rpx;
	height: 4rpx;
	border-radius: 2rpx;
	background: #22c55e;
	transform: translateX(-50%);
}

.refund-tabs {
	display: flex;
	height: 64rpx;
	border-top: 1rpx solid #f0f0f0;
}

.refund-tab-item {
	flex: 1;
	position: relative;
	color: #777;
	font-size: 24rpx;
	line-height: 64rpx;
	text-align: center;
}

.refund-tab-item.active {
	color: #22c55e;
	font-weight: 600;
}

.refund-tab-item.active::after {
	content: '';
	position: absolute;
	left: 50%;
	bottom: 0;
	width: 34rpx;
	height: 4rpx;
	border-radius: 2rpx;
	background: #22c55e;
	transform: translateX(-50%);
}

.page {
	padding: 24rpx;
}

.order-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.order-card {
	background: #fff;
	border-radius: 8rpx;
	padding: 24rpx;
}

.order-title-row,
.leader-order-row,
.order-total-row,
.order-footer,
.order-actions {
	display: flex;
	align-items: center;
}

.order-title-row,
.order-total-row,
.order-footer {
	justify-content: space-between;
}

.group-no {
	color: #444;
}

.order-status-pill {
	padding: 6rpx 14rpx;
	border-radius: 6rpx;
	font-size: 22rpx;
}

.order-status-pill.warning,
.order-status-pill.primary {
	color: #b26a00;
	background: #fff5df;
}

.order-status-pill.success {
	color: #16803b;
	background: #e7f7ec;
}

.order-status-pill.danger {
	color: #d33b2e;
	background: #ffece9;
}

.order-status-pill.muted {
	color: #888;
	background: #f2f2f2;
}

.order-time {
	margin-top: 12rpx;
	color: #999;
	font-size: 24rpx;
}

.leader-order-row {
	gap: 12rpx;
	padding: 20rpx 0;
	font-size: 26rpx;
}

.leader-order-row image {
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
}

.activity-name {
	flex: 1;
	color: #666;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.order-product {
	display: flex;
	gap: 20rpx;
	padding: 16rpx 0;
	border-top: 1rpx solid #f1f1f1;
}

.product-image,
.product-image image {
	width: 140rpx;
	height: 140rpx;
	border-radius: 8rpx;
	background: #f5f5f5;
}

.product-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.product-name {
	font-size: 28rpx;
	color: #222;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.product-spec {
	font-size: 24rpx;
	color: #999;
}

.product-status-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6rpx;
	margin-top: 6rpx;
}

.product-status {
	padding: 1rpx 6rpx;
	border-radius: 4rpx;
	font-size: 18rpx;
	line-height: 28rpx;
}

.product-status.pending {
	color: #d78320;
	background: #fff6e8;
}

.product-status.verified {
	color: #13a953;
	background: #edf9f1;
}

.product-status.processing {
	color: #e97a26;
	background: #fff3eb;
}

.product-status.refunded {
	color: #8a6390;
	background: #f7eff9;
}

.product-price-num {
	display: flex;
	justify-content: space-between;
}

.product-price {
	color: #ff4d4f;
	font-size: 28rpx;
}

.label {
	font-size: 20rpx;
}

.product-num {
	color: #999;
	font-size: 26rpx;
}

.order-total-row {
	padding-top: 18rpx;
	font-size: 26rpx;
}

.total-price {
	color: #ff4d4f;
	font-size: 32rpx;
	font-weight: 600;
	margin-left: 6rpx;
}

.station-card {
	margin-top: 18rpx;
	padding: 18rpx;
	background: #f8f8f8;
	border-radius: 8rpx;
	color: #666;
	font-size: 24rpx;
	line-height: 38rpx;
}

.station-title {
	color: #222;
	font-weight: 600;
	margin-bottom: 8rpx;
}

.copy-btn {
	color: #22c55e;
	margin-left: 12rpx;
}

.order-footer {
	padding-top: 20rpx;
}

.order-actions {
	gap: 16rpx;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.action-btn {
	padding: 12rpx 24rpx;
	border-radius: 8rpx;
	font-size: 24rpx;
	border: 1rpx solid #ddd;
	color: #666;
}

.action-btn.confirm {
	background: #22c55e;
	color: #fff;
	border-color: #22c55e;
}

.action-btn.confirm2 {
	background: #ff4d4f;
	color: #fff;
	border-color: #ff4d4f;
}

.action-btn.confirm3 {
	color: #999;
	background: #f2f2f2;
}

.action-btn.refund {
	color: #ff4d4f;
	border-color: #ff4d4f;
}

.empty-state,
.load-more,
.no-more {
	padding: 60rpx 0;
	text-align: center;
	color: #999;
	font-size: 26rpx;
}

.load-more,
.no-more {
	padding: 24rpx 0;
}
</style>
