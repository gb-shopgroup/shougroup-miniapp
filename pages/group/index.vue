<template>
<view class="container">
<!--********************************************************-->
<view class="detail-green-header" :class="{ 'has-banner': !!shopBanner }">
	<image v-if="shopBanner" class="detail-banner" :src="shopBanner" mode="aspectFill"></image>
	<view class="detail-home-button" @click="gotoHome()">
		<image class="detail-home-icon" src="/static/image/detail_home.png" mode="aspectFit"></image>
	</view>
</view>
<!--********************************************************-->	
<view class="page">
<!--********************************************************-->
<view class="group-main" :class="{ 'with-cart-bar': isBlackMember==false }">
	<!--********************************************************-->
	<view class="shop-card">
		<image class="shop-avatar" :src="shopAvatar" mode="aspectFill"></image>
		<view class="shop-name">{{ shopInfo.name || '团长店铺' }}</view>
		<view class="shop-sub" v-if="shopMemberText || shopJoinText">
			<text v-if="shopMemberText">{{ shopMemberText }}</text>
			<text v-if="shopMemberText && shopJoinText"> | </text>
			<text v-if="shopJoinText">{{ shopJoinText }}</text>
		</view>
	</view>
	<view class="group-title-card" v-if="hasGroupIntroContent">
		<view class="group-name">{{ groupInfo.name }}</view>
		<view class="group-tag-row" v-if="groupLabelStyle || pickupText">
			<!-- 团购标签：与首页卡片同一套药丸（接口补 tagId/tagName 后自动渲染） -->
			<view class="group-label" v-if="groupLabelStyle"
				:style="{ color: groupLabelStyle.color, borderColor: groupLabelStyle.color }">
				<view class="label-badge" v-if="groupLabelStyle.icon || groupLabelStyle.ring">
					<image class="label-ring" v-if="groupLabelStyle.ring" :src="groupLabelStyle.ring" mode="aspectFit"></image>
					<image class="label-icon" v-if="groupLabelStyle.icon" :src="groupLabelStyle.icon" mode="aspectFit"></image>
				</view>
				<text class="label-text">{{ groupLabelStyle.text }}</text>
			</view>
			<view class="self-pick-tag" v-if="pickupText">{{ pickupText }}</view>
		</view>
	</view>
	<view class="group-stat-line" v-if="hasGroupIntroContent">
		<text v-if="groupCreateTimeText">{{ groupCreateTimeText }} 发布</text>
		<text class="end-time" v-if="groupEndTimeText">{{ groupEndTimeText }} 结束</text>
	</view>
		<view class="group-stat-line" v-if="hasGroupIntroContent && (groupInfo.num || groupJoinCount > 0)">
			<text>{{ groupInfo.num || 0 }}人查看</text>
			<text v-if="groupJoinCount > 0">{{ groupJoinCount }}次跟团</text>
		</view>
	<view class="group-rich-section" v-if="hasGroupIntroContent">
		<view class="rich-content">
			<rich-text :nodes="groupRichTextNodes"></rich-text>
		</view>
	</view>
	<!--********************************************************-->
	<view class="product-list-section">
		<view class="compact-group-head" v-if="!hasGroupIntroContent">
			<view class="compact-title-row">
				<view class="compact-title">{{ groupInfo.name }}</view>
				<view class="self-pick-tag" v-if="pickupText">{{ pickupText }}</view>
				<view class="compact-ago" v-if="groupCreateTimeText">{{ groupCreateTimeText }}</view>
			</view>
			<view class="compact-time-row">
				<text v-if="groupCreateTimeText">{{ groupCreateTimeText }} 发布</text>
				<text class="end-time" v-if="groupEndTimeText">{{ groupEndTimeText }} 结束</text>
			</view>
		</view>
		<view class="product-list">
			<view class="product-card" :class="{ soldout: isProductSoldOut(item) }" v-for="(item, index) in displayGoods" :key="item.displayKey || item.id">
				<image class="product-image" :src="item.img" mode="aspectFill"></image>
				<view class="product-info">
					<view class="product-name">{{ item.name }}</view>
					<view class="product-tags" v-if="getGoodsTags(item).length > 0">
						<text v-for="tag in getGoodsTags(item)" :key="tag">{{ tag }}</text>
					</view>
					<view class="product-price-row">
						<text class="price-symbol">¥</text>
						<text class="price-value">{{ item.price }}</text>
					</view>
				</view>
				<view class="product-side">
					<button class="share-button" open-type="share" :data-share-goods-id="item.id">
						<image class="share-icon" src="/static/image/detail_share.png" mode="aspectFit"></image>
					</button>
					<view class="sold-count" v-if="getSoldText(item)">{{ getSoldText(item) }}</view>
					<view class="btn-add-cart disabled" v-if="isProductSoldOut(item)">库存不足</view>
					<view class="cart-stepper" v-else-if="isBlackMember==false && !hasSelectableSpec(item) && getSelectedGoodsCount(item) > 0">
						<view class="cart-stepper-btn minus" @click.stop="decreaseSelectedGoods(item)">－</view>
						<view class="cart-stepper-num">{{ getSelectedGoodsCount(item) }}</view>
						<view class="cart-stepper-btn plus" @click.stop="increaseSelectedGoods(item)">＋</view>
					</view>
					<view class="btn-add-cart" @click.stop="addToCart(item)" v-else-if="isBlackMember==false">加入购物车</view>
				</view>
			</view>
		</view>
	</view>
	<!--********************************************************-->
	<view class="logs-section" v-if="groupLogs.length > 0">
		<view class="section-header">
			<text class="section-title">跟团记录</text>
			</view>
			<view class="group-logs">
				<view class="group-logs-item" v-for="(item, index) in groupLogs" :key="index">
					<text class="log-code">{{ getLogCode(item, index) }}</text>
					<image class="group-logs-item-img" :src="item.avatar || '/static/image/head.png'" mode="aspectFill"></image>
					<view class="group-logs-item-content">
						<view class="group-logs-item-user" v-if="item.name || item.time">
							<text v-if="item.name">{{ item.name }}</text>
							<text class="grey" v-if="item.time">{{ item.name ? ' ' : '' }}{{ item.time }}</text>
						</view>
						<view class="group-logs-item-user" v-if="item.goodsName">
							<text class="grey">{{ item.goodsName }}</text>
						</view>
					</view>
					<text class="log-num" v-if="item.num">{{ formatLogNum(item.num) }}</text>
				</view>
			</view>
		<view class="more-logs" v-if="groupLogs.length > 2">
			<text class="more-logs-text">查看更多</text>
			<view class="more-logs-arrow"></view>
		</view>
	</view>
	<!--********************************************************-->
