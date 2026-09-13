import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	buildLeaderGroupCopyDraft,
	buildLeaderGroupSubmitPayload,
	formatGroupDateTime,
	formatGroupTimeRange,
	getLeaderGroupCoverImages,
	getLeaderGroupManageActions,
	getLeaderGroupStatus,
	normalizeLeaderGroup,
	normalizeRichTextImages,
	validateGroupTime
} from '../utils/leaderGroup.js'

const start = Math.floor(new Date(2026, 8, 28, 8, 0, 0, 0).getTime() / 1000)
const end = Math.floor(new Date(2026, 8, 29, 8, 0, 0, 0).getTime() / 1000)
assert.ok(start < 2147483647)
assert.ok(end < 2147483647)

assert.equal(formatGroupDateTime(start), '2026/09/28 08:00')
assert.equal(formatGroupTimeRange(start, end), '开始 2026/09/28 08:00\n结束 2026/09/29 08:00')
assert.deepEqual(validateGroupTime('', end), { valid: false, message: '请选择开始时间' })
assert.deepEqual(validateGroupTime(start, ''), { valid: false, message: '请选择结束时间' })
assert.deepEqual(validateGroupTime(end, start), { valid: false, message: '结束时间必须晚于开始时间' })
assert.deepEqual(validateGroupTime(Math.floor(new Date(2026, 8, 6, 8, 0, 0, 0).getTime() / 1000), end), { valid: false, message: '开始时间不能早于今天' })
assert.deepEqual(validateGroupTime(start, end), { valid: true, message: '' })

const normalized = normalizeLeaderGroup({
	id: 9,
	lid: 6,
	cat: 2,
	name: '周末鲜果团',
	shopName: '四季优选',
	shopLogo: '/shop-logo.png',
	memberNum: 2,
	joinNum: 9,
	followNum: 3,
	pickup: 1,
	price: 12,
	price2: 28,
	img: '/a.png',
	img2: '/b.png',
	img3: '/c.png',
	info: '本周到货',
	label: '自提',
	pointId: 5,
	pointName: '门店自提点',
	virtual: 8,
	order: 22,
	isClose: 0,
	isCheck: 1,
	startTime: start,
	endTime: end,
	goods: [{ gid: 3, gname: '香蕉', gtype: 2, img: '/g.png', price: 12, price2: 18, stock: '88斤' }]
})

assert.equal(normalized.label, '自提')
assert.equal(normalized.shopName, '四季优选')
assert.equal(normalized.leaderAvatar, '/shop-logo.png')
assert.equal(normalized.memberCount, 2)
assert.equal(normalized.joinCount, 9)
assert.equal(normalized.followCount, 3)
assert.equal(normalized.pointId, 5)
assert.equal(normalized.pointName, '门店自提点')
assert.equal(normalized.timeText, '开始 2026/09/28 08:00\n结束 2026/09/29 08:00')
assert.deepEqual(getLeaderGroupCoverImages(normalized), ['/g.png'])
assert.deepEqual(getLeaderGroupCoverImages(normalizeLeaderGroup({
	goods: [{ goodsId: 8, goodsName: '苹果', goodsImg: '/apple.png' }]
})), ['/apple.png'])
assert.equal(normalizeLeaderGroup({
	goods: [{ goodsId: 8, goodsName: '苹果', goodsImg: '/apple.png', isStock: 1, stockNum: 18, goodsUnit: '件' }]
}).goods[0].stock, '18件')
assert.equal(normalizeLeaderGroup({
	goods: [{ goodsId: 9, goodsName: '香蕉', goodsImg: '/banana.png', isStock: 0, stockNum: 18, goodsUnit: '件' }]
}).goods[0].stock, '不限')
assert.equal(normalizeLeaderGroup({
	goods: [{ goodsId: 10, goodsName: '梨', goodsImg: '/pear.png', stock: '0' }]
}).goods[0].stock, '不限')
assert.deepEqual(getLeaderGroupCoverImages({
	img: '/a.png',
	img2: '/b.png',
	img3: '/c.png',
	goods: [
		{ img: '/goods-a.png' },
		{ img: '/goods-b.png' },
		{ img: '/goods-a.png' }
	]
}), ['/goods-a.png', '/goods-b.png'])
assert.deepEqual(getLeaderGroupCoverImages({
	img: '/a.png',
	img2: '/b.png',
	img3: '/a.png',
	goods: []
}), ['/a.png', '/b.png'])
assert.deepEqual(getLeaderGroupStatus(normalized, (start + 3600) * 1000), { value: 1, text: '活动中', tone: 'success' })
assert.deepEqual(getLeaderGroupStatus(normalized, (start - 3600) * 1000), { value: 2, text: '未开始', tone: 'warning' })
assert.deepEqual(getLeaderGroupStatus(normalized, (end + 3600) * 1000), { value: 3, text: '已结束', tone: 'muted' })
assert.deepEqual(getLeaderGroupManageActions({ isClose: 0, statusInfo: { value: 1 } }).map(item => item.key), ['close', 'copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 0, statusInfo: { value: 2 } }).map(item => item.key), ['edit', 'close', 'copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 0, statusInfo: { value: 3 } }).map(item => item.key), ['copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 1, statusInfo: { value: 1 } }).map(item => item.key), ['edit', 'open', 'copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 1, statusInfo: { value: 3 } }).map(item => item.key), ['copy'])

