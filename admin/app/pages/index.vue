<script setup lang="ts">
type AdminRole = 'super_admin' | 'admin' | 'operator' | 'member'
type AdminUser = { id: string; email: string; display_name: string; role: AdminRole; is_active: boolean; created_at: string; last_login_at?: string }
type Overview = { users: number; people: number; sources: number; events: number; draft_claims: number; media_assets: number; portraits: number }
type Person = { id: string; display_name: string; relationship?: string; sources: number; events: number; media_assets: number; portrait_versions: number }
type AdminGroup = { id: string; name: string; description?: string; owner_id: string; owner_email: string; member_count: number; people_count: number; created_at: string; updated_at: string }
type GroupMember = { id: string; group_id: string; user_id: string; email: string; display_name: string; role: 'viewer' | 'editor' | 'admin'; created_at: string }
type Portrait = { id: string; version: number; summary: string; themes: string[]; evidence: Array<{ event_id: string; title: string; quotes: string[] }>; status: string }
type View = 'overview' | 'people' | 'users' | 'groups' | 'settings'

const config = useRuntimeConfig()
// Packaged admin builds are permanently bound to the private HTTPS API.
// Local development can override this with NUXT_PUBLIC_API_BASE.
const apiBase = ref(String(config.public.apiBase ?? (import.meta.dev ? '/api' : '')))
const email = ref('')
const password = ref('')
const token = ref('')
const currentUser = ref<AdminUser>()
const activeView = ref<View>('overview')
const overview = ref<Overview>()
const users = ref<AdminUser[]>([])
const people = ref<Person[]>([])
const groups = ref<AdminGroup[]>([])
const groupMembers = ref<Record<string, GroupMember[]>>({})
const portraits = ref<Record<string, Portrait>>({})
const settings = ref({ site_name: 'Chronicle Memory', allow_member_registration: false, portrait_requires_confirmation: true, source_retention_days: 0 })
const newUser = ref({ email: '', display_name: '', password: '', role: 'member' as AdminRole })
const busy = ref(false)
const notice = ref('请输入管理员账号。')
const isOffline = computed(() => !normalizedApi())

function normalizedApi() { return apiBase.value.trim().replace(/\/$/, '') }
function authHeaders() { return { Authorization: `Bearer ${token.value}` } }
function errorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as { status?: number; statusCode?: number; response?: { status?: number } }
  return candidate.statusCode || candidate.status || candidate.response?.status
}
function logout(message = '已退出管理员账户。') {
  token.value = ''; currentUser.value = undefined; sessionStorage.removeItem('chronicle-admin-token'); notice.value = message
}

function loadOfflinePreview() {
  currentUser.value = { id: 'offline-admin', email: 'preview@chronicle.local', display_name: '演示管理员', role: 'admin', is_active: true, created_at: '2026-01-01T00:00:00Z' }
  overview.value = { users: 4, people: 3, sources: 18, events: 11, draft_claims: 6, media_assets: 14, portraits: 2 }
  users.value = [
    { id: 'u-1', email: 'preview@chronicle.local', display_name: '演示管理员', role: 'admin', is_active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'u-2', email: 'family@example.test', display_name: '家庭成员', role: 'member', is_active: true, created_at: '2026-01-03T00:00:00Z' },
  ]
  people.value = [
    { id: 'p-1', display_name: '夏日周末', relationship: '个人手账', sources: 9, events: 6, media_assets: 8, portrait_versions: 1 },
    { id: 'p-2', display_name: '家庭相册', relationship: '家庭组', sources: 9, events: 5, media_assets: 6, portrait_versions: 1 },
  ]
  groups.value = [{ id: 'g-1', name: '家庭相册', description: '可撤销的共享记忆', owner_id: 'u-1', owner_email: 'preview@chronicle.local', member_count: 2, people_count: 1, created_at: '2026-01-04T00:00:00Z', updated_at: '2026-01-05T00:00:00Z' }]
  groupMembers.value = { 'g-1': [{ id: 'm-1', group_id: 'g-1', user_id: 'u-1', email: 'preview@chronicle.local', display_name: '演示管理员', role: 'admin', created_at: '2026-01-04T00:00:00Z' }, { id: 'm-2', group_id: 'g-1', user_id: 'u-2', email: 'family@example.test', display_name: '家庭成员', role: 'viewer', created_at: '2026-01-04T00:00:00Z' }] }
  notice.value = '这是公开离线展台，所有操作只在浏览器内展示，不会连接真实后端。'
}