</view>
<!--********************************************************-->
<!-- 底部购物车栏 -->
<view class="cart-bar" v-if="isBlackMember==false">
	<view class="cart-tab" @click="gotoOrderPage()">
		<image class="cart-tab-icon" src="/static/image/detail_order.png" mode="aspectFit"></image>
		<text>订单</text>
	</view>
	<view class="cart-tab" @click="showCartDialog()">
		<image class="cart-tab-icon" src="/static/image/detail_cart.png" mode="aspectFit"></image>
		<text class="cart-count-badge" v-if="cartGoodsTotal > 0">{{ cartGoodsTotal }}</text>
		<text>购物车</text>
	</view>
	<view class="btn-checkout" @click="goToCartCheckPage()">
		<text class="checkout-amount">¥ {{ currentOrderTotal }}</text>
		<text class="checkout-label">跟团购买</text>
	</view>
</view>
<!--********************************************************-->
<!--********************************************************-->
</view>
<!--********************************************************-->
<AddCart ref="addCartRef" @childCartEvent="addCartEvent"></AddCart>
<CartDialog
	ref="cartDialogRef"
	:cartGoodsList="cartGoodsList"
	@cartChange="syncCartGoodsList"
	@childCartEvent="goToCartCheckPage">
</CartDialog>
<!--********************************************************-->
</view>
</template>

<script>
import AddCart from "./add.vue"
import CartDialog from "./cartDialog.vue"
import parseHtml from "@/utils/html-parser.js"
import { hasGroupIntroContent } from "@/utils/groupPresentation.js"
import { getCartQuantityForGoods, isGoodsSoldOut, normalizeGroupGoodsList, setCartGoodsQuantity, updateCartGoodsQuantity } from "@/utils/groupPurchase.js"
import { formatGroupDateTime, normalizeRichTextImages } from "@/utils/leaderGroup.js"
import { getGroupLabelStyle, isMemberGroupOnline, normalizeMemberHomeRecord, resolveMemberHomeLogsData } from "@/utils/memberHome.js"
import { 
	getGroupShop, 
	getGroupInfo, 
	getGroupGoodsList, 
	getMemberGroupActivityLogs2,
	isBackMember } from "@/api/group.js"