assert.deepEqual(buildLeaderGroupSubmitPayload({
	id: 9,
	cat: 2,
	name: '周末鲜果团',
	pickup: 1,
	info: '本周到货',
	label: '自提',
	pointId: 5,
	virtual: '8',
	startTime: start,
	endTime: end,
	goods: [
		{ gid: 3, gname: '香蕉', gtype: 2, img: '/banana.png', price: 12, price2: 18 },
		{ goodsId: 4, goodsName: '苹果', goodsType: 1, groupImg: '/apple.png', groupPrice: 9.9, marketPrice: 15 }
	]
}), {
	id: 9,
	cat: 2,
	name: '周末鲜果团',
	pickup: 1,
	info: '本周到货',
	label: '自提',
	pointId: 5,
	virtual: 8,
	startTime: start,
	endTime: end,
	goods: [
		{ gid: 3, gname: '香蕉', gtype: 2, img: '/banana.png', price: 12, price2: 18 },
		{ gid: 4, gname: '苹果', gtype: 1, img: '/apple.png', price: 9.9, price2: 15 }
	],
	lists: [
		{ goodsId: 3, goodsName: '香蕉', goodsType: 2, groupImg: '/banana.png', groupPrice: 12, marketPrice: 18 },
		{ goodsId: 4, goodsName: '苹果', goodsType: 1, groupImg: '/apple.png', groupPrice: 9.9, marketPrice: 15 }
	]
})

assert.deepEqual(buildLeaderGroupCopyDraft(normalized), {
	id: 0,
	cat: 2,
	name: '周末鲜果团',
	pickup: 1,
	info: '本周到货',
	label: '自提',
	pointId: 5,
	pointName: '门店自提点',
	virtual: 8,
	startTime: '',
	endTime: '',
	goods: normalized.goods
})

const richTextWithImage = normalizeRichTextImages('<p>介绍</p><img src="/a.png"><img src="/b.png" width="49%" style="border-radius:12rpx;"><img src="/c.png" width="32%">')
assert.match(richTextWithImage, /<img src="\/a\.png" width="100%" style="width:100%;max-width:100%;height:auto;display:block;margin:10rpx 0;border-radius:8rpx;?">/)
assert.match(richTextWithImage, /<img src="\/b\.png" width="49%" style="border-radius:12rpx;width:49%;max-width:100%;height:auto;display:inline-block;vertical-align:top;margin:6rpx 0.5%;?">/)
assert.match(richTextWithImage, /<img src="\/c\.png" width="32%" style="width:32%;max-width:100%;height:auto;display:inline-block;vertical-align:top;margin:6rpx 0.5%;border-radius:8rpx;?">/)

