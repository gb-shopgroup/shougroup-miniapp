<template>
<view v-if="showModal" class="modal-overlay" @click="hide()">
<view class="buy-modal" @click.stop>
	
	<view class="modal-header">
		<text class="modal-title">选择商品</text>
		<text class="modal-close" @click="hide()">×</text>
	</view>
	
	<view class="modal-body">
		
		<!-- 商品信息  -->
		<view class="product-summary">
			<view class="product-thumb">
				<image mode="widthFix" :src="goods.img"></image>
			</view>
			<view class="product-detail">
				<view class="product-name">{{goods.name}}</view>
				<view class="product-price">¥{{currentPrice}}</view>
				<view class="selected-spec-text" v-if="selectedSpecText">已选择：{{ selectedSpecText }}</view>
			</view>
		</view>
		
		<!-- 商品规格选择 -->
		<view class="spec-section" v-if="specList.length > 0">
			<template v-for="(spec, index) in specList" :key="index">
			<view class="spec-title">{{ spec.specName }}</view>
			<view class="spec-list">
				<view 
					v-for="(val, index2) in spec.valList" 
					:key="index2" 
					class="spec-item" 
					:class="{'active': isSpecValActive(spec.specId, val.valId)}" 
					@click="selectSpecVal(spec.specId, val.valId)">
					<view class="spec-name">{{ val.valName }}</view>
				</view>
			</view>	
			</template>
		</view>
		
		<!-- 商品数量选择 -->
		<view class="quantity-section" style="display: flex; justify-content: space-between;">
			<view>
				<view class="quantity-title">购买数量</view>
				<view class="quantity-control">
					<view class="qty-btn" @click="changeQuantity(-1)">-</view>
					<text class="qty-value">{{ goods.num }}</text>
					<view class="qty-btn" @click="changeQuantity(1)">+</view>
				</view>
			</view>
			<view class="stock-hint">
				<!-- 显示商品限购和库存 -->
				<view v-if="goods.stock == 1 && goods.balance > 20">库存充足</view>
				<view v-if="goods.stock == 1 && goods.balance <= 20">库存告急</view>
			</view>
		</view>
		
		<!-- 添加到购物车按钮 -->
		<view class="pay-btn" @click="addProuctToCart()">添加到购物车</view>	
	
	</view>
	
</view>
</view>
</template>

<script>
import { createCartItemFromGoods, findSkuBySelectedSpec, getCartItemKey, normalizeSpecList } from "@/utils/groupPurchase.js"