export default {
	data() {
		return {
			leaderId : 0,
			shopInfo: {},
			groupId: 0,
			groupInfo: {},
			// 团购商品列表
			products: [],
			// 购物车列表
			cartGoodsList: [],
			// 购物车商品数量
			cartGoodsTotal: 0,
			// 更新购物车某个商品购买数量
			numFlag: 0,
				// 跟团记录
				groupLogs: [],
				groupLogsTotal: 0,
				pendingAddCartContext: null,
			// 是否黑名单
			isBlackMember: false
		}
	},
	components: { AddCart, CartDialog },
	onLoad(options) {
		
		// 页面跳转传递过来的
		if(options.lid){
			this.leaderId = options.lid
		}
			if (options.id) {
				this.groupId = options.id
			}
		
		// 扫码携带提货点: options.scene 会拿到 "id=123&lid=456"
		if (options.scene) {
			const scene = decodeURIComponent(options.scene)
			const params = {}
			scene.split('&').forEach(item => {
				const [k, v] = item.split('=')
				params[k] = v
			})
			this.groupId = params.id
			this.leaderId = params.lid
		}
		
		// 店铺信息
		this.initGroupShop()
		// 团购信息
		this.initGroupInfo()
		// 初始化跟团记录
		this.initLeaderGroupLogs()
		// 查看是否黑名单
		const token = uni.getStorageSync('token')
		if(token) this.initIsBackMember()
	},
		onShow() {
			this.restoreSessionCart()
		},
	onShareAppMessage(res) {
		const dataset = (res && res.target && res.target.dataset) || {}
		const goodsId = Number(dataset.shareGoodsId || dataset.goodsId || 0)
		const product = this.products.find(item => Number(item.id || 0) === goodsId) || {}
		const groupName = this.groupInfo.name || '团购活动'
		const title = product.name ? `${product.name} - ${groupName}` : groupName
		const params = [
			`id=${encodeURIComponent(this.groupId || '')}`,
			`lid=${encodeURIComponent(this.leaderId || '')}`
		]
		if (goodsId > 0) params.push(`goodsId=${encodeURIComponent(goodsId)}`)
		return {
			title,
			path: `/pages/group/index?${params.join('&')}`,
			imageUrl: product.img || this.groupInfo.img || this.shopBanner || ''
		}
	},
	// 计算
	computed: {
		// 订单合计总额
		currentOrderTotal(){
			
			this.numFlag
			// item.price 是商品维度价格
			// item.num 就是商品数量
			const total = this.cartGoodsList.reduce((sum, item) => {
				return sum + (parseFloat(item.price) * item.num)
			}, 0)
			return total.toFixed(2)
		},
		// 团购富文本内容
		groupRichText(){
			
			return this.groupInfo.info || this.groupInfo.content || ''
		},
		hasGroupIntroContent(){
			
			return hasGroupIntroContent(this.groupRichText)
		},
		groupRichTextNodes(){
			
			return this.hasGroupIntroContent ? parseHtml(normalizeRichTextImages(this.groupRichText)) : []
		},
		groupCreateTimeText(){
			
			return this.formatGroupTimeValue(this.groupInfo.createTime || this.groupInfo.time)
		},
			groupEndTimeText(){
				
				return this.formatGroupTimeValue(this.groupInfo.endTime)
			},
			groupJoinCount(){
				
				return Number(this.groupLogsTotal || 0)
			},
			displayGoods(){
			
			return this.products
		},
		shopAvatar(){
			
			return this.shopInfo.shopLogo || this.shopInfo.avatar || this.shopInfo.logo || this.shopInfo.shopAvatar || this.shopInfo.headImg || '/static/image/head.png'
		},
		shopBanner(){
			
			return this.shopInfo.banner || this.shopInfo.shopPhoto || this.shopInfo.img || ''
		},
		shopMemberText(){
			
			const count = this.shopInfo.memberNum || this.shopInfo.memberCount || 0
			return count ? `成员${count}+` : ''
		},
		shopJoinText(){
			
			const count = this.shopInfo.joinNum || this.shopInfo.groupNum || this.shopInfo.orderNum || 0
			return count ? `跟团人次${count}+` : ''
		},
		// 团购标签样式：按标签实体约定读 tagName（label 兜底），tagColor 支持自定义标签
		groupLabelStyle(){
			return getGroupLabelStyle(this.groupInfo.tagName || this.groupInfo.label || '', this.groupInfo.tagColor || '')
		},
		pickupText(){
			
			// 注意：标签字段（tagName/label）不是提货方式，不能拿来当自提/快递文案
			if(this.groupInfo.pickupText) return this.groupInfo.pickupText
			if(this.groupInfo.pickup == 1) return '客户自提'
			if(this.groupInfo.pickup == 2) return '快递配送'
			return ''
		}
	},
	methods: {
		restoreSessionCart(){
			const app = getApp()
			const context = app.globalData.sessionCartContext || {}
			const belongsToCurrentGroup = Number(context.groupId || 0) === Number(this.groupId || 0)
			this.cartGoodsList = belongsToCurrentGroup ? (app.globalData.sessionCartGoodsList || []) : []
			this.cartGoodsTotal = this.cartGoodsList.reduce((sum, item) => sum + Number(item.num || 0), 0)
			this.numFlag++
		},
		getGoodsTags(item){
			
			if(Array.isArray(item.tags)) return item.tags.filter(Boolean)
			if(Array.isArray(item.tagList)) return item.tagList.filter(Boolean)
			if(item.tag) return String(item.tag).split(',').filter(Boolean)
			return []
		},
		getSoldText(item){
			
			const sold = item.soldNum || item.joinNum || 0
			return sold ? `已团${sold}` : ''
		},
		isProductSoldOut(item){
			return isGoodsSoldOut(item)
		},
		isGroupOnline(){
			return isMemberGroupOnline(this.groupInfo)
		},
		formatGroupTimeValue(value){
			if(value === undefined || value === null || value === '') return ''
			const text = String(value)
			if(/^\d+$/.test(text)){
				const num = Number(text)
				return formatGroupDateTime(text.length > 10 ? Math.floor(num / 1000) : num)
			}
			return text
		},
		getSelectedGoodsCount(item){
			return getCartQuantityForGoods(this.cartGoodsList, item.id)
		},
		// 多规格商品必须保留「加入购物车」入口：规格数量是商品级汇总，
		// 一旦被步进器顶掉入口，加过一个规格后就再也无法选择其它规格。
		hasSelectableSpec(item){
			return Array.isArray(item && item.specs) && item.specs.length > 0
		},
		getSelectedCartIndex(item){
			for(let i = this.cartGoodsList.length - 1; i >= 0; i--){
				if(this.cartGoodsList[i].id == item.id) return i
			}
			return -1
		},
			getLogCode(item, index){
				
				return item.code || item.id || item.orderId || (3268 - index)
			},
			formatLogNum(num){
				
				const value = String(num || '')
				return value.startsWith('+') ? value : `+${value}`
			},
			normalizeGroupLogs(logs = []){
				
				return (Array.isArray(logs) ? logs : [])
					.map(normalizeMemberHomeRecord)
					.filter(item => item.name || item.avatar || item.time || item.goodsName)
			},
		// 获取团长店铺
		async initGroupShop() {
			try {
				const param = {id:this.leaderId}
				const res = await getGroupShop(param)
				this.shopInfo = this.normalizeShopInfo(res.data || {})
			} catch (err) {
				console.log('获取团长店铺失败：', err)
			}
		},
		normalizeShopInfo(data = {}){
			
			const shopLogo = data.shopLogo || data.avatar || data.logo || data.shopAvatar || data.headImg || ''
			const banner = data.banner || data.shopPhoto || data.img || ''
			return {
				...data,
				name: data.name || data.shopName || '',
				shopLogo,
				avatar: shopLogo,
				banner
			}
		},
		// 获取团购详情
		async initGroupInfo() {
			try {
				// 查询团购详情
				const param = {id:this.groupId}
				const res = await getGroupInfo(param)
				this.groupInfo = this.mergeGroupInfoWithCache(res.data || {})
				if(!this.leaderId && (this.groupInfo.lid || this.groupInfo.leaderId)){
					this.leaderId = this.groupInfo.lid || this.groupInfo.leaderId
					this.initGroupShop()
				}
				// 初始化商品列表
				this.initGroupGoodsList()
			} catch (err) {
				console.log('获取团购详情失败：', err)
			}
		},
			getCachedGroupInfo(){
				const app = getApp()
				const map = app.globalData.sessionGroupDetailMap || {}
				return map[this.groupId] || {}
			},
			applyCachedGroupLogs(){
				
				const records = this.normalizeGroupLogs(this.getCachedGroupInfo().records || [])
				if(records.length === 0) return false
				this.applyGroupLogs(records)
				return true
			},
			applyGroupLogs(records = []){
				
				this.groupLogsTotal = records.length
				this.groupLogs = records
			},
		mergeGroupInfoWithCache(detail = {}){
			const cached = this.getCachedGroupInfo()
			const merged = Object.assign({}, cached, detail)
			if(!hasGroupIntroContent(merged.info) && hasGroupIntroContent(cached.info)){
				merged.info = cached.info
			}
			if(!hasGroupIntroContent(merged.content) && hasGroupIntroContent(cached.content)){
				merged.content = cached.content
			}
			return merged
		},
		// 初始化商品列表
		async initGroupGoodsList() {
			try {
				const param = {lid:this.leaderId, groupId:this.groupId}
				const res = await getGroupGoodsList(param)
				this.products = normalizeGroupGoodsList(res.data)
			} catch (err) {
				console.log('初始化商品列表失败：', err)
			}
		},
		// 获取商品库存
		getGroupGoodsStockNum(product) {
			
			return product.balance || 0
		},  
		// 添加到购物车弹框
		addToCart(product, cartContext = null){
			this.pendingAddCartContext = cartContext
			
			// 是否登录
			const token = uni.getStorageSync('token')
			if (!token) {
				// 去注册页面, 携带团购id方便返回
				const url = '/pages/login/index?id=' + this.groupId + '&lid=' + this.leaderId;
				uni.navigateTo({
					url,
					fail: () => {
						uni.redirectTo({ url })
					}
				})
				return
			}
			
			// 团购已下线
			if(!cartContext && !this.isGroupOnline()){
				uni.showToast({ title: '团购已下线，暂不能跟团', icon: 'none' })
				return
			}
			
			// 商品库存不足
			const goodsStockVal = this.getGroupGoodsStockNum(product)
			if(this.isProductSoldOut(product)){
				uni.showToast({ title: '商品库存不足, 无法添加入购物车', icon: 'none' })
				return
			}
			
			// 显示弹框；把购物车传进去，用于回填该商品已选规格与数量
			this.$refs.addCartRef.show(product, goodsStockVal, this.cartGoodsList)
		},
		getCurrentCartContext(){
			return {
				groupId: this.groupId,
				leaderId: this.leaderId,
				groupInfo: this.groupInfo,
				shopInfo: this.shopInfo
			}
		},
		// 添加到购物车回调
		addCartEvent(goods){
			
			const app = getApp()
			const context = app.globalData.sessionCartContext || {}
			const targetContext = this.pendingAddCartContext || this.getCurrentCartContext()
			if(context.groupId && context.groupId != targetContext.groupId){
				this.cartGoodsList = []
			}
			app.globalData.sessionCartContext = targetContext
			this.pendingAddCartContext = null
			
			// 弹窗步进器展示的就是购物车中该规格的数量，确认时按「商品 + 规格」覆盖写入
			this.cartGoodsList = setCartGoodsQuantity(this.cartGoodsList, goods)
			
			// 同步计算订单合计
			this.cartGoodsTotal = this.cartGoodsList.reduce((sum, item) => sum + Number(item.num || 0), 0)
			this.numFlag++
			app.globalData.sessionCartGoodsList = this.cartGoodsList
		},
		decreaseSelectedGoods(product){
			const index = this.getSelectedCartIndex(product)
			if(index < 0) return
			this.cartGoodsList = updateCartGoodsQuantity(this.cartGoodsList, index, -1, { removeWhenZero: true })
			this.syncCartGoodsList()
		},
		increaseSelectedGoods(product){
			const context = getApp().globalData.sessionCartContext || {}
			if(context.groupId == this.groupId && !this.isGroupOnline()){
				uni.showToast({ title: '团购已下线，暂不能跟团', icon: 'none' })
				return
			}
			const index = this.getSelectedCartIndex(product)
			if(index < 0) return
			const stock = Number(this.getGroupGoodsStockNum(product) || 0)
			const selectedCount = this.getSelectedGoodsCount(product)
			if(Number(product.isStock || 0) == 1 && stock > 0 && selectedCount >= stock){
				uni.showToast({ title: '商品库存不足, 无法继续添加', icon: 'none' })
				return
			}
			this.cartGoodsList = updateCartGoodsQuantity(this.cartGoodsList, index, 1, { removeWhenZero: true })
			this.syncCartGoodsList()
		},
		syncCartGoodsList(){
			this.cartGoodsTotal = this.cartGoodsList.reduce((sum, item) => sum + Number(item.num || 0), 0)
			this.numFlag++
			getApp().globalData.sessionCartGoodsList = this.cartGoodsList
		},
		// 去结算页面
		goToCartCheckPage() {
			
			// 生成结算快照，不直接改写当前详情页/半弹窗正在渲染的购物车数组。
			const checkoutGoodsList = this.cartGoodsList
				.filter(item => Number(item.num || 0) > 0)
				.map(item => Object.assign({}, item))
			
			// 商品不能为空
			if(checkoutGoodsList.length == 0){
				uni.showToast({ title: '请添加商品后再去结算', icon: 'none' })
				return
			}
			
			const app = getApp()
			const checkoutContext = this.getCurrentCartContext()
			
			// 当前团购下单时需要校验当前团购状态；推荐商品已按有效团购筛选，结算使用推荐商品所属团购上下文
			if(checkoutContext.groupId == this.groupId && !this.isGroupOnline()){
				uni.showToast({ title: '团购已下线，暂不能跟团', icon: 'none' })
				return
			}
			
			// 跳转页面, App.globalData 只在本次小程序会话内保留
			const url = '/pages/group/cart?id=' + checkoutContext.groupId + '&lid=' + checkoutContext.leaderId
			app.globalData.sessionCartGoodsList = checkoutGoodsList.map(item => Object.assign({}, item))
			app.globalData.sessionCheckoutGoodsList = checkoutGoodsList.map(item => Object.assign({}, item))
			app.globalData.sessionCartContext = checkoutContext
			if(this.$refs.cartDialogRef && this.$refs.cartDialogRef.hide) this.$refs.cartDialogRef.hide()
			uni.navigateTo({
				url,
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		},
		// 显示购物车
		showCartDialog(){
			
			// 商品不能为空
			if(this.cartGoodsList.length == 0){
				return
			}else{
				this.$refs.cartDialogRef.show()
			}
		},
		// 去首页
		gotoHome(){
			
			uni.switchTab({ url: '/pages/index/index' })
		},
		// 去订单列表
		gotoOrderPage(){
			
			uni.switchTab({ url: '/pages/order/index' })
		},
		// 初始化跟团记录
			async initLeaderGroupLogs(){
				
				try {
					const hasCachedLogs = this.applyCachedGroupLogs()
					if(!hasCachedLogs){
						const param = { id:this.groupId }
						const res = await getMemberGroupActivityLogs2(param)
						const logs = this.normalizeGroupLogs(resolveMemberHomeLogsData(res.data))
						this.applyGroupLogs(logs)
					}
				} catch (err) {
					console.log('初始化跟团记录失败：', err)
				}
			},
		// 查看是否黑名单
		async initIsBackMember(){
			
			try {
				const param = { lid:this.leaderId }
				const res = await isBackMember(param)
				this.isBlackMember = res.data
			} catch (err) {
				console.log('查看是否黑名单失败：', err)
			}
		}
	}
}
</script>

<style lang="scss" scoped>
// ----------------------------------------	
.group-main {
	position: relative;
	background: white;
	padding: 0 0 30rpx 0;
	margin: -60rpx 0rpx 15rpx 0rpx;
	border-radius: 20rpx;
	box-shadow: 0 8rpx 28rpx rgba(24, 144, 255, 0.08);
	overflow: hidden;
}
.group-hero {
	position: relative;
	width: 100%;
	height: 420rpx;
	background: linear-gradient(135deg, #e6f7ff 0%, #fff7e6 100%);
}
.group-hero-image {
	width: 100%;
	height: 100%;
}
.group-hero-empty {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: $text-primary;
	font-size: 72rpx;
	font-weight: bold;
}
.group-hero-badge {
	position: absolute;
	top: 24rpx;
	right: 24rpx;
	padding: 10rpx 22rpx;
	border-radius: 999rpx;
	color: #fff;
	background: $btn-green;
	font-size: $text-fontSize-small;
	font-weight: bold;
	&.closed {
		background: linear-gradient(135deg, #999 0%, #bbb 100%);
	}
}
.group-title-card {
	padding: 24rpx 24rpx 10rpx 24rpx;
}
.group-name {
	font-weight: bold;
	margin-bottom: 15rpx;
	font-size: 38rpx;
	line-height: 1.35;
}
.group-price {
	display: flex;
	align-items: baseline;
	gap: 15rpx;
}
.group-price .current {
	font-weight: bold;
	color: $text-danger;
	font-size: $text-fontSize-big;
}
.group-price .original {
	color: $text-color-999;
	text-decoration: line-through;
	font-size: $text-fontSize-medium;
}
.group-summary-bar {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	margin: 12rpx 24rpx 24rpx 24rpx;
	padding: 22rpx 0;
	border-radius: 16rpx;
	background: #f7fbff;
	border: 2rpx solid #e8f4ff;
}
.summary-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	border-right: 2rpx solid #e8f4ff;
	&:last-child {
		border-right: none;
	}
}
.summary-value {
	color: $text-color-333;
	font-size: 30rpx;
	font-weight: bold;
}
.summary-label {
	margin-top: 8rpx;
	color: $text-color-999;
	font-size: $text-fontSize-small;
}
// ----------------------------------------
.point-info {
	display: flex;
	gap: 15rpx;
	padding: 0 24rpx;
	margin-bottom: 15rpx;
}
.point-badge {
	display: flex;
	align-items: center;
	gap: 10rpx;
	padding: 8rpx 16rpx;
	background: #e6f7ff;
	color: #1890ff;
	border-radius: 5rpx;
	font-size: $text-fontSize-small;
}
.point-badge.warning {
	background: #fff7e6;
	color: #fa8c16;
}
.point-badge.success {
	background: #f6ffed;
	color: #52c41a;
}
// ----------------------------------------
.group-users {
	padding: 20rpx;
	background: #fffbe6;
	border-radius: 10rpx;
	margin-bottom: 15rpx;
	display: flex;
	align-items: baseline;
}
.avatar-group {
	display: flex;
	.avatar {
		width: 50rpx;
		height: 50rpx;
		border-radius: 50%;
		margin-left: -20rpx;
		border: 2rpx solid white;
		&:first-child {
			margin-left: 0;
		}
	}
}
.tip {
	color: $text-color-999;
	font-size: $text-fontSize-small;
}
// ----------------------------------------
.group-rich-section {
	margin: 0 24rpx 30rpx 24rpx;
	padding: 24rpx;
	border-radius: 16rpx;
	background: #fffdf7;
	margin-bottom: 30rpx;
	border: 2rpx solid #fff1b8;
}
.rich-content {
	line-height: 1.8;
	color: $text-color-666;
	font-size: $text-fontSize-medium;
}
// ----------------------------------------
.detail-title {
	font-weight: bold;
	margin: 20rpx auto;
	padding-bottom: 20rpx;
	border-bottom: 2rpx solid #f0f0f0;
	font-size: $text-fontSize-large;
}
.detail-content {
	line-height: 1.8;
	margin-bottom: 20rpx;
	color: $text-color-999;
	font-size: $text-fontSize-medium;
}
// ----------------------------------------
/* ===== 商品列表 ===== */
.product-list-section {
	background: #fff;
	margin: 0 24rpx 30rpx 24rpx;
}

.compact-group-head {
	padding: 24rpx 0 18rpx;
	border-bottom: 2rpx solid #f3f3f3;
}

.compact-title-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
	min-width: 0;
}

.compact-title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: #222;
	font-size: 30rpx;
	font-weight: 600;
}

.compact-ago {
	flex: none;
	color: #999;
	font-size: 22rpx;
}

.compact-time-row {
	display: flex;
	align-items: center;
	gap: 14rpx;
	margin-top: 10rpx;
	color: #999;
	font-size: 23rpx;
	line-height: 34rpx;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #333;
}

.product-count {
	font-size: 24rpx;
	color: #999;
}

.product-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.product-card {
	background: #fafafa;
	border-radius: 16rpx;
	padding: 15rpx;
	position: relative;
	overflow: hidden;
	border: 2rpx solid #f0f0f0;
}

.soldout-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(255, 255, 255, 0.85);
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: center;
}

