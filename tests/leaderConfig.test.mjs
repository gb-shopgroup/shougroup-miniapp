import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	DEFAULT_STAFF_AUTH_IDS,
	buildLeaderPointPayload,
	buildLeaderShopPayload,
	buildLeaderStaffPayload,
	getCurrentLeaderPointId,
	isValidMobile,
	normalizeLeaderPoint,
	normalizeLeaderShop,
	normalizeLeaderStaff,
	normalizeBlackMember,
	resolveBlackMemberId,
	splitImageList,
	splitIdList
} from '../utils/leaderConfig.js'

assert.deepEqual(DEFAULT_STAFF_AUTH_IDS, [10, 20, 30, 50, 70])
assert.deepEqual(splitIdList('7,8,0,abc,7'), [7, 8])
assert.deepEqual(splitIdList([7, '8', 0, 'bad']), [7, 8])
assert.deepEqual(splitImageList('/a.png,/b.png,/a.png,/c.png,/d.png'), ['/a.png'])

const shop = normalizeLeaderShop({
	shopId: 9,
	id: 8,
	name: '云朵小店',
	shortName: '云朵',
	avatar: '/avatar.png',
	shopLogo: '/shop-logo.png',
	mobile: '13800138000',
	banner: '/shop.png',
	shopInfo: '每天新鲜到店',
	shopUrl: '/qr.png'
})
assert.equal(shop.shopId, 9)
assert.equal(shop.name, '云朵小店')
assert.equal(shop.shortName, '云朵')
assert.equal(shop.shopLogo, '/shop-logo.png')
assert.equal(shop.avatar, '/shop-logo.png')
assert.deepEqual(buildLeaderShopPayload(shop), {
	name: '云朵小店',
	shortName: '云朵',
	mobile: '13800138000',
	banner: '/shop.png',
	shopInfo: '每天新鲜到店',
	shopLogo: '/shop-logo.png',
	shopCodeUrl: '/qr.png',
	shopId: 9
})
assert.equal(normalizeLeaderShop({ avatar: '/legacy-avatar.png' }).shopLogo, '/legacy-avatar.png')
assert.equal(normalizeLeaderShop({ shopLogo: '/new-logo.png', avatar: '/legacy-avatar.png' }).avatar, '/new-logo.png')
assert.equal(Object.prototype.hasOwnProperty.call(buildLeaderShopPayload(shop), 'avatar'), false)
assert.equal(Object.prototype.hasOwnProperty.call(buildLeaderShopPayload(shop), 'shortName'), true)
assert.equal(buildLeaderShopPayload({ name: '新店' }).shopId, 0)

const point = normalizeLeaderPoint({
	id: 5,
	name: '天骄北麓自提点',
	address: '25栋',
	img: '/point.png',
	lon: '102.71',
	lat: '25.04',
	scope: '',
	info: '18点后可提',
	person: '李四',
	phone: '13900139000',
	isClose: 1
})
assert.equal(point.statusText, '已作废')
assert.equal(point.categoryName, '')
assert.deepEqual(point.images, ['/point.png'])
assert.deepEqual(normalizeLeaderPoint({
	pointId: 6,
	pointName: '新协议自提点',
	pointAddress: '新地址',
	pointImg: '/new-point.png',
	longitude: 116.4436,
	latitude: 39.9219,
	pointScope: 8,
	pointInfo: '说明'
}), {
	id: 6,
	name: '新协议自提点',
	address: '新地址',
	img: '/new-point.png',
	images: ['/new-point.png'],
	lon: 116.4436,
	lat: 39.9219,
	scope: 8,
	info: '说明',
	person: '',
	phone: '',
	categoryName: '',
	isClose: 0,
	statusText: '正常'
})
assert.deepEqual(buildLeaderPointPayload(point), {
	id: 5,
	name: '天骄北麓自提点',
	address: '25栋',
	img: '/point.png',
	lon: 102.71,
	lat: 25.04,
	scope: 10,
	info: '18点后可提',
	person: '李四',
	phone: '13900139000'
})
assert.equal(buildLeaderPointPayload({ ...point, images: ['/a.png', '/b.png', '/c.png'] }).img, '/a.png')

