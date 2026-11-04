import assert from 'node:assert/strict'
import fs from 'node:fs'
import { formatSharePrice, formatShareSales, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '../utils/shareCard.js'

function loadPage(file, deps = {}) {
 const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
 const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '').replace('export default', 'return')
 const definition = new Function(...Object.keys(deps), script)(...Object.values(deps))
 const page = definition.data()
 for (const [key, fn] of Object.entries(definition.methods)) page[key] = fn.bind(page)
 for (const [key, fn] of Object.entries(definition.computed || {})) Object.defineProperty(page, key, { get: fn.bind(page) })
 // 页面级生命周期钩子（onShareAppMessage 等）不在 methods 里，单独挂载
 for (const key of ['onShareAppMessage', 'onShareTimeline']) if (definition[key]) page[key] = definition[key].bind(page)
 return page
}
let emitted
const dialog = loadPage('../pagesA/group/poster.vue')
const dialogEvents = []
dialog.$emit = (evt, payload) => { if (evt === 'poster') emitted = payload; dialogEvents.push(evt) }
const requests = []
const previews = []
let result = 'https://example.com/goods-4.png'
let groupPosterRequests = 0
const page = loadPage('../pagesA/group/detail.vue', {
 PosterImgDialog: {}, PosterDialog: {}, normalizeLeaderGroup: data => data,
 getLeaderGroupCoverImages: group => (group.goods || []).map(item => item && item.img).filter(Boolean),
 // 分享封面工具：node 环境下不画 canvas，只验证标题/封面选择逻辑
 drawShareCard: () => {}, formatSharePrice, formatShareSales, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT,
 shareLeaderGroupGoodsPoster: async params => { requests.push(params); return { data: result } },
 makeLeaderGroupPoster: async () => { groupPosterRequests++; return { data: 'group-poster' } },
 uni: { showLoading() {}, hideLoading() {}, showToast() {} },
 console: { log() {} }
})
page.group = { id: 7, lid: 8, name: '团购', img: 'group-cover' }
page.$refs = { posterDialogRef: dialog, imgDialogRef: { show: url => previews.push(url) } }

// ===== 分享面板：打开即弹，不再预生成海报 =====
await page.openShareSheet({ gid: 104, gname: '第四件商品' })
assert.deepEqual(requests, [], '面板打开不预取商品海报')
assert.equal(dialog.showModal, true)
assert.equal(dialog.item.name, '第四件商品')
assert.equal(dialog.item.lid, 8)
assert.equal(dialog.item.goodsId, 104)
// 面板内「分享给微信」是原生转发商品小程序卡片：转发上下文在面板打开时设置
assert.match(String(page.onShareAppMessage().path), /goodsId=104/)
assert.equal(page.onShareAppMessage().title, '第四件商品')

// ===== 发朋友圈海报：点击后才生成商品海报，预览给图片分享菜单 =====
dialog.emitPoster()
assert.equal(emitted.goodsId, 104, '关闭弹窗后事件快照保留商品 ID')
assert.equal(dialog.showModal, false, '点击海报选项后关闭面板')
await page.shareLeaderGroupPosterImg(emitted)
assert.deepEqual(requests, [{ groupId: 7, goodsId: 104 }])
assert.equal(previews[0], result, '预览展示生成的商品海报')
assert.equal(groupPosterRequests, 0, '商品预览不能重新生成整团图')

// ===== 面板关闭清理转发上下文，恢复整团转发 =====
dialog.closeModal()
assert.ok(dialogEvents.includes('close'), '面板关闭需通知父页面')
page.clearGoodsShareContext()
assert.equal(page.activeGoodsShare, null)
assert.equal(page.onShareAppMessage().title, '团购', '无商品上下文时恢复整团转发')

// ===== 面板内按钮转发：以按钮 dataset 为准（面板关掉也不会转发成整团卡片）=====
const datasetCard = page.onShareAppMessage({
	from: 'button',
	target: { dataset: { goodsId: '104', name: '第四件商品', img: 'https://example.com/p4.png' } }
})
assert.equal(datasetCard.title, '第四件商品')
assert.equal(datasetCard.path, '/pages/group/index?id=7&lid=8&goodsId=104')
assert.equal(datasetCard.imageUrl, 'https://example.com/p4.png')
// 商品没封面时回退团购封面，标题回退团购名
const fallbackCard = page.onShareAppMessage({ target: { dataset: { goodsId: '105', name: '' } } })
assert.equal(fallbackCard.title, '团购')
assert.equal(fallbackCard.imageUrl, 'group-cover')
assert.match(fallbackCard.path, /goodsId=105/)
// 无 goodsId 的按钮（异常数据）继续走整团卡片，不发送空商品链接
assert.equal(page.onShareAppMessage({ target: { dataset: {} } }).title, '团购')

// ===== 空海报响应：提示失败且不预览 =====
result = ''
await page.shareLeaderGroupPosterImg({ goodsId: 104 })
assert.equal(previews.length, 1, '空海报不能进入预览')

// ===== 顶部整团海报保持原逻辑 =====
result = 'https://example.com/goods-2.png'
await page.shareToMomentsPoster()
assert.equal(groupPosterRequests, 1, '顶部整团海报保持原接口')
assert.equal(previews[1], 'group-poster')