.soldout-text {
	font-size: 36rpx;
	font-weight: 700;
	color: #999;
	letter-spacing: 8rpx;
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
	font-size: 30rpx;
	font-weight: 600;
	color: #333;
	line-height: 1.4;
}

.product-desc {
	font-size: 24rpx;
	color: #999;
	margin-top: 4rpx;
}

.product-price-row {
	display: flex;
	align-items: baseline;
}

.price-symbol {
	font-size: 26rpx;
	color: #ff4d4f;
	font-weight: 600;
}

.price-value {
	font-size: 40rpx;
	color: #ff4d4f;
	font-weight: 700;
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
	border-top: 1rpx solid #eee;
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

.btn-add-cart {
	padding: 12rpx 28rpx;
	background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
	color: #fff;
	font-size: 26rpx;
	font-weight: 500;
	border-radius: 32rpx;
}

.btn-notify {
	padding: 12rpx 28rpx;
	background: #fff1f0;
	color: #ff4d4f;
	font-size: 26rpx;
	border-radius: 32rpx;
	border: 2rpx solid #ffa39e;
}
// ----------------------------------------
.cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background: #fff;
  display: flex;
  align-items: flex-end;
  padding: 0 20rpx 20rpx 20rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.08);
  z-index: 99;
  //padding-bottom: constant(safe-area-inset-bottom);
  //padding-bottom: env(safe-area-inset-bottom);
}

