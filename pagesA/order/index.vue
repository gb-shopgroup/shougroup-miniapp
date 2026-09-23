<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="leader-nav" :style="miniNavBarStyle()">
			<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
			<text class="title" :style="miniNavTitleStyle()">{{ pageTitle }}</text>
			<text class="nav-space"></text>
		</view>

		<!-- 两套头部：控制台入口是团购+日期筛选器；团购详情入口是自提点筛选+金额概览+商品汇总。
		     注意：v-if 与 v-else 之间不能夹注释，否则小程序模板编译会断掉 else 链导致两块同时渲染。 -->
		<view v-if="!fromGroupDetail" class="filter-row">
			<view class="filter-cell">
				<picker class="filter-picker" :range="groupList" range-key="name" :value="groupIndex" @change="onGroupChange">
					<view class="filter-value">{{ currentGroupName }}</view>
				</picker>
			</view>
			<view class="filter-cell">
				<view class="filter-picker" @click="openDatePicker">
					<view class="filter-value date-value" :class="{ selected: hasDateRange }">
						<text v-if="!hasDateRange">全部日期</text>
						<text v-if="hasDateRange">{{ dateRange.start }}</text>
						<text v-if="hasDateRange">至 {{ dateRange.end }}</text>
					</view>
				</view>
			</view>
		</view>

		<view v-else class="detail-head">
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
		</view>

		<!-- 搜索框：控制台入口是圆角框+放大镜（无按钮）；团购详情入口保持现状（搜索框+搜索按钮） -->
		<view v-if="!fromGroupDetail" class="order-search order-search-global">
			<view class="search-icon"></view>
			<input v-model="orderKeyword" class="order-search-input" placeholder="手机号/商品" confirm-type="search" @confirm="searchOrder" />
		</view>

		<view v-else class="order-search">
			<input v-model="orderKeyword" class="order-search-input" placeholder="商品名称/手机号" confirm-type="search" @confirm="searchOrder" />
			<text class="order-search-btn" @click="searchOrder">搜索</text>
		</view>

		<view class="tabs">
			<view v-for="tab in mainTabs" :key="tab.key" class="tab" :class="{ active: activeMainTab === tab.key }" @click="switchMainTab(tab.key)">
				{{ tab.text }}
			</view>
		</view>

		<view v-if="currentSubTabs.length" :key="'sub-tabs-' + activeMainTab" class="sub-tabs">
			<view v-for="tab in currentSubTabs" :key="activeMainTab + '-' + tab.key" class="sub-tab" :class="{ active: isActiveSubTab(tab.key) }" @click="switchSubTab(tab.key)">
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
					<view class="goods-main">
						<text class="goods-name">{{ goods.name || '商品名称' }}<text v-if="goods.num"> +{{ goods.num }}件</text></text>
						<text v-if="goods.specText" class="goods-spec">{{ goods.specText }}</text>
					</view>
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

				<!-- 核销记录：只在已发生过核销的订单上展示（待收货订单必然为空）；
				     文档说明 verifyRecords 仅详情接口填充，故展开时才按订单号拉一次详情并缓存 -->
				<view v-if="activeMainTab === 'writeOff' && showVerifyRecords(order)" class="verify-records">
					<view class="verify-records-head" @click.stop="toggleVerifyRecords(order)">
						<text class="verify-records-title">核销记录</text>
						<text class="verify-records-toggle">{{ isVerifyRecordsExpanded(order) ? '收起' : '展开' }}</text>
					</view>
					<view v-if="isVerifyRecordsExpanded(order)" class="verify-records-body">
						<view v-if="isVerifyRecordsLoading(order)" class="verify-records-empty">加载中...</view>
						<view v-else-if="getVerifyRecords(order).length === 0" class="verify-records-empty">暂无核销记录</view>
						<view v-for="(record, index) in getVerifyRecords(order)" :key="record.id || index" class="verify-records-row">
							<text v-for="(segment, i) in getVerifyRecordSegments(record)" :key="i">{{ segment.text }}<text v-if="segment.qty" class="verify-qty">{{ segment.qty }}</text></text>
						</view>
					</view>
				</view>

				<!-- 操作行：只要「还有可核销商品」或「有售后信息」就渲染。
				     修复前整行挂在 hasAfterSalesDetail 上，导致纯「部分收货」订单（未申请过售后）
				     连核销入口都没有。 -->
				<view v-if="activeMainTab !== 'refund' && (canOpenVerifyDetail(order) || hasAfterSalesDetail(order))" class="refund-actions">
					<view class="refund-btn" @click.stop="goOrderDetail(order, canOpenVerifyDetail(order) ? 'verify' : 'view')">
						{{ canOpenVerifyDetail(order) ? '核销订单' : '查看订单' }}
					</view>
					<view v-if="hasAfterSalesDetail(order)" class="refund-btn primary" @click.stop="goRefundDetail(order)">查看售后</view>
				</view>

				<view v-if="activeMainTab === 'refund'" class="refund-actions">
					<view v-if="canOpenVerifyDetail(order)" class="refund-btn" @click.stop="goOrderDetail(order, 'verify')">核销订单</view>
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

		<!-- 日期筛选弹层：开始 ~ 结束，交互与对账单一致。
		     必须放在两个头部分支之外，否则会插在 v-if/v-else 之间把 else 链断给弹层。 -->
		<view v-if="datePickerVisible" class="date-mask" @click="closeDatePicker">
			<view class="date-sheet" @click.stop>
				<view class="sheet-header">
					<text>选择日期</text>
					<text class="sheet-close" @click="closeDatePicker">×</text>
				</view>
				<text class="date-tip">自定义日期</text>
				<view class="date-inputs">
					<picker mode="date" :value="dateDraft.start" @change="onDraftDateChange('start', $event)">
						<view class="date-input">{{ dateDraft.start || '开始时间' }}</view>
					</picker>
					<text class="date-separator">~</text>
					<picker mode="date" :value="dateDraft.end" @change="onDraftDateChange('end', $event)">
						<view class="date-input">{{ dateDraft.end || '结束时间' }}</view>
					</picker>
				</view>
				<view class="date-actions">
					<text @click="clearDate">清除筛选</text>
					<text class="date-confirm" @click="confirmDate">确定</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import RefundReason from "./refundReason.vue"
