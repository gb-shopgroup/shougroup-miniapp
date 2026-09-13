<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="reconcile-nav" :style="miniNavBarStyle()">
			<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
			<text class="nav-title" :style="miniNavTitleStyle()">对账单</text>
		</view>

		<!-- 筛选区：切换汇总维度与对账时间范围。 -->
		<view class="filter-bar">
			<view class="filter-item mode-filter" @click="modePickerVisible = !modePickerVisible">
				<text>{{ currentMode.text }}</text><view class="arrow"></view>
				<view v-if="modePickerVisible" class="mode-menu" @click.stop>
					<view v-for="mode in modes" :key="mode.key" class="mode-option" :class="{ active: mode.key === displayMode }" @click="changeDisplayMode(mode.key)">{{ mode.text }}</view>
				</view>
			</view>
			<view class="filter-item date-filter" @click="openDatePicker">
				<view class="date-filter-text" :class="{ selected: hasDateRange }">
					<text v-if="!hasDateRange">选择日期</text>
					<text v-if="hasDateRange">{{ dateRange.start }}</text>
					<text v-if="hasDateRange">至 {{ dateRange.end }}</text>
				</view>
				<view class="arrow"></view>
			</view>
		</view>

		<!-- 汇总区：始终与当前展示方式、日期筛选使用相同接口参数。 -->
		<view class="summary-row">
			<view class="summary-item"><text class="summary-value">{{ summary.validCount }}</text><text class="summary-label">有效订单</text></view>
			<view class="summary-item"><text class="summary-value">¥{{ formatAmount(summary.orderAmount) }}</text><text class="summary-label">订单总金额</text></view>
			<view class="summary-item"><text class="summary-value">¥{{ formatAmount(summary.refundAmount) }}</text><text class="summary-label">退款总金额</text></view>
		</view>

		<view class="table-head">
			<text class="name-column">{{ displayMode === 'goods' ? '商品名称' : '订单号' }}</text>
			<text>订单金额</text>
			<text>退款金额</text>
		</view>
		<view class="table-list">
			<view v-for="item in rows" :key="item.key" class="table-row">
				<text class="name-column" selectable>{{ displayMode === 'goods' ? item.goodsName : (item.orderNo || '--') }}</text>
				<text>¥{{ formatAmount(item.orderAmount) }}</text>
				<text>¥{{ formatAmount(item.refundAmount) }}</text>
			</view>
			<view v-if="!loading && rows.length === 0" class="empty">{{ emptyText }}</view>
			<view v-if="loading" class="empty">加载中...</view>
		</view>

		<view v-if="datePickerVisible" class="mask date-mask" @click="closeDatePicker">
			<view class="date-sheet" @click.stop>
				<view class="sheet-header"><text>选择日期</text><text class="sheet-close" @click="closeDatePicker">×</text></view>
				<text class="date-tip">自定义日期</text>
				<view class="date-inputs">
					<picker mode="date" :value="dateDraft.start" @change="onDraftDateChange('start', $event)"><view class="date-input">{{ dateDraft.start || '开始时间' }}</view></picker>
					<text class="date-separator">~</text>
					<picker mode="date" :value="dateDraft.end" @change="onDraftDateChange('end', $event)"><view class="date-input">{{ dateDraft.end || '结束时间' }}</view></picker>
				</view>
				<view class="date-actions"><text @click="clearDate">清除筛选</text><text class="date-confirm" @click="confirmDate">确定</text></view>
			</view>
		</view>
	</view>
</template>

<script>
import { getLeaderBillList } from "@/api/leader.js"
import {
	RECONCILIATION_DISPLAY_MODES,
	buildLeaderReconciliationParams,
	getLeaderReconciliationMode,
	normalizeLeaderReconciliationRow,
	normalizeLeaderReconciliationSummary,
	resolveLeaderReconciliationList
} from "@/utils/leaderReconciliation.js"