.cart-left {
  padding: 0 16rpx;
}

.cart-icon-wrap {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -30rpx;
  box-shadow: 0 4rpx 16rpx rgba(24, 144, 255, 0.4);
}

.cart-icon-wrap .iconfont {
  font-size: 44rpx;
  color: #fff;
}

.cart-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  font-weight: 600;
}

.cart-center {
  flex: 1;
  padding-left: 16rpx;
}

.cart-total-price {
  display: flex;
  align-items: baseline;
}

.total-label {
  font-size: 26rpx;
  color: #333;
}

.total-price-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #ff4d4f;
}

.cart-right {
  padding-left: 16rpx;
}

.btn-checkout {
  padding: 20rpx 40rpx;
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
}

// ----------------------------------------
.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: white;
	padding: 24rpx 32rpx;
	box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.1);
	z-index: 100;
}
.btn-buy {
	width: 100%;
	height: 96rpx;
	background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
	color: white;
	font-size: 32rpx;
	font-weight: bold;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
// ----------------------------------------

.group-logs{

	display: flex;
	flex-direction: column-reverse;

	.group-logs-item {
		display: flex; 
		gap: 10rpx; 
		margin-bottom: 20rpx;
		
		.group-logs-item-img {
			width: 80rpx; 
			height: 80rpx;
		}
		
.group-logs-item-content{
	flex: 1;
		}
		
		.group-logs-item-user{
			
			display: flex; 
			height: 40rpx; 
			line-height: 40rpx; 
			gap: 10rpx;
			
			.bold {
				font-weight: 700;
			}
			.grey {
				color: #999;
			}
			.red{
				color: #ff4d4f;
			}
			.glod {
				color: #e8804d;
			}
		}
		
	}
	
}

/* 设计稿还原：首页进入后的商品详情页 */
.detail-green-header {
	position: relative;
	height: 300rpx;
	background: #22c55e;
	overflow: hidden;
}
.detail-banner {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	display: block;
}
.detail-home-button {
	position: fixed;
	left: 30rpx;
	top: 96rpx;
	z-index: 30;
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.detail-home-icon {
	width: 60rpx;
	height: 60rpx;
}
.group-main {
	margin: -72rpx 0 120rpx 0 !important;
	padding: 0 !important;
	background: #f4f4f4 !important;
	border-radius: 0 !important;
	box-shadow: none !important;
	overflow: visible !important;
}
.group-main.with-cart-bar {
	margin-bottom: calc(144rpx + constant(safe-area-inset-bottom)) !important;
	margin-bottom: calc(144rpx + env(safe-area-inset-bottom)) !important;
}
.shop-card {
	position: relative;
	padding: 92rpx 30rpx 18rpx 30rpx;
	background: #fff;
	border-radius: 18rpx 18rpx 0 0;
}
.shop-avatar {
	position: absolute;
	top: -46rpx;
	left: 30rpx;
	width: 94rpx;
	height: 94rpx;
	border-radius: 8rpx;
	border: 4rpx solid #fff;
	background: #eee;
}
.shop-name {
	color: #333;
	font-size: 28rpx;
	font-weight: 600;
}
.shop-sub {
	margin-top: 6rpx;
	color: #aaa;
	font-size: 22rpx;
}
.group-title-card {
	padding: 24rpx 30rpx 8rpx 30rpx !important;
	background: #fff;
}
.group-title-card .group-name {
	margin-bottom: 20rpx;
	color: #333;
	font-size: 30rpx;
	font-weight: 600;
	line-height: 1.45;
}
.group-tag-row {
	display: flex;
	align-items: center;
}

/* 团购标签药丸：尺寸/切图与首页卡片完全一致（设计图 个人信息@2x.png 量得） */
.group-label {
	display: flex;
	align-items: center;
	height: 28rpx;
	flex-shrink: 0;
	margin-right: 12rpx;
	padding-right: 16rpx;
	box-sizing: border-box;
	border: 2rpx solid #dddddd;
	border-radius: 14rpx;
	overflow: hidden;
	background: #ffffff;
}
.label-badge {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24rpx;
	height: 24rpx;
	flex-shrink: 0;
}
.label-ring {
	position: absolute;
	left: 0;
	top: 0;
	width: 24rpx;
	height: 24rpx;
}
.label-icon {
	width: 24rpx;
	height: 24rpx;
}
.group-label.tone-fast .label-icon {
	width: 9rpx;
	height: 15rpx;
}
.label-text {
	margin-left: 15rpx;
	font-size: 22rpx;
	line-height: 1;
}

.self-pick-tag {
	display: inline-flex;
	padding: 6rpx 12rpx;
	color: #22c55e;
	background: #eafaf0;
	font-size: 22rpx;
}
.group-stat-line {
	display: flex;
	gap: 16rpx;
	padding: 4rpx 30rpx;
	background: #fff;
	color: #aaa;
	font-size: 22rpx;
}
.group-stat-line .end-time {
	color: #ff3b30;
}
.group-rich-section {
	margin: 16rpx 0 0 0 !important;
	padding: 20rpx 30rpx 0 30rpx !important;
	border: none !important;
	border-radius: 0 !important;
	background: #fff !important;
}
.rich-content {
	color: #333 !important;
	font-size: 28rpx !important;
	line-height: 1.55 !important;
}
.product-list-section {
	margin: 8rpx 0 0 0 !important;
	padding: 0 !important;
	background: #fff !important;
}
.product-list {
	gap: 0 !important;
}
.product-card {
	display: grid !important;
	grid-template-columns: 154rpx minmax(0, 1fr) 152rpx;
	gap: 16rpx;
	padding: 24rpx 30rpx !important;
	border: none !important;
	border-bottom: 2rpx solid #f0f0f0 !important;
	border-radius: 0 !important;
	background: #fff !important;
}
.product-card.soldout {
	opacity: 0.72;
}
.product-image {
	width: 154rpx;
	height: 154rpx;
	border-radius: 2rpx;
	background: #eee;
}
.product-card .product-info {
	padding: 0 !important;
	justify-content: flex-start !important;
}
.product-card .product-name {
	font-size: 26rpx !important;
	font-weight: 500 !important;
	line-height: 1.3 !important;
	white-space: normal;
	word-break: break-all;
}
.product-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
	margin: 12rpx 0 16rpx 0;
	text {
		padding: 4rpx 8rpx;
		background: #eafaf0;
		color: #22c55e;
		font-size: 20rpx;
	}
}
.product-side {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	min-width: 0;
	width: 152rpx;
}
.share-icon {
	width: 42rpx;
	height: 42rpx;
}
.share-button {
	width: 42rpx;
	height: 42rpx;
	margin: 0;
	padding: 0;
	border: none;
	background: transparent;
	line-height: 1;
}
.share-button::after {
	border: none;
}
.sold-count {
	margin-top: 18rpx;
	color: #ff7a45;
	font-size: 20rpx;
}
.product-side .btn-add-cart {
	margin-top: auto;
	width: 152rpx;
	height: 56rpx;
	display: flex !important;
	align-items: center;
	justify-content: center;
	padding: 0 12rpx !important;
	border-radius: 4rpx !important;
	background: #22c55e !important;
	color: #fff !important;
	font-size: 22rpx !important;
	line-height: 1;
	text-align: center;
	box-sizing: border-box;
}
.product-side .btn-add-cart.disabled {
	background: #d9d9d9 !important;
	color: #fff !important;
}
.product-side .btn-add-cart.related {
	background: #22c55e !important;
}
.cart-stepper {
	margin-top: auto;
	width: 152rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 18rpx;
}
.cart-stepper-btn {
	width: 44rpx;
	height: 44rpx;
	border: 2rpx solid #22c55e;
	color: #22c55e;
	background: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	line-height: 1;
	box-sizing: border-box;
}
.cart-stepper-btn.plus {
	background: #22c55e;
	color: #fff;
}
.cart-stepper-num {
	min-width: 28rpx;
	text-align: center;
	color: #222;
	font-size: 26rpx;
	line-height: 44rpx;
}
.logs-section {
	margin-top: 16rpx;
	padding: 26rpx 30rpx 22rpx 30rpx;
	background: #fff;
}
.logs-section .section-title {
	font-size: 30rpx;
	font-weight: 500;
}
.logs-section .group-logs {
	display: flex !important;
	flex-direction: column !important;
	margin-top: 22rpx;
}
	.logs-section .group-logs-item {
		display: flex !important;
		align-items: center;
		gap: 12rpx;
		padding: 8rpx 0;
		margin-bottom: 0 !important;
	}
	.log-code {
		flex: 0 0 86rpx;
		width: 86rpx;
		color: #999;
		font-size: 22rpx;
		line-height: 52rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.logs-section .group-logs-item-img {
		flex: 0 0 52rpx;
		width: 52rpx !important;
		height: 52rpx !important;
		border-radius: 4rpx !important;
}
.logs-section .group-logs-item-content {
	min-width: 0;
}
.logs-section .group-logs-item-user {
	display: flex !important;
	align-items: center;
	justify-content: flex-start !important;
	width: 100%;
	height: auto !important;
	line-height: 1.35 !important;
	color: #999;
	font-size: 22rpx;
	min-width: 0;
	.grey {
		display: block;
		width: 100%;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: keep-all;
	}
	}
	.log-num {
		flex: 0 0 44rpx;
		color: #22c55e;
		font-size: 24rpx;
		text-align: right;
	white-space: nowrap;
}
.more-logs {
	margin-top: 18rpx;
	min-height: 44rpx;
	padding: 8rpx 0 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	color: #aaa;
	font-size: 24rpx;
	line-height: 1;
}
.more-logs-text {
	display: block;
	height: 28rpx;
	line-height: 28rpx;
}
.more-logs-arrow {
	width: 14rpx;
	height: 14rpx;
	border-right: 2rpx solid #aaa;
	border-bottom: 2rpx solid #aaa;
	transform: rotate(45deg);
	box-sizing: border-box;
	margin-top: -8rpx;
}
.cart-bar {
	height: 112rpx !important;
	padding: 0 0 constant(safe-area-inset-bottom) 0 !important;
	padding: 0 0 env(safe-area-inset-bottom) 0 !important;
	align-items: stretch !important;
	background: #fff !important;
	box-sizing: content-box;
	box-shadow: none !important;
	border-top: 1rpx solid #eeeeee;
}
.cart-tab {
	flex: 0 0 165rpx;
	height: 112rpx;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: #666666;
	font-size: 24rpx;
	line-height: 1;
	gap: 8rpx;
	position: relative;
}
.cart-count-badge {
	position: absolute;
	top: 14rpx;
	right: 38rpx;
	min-width: 28rpx;
	height: 28rpx;
	padding: 0 6rpx;
	border-radius: 999rpx;
	background: #ff3b30;
	color: #fff !important;
	font-size: 18rpx !important;
	line-height: 28rpx !important;
	text-align: center;
	box-sizing: border-box;
}
.cart-tab-icon {
	width: 48rpx;
	height: 48rpx;
	display: block;
	flex-shrink: 0;
}
.cart-tab {
	text {
		font-size: 24rpx;
		line-height: 28rpx;
	}
}
.cart-bar .btn-checkout {
	flex: 1;
	min-width: 0;
	height: 112rpx !important;
	display: grid !important;
	grid-template-rows: 26rpx 38rpx;
	place-content: center;
	justify-items: center;
	row-gap: 10rpx;
	padding: 0 !important;
	box-sizing: border-box;
	border-radius: 0 !important;
	background: #25c562 !important;
	color: #fff !important;
	font-size: 22rpx !important;
	line-height: 1 !important;
}
.checkout-amount {
	display: block;
	min-width: 0;
	max-width: 100%;
	height: 26rpx;
	margin: 0 !important;
	padding: 0;
	font-size: 24rpx;
	line-height: 26rpx;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.checkout-label {
	display: block;
	height: 38rpx;
	margin: 0 !important;
	padding: 0;
	font-size: 30rpx;
	font-weight: 600;
	line-height: 38rpx;
}

</style>