assert.equal(getCurrentLeaderPointId(key => ({ leader_pointIds: '6', leader_select_pid: '' }[key])), 6)
assert.equal(getCurrentLeaderPointId(key => ({ leader_pointIds: '6', leader_select_pid: '9' }[key])), 9)

const staff = normalizeLeaderStaff({
	id: 11,
	name: '员工A',
	mobile: '13700137000',
	remark: '',
	auth: '10,20,30',
	point: '6',
	isClose: 0
})
assert.deepEqual(staff.authIds, [10, 20, 30])
assert.deepEqual(staff.pointIds, [6])
assert.deepEqual(buildLeaderStaffPayload({ name: '员工A', mobile: '13700137000', authIds: [10, 20], pointIds: [] }, 6), {
	id: 0,
	name: '员工A',
	mobile: '13700137000',
	remark: '',
	auth: '10,20',
	point: '6'
})
assert.equal(isValidMobile('13800138000'), true)
assert.equal(isValidMobile('123'), false)

const blackMember = normalizeBlackMember({
	memberId: 19,
	nickName: '黑名单用户',
	telephone: '13600136000',
	headImg: '/head.png'
})
assert.equal(blackMember.id, 19)
assert.equal(blackMember.memberId, 19)
assert.equal(blackMember.nickname, '黑名单用户')
assert.equal(blackMember.mobile, '13600136000')
assert.equal(blackMember.avatar, '/head.png')
assert.equal(resolveBlackMemberId({ id: 9 }), 9)
assert.equal(resolveBlackMemberId({ memberId: 10 }), 10)

const apiSource = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
assert.equal(apiSource.includes("url: '/user/leader/shop/info'"), true)
assert.equal(apiSource.includes('`/user/leader/point/list?name=${encodeURIComponent(name)}`'), true)
assert.equal(apiSource.includes("queryUrl('/user/leader/staff/close', data)"), true)
assert.equal(apiSource.includes("queryUrl('/user/leader/staff/remove', data)"), true)
assert.equal(apiSource.includes('makeLeaderShopQrCode'), true)
assert.equal(apiSource.includes("url: '/user/leader/member/mobile'"), true)
assert.equal(apiSource.includes("url: '/user/leader/business/list'"), true)
assert.equal(apiSource.includes("url: '/user/leader/business/add'"), true)
assert.equal(apiSource.includes("url: '/user/leader/business/edit'"), true)
assert.equal(apiSource.includes("url: '/user/leader/business/close'"), true)
assert.equal(apiSource.includes("url: '/user/business/add'"), false)
assert.equal(apiSource.includes("url: '/leader/business/edit'"), false)
assert.equal(apiSource.includes("url: '/order/leader/bill/list'"), true)
assert.equal(apiSource.includes("url: '/order/leader/report/business/list'"), false)
assert.equal(apiSource.includes("url: '/order/leader/report/business/count'"), false)
assert.equal(apiSource.includes("url: '/leader/report/business/list'"), false)
assert.equal(apiSource.includes("url: '/leader/report/business/count'"), false)
assert.equal(apiSource.includes("url: queryUrl('/user/leader/shop/makeQrCode', params)"), true)
assert.equal(apiSource.includes("url: '/user/leader/black/list'"), true)
assert.equal(apiSource.includes("url: '/user/leader/black/count'"), true)
assert.equal(apiSource.includes("queryUrl('/user/leader/add/black', data)"), true)
assert.equal(apiSource.includes("url: '/user/leader/black/mobile'"), true)
assert.equal(apiSource.includes("queryUrl('/user/leader/member/black/remove', data)"), true)
assert.equal(apiSource.includes('withLeaderGroupCat'), true)
assert.equal(apiSource.includes('data.catId = 0'), true)
assert.equal(apiSource.includes("deprecatedGoodsApi('商品库存调整接口')"), true)
assert.equal(apiSource.includes("url: '/goods/leader/goods/stock'"), false)
assert.equal(apiSource.includes("url: '/user/leader/message/list'"), true)
assert.equal(apiSource.includes("url: '/user/leader/message/count'"), true)
assert.equal(apiSource.includes("url: '/user/leader/message/unread'"), true)
assert.equal(apiSource.includes("url: '/user/leader/message/read'"), true)
assert.equal(apiSource.includes("url: '/leader/message/list'"), false)
assert.equal(apiSource.includes("url: '/leader/message/count'"), false)