async function loadAdminData() {
  const base = normalizedApi()
  // Verify the token first. This keeps a valid session visible even when a
  // secondary dashboard request is temporarily slow or unavailable.
  const me = await $fetch<AdminUser>(`${base}/v1/auth/me`, { headers: authHeaders() })
  if (!['super_admin', 'admin'].includes(me.role)) throw new Error('admin role required')
  currentUser.value = me
  try {
    const [summary, accountList, personList, settingValues, groupList] = await Promise.all([
      $fetch<Overview>(`${base}/v1/admin/overview`, { headers: authHeaders() }),
      $fetch<AdminUser[]>(`${base}/v1/admin/users`, { headers: authHeaders() }),
      $fetch<Person[]>(`${base}/v1/admin/people`, { headers: authHeaders() }),
      $fetch<{ values: typeof settings.value }>(`${base}/v1/admin/settings`, { headers: authHeaders() }),
      $fetch<AdminGroup[]>(`${base}/v1/admin/groups`, { headers: authHeaders() }),
    ])
    overview.value = summary; users.value = accountList; people.value = personList; settings.value = settingValues.values; groups.value = groupList
    notice.value = '管理数据已同步。'
  } catch {
    notice.value = '管理员已登录，但部分管理数据暂未同步；请稍后刷新。'
  }
}

async function loadGroupMembers(group: AdminGroup) {
  try {
    groupMembers.value = { ...groupMembers.value, [group.id]: await $fetch<GroupMember[]>(`${normalizedApi()}/v1/admin/groups/${group.id}/members`, { headers: authHeaders() }) }
  } catch { notice.value = '家庭组成员加载失败。' }
}
async function revokeGroupMember(group: AdminGroup, member: GroupMember) {
  if (!window.confirm(`从“${group.name}”撤销 ${member.email}？`)) return
  try {
    await $fetch(`${normalizedApi()}/v1/admin/groups/${group.id}/members/${member.id}`, { method: 'DELETE', headers: authHeaders() })
    groupMembers.value = { ...groupMembers.value, [group.id]: (groupMembers.value[group.id] || []).filter(item => item.id !== member.id) }
    notice.value = '家庭组成员访问已撤销。'
  } catch { notice.value = '家庭组成员撤销失败。' }
}

async function login() {
  if (!email.value || !password.value) { notice.value = '请填写管理员邮箱和密码。'; return }
  busy.value = true
  try {
    const body = new URLSearchParams(); body.set('username', email.value.trim()); body.set('password', password.value)
    const result = await $fetch<{ access_token: string }>(`${normalizedApi()}/v1/auth/token`, { method: 'POST', body })
    token.value = result.access_token
    sessionStorage.setItem('chronicle-admin-token', token.value)
    password.value = ''
    await loadAdminData()
  } catch (error) {
    const status = errorStatus(error)
    if (status === 401) notice.value = '账号或密码错误。'
    else if (status === 403) notice.value = '该账号没有管理员权限。'
    else if (status) notice.value = `后端返回 HTTP ${status}，请检查服务日志。`
    else notice.value = '私域管理服务暂时不可用，请稍后重试或联系管理员。'
  } finally { busy.value = false }
}

async function saveSettings() {
  if (isOffline.value) { notice.value = '离线展台已模拟保存设置。'; return }
  busy.value = true
  try {
    const result = await $fetch<{ values: typeof settings.value }>(`${normalizedApi()}/v1/admin/settings`, { method: 'PUT', headers: authHeaders(), body: { values: settings.value } })
    settings.value = result.values; notice.value = '系统设置已保存。'
  } catch { notice.value = '设置保存失败。' } finally { busy.value = false }
}

