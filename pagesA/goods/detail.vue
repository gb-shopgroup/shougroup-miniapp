<template>
<view class="container">
<LeaderHeader title="商品详情" />
<view class="page">
		
    <view class="card">
		  
        <view class="card-header">
          <text class="card-title"><text class="iconfont icon-info-circle"></text> 商品详情</text>
        </view>

        <view class="product-info-card">
          <view class="product-image">
            <text class="iconfont" :class="product.icon" :style="{ color: product.iconColor }"></text>
          </view>
          <view class="product-detail">
            <view class="flex gap-8" style="margin-bottom:16rpx;">
              <text class="badge" :class="product.source === '供应商' ? 'badge-primary' : 'badge-warning'">{{ product.source }}</text>
              <text class="badge badge-success">{{ product.status }}</text>
            </view>
            <view class="product-name">{{ product.name }}</view>
            <view class="product-desc">{{ product.description }}</view>
            <view class="product-price">¥{{ product.price }}</view>
          </view>
        </view>

        <view class="info-section">
          <view class="section-title">基本信息</view>
          <view class="info-row">
            <text class="label">商品分类</text>
            <text class="value">{{ product.category }}</text>
          </view>
          <view class="info-row">
            <text class="label">成本价</text>
            <text class="value">¥{{ product.costPrice }}</text>
          </view>
          <view class="info-row">
            <text class="label">售价</text>
            <text class="value text-primary">¥{{ product.price }}</text>
          </view>
          <view class="info-row">
            <text class="label">当前库存</text>
            <text class="value" :class="{ 'text-danger': product.stock < 10 }">{{ product.stock }}件</text>
          </view>
          <view v-if="product.reservationCount > 0" class="info-row">
            <text class="label">预约补货</text>
            <text class="value text-warning">已有 {{ product.reservationCount }} 人预约</text>
          </view>
        </view>

        <view class="info-section" v-if="product.specs && product.specs.length > 0">
          <view class="section-title">商品规格</view>
          <view class="spec-list">
            <view class="spec-item" v-for="(spec, index) in product.specs" :key="index">
              <text class="spec-name">{{ spec.name }}</text>
              <text class="spec-price">¥{{ spec.price }}</text>
              <text class="spec-stock">库存：{{ spec.stock }}</text>
            </view>
          </view>
        </view>

        <view class="info-section">
          <view class="section-title">配送区域</view>
          <view class="region-tags">
            <text class="region-tag" v-for="(region, index) in product.regions" :key="index">{{ region }}</text>
          </view>
        </view>

        <view class="info-section">
          <view class="section-title">退货设置</view>
          <view class="info-row">
            <text class="label">是否支持退货</text>
            <text class="value" :class="product.allowReturn ? 'text-success' : 'text-danger'">
              {{ product.allowReturn ? '支持退货' : '不支持退货' }}
            </text>
          </view>
          <view v-if="product.allowReturn" class="info-row">
            <text class="label">退货有效期</text>
            <text class="value">收货后 {{ product.returnDeadline }} 小时内</text>
          </view>
          <view v-if="!product.allowReturn && product.returnReason" class="info-row">
            <text class="label">不退货原因</text>
            <text class="value text-danger">{{ product.returnReason }}</text>
          </view>
        </view>

        <view class="info-section" v-if="product.source === '供应商'">
          <view class="section-title">价格说明</view>
          <view class="info-row">
            <text class="label">采购价格</text>
            <text class="value">¥{{ product.purchasePrice }}/件</text>
          </view>
          <view class="info-row">
            <text class="label">建议零售价</text>
            <text class="value">¥{{ product.suggestPrice }}/件</text>
          </view>
          <view class="info-row">
            <text class="label">预计利润</text>
            <text class="value text-success">¥{{ product.profit }}/件（{{ product.profitRate }}%）</text>
          </view>
        </view>

        <view class="action-bar">
          <view class="btn btn-default" @click="goBack">返回</view>
          <view v-if="product.status === '销售中'" class="btn btn-primary" @click="startGroupBuy">发起拼团</view>
          <view v-else-if="product.status === '待审核'" class="btn btn-warning">等待审核</view>
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
				  product: {
					id: 1,
					icon: 'icon-apple',
					iconColor: '#52c41a',
					source: '供应商',
					status: '销售中',
					name: '新鲜有机苹果 5斤装',
					description: '产自山东烟台有机种植基地，个大饱满，汁多甜脆。苹果富含多种维生素和矿物质，是老少皆宜的健康水果。',
					price: '29.90',
					costPrice: '19.90',
					purchasePrice: '19.90',
					suggestPrice: '35.00',
					profit: '10.00',
					profitRate: '50',
					stock: 120,
					reservationCount: 0,
					category: '水果',
					specs: [
					  { name: '小果（3斤装）', price: '29.90', stock: 50 },
					  { name: '中果（5斤装）', price: '45.00', stock: 40 },
					  { name: '大果（8斤装）', price: '68.00', stock: 30 }
					],
					regions: ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市'],
					allowReturn: true,
					returnDeadline: 48
				  }
		}
	},
	components: { LeaderHeader },
	onLoad() {
		if (options.id) {
		  console.log('Product ID:', options.id)
		}
	},
	methods: {
		goPage(url) {
		  uni.navigateTo({ url })
		},
		goBack() {
		  uni.navigateBack()
		},
		startGroupBuy() {
		  uni.navigateTo({ url: '/pages/groupList/index' })
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
    margin-bottom: 30rpx;

    .card-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
    }
  }
}