export default {
	data() {
		return {
			showModal: false,
			// 规格列表
			specList: [],
			// 购物车商品信息
			goods: {
				id: 0,
				name: '',
				img: '',
				price: '',
				// 商品类型,1普通商品2称重商品
				type: 0,
				
				// 是否设置库存
				stock: 0,
				// 商品剩余库存
				balance: 0,
				// 是否限购
				limit: 0,
				// 限购数量
				quantity: 0,
				
				
				// 商品单位
				unit: '',
				// 商品数量
				num: 1,
				// 包装信息: 本期不接包装，保留空字段用于历史订单接口兼容
				packId : 0,
				packName : "",
				packNum : 0,
				// 组合SKU信息: 用户选择规格后按 skus.ids 匹配
				skuId : 0,
				skuids : "",
				skunames : "",
				skus: []
			},
			selectedSku: null,
			// 键值对格式：规格ID做key，规格值ID做val
			// 用来标记用户选择那个规格下的那个规格值
			selectedSpecValIndexArray: {},
			// 键值对格式：规格值ID做key, 规格值名称做val
			// 用来使用规格值ID快速获取规格值名称
			selectedSpecValNamesArray: {},
			// 父页面传入的购物车列表，用于回填已选规格与数量
			cartGoodsList: [],
			refresh: 0, // 主动触发 computed
		}
	},
	// 计算
	computed: {
		// 商品实时价格
		currentPrice() {
			this.refresh
			return this.goods.price
		},
		// 商品价格合计
		totalPrice() {
			return (this.currentPrice * this.goods.num).toFixed(2)
		},
		selectedSpecText() {
			this.refresh
			if (this.selectedSku && this.goods.skunames) return this.goods.skunames
			const ids = Object.keys(this.selectedSpecValIndexArray).map(key => this.selectedSpecValIndexArray[key]).filter(Boolean)
			return ids.map(id => this.selectedSpecValNamesArray[id]).filter(Boolean).join('，')
		}
	},
	// 方法集
	methods: {
		// 打开弹框
		show(goodsInfo, balance, cartGoodsList = []){
			
			// 显示弹框
			this.showModal = true
			this.cartGoodsList = Array.isArray(cartGoodsList) ? cartGoodsList : []
			// 重置商品
			this.goods = {}
			// 商品ID
			this.goods.id = goodsInfo.id
			// 商品名称
			this.goods.name = goodsInfo.name
			// 商品主图
			this.goods.img = goodsInfo.img
			// 商品价格
			this.goods.price = goodsInfo.price			
			// 商品类型,1普通商品2称重商品
			this.goods.type = goodsInfo.type
			
			// 是否设置库存
			this.goods.stock = goodsInfo.isStock !== undefined ? goodsInfo.isStock : goodsInfo.stock
			// 商品剩余库存
			this.goods.balance = balance
			// 是否限购
			this.goods.limit = goodsInfo.limit
			// 限购数量
			this.goods.quantity = goodsInfo.quantity
			
			// 商品购买数量
			this.goods.num = 1
			// 商品单位
			this.goods.unit = goodsInfo.unit
			// 包装信息: 本期不接包装
			this.goods.packId = 0
			this.goods.packName = ""
			this.goods.packNum = 0
			// 组合SKU信息
			this.goods.skuId = 0
			this.goods.skuids = ""
			this.goods.skunames = ""
			this.goods.skus = Array.isArray(goodsInfo.skus) ? goodsInfo.skus : []
			this.selectedSku = null
			
			// 商品规格列表
			this.specList = normalizeSpecList(goodsInfo.specs)
			this.selectedSpecValIndexArray = {}
			this.selectedSpecValNamesArray = {}

			// 初始化规格键值对结构：购物车已加过该商品时回填其规格
			this.initSelectSpecMapStruct(this.resolveCartItemForGoods())
			this.syncSelectedSpecText()
			this.syncQuantityFromCart()
		},
		// 关闭弹框
		hide(){
			
			this.showModal = false
		},
		// 购物车中该商品最后一次加入的规格行（购物车按加入顺序追加）
		resolveCartItemForGoods(){
			for (let i = this.cartGoodsList.length - 1; i >= 0; i -= 1) {
				const item = this.cartGoodsList[i]
				if (item && String(item.id) === String(this.goods.id)) return item
			}
			return null
		},
		// 步进器展示「该规格在购物车中已有的数量」，购物车没有该规格时回到 1
		syncQuantityFromCart(){
			const key = getCartItemKey(this.goods)
			const item = this.cartGoodsList.find(row => getCartItemKey(row) === key)
			this.goods.num = Math.max(1, Number(item && item.num || 0) || 1)
		},
		// 按购物车已选规格（skuids 或规格值名称）构造选中表；传入标识但一个都没命中时返回 null 便于回退
		buildSelectedSpecMap(matchValues = []){
			const hasMatchTarget = matchValues.length > 0
			const selectedMap = {}
			let matchedCount = 0
			for (let i = 0; i < this.specList.length; i++) {
				const spec = this.specList[i]
				let vid = spec.valList[0].valId
				for (let j = 0; j < spec.valList.length; j++) {
					const val = spec.valList[j]
					if (matchValues.indexOf(String(val.valId)) !== -1 || matchValues.indexOf(String(val.valName)) !== -1) {
						vid = val.valId
						matchedCount += 1
						break
					}
				}
				selectedMap[spec.specId] = vid
			}
			return !hasMatchTarget || matchedCount > 0 ? selectedMap : null
		},
		// 初始化选中的规格值：优先回填购物车已有规格，否则每个规格默认选第一个值
		initSelectSpecMapStruct(cartItem = null){
			
			const cartValIds = String(cartItem && cartItem.skuids || '').split(',').map(item => item.trim()).filter(Boolean)
			const cartValNames = String(cartItem && cartItem.skunames || '').split(/[,，]/).map(item => item.trim()).filter(Boolean)
			
			// 构建 selectedSpecValIndexArray 字典结构体
			// 每个规格ID做key，规格值ID做val
			// 用来标记每个规格选中那个具体的规格值, 例如 "尺寸"规格 选中 "id=1"的规格值 "2X"
			this.selectedSpecValIndexArray = this.buildSelectedSpecMap(cartValIds) ||
				this.buildSelectedSpecMap(cartValNames) ||
				this.buildSelectedSpecMap()
			
			// 构建 selectedSpecValNamesArray 字典结构体
			// 每个规格值id做key，对应的规格值做value
			// 为了快速获取每个规格值id对应的名称, 例如 id=1 代表 "2X" 的规格值名称
			for (let i = 0; i < this.specList.length; i++) {				
				for (let j = 0; j < this.specList[i].valList.length; j++) {
					let vid = this.specList[i].valList[j].valId
					let vname = this.specList[i].valList[j].valName
					this.selectedSpecValNamesArray[vid] = vname
				}
			}
		},
		// 同步提交订单时候使用规格文本和组合SKU数据
		syncSelectedSpecText(){
			
			// 获取所有选中的规格值ID，然后从小到大排序
			let valIdArray = []
			for (let key in this.selectedSpecValIndexArray) {
				valIdArray.push(this.selectedSpecValIndexArray[key])
			}
			
			// 从小到大排序后使用英文逗号拼接
			let valIds = valIdArray.sort().join(',')
			// 用户选择的规格值id集合
			this.goods.skuids = valIds
			// 用户选择的规格值名称集合, 根据id获取值
			this.goods.skunames = this.getSpecValNameById(valIds)
			this.goods.skuId = 0
			this.selectedSku = null

			if (this.specList.length === 0) {
				this.refresh++
				return
			}

			const sku = findSkuBySelectedSpec(this.goods.skus, this.selectedSpecValIndexArray, this.selectedSpecValNamesArray)
			if (sku) {
				this.selectedSku = sku
				this.goods.skuId = sku.id || 0
				this.goods.skuids = sku.ids || valIds
				this.goods.skunames = sku.names || this.goods.skunames
				this.goods.price = Number(sku.price || 0)
				this.goods.price2 = Number(sku.price2 || 0)
				this.goods.balance = Number(sku.num !== undefined ? sku.num : (sku.stock || 0))
				if (sku.img) this.goods.img = sku.img
			}
			this.refresh++
		},
		// 根据规格值ids获取规则值名称们
		getSpecValNameById(valIds){
			
			let names = []
			const valArray = valIds.split(",");
			for (var i = 0; i < valArray.length; i++) {
				let vid = valArray[i]
				if(this.selectedSpecValNamesArray[vid]){
					names.push(this.selectedSpecValNamesArray[vid])
				}
			}
			return names.join(',')
		},
		// 点击选择规格事件：选择规格(规格Id和规格值Id)
		selectSpecVal(specId, valId) {
			
			// 注意：规格ID做key，规格值ID做val
			this.selectedSpecValIndexArray[specId] = valId
			this.syncSelectedSpecText()
			// 切规格后数量回到该规格在购物车中的数量（没有则 1）
			this.syncQuantityFromCart()
		},
		// 规格值是否选中。这里显式读取 refresh，让选中态与价格/文案走同一套刷新机制，
		// 否则切换规格后高亮可能不更新，看起来像"换了规格没生效"。
		isSpecValActive(specId, valId) {
			this.refresh
			return this.selectedSpecValIndexArray[specId] === valId
		},
		// 点击选择数量事件
		changeQuantity(delta) {
			
			this.goods.num = Math.max(1, this.goods.num + delta)
		},
		// 添加到购物车
		addProuctToCart(){
			
			// 判断商品库存
			this.syncSelectedSpecText()
			// 多规格商品必须先选全规格并匹配到 SKU：否则下单会带 skuId=0，后端按 SKU 扣库存会失败
			if(this.specList.length > 0 && !this.selectedSku){
				uni.showToast({ title: '请选择完整的商品规格', icon: 'none', duration: 2500 })
				return
			}
			if(this.goods.stock == 1 && this.goods.num > this.goods.balance){
				uni.showToast({ title: '商品库存不足, 无法添加入购物车', icon: 'none' })
				return
			}
			
			const cartGoods = createCartItemFromGoods(this.goods, {
				num: this.goods.num,
				skuId: this.goods.skuId,
				skuids: this.goods.skuids,
				skunames: this.goods.skunames,
				price: this.goods.price,
				balance: this.goods.balance,
				img: this.goods.img
			})
			
			// 隐藏弹框
			this.hide()
			
			// 回调传回商品数据(价格，数量，规格或者包装)
			this.$emit("childCartEvent", cartGoods)
		},
	}
}
</script>