async function createUser() {
  if (isOffline.value) { notice.value = '离线展台已模拟创建账号。'; return }
  busy.value = true
  try {
    await $fetch(`${normalizedApi()}/v1/admin/users`, { method: 'POST', headers: authHeaders(), body: newUser.value })
    newUser.value = { email: '', display_name: '', password: '', role: 'member' }
    users.value = await $fetch<AdminUser[]>(`${normalizedApi()}/v1/admin/users`, { headers: authHeaders() })
    notice.value = '新账号已创建。'
  } catch { notice.value = '账号创建失败；请检查后端密码策略与邮箱是否重复。' } finally { busy.value = false }
}

async function toggleUser(user: AdminUser) {
  if (isOffline.value) { user.is_active = !user.is_active; notice.value = '离线展台已模拟切换账号状态。'; return }
  if (user.id === currentUser.value?.id) { notice.value = '不能停用当前登录的管理员。'; return }
  try {
    const updated = await $fetch<AdminUser>(`${normalizedApi()}/v1/admin/users/${user.id}`, { method: 'PATCH', headers: authHeaders(), body: { is_active: !user.is_active } })
    users.value = users.value.map(item => item.id === updated.id ? updated : item)
    notice.value = updated.is_active ? '账号已启用。' : '账号已停用。'
  } catch { notice.value = '账号状态更新失败。' }
}

const roleLabels: Record<AdminRole, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  operator: '运营员',
  member: '普通成员',
}

async function updateRole(user: AdminUser, role: AdminRole) {
  if (role === user.role) return
  if (isOffline.value) { user.role = role; notice.value = '离线展台已模拟调整身份。'; return }
  busy.value = true
  try {
    const updated = await $fetch<AdminUser>(`${normalizedApi()}/v1/admin/users/${user.id}`, {
      method: 'PATCH', headers: authHeaders(), body: { role },
    })
    users.value = users.value.map(item => item.id === updated.id ? updated : item)
    notice.value = `${updated.display_name} 已调整为${roleLabels[updated.role]}。`
  } catch (error) {
    const status = errorStatus(error)
    notice.value = status === 403 ? '当前管理员无权授予该身份。' : '身份更新失败，请检查权限或保留至少一个管理员。'
  } finally { busy.value = false }
}

async function generatePortrait(person: Person) {
  if (isOffline.value) { notice.value = '离线展台已模拟生成证据画像草稿。'; return }
  busy.value = true
  try {
    const portrait = await $fetch<Portrait>(`${normalizedApi()}/v1/admin/people/${person.id}/portraits`, { method: 'POST', headers: authHeaders() })
    portraits.value = { ...portraits.value, [person.id]: portrait }
    person.portrait_versions = portrait.version
    notice.value = `${person.display_name}的第 ${portrait.version} 版画像草稿已生成。`
  } catch { notice.value = '画像生成失败。' } finally { busy.value = false }
}

async function deletePerson(person: Person) {
  if (isOffline.value) { notice.value = '离线展台不会删除真实数据。'; return }
  if (!window.confirm(`将永久删除「${person.display_name}」的来源、图片、画布和记忆图谱。确定继续吗？`)) return
  busy.value = true
  try {
    await $fetch(`${normalizedApi()}/v1/admin/people/${person.id}?confirm=true`, { method: 'DELETE', headers: authHeaders() })
    portraits.value = Object.fromEntries(Object.entries(portraits.value).filter(([id]) => id !== person.id))
    await loadAdminData()
    notice.value = `已删除「${person.display_name}」及其全部记忆材料。`
  } catch { notice.value = '删除失败，请刷新后重试。' } finally { busy.value = false }
}

onMounted(async () => {
  if (isOffline.value) { loadOfflinePreview(); return }
  token.value = sessionStorage.getItem('chronicle-admin-token') || ''
  if (token.value) {
    try { await loadAdminData() }
    catch { logout('登录已失效或该账号没有管理员权限。') }
  }
})
</script>