const shopPageSource = fs.readFileSync(new URL('../pagesA/info/index.vue', import.meta.url), 'utf8')
assert.equal(shopPageSource.includes('/static/image/nav-back.png'), true)
assert.equal(shopPageSource.includes('店铺头像'), true)
assert.equal(shopPageSource.includes('店铺简称'), true)
assert.equal(shopPageSource.includes('联系电话'), true)
assert.equal(shopPageSource.includes('生成核销码'), true)
assert.equal(shopPageSource.includes('保存修改'), true)
assert.equal(shopPageSource.includes('closeCurrentPageAfterSave'), true)
assert.equal(shopPageSource.includes('this.closeCurrentPageAfterSave()'), true)
assert.equal(shopPageSource.includes('makeLeaderShopQrCode'), true)
assert.equal(shopPageSource.includes('const existingQrUrl = this.formData.shopCodeUrl || this.formData.shopUrl ||'), true)
assert.equal(shopPageSource.includes('if (existingQrUrl)'), true)
assert.equal(shopPageSource.includes('return'), true)
assert.equal(shopPageSource.includes("uni.setStorageSync('leader_shop_info'"), true)
assert.equal(shopPageSource.includes("uni.setStorageSync('leader_shop_qr_url'"), true)
assert.equal(shopPageSource.includes("uni.setStorageSync('leader_avatar'"), true)
assert.equal(shopPageSource.includes('mergeCachedShopQrUrl'), true)
assert.equal(shopPageSource.includes('refreshShopInfoAfterQrGenerated(shopUrl)'), true)
assert.equal(shopPageSource.includes('await makeLeaderShopQrCode({ shopId: Number(this.formData.shopId || 0) })'), true)
assert.equal(shopPageSource.includes('updateLeaderShopQrCode'), false)
assert.equal(shopPageSource.includes('saveLocalQrImage(filePath)'), true)
assert.equal(shopPageSource.includes('uni.downloadFile({'), true)
assert.equal(shopPageSource.includes('this.saveLocalQrImage(res.tempFilePath)'), true)
assert.equal(shopPageSource.includes('isChooseImageCancel(err)'), true)
assert.equal(shopPageSource.includes("uni.showToast({ title: '取消上传'"), true)
assert.equal(shopPageSource.includes('uploadLeaderShopImage'), true)
assert.equal(shopPageSource.includes('buildLeaderShopPayload'), true)
assert.equal(shopPageSource.includes('this.formData.shopLogo = shopLogo'), true)
assert.equal(shopPageSource.includes("uni.showToast({ title: '店铺信息未加载'"), false)
assert.equal(shopPageSource.includes("if (!payload.shopId)"), false)
assert.equal(shopPageSource.includes("const leaderId = shopInfo.lid || shopInfo.leaderId || ''"), true)
assert.equal(shopPageSource.includes("uni.setStorageSync('leader_lid', leaderId)"), true)
assert.equal(shopPageSource.includes("uni.setStorageSync('leader_lid', shopInfo.lid || shopInfo.leaderId || shopInfo.shopId || shopInfo.id)"), false)
assert.equal(shopPageSource.includes("this.formData.shopCodeUrl"), true)
assert.equal(shopPageSource.includes("await this.initShopInfo()"), true)
assert.equal(shopPageSource.includes("hasLeaderShopContext"), false)
assert.equal(shopPageSource.includes("uni.showToast({ title: '请输入联系电话'"), true)

const pointIndexSource = fs.readFileSync(new URL('../pagesA/point/index.vue', import.meta.url), 'utf8')
assert.equal(pointIndexSource.includes('搜索自提点名称'), true)
assert.equal(pointIndexSource.includes('filter-section'), true)
assert.equal(pointIndexSource.includes('.search-icon::after'), true)
assert.equal(pointIndexSource.includes('width: 72rpx'), true)
assert.equal(pointIndexSource.includes('点击查看已作废自提点'), true)
assert.equal(pointIndexSource.includes('收起已作废自提点'), true)
assert.equal(pointIndexSource.includes(':class="{ open: closedVisible }"'), true)
assert.equal(pointIndexSource.includes("closedVisible ? '⌃' : '⌄'"), false)
assert.equal(pointIndexSource.includes('新增自提点'), true)
assert.equal(pointIndexSource.includes('normalizeLeaderPoint'), true)
assert.equal(pointIndexSource.includes('详细地址：'), true)
assert.equal(pointIndexSource.includes('提货联系人：'), true)
assert.equal(pointIndexSource.includes('分类：'), true)
assert.equal(pointIndexSource.includes("point.categoryName || '未分类'"), true)
assert.equal(pointIndexSource.includes('查看核销码'), false)
assert.equal(pointIndexSource.includes('getLeaderPointErCodeInfo'), false)
assert.equal(pointIndexSource.includes('ImgDialog'), false)

