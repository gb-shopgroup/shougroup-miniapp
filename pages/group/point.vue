<template>
<view v-if="showAddressModal" class="modal-overlay" @click="hide()">
<view class="address-modal" @click.stop>
	
	<view class="modal-header">
		<text class="modal-title">选择提货点</text>
		<text class="modal-close" @click="hide()">×</text>
	</view>

	<view class="modal-body">
		<view 
			v-for="addr in pointList" 
			:key="addr.id" 
			class="address-item" 
			:class="{'selected': activePointId === addr.id}" 
			@click="selectAddress(addr.id)">
			<view class="addr-name">{{ addr.name }}</view>
			<view class="addr-detail">{{ addr.address }}</view>
			<view v-if="addr.person || addr.phone" class="addr-contact">{{ [addr.person, addr.phone].filter(Boolean).join(' ') }}</view>
			<view v-if="addr.info" class="addr-info">{{ addr.info }}</view>
		</view>
	</view>
	
</view>
</view>
</template>

<script>
export default {
	data() {
		return {
			showAddressModal: false,
			activePointId: 0,
		}
	},
	// 父组件传递过来的数据
	props: {
		pointList: {
			type: Array,
			default: []
		},
		selectedPointId: {
			type: Number,
			default: 0
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
	// 方法集合
	methods: {
		// 打开弹框
		show(selectedPointId){
			this.showAddressModal = true
			this.activePointId = Number(selectedPointId || 0)
		},
		// 关闭弹框
		hide(){
			this.showAddressModal = false
		},
		// 选择地址后传递给父组件(购物车), 传递真实自提点 ID。
		selectAddress(pointId) {
			this.showAddressModal = false
			this.$emit("childEvent", Number(pointId || 0))
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
.address-modal {
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
.address-item {
	padding: 24rpx;
	border: 2rpx solid #ddd;
	border-radius: 16rpx;
	margin-bottom: 20rpx;
	position: relative;
}
.address-item.selected {
	border-color: #1890ff;
	background: #e6f7ff;
}
.addr-name {
	font-size: 30rpx;
	font-weight: 500;
	margin-bottom: 8rpx;
}
.addr-detail {
	font-size: 24rpx;
	color: #999;
}
.addr-contact,
.addr-info {
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #666;
}
.addr-check {
	position: absolute;
	right: 24rpx;
	top: 50%;
	transform: translateY(-50%);
	color: #1890ff;
	font-size: 40rpx;
}
// ----------------------------------------
</style>