<template>
  <main v-if="!currentUser" class="login-shell">
    <section class="login-card">
      <p class="eyebrow">CHRONICLE MEMORY · ADMIN</p>
      <h1>记忆系统管理台</h1>
      <p class="lead">管理账号、人物资料、系统策略和证据画像。管理员入口与讲述端完全分离。</p>
      <p class="private-backend">PRIVATE BACKEND · 已绑定 Chronicle Memory 私域服务</p>
      <label>管理员邮箱<input v-model="email" inputmode="email" autocomplete="username"></label>
      <label>密码<input v-model="password" type="password" autocomplete="current-password" @keydown.enter="login"></label>
      <button :disabled="busy" @click="login">{{ busy ? '正在验证…' : '安全登录' }}</button>
      <p class="notice">{{ notice }}</p>
    </section>
  </main>

  <main v-else class="admin-shell">
    <aside>
      <div><p class="eyebrow">CHRONICLE ADMIN</p><h2>{{ settings.site_name }}</h2><small>{{ currentUser.display_name }} · 管理员</small></div>
      <nav><button v-for="item in [{id:'overview',label:'总览'},{id:'people',label:'人物与画像'},{id:'users',label:'账号'},{id:'groups',label:'家庭组'},{id:'settings',label:'设置'}]" :key="item.id" :class="{active:activeView===item.id}" @click="activeView=item.id as View">{{ item.label }}</button></nav>
      <button class="logout" @click="logout()">退出登录</button>
    </aside>
    <section class="content">
      <header><div><p class="eyebrow">PRIVATE OPERATIONS</p><h1>{{ {overview:'运行总览',people:'人物与画像',users:'账号与权限',groups:'家庭组共享',settings:'系统设置'}[activeView] }}</h1></div><span class="status">● 后端已连接</span></header>
      <p class="notice top">{{ notice }}</p>

      <template v-if="activeView==='overview'">
        <div class="metrics"><article v-for="metric in [{k:'people',l:'人物'},{k:'sources',l:'原始来源'},{k:'events',l:'事件'},{k:'draft_claims',l:'待确认陈述'},{k:'media_assets',l:'附件'},{k:'portraits',l:'画像版本'}]" :key="metric.k"><strong>{{ overview?.[metric.k as keyof Overview] || 0 }}</strong><span>{{ metric.l }}</span></article></div>
        <article class="panel"><h3>安全边界</h3><p>管理员接口要求短时 JWT 与管理员角色。画像只依据已保存的事件引文生成草稿，不推断性格、动机或未讲述经历。</p></article>
      </template>

      <template v-else-if="activeView==='people'">
        <article v-for="person in people" :key="person.id" class="panel person"><div><small>{{ person.relationship || '关系待补' }}</small><h3>{{ person.display_name }}</h3><p>{{ person.sources }} 条来源 · {{ person.events }} 个事件 · {{ person.media_assets }} 个附件 · {{ person.portrait_versions }} 版画像</p></div><div class="person-actions"><button :disabled="busy" @click="generatePortrait(person)">生成证据画像</button><button class="danger" :disabled="busy" @click="deletePerson(person)">删除整份记忆</button></div><blockquote v-if="portraits[person.id]">{{ portraits[person.id]?.summary }}<footer>主题：{{ portraits[person.id]?.themes.join('、') || '待积累' }}</footer></blockquote></article>
        <p v-if="!people.length" class="empty">讲述端创建人物后，这里会出现可管理档案。</p>
      </template>

      <template v-else-if="activeView==='users'">
        <article class="panel form-grid"><h3>创建账号</h3><input v-model="newUser.display_name" placeholder="显示名称"><input v-model="newUser.email" inputmode="email" placeholder="邮箱"><input v-model="newUser.password" type="password" placeholder="默认至少 8 位密码"><select v-model="newUser.role"><option value="member">普通成员</option><option value="operator">运营员</option><option value="admin">管理员</option></select><button :disabled="busy" @click="createUser">创建账号</button></article>
        <article v-for="user in users" :key="user.id" class="panel user"><div><strong>{{ user.display_name }}</strong><p>{{ user.email }} · {{ roleLabels[user.role] }}</p></div><select class="role-select" :value="user.role" :disabled="user.role==='super_admin' || user.id===currentUser?.id" @change="updateRole(user, ($event.target as HTMLSelectElement).value as AdminRole)"><option value="member">普通成员</option><option value="operator">运营员</option><option value="admin">管理员</option><option v-if="user.role==='super_admin'" value="super_admin">超级管理员</option></select><span :class="user.is_active?'enabled':'disabled'">{{ user.is_active?'已启用':'已停用' }}</span><button class="secondary" @click="toggleUser(user)">{{ user.is_active?'停用':'启用' }}</button></article>
      </template>

      <template v-else-if="activeView==='groups'">
        <article v-for="group in groups" :key="group.id" class="panel group-panel"><header><div><small>MEMORY GROUP</small><h3>{{ group.name }}</h3><p>{{ group.description || '没有描述' }} · 所有者 {{ group.owner_email }}</p></div><span>{{ group.member_count }} 位成员 · {{ group.people_count }} 个记忆空间</span></header><button class="secondary" @click="loadGroupMembers(group)">查看成员</button><div v-if="groupMembers[group.id]" class="group-members"><article v-for="member in groupMembers[group.id]" :key="member.id"><div><strong>{{ member.display_name }}</strong><small>{{ member.email }} · {{ member.role }}</small></div><button v-if="member.user_id!==group.owner_id" class="danger" @click="revokeGroupMember(group, member)">撤销访问</button></article></div></article>
        <p v-if="!groups.length" class="empty">用户创建家庭组后，这里会出现成员、共享记忆空间和撤销入口。</p>
      </template>

      <template v-else>
        <article class="panel settings"><label>系统名称<input v-model="settings.site_name"></label><label>来源保留天数<input v-model.number="settings.source_retention_days" type="number" min="0"><small>0 表示不自动删除</small></label><label class="check"><input v-model="settings.allow_member_registration" type="checkbox">允许成员自行注册</label><label class="check"><input v-model="settings.portrait_requires_confirmation" type="checkbox">画像发布前必须人工确认</label><button :disabled="busy" @click="saveSettings">保存系统设置</button></article>
      </template>
    </section>
  </main>