import { getRefundRecords } from "@/api/group.js"
import { normalizeMemberRefundRecord } from "@/utils/memberOrder.js"
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
	buildLeaderOrderScanTarget,
	buildLeaderRefundListRequest,
	buildRefundSelectionForOrder,
	buildRefundApprovalPayload,
	buildLeaderRefundSelection,
	canLeaderOrderShowVerifyRecords,
	canLeaderOrderVerify,
	buildLeaderVerifyRecordSegments,
	isLeaderRefundApprovalEmpty,
	normalizeLeaderDashboardSummary,
	normalizeLeaderGoodsSummaryItem,
	normalizeLeaderOrder,
	parseLeaderOrderScanResult,
} from "@/utils/leaderOrder.js"
import { pickActionErrorMessage, showActionError } from "@/utils/feedback.js"

export default {
	components: { RefundReason },
	data() {
		return {
			mainTabs: ORDER_TABS,
			refundTabs: REFUND_TABS,
			writeOffTabs: WRITE_OFF_TABS,
			activeMainTab: 'all',
			activeWriteOffSubTab: WRITE_OFF_TABS[0].key,
			activeRefundSubTab: REFUND_TABS[0].key,
			orderKeyword: '',
			summaryKeyword: '',
			// 两种入口：控制台进入为全局视图（顶部是团购 + 日期筛选器），
			// 团购详情进入带 groupId，团固定，沿用自提点筛选 + 金额概览 + 商品汇总。
			fromGroupDetail: false,
			// 售后申请记录：按订单号缓存（内联同意/不同意时需要 refundGoodsMsg 才能构造审核体）
			refundRecordsMap: {},
			// 核销记录：按订单号缓存（展开时才拉详情），以及展开态/加载态
			verifyRecordsMap: {},
			verifyRecordsExpandedMap: {},
			verifyRecordsLoadingMap: {},
			dateRange: { start: '', end: '' },
			dateDraft: { start: '', end: '' },
			datePickerVisible: false,
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
		// 全局视图没有自提点筛选器，也不展示金额/商品汇总：不重新套用已保存的自提点筛选，也不拉汇总数据
		if (!this.fromGroupDetail) {
			this.refreshOrders()
			return
		}
		const pointChanged = this.syncPointFilterFromStorage()
		if (pointChanged) this.resetGoodsSummaryState()
		this.refreshOrders()
		this.loadDashboard()
		this.loadGoodsSummary(true)
	},
	computed: {
		// 控制台入口按设计稿标题为「订单」，团购详情入口沿用「查看订单」
		pageTitle() {
			if (this.activeMainTab === 'writeOff') return '商品核销'
			return this.fromGroupDetail ? '查看订单' : '订单'
		},
		currentGroupName() {
			return this.groupList[this.groupIndex] ? this.groupList[this.groupIndex].name : '选择团'
		},
		hasDateRange() {
			return Boolean(this.dateRange.start && this.dateRange.end)
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
			},
			activeSubTab() {
				if (this.activeMainTab === 'writeOff') return this.activeWriteOffSubTab
				if (this.activeMainTab === 'refund') return this.activeRefundSubTab
				return ''
			}
	},
	onLoad(options) {
		const action = options && options.action ? String(options.action) : ''
		// 团购详情入口会带 groupId：团固定、走完整视图；控制台入口不带，走全局筛选视图。
		const routeGroupId = Number((options && options.groupId) || 0)
		this.fromGroupDetail = routeGroupId > 0
		this.groupId = routeGroupId
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
			// 全局视图顶部是筛选器，不展示金额概览与商品汇总，无需拉取对应数据
			await this.refreshOrders()
			if (this.fromGroupDetail) {
				await Promise.all([
					this.loadDashboard(),
					this.loadGoodsSummary(true)
				])
			}
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
				if (this.fromGroupDetail) {
					this.syncPointFilterFromStorage()
				} else {
					// 控制台入口是全局订单视图，不套用历史保存的自提点筛选
					this.pointIndex = 0
					this.pointId = 0
				}
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
		// ---------- 核销记录（列表卡片内展示）----------
		showVerifyRecords(order = {}) {
			return canLeaderOrderShowVerifyRecords(order)
		},
		isVerifyRecordsExpanded(order = {}) {
			return Boolean(this.verifyRecordsExpandedMap[order.orderNo || ''])
		},
		isVerifyRecordsLoading(order = {}) {
			return Boolean(this.verifyRecordsLoadingMap[order.orderNo || ''])
		},
		getVerifyRecords(order = {}) {
			return this.verifyRecordsMap[order.orderNo || ''] || []
		},
		// 核销记录按段渲染：数量+单位单独一段，页面用红色强调
		getVerifyRecordSegments(record) {
			return buildLeaderVerifyRecordSegments(record)
		},
		async toggleVerifyRecords(order = {}) {
			const orderNo = order.orderNo || ''
			if (!orderNo) return
			const expanded = !this.verifyRecordsExpandedMap[orderNo]
			this.verifyRecordsExpandedMap = Object.assign({}, this.verifyRecordsExpandedMap, { [orderNo]: expanded })
			if (!expanded) return
			// 已加载过（含空数组）不重复请求
			if (this.verifyRecordsMap[orderNo]) return
			// 列表接口若已下发核销记录，直接用，省一次请求（文档说列表不填充，留作兼容）
			if (Array.isArray(order.verifyRecords) && order.verifyRecords.length) {
				this.verifyRecordsMap = Object.assign({}, this.verifyRecordsMap, { [orderNo]: order.verifyRecords })
				return
			}
			this.verifyRecordsLoadingMap = Object.assign({}, this.verifyRecordsLoadingMap, { [orderNo]: true })
			try {
				// verifyRecords 仅订单详情接口下发，故展开时按订单号拉一次详情
				const res = await getLeaderOrderInfo({ orderNo })
				const records = normalizeLeaderOrder(res.data || {}).verifyRecords
				this.verifyRecordsMap = Object.assign({}, this.verifyRecordsMap, { [orderNo]: records })
			} catch (err) {
				console.log('加载核销记录失败：', err)
				this.verifyRecordsMap = Object.assign({}, this.verifyRecordsMap, { [orderNo]: [] })
			} finally {
				this.verifyRecordsLoadingMap = Object.assign({}, this.verifyRecordsLoadingMap, { [orderNo]: false })
			}
		},
		// 日期筛选：弹层里选开始/结束，交互与对账单页一致
		openDatePicker() {
			this.dateDraft = { start: this.dateRange.start, end: this.dateRange.end }
			this.datePickerVisible = true
		},
		closeDatePicker() {
			this.datePickerVisible = false
			this.dateDraft = { start: this.dateRange.start, end: this.dateRange.end }
		},
		onDraftDateChange(key, event) {
			this.dateDraft[key] = (event && event.detail && event.detail.value) || ''
		},
		// 清回「全部日期」，并按无日期条件重新拉取
		clearDate() {
			this.dateRange = { start: '', end: '' }
			this.dateDraft = { start: '', end: '' }
			this.datePickerVisible = false
			this.refreshOrders()
		},
		confirmDate() {
			const { start, end } = this.dateDraft
			if (!start || !end) {
				uni.showToast({ title: '请选择开始和结束日期', icon: 'none' })
				return
			}
			if (start > end) {
				uni.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
				return
			}
			this.dateRange = { start, end }
			this.datePickerVisible = false
			this.refreshOrders()
		},
			getCurrentStatuses() {
				if (this.activeMainTab === 'writeOff') {
					const tab = this.writeOffTabs.find(item => item.key === this.activeWriteOffSubTab) || this.writeOffTabs[0]
					return tab.statuses
				}
				return []
			},
			getCurrentApplyStatus() {
				if (this.activeMainTab !== 'refund') return 0
				const tab = this.refundTabs.find(item => item.key === this.activeRefundSubTab) || this.refundTabs[0]
				return tab.applyStatus
			},
		async fetchOrderPage() {
			const input = {
				keyword: this.orderKeyword,
				groupId: this.groupId,
				pointId: this.pointId,
				// 日期筛选成对下发（yyyy-MM-dd），未选择时为「全部日期」
				startDate: this.dateRange.start,
				endDate: this.dateRange.end,
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
				groupId: this.groupId,
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
				this.activeWriteOffSubTab = this.writeOffTabs[0].key
			},
			switchMainTab(key) {
				this.activeMainTab = key
				if (key === 'writeOff') this.activeWriteOffSubTab = this.writeOffTabs[0].key
				else if (key === 'refund') this.activeRefundSubTab = this.refundTabs[0].key
				this.goodsExpanded = false
				this.refreshOrders()
			},
			isActiveSubTab(key) {
				return this.activeSubTab === key
			},
			switchSubTab(key) {
				if (this.activeMainTab === 'writeOff') this.activeWriteOffSubTab = key
				else if (this.activeMainTab === 'refund') this.activeRefundSubTab = key
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
			return order.statusText
		},
		orderStatusTone(order) {
			return this.activeMainTab === 'refund' ? order.refundTone : order.statusTone
		},
			refundStatusText(order) {
				if (order.refundStatusText && order.refundStatusText !== '售后') return order.refundStatusText
				const tab = this.refundTabs.find(item => item.key === this.activeRefundSubTab)
				if (tab && Number(tab.applyStatus || 0) > 0) return tab.text
				return '待处理退货'
			},
		isPendingRefundOrder(order) {
			return this.refundStatusText(order) === '待处理退货'
		},
		// 列表接口不下发 refundGoodsMsg，必须按订单号单独取售后申请记录，
		// 否则构造不出 refundGoodsMap（修复前会发出 refundGoodsMap:{} 的非法审核体）。
		// 返回 { records, failed }：failed 用于区分「记录加载失败」与「确认无可退商品」。
		async loadOrderRefundRecords(orderNo) {
			const key = orderNo || ''
			if (!key) return { records: [], failed: false }
			if (this.refundRecordsMap[key]) return { records: this.refundRecordsMap[key], failed: false }
			try {
				const res = await getRefundRecords({ orderNo: key })
				const data = res && res.data
				const rows = ['records', 'refundRecords', 'recodes', 'history', 'logs']
					.reduce((result, field) => result.length ? result : (Array.isArray(data && data[field]) ? data[field] : []), [])
				const records = rows.map(item => normalizeMemberRefundRecord(item))
				this.refundRecordsMap = Object.assign({}, this.refundRecordsMap, { [key]: records })
				return { records, failed: false }
			} catch (err) {
				console.log('加载售后申请记录失败：', err)
				return { records: [], failed: true }
			}
		},
		async buildOrderRefundSelection(order = {}) {
			const loaded = await this.loadOrderRefundRecords(order.orderNo)
			if (loaded.failed) return { selection: {}, failed: true }
			const records = loaded.records
			const applyRecord = records.find(item => item.statusKey === 'pending' && item.refundGoodsMsg) ||
				records.find(item => item.statusKey === 'pending') || null
			const refundFlag = Number(order.refundFlag || (applyRecord && applyRecord.refundFlag) || 0)
			const selection = buildLeaderRefundSelection(Object.assign({}, order, { refundFlag }), {
				refundGoodsMsg: (applyRecord && applyRecord.refundGoodsMsg) || ''
			})
			return { selection, failed: false }
		},
		approveRefund(order) {
			uni.showModal({
				title: '确认退款',
				content: '确认同意该售后退款吗？',
				success: async res => {
					if (!res.confirm) return
					await this.submitRefundApproval(order, REFUND_APPROVE_STATUS.AGREE, '')
				}
			})
		},
		async openRejectReason(order) {
			const built = await this.buildOrderRefundSelection(order)
			if (built.failed) {
				uni.showToast({ title: '售后记录加载失败，请重试', icon: 'none' })
				return
			}
			this.$refs.RefundReasonRef.show({ orderNo: order.orderNo, selection: built.selection })
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
			const built = await this.buildOrderRefundSelection(order)
			if (built.failed) {
				uni.showToast({ title: '售后记录加载失败，请重试', icon: 'none' })
				return
			}
			const payload = buildRefundApprovalPayload({ selection: built.selection, status, reason })
			// 内层 refundGoodsMap 为空同样非法（orderGoodsId/refundNum 必填），一律不发请求
			if (isLeaderRefundApprovalEmpty(payload)) {
				// 提示后要立刻跳售后详情：toast 会被跳转打断，改用 modal 由用户确认后再跳
				showActionError('未获取到退款商品，请进入售后详情处理', {
					title: '无法处理',
					confirmText: '查看详情',
					success: () => this.goRefundDetail(order),
					fail: () => this.goRefundDetail(order)
				})
				return
			}
			try {
				// silentToast：退款失败原文由本页 modal 展示，请求层不再重复弹 toast
				await approveLeaderRefundOrder(payload, { silentToast: true })
				uni.showToast({ title: status === REFUND_APPROVE_STATUS.AGREE ? '退款成功' : '已拒绝', icon: 'success' })
				this.refreshOrders()
				this.loadDashboard()
				this.loadGoodsSummary(true)
			} catch (err) {
				showActionError(pickActionErrorMessage(err, '处理失败'), { title: '处理失败' })
			}
		},
		openOrder(order) {
			if (this.activeMainTab === 'refund') {
				this.goRefundDetail(order)
				return
			}
			this.goOrderDetail(order, this.canOpenVerifyDetail(order) ? 'verify' : 'view')
		},
		canOpenVerifyDetail(order = {}) {
			return canLeaderOrderVerify(order)
		},
		hasAfterSalesDetail(order = {}) {
			if ([4, 5].includes(Number(order.status))) return true
			if (order.statusKey === 'afterSales' || order.statusKey === 'refunded') return true
			if (order.refundStatusText && order.refundStatusText !== '售后') return true
			return (order.goods || []).some(goods =>
				Number(goods.applyRefund || 0) > 0 ||
				Number(goods.refundNum || 0) > 0 ||
				Number(goods.refundGoodsNum || 0) > 0
			)
		},
		parseScanResult(res) {
			return parseLeaderOrderScanResult(res)
		},
		async openScannedOrder(scan) {
			if (!scan.orderNo) {
				uni.showToast({ title: '请扫描用户订单核销码', icon: 'none' })
				return
			}
			try {
				let order = null
				// 带核销码时优先走扫码接口；该接口契约把 receiptCode 标为必填，
				// 后端未下发核销码或校验失败时退回订单号查询。
				if (scan.receiptCode) {
					try {
						order = (await scanLeaderOrderQRCode({
							orderNo: scan.orderNo,
							receiptCode: scan.receiptCode
						})).data
					} catch (err) {
						console.log('扫码核销接口失败，改用订单号查询：', err)
						order = null
					}
				}
				if (!order) {
					order = (await getLeaderOrderInfo({ orderNo: scan.orderNo })).data
				}
				const target = this.resolveScannedOrder(order)
				if (!target) {
					uni.showToast({ title: '没有找到订单', icon: 'none' })
					return
				}
				// 扫码直接进订单详情：可核销进核销模式，不可核销只读查看，不再落到订单列表。
				this.goOrderDetail(target.order, target.mode)
			} catch (err) {
				console.log('扫码查单失败：', err)
				uni.showToast({ title: '扫码查询失败', icon: 'none' })
			}
		},
		resolveScannedOrder(order) {
			if (!order) return null
			const normalized = normalizeLeaderOrder(order)
			if (!normalized.orderNo) return null
			return {
				order: normalized,
				mode: buildLeaderOrderScanTarget(normalized).mode
			}
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
			const orderNo = encodeURIComponent(order.orderNo || '')
			uni.navigateTo({
				url: '/pagesA/order/detail?orderNo=' + orderNo + '&mode=' + mode,
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

/* 控制台入口的顶部筛选器：左右各占一半、各自居中，底部一条分割线（对齐设计稿） */
/* 核销记录（列表卡片内）：与详情页同款展开/收起样式 */
.verify-records {
	margin-top: 18rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid #f0f0f0;
}

.verify-records-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.verify-records-title {
	color: #222;
	font-size: 26rpx;
}

.verify-records-toggle {
	color: #888;
	font-size: 24rpx;
}

.verify-records-row {
	padding-top: 16rpx;
	color: #777;
	font-size: 24rpx;
	line-height: 34rpx;
}

.verify-qty {
	color: #ff3b22;
}

.verify-records-empty {
	padding-top: 20rpx;
	color: #999;
	font-size: 24rpx;
	text-align: center;
}

.filter-row {
	display: flex;
	align-items: center;
	background: #fff;
	border-bottom: 1rpx solid #ececec;
}

.filter-cell {
	flex: 1;
	min-width: 0;
	position: relative;
}

/* picker 在真机上是块级且占满整格，必须靠内层 text-align 居中，布局不能交给 justify-content */
.filter-picker {
	display: block;
	padding: 30rpx 0;
	text-align: center;
}

.filter-value {
	display: inline-block;
	position: relative;
	padding-right: 26rpx;
	font-size: 30rpx;
	color: #222;
	white-space: nowrap;
}

/* 细线 chevron 箭头，画法与本页 .point-filter 一致 */
.filter-value::after {
	content: "";
	position: absolute;
	right: 6rpx;
	top: 50%;
	width: 12rpx;
	height: 12rpx;
	border-right: 2rpx solid #b8b8b8;
	border-bottom: 2rpx solid #b8b8b8;
	transform: translateY(-70%) rotate(45deg);
}

/* 日期区显示「开始 / 至 结束」两行，样式与对账单页一致；箭头仍由 .filter-value::after 提供 */
.date-value {
	display: inline-flex;
	flex-direction: column;
	align-items: flex-start;
	max-width: 300rpx;
	line-height: 34rpx;
}

.date-value text {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.date-value.selected {
	font-size: 26rpx;
}

/* 日期弹层：与对账单页保持同一套样式 */
.date-mask {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 90;
	display: flex;
	align-items: flex-end;
	background: rgba(0, 0, 0, .45);
}

.date-sheet {
	width: 100%;
	padding: 28rpx 28rpx calc(32rpx + env(safe-area-inset-bottom));
	background: #fff;
	box-sizing: border-box;
}

.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-bottom: 26rpx;
	border-bottom: 1rpx solid #eee;
	font-size: 34rpx;
	font-weight: 500;
}

.sheet-close {
	width: 44rpx;
	height: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1rpx solid #aaa;
	border-radius: 50%;
	color: #888;
	font-size: 32rpx;
	line-height: 40rpx;
}

.date-tip {
	display: block;
	margin: 52rpx 0 20rpx;
	color: #999;
	font-size: 27rpx;
}

.date-inputs {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.date-inputs picker {
	flex: 1;
	min-width: 0;
}

.date-input {
	height: 76rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f7f7f7;
	color: #999;
	font-size: 28rpx;
}

.date-separator {
	color: #777;
	font-size: 30rpx;
}

.date-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 38rpx;
	color: #1fbd66;
	font-size: 28rpx;
}

.date-confirm {
	flex: 1;
	height: 82rpx;
	margin-left: 38rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #22c55e;
	color: #fff;
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

/* 控制台入口：设计稿左右各约 62rpx 边距，放大镜 + 占位居中 */
.order-search-global {
	width: 626rpx;
	margin-top: 26rpx;
}

.search-icon {
	position: relative;
	flex-shrink: 0;
	width: 14rpx;
	height: 14rpx;
	margin-right: 10rpx;
	border: 4rpx solid #bbb;
	border-radius: 50%;
	box-sizing: content-box;
}

.search-icon::after {
	content: "";
	position: absolute;
	right: -10rpx;
	bottom: -7rpx;
	width: 12rpx;
	height: 4rpx;
	background: #bbb;
	transform: rotate(45deg);
	border-radius: 2rpx;
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

.goods-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
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

.goods-spec {
	margin-top: 4rpx;
	color: #999;
	font-size: 23rpx;
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
