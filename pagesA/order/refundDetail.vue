<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="leader-nav" :style="miniNavBarStyle()">
			<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
			<text class="title" :style="miniNavTitleStyle()">售后详情</text>
			<text class="nav-space"></text>
		</view>

		<view class="page" v-if="loading">
			<view class="empty">售后详情加载中</view>
		</view>

		<view class="page" v-else>
			<view class="status-panel">
				<text class="status-title">{{ statusTitle }}</text>
				<text v-if="isPending" class="status-desc">团员申请退款</text>
			</view>

			<view class="section">
				<view class="section-head">
					<text class="section-title">退款金额</text>
					<text class="amount">¥{{ refundAmount }}</text>
				</view>
				<text class="member">售后类型：{{ refundTypeText }}</text>
				<text class="member">{{ order.nickname || order.trueName || '团员' }}申请退款</text>
			</view>

			<view class="section">
				<text class="section-title">退款明细</text>
				<view v-for="goods in order.goods" :key="goods.id" class="goods-row">
					<image :src="goods.img" class="goods-image" mode="aspectFill" />
					<view class="goods-content">
						<text class="goods-name">{{ goods.name }}</text>
						<view class="goods-footer">
							<text class="goods-price">¥{{ goods.price }}</text>
							<text class="goods-num">退款 {{ refundNumForGoods(goods) }}{{ goods.unit }}</text>
						</view>
					</view>
				</view>
				<view v-if="order.goods.length === 0" class="empty">暂无退款商品</view>
			</view>

			<view class="section">
				<text class="section-title">申请原因</text>
				<text class="content">{{ order.reason || '未填写' }}</text>
				<text class="section-title sub-title">补充说明</text>
				<text class="content">{{ order.refundDesc || '未填写' }}</text>
				<view v-if="order.images.length" class="image-list">
					<image v-for="(image, index) in order.images" :key="index" :src="image" class="refund-image" mode="aspectFill" />
				</view>
				<view class="info-row"><text class="label">申请时间</text><text class="value">{{ order.applyTime || '---' }}</text></view>
			</view>

			<view class="section">
				<text class="section-title">售后历史</text>
			<view v-for="(item, index) in displayHistory" :key="index" class="history-row">
				<text class="history-content">{{ item.content || item.remark || item.reason || item.statusText || '售后处理记录' }}</text>
				<text class="history-time">{{ item.time || item.createTime || item.applyTime || '' }}</text>
			</view>
			<view v-if="displayHistory.length === 0" class="empty">暂无售后历史</view>
			</view>
		</view>

		<view v-if="isPending" class="bottom-bar">
			<view class="action secondary" @click="openRejectReason">不同意</view>
			<view class="action primary" @click="approveRefund">同意</view>
		</view>
		<RefundReason ref="RefundReasonRef" @childEvent="rejectRefund" />
	</view>
</template>

<script>
import RefundReason from "./refundReason.vue"
import { approveLeaderRefundOrder, getLeaderOrderInfo } from "@/api/leader.js"
import { getRefundRecords } from "@/api/group.js"
import { normalizeMemberRefundRecord } from "@/utils/memberOrder.js"
import {
	REFUND_APPROVE_STATUS,
	buildRefundApprovalPayload,
	buildRefundSelectionForOrder,
	normalizeLeaderOrder
} from "@/utils/leaderOrder.js"

