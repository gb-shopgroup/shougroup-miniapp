<template>
<view class="container checkout-page" :style="miniNavPageStyle()">
<view class="checkout-nav" :style="miniNavBarStyle()">
	<text class="back" :style="miniNavTitleStyle()" @click="goBack()">‹</text>
	<text class="title" :style="miniNavTitleStyle()">跟团购买</text>
	<text class="nav-placeholder"></text>
</view>
	<view class="page">
	<view class="point-row" @click="showPointPicker">
		<view class="point-title">{{ selectedPoint ? '已选自提点：' + selectedPointName : '请选择自提点' }}</view>
		<text class="point-arrow">›</text>
	</view>
	<view class="point-address">{{ selectedPointAddress }}</view>
	<view class="goods-panel" v-if="cartGoodsList.length > 0">
		<view class="checkout-goods" v-for="(item, index) in cartGoodsList" :key="item.id + '-' + (item.skuids || index)">
			<image class="goods-img" :src="item.img" mode="aspectFill"></image>
			<view class="goods-info">
				<view class="goods-name">{{ item.name }}</view>
				<view class="goods-spec" v-if="item.skunames">{{ item.skunames }}</view>
				<view class="goods-price">¥ {{ item.price }}</view>
			</view>
			<view class="qty-control">
				<view class="qty-btn" @click.stop="changeCartGoodsListNum(index, -1)">－</view>
				<text class="qty-num">{{ item.num }}</text>
				<view class="qty-btn" @click.stop="changeCartGoodsListNum(index, 1)">＋</view>
			</view>
		</view>
	</view>
	<view class="empty-cart" v-else>
		<view class="empty-cart-icon">
			<image src="/static/tabbar/cart.png" mode="aspectFit"></image>
		</view>
		<text class="empty-cart-text">购物车暂无商品</text>
	</view>
	<view class="total-row">
		<text>商品总价</text>
		<view>
			<text>共{{ totalGoodsCount }}件</text>
			<text class="actual-pay">实收￥{{ currentOrderTotal }}</text>
		</view>
	</view>
	<view class="remark-row">
		<text>备注</text>
		<input v-model="remark" placeholder="请输入您需要备注的内容" />
	</view>
	<view class="member-row">
		<input type="text" v-model="name" placeholder="收货人姓名" />
		<input type="text" v-model="mobile" placeholder="收货人手机号" />
	</view>
	<view class="bottom-pay">
		<view class="bottom-price">
			<text>实际支付:</text>
			<text class="price">￥{{ currentOrderTotal }}</text>
		</view>
		<view class="pay-action" @click="submitOrder">跟团购买</view>
	</view>
</view>
<point ref="pointRef" :pointList="pointList" :selectedPointId="selectedPointId" @childEvent="getPointSelectedDataEvent" />
</view>
</template>

