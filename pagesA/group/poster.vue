<template>
<view v-if="showModal" class="share-mask" @click.self="closeModal">
	<view class="share-sheet">
		<view class="share-options">
			<!-- 分享给微信：原生转发，发送当前商品的小程序卡片
			     商品信息挂在按钮 dataset 上（onShareAppMessage 以 res.target.dataset 为准），
			     不依赖面板是否已关闭，避免转发成整团卡片 -->
			<button
				class="share-option"
				:class="{ 'share-option-disabled': !coverReady }"
				open-type="share"
				:disabled="!coverReady"
				:data-group-id="item.id"
				:data-goods-id="item.goodsId"
				:data-lid="item.lid"
				:data-name="item.name"
				:data-img="item.img"
				@click="handleShareTap">
				<text class="option-icon wechat-icon">微</text>
				<text>{{ coverReady ? '分享给微信' : '准备封面…' }}</text>
			</button>
			<!-- 发朋友圈海报：点击后才生成商品海报，预览后通过图片菜单发朋友圈 -->
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
	props: {
		// 卡片封面是否已画好：未就绪时禁用「分享给微信」，
		// 保证分享出去的卡片一定是带价格/已售的海报，而不是纯商品图
		coverReady: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			showModal: false,
			item: {
				id: 0,
				goodsId: 0,
				lid: 0,
				name: '',
				img: ''
			}
		}
	},
	methods: {
		show(data, url){
			this.item.id = data.id
			this.item.goodsId = data.goodsId || 0
			this.item.lid = data.lid || data.leaderId || 0
			this.item.name = data.name
			this.item.img = url || data.img || ''
			this.showModal = true
		},
		// 原生转发一旦触发就收起本面板：延迟一点点等转发面板弹出，
		// 这样取消或发送完回到详情页时，页面上不会残留这一层
		handleShareTap(){
			setTimeout(() => this.closeModal(), 300)
		},
		emitPoster(){
			// 关闭弹窗会清空 item，事件传快照以保留当前商品上下文。
			this.$emit('poster', { ...this.item })
			this.closeModal()
		},
		closeModal() {
			// 通知父页面清理原生转发上下文，避免关闭面板后胶囊菜单仍转发上一件商品
			this.$emit('close')
			this.showModal = false
			this.item.id = 0
			this.item.goodsId = 0
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

/* 封面还在画：按钮置灰不可点，避免分享出纯商品图卡片 */
.share-option-disabled {
	opacity: 0.5;
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
