<template>
<view v-if="showModal" class="share-mask" @click.self="closeModal">
	<view class="share-sheet">
		<view class="share-options">
			<button class="share-option" open-type="share" :data-share="shareData">
				<text class="option-icon wechat-icon">微</text>
				<text>分享给微信</text>
			</button>
			<view class="share-option" @click="emitPoster">
				<text class="option-icon poster-icon">图</text>
				<text>发朋友圈海报</text>
			</view>
		</view>
		<view class="cancel" @click="closeModal">取消</view>
	</view>
</view>
</template>

<script>
export default {
	data() {
		return {
			showModal: false,
			item: {
				id: 0,
				lid: 0,
				name: '',
				img: ''
			}
		}
	},
	computed: {
		shareData(){
			return {
				title: this.item.name,
				imageUrl: this.item.img,
				path: `/pages/group/index?id=${this.item.id}&lid=${this.item.lid}`
			}
		}
	},
	methods: {
		show(data, url){
			this.item.id = data.id
			this.item.lid = data.lid
			this.item.name = data.name
			this.item.img = url || data.img || ''
			this.showModal = true
		},
		emitPoster(){
			this.$emit('poster', this.item)
			this.closeModal()
		},
		closeModal() {
			this.showModal = false
			this.item.id = 0
			this.item.lid = 0
			this.item.name = ''
			this.item.img = ''
		}
	}
}
</script>

<style lang="scss" scoped>
.share-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 999;
	display: flex;
	align-items: flex-end;
	background: rgba(0, 0, 0, 0.45);
}

.share-sheet {
	width: 100%;
	padding-bottom: env(safe-area-inset-bottom);
	border-radius: 14rpx 14rpx 0 0;
	background: #fff;
	overflow: hidden;
}

.share-options {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	padding: 38rpx 32rpx 32rpx;
	border-bottom: 10rpx solid #f5f5f5;
}

.share-option {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16rpx;
	min-height: 130rpx;
	padding: 0;
	background: transparent;
	color: #777;
	font-size: 24rpx;
	line-height: 34rpx;
}

button.share-option::after {
	border: none;
}

.option-icon {
	width: 72rpx;
	height: 72rpx;
	line-height: 72rpx;
	border-radius: 50%;
	text-align: center;
	font-size: 24rpx;
	font-weight: 600;
}

.wechat-icon {
	color: #fff;
	background: #22c55e;
}

.poster-icon {
	color: #22c55e;
	background: #f2f3f5;
}

.cancel {
	height: 110rpx;
	line-height: 110rpx;
	text-align: center;
	color: #333;
	font-size: 30rpx;
}
</style>
