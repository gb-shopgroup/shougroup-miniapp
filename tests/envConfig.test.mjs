// 环境配置回归测试：确保环境判定不被改坏。
// 微信侧关键事实：审核版本的 envVersion 也是 trial（与体验版无法区分），release 只对应审核通过后的正式版。
import fs from 'node:fs'
import assert from 'node:assert/strict'

const envSource = fs.readFileSync(new URL('../config/env.js', import.meta.url), 'utf8')

// 三个 envVersion 分支的目标环境：体验版(trial)→测试，正式版/审核版(release)→生产
assert.match(envSource, /case 'develop':[\s\S]{0,80}env = 'development'/)
assert.match(envSource, /case 'trial':[\s\S]{0,80}env = 'test'/)
assert.match(envSource, /case 'release':[\s\S]{0,80}env = 'production'/)

// 域名指向：test→测试域名，production→生产域名
assert.match(envSource, /test:\s*\{[\s\S]{0,200}?baseURL: "https:\/\/test\.api\.shopgroup\.com\.cn"/)
assert.match(envSource, /production:\s*\{[\s\S]{0,200}?baseURL: "https:\/\/api\.shopgroup\.com\.cn"/)

// 手动覆盖：非生产环境才允许（正式版忽略，防止误切）
assert.match(envSource, /if \(env !== 'production'\) \{\s*const override/)

// 默认导出按判定的环境取配置；switch 兜底保证 env 恒为有效键
assert.match(envSource, /export default config\[env\]/)

// 上传产物（微信开发工具上传的目录）若存在，必须包含完整判定：
// trial 可指向 test（验收包）或 production（提审包，由 scripts/patch-dist-env.mjs --trial=production 切换），
// release 必须指向 production（正式版走生产）。
const distEnvPath = new URL('../unpackage/dist/build/mp-weixin/config/env.js', import.meta.url)
if (fs.existsSync(distEnvPath)) {
	const distSource = fs.readFileSync(distEnvPath, 'utf8')
	assert.match(distSource, /"trial"\s*\)\s*env\s*=\s*"(test|production)"/)
	assert.match(distSource, /"release"\s*\)\s*env\s*=\s*"production"/)
	assert.match(distSource, /if \(!env\) env = "production"/)
	assert.match(distSource, /api\.shopgroup\.com\.cn/)

	// 产物语法合法（node --check 语义）
	new Function('require', 'module', 'exports', distSource)
}

console.log('PASS tests/envConfig.test.mjs')
