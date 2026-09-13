<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="leader-nav" :style="miniNavBarStyle()">
			<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
			<text class="title" :style="miniNavTitleStyle()">{{ activeMainTab === 'writeOff' ? '商品核销' : '查看订单' }}</text>
			<text class="nav-space"></text>
		</view>

		<view class="overview">
			<picker :range="pointList" range-key="name" :value="pointIndex" @change="onPointChange">
				<view class="point-filter">{{ pointFilterName }}</view>
			</picker>
			<view class="money-row">
				<view class="money-item">
					<text class="money-value">{{ orderSummary.validCount }}</text>
					<text class="money-label">有效订单</text>
				</view>
				<view class="money-item">
					<text class="money-value">¥{{ formatAmount(orderSummary.orderAmount) }}</text>
					<text class="money-label">订单总金额</text>
				</view>
				<view class="money-item">
					<text class="money-value">¥{{ formatAmount(orderSummary.refundAmount) }}</text>
					<text class="money-label">退款总金额</text>
				</view>
			</view>
		</view>

		<view class="product-summary">
			<view class="product-summary-head">
				<view>
					<text class="product-total">共有{{ goodsTotalNum }}件商品</text>
					<text class="product-pending">待核销{{ goodsPendingNum }}件</text>
				</view>
				<view class="summary-search" @click.stop>
					<input v-model="summaryKeyword" class="summary-search-input" placeholder="商品名称" confirm-type="search" @confirm="searchGoodsSummary" />
					<text class="summary-search-btn" @click="searchGoodsSummary">搜索</text>
				</view>
			</view>
			<view v-for="item in visibleGoodsSummary" :key="item.key" class="product-row">
				<text class="product-name">{{ item.name }}{{ item.specText ? '+' + item.specText : '' }}</text>
				<text class="product-num">共{{ item.totalNum }}件，待核销{{ item.pendingNum }}件</text>
			</view>
			<view v-if="goodsSummary.length > 4 || goodsSummaryHasMore" class="summary-toggle" @click="toggleGoodsSummary">
				{{ goodsExpanded ? '收起' : '展开' }}
			</view>
		</view>

		<view class="order-search">
			<input v-model="orderKeyword" class="order-search-input" placeholder="商品名称/手机号" confirm-type="search" @confirm="searchOrder" />
			<text class="order-search-btn" @click="searchOrder">搜索</text>
		</view>

		<view class="tabs">
			<view v-for="tab in mainTabs" :key="tab.key" class="tab" :class="{ active: activeMainTab === tab.key }" @click="switchMainTab(tab.key)">
				{{ tab.text }}
			</view>
		</view>

		<view v-if="currentSubTabs.length" class="sub-tabs">
			<view v-for="tab in currentSubTabs" :key="tab.key" class="sub-tab" :class="{ active: activeSubTab === tab.key }" @click="switchSubTab(tab.key)">
				{{ tab.text }}
			</view>
		</view>

		<view class="page">
			<view v-for="order in orderList" :key="order.orderNo" class="order-card" @click="openOrder(order)">
				<view class="order-header">
					<view class="order-no">跟团号：<text>{{ order.orderNo }}</text></view>
					<view class="status" :class="orderStatusTone(order)">{{ orderStatusText(order) }}</view>
				</view>

				<view class="buyer-row">
					<image class="buyer-avatar" :src="order.avatar || '/static/image/head.png'" mode="aspectFill"></image>
					<text class="buyer-name">{{ order.nickname || order.trueName || '团员' }}</text>
				</view>

				<view v-for="goods in order.goods" :key="goods.id || goods.goodsId" class="goods-row">
					<text class="goods-name">{{ goods.name || '商品名称' }}<text v-if="goods.num"> +{{ goods.num }}件</text></text>
					<text class="goods-price">¥ {{ formatAmount(goodsDisplayAmount(order, goods)) }}</text>
				</view>

				<view class="summary-row">
					<text class="order-time">{{ order.orderTime || '--' }}</text>
					<text>共{{ orderGoodsCount(order) }}件</text>
					<text>实收￥{{ formatAmount(orderDisplayAmount(order)) }}</text>
				</view>

				<view v-if="activeMainTab !== 'refund' || order.refundStatusText !== '未同意'" class="station">
					<view class="station-title">服务驿站</view>
					<view class="station-contact">
						<text>{{ order.pointName || order.trueName || '未选择服务驿站' }}</text>
						<text v-if="order.mobile" class="phone" @click.stop="callPhone(order.mobile)">{{ order.mobile }}</text>
					</view>
					<view class="station-address">
						<text>{{ order.pointAddress || '--' }}</text>
						<text class="copy" @click.stop="copyStation(order)">复制</text>
					</view>
				</view>

				<view v-else-if="order.reason || order.refundDesc" class="reject-reason">
					未同意：{{ order.reason || order.refundDesc }}
				</view>

				<view v-if="activeMainTab === 'refund'" class="refund-actions">
					<template v-if="isPendingRefundOrder(order)">
						<view class="refund-btn" @click.stop="openRejectReason(order)">不同意退款</view>
						<view class="refund-btn primary" @click.stop="approveRefund(order)">同意退款</view>
					</template>
					<view v-else class="refund-btn" @click.stop="goRefundDetail(order)">查看详情</view>
				</view>
			</view>

			<view v-if="!loading && orderList.length === 0" class="empty">暂无订单</view>
			<view v-if="loading" class="empty">加载中...</view>
			<view v-else-if="orderList.length" class="more">{{ hasMore ? '上拉加载更多' : '没有更多订单了' }}</view>
		</view>
		<RefundReason ref="RefundReasonRef" @childEvent="rejectRefund" />
	</view>