<script>
import point from "./point.vue"
import { savePayCache } from "@/utils/payCache.js"
import { getGroupShop, getGroupPoint, addOrder, payOrder, getOpenId } from "@/api/group.js"
import { 
	buildOrderPayload, 
	calculateCartTotal,
	clearPaidCheckoutSessionState,
	getCartGoodsCount,
	normalizeCreatedOrderNo,
	normalizeGroupPickupPoint,
	pickInvalidSpecCartItems,
	resolveSelectedPickupPointId,
	syncCheckoutGoodsToSessionCart,
	updateCartGoodsQuantity
} from "@/utils/groupPurchase.js"
export default {
	data() {
		return {
			// 团长id
			leaderId: 0,
			shopInfo: {},
			// 团购id
			groupId: 0,
			// 商品列表
			cartGoodsList: [],
			originalCheckoutGoodsList: [],
			// 提货点列表
			pointList: [],
			// 订单接口要求真实自提点 ID，不使用列表下标。
			selectedPointId: 0,
			// 收货人信息
			name: '',
			mobile: '',
			remark: '',
			isRequesting: false ,// 请求锁，防止重复调用
			refreshFlag: false // 刷新标记
		}
	},
	components: { point },
	onLoad(options) {
		
		if(options.lid){
			this.leaderId = options.lid
			this.initGroupShop()
		}
		if (options.id) {
			this.groupId = options.id
		}
		
		// 获取本次结算商品列表，来源可能是详情页全量结算或购物车Tab勾选结算
		const app = getApp()
		this.cartGoodsList = app.globalData.sessionCheckoutGoodsList && app.globalData.sessionCheckoutGoodsList.length
			? app.globalData.sessionCheckoutGoodsList
			: (app.globalData.sessionCartGoodsList || [])
		this.originalCheckoutGoodsList = this.cartGoodsList.map(item => Object.assign({}, item))
		
		// 初始化提货点列表
		this.initGroupPoint()
		
		// 姓名和手机号（从本地获取）
		this.name = uni.getStorageSync('name') || ''
		this.mobile = uni.getStorageSync('mobile') || ''
	},
	// 计算
	computed: {
		// 提货点信息
		selectedPoint() {
			return this.pointList.find(point => Number(point.id) === Number(this.selectedPointId)) || null
		},
		selectedPointName(){
			return this.selectedPoint ? this.selectedPoint.name : '请选择自提点'
		},
		selectedPointAddress(){
			return this.selectedPoint ? this.selectedPoint.address : '下单前请选择自提点'
		},		
		// 累加订单总额
		currentOrderTotal(){
			return calculateCartTotal(this.cartGoodsList)
		},
		totalGoodsCount(){
			return getCartGoodsCount(this.cartGoodsList)
		}
	},
	// 方法集
	methods: {
		// 获取团长店铺
		async initGroupShop() {
			try {
				const param = {id:this.leaderId}
				const res = await getGroupShop(param)
				this.shopInfo = res.data
			} catch (err) {
				console.log('获取团长店铺失败：', err)
			}
		},		
		// 获取配送点列表
		async initGroupPoint() {
			try {
				const param = { id: this.leaderId }
				const res = await getGroupPoint(param)
				this.pointList = (Array.isArray(res.data) ? res.data : [])
					.map(normalizeGroupPickupPoint)
					.filter(point => point.id > 0 && point.isClose === 0)
				this.restoreSelectedPoint()
			} catch (err) {
				console.log('获取配送点列表失败：', err)
			}
		},
		getPointStorageKey(){
			return `member_group_point_id_${this.leaderId || 0}`
		},
		restoreSelectedPoint(){
			if(!this.pointList.length){
				this.selectedPointId = 0
				return
			}
			const savedPointId = Number(uni.getStorageSync(this.getPointStorageKey()) || 0)
			this.selectedPointId = resolveSelectedPickupPointId(this.pointList, savedPointId)
		},
		persistSelectedPoint(){
			if(!this.selectedPoint) return
			uni.setStorageSync(this.getPointStorageKey(), this.selectedPoint.id)
		},
		// 打开提货点弹框
		showPointPicker(){
			if(!this.pointList.length){
				uni.showToast({ title: '暂无可选自提点', icon: 'none', duration: 2500 })
				return
			}
			this.$refs.pointRef.show(this.selectedPointId)
		},
		goBack(){
			uni.navigateBack()
		},
		// 选择提货点后回调这里，回传真实 pointId。
		getPointSelectedDataEvent(pointId){
			this.selectedPointId = resolveSelectedPickupPointId(this.pointList, pointId)
			this.persistSelectedPoint()
		},
		// 修改购物车商品数量, 减少为零就是去掉该商品
		changeCartGoodsListNum(idx, delta) {
			
			let newQty = (this.cartGoodsList[idx].num || 1) + delta
			
			// 减少为零就是去掉该商品
			if(newQty <= 0){
				uni.showModal({
					title: '确认删除',
					content: '确定要删除该商品吗？',
					success: (res) => {
						if (res.confirm) {
							this.cartGoodsList = updateCartGoodsQuantity(this.cartGoodsList, idx, delta, { removeWhenZero: true })
							this.syncSessionCheckout()
						}
					}
				})
				return
			}
			
			this.cartGoodsList = updateCartGoodsQuantity(this.cartGoodsList, idx, delta)
			this.syncSessionCheckout()
		},		
		// 下单事件
		async submitOrder() {
						
			// 获取提货点ID
			let pointId = 0
			if(this.selectedPoint) pointId = this.selectedPoint.id
			
			// 请选择提货点
			if(pointId == 0){
				uni.showToast({ title: '请选择提货点', icon: 'none', duration: 2500 })
				return
			}
			this.persistSelectedPoint()
			
			// 请添加商品
			if(this.cartGoodsList.length == 0){
				uni.showToast({ title: '请添加商品', icon: 'none', duration: 2500 })
				return
			}
			
			if(!this.name.trim()){
				uni.showToast({ title: '请输入收货人姓名', icon: 'none', duration: 2500 })
				return
			}
			
			if(!this.mobile.trim()){
				uni.showToast({ title: '请输入收货人手机号', icon: 'none', duration: 2500 })
				return
			}
			
			// 多规格商品没选到 SKU 时不能下单（历史购物车里可能存着这样的条目）：
			// 请求体会带 skuId=0、skuids 为空，后端按 SKU 扣库存会失败
			const invalidSpecGoods = pickInvalidSpecCartItems(this.cartGoodsList)
			if(invalidSpecGoods.length > 0){
				showActionError('请重新选择商品规格：' + invalidSpecGoods.map(item => item.name || '商品').join('、'), { title: '商品规格缺失' })
				return
			}
			
			// 去掉订单商品里面的如下数据（减少网络流量）
			//img: '',
			//price: '',
			//type: 0,
			//stock: 0,
			//balance: 0,
			//unit: '',
			
			// 防重复提交
			if (this.isRequesting) return
			this.isRequesting = true
			// 下单失败的原文（后端会返回「限购提示」「请稍后提交订单」等）留到 loading 关闭后再展示
			let submitErrorMessage = ''
			uni.showLoading({title: '请求中...', mask: true})			
			
			try {	
				// 提交参数
				const param = buildOrderPayload({
					groupId: this.groupId,
					pointId: pointId,
					name: this.name,
					mobile: this.mobile,
					remark: this.remark,
					cartGoodsList: this.cartGoodsList
				})
				// silentToast：失败提示由本页用 modal 展示（不会被 loading/跳转打断），请求层不再重复弹 toast
				const res = await addOrder(param, { silentToast: true })
				const orderNo = normalizeCreatedOrderNo(res.data)
				if(!orderNo || orderNo == 0){	
					console.log('下单接口未返回可支付订单编号：', res.data)
					uni.showToast({ title: '下单接口未返回订单编号', icon: 'none' })
					return
				}
				getApp().globalData.sessionCheckoutOrderNo = orderNo
				this.clearSessionCheckout(orderNo)
				
				await this.doPay(orderNo)
					
			} catch (err) {
				
				console.log('下单支付失败：', err)
				// 后端返回「请稍后提交订单」/「限购提示」等原文，不能吞掉
				submitErrorMessage = String((err && (err.msg || err.message)) || '')
				
			} finally {
				uni.hideLoading()
				this.isRequesting = false
				if (submitErrorMessage) this.showSubmitError(submitErrorMessage)
			}
		},
		// 下单失败提示：用 modal 展示，必须手动确认，避免默认 1.5s 一闪而过。
		// 注意调用时机必须在 hideLoading 之后：showLoading 与 showModal/showToast 共用同一层。
		showSubmitError(message){
			const content = String(message || '').trim() || '下单失败，请稍后重试'
			setTimeout(() => {
				uni.showModal({
					title: '无法下单',
					content,
					showCancel: false,
					confirmText: '我知道了'
				})
			}, 50)
		},
		// 发起支付
		async doPay(orderNo) {
		
			let payParams = null
		
			try {
				
				// 本地获取openid, 没有则静默换取，支付接口必须携带
				const openid = await this.ensureOpenId()
				if(!openid){
					const err = new Error('openid missing')
					err.silentToast = true
					uni.showToast({ title: '获取openid失败', icon: 'none' })
					throw err
				}
				
				// 请求易宝支付
				const params = { orderNo: orderNo, openid: openid }
				// 同上：支付失败提示由本页 modal 负责
				const res = await payOrder(params, { silentToast: true })
				payParams = res.data;
				// payParams 就是微信支付参数：timeStamp、nonceStr、package、signType、paySign
				
				// 调起微信支付
				await uni.requestPayment({
					provider: 'wxpay',
					timeStamp: payParams.timeStamp,
					nonceStr: payParams.nonceStr,
					package: payParams.package,
					signType: payParams.signType,
					paySign: payParams.paySign
				})
				
				// 支付成功
				uni.showToast({ title: '支付成功', icon: 'success' })
				uni.redirectTo({ url: '/pages/success/index?orderNo=' + encodeURIComponent(orderNo)})

			} catch (err) {
				
				console.error('支付失败：', err)
				const title = (err && err.msg) || (err && err.message) || '支付失败'
				uni.hideLoading()
				if(payParams == null){
					if(!err.silentToast) uni.showToast({ title, icon: 'none', duration: 2500 })
					return
				}
				// 支付参数缓存到本地（便于订单详情页继续支付）
				savePayCache(orderNo, payParams)
				const gotoOrderDetail = () => {
					uni.redirectTo({ url: '/pages/order/detail?orderNo=' + encodeURIComponent(orderNo)})
				}
				if(err.silentToast){
					// 静默错误：调用方已提示过，直接进订单详情
					gotoOrderDetail()
					return
				}
				// 用 modal 而不是 toast：紧接着就要跳转订单详情，toast 会被页面跳转打断（表现为一闪而过）。
				// 延迟一点再弹，确保外层 finally 的 hideLoading 已经执行完（loading 与 modal 共用同一层）。
				setTimeout(() => {
					uni.showModal({
						title: '支付未完成',
						content: String(title),
						showCancel: false,
						confirmText: '查看订单',
						success: gotoOrderDetail,
						fail: gotoOrderDetail
					})
				}, 60)
			} finally {
				
				// 支付流程由 submitOrder 统一关闭 loading 和请求锁
			}
		},
		async ensureOpenId(){
			let openid = uni.getStorageSync('openid')
			if(openid) return openid
			try {
				const loginRes = await uni.login({ provider: 'weixin' })
				const code = loginRes.code
				if(!code) return ''
				const res = await getOpenId({ code })
				openid = res.data || ''
				if(openid) uni.setStorageSync('openid', openid)
				return openid
			} catch (err) {
				console.log('获取openid失败：', err)
				return ''
			}
		},
		clearSessionCheckout(orderNo){
			const app = getApp()
			Object.assign(app.globalData, clearPaidCheckoutSessionState(app.globalData, orderNo))
			this.cartGoodsList = []
		},
		syncSessionCheckout(){
			const app = getApp()
			app.globalData.sessionCheckoutGoodsList = this.cartGoodsList
			app.globalData.sessionCartGoodsList = syncCheckoutGoodsToSessionCart(
				app.globalData.sessionCartGoodsList || [],
				this.originalCheckoutGoodsList,
				this.cartGoodsList
			)
		},
	}
}
</script>

