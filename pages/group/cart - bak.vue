<template>
<view v-if="showModal" class="modal-overlay" @click="hide()">
<view class="buy-modal" @click.stop>
	
	<view class="modal-header">
		<text class="modal-title">确认购买</text>
		<text class="modal-close" @click="hide()">×</text>
	</view>
	
	<view class="modal-body">
		
		<!-- 收货地址选择 -->
		<view class="address-section" @click="showAddressPicker" v-if="pickup == 2">
			<view class="address-info">
				<view class="address-name">姓名</view>
				<view class="address-detail">详细收货地址......</view>
			</view>
			<text class="address-change-btn">更换用户地址</text>
		</view>
		
		<!-- 提货点选择 -->
		<view class="address-section" @click="showPointPicker" v-if="pickup == 1">
			<view class="address-info">
				<view class="address-name">{{selectedPoint.name}}</view>
				<view class="address-detail">{{selectedPoint.address}}</view>
			</view>
			<text class="address-change-btn">更换提货点</text>
		</view>
		
		<!-- 团购图片，名称和价格  -->
		<view class="product-summary">
			<view class="product-thumb">
				<image mode="widthFix" :src="group.img"></image>
			</view>
			<view class="product-detail">
				<view class="product-name">{{group.name}}</view>
				<view class="product-price">¥{{currentPrice}}</view>
			</view>
		</view>
		
		<!-- 商品规格选择 -->
		<view class="spec-section" v-if="gtype == 1">
			<template v-for="(spec, index) in specList" :key="index">
			<view class="spec-title">{{ spec.specName }}</view>
			<view class="spec-list">
				<view v-for="(val, index2) in spec.valList" :key="index2" class="spec-item" :class="{'active': selectedSpecValIndexArray[spec.specId] === val.valId}" @click="selectSpecVal(spec.specId, val.valId)">
					<view class="spec-name">{{ val.valName }}</view>
					<!--<view class="spec-price">---------</view>-->
				</view>
			</view>	
			</template>
		</view>
		
		<!-- 商品包装选择 -->
		<view class="spec-section" v-if="gtype == 2">
			<view class="spec-title">选择包装</view>
			<view class="spec-list">
				<view v-for="(pack, index) in packList" :key="index" class="spec-item" :class="{'active': selectedPackIndex === index}" @click="selectPack(index)">
					<view class="spec-name">{{ pack.name }}</view>
					<view class="spec-price">¥{{ pack.price }}</view>
				</view>
			</view>
		</view>
		
		<!-- 商品数量选择 -->
		<view class="quantity-section">
			<view class="quantity-title">购买数量</view>
			<view class="quantity-control">
				<view class="qty-btn" @click="changeQuantity(-1)">-</view>
				<text class="qty-value">{{ quantity }}</text>
				<view class="qty-btn" @click="changeQuantity(1)">+</view>
			</view>
		</view>
		
		<!-- 商品金额合计 -->
		<view class="total-section">
			<text class="total-label">合计</text>
			<text class="total-price">¥{{totalPrice}}</text>
		</view>
		
		<!-- 立即下单支付按钮 -->
		<view class="pay-btn" @click="submitOrder">立即下单支付</view>	
	
	</view>
	
</view>
</view>
</template>