</template>

<script>
import RefundReason from "./refundReason.vue"
import {
	approveLeaderRefundOrder,
	getLeaderGroupList,
	getLeaderPointList,
	getLeaderOrderInfo,
	getLeaderOrderList,
	getLeaderRefundOrderList,
	getSummaryOrderGoodsInfo,
	getSummaryOrderInfo,
	scanLeaderOrderQRCode
} from "@/api/leader.js"
import { getCurrentLeaderPointId, normalizeLeaderPoint } from "@/utils/leaderConfig.js"
import {
	ORDER_TABS,
	REFUND_TABS,
	REFUND_APPROVE_STATUS,
	WRITE_OFF_TABS,
	buildLeaderOrderListRequest,
	buildLeaderRefundListRequest,
	buildRefundSelectionForOrder,
	buildRefundApprovalPayload,
	normalizeLeaderDashboardSummary,
	normalizeLeaderGoodsSummaryItem,
	normalizeLeaderOrder,
	parseLeaderOrderScanResult,
} from "@/utils/leaderOrder.js"

export default {
	components: { RefundReason },
	data() {
		return {
			mainTabs: ORDER_TABS,
			refundTabs: REFUND_TABS,
			writeOffTabs: WRITE_OFF_TABS,
			activeMainTab: 'all',
			activeSubTab: '',
			orderKeyword: '',
			summaryKeyword: '',
			dateLabel: '全部日期',
			dateRange: { start: '', end: '' },
			groupList: [{ id: 0, name: '选择团' }],
			groupIndex: 0,
			groupId: 0,
			pointList: [{ id: 0, name: '全部自提点' }],
			pointIndex: 0,
			pointId: 0,
			orderList: [],
			orderSummary: { validCount: 0, orderAmount: 0, refundAmount: 0 },
			goodsSummary: [],
			goodsSummaryTotal: 0,
			goodsSummaryPendingTotal: 0,
			goodsSummaryPage: 1,
			goodsSummaryPageSize: 20,
			goodsSummaryHasMore: false,
			goodsExpanded: false,
			page: 1,
			pageSize: 10,
			hasMore: false,
			loading: false,
			pageReady: false,
			pendingLaunchScan: null
		}
	},
	onShow() {
		if (!this.pageReady) return
		const pointChanged = this.syncPointFilterFromStorage()
		if (pointChanged) this.resetGoodsSummaryState()
		this.refreshOrders()
		this.loadDashboard()
		this.loadGoodsSummary(true)
	},
	computed: {
		currentGroupName() {
			return this.groupList[this.groupIndex] ? this.groupList[this.groupIndex].name : '选择团'
		},
		pointFilterName() {
			return this.pointList[this.pointIndex] ? this.pointList[this.pointIndex].name : '全部自提点'
		},
		visibleGoodsSummary() {
			return this.goodsExpanded ? this.goodsSummary : this.goodsSummary.slice(0, 4)
		},
		goodsTotalNum() {
			return this.goodsSummaryTotal
		},
		goodsPendingNum() {
			return this.goodsSummaryPendingTotal
		},
		currentSubTabs() {
			if (this.activeMainTab === 'writeOff') return this.writeOffTabs
			if (this.activeMainTab === 'refund') return this.refundTabs
			return []
		}
	},
	onLoad(options) {
		const action = options && options.action ? String(options.action) : ''
		const launchScan = this.parseScanResult(options)
		if (action === 'verify' || action === 'scan') this.applyWriteOffMode()
		if (launchScan.orderNo) this.pendingLaunchScan = launchScan
		this.initPage().then(() => {
			if (this.pendingLaunchScan) {
				const scan = this.pendingLaunchScan
				this.pendingLaunchScan = null
				this.openScannedOrder(scan)
				return
			}
			if (action === 'scan') this.scanOrder()
		})
	},
	onPullDownRefresh() {
		this.refreshOrders(() => uni.stopPullDownRefresh())
	},
	onReachBottom() {
		this.loadMoreOrders()
	},
	methods: {
		async initPage() {
			await Promise.all([this.initGroupList(), this.initPointList()])
			await Promise.all([
				this.refreshOrders(),
				this.loadDashboard(),
				this.loadGoodsSummary(true)
			])
			this.pageReady = true
		},
		async initPointList() {
			try {
				const res = await getLeaderPointList({ name: '' })
				const data = Array.isArray(res.data) ? res.data : []
				const activePoints = data
					.map(normalizeLeaderPoint)
					.filter(item => Number(item.isClose || 0) === 0)
				this.pointList = [{ id: 0, name: '全部自提点' }].concat(activePoints)
				this.syncPointFilterFromStorage()
			} catch (err) {
				console.log('初始化自提点列表失败：', err)
				this.pointList = [{ id: 0, name: '全部自提点' }]
				this.pointIndex = 0
				this.pointId = 0
			}
		},
		resolveCurrentPointId() {
			return Number(getCurrentLeaderPointId() || 0)
		},
		syncPointFilterFromStorage() {
			const previousPointId = Number(this.pointId || 0)
			const selectedPointId = this.resolveCurrentPointId()
			const selectedIndex = selectedPointId
				? this.pointList.findIndex(item => Number(item.id || 0) === selectedPointId)
				: 0
			this.pointIndex = selectedIndex >= 0 ? selectedIndex : 0
			const current = this.pointList[this.pointIndex]
			this.pointId = current ? Number(current.id || 0) : 0
			if (selectedPointId && selectedIndex < 0) uni.setStorageSync('leader_select_pid', '')
			return previousPointId !== this.pointId
		},
		resetGoodsSummaryState() {
			this.goodsExpanded = false
			this.goodsSummaryPage = 1
			this.goodsSummary = []
			this.goodsSummaryHasMore = false
		},
		async initGroupList() {
			try {
				const res = await getLeaderGroupList({ cat: 0, catId: 0, status: 0, page: 1, pageSize: 100 })
				const data = res.data || []
				const groups = Array.isArray(data) ? data : (Array.isArray(data.list) ? data.list : [])
				this.groupList = [{ id: 0, name: '选择团' }].concat(groups.map(item => ({
					id: item.id || item.groupId || 0,
					name: item.name || item.groupName || item.title || '未命名团购'
				})))
			} catch (err) {
				console.log('初始化团购列表失败：', err)
			}
		},
		onGroupChange(e) {
			this.groupIndex = Number(e.detail.value)
			const group = this.groupList[this.groupIndex]
			this.groupId = group ? Number(group.id) : 0
			this.refreshOrders()
			this.loadDashboard()
		},
		onPointChange(e) {
			this.pointIndex = Number(e.detail.value)
			const point = this.pointList[this.pointIndex]
			this.pointId = point ? Number(point.id || 0) : 0
			uni.setStorageSync('leader_select_pid', this.pointId || '')
			this.resetGoodsSummaryState()
			this.refreshOrders()
			this.loadDashboard()
			this.loadGoodsSummary(true)
		},
		onDateChange(e) {
			this.dateRange.start = e.detail.value
			this.dateRange.end = e.detail.value
			this.dateLabel = e.detail.value || '全部日期'
		},
		getCurrentStatuses() {
			if (this.activeMainTab === 'writeOff') {
				const tab = this.writeOffTabs.find(item => item.key === this.activeSubTab) || this.writeOffTabs[0]
				return tab.statuses
			}
			return []
		},
		getCurrentApplyStatus() {
			if (this.activeMainTab !== 'refund') return 0
			const tab = this.refundTabs.find(item => item.key === this.activeSubTab) || this.refundTabs[0]
			return tab.applyStatus
		},
		async fetchOrderPage() {
			const input = {
				keyword: this.orderKeyword,
				groupId: this.groupId,
				pointId: this.pointId,
				page: this.page,
				pageSize: this.pageSize
			}
			let responses
			if (this.activeMainTab === 'refund') {
				responses = [await getLeaderRefundOrderList(buildLeaderRefundListRequest(Object.assign({}, input, {
					applyStatus: this.getCurrentApplyStatus()
				})))]
			} else {
				const requests = buildLeaderOrderListRequest(Object.assign({}, input, { statuses: this.getCurrentStatuses() }))
				responses = Array.isArray(requests)
					? await Promise.all(requests.map(item => getLeaderOrderList(item)))
					: [await getLeaderOrderList(requests)]
			}
			const seen = {}
			const rows = []
			responses.forEach(res => {
				const data = res.data || []
				const list = Array.isArray(data) ? data : (Array.isArray(data.list) ? data.list : [])
				list.forEach(item => {
					const order = normalizeLeaderOrder(item)
					if (order.orderNo && !seen[order.orderNo]) {
						seen[order.orderNo] = true
						rows.push(order)
					}
				})
			})
			return rows
		},
		async refreshOrders(callback) {
			this.page = 1
			this.orderList = []
			await this.loadOrders(callback)
		},
		async loadOrders(callback) {
			if (this.loading) return
			this.loading = true
			try {
				const list = await this.fetchOrderPage()
				this.orderList = this.page === 1 ? list : this.orderList.concat(list)
				this.hasMore = list.length >= this.pageSize
			} catch (err) {
				console.log('加载订单失败：', err)
				uni.showToast({ title: '加载订单失败', icon: 'none' })
			} finally {
				this.loading = false
				if (callback) callback()
			}
		},
		buildDashboardParams() {
			const params = {
				groupId: this.groupId,
				pointId: this.pointId
			}
			if (this.dateRange.start) params.start = this.dateRange.start
			if (this.dateRange.end) params.end = this.dateRange.end
			return params
		},
		resolveList(data) {
			if (Array.isArray(data)) return data
			if (data && Array.isArray(data.list)) return data.list
			return []
		},
		async loadDashboard() {
			const params = this.buildDashboardParams()
			try {
				const orderRes = await getSummaryOrderInfo(params)
				this.orderSummary = normalizeLeaderDashboardSummary(orderRes.data || {})
			} catch (err) {
				console.log('加载订单看板失败：', err)
			}
		},
		async loadGoodsSummary(reset = false) {
			if (reset) {
				this.goodsSummaryPage = 1
				this.goodsSummary = []
			}
			const params = {
				pointId: this.pointId,
				keyword: this.summaryKeyword.trim(),
				page: this.goodsSummaryPage,
				pageSize: this.goodsSummaryPageSize
			}
			try {
				const goodsRes = await getSummaryOrderGoodsInfo(params)
				const data = goodsRes.data || {}
				const list = this.resolveList(data)
					.map(normalizeLeaderGoodsSummaryItem)
					.filter(item => item.totalNum > 0 || item.pendingNum > 0)
				this.goodsSummary = this.goodsSummaryPage === 1 ? list : this.goodsSummary.concat(list)
				this.goodsSummaryTotal = Number(data.goodsTotal || list.length || 0)
				this.goodsSummaryPendingTotal = Number(data.unVerifyTotal || 0)
				this.goodsSummaryHasMore = list.length >= this.goodsSummaryPageSize
			} catch (err) {
				console.log('加载商品统计失败：', err)
			}
		},
		loadMoreOrders() {
			if (this.loading || !this.hasMore) return
			this.page += 1
			this.loadOrders()
		},
		applyWriteOffMode() {
			this.activeMainTab = 'writeOff'
			this.activeSubTab = this.writeOffTabs[0].key
		},
		switchMainTab(key) {
			this.activeMainTab = key
			if (key === 'writeOff') this.activeSubTab = this.writeOffTabs[0].key
			else if (key === 'refund') this.activeSubTab = this.refundTabs[0].key
			else this.activeSubTab = ''
			this.goodsExpanded = false
			this.refreshOrders()
		},
		switchSubTab(key) {
			this.activeSubTab = key
			this.refreshOrders()
		},
		searchOrder() {
			this.refreshOrders()
		},
		searchGoodsSummary() {
			this.goodsSummaryPage = 1
			this.goodsSummary = []
			this.goodsExpanded = true
			this.loadGoodsSummary()
		},
		toggleGoodsSummary() {
			if (this.goodsExpanded) {
				this.goodsExpanded = false
				return
			}
			this.goodsExpanded = true
			if (this.goodsSummaryHasMore) {
				this.goodsSummaryPage += 1
				this.loadGoodsSummary()
			}
		},
		formatAmount(value) {
			return Number(value || 0).toFixed(2)
		},
		goodsDisplayAmount(order, goods) {
			if (this.activeMainTab === 'refund' && this.refundStatusText(order) === '待处理退货') {
				return Number(goods.refundAmount || 0)
			}
			return Number(goods.price || 0)
		},
		orderDisplayAmount(order) {
			if (this.activeMainTab === 'refund' && this.refundStatusText(order) === '待处理退货') {
				const total = (order.goods || []).reduce((sum, goods) => sum + Number(goods.refundAmount || 0), 0)
				if (total > 0) return Number(total.toFixed(2))
			}
			return Number(order.orderPrice || 0)
		},
		orderGoodsCount(order) {
			return (order.goods || []).reduce((sum, item) => sum + Number(item.num || 0), 0)
		},
		orderStatusText(order) {
			if (this.activeMainTab === 'refund') return this.refundStatusText(order)
			if (order.status === 1) return '待提货'
			if (order.status === 2) return '部分提货'
			if (order.status === 3) return '已提货'
			return order.statusText
		},
		orderStatusTone(order) {
			return this.activeMainTab === 'refund' ? order.refundTone : order.statusTone
		},
		refundStatusText(order) {
			if (order.refundStatusText && order.refundStatusText !== '售后') return order.refundStatusText
			const tab = this.refundTabs.find(item => item.key === this.activeSubTab)
			if (tab && Number(tab.applyStatus || 0) > 0) return tab.text
			return '待处理退货'
		},
		isPendingRefundOrder(order) {
			return this.refundStatusText(order) === '待处理退货'
		},
		buildOrderRefundSelection(order) {
			return buildRefundSelectionForOrder(order)
		},
		approveRefund(order) {
			uni.showModal({
				title: '确认退款',
				content: '确认同意该售后退款吗？',
				success: res => {
					if (!res.confirm) return
					this.submitRefundApproval(order, REFUND_APPROVE_STATUS.AGREE, '')
				}
			})
		},
		openRejectReason(order) {
			this.$refs.RefundReasonRef.show({ orderNo: order.orderNo, selection: this.buildOrderRefundSelection(order) })
		},
		rejectRefund(data) {
			const order = this.orderList.find(item => item.orderNo === data.orderNo)
			if (!order) {
				uni.showToast({ title: '售后订单不存在', icon: 'none' })
				return
			}
			this.submitRefundApproval(order, REFUND_APPROVE_STATUS.REJECT, data.val)
		},
		async submitRefundApproval(order, status, reason) {
			const selection = this.buildOrderRefundSelection(order)
			const payload = Object.keys(selection).length > 0
				? buildRefundApprovalPayload({ selection, status, reason })
				: this.buildOrderOnlyRefundPayload(order, status, reason)
			try {
				await approveLeaderRefundOrder(payload)
				uni.showToast({ title: status === REFUND_APPROVE_STATUS.AGREE ? '退款成功' : '已拒绝', icon: 'success' })
				this.refreshOrders()
				this.loadDashboard()
				this.loadGoodsSummary(true)
			} catch (err) {
				uni.showToast({ title: String((err && (err.msg || err.message)) || '处理失败'), icon: 'none' })
			}
		},
		buildOrderOnlyRefundPayload(order, status, reason) {
			const orderNo = order.orderNo || ''
			const refundFlag = Number(order.refundFlag || 0)
			const payload = {
				refundOrderGoodsMap: orderNo ? {
					[orderNo]: Object.assign({ orderNo, refundGoodsMap: {} }, refundFlag > 0 ? { refundFlag } : {})
				} : {},
				status: Number(status)
			}
			if (Number(status) === REFUND_APPROVE_STATUS.REJECT) payload.reason = reason || ''
			return payload
		},
		openOrder(order) {
			this.activeMainTab === 'refund' ? this.goRefundDetail(order) : this.goOrderDetail(order, this.activeMainTab === 'writeOff' ? 'verify' : 'view')
		},
		parseScanResult(res) {
			return parseLeaderOrderScanResult(res)
		},
		async openScannedOrder(scan) {
			if (!scan.orderNo || !scan.isVerificationCode) {
				uni.showToast({ title: '核销码无效', icon: 'none' })
				return
			}
			try {
				const order = scan.receiptCode
					? (await scanLeaderOrderQRCode({ orderNo: scan.orderNo, receiptCode: scan.receiptCode })).data
					: (await getLeaderOrderInfo({ orderNo: scan.orderNo })).data
				if (order) this.showScannedOrder(normalizeLeaderOrder(order))
				else uni.showToast({ title: '没有找到订单', icon: 'none' })
			} catch (err) {
				uni.showToast({ title: '扫码查询失败', icon: 'none' })
			}
		},
		showScannedOrder(order) {
			this.applyWriteOffMode()
			if (Number(order.status) === 2) this.activeSubTab = 'partial'
			else if (Number(order.status) === 3) this.activeSubTab = 'done'
			this.orderKeyword = order.mobile || order.telephone || order.orderNo || ''
			this.orderList = order.orderNo ? [order] : []
			this.hasMore = false
			this.loading = false
			this.loadDashboard()
			this.loadGoodsSummary(true)
		},
		scanOrder() {
			uni.scanCode({
				success: async res => {
					const scan = this.parseScanResult(res)
					this.openScannedOrder(scan)
				}
			})
		},
		goOrderDetail(order, mode = 'view') {
			const payload = Object.assign({}, order, { _mode: mode })
			uni.navigateTo({
				url: '/pagesA/order/detail',
				success: res => res.eventChannel.emit('sendParams', payload)
			})
		},
		goRefundDetail(order) {
			const orderNo = encodeURIComponent(order.orderNo || '')
			uni.navigateTo({
				url: '/pagesA/order/refundDetail?orderNo=' + orderNo,
				success: res => res.eventChannel.emit('sendParams', order)
			})
		},
		callPhone(mobile) {
			if (mobile) uni.makePhoneCall({ phoneNumber: String(mobile) })
		},
		copyStation(order) {
			uni.setClipboardData({ data: [order.pointName, order.pointAddress].filter(Boolean).join(' ') })
		},
		goBack() {
			uni.navigateBack({ delta: 1 })
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f7f7f7;
	color: #222;
	box-sizing: border-box;
}

.leader-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	background: #fff;
	box-sizing: border-box;
}

.back {
	position: absolute;
	left: 28rpx;
	display: flex;
	align-items: center;
	font-size: 50rpx;
	color: #666;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	font-size: 34rpx;
	font-weight: 500;
	text-align: center;
}

.overview,
.product-summary {
	background: #fff;
	box-sizing: border-box;
}

.overview {
	padding: 20rpx 24rpx 24rpx;
}

.point-filter {
	position: relative;
	width: 220rpx;
	margin: 0 auto 34rpx;
	padding-right: 24rpx;
	font-size: 28rpx;
	color: #333;
	text-align: center;
	white-space: nowrap;
	box-sizing: border-box;
}

.point-filter::after {
	content: "";
	position: absolute;
	right: 8rpx;
	top: 50%;
	width: 12rpx;
	height: 12rpx;
	border-right: 2rpx solid #999;
	border-bottom: 2rpx solid #999;
	transform: translateY(-70%) rotate(45deg);
}

.money-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.money-item {
	flex: 1;
	min-width: 0;
	text-align: center;
}

.money-value,
.money-label {
	display: block;
}

.money-value {
	font-size: 32rpx;
	color: #222;
	line-height: 44rpx;
}

.money-label {
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #999;
}

.product-summary {
	margin-top: 12rpx;
	padding: 20rpx 28rpx 18rpx;
}

.product-summary-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
	margin-bottom: 12rpx;
}