export default {
	data() {
		return {
			modes: RECONCILIATION_DISPLAY_MODES,
			displayMode: 'goods',
			dateRange: { start: '', end: '' },
			dateDraft: { start: '', end: '' },
			modePickerVisible: false,
			datePickerVisible: false,
			page: 1,
			pageSize: 20,
			rows: [],
			summary: { validCount: 0, orderAmount: 0, refundAmount: 0 },
			loading: false
		}
	},
	computed: {
		currentMode() {
			return getLeaderReconciliationMode(this.displayMode)
		},
		hasDateRange() {
			return Boolean(this.dateRange.start && this.dateRange.end)
		},
		emptyText() {
			return this.hasDateRange ? '暂无对账数据' : '请选择日期后查看对账单'
		}
	},
	onPullDownRefresh() {
		this.loadReconciliation(() => uni.stopPullDownRefresh())
	},
	methods: {
		buildRequestInput() {
			return {
				mode: this.displayMode,
				startDate: this.dateRange.start,
				endDate: this.dateRange.end,
				page: this.page,
				pageSize: this.pageSize
			}
		},
		async loadReconciliation(callback) {
			if (!this.hasDateRange) {
				this.resetReconciliation()
				if (callback) callback()
				return
			}
			if (this.loading) return
			this.loading = true
			const input = this.buildRequestInput()
			try {
				const res = await getLeaderBillList(buildLeaderReconciliationParams(input))
				const billData = res.data || {}
				this.rows = resolveLeaderReconciliationList(billData).map((item, index) => normalizeLeaderReconciliationRow(item, this.displayMode, index))
				this.summary = normalizeLeaderReconciliationSummary(billData)
			} catch (err) {
				this.resetReconciliation()
				console.log('加载对账单失败：', err)
				uni.showToast({ title: '加载对账单失败', icon: 'none' })
			} finally {
				this.loading = false
				if (callback) callback()
			}
		},
		changeDisplayMode(mode) {
			this.displayMode = mode
			this.modePickerVisible = false
			this.loadReconciliation()
		},
		openDatePicker() {
			this.dateDraft = { start: this.dateRange.start, end: this.dateRange.end }
			this.datePickerVisible = true
		},
		onDraftDateChange(key, event) {
			this.dateDraft[key] = event.detail.value || ''
		},
		resetReconciliation() {
			this.rows = []
			this.summary = { validCount: 0, orderAmount: 0, refundAmount: 0 }
		},
		closeDatePicker() {
			this.datePickerVisible = false
			this.dateDraft = { start: this.dateRange.start, end: this.dateRange.end }
		},
		clearDate() {
			this.dateRange = { start: '', end: '' }
			this.dateDraft = { start: '', end: '' }
			this.datePickerVisible = false
			this.resetReconciliation()
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
			this.loadReconciliation()
		},
		formatAmount(value) {
			return Number(value || 0).toFixed(2)
		},
		goBack() {
			uni.navigateBack({ delta: 1, fail: () => uni.redirectTo({ url: '/pagesA/dashboard/index' }) })
		}
	}
}
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background: #fff; color: #222; }
.reconcile-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 80; background: #fff; border-bottom: 1rpx solid #f3f3f3; box-sizing: border-box; }
.nav-back { position: absolute; left: 26rpx; width: 36rpx; height: 36rpx; }
.nav-title { position: absolute; left: 160rpx; right: 160rpx; color: #111; font-size: 34rpx; font-weight: 500; text-align: center; }
.filter-bar { position: relative; z-index: 30; display: flex; height: 112rpx; border-top: 1rpx solid #f3f3f3; border-bottom: 1rpx solid #f3f3f3; }
.filter-item { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; font-size: 28rpx; }
.date-filter { border-left: 1rpx solid #f3f3f3; }
.date-filter-text { min-width: 0; max-width: 260rpx; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; line-height: 34rpx; }
.date-filter-text text { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.date-filter-text.selected { font-size: 26rpx; }
.arrow { width: 12rpx; height: 12rpx; margin-top: -6rpx; border-right: 2rpx solid #999; border-bottom: 2rpx solid #999; box-sizing: border-box; transform: rotate(45deg); }
.summary-row { display: flex; padding: 36rpx 22rpx 32rpx; border-bottom: 1rpx solid #f3f3f3; }
.summary-item { flex: 1; min-width: 0; text-align: center; }
.summary-value { display: block; font-size: 30rpx; line-height: 42rpx; color: #222; white-space: nowrap; }
.summary-label { display: block; margin-top: 4rpx; font-size: 24rpx; color: #999; }
.table-head, .table-row { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(120rpx, .85fr) minmax(120rpx, .85fr); column-gap: 10rpx; align-items: center; padding: 0 28rpx; }
.table-head { height: 78rpx; color: #333; font-size: 26rpx; border-bottom: 1rpx solid #f3f3f3; }
.table-head text:not(:first-child), .table-row text:not(:first-child) { text-align: right; }
.table-row { min-height: 84rpx; color: #333; font-size: 26rpx; border-bottom: 1rpx solid #f6f6f6; }
.name-column { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 90rpx 0; color: #999; font-size: 27rpx; text-align: center; }
.mask { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 40; background: rgba(0, 0, 0, .45); }
.mode-menu { position: absolute; top: 100%; left: 50%; z-index: 31; width: 190rpx; overflow: hidden; background: #fff; border: 1rpx solid #eee; box-shadow: 0 0 18rpx rgba(0, 0, 0, .16); transform: translateX(-50%); }
.mode-option { height: 72rpx; display: flex; align-items: center; padding: 0 22rpx; font-size: 27rpx; }
.mode-option.active { color: #1fbd66; }
.date-mask { display: flex; align-items: flex-end; }
.date-sheet { width: 100%; padding: 28rpx 28rpx calc(32rpx + env(safe-area-inset-bottom)); background: #fff; box-sizing: border-box; }
.sheet-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 26rpx; border-bottom: 1rpx solid #eee; font-size: 34rpx; font-weight: 500; }
.sheet-close { width: 44rpx; height: 44rpx; display: flex; align-items: center; justify-content: center; border: 1rpx solid #aaa; border-radius: 50%; color: #888; font-size: 32rpx; line-height: 40rpx; }
.date-tip { display: block; margin: 52rpx 0 20rpx; color: #999; font-size: 27rpx; }
.date-inputs { display: flex; align-items: center; gap: 20rpx; }
.date-inputs picker { flex: 1; min-width: 0; }
.date-input { height: 76rpx; display: flex; align-items: center; justify-content: center; background: #f7f7f7; color: #999; font-size: 28rpx; }
.date-separator { color: #777; font-size: 30rpx; }
.date-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 38rpx; color: #1fbd66; font-size: 28rpx; }
.date-confirm { flex: 1; height: 82rpx; margin-left: 38rpx; display: flex; align-items: center; justify-content: center; background: #22c55e; color: #fff; }
</style>