<style lang="scss" scoped>
// ----------------------------------------

.section-title {
	padding-left: 5rpx;
	font-size: 28rpx;
	font-weight: bold;
	line-height: 50rpx;
	margin-bottom: 5rpx;
}

.address-section {
	background: #fff;
	border-radius: 10rpx;
	padding: 20rpx 15rpx;
	margin-bottom: 30rpx;
	display: flex;
	align-items: center;
	gap: 15rpx;
}
.address-info {
	flex: 1;
}
.address-name {
	font-size: 28rpx;
	//font-weight: bold;
	line-height: 50rpx;
	//margin-bottom: 5rpx;
}
.address-detail {
	font-size: 24rpx;
	color: #999;
	line-height: 50rpx;
}
.address-change-btn {
	color: #1890ff;
	font-size: 28rpx;
}
// ----------------------------------------
.member-wrapper {
	background: #fff;
	border-radius: 10rpx;
	padding: 15rpx;
	margin-bottom: 30rpx;
}
.member-ipt {
	display: flex;
	margin: 20rpx 0;
	background: none;
	border: none !important;
	font-size: $text-fontSize-medium;
	input {
		flex: 1;
		padding: 15rpx;
		border: 1rpx solid #ddd;
		font-size: $text-fontSize-medium;
		border-radius: $border-radius;
		text-align: left;
	}
}
.member-ipt::after {
	border: none !important;
}
// ----------------------------------------
.product-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	background-color: #fff;
	border-radius: 15rpx;
	padding: 15rpx;
}