.product-total,
.product-pending {
	display: block;
	line-height: 34rpx;
}

.product-total {
	font-size: 25rpx;
	font-weight: 600;
	color: #222;
}

.product-pending {
	margin-top: 4rpx;
	font-size: 23rpx;
	color: #999;
}

.summary-search {
	display: flex;
	align-items: center;
	width: 250rpx;
	height: 42rpx;
	padding: 0 16rpx;
	background: #f4f4f4;
	border-radius: 22rpx;
	box-sizing: border-box;
}

.summary-search-input {
	flex: 1;
	min-width: 0;
	height: 38rpx;
	min-height: 38rpx;
	font-size: 23rpx;
	line-height: 38rpx;
	color: #333;
}

.summary-search-btn {
	margin-left: 8rpx;
	font-size: 23rpx;
	color: #20c46a;
	white-space: nowrap;
}

.order-search {
	display: flex;
	align-items: center;
	width: 540rpx;
	height: 42rpx;
	margin: 14rpx auto 0;
	padding: 0 18rpx;
	background: #f4f4f4;
	border-radius: 22rpx;
	box-sizing: border-box;
}

.order-search-input {
	flex: 1;
	min-width: 0;
	height: 38rpx;
	min-height: 38rpx;
	font-size: 23rpx;
	line-height: 38rpx;
	color: #ff4b4b;
	text-align: center;
}