const pointAddSource = fs.readFileSync(new URL('../pagesA/point/add.vue', import.meta.url), 'utf8')
assert.equal(pointAddSource.includes('uni.chooseLocation'), true)
assert.equal(pointAddSource.includes('上传图片'), true)
assert.equal(pointAddSource.includes('buildLeaderPointPayload'), true)
assert.equal(pointAddSource.includes('uploadLeaderPointImage'), true)
assert.equal(pointAddSource.includes('background: #fff;'), true)
assert.equal(pointAddSource.includes('background: #f5f5f5;'), true)
assert.equal(pointAddSource.includes('上传图片({{ imageCount }}/1)'), true)
assert.equal(pointAddSource.includes('imageCount < 1'), true)
assert.equal(pointAddSource.includes('imageCount < 3'), false)
assert.equal(pointAddSource.includes('removeImage(index)'), true)
assert.equal(pointAddSource.includes('syncImageField'), true)
assert.equal(pointAddSource.includes('bottom-bar'), true)
assert.equal(pointAddSource.includes('padding: 18rpx 32rpx calc(18rpx + env(safe-area-inset-bottom));'), true)
assert.equal(pointAddSource.includes('border-radius: 8rpx;'), true)
assert.equal(pointAddSource.includes('optional-start'), true)

const businessAddSource = fs.readFileSync(new URL('../pagesA/business/add.vue', import.meta.url), 'utf8')
assert.equal(businessAddSource.includes('v-model="formData.tax"'), true)
assert.equal(businessAddSource.includes('@input="onTaxInput"'), true)
assert.equal(businessAddSource.includes('limitPricePrecision'), true)
assert.equal(businessAddSource.includes('this.formData.tax = limitPricePrecision(this.formData.tax)'), true)
assert.equal(businessAddSource.includes("if (!this.formData.tax)"), true)

const addCashSource = fs.readFileSync(new URL('../pagesA/business/addCash.vue', import.meta.url), 'utf8')
assert.equal(addCashSource.includes('v-model="formData.fee"'), true)
assert.equal(addCashSource.includes('@input="onFeeInput"'), true)
assert.equal(addCashSource.includes('limitPricePrecision'), true)
assert.equal(addCashSource.includes('this.formData.fee = limitPricePrecision(this.formData.fee)'), true)

const manifestSource = fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8')
assert.equal(manifestSource.includes('"requiredPrivateInfos"'), true)
assert.equal(manifestSource.includes('"chooseLocation"'), true)

const pointQrSource = fs.readFileSync(new URL('../pagesA/point/img.vue', import.meta.url), 'utf8')
assert.equal(pointQrSource.includes('核销码'), true)
assert.equal(pointQrSource.includes('保存图片'), true)

const leaderHeaderSource = fs.readFileSync(new URL('../pagesA/common/header.vue', import.meta.url), 'utf8')
assert.equal(leaderHeaderSource.includes('leader-nav-title'), true)
assert.equal(leaderHeaderSource.includes('showNav'), true)

const staffIndexSource = fs.readFileSync(new URL('../pagesA/staff/index.vue', import.meta.url), 'utf8')
assert.equal(staffIndexSource.includes('我的员工'), true)
assert.equal(staffIndexSource.includes('搜索员工手机号'), true)
assert.equal(staffIndexSource.includes('getMemberInfo'), true)
assert.equal(staffIndexSource.includes('closeLeaderStaffInfo'), true)
assert.equal(staffIndexSource.includes('removeLeaderStaffInfo'), false)
assert.equal(staffIndexSource.includes('openAddStaff'), true)
assert.equal(staffIndexSource.includes('toggleStaffStatus'), true)
assert.equal(staffIndexSource.includes('编辑'), true)
assert.equal(staffIndexSource.includes('关闭'), true)
assert.equal(staffIndexSource.includes('启用'), true)
assert.equal(staffIndexSource.includes('删除'), false)
assert.equal(staffIndexSource.includes('removeStaff'), false)
assert.equal(staffIndexSource.includes('action-button danger'), false)