const apiSource = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
assert.match(apiSource, /url:\s*'\/goods\/Leader\/get\/groupActivity\/list'/)
assert.match(apiSource, /method:\s*'POST'/)
assert.doesNotMatch(apiSource, /\/leader\/group\/share/)
assert.match(apiSource, /export function makeLeaderGroupPoster/)
assert.match(apiSource, /groupActivityQueryUrl/)
assert.match(apiSource, /groupId=\$\{encodeURIComponent\(groupId\)\}/)
assert.match(apiSource, /groupActivityQueryUrl\('\/goods\/Leader\/share\/groupActivity\/poster'/)
assert.match(apiSource, /groupActivityQueryUrl\('\/goods\/Leader\/share\/groupActivity\/make\/poster'/)
assert.match(apiSource, /export function closeLeaderGroupInfo/)
assert.match(apiSource, /groupActivityQueryUrl\('\/goods\/Leader\/groupActivity\/close'/)
assert.match(apiSource, /data:\s*\{\}/)

const addPage = fs.readFileSync(new URL('../pagesA/group/add.vue', import.meta.url), 'utf8')
assert.match(addPage, /validateGroupTime/)
assert.match(addPage, /buildLeaderGroupSubmitPayload/)
assert.match(addPage, /startTime/)
assert.match(addPage, /endTime/)
assert.match(addPage, /显示标签/)
assert.match(addPage, /自提点/)
assert.match(addPage, /getLeaderPointList/)
assert.match(addPage, /normalizeLeaderPoint/)
assert.match(addPage, /onPointChange/)
assert.match(addPage, /请选择自提点/)
assert.match(addPage, /请先新增自提点/)
assert.match(addPage, /请选择团购标签/)
assert.match(addPage, /openLabelPanel/)
assert.match(addPage, /labelOptions/)
assert.match(addPage, /picker-view/)
assert.match(addPage, /labelPickerValue/)
assert.match(addPage, /confirmLabelPanel/)
assert.doesNotMatch(addPage, /class="tag-list"/)
assert.doesNotMatch(addPage, /selectLabel/)
assert.match(addPage, /团购时间/)
assert.match(addPage, /openTimePanel/)
assert.match(addPage, /minDateText/)
assert.match(addPage, /maxDateText/)
assert.match(addPage, /copyId/)
assert.match(addPage, /syncSelectedGoodsStock/)
assert.match(addPage, /buildGroupGoodsReference/)
assert.doesNotMatch(addPage, /虚拟订单/)
assert.doesNotMatch(addPage, /class="virtual-input"/)
assert.doesNotMatch(addPage, /mode="multiSelector"/)
assert.match(addPage, /<editor/)
assert.match(addPage, /groupIntroEditor/)
assert.match(addPage, /getEditorContent/)
assert.match(addPage, /insertImage/)
assert.match(addPage, /uploadGroupIntroImage/)
assert.match(addPage, /imageLayouts/)
assert.match(addPage, /selectedImageLayout/)
assert.match(addPage, /selectImageLayout/)
assert.match(addPage, /一行两张/)
assert.match(addPage, /一行三张/)
assert.match(addPage, /normalizeRichTextImages/)
assert.doesNotMatch(addPage, /editorCtx:\s*null/)
assert.match(addPage, /_editorCtx/)
assert.doesNotMatch(addPage, /<textarea class="intro-input"/)

const listPage = fs.readFileSync(new URL('../pagesA/group/index.vue', import.meta.url), 'utf8')
assert.match(listPage, /statusTabs/)
assert.match(listPage, /search-section/)
assert.match(listPage, /开团中/)
assert.match(listPage, /bottom-actions/)
assert.match(listPage, /添加团购/)
assert.match(listPage, /复制团购/)
assert.match(listPage, /catId: 0/)
assert.match(listPage, /detailGroup/)
assert.match(listPage, /onShow\(\)/)
assert.match(listPage, /hasLoadedGroupList/)
assert.match(listPage, /getLeaderGroupCoverImages/)
assert.match(listPage, /makeLeaderGroupPoster/)
assert.match(listPage, /uni\.showLoading\(\{ title: '加载海报中\.\.\.', mask: true \}\)/)
assert.match(listPage, /uni\.showLoading\(\{ title: '生成海报中\.\.\.', mask: true \}\)/)
assert.match(listPage, /finally \{\s*uni\.hideLoading\(\)\s*\}/)
assert.doesNotMatch(listPage, /LeaderHeader/)
assert.doesNotMatch(listPage, /\/leader\/group\/share/)

const pagesJson = fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8')
assert.match(pagesJson, /"path":\s*"group\/detail"/)
const detailPage = fs.readFileSync(new URL('../pagesA/group/detail.vue', import.meta.url), 'utf8')
assert.match(detailPage, /getLeaderGroupInfo/)
assert.match(detailPage, /normalizeLeaderGroup/)
assert.match(detailPage, /parseHtml/)
assert.match(detailPage, /normalizeRichTextImages/)
assert.match(detailPage, /src="\/static\/image\/leader_group_back_circle\.png"/)
assert.doesNotMatch(detailPage, /<text class="back"[^>]*>‹<\/text>/)
assert.match(detailPage, /groupIntroNodes/)
assert.match(detailPage, /<rich-text :nodes="groupIntroNodes"/)
assert.doesNotMatch(detailPage, /class="image-grid"/)
assert.doesNotMatch(detailPage, /intro-img/)
assert.match(detailPage, /shareLeaderGroupPoster/)
assert.match(detailPage, /makeLeaderGroupPoster/)
assert.match(detailPage, /uni\.showLoading\(\{ title: '加载海报中\.\.\.', mask: true \}\)/)
assert.match(detailPage, /uni\.showLoading\(\{ title: '生成海报中\.\.\.', mask: true \}\)/)
assert.match(detailPage, /finally \{\s*uni\.hideLoading\(\)\s*\}/)
assert.match(detailPage, /leaderDisplayName\(\)/)
assert.match(detailPage, /leaderAvatarSrc\(\)/)
assert.match(detailPage, /leaderMetaText\(\)/)
assert.match(detailPage, /open-type="contact"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_service\.png"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_moments\.png"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_top_share\.png"/)
assert.match(detailPage, /shareToMomentsPoster/)
assert.match(detailPage, /onShareTimeline\(\)/)
assert.match(detailPage, /timelineShareData\(\)/)
assert.match(detailPage, /生成朋友圈海报失败/)
assert.match(detailPage, /生成海报失败/)
assert.doesNotMatch(detailPage, /enableTimelineShare/)
assert.doesNotMatch(detailPage, /请点右上角分享到朋友圈/)
assert.match(detailPage, /成员\$\{memberCount\} \| 跟团人次\$\{joinCount\} \| \$\{followCount\}人关注你/)
assert.match(detailPage, /class="goods-share-icon" src="\/static\/image\/leader_group_share\.png"/)
assert.doesNotMatch(detailPage, />↗<\/view>/)
assert.match(detailPage, /src="\/static\/image\/leader_group_order\.png"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_manage\.png"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_wechat\.png"/)
assert.match(detailPage, /visitorText\(\)/)
assert.match(detailPage, /\$\{Number\(this\.group\.order \|\| 0\)\}人来过/)
assert.match(detailPage, /class="bottom-share" open-type="share"/)
assert.match(detailPage, /padding-bottom: calc\(156rpx \+ env\(safe-area-inset-bottom\)\)/)
assert.match(detailPage, /height: calc\(156rpx \+ env\(safe-area-inset-bottom\)\)/)
assert.match(detailPage, /padding: 24rpx 28rpx calc\(18rpx \+ env\(safe-area-inset-bottom\)\)/)
assert.match(detailPage, /align-items: flex-start/)
assert.match(detailPage, /跟团记录/)
assert.match(detailPage, /openManageSheet/)
assert.match(detailPage, /manageActions/)
assert.match(detailPage, /handleManageAction/)
assert.match(detailPage, /getLeaderGroupManageActions/)
assert.match(detailPage, /v-for="action in manageActions"/)
assert.match(detailPage, /closeLeaderGroupInfo/)
assert.match(detailPage, /确认重新开启该团购/)
assert.match(detailPage, /已开启/)
assert.match(detailPage, /开启失败/)
assert.doesNotMatch(detailPage, /删除团购/)
assert.doesNotMatch(detailPage, /当前接口暂不支持删除团购/)
assert.doesNotMatch(detailPage, /goManage/)

assert.match(pagesJson, /"path":\s*"group\/copy"/)
const copyPage = fs.readFileSync(new URL('../pagesA/group/copy.vue', import.meta.url), 'utf8')
assert.match(copyPage, /复制已有团/)
assert.match(copyPage, /getLeaderGroupList/)
assert.match(copyPage, /copyGroup/)
assert.match(copyPage, /copyId/)

const posterDialog = fs.readFileSync(new URL('../pagesA/group/poster.vue', import.meta.url), 'utf8')
const imgDialog = fs.readFileSync(new URL('../pagesA/group/img.vue', import.meta.url), 'utf8')
assert.match(posterDialog, /分享给微信/)
assert.match(posterDialog, /发朋友圈海报/)
assert.match(posterDialog, /open-type="share"/)
assert.match(imgDialog, /saveImageToPhotosAlbum/)
assert.doesNotMatch(posterDialog, /插入公众号/)
assert.doesNotMatch(posterDialog, /复制链接/)