.order-search-btn {
	margin-left: 12rpx;
	font-size: 23rpx;
	color: #20c46a;
	white-space: nowrap;
}

.product-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 54rpx;
	font-size: 25rpx;
	color: #333;
}

.product-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.product-num {
	margin-left: 16rpx;
	font-size: 23rpx;
	color: #999;
	white-space: nowrap;
}

.summary-toggle {
	padding-top: 8rpx;
	text-align: center;
	font-size: 24rpx;
	color: #999;
}

.tabs {
	display: flex;
	align-items: center;
	height: 84rpx;
	background: #fff;
	border-bottom: 1rpx solid #e8e8e8;
}

.tab {
	position: relative;
	flex: 1;
	height: 84rpx;
	line-height: 84rpx;
	text-align: center;
	font-size: 28rpx;
	color: #222;
}

.tab.active {
	color: #16b75b;
}

.tab.active::after,
.sub-tab.active::after {
	content: "";
	position: absolute;
	left: 50%;
	bottom: 0;
	width: 2em;
	height: 5rpx;
	background: #20c46a;
	transform: translateX(-50%);
}

.sub-tabs {
	display: flex;
	align-items: center;
	height: 78rpx;
	background: #fff;
	border-bottom: 1rpx solid #ededed;
}

.sub-tab {
	position: relative;
	flex: 1;
	height: 78rpx;
	line-height: 78rpx;
	text-align: center;
	font-size: 24rpx;
	color: #222;
}