const api = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
const query = api.match(/function queryUrl\([^]*?\n}/)[0]
const wrapper = api.match(/export function shareLeaderGroupGoodsPoster\([^]*?\n}/)[0].replace('export ', '')
const call = new Function('request2', `${query}\n${wrapper}\nreturn shareLeaderGroupGoodsPoster`)(req => req)
assert.deepEqual(call({ groupId: 7, goodsId: 104 }), {
 url: '/goods/Leader/share/groupActivity/goods/poster?groupId=7&goodsId=104', method: 'POST', data: {}
})

// ===== 卡片标题：只放商品名，价格/已售都画在封面海报里，标题不重复 =====
page.group = {
	id: 7, lid: 8, name: '团购', img: 'group-cover', joinTimes: 3,
	goods: [{ gid: 205, gname: '最新测试商品1', price: 10, img: 'https://example.com/potato.png' }]
}
const coverCard = page.buildGoodsShareCard({
	goodsId: 205, name: '最新测试商品1', img: 'https://example.com/potato.png', cover: '/tmp/share-cover.jpg'
})
assert.equal(coverCard.title, '最新测试商品1', '标题只放商品名')
assert.equal(coverCard.imageUrl, '/tmp/share-cover.jpg', '转发卡片用画布生成的封面')
const noCoverCard = page.buildGoodsShareCard({ goodsId: 205, name: '最新测试商品1', img: 'https://example.com/potato.png' })
assert.equal(noCoverCard.title, '最新测试商品1', '没有封面时标题也不拼价格/已售')
assert.equal(noCoverCard.imageUrl, 'https://example.com/potato.png')

// ===== 分享卡片封面：商品图优先，其次团购/活动图，最后 logo 保底（避免微信回退成页面截图）=====
assert.equal(page.shareCover('https://example.com/goods.png'), 'https://example.com/goods.png')
page.group = { id: 7, lid: 8, name: '团购', img: 'https://example.com/group.png' }
assert.equal(page.shareCover(''), 'https://example.com/group.png')
page.group = { id: 7, lid: 8, name: '团购', img: '', goods: [{ img: 'https://example.com/activity.png' }] }
assert.equal(page.shareCover(''), 'https://example.com/activity.png')
page.group = { id: 7, lid: 8, name: '团购', img: '' }
assert.equal(page.shareCover(''), 'https://shopgroup.obs.cn-north-9.myhuaweicloud.com/logo.png')

// 面板按钮必须把商品信息挂到 dataset 上，页面 onShareAppMessage 才能拿到当前商品
const posterSource = fs.readFileSync(new URL('../pagesA/group/poster.vue', import.meta.url), 'utf8')
assert.match(posterSource, /<button[\s\S]*?open-type="share"[\s\S]*?:data-goods-id="item\.goodsId"/)
assert.match(posterSource, /:data-group-id="item\.id"/)
assert.match(posterSource, /:data-lid="item\.lid"/)
assert.match(posterSource, /:data-name="item\.name"/)
assert.match(posterSource, /:data-img="item\.img"/)
// 团长端：点分享图标要高亮该商品；分享封面画布必须移出屏幕（原生 canvas 藏不住会盖住页面）
const detailPageSource = fs.readFileSync(new URL('../pagesA/group/detail.vue', import.meta.url), 'utf8')
assert.match(detailPageSource, /'goods-focus': shareFocusGoodsId > 0 && Number\(goods\.gid \|\| 0\) === shareFocusGoodsId/)
assert.match(detailPageSource, /this\.highlightSharedGoods\(goodsId\)/)
assert.match(detailPageSource, /\.goods\.goods-focus \{/)
assert.match(detailPageSource, /<canvas type="2d" id="goodsShareCanvas"/)
assert.match(detailPageSource, /\.goods-share-canvas \{[\s\S]*?width: 1px;[\s\S]*?opacity: 0;/)
// 画布还要移出屏幕，双保险不浮在页面上
assert.match(detailPageSource, /\.goods-share-canvas \{[\s\S]*?left: -9999px;/)
// 点「分享给微信」后自动收起分享面板，转发返回时详情页不残留这一层
const posterPanelSource = fs.readFileSync(new URL('../pagesA/group/poster.vue', import.meta.url), 'utf8')
assert.match(posterPanelSource, /@click="handleShareTap"/)
assert.match(posterPanelSource, /setTimeout\(\(\) => this\.closeModal\(\), 300\)/)
// 从转发面板返回（onShow）也兜底关闭，覆盖用户取消转发的情况
assert.match(detailPageSource, /if \(posterDialog && posterDialog\.showModal\) posterDialog\.closeModal\(\)/)

// ===== 一定是海报卡形式：封面画好前不允许转发，列表就绪后预先画好 =====
assert.match(posterPanelSource, /:disabled="!coverReady"/)
assert.match(posterPanelSource, /coverReady: \{[\s\S]*?type: Boolean/)
assert.match(posterPanelSource, /coverReady \? '分享给微信' : '准备封面…'/)
assert.match(detailPageSource, /:cover-ready="goodsShareCoverReady"/)
assert.match(detailPageSource, /this\.goodsShareCoverReady = !!this\.getGoodsShareCover\(goodsId\)/)
assert.match(detailPageSource, /preloadGoodsShareCovers\(\)\{[\s\S]*?slice\(0, 20\)/)
assert.match(detailPageSource, /this\.preloadGoodsShareCovers\(\)/)
// 面板打开期间封面画好要立刻放开按钮
assert.match(detailPageSource, /if \(this\.activeGoodsShare && Number\(this\.activeGoodsShare\.goodsId\) === goodsId\) \{[\s\S]*?this\.goodsShareCoverReady = true/)
console.log('leaderGroupShare tests passed')