<style lang="scss" scoped>
// ----------------------------------------
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.48);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 1000;
}
.buy-modal {
	width: 100%;
	max-height: 85vh;
	background: #fff;
	border-radius: 16rpx 16rpx 0 0;
	overflow: hidden;
}
.modal-header {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 96rpx;
	position: relative;
}
.modal-title {
	font-size: 30rpx;
	font-weight: 500;
	color: #222;
}
.modal-close {
	position: absolute;
	right: 30rpx;
	top: 24rpx;
	width: 44rpx;
	height: 44rpx;
	border: 2rpx solid #bfbfbf;
	border-radius: 50%;
	color: #999;
	font-size: 34rpx;
	line-height: 40rpx;
	text-align: center;
}
.modal-body {
	padding: 0 32rpx 0;
	max-height: calc(85vh - 96rpx);
	overflow-y: auto;
}
// ----------------------------------------
.product-summary {
	display: flex;
	gap: 18rpx;
	margin-bottom: 32rpx;
}
.product-thumb {
	width: 176rpx;
	height: 176rpx;
	background: #f5f5f5;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	border-radius: 4rpx;
	image {
		width: 100%;
		height: 100%;
		border-radius: 4rpx;
	}
}
.product-detail {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	min-width: 0;
	.product-name {
		font-size: 28rpx;
		color: #222;
		line-height: 40rpx;
		margin-bottom: 8rpx;
	}
	.product-price {
		color: #ff4d4f;
		font-size: 32rpx;
		line-height: 44rpx;
	}
}
.selected-spec-text {
	color: #666;
	font-size: 22rpx;
	line-height: 34rpx;
	margin-top: 18rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
// ----------------------------------------
.address-section {
	background: $bg-color;
	border-radius: 10rpx;
	padding: 15rpx;
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
	font-weight: bold;
	margin-bottom: 5rpx;
}
.address-detail {
	font-size: 24rpx;
	color: #999;
}
.address-change-btn {
	color: #1890ff;
	font-size: 28rpx;
}
// ----------------------------------------
.spec-section {
	margin-bottom: 28rpx;
}
.spec-title {
	font-size: 28rpx;
	margin-bottom: 14rpx;
	color: #222;
}
.spec-list {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx 20rpx;
	margin-bottom: 24rpx;
}
.spec-item {
	min-width: 112rpx;
	height: 54rpx;
	box-sizing: border-box;
	padding: 0 20rpx;
	border: 0;
	border-radius: 4rpx;
	background: #f2f2f2;
	display: flex;
	align-items: center;
	justify-content: center;
}
.spec-item.active {
	background: #28c76f;
	color: #fff;
}
.spec-name {
	font-size: 24rpx;
	line-height: 32rpx;
	margin-bottom: 0;
}
// ----------------------------------------
.quantity-section {
	margin: 8rpx 0 40rpx;
}
.quantity-title {
	font-size: 28rpx;
	margin-bottom: 0;
	color: #222;
}
.quantity-control {
	display: flex;
	align-items: center;
	gap: 24rpx;
}
.qty-btn {
	width: 48rpx;
	height: 48rpx;
	border: 2rpx solid #28c76f;
	border-radius: 0;
	background: #28c76f;
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 34rpx;
	line-height: 44rpx;
}
.qty-value {
	width: 42rpx;
	text-align: center;
	font-size: 30rpx;
	color: #333;
}
.stock-hint {
	display: flex;
	flex-direction: column-reverse;
	padding-bottom: 8rpx;
	color: #999;
	font-size: 24rpx;
	line-height: 34rpx;
}
// ----------------------------------------
.total-section {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 0;
	border-top: 2rpx solid #f0f0f0;
	margin-bottom: 30rpx;
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
	background: #28c76f;
	color: white;
	font-size: 32rpx;
	border-radius: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 -32rpx;
	padding: 0 32rpx;
}
// ----------------------------------------
</style>