.product-info-card {
  display: flex;
  gap: 30rpx;
  padding: 30rpx;
  background: #fafafa;
  border-radius: 16rpx;
  margin-bottom: 30rpx;

  .product-image {
    width: 180rpx;
    height: 180rpx;
    background: #fff;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .iconfont {
      font-size: 80rpx;
    }
  }

  .product-detail {
    flex: 1;

    .product-name {
      font-size: 30rpx;
      font-weight: 600;
      color: #333;
      margin-bottom: 12rpx;
    }

    .product-desc {
      font-size: 26rpx;
      color: #999;
      margin-bottom: 16rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .product-price {
      font-size: 36rpx;
      font-weight: 700;
      color: #ff4d4f;
    }
  }
}

.info-section {
  margin-bottom: 30rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid #f0f0f0;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 0;
    font-size: 28rpx;

    .label {
      color: #999;
    }

    .value {
      color: #333;
    }
  }
}

.spec-list {
  .spec-item {
    display: flex;
    align-items: center;
    padding: 20rpx;
    background: #fafafa;
    border-radius: 12rpx;
    margin-bottom: 16rpx;

    &:last-child {
      margin-bottom: 0;
    }

    .spec-name {
      flex: 1;
      font-size: 28rpx;
      color: #333;
    }

    .spec-price {
      font-size: 28rpx;
      font-weight: 600;
      color: #ff4d4f;
      margin-right: 40rpx;
    }

    .spec-stock {
      font-size: 26rpx;
      color: #999;
    }
  }
}

.region-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  .region-tag {
    padding: 8rpx 20rpx;
    background: #e6f7ff;
    color: #1890ff;
    border-radius: 8rpx;
    font-size: 26rpx;
  }
}

.action-bar {
  display: flex;
  gap: 20rpx;
  justify-content: center;
  padding-top: 40rpx;
  border-top: 1rpx solid #f0f0f0;
}

.badge {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;

  &.badge-primary {
    background: #e6f7ff;
    color: #1890ff;
  }

  &.badge-warning {
    background: #fff7e6;
    color: #fa8c16;
  }

  &.badge-success {
    background: #f6ffed;
    color: #52c41a;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 60rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;

  &.btn-primary {
    background: #1890ff;
    color: #fff;
  }
  &.btn-default {
    background: #f5f5f5;
    color: #666;
  }
  &.btn-warning {
    background: #faad14;
    color: #fff;
  }
}

.flex {
  display: flex;

  &.gap-8 {
    gap: 16rpx;
  }
}

.text-primary {
  color: #1890ff;
}

.text-success {
  color: #52c41a;
}

.text-danger {
  color: #ff4d4f;
}

.text-warning {
  color: #fa8c16;
}
</style>