const staffAddSource = fs.readFileSync(new URL('../pagesA/staff/add.vue', import.meta.url), 'utf8')
assert.equal(staffAddSource.includes('normalizeLeaderStaff'), true)
assert.equal(staffAddSource.includes('员工昵称'), true)
assert.equal(staffAddSource.includes('请输入员工姓名'), false)
assert.equal(staffAddSource.includes('所属提货点'), false)
assert.equal(staffAddSource.includes('splitIdList'), false)
assert.equal(staffAddSource.includes('forceEdit'), true)
assert.equal(staffAddSource.includes('DEFAULT_STAFF_AUTH_IDS'), true)
assert.equal(staffAddSource.includes('getDefaultAuthIds'), true)
assert.equal(staffAddSource.includes('赋予权限'), false)
assert.equal(staffAddSource.includes('handleCheckBoxChange'), false)

const blackIndexSource = fs.readFileSync(new URL('../pagesA/black/index.vue', import.meta.url), 'utf8')
assert.equal(blackIndexSource.includes('normalizeBlackMember'), true)
assert.equal(blackIndexSource.includes('resolveBlackMemberId'), true)
assert.equal(blackIndexSource.includes('isValidMobile'), true)
assert.equal(blackIndexSource.includes('请输入正确手机号'), true)
assert.equal(blackIndexSource.includes('openAddBlackPage'), true)
assert.equal(blackIndexSource.includes('/pagesA/black/add'), true)
assert.equal(blackIndexSource.includes('添加黑名单'), true)

const blackAddSource = fs.readFileSync(new URL('../pagesA/black/add.vue', import.meta.url), 'utf8')
assert.equal(blackAddSource.includes('添加黑名单'), true)
assert.equal(blackAddSource.includes('getMemberInfo'), true)
assert.equal(blackAddSource.includes('addBlackList'), true)
assert.equal(blackAddSource.includes('resolveBlackMemberId'), true)
assert.equal(blackAddSource.includes('请先搜索团员'), true)

const pagesJsonSource = fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8')
assert.equal(pagesJsonSource.includes('"path": "black/add"'), true)

const dashboardSource = fs.readFileSync(new URL('../pagesA/dashboard/index.vue', import.meta.url), 'utf8')
assert.equal(dashboardSource.includes('我的店铺'), true)
assert.equal(dashboardSource.includes('团购订单'), true)
assert.equal(dashboardSource.includes('扫码核销'), true)
assert.equal(dashboardSource.includes('商品库'), true)
assert.equal(dashboardSource.includes('账户信息'), true)
assert.equal(dashboardSource.includes("this.openPage('/pagesA/business/index')"), true)
assert.equal(dashboardSource.includes('批量退款'), true)
assert.equal(dashboardSource.includes('我的员工'), true)
assert.equal(dashboardSource.includes('黑名单'), true)
assert.equal(dashboardSource.includes('对账单'), true)
assert.equal(dashboardSource.includes("this.openPage('/pagesA/business/account')"), true)
assert.equal(dashboardSource.includes('/static/image/leader-dashboard/reconcile.png'), true)
assert.equal(dashboardSource.includes('DEFAULT_STAFF_AUTH_IDS'), true)
assert.equal(dashboardSource.includes('isLeaderWorkbench()'), true)
assert.equal(dashboardSource.includes('isStaffWorkbench()'), true)
assert.equal(dashboardSource.includes('canOpenBlackList()'), true)
assert.equal(dashboardSource.includes('v-if="isLeaderWorkbench()" @click="goToAccountPage"'), true)
assert.equal(dashboardSource.includes('v-if="isLeaderWorkbench() && canUse(30)" @click="goToReconciliationPage"'), true)
assert.equal(dashboardSource.includes('v-if="isLeaderWorkbench() && canUse(30)" @click="goToRefundPage"'), true)
assert.equal(dashboardSource.includes('v-if="isLeaderWorkbench() && canUse(80)" @click="goToStaffPage"'), true)
assert.equal(dashboardSource.includes('用户消息'), false)
assert.equal(dashboardSource.includes('官方客服'), false)
assert.equal(dashboardSource.includes('切换团员'), true)
assert.equal(dashboardSource.includes('workbench-divider'), true)
assert.equal(dashboardSource.includes('/static/image/leader-dashboard/shop.png'), true)
assert.equal(dashboardSource.includes(':src="avatarSrc"'), true)
assert.equal(dashboardSource.includes('resolveAvatarUrl'), true)
assert.equal(dashboardSource.includes("uni.getStorageSync('leader_shop_info')"), true)
assert.equal(dashboardSource.includes("uni.getStorageSync('leader_avatar')"), true)