export default {
	components: { RefundReason },
	data() {
		return {
			orderNo: '',
			order: normalizeLeaderOrder({}),
			loading: false
		}
	},
	computed: {
		isPending() {
			return this.order.refundStatusText === '待处理退货'
		},
		refundAmount() {
			let total = 0
			this.order.goods.forEach(goods => {
				if (Number(goods.applyRefund || 0) === 1 || Number(goods.refundNum || 0) > 0 || Number(goods.refundGoodsNum || 0) > 0) {
					total += Number((Number(goods.price || 0) * this.refundNumForGoods(goods)).toFixed(2))
				}
			})
			return Number(total.toFixed(2))
		},
		refundTypeText() {
			return Number(this.order.refundFlag) === 1 ? '仅退款' : (Number(this.order.refundFlag) === 2 ? '退款退货' : '退款')
		},
		statusTitle() {
			if (this.isPending) return '待团长处理'
			if (this.order.refundStatusText === '已退货') return '已退货' + this.refundAmount + '元'
			if (this.order.refundStatusText === '未同意') return '未同意'
			return this.order.refundStatusText || '售后详情'
		},
		displayHistory() {
			if (Array.isArray(this.order.history) && this.order.history.length) return this.order.history
			if (!this.order.orderNo) return []
			return [{
				content: `${this.order.nickname || this.order.trueName || '团员'}申请退款`,
				time: this.order.applyTime || '',
				reason: this.order.reason || ''
			}]
		}
	},
	onLoad(options = {}) {
		this.orderNo = options.orderNo || options.id || ''
		const channel = this.getOpenerEventChannel && this.getOpenerEventChannel()
		if (channel && channel.on) {
			channel.on('sendParams', data => {
				this.applyOrder(data)
				this.loadOrderDetail()
			})
		}
		if (this.orderNo) this.loadOrderDetail()
	},
	methods: {
		applyOrder(data = {}) {
			this.order = normalizeLeaderOrder(Object.assign({}, this.order, data))
			this.orderNo = this.order.orderNo || this.orderNo
		},
		async loadOrderDetail() {
			if (!this.orderNo || this.loading) return
			this.loading = true
			try {
				const [detailResult, recordsResult] = await Promise.allSettled([
					getLeaderOrderInfo({ orderNo: this.orderNo }),
					getRefundRecords({ orderNo: this.orderNo })
				])
				if (detailResult.status === 'fulfilled') this.applyOrder(detailResult.value.data || {})
				if (recordsResult.status === 'fulfilled') {
					const records = this.getRefundHistoryRows(recordsResult.value.data)
					if (records.length) {
						this.order = Object.assign({}, this.order, {
							history: records.map(normalizeMemberRefundRecord)
						})
					}
				}
			} catch (err) {
				console.log('加载团长售后详情失败：', err)
			} finally {
				this.loading = false
			}
		},
		getRefundHistoryRows(data) {
			if (Array.isArray(data)) return data
			if (!data || typeof data !== 'object') return []
			return ['records', 'refundRecords', 'recodes', 'history', 'logs']
				.reduce((result, key) => result.length ? result : (Array.isArray(data[key]) ? data[key] : []), [])
		},
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		buildSingleSelection() {
			return buildRefundSelectionForOrder(this.order)
		},
		refundNumForGoods(goods) {
			return Number(this.order.refundFlag) === 1 ? (goods.refundNum || goods.num) : (goods.refundGoodsNum || goods.num)
		},
		approveRefund() {
			uni.showModal({
				title: '确认退款',
				content: '确认同意该售后退款吗？',
				success: res => {
					if (!res.confirm) return
					this.submitRefundApproval(REFUND_APPROVE_STATUS.AGREE, '')
				}
			})
		},
		openRejectReason() {
			this.$refs.RefundReasonRef.show({ orderNo: this.order.orderNo, selection: this.buildSingleSelection() })
		},
		rejectRefund(data) {
			this.submitRefundApproval(REFUND_APPROVE_STATUS.REJECT, data.val)
		},
		async submitRefundApproval(status, reason) {
			const selection = this.buildSingleSelection()
			const payload = buildRefundApprovalPayload({ selection, status, reason })
			try {
				await approveLeaderRefundOrder(payload)
				uni.showToast({ title: status === REFUND_APPROVE_STATUS.AGREE ? '退款成功' : '已拒绝', icon: 'success' })
				this.goBack()
			} catch (err) {
				uni.showToast({ title: String((err && (err.msg || err.message)) || '处理失败'), icon: 'none' })
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; padding-bottom: 132rpx; background: #f5f5f5; color: #222; box-sizing: border-box; }
.leader-nav { position: fixed; left: 0; right: 0; top: 0; z-index: 20; padding: 0 28rpx; display: grid; grid-template-columns: 160rpx minmax(0, 1fr) 160rpx; align-items: start; background: #fff; box-sizing: border-box; }
.back, .nav-space { width: 160rpx; }
.back { position: absolute; left: 28rpx; display: flex; align-items: center; color: #666; font-size: 48rpx; }
.title { position: absolute; left: 160rpx; right: 160rpx; font-size: 34rpx; font-weight: 500; text-align: center; }
.page { padding: 20rpx 24rpx; }
.status-panel { margin: -20rpx -24rpx 20rpx; padding: 36rpx 32rpx; color: #fff; background: #16a34a; }
.status-title { display: block; font-size: 36rpx; font-weight: 600; line-height: 50rpx; }
.status-desc { display: block; margin-top: 8rpx; font-size: 25rpx; line-height: 36rpx; opacity: 0.9; }
.section { margin-bottom: 18rpx; padding: 24rpx; background: #fff; border-radius: 8rpx; }
.section-head, .goods-footer, .info-row, .bottom-bar { display: flex; align-items: center; }
.section-head, .info-row { justify-content: space-between; }
.section-title { display: block; color: #222; font-size: 28rpx; font-weight: 600; line-height: 42rpx; }
.sub-title { margin-top: 24rpx; }
.amount { color: #f05b40; font-size: 32rpx; font-weight: 600; }
.member, .content { display: block; margin-top: 14rpx; color: #555; font-size: 25rpx; line-height: 38rpx; word-break: break-all; }
.goods-row { display: flex; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.goods-row:last-of-type { border-bottom: 0; }
.goods-image { width: 120rpx; height: 120rpx; margin-right: 18rpx; background: #f2f2f2; border-radius: 6rpx; flex-shrink: 0; }
.goods-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.goods-name { font-size: 27rpx; line-height: 38rpx; }
.goods-footer { justify-content: space-between; margin-top: auto; padding-top: 12rpx; }
.goods-price { color: #f05b40; font-size: 27rpx; }
.goods-num { color: #777; font-size: 24rpx; }
.image-list { display: flex; flex-wrap: wrap; gap: 14rpx; margin-top: 20rpx; }
.refund-image { width: 196rpx; height: 196rpx; background: #f2f2f2; border-radius: 6rpx; }
.info-row { min-height: 48rpx; margin-top: 24rpx; padding-top: 20rpx; border-top: 1rpx solid #f0f0f0; font-size: 25rpx; }
.label, .history-time { color: #888; }
.value { max-width: 470rpx; color: #333; text-align: right; word-break: break-all; }
.history-row { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.history-row:last-of-type { border-bottom: 0; }
.history-content, .history-time { display: block; font-size: 25rpx; line-height: 38rpx; word-break: break-all; }
.history-time { margin-top: 6rpx; font-size: 23rpx; }
.empty { padding: 30rpx 0 10rpx; color: #999; font-size: 25rpx; text-align: center; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10; min-height: 112rpx; gap: 14rpx; padding: 18rpx 24rpx; background: #fff; box-shadow: 0 -2rpx 14rpx rgba(0, 0, 0, 0.08); box-sizing: border-box; }
.action { flex: 1; min-width: 0; padding: 19rpx 10rpx; border-radius: 6rpx; font-size: 25rpx; text-align: center; white-space: nowrap; }
.secondary { color: #555; background: #f1f1f1; }
.primary { color: #fff; background: #16a34a; }
</style>