<script>
import { addOrder, payOrder } from "@/api/group.js"
export default {
	data() {
		return {
			showModal: false,
			quantity: 1,
			skuId:0, // 用户选择的skuid
			skuids : "", // 规格值id集合
			skunames : "", // 规制值集合
			// 键值对格式：规格ID做key，规格值ID做val
			// 用来标记用户选择那个规格下的那个规格值
			selectedSpecValIndexArray: {},
			selectedSpecValNamesArray: {},
			// 选择包装数组下标索引(不是数据ID)
			selectedPackIndex: 0,
			// 选择自提点数组下标索引(不是数据ID)
			selectedPointIndex: 0,
			// 选择用户收货地址数组下标索引(不是数据ID)
			selectedAddressIndex: 0,
			refresh: 0, // 主动触发 computed
		}
	},
	// 父组件传递过来的数据
	props: {
		// 团购Id
		groupId:{
			type: Number,
			default: 0
		},
		// 团购信息
		group: {
			type: Object,
			default: {}
		},
		// 商品类型：1普通商品2称重商品
		gtype: {
			type: Number,
			default: 0
		},
		// 商品提货方式：1自提2邮递
		pickup: {
			type: Number,
			default: 0
		},
		// 包装列表
		packList: {
			type: Array,
			default: []
		},
		// 规格列表
		specList: {
			type: Array,
			default: []	
		},
		// sku列表(价格和库存, 可能不存在)
		skuList: {
			type: Array,
			default: []	
		},
		// 自提点列表
		pointList: {
			type: Array,
			default: []
		},
		// 用户收货地址列表
		addressList: {
			type: Array,
			default: []
		}
	},
	// 初始化
	created() {
		//console.log("component created function run.")
	},
	// 初始化
	mounted(){
		//console.log("component mounted function run.")
	},
	// 计算
	computed: {
		// 商品价格: 兼容规格和包装两种情况
		currentPrice() {
			this.refresh
			if(this.gtype == 1){
				// 普通商品：考虑是否存在商品规格
				if(Array.isArray(this.specList) && this.specList.length){
					// 选择规格后返回价格和库存, 从sku里面获取价格和库存
					let res = this.selectSpecValPriceStock()
					if(res.price > 0){
						return res.price
					}else{
						return this.group.price
					}
				}else{
					// 使用团购价格
					return this.group.price
				}
			}else{
				// 称重商品：考虑是否存在商品包装
				if(Array.isArray(this.packList) && this.packList.length){
					// 使用包装价格
					return this.packList[this.selectedPackIndex].price.toFixed(2)
				}else{
					// 使用团购价格
					return this.group.price
				}	
			}
		},
		// 提货点信息
		selectedPoint() {
			return this.pointList[this.selectedPointIndex]
		},
		// 收货地址信息
		selectAddress(){
			return this.addressList[this.selectedAddressIndex]
		},
		// 价格合计
		totalPrice() {
			return (this.currentPrice * this.quantity).toFixed(2)
		}
	},
	// 方法集
	methods: {
		// 打开弹框
		show(){
			this.showModal = true
			this.initSelectSpecValPriceStock()
		},
		// 关闭弹框
		hide(){
			this.showModal = false
		},
		// 解决如何点击选择规格后从SKU中获取价格和库存
		// 构建规格和规格值的key-value结构
		// 初始化选中每个规格的第一个规格值
		initSelectSpecValPriceStock(){
			
			// 称重商品不需要
			if(this.gtype == 2) return
			
			// 注意：规格ID做key，规格值ID做val
			this.selectedSpecValIndexArray = {}
			for (let i = 0; i < this.specList.length; i++) {
				// 默认选中第一个valId
				let sid = this.specList[i].specId
				let vid = this.specList[i].valList[0].valId
				this.selectedSpecValIndexArray[sid] = vid
			}
			
			// 每个规格值id做key，对应的规格值做value
			for (let i = 0; i < this.specList.length; i++) {				
				for (let j = 0; j < this.specList[i].valList.length; j++) {
					let vid = this.specList[i].valList[j].valId
					let vname = this.specList[i].valList[j].valName
					this.selectedSpecValNamesArray[vid] = vname
				}
			}
			
			// 记忆提货点和收货地址, 这里是索引啊, 对应数组元素数据丢失后可能报错
			const pid = uni.getStorageSync('pointId')
			if(pid && pid < this.pointList.length){ this.selectedPointIndex = pid }
			const aid = uni.getStorageSync('addressId')
			if(aid && pid < this.addressList.length){ this.selectedAddressIndex = aid }
			
			// 初始化用户选中的规格值
			//this.selectSpecValPriceStock()
		},
		// 选择规格后返回价格和库存, 从sku里面获取价格和库存
		selectSpecValPriceStock(){
			
			// 获取所有选中的规格值ID，然后从小到大排序
			let valIdArray = []
			for (let key in this.selectedSpecValIndexArray) {
				valIdArray.push(this.selectedSpecValIndexArray[key])
			}
			
			// 从小到大排序后使用英文逗号拼接
			let valIds = valIdArray.sort().join(',')
			// 用户选择的规格值id集合
			this.skuids = valIds
			//console.log("skuids = ", this.skuids)
			// 用户选择的规格值名称集合, 根据id获取值
			this.skunames = this.getSpecValNameById(valIds)
			//console.log("skunames = ", this.skunames)
			
			// 从sku里面寻找价格和库存
			let id = 0, price = 0, stock = 0
			this.skuList.forEach(function(item) {
				if(item.ids === valIds) {
					id = item.id
					price = item.price
					stock = item.stock
				}
			})
			
			// 用户选择的skuId
			this.skuId = id
			
			// 返回结果
			return {id:id, price:price, stock:stock }
		},
		// 根据规格值id获取规则值名称
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
		// 回调父组件打开用户地址弹框
		showAddressPicker(){
			this.$emit("childAddressEvent", this.selectedAddressIndex)
		},
		// 选择用户地址后回调这里
		changeAddress(index){
			this.selectedAddressIndex = index
		},
		// 回调父组件打开提货点弹框
		showPointPicker(){
			this.$emit("childPointEvent", this.selectedPointIndex)
		},
		// 选择提货点后回调这里
		changePoint(index){
			this.selectedPointIndex = index
		},
		// 选择包装事件(数组下标索引)
		selectPack(index) {
			this.selectedPackIndex = index
		},
		// 点击规格事件：选择规格(规格Id和规格值Id)
		selectSpecVal(specId, valId) {
			// 注意：规格ID做key，规格值ID做val
			this.selectedSpecValIndexArray[specId] = valId
			this.refresh++ // 主动触发computed计算价格
		},
		// 选择数量事件
		changeQuantity(delta) {
			this.quantity = Math.max(1, this.quantity + delta)
		},
		// 下单事件
		async submitOrder() {
			
			try {
				
				// 获取包装ID
				let packId = 0
				let packName = ''
				if(Array.isArray(this.packList) && this.packList.length){
					packId = this.packList[this.selectedPackIndex].id
					packName = this.packList[this.selectedPackIndex].name
				}
				
				// 获取提货点ID
				let pointId = 0
				if(Array.isArray(this.pointList) && this.pointList.length){
					pointId = this.pointList[this.selectedPointIndex].id
					// 本地缓存提货点索引，下次直接使用
					uni.setStorageSync('pointId', this.selectedPointIndex)
				}
				
				// 获取收货地址ID
				let addressId = 0
				if(Array.isArray(this.addressList) && this.addressList.length){
					addressId = this.addressList[this.selectedAddressIndex].id
					// 本地缓存收货地址索引，下次直接使用
					uni.setStorageSync('addressId', this.selectedAddressIndex)
				}
				
				// 姓名和手机号（从本地获取）
				let name = uni.getStorageSync('name')
				let mobile = uni.getStorageSync('mobile')
				
				// 提交参数
				const param = {
					groupId: this.groupId,
					pointId: pointId,
					addressId: addressId,
					goodsNum: this.quantity,
					name: name,
					mobile: mobile,
					remark: '',
					// 包装信息
					packId: packId,
					packName : packName,
					packNum : 0,
					// sku信息
					skuId: this.skuId,
					skuids : this.skuids,
					skunames : this.skunames
				}
				const res = await addOrder(param)
				const orderId = res.data
				if(orderId == 0){	
					uni.showToast({ title: '下单失败', icon: 'none' })
					return
				}
				
				// 发起支付
				this.doPay(orderId)
				
			} catch (err) {
				console.log('下单支付失败：', err)
			}
		},
		// 发起支付
		async doPay(orderId) {
		
			try {
				
				// 本地获取openid
				const openid = uni.getStorageSync('openid');
				
				// 请求通联支付
				const params = { id: orderId, openid: openid }
				const res = await payOrder(params)
				const payParams = res.data;
				// payParams 包含：timeStamp、nonceStr、package、signType、paySign
				
				// 调起微信支付
				const res2 = await uni.requestPayment({
					provider: 'wxpay',
					timeStamp: payParams.timeStamp,
					nonceStr: payParams.nonceStr,
					package: payParams.package,
					signType: payParams.signType,
					paySign: payParams.paySign
				})
				
				// 支付成功
				uni.showToast({ title: '支付成功', icon: 'success' })
				uni.redirectTo({ url: '/pages/success/index?id=' + orderId})

			} catch (err) {
				
				console.error('支付失败：', err);
				if (err.errMsg && err.errMsg.includes('cancel')) {
					uni.showToast({ title: '支付已取消', icon: 'none' });
				} else {
					uni.showToast({ title: '支付失败', icon: 'none' });
				}
			}
		}
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
	background: rgba(0,0,0,0.5);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 1000;
}
.buy-modal {
	width: 100%;
	max-height: 85vh;
	background: #fff;
	border-radius: 32rpx 32rpx 0 0;
	overflow: hidden;
}
.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 32rpx;
	border-bottom: 2rpx solid #f0f0f0;
}
.modal-title {
	font-size: 32rpx;
	font-weight: 600;
}
.modal-close {
	font-size: 64rpx;
	color: #999;
	line-height: 1;
}
.modal-body {
	padding: 32rpx;
	max-height: 70vh;
	overflow-y: auto;
}
// ----------------------------------------
.product-summary {
	display: flex;
	gap: 15rpx;
	margin-bottom: 15rpx;
}
.product-thumb {
	width: 160rpx;
	height: 160rpx;
	background: $bg-color;
	display: flex;
	align-items: center;
	justify-content: center;
	image {
		border-radius: 10rpx;
	}
}
.product-detail {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	.product-name {
		font-size: 30rpx;
		font-weight: 500;
		margin-bottom: 16rpx;
	}
	.product-price {
		color: #ff4d4f;
		font-size: 36rpx;
		font-weight: 700;
	}
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
	margin-bottom: 15rpx;
}
.spec-title {
	font-size: 28rpx;
	//font-weight: bold;
	margin-bottom: 15rpx;
	color: $text-color-333;
}
.spec-list {
	display: flex;
	flex-wrap: wrap;
	gap: 15rpx;
}
.spec-item {
	padding: 15rpx;
	border: 2rpx solid #ddd;
	border-radius: 10rpx;
	//min-width: 180rpx;
}
.spec-item.active {
	border-color: #1890ff;
	background: #e6f7ff;
}
.spec-name {
	font-size: 26rpx;
	margin-bottom: 5rpx;
}
.spec-price {
	font-size: 28rpx;
	color: #ff4d4f;
	font-weight: bold;
}
// ----------------------------------------
.quantity-section {
	margin-bottom: 30rpx;
}
.quantity-title {
	font-size: 28rpx;
	//font-weight: bold;
	margin-bottom: 15rpx;
	color: $text-color-333;
}
.quantity-control {
	display: flex;
	align-items: center;
	gap: 15rpx;
}
.qty-btn {
	width: 64rpx;
	height: 64rpx;
	border: 2rpx solid #ddd;
	border-radius: 10rpx;
	background: #f5f5f5;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
}
.qty-value {
	width: 80rpx;
	text-align: center;
	font-size: 32rpx;
	//background: #f5f5f5;
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
	background: linear-gradient(135deg, #07c160 0%, #1aad19 100%);
	color: white;
	font-size: 32rpx;
	font-weight: bold;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
// ----------------------------------------
</style>