const businessSource = fs.readFileSync(new URL('../pagesA/business/index.vue', import.meta.url), 'utf8')
assert.equal(businessSource.includes('license-panel'), true)
assert.equal(businessSource.includes('账户信息'), true)
assert.equal(businessSource.includes('已启用'), true)
assert.equal(businessSource.includes('未启用'), true)
assert.equal(businessSource.includes('收款限额'), true)
assert.equal(businessSource.includes("getLeaderBusinessList({ id: leaderId, page: 1, pageSize: 100 })"), true)
assert.equal(businessSource.includes('normalizeBusinessItem'), true)
assert.equal(businessSource.includes('const params = { busId, status }'), true)

const reconciliationSource = fs.readFileSync(new URL('../pagesA/business/account.vue', import.meta.url), 'utf8')
assert.equal(reconciliationSource.includes('对账单'), true)
assert.equal(reconciliationSource.includes('选择日期'), true)
assert.equal(reconciliationSource.includes('请选择日期后查看对账单'), true)
assert.equal(reconciliationSource.includes('if (!this.hasDateRange)'), true)
assert.equal(reconciliationSource.includes('getLeaderBillList'), true)
assert.equal(reconciliationSource.includes('getLeaderOrderBusinessCount'), false)
assert.equal(reconciliationSource.includes('buildLeaderReconciliationParams'), true)
assert.equal(reconciliationSource.includes('mode-filter'), true)
assert.equal(reconciliationSource.includes('class="mode-mask"'), false)
assert.equal(reconciliationSource.includes('top: 100%; left: 50%'), true)
assert.equal(reconciliationSource.includes('box-shadow: 0 0 18rpx'), true)

const messageSource = fs.readFileSync(new URL('../pagesA/message/index.vue', import.meta.url), 'utf8')
assert.equal(messageSource.includes('title="用户消息"'), true)

const orderIndexSource = fs.readFileSync(new URL('../pagesA/order/index.vue', import.meta.url), 'utf8')
assert.equal(orderIndexSource.includes('getLeaderPointList'), true)
assert.equal(orderIndexSource.includes('onPointChange'), true)
assert.equal(orderIndexSource.includes('全部自提点'), true)
assert.equal(orderIndexSource.includes('getCurrentLeaderPointId'), true)
assert.equal(orderIndexSource.includes('syncPointFilterFromStorage'), true)
assert.equal(orderIndexSource.includes("uni.setStorageSync('leader_select_pid'"), true)

const orderDetailSource = fs.readFileSync(new URL('../pagesA/order/detail.vue', import.meta.url), 'utf8')
assert.equal(orderDetailSource.includes('getCurrentLeaderPointId'), true)
assert.equal(orderDetailSource.includes('Number(goods.pendingWriteOffNum || goods.num || 0)'), false)
assert.equal(orderDetailSource.includes('Math.min(Number(goods.verifyNum || 0) + delta, maxNum)'), true)
assert.equal(orderDetailSource.includes('refreshLatestOrderInfo'), true)
assert.equal(orderDetailSource.includes('resolveOrderResponseData'), true)
assert.equal(orderDetailSource.includes('Array.isArray(data)'), true)
assert.equal(orderDetailSource.includes('canOperateVerify'), true)
assert.equal(orderDetailSource.includes('verifyDetailReady'), true)
assert.equal(orderDetailSource.includes("刷新订单中..."), true)

console.log('leaderConfig tests passed')
