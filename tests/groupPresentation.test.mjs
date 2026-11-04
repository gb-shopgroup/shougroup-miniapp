import assert from 'node:assert/strict'
import fs from 'node:fs'
import { filterGroupCardsByKeyword, hasGroupIntroContent, hasRichText, normalizeGroupCard } from '../utils/groupPresentation.js'

const goods = [
	{ id: 1, name: '苹果' },
	{ id: 2, name: '橙子' },
	{ id: 3, name: '葡萄' },
	{ id: 4, name: '梨' }
]

assert.equal(hasRichText('<p>今日团购</p>'), true)
assert.equal(hasRichText('今日团购'), false)
assert.equal(hasRichText('   '), false)
assert.equal(hasRichText(null), false)
assert.equal(hasGroupIntroContent('今日团购'), true)
assert.equal(hasGroupIntroContent('<p>今日团购</p>'), true)
assert.equal(hasGroupIntroContent('   '), false)
assert.equal(hasGroupIntroContent(null), false)

assert.deepEqual(normalizeGroupCard({
	id: 10,
	lid: 20,
	name: '周末鲜果团',
	img: '/a.png',
	img2: '',
	img3: '/c.png',
	price: 9.9,
	price2: 19.9,
	price3: 29.9,
	num: 8,
	goods: goods
}), {
	id: 10,
	leaderId: 20,
	name: '周末鲜果团',
	leaderName: '',
	leaderAvatar: '',
	timeText: '',
	viewText: '',
	distanceText: '',
	images: ['/a.png', '/c.png'],
	price: 9.9,
	price2: 19.9,
	price3: 29.9,
	isClose: 0,
	pickup: 0,
	joinNum: 8,
	goods: goods,
	records: []
})

assert.deepEqual(filterGroupCardsByKeyword([
	{ id: 1, name: '周末牛肉团', goods: [] },
	{ id: 2, name: '家庭食材', goods: [{ name: '藏牦牛' }] },
	{ id: 3, name: '水果团', goods: [{ name: '苹果' }] }
], '牛'), [
	{ id: 1, name: '周末牛肉团', goods: [] },
	{ id: 2, name: '家庭食材', goods: [{ name: '藏牦牛' }] }
])

const groupDetailSource = fs.readFileSync(new URL('../pages/group/index.vue', import.meta.url), 'utf8')
assert.match(groupDetailSource, /class="group-title-card" v-if="hasGroupIntroContent"/)
assert.match(groupDetailSource, /class="compact-group-head" v-if="!hasGroupIntroContent"/)
assert.match(groupDetailSource, /class="group-rich-section" v-if="hasGroupIntroContent"/)
assert.match(groupDetailSource, /parseHtml\(normalizeRichTextImages\(this\.groupRichText\)\)/)
assert.doesNotMatch(groupDetailSource, /class="group-rich-section" :class="\{ plain: !hasGroupRichText \}" v-if="hasGroupIntroContent"/)
assert.match(groupDetailSource, /class="cart-stepper"/)
// 商品分享：点图标直接进微信「选择朋友」（原生转发，不用中间面板）
assert.match(groupDetailSource, /class="share-button"[\s\S]*?open-type="share"[\s\S]*?:data-share-goods-id="item\.id"[\s\S]*?@click\.stop="handleShareTap\(item\)"/)
assert.match(groupDetailSource, /handleShareTap\(item\)\{[\s\S]*?this\.highlightGoods\(item && item\.id, 2000\)/)
assert.doesNotMatch(groupDetailSource, /openGoodsShareSheet/)
// 卡片：标题取商品名，卡片图直接用商品图；取不到时用 logo，避免微信回退成页面截图
assert.match(groupDetailSource, /title: product\.name \|\| groupName/)
assert.match(groupDetailSource, /imageUrl: product\.img \|\| this\.groupInfo\.img \|\| this\.shopBanner \|\| SHARE_FALLBACK_COVER/)
// C 端不再用隐藏画布画海报封面，相关画布与绘制逻辑应清干净
assert.doesNotMatch(groupDetailSource, /goodsShareCanvas/)
assert.doesNotMatch(groupDetailSource, /renderShareCard/)
assert.doesNotMatch(groupDetailSource, /preloadGoodsShareCovers/)
// 落地高亮：保留 8 秒 + 渲染慢时补一次滚动定位
assert.match(groupDetailSource, /this\.highlightGoods\(goodsId, 8000\)/)
assert.match(groupDetailSource, /setTimeout\(scrollToGoods, 500\)/)
assert.match(groupDetailSource, /onShareAppMessage\(res\)/)
assert.match(groupDetailSource, /dataset\.shareGoodsId/)
assert.match(groupDetailSource, /path: `\/pages\/group\/index\?\$\{params\.join\('&'\)\}`/)
assert.match(groupDetailSource, /decreaseSelectedGoods\(item\)/)
assert.match(groupDetailSource, /increaseSelectedGoods\(item\)/)
assert.doesNotMatch(groupDetailSource, /class="selected-count"/)
assert.match(groupDetailSource, />加入购物车<\/view>/)
assert.match(groupDetailSource, /this\.pendingAddCartContext \|\| this\.getCurrentCartContext\(\)/)
assert.doesNotMatch(groupDetailSource, /addGoodsId=\$\{item\.id\}/)
assert.doesNotMatch(groupDetailSource, /tryOpenPendingRelatedGoods/)
assert.match(groupDetailSource, /groupEndTimeText/)
assert.match(groupDetailSource, /return this\.products/)
assert.doesNotMatch(groupDetailSource, /featured-product-section|relatedGroupGoods|addRelatedGroupGoods/)
assert.match(groupDetailSource, /class="\{ 'with-cart-bar': isBlackMember==false \}"/)
assert.match(groupDetailSource, /margin-bottom: calc\(144rpx \+ env\(safe-area-inset-bottom\)\) !important/)
assert.match(groupDetailSource, /padding: 8rpx 0 72rpx/)
assert.match(groupDetailSource, /padding: 20rpx 30rpx 0 30rpx !important/)
assert.match(groupDetailSource, /margin: 8rpx 0 0 0 !important/)
// 商品分享卡片落地：goodsId 解析 → 滚动到被分享商品并短暂高亮
assert.match(groupDetailSource, /this\.focusGoodsId = resolveSharedGoodsId\(options\)/)
assert.match(groupDetailSource, /:id="item\.id \? 'goods-' \+ item\.id : ''"/)
assert.match(groupDetailSource, /'product-card-focus': focusGoodsId > 0 && Number\(item\.id \|\| 0\) === focusGoodsId/)
assert.match(groupDetailSource, /uni\.pageScrollTo\(\{[\s\S]*?selector: '#goods-' \+ goodsId/)
assert.match(groupDetailSource, /\.product-card\.product-card-focus \{/)

console.log('groupPresentation tests passed')
