<template>
<view class="container">
<LeaderHeader title="团购合集" />
<view class="page">	
<view class="card">
	
	<view class="card-header">
	  <text class="card-title"><text class="iconfont icon-gift"></text> 团购合集</text>
	  <view class="btn btn-primary" @click="showCreateModal">
		<text class="iconfont icon-plus"></text> 创建合集
	  </view>
	</view>

	<view class="collection-list">
	  <view class="collection-card" v-for="(item, index) in collectionList" :key="index">
		<view class="collection-header">
		  <view class="collection-color" :style="{ background: item.coverColor }"></view>
		  <view class="collection-info">
			<text class="collection-name">{{ item.name }}</text>
			<text class="collection-count">{{ item.productCount }}个团购</text>
		  </view>
		  <view class="collection-status" :class="{ active: item.status === 1 }">
			{{ item.status === 1 ? '启用' : '禁用' }}
		  </view>
		</view>
		<view class="collection-products">
		  <view class="product-thumb" v-for="(product, pIndex) in item.products.slice(0, 4)" :key="pIndex">
			<text class="iconfont" :class="product.icon" :style="{ color: product.iconColor }"></text>
		  </view>
		  <view v-if="item.products.length > 4" class="product-more">
			+{{ item.products.length - 4 }}
		  </view>
		</view>
		<view class="collection-actions">
		  <view class="btn btn-default btn-small" @click="editCollection(item)">
			<text class="iconfont icon-edit"></text> 编辑
		  </view>
		  <view class="btn btn-default btn-small" @click="previewCollection(item)">
			<text class="iconfont icon-eye"></text> 预览
		  </view>
		  <switch :checked="item.status === 1" @change="toggleStatus($event, item)" color="#52c41a" />
		</view>
	  </view>
	</view>

</view>
</view>

    <view class="modal-overlay" v-if="showModal" @click="closeModal">
      <view class="modal" style="max-width:600rpx;" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEdit ? '编辑合集' : '创建合集' }}</text>
          <text class="modal-close" @click="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-group">
            <text class="form-label required">合集名称</text>
            <input type="text" class="form-input" v-model="formData.name" placeholder="请输入合集名称" />
          </view>
          <view class="form-group">
            <text class="form-label">封面颜色</text>
            <view class="color-picker">
              <view class="color-item" v-for="color in colorList" :key="color" :class="{ active: formData.coverColor === color }" :style="{ background: color }" @click="selectColor(color)"></view>
            </view>
          </view>
          <view class="form-group">
            <text class="form-label required">选择团购商品</text>
            <view class="tips">至少选择2个团购</view>
            <view class="product-select">
              <view class="select-item" v-for="(product, index) in availableProducts" :key="index" :class="{ selected: formData.productIds.includes(product.id) }" @click="toggleProduct(product.id)">
                <text class="iconfont" :class="product.icon" :style="{ color: product.iconColor }"></text>
                <text class="select-name">{{ product.name }}</text>
                <text class="iconfont icon-check" v-if="formData.productIds.includes(product.id)"></text>
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn btn-default" @click="closeModal">取消</view>
          <view class="btn btn-primary" @click="saveCollection">保存</view>
        </view>
      </view>
    </view>

</view>
</template>

<script>
import LeaderHeader from "../common/header.vue"
export default {
	data() {
		return {
				  showModal: false,
				  isEdit: false,
				  currentCollection: null,
				  formData: {
					name: '',
					coverColor: '#52c41a',
					productIds: []
				  },
				  colorList: ['#52c41a', '#1890ff', '#722ed1', '#fa8c16', '#ff4d4f', '#13c2c2'],
				  collectionList: [
					{
					  id: 1,
					  name: '春季水果特惠',
					  coverColor: '#52c41a',
					  productCount: 4,
					  status: 1,
					  products: [
						{ id: 1, icon: 'icon-apple', iconColor: '#52c41a' },
						{ id: 2, icon: 'icon-lemon', iconColor: '#faad14' },
						{ id: 3, icon: 'icon-peach', iconColor: '#ff9800' },
						{ id: 4, icon: 'icon-carrot', iconColor: '#8bc34a' }
					  ]
					},
					{
					  id: 2,
					  name: '限时秒杀',
					  coverColor: '#ff4d4f',
					  productCount: 2,
					  status: 1,
					  products: [
						{ id: 3, icon: 'icon-peach', iconColor: '#ff9800' },
						{ id: 4, icon: 'icon-carrot', iconColor: '#8bc34a' }
					  ]
					}
				  ],
				  availableProducts: [
					{ id: 1, icon: 'icon-apple', iconColor: '#52c41a', name: '新鲜有机苹果 5斤装' },
					{ id: 2, icon: 'icon-lemon', iconColor: '#faad14', name: '四川爱媛果冻橙 5斤' },
					{ id: 3, icon: 'icon-peach', iconColor: '#ff9800', name: '新鲜水蜜桃 4斤装' },
					{ id: 4, icon: 'icon-carrot', iconColor: '#8bc34a', name: '有机红薯 5斤装' },
					{ id: 5, icon: 'icon-egg', iconColor: '#8B4513', name: '农家土鸡蛋 30枚' }
				  ]
		}
	},
	components: { LeaderHeader },
	onLoad() {

	},
	methods: {
		goPage(url) {
		  uni.navigateTo({ url })
		},
		showCreateModal() {
		  this.isEdit = false
		  this.formData = { name: '', coverColor: '#52c41a', productIds: [] }
		  this.showModal = true
		},
		editCollection(item) {
		  this.isEdit = true
		  this.currentCollection = item
		  this.formData = {
			name: item.name,
			coverColor: item.coverColor,
			productIds: item.products.map(p => p.id)
		  }
		  this.showModal = true
		},
		closeModal() {
		  this.showModal = false
		},
		selectColor(color) {
		  this.formData.coverColor = color
		},
		toggleProduct(id) {
		  const index = this.formData.productIds.indexOf(id)
		  if (index > -1) {
			this.formData.productIds.splice(index, 1)
		  } else {
			this.formData.productIds.push(id)
		  }
		},
		saveCollection() {
		  if (!this.formData.name) {
			uni.showToast({ title: '请输入合集名称', icon: 'none' })
			return
		  }
		  if (this.formData.productIds.length < 2) {
			uni.showToast({ title: '请至少选择2个团购', icon: 'none' })
			return
		  }
		  uni.showToast({ title: '保存成功', icon: 'success' })
		  this.closeModal()
		},
		previewCollection(item) {
		  uni.showToast({ title: '预览功能开发中', icon: 'none' })
		},
		toggleStatus(e, item) {
		  item.status = e.detail.value ? 1 : 0
		  uni.showToast({ title: item.status === 1 ? '已启用' : '已禁用', icon: 'success' })
		},
		logout() {
		  uni.showModal({
			title: '确认退出',
			content: '确定要退出登录吗？',
			success: (res) => {
			  if (res.confirm) {
				uni.reLaunch({ url: '/pages/login/index' })
			  }
			}
		  })
		}
	}
}
</script>

