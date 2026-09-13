<template>
<view class="container refund-detail-page" :style="miniNavPageStyle()">
	<!-- 导航区 -->
	<view class="refund-nav" :style="miniNavBarStyle()">
		<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
		<text class="title" :style="miniNavTitleStyle()">售后详情</text>
		<text class="nav-space"></text>
	</view>

	<view class="page" v-if="loading">
		<view class="empty">售后信息加载中</view>
	</view>

	<view class="page" v-else-if="hasOrder">
		<!-- 订单概览区 -->
		<view class="order-overview">
			<view class="order-head">
				<view>
					<text class="order-no">订单号：{{ orderInfo.orderNo }}</text>
					<text class="order-time">{{ orderInfo.orderTime || '--' }}</text>
				</view>
				<text class="refund-tag" :class="refundStatusKey">{{ refundStatusText }}</text>
			</view>
			<view class="shop-row">
				<image class="shop-avatar" :src="shopAvatar" mode="aspectFill"></image>
				<text class="shop-name">{{ shopName }}</text>
				<text class="group-name">{{ orderInfo.groupName || '团购活动' }}</text>
			</view>
			<view v-for="goods in orderInfo.goods" :key="goods.id || goods.goodsId" class="goods-row">
				<image class="goods-image" :src="goods.img || '/static/image/head.png'" mode="aspectFill"></image>
				<view class="goods-content">
					<text class="goods-name">{{ goods.name || '商品名称' }}</text>
					<view class="goods-status-list">
						<text class="goods-meta">共{{ goods.num }}{{ goods.unit || '件' }}</text>
						<text v-for="status in goods.statusList" :key="status.key" class="goods-status" :class="status.tone">{{ status.text }}</text>
					</view>
				</view>
				<view class="goods-side">
					<text class="goods-price">￥{{ formatAmount(goods.price) }}</text>
					<text class="goods-num">x{{ goods.num }}</text>
				</view>
			</view>
			<view class="order-total-row">
				<text>共{{ orderGoodsCount }}件</text>
				<view>
					<text>实付 </text><text class="amount">￥{{ formatAmount(orderInfo.orderPrice) }}</text>
					<text v-if="refundFee > 0" class="refund-fee">已退金额 ￥{{ formatAmount(refundFee) }}</text>
				</view>
			</view>
		</view>

		<!-- 本次售后申请区 -->
		<view class="section refund-application" v-if="refundGoods.length">
			<view class="section-head">
				<text class="section-title">团员申请退款</text>
				<text class="amount">￥{{ refundAmountText }}</text>
			</view>
			<view class="info-line"><text>售后类型：</text><text>{{ refundTypeText }}</text></view>
			<view class="info-line">
				<text>退款金额：</text>
				<text class="danger">￥{{ refundAmountText }}</text>
			</view>
			<view class="refund-goods">
				<text class="label">退款明细：</text>
				<view class="refund-goods-list">
				<view v-for="goods in refundGoods" :key="goods.id" class="refund-goods-row">
					<text>{{ goods.name || '商品名称' }}</text>
					<text>退款 {{ goodsRefundNum(goods) }}{{ goods.unit || '件' }}，￥{{ goodsRefundAmountText(goods) }}</text>
					</view>
				</view>
			</view>
			<view class="info-line"><text>申请原因：</text><text>{{ orderInfo.reason || '未填写' }}</text></view>
			<view class="info-line"><text>补充说明：</text><text>{{ orderInfo.refundDesc || '未填写' }}</text></view>
			<view v-if="orderInfo.images.length" class="image-list">
				<image v-for="(image, index) in orderInfo.images" :key="index" :src="image" class="refund-image" mode="aspectFill"></image>
			</view>
			<view class="info-line apply-time"><text>申请时间：</text><text>{{ orderInfo.applyTime || orderInfo.orderTime || '--' }}</text></view>
		</view>

		<!-- 售后历史区 -->
		<view class="section">
			<text class="section-title history-title">售后历史</text>
			<view class="timeline">
				<view v-for="(item, index) in displayHistory" :key="index" class="history-row">
					<view class="dot" :class="{ active: index === 0 }"></view>
					<view class="history-main">
						<text class="history-content">{{ item.content }}</text>
						<text class="history-time">{{ item.time }}</text>
						<text v-if="item.reason" class="history-reason">{{ item.reason }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>

	<view class="page" v-else>
		<view class="empty">售后信息加载失败</view>
	</view>

</view>
</template>

<script>
import { getGroupShop, getOrderInfo, getRefundRecords } from "@/api/group.js"
import { getMemberRefundDisplayNum, isMemberRefundPending, mergeMemberOrderRefundRecords, normalizeMemberOrder } from "@/utils/memberOrder.js"

export default {
	data() {
		return {
			orderNo: '',
			requestedRefundFlag: 0,
			orderInfo: normalizeMemberOrder({}),
			shopInfo: {},
			loading: true
		}
	},
	computed: {
		hasOrder() {
			return Boolean(this.orderInfo.orderNo)
		},
		shopName() {
			return this.shopInfo.name || this.shopInfo.shopName || this.orderInfo.shopName || '团长店铺'
		},
		shopAvatar() {
			return this.shopInfo.shopLogo || this.shopInfo.logo || this.shopInfo.avatar || this.shopInfo.shopAvatar || '/static/image/head.png'
		},
		orderGoodsCount() {
			return this.orderInfo.goods.reduce((total, goods) => total + Number(goods.num || 0), 0)
		},
		refundFee() {
			return Number(this.orderInfo.refundFee || 0)
		},
		refundGoods() {
			return this.orderInfo.goods
				.filter(isMemberRefundPending)
				.map(item => {
					const refundNum = getMemberRefundDisplayNum(item, this.refundFlag)
					return Object.assign({}, item, {
						refundDisplayNum: refundNum,
						refundDisplayAmount: Number((Number(item.price || 0) * refundNum).toFixed(2))
					})
				})
		},
		refundAmount() {
			return this.refundGoods.reduce((total, goods) => total + this.goodsRefundAmount(goods), 0)
		},
		refundAmountText() {
			return this.formatAmount(this.refundAmount)
		},
		refundFlag() {
			return Number(this.orderInfo.refundFlag || this.requestedRefundFlag || 0)
		},
		refundTypeText() {
			return this.refundFlag === 1 ? '仅退款' : (this.refundFlag === 2 ? '退款退货' : '退款')
		},
		refundStatusText() {
			if (this.refundStatusKey === 'pending') return '待处理'
			if (this.refundStatusKey === 'approved') return '已同意'
			if (this.refundStatusKey === 'rejected') return '未同意'
			return '售后'
		},
		refundStatusKey() {
			const text = this.orderInfo.refundStatusText
			if (text === '待处理' || text === '待审核') return 'pending'
			if (text === '已同意' || text === '已退款') return 'approved'
			if (text === '已拒绝' || text === '未同意') return 'rejected'
			if (Number(this.orderInfo.status) === 5) return 'pending'
			if (Number(this.orderInfo.status) === 4) return 'approved'
			return 'none'
		},
		isPending() {
			return this.refundStatusKey === 'pending'
		},
		statusTitle() {
			if (this.refundStatusKey === 'pending') return '待团长处理'
			if (this.refundStatusKey === 'approved') return '团长已同意'
			if (this.refundStatusKey === 'rejected') return '团长已拒绝'
			return '售后详情'
		},
		statusDesc() {
			if (this.refundStatusKey === 'approved') return '退款申请已通过'
			if (this.refundStatusKey === 'rejected') return '退款申请未通过'
			return ''
		},
		displayHistory() {
			if (this.orderInfo.history.length) {
				return this.orderInfo.history.map(item => ({
					content: item.content || item.remark || item.statusText || '售后处理记录',
					time: item.time || item.createTime || item.applyTime || '',
					reason: item.reason || ''
				}))
			}
			const history = []
			if (this.refundStatusKey === 'approved') {
				history.push({ content: '团长同意退款申请', time: this.orderInfo.applyTime || this.orderInfo.orderTime || '', reason: '' })
			} else if (this.refundStatusKey === 'rejected') {
				history.push({ content: '团长拒绝退款申请', time: this.orderInfo.applyTime || this.orderInfo.orderTime || '', reason: this.orderInfo.reason })
			}
			history.push({ content: `${this.orderInfo.trueName || this.orderInfo.nickname || '团员'}申请退款`, time: this.orderInfo.applyTime || this.orderInfo.orderTime || '', reason: '' })
			return history
		}
	},
	onLoad(options = {}) {
		const token = uni.getStorageSync('token')
		if (!token) {
			uni.redirectTo({ url: '/pages/login/index' })
			return
		}
		this.orderNo = options.orderNo || options.id || ''
		this.requestedRefundFlag = Number(options.refundFlag || 0)
		this.initOrderInfo()
	},
	methods: {
		async initOrderInfo() {
			if (!this.orderNo) {
				this.loading = false
				return
			}
			this.loading = true
			try {
				const res = await getOrderInfo({ orderNo: this.orderNo })
				const order = normalizeMemberOrder(res.data || {})
				this.orderInfo = await this.loadRefundRecords(order)
				this.loadGroupShop(this.orderInfo.leaderId)
			} catch (err) {
				console.log('加载售后详情失败：', err)
				uni.showToast({ title: '售后信息加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async loadRefundRecords(order) {
			try {
				const res = await getRefundRecords({ orderNo: order.orderNo || this.orderNo })
				const data = res.data || {}
				const records = this.getRefundRecordRows(data)
				let mergedOrder = records.length ? mergeMemberOrderRefundRecords(order, records) : order
				// 新接口返回售后订单汇总；用它刷新商品售后数量和已退金额，同时仍保留历史事件。
				if (data && !Array.isArray(data) && data.orderNo) {
					const detail = normalizeMemberOrder(Object.assign({}, order, data, {
						goods: Array.isArray(data.goods) && data.goods.length ? data.goods : order.goods
					}))
					mergedOrder = Object.assign({}, detail, {
						history: records.length ? mergeMemberOrderRefundRecords(order, records).history : order.history,
						reason: detail.reason || order.reason,
						refundDesc: detail.refundDesc || order.refundDesc,
						applyTime: detail.applyTime || order.applyTime
					})
				}
				return mergedOrder
			} catch (err) {
				console.log('加载售后记录失败：', err)
				return order
			}
		},
		getRefundRecordRows(data) {
			if (Array.isArray(data)) return data
			if (!data || typeof data !== 'object') return []
			return ['records', 'refundRecords', 'recodes', 'history', 'logs']
				.reduce((result, key) => result.length ? result : (Array.isArray(data[key]) ? data[key] : []), [])
		},
		async loadGroupShop(leaderId) {
			if (!Number(leaderId || 0)) return
			try {
				const res = await getGroupShop({ id: Number(leaderId) })
				this.shopInfo = res.data || {}
			} catch (err) {
				console.log('加载团长店铺失败：', err)
			}
		},
		goodsRefundAmount(goods) {
			return Number(goods.refundDisplayAmount || 0)
		},
		goodsRefundAmountText(goods) {
			return this.formatAmount(this.goodsRefundAmount(goods))
		},
		goodsRefundNum(goods) {
			return Number(goods.refundDisplayNum || 0)
		},
		formatAmount(value) {
			const amount = Number(value || 0)
			return amount.toFixed(2).replace(/\.?0+$/, '')
		},
		goBack() {
			uni.navigateBack({ delta: 1 })
		}
	}
}
</script>

<style lang="scss" scoped>
.refund-detail-page { min-height: 100vh; background: #f5f5f5; color: #222; box-sizing: border-box; }
.refund-nav { position: fixed; left: 0; right: 0; top: 0; z-index: 20; padding: 0 28rpx; display: grid; grid-template-columns: 120rpx minmax(0, 1fr) 120rpx; align-items: start; background: #fff; box-sizing: border-box; }
.back { position: absolute; left: 28rpx; font-size: 48rpx; font-weight: 300; color: #666; }
.title { position: absolute; left: 120rpx; right: 120rpx; text-align: center; font-size: 32rpx; font-weight: 600; }
.page { padding: 16rpx 0 30rpx; }
.order-overview, .section { margin-bottom: 16rpx; padding: 24rpx 28rpx; background: #fff; box-sizing: border-box; }
.order-head, .shop-row, .goods-row, .order-total-row { display: flex; align-items: center; }
.order-head, .order-total-row { justify-content: space-between; }
.order-no, .order-time, .shop-name, .group-name, .goods-name, .goods-price, .goods-num, .goods-meta, .goods-status, .refund-fee { display: block; }
.order-no { color: #333; font-size: 30rpx; line-height: 42rpx; }
.order-time { margin-top: 5rpx; color: #999; font-size: 22rpx; line-height: 32rpx; }
.refund-tag { padding: 6rpx 15rpx; border-radius: 22rpx; color: #f05b40; background: #fff2ef; font-size: 22rpx; line-height: 30rpx; }
.refund-tag.pending { color: #b26a00; background: #fff5df; }
.refund-tag.approved { color: #16803b; background: #e7f7ec; }
.refund-tag.rejected { color: #d33b2e; background: #ffece9; }
.shop-row { min-height: 76rpx; margin-top: 18rpx; border-top: 1rpx solid #f0f0f0; border-bottom: 1rpx solid #f0f0f0; }
.shop-avatar { width: 42rpx; height: 42rpx; margin-right: 12rpx; border-radius: 50%; background: #f1f1f1; flex-shrink: 0; }
.shop-name { max-width: 210rpx; overflow: hidden; color: #444; font-size: 25rpx; text-overflow: ellipsis; white-space: nowrap; }
.group-name { flex: 1; min-width: 0; margin-left: 20rpx; overflow: hidden; color: #555; font-size: 25rpx; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.goods-row { min-height: 148rpx; padding: 18rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.goods-image { width: 110rpx; height: 110rpx; margin-right: 18rpx; background: #f2f2f2; border-radius: 4rpx; flex-shrink: 0; }
.goods-content { flex: 1; min-width: 0; }
.goods-name { overflow: hidden; color: #333; font-size: 27rpx; line-height: 38rpx; text-overflow: ellipsis; white-space: nowrap; }
.goods-status-list { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 9rpx; }
.goods-meta, .goods-status { color: #888; font-size: 22rpx; line-height: 31rpx; }
.goods-status.pending, .goods-status.processing { color: #b26a00; }
.goods-status.verified { color: #16803b; }
.goods-status.refunded { color: #8a5e9a; }
.goods-side { width: 132rpx; margin-left: 12rpx; text-align: right; }
.goods-price { color: #333; font-size: 25rpx; line-height: 38rpx; }
.goods-num { margin-top: 25rpx; color: #999; font-size: 24rpx; line-height: 32rpx; }
.order-total-row { padding: 18rpx 0 2rpx; color: #555; font-size: 25rpx; }
.order-total-row > view { text-align: right; }
.refund-fee { margin-top: 7rpx; color: #ff4d4f; font-size: 23rpx; }
.section { padding-top: 22rpx; }
.section-head, .info-line, .refund-goods-row { display: flex; align-items: center; }
.section-head, .info-line, .refund-goods-row { justify-content: space-between; }
.section-title { color: #333; font-size: 28rpx; font-weight: 600; line-height: 40rpx; }
.amount, .danger { color: #ff4d4f; }
.amount { font-size: 30rpx; font-weight: 600; }
.info-line { margin-top: 16rpx; color: #555; font-size: 25rpx; line-height: 38rpx; }
.info-line text:last-child { max-width: 470rpx; text-align: right; word-break: break-all; }
.refund-goods { display: flex; margin-top: 16rpx; color: #555; font-size: 25rpx; line-height: 38rpx; }
.label { flex-shrink: 0; }
.refund-goods-list { flex: 1; min-width: 0; }
.refund-goods-row text:first-child { max-width: 250rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.refund-goods-row text:last-child { color: #ff6b4a; }
.image-list { display: flex; gap: 14rpx; flex-wrap: wrap; margin-top: 20rpx; padding-left: 126rpx; }
.refund-image { width: 132rpx; height: 132rpx; border-radius: 4rpx; background: #f2f2f2; }
.apply-time { margin-top: 24rpx; color: #777; }
.history-title { display: block; margin-bottom: 22rpx; }
.timeline { padding: 4rpx 0; }
.history-row { position: relative; display: flex; padding: 0 0 26rpx; }
.history-row::before { content: ''; position: absolute; left: 9rpx; top: 28rpx; bottom: -2rpx; width: 2rpx; background: #ddd; }
.history-row:last-child::before { display: none; }
.dot { width: 18rpx; height: 18rpx; margin: 10rpx 24rpx 0 0; border-radius: 50%; background: #d6d6d6; flex-shrink: 0; }
.dot.active { background: #22c55e; box-shadow: 0 0 0 8rpx rgba(34, 197, 94, 0.12); }
.history-main { flex: 1; min-width: 0; }
.history-content, .history-time, .history-reason { display: block; font-size: 25rpx; line-height: 36rpx; word-break: break-all; }
.history-content { color: #333; }
.history-time, .history-reason { margin-top: 6rpx; color: #999; }
.history-reason { color: #666; }
.empty { padding: 80rpx 0; color: #999; font-size: 26rpx; text-align: center; }
</style>