.page {
	padding: 16rpx 18rpx 48rpx;
	box-sizing: border-box;
}

.order-card {
	margin-bottom: 16rpx;
	padding: 22rpx 26rpx;
	background: #fff;
	border-radius: 8rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	box-sizing: border-box;
}

.order-header,
.buyer-row,
.goods-row,
.summary-row,
.station-contact,
.station-address,
.refund-actions {
	display: flex;
	align-items: center;
}

.order-header {
	justify-content: space-between;
	padding-bottom: 22rpx;
	border-bottom: 1rpx solid #f1f1f1;
}

.order-no {
	font-size: 32rpx;
	color: #222;
}

.order-no text {
	color: #ff2d1f;
}

.status {
	max-width: 270rpx;
	padding: 8rpx 18rpx;
	font-size: 24rpx;
	line-height: 30rpx;
	color: #ff4b25;
	background: #fff2ee;
	border-radius: 28rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.status.success {
	color: #20c46a;
	background: #eaf9f0;
}

.status.danger {
	color: #ff4b25;
	background: #fff2ee;
}

.status.muted {
	color: #999;
	background: #f4f4f4;
}

.buyer-row {
	padding: 20rpx 0 8rpx;
}

.buyer-avatar {
	width: 70rpx;
	height: 70rpx;
	border-radius: 4rpx;
	background: #eee;
}

.buyer-name {
	margin-left: 18rpx;
	font-size: 28rpx;
	color: #222;
}

.goods-row {
	justify-content: space-between;
	min-height: 50rpx;
	font-size: 26rpx;
	color: #333;
}

.goods-name {
	min-width: 0;
	flex: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.goods-price {
	margin-left: 20rpx;
	white-space: nowrap;
}

.summary-row {
	justify-content: flex-end;
	gap: 18rpx;
	margin-top: 10rpx;
	font-size: 25rpx;
	color: #333;
}

.order-time {
	margin-right: auto;
	color: #999;
	font-size: 23rpx;
}

.station,
.reject-reason {
	margin-top: 18rpx;
	padding: 18rpx 26rpx;
	background: #f7f7f7;
	border-radius: 8rpx;
	box-sizing: border-box;
}

.station-title {
	position: relative;
	padding-left: 34rpx;
	font-size: 28rpx;
	color: #222;
}

.station-title::before {
	content: "";
	position: absolute;
	left: 0;
	top: 5rpx;
	width: 20rpx;
	height: 20rpx;
	border: 4rpx solid #20c46a;
	border-radius: 50%;
	box-sizing: border-box;
}

.station-contact,
.station-address {
	margin-top: 12rpx;
	font-size: 25rpx;
	color: #777;
}

.phone {
	margin-left: 14rpx;
	color: #777;
}

.copy {
	margin-left: auto;
	padding: 2rpx 10rpx;
	font-size: 22rpx;
	color: #777;
	background: #eee;
	border: 1rpx solid #ddd;
	border-radius: 4rpx;
}

.reject-reason {
	font-size: 25rpx;
	color: #333;
}

.refund-actions {
	justify-content: flex-end;
	gap: 20rpx;
	margin-top: 18rpx;
}

.refund-btn {
	min-width: 128rpx;
	height: 56rpx;
	line-height: 56rpx;
	text-align: center;
	font-size: 28rpx;
	color: #222;
	background: #fff;
	border: 1rpx solid #ddd;
	border-radius: 6rpx;
}

.refund-btn.primary {
	color: #fff;
	background: #20c46a;
	border-color: #20c46a;
}

.empty,
.more {
	padding: 60rpx 0;
	text-align: center;
	color: #999;
	font-size: 26rpx;
}

.more {
	padding: 24rpx 0;
}
</style>
