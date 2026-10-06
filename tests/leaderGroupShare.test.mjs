import assert from 'node:assert/strict'
import fs from 'node:fs'

function loadPage(file, deps = {}) {
 const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
 const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '').replace('export default', 'return')
 const definition = new Function(...Object.keys(deps), script)(...Object.values(deps))
 const page = definition.data()
 for (const [key, fn] of Object.entries(definition.methods)) page[key] = fn.bind(page)
 for (const [key, fn] of Object.entries(definition.computed || {})) Object.defineProperty(page, key, { get: fn.bind(page) })
 return page
}
let emitted
const dialog = loadPage('../pagesA/group/poster.vue')
dialog.$emit = (_, item) => { emitted = item }
const requests = []
const previews = []
let result = 'https://example.com/goods-4.png'
let groupPosterRequests = 0
const page = loadPage('../pagesA/group/detail.vue', {
 PosterImgDialog: {}, PosterDialog: {}, normalizeLeaderGroup: data => data,
 shareLeaderGroupGoodsPoster: async params => { requests.push(params); return { data: result } },
 makeLeaderGroupPoster: async () => { groupPosterRequests++; return { data: 'group-poster' } },
 uni: { showLoading() {}, hideLoading() {}, showToast() {} },
 console: { log() {} }
})
page.group = { id: 7, lid: 8, name: '团购', img: 'group-cover' }
page.$refs = { posterDialogRef: dialog, imgDialogRef: { show: url => previews.push(url) } }
await page.openShareSheet({ gid: 104, gname: '第四件商品' })
assert.deepEqual(requests, [{ groupId: 7, goodsId: 104 }])
assert.equal(dialog.shareData.imageUrl, result)
assert.equal(dialog.shareData.title, '第四件商品')
assert.equal(dialog.shareData.path, '/pages/group/index?id=7&lid=8')
dialog.emitPoster()
assert.equal(emitted.goodsId, 104, '关闭弹窗后事件快照保留商品 ID')
await page.shareLeaderGroupPosterImg(emitted)
assert.equal(previews[0], result)
assert.equal(groupPosterRequests, 0, '商品预览不能重新生成整团图')
result = 'https://example.com/goods-2.png'
await page.openShareSheet({ gid: 102, gname: '第二件商品' })
assert.equal(dialog.shareData.imageUrl, result, '切换商品不能沿用上一件图片')
dialog.closeModal()
result = ''
await page.openShareSheet({ gid: 104 })
assert.equal(dialog.showModal, false, '空响应不能回退到整团封面')
assert.equal(page.shareLoading, false)
await page.shareToMomentsPoster()
assert.equal(groupPosterRequests, 1, '顶部整团海报保持原接口')
const count = requests.length
page.shareLoading = true
await page.openShareSheet({ gid: 104 })
assert.equal(requests.length, count, '请求中阻止重复点击')

const api = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
const query = api.match(/function queryUrl\([^]*?\n}/)[0]
const wrapper = api.match(/export function shareLeaderGroupGoodsPoster\([^]*?\n}/)[0].replace('export ', '')
const call = new Function('request2', `${query}\n${wrapper}\nreturn shareLeaderGroupGoodsPoster`)(req => req)
assert.deepEqual(call({ groupId: 7, goodsId: 104 }), {
 url: '/goods/Leader/share/groupActivity/goods/poster?groupId=7&goodsId=104', method: 'POST', data: {}
})
console.log('leaderGroupShare tests passed')