<style lang="scss" scoped>
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;

    .card-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
    }
  }
}

.collection-list {
  .collection-card {
    border: 2rpx solid #f0f0f0;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .collection-header {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;

    .collection-color {
      width: 80rpx;
      height: 80rpx;
      border-radius: 12rpx;
      margin-right: 20rpx;
    }

    .collection-info {
      flex: 1;

      .collection-name {
        display: block;
        font-size: 30rpx;
        font-weight: 600;
        color: #333;
        margin-bottom: 8rpx;
      }

      .collection-count {
        font-size: 24rpx;
        color: #999;
      }
    }

    .collection-status {
      font-size: 24rpx;
      padding: 8rpx 20rpx;
      border-radius: 8rpx;
      background: #f5f5f5;
      color: #999;

      &.active {
        background: #f6ffed;
        color: #52c41a;
      }
    }
  }

  .collection-products {
    display: flex;
    gap: 16rpx;
    margin-bottom: 20rpx;

    .product-thumb {
      width: 100rpx;
      height: 100rpx;
      background: #f5f5f5;
      border-radius: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .iconfont {
        font-size: 48rpx;
      }
    }

    .product-more {
      width: 100rpx;
      height: 100rpx;
      background: #f0f0f0;
      border-radius: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      color: #999;
    }
  }

  .collection-actions {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid #f0f0f0;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 90%;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx 40rpx;
    border-bottom: 1rpx solid #f0f0f0;

    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
    }

    .modal-close {
      font-size: 48rpx;
      color: #999;
    }
  }

  .modal-body {
    padding: 40rpx;
    max-height: 60vh;
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    gap: 20rpx;
    padding: 30rpx 40rpx;
    border-top: 1rpx solid #f0f0f0;
  }
}

.form-group {
  margin-bottom: 30rpx;

  .form-label {
    display: block;
    font-size: 28rpx;
    color: #333;
    margin-bottom: 16rpx;

    &.required::before {
      content: '* ';
      color: #ff4d4f;
    }
  }

  .tips {
    font-size: 24rpx;
    color: #999;
    margin-bottom: 16rpx;
  }

  .form-input {
    width: 100%;
    height: 80rpx;
    padding: 0 24rpx;
    border: 2rpx solid #e8e8e8;
    border-radius: 8rpx;
    font-size: 28rpx;
    box-sizing: border-box;
  }
}

.color-picker {
  display: flex;
  gap: 20rpx;

  .color-item {
    width: 60rpx;
    height: 60rpx;
    border-radius: 12rpx;
    cursor: pointer;

    &.active {
      border: 4rpx solid #333;
    }
  }
}

.product-select {
  .select-item {
    display: flex;
    align-items: center;
    padding: 20rpx;
    border: 2rpx solid #e8e8e8;
    border-radius: 12rpx;
    margin-bottom: 16rpx;
    cursor: pointer;

    &.selected {
      border-color: #1890ff;
      background: #e6f7ff;
    }

    .iconfont {
      font-size: 48rpx;
      margin-right: 16rpx;
    }

    .select-name {
      flex: 1;
      font-size: 28rpx;
      color: #333;
    }

    .icon-check {
      color: #1890ff;
      font-size: 32rpx;
    }
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;

  &.btn-primary {
    background: #1890ff;
    color: #fff;
  }
  &.btn-default {
    background: #f5f5f5;
    color: #666;
  }
  &.btn-small {
    padding: 12rpx 24rpx;
    font-size: 24rpx;
  }
}
</style>