.product-card {
	//background: #fafafa;
	border-radius: 15rpx;
	//padding: 15rpx;
	position: relative;
	overflow: hidden;
	//border: 2rpx solid #f0f0f0;
}

.product-card-content {
	display: flex;
	gap: 24rpx;
	margin-bottom: 20rpx;
}

.product-image-wrap {
	flex-shrink: 0;
}

.product-icon-bg {
	width: 160rpx;
	height: 160rpx;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.product-icon-bg .iconfont {
	font-size: 80rpx;
}

.product-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 10rpx 0rpx;
}

.product-name {
	font-size: 28rpx;
	//font-weight: 600;
	color: #333;
	//line-height: 1.4;
}

.product-spec {
	font-size: 24rpx;
	color: #999;
	//margin-top: 4rpx;
}

.product-price-row {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
}

.price-symbol {
	font-size: 26rpx;
	color: #ff4d4f;
	font-weight: 600;
}

.price-value {
	font-size: 26rpx;
	color: #ff4d4f;
	//font-weight: 700;
}

.price-unit {
	font-size: 24rpx;
	color: #999;
	margin-left: 10rpx;
	text-decoration: line-through;
}

.product-action {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 16rpx;
	//border-top: 1rpx solid #eee;
}

.quantity-control-mini {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.qty-btn-mini {
	width: 48rpx;
	height: 48rpx;
	border: 2rpx solid #ddd;
	border-radius: 8rpx;
	background: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	color: #666;
}

.qty-value-mini {
	width: 56rpx;
	text-align: center;
	font-size: 28rpx;
	font-weight: 500;
}
// ----------------------------------------
.total-section {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 80rpx 0 30rpx 0;
	//border-top: 2rpx solid #f0f0f0;
	//margin-bottom: 30rpx;
}
.total-label {
	font-size: 30rpx;
	font-weight: bold;
}
.total-price {
	font-size: 40rpx;
	font-weight: bold;
	color: #ff4d4f;
}
.pay-btn {
	width: 100%;
	height: 96rpx;
	background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
	//background: linear-gradient(135deg, #07c160 0%, #1aad19 100%);
	color: white;
	font-size: 32rpx;
	font-weight: bold;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
// ----------------------------------------
.checkout-page {
	min-height: 100vh;
	background: #f4f4f4;
	padding-bottom: calc(128rpx + env(safe-area-inset-bottom));
}
.checkout-nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	display: grid;
	grid-template-columns: 160rpx minmax(0, 1fr) 160rpx;
	align-items: start;
	padding: 0 30rpx;
	background: #fff;
	box-sizing: border-box;
}
.checkout-nav .back {
	position: absolute;
	left: 30rpx;
	width: 160rpx;
	color: #666;
	font-size: 50rpx;
}
.checkout-nav .title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	color: #222;
	font-size: 32rpx;
	font-weight: 500;
	text-align: center;
}
.checkout-nav .nav-placeholder {
	display: block;
	min-width: 0;
}
.checkout-page .page {
	padding: 0;
	background: #f4f4f4;
}
.point-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 86rpx;
	padding: 18rpx 32rpx;
	background: #fff;
	border-bottom: 1rpx solid #f0f0f0;
	box-sizing: border-box;
}
.point-title {
	color: #333;
	font-size: 28rpx;
	line-height: 40rpx;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.point-arrow {
	color: #aaa;
	font-size: 42rpx;
	line-height: 42rpx;
	margin-left: 20rpx;
}
.point-address {
	padding: 18rpx 42rpx 22rpx 84rpx;
	background: #fff;
	color: #777;
	font-size: 26rpx;
	line-height: 38rpx;
}
.goods-panel {
	margin-top: 14rpx;
	background: #fff;
}
.checkout-goods {
	display: grid;
	grid-template-columns: 132rpx minmax(0, 1fr) 156rpx;
	gap: 18rpx;
	align-items: center;
	min-height: 168rpx;
	padding: 18rpx 32rpx;
	border-bottom: 1rpx solid #eee;
	box-sizing: border-box;
}
.goods-img {
	width: 132rpx;
	height: 132rpx;
	border-radius: 4rpx;
	background: #eee;
}
.goods-info {
	min-width: 0;
}
.goods-name {
	color: #333;
	font-size: 28rpx;
	line-height: 38rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.goods-spec {
	margin-top: 4rpx;
	color: #999;
	font-size: 22rpx;
	line-height: 32rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.goods-price {
	margin-top: 26rpx;
	color: #ff3b30;
	font-size: 28rpx;
	line-height: 36rpx;
}
.qty-control {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 20rpx;
}
.qty-btn {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2rpx solid #bfbfbf;
	color: #333;
	font-size: 30rpx;
	line-height: 44rpx;
	box-sizing: border-box;
}
.qty-control .qty-btn:last-child {
	color: #fff;
	border-color: #28c76f;
	background: #28c76f;
}
.qty-num {
	color: #333;
	font-size: 28rpx;
	min-width: 36rpx;
	text-align: center;
}
.total-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	min-height: 76rpx;
	padding: 18rpx 32rpx;
	background: #fff;
	color: #333;
	font-size: 26rpx;
	box-sizing: border-box;
}
.actual-pay {
	margin-left: 14rpx;
	color: #ff3b30;
	font-size: 30rpx;
}
.remark-row {
	display: flex;
	align-items: center;
	margin-top: 14rpx;
	min-height: 86rpx;
	padding: 18rpx 32rpx;
	background: #fff;
	color: #333;
	font-size: 26rpx;
	box-sizing: border-box;
}
.remark-row input {
	flex: 1;
	margin-left: 16rpx;
	color: #999;
	font-size: 26rpx;
}
.member-row {
	margin-top: 14rpx;
	padding: 10rpx 32rpx;
	background: #fff;
}
.member-row input {
	height: 70rpx;
	font-size: 26rpx;
	border-bottom: 1rpx solid #f0f0f0;
	box-sizing: border-box;
}
.member-row input:last-child {
	border-bottom: 0;
}
.empty-cart {
	min-height: 300rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: #fff;
	margin-top: 14rpx;
}
.empty-cart-icon {
	width: 136rpx;
	height: 136rpx;
	margin-bottom: 22rpx;
	border-radius: 50%;
	background: #f6f6f6;
	display: flex;
	align-items: center;
	justify-content: center;
}
.empty-cart-icon image {
	width: 78rpx;
	height: 78rpx;
	display: block;
}
.empty-cart-text {
	color: #666666;
	font-size: 28rpx;
	line-height: 40rpx;
}
.bottom-pay {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: calc(112rpx + env(safe-area-inset-bottom));
	display: flex;
	background: #fff;
	z-index: 99;
	padding-bottom: env(safe-area-inset-bottom);
	box-sizing: border-box;
}
.bottom-price {
	flex: 1;
	display: flex;
	align-items: center;
	padding-left: 32rpx;
	color: #333;
	font-size: 28rpx;
	min-width: 0;
}
.bottom-price .price {
	margin-left: 8rpx;
	color: #ff3b30;
	font-size: 36rpx;
	line-height: 44rpx;
}
.pay-action {
	width: 300rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #22c55e;
	color: #fff;
	font-size: 30rpx;
}
</style>