</template>

<style>
*{box-sizing:border-box}body{margin:0;background:#f2f4f1;color:#20332b;font-family:Inter,"Microsoft YaHei",sans-serif}button,input,select{font:inherit}.eyebrow{font-size:.72rem;letter-spacing:.15em;color:#9b7650;margin:0 0 8px}.login-shell{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 15% 20%,#dbe9df,transparent 36%),#eef0eb}.login-card{width:min(480px,100%);display:grid;gap:16px;padding:34px;background:#fffdf8;border:1px solid #dcd7cc;border-radius:24px;box-shadow:0 20px 55px #26392e1c}.login-card h1{margin:0;font-family:Georgia,"Noto Serif SC",serif}.lead,.panel p{color:#64736b;line-height:1.65}.login-card label,.settings label{display:grid;gap:7px;color:#53655c}.login-card input,.form-grid input,.form-grid select,.settings input{width:100%;padding:12px 13px;border:1px solid #d5d9d2;border-radius:11px;background:#fff}.login-card button,.panel button,.settings button{border:0;border-radius:11px;background:#285b47;color:#fff;padding:12px 16px;font-weight:650}.notice{color:#765d42;margin:0}.admin-shell{min-height:100vh;display:grid;grid-template-columns:245px 1fr}aside{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:28px 20px;background:#20372d;color:#e9f0ec}aside h2{margin:0 0 5px;font-family:Georgia,"Noto Serif SC",serif}aside small{color:#aac0b5}nav{display:grid;gap:7px;margin-top:38px}nav button,.logout{border:0;background:transparent;color:#c9d7d0;text-align:left;padding:11px 13px;border-radius:10px}.logout{margin-top:auto}nav button.active{background:#f2eee4;color:#274d3d;font-weight:700}.content{padding:34px clamp(20px,5vw,70px)}header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}header h1{margin:0;font:2.2rem Georgia,"Noto Serif SC",serif}.status{font-size:.82rem;color:#2c754e}.top{padding:12px 14px;background:#f8f2e7;border-radius:10px;margin-bottom:20px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.metrics article,.panel{background:#fff;border:1px solid #dde2dc;border-radius:16px;padding:20px}.metrics strong{display:block;font:2rem Georgia,serif}.metrics span{color:#748078;font-size:.85rem}.panel{margin-top:14px}.panel h3{margin:0 0 8px}.person{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center}.person h3{margin:4px 0}.person p,.user p{margin:4px 0}.person blockquote{grid-column:1/-1;margin:0;padding:14px;border-left:3px solid #a9875d;background:#faf7ef;line-height:1.6}.person footer{margin-top:7px;color:#877154;font-size:.83rem}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-grid h3{grid-column:1/-1}.user{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:14px}.enabled{color:#28704a}.disabled{color:#a44a42}.panel button.secondary{background:#edf1ee;color:#395448;padding:8px 12px}.settings{display:grid;gap:18px;max-width:700px}.check{grid-template-columns:auto 1fr!important;align-items:center}.check input{width:auto}.empty{text-align:center;color:#78857e;padding:50px}button:disabled{opacity:.5}@media(max-width:760px){.admin-shell{display:block}aside{position:static;height:auto;padding:18px}aside nav{display:flex;margin-top:18px;overflow:auto}.logout{position:absolute;right:12px;top:13px}.content{padding:24px 14px 80px}.metrics{grid-template-columns:repeat(2,1fr)}.person{grid-template-columns:1fr}.person button{justify-self:start}.form-grid{grid-template-columns:1fr}.form-grid h3{grid-column:auto}.user{grid-template-columns:1fr auto}.user button{grid-column:1/-1}header h1{font-size:1.8rem}.status{display:none}}
.person-actions{display:flex;gap:8px;align-items:center}.panel button.danger{background:#a64039}
/* Shared operations visual language: calm, legible, and deliberately restrained. */
:root{--admin-ink:#20372d;--admin-green:#285b47;--admin-paper:#fffdfa;--admin-line:#dce3db;--admin-gold:#aa8052;--admin-shadow:0 18px 42px #1f392214}body{min-height:100vh;background:radial-gradient(circle at 92% 5%,#efd9a63b,transparent 23%),radial-gradient(circle at 5% 30%,#d7e9dc74,transparent 28%),#f2f4f1}body:before{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.45;background-image:linear-gradient(90deg,#31534409 1px,transparent 1px),linear-gradient(#31534409 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(145deg,black,transparent 68%)}
button,input,select{transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s ease,border-color .18s ease,background .18s ease}button:not(:disabled):hover{transform:translateY(-2px)}button:not(:disabled):active{transform:translateY(0) scale(.98)}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #d3a45b70;outline-offset:2px}.login-card{position:relative;overflow:hidden;animation:card-in .55s cubic-bezier(.2,.8,.2,1) both}.login-card:before{content:'';position:absolute;right:-85px;top:-95px;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,#f0ce8866,transparent 68%)}.login-card>*{position:relative}.login-card input:focus,.form-grid input:focus,.form-grid select:focus,.settings input:focus{border-color:#a8865f;box-shadow:0 0 0 4px #e8d6b840}.login-card button,.panel button,.settings button{box-shadow:0 8px 16px #1f513b22}.login-card button:hover,.panel button:hover,.settings button:hover{box-shadow:0 12px 23px #1f513b30}
.admin-shell{animation:page-in .45s ease both}aside{background:linear-gradient(165deg,#1f392e,#173329 70%,#244d3b);box-shadow:12px 0 35px #18312516;overflow:hidden}aside:before{content:'';position:absolute;inset:auto -75px -75px auto;width:190px;height:190px;border:1px solid #e4b96a35;border-radius:50%;box-shadow:0 0 0 36px #e4b96a0d,0 0 0 72px #e4b96a08}aside>*,nav{position:relative}aside h2{letter-spacing:-.025em}nav button,.logout{transition:transform .18s ease,background .18s ease,color .18s ease}nav button:not(.active):hover{background:#ffffff12;color:#fff}.logout:hover{background:#ffffff10;color:#fff}.content{position:relative}.content header{padding-bottom:17px;border-bottom:1px solid #d7dfd7}.status{padding:8px 11px;border-radius:999px;background:#e5f1e8;border:1px solid #bdd8c2;box-shadow:0 4px 10px #315f3a11}.top{border:1px solid #eadfc8;box-shadow:0 8px 20px #6e573509;animation:fade-up .35s .08s both}.metrics article,.panel{box-shadow:0 5px 15px transparent;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}.metrics article{position:relative;overflow:hidden;animation:fade-up .4s ease both}.metrics article:after{content:'';position:absolute;width:55px;height:55px;border-radius:50%;right:-18px;bottom:-24px;background:#d6e7da}.metrics article:nth-child(3n+2):after{background:#f1ddaf}.metrics article:nth-child(3n):after{background:#ddd6ec}.metrics article:hover,.panel:hover{transform:translateY(-4px);border-color:#c4d2c6;box-shadow:var(--admin-shadow)}.metrics strong{position:relative;z-index:1}.panel{background:linear-gradient(140deg,#fff,#fffdfa)}.person{animation:fade-up .38s ease both}.person-actions button{white-space:nowrap}.person blockquote{border-radius:0 11px 11px 0;box-shadow:inset 0 1px #fff}.form-grid{position:relative}.form-grid button{justify-self:start}.user{transition:transform .2s ease,box-shadow .2s ease}.enabled,.disabled{padding:5px 8px;border-radius:999px;background:#e8f3eb;font-size:.78rem}.disabled{background:#f8e8e5}.settings label{padding:11px 0;border-bottom:1px dashed #d9dfd9}.settings label:last-of-type{border-bottom:0}.empty{border:1px dashed #c9d5cc;border-radius:16px;background:#ffffff91}.notice{animation:notice-in .3s ease}.content>template{animation:fade-up .3s ease both}
@keyframes page-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes card-in{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}@keyframes fade-up{from{opacity:0;transform:translateY(11px)}to{opacity:1;transform:none}}@keyframes notice-in{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
html,body,#\#__nuxt{width:100%;max-width:100%;overflow-x:hidden}
.admin-shell{min-width:0;width:100%;max-width:100%}
.user{grid-template-columns:minmax(0,1fr) auto auto auto}
.role-select{min-width:125px;padding:8px 10px;border:1px solid #d5d9d2;border-radius:10px;background:#fff;color:#395448}
@media(max-width:760px){.user{grid-template-columns:1fr auto}.user .role-select{grid-column:1/-1;width:100%}}
@media (min-width:761px) and (max-width:1200px) and (orientation:landscape){
  aside{width:210px;padding-inline:15px}
  .admin-shell{grid-template-columns:210px minmax(0,1fr)}
  .content{min-width:0;padding-inline:24px}
  .metrics{grid-template-columns:repeat(3,minmax(0,1fr))}
  .form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
.group-panel>header{display:flex;gap:18px;align-items:flex-start}.group-panel>header h3{margin:4px 0}.group-panel>header>span{color:#69786e;font-size:.82rem}.group-members{display:grid;gap:8px;margin-top:14px}.group-members article{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px 13px;border:1px solid var(--admin-line);border-radius:12px;background:#fafcf9}.group-members small{display:block;margin-top:3px;color:#7b877f}.group-panel button.secondary{margin-top:10px}@media(max-width:760px){.group-panel>header{display:grid}}
</style>
