<script setup lang="ts">
import html2canvas from 'html2canvas'

type User = { id: string; email: string; display_name: string; role: 'super_admin' | 'admin' | 'operator' | 'member' }
type Profile = {
  id: string
  display_name: string
  avatar_url?: string
  privacy_mode: 'local_first' | 'cloud_opt_in'
  ui_preferences: Record<string, string | number | boolean>
}
type AIProfile = {
  provider: 'deepseek' | 'openai' | 'openrouter' | 'custom'
  base_url: string
  model: string
  has_api_key: boolean
  key_hint?: string
  persona: string
  preferences: string[]
}
type EventItem = {
  id: string
  title: string
  narrative: string
  start_label?: string
  day_label?: string
  timeline_sort_key?: string
  status: string
  evidence: string[]
}
type Question = { id: string; question: string; rationale: string }
type Collection = {
  id: string
  person_id: string
  title: string
  description?: string
  accent: string
  cover_asset_id?: string
  created_at: string
  updated_at: string
}
type Page = {
  id: string
  page_key: string
  page_type: 'cover' | 'day' | 'free' | 'back'
  title: string
  order_index: number
  style: Record<string, string>
}
type Block = {
  id: string
  collection_id: string
  source_id?: string
  media_id?: string
  event_id?: string
  kind: string
  body: string
  title?: string
  ai_note?: string
  emoji?: string
  mood?: string
  tags: string[]
  style: Record<string, string>
  media_url?: string
  place_labels: string[]
  x: number
  y: number
  width: number
  height: number
  rotation: number
  z_index: number
  created_at: string
  updated_at: string
}
type CollectionDetail = Collection & {
  blocks: Block[]
  events: EventItem[]
  open_questions: Question[]
  pages: Page[]
}
type Narrative = {
  id: string
  perspective: string
  title: string
  content: string
  source_ids: string[]
  status: string
  created_at: string
}
type GraphNode = { id: string; label: string; type: string; weight: number }
type GraphEdge = { source: string; target: string; label: string }
type MemoryGroup = { id: string; owner_id: string; name: string; description?: string; people_count: number; member_count: number; created_at: string; updated_at: string }
type MemoryGroupMember = { id: string; group_id: string; user_id: string; email: string; display_name: string; role: 'viewer' | 'editor' | 'admin'; created_at: string }
type WorldBook = {
  person: { id: string; display_name: string }
  collections: Collection[]
  recent_events: EventItem[]
  entities: string[]
  narratives: Narrative[]
  graph_nodes: GraphNode[]
  graph_edges: GraphEdge[]
}
type StagedMedia = { file: File; url: string; name: string }
type CoachSuggestion = { question: string; rationale: string; action: 'write' | 'photo' | 'time' | 'place' | 'link' }
type Coach = { summary: string; suggestions: CoachSuggestion[] }
type CopilotContext = { title: string; excerpt: string; matched_by: string[] }
type MemorySegmentPreview = {
  segment_key: string
  text: string
  source_start: number
  source_end: number
  start_label?: string
  temporal_precision: 'exact' | 'month' | 'season' | 'relative' | 'unknown'
  confidence: number
  needs_confirmation: boolean
}
type View = 'wall' | 'timeline' | 'world' | 'settings'
type SettingsTab = 'search' | 'ai' | 'graph' | 'groups' | 'profile'

const config = useRuntimeConfig()
// Production builds bind to the private HTTPS API. Local development can
// still override this value with NUXT_PUBLIC_API_BASE.
const apiBase = ref(String(config.public.apiBase ?? (import.meta.dev ? '/api' : '')))
const demoEmail = String(config.public.demoEmail ?? '')
const demoPassword = String(config.public.demoPassword ?? '')
const token = ref(import.meta.client ? localStorage.getItem('chronicle-user-token') || '' : '')
const activeView = ref<View>('wall')
const settingsTab = ref<SettingsTab>('search')
const currentUser = ref<User>()
const profile = ref<Profile>()
const aiProfile = ref<AIProfile>({
  provider: 'deepseek',
  base_url: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  has_api_key: false,
  persona: '',
  preferences: [],
})
const aiKeyInput = ref('')
const preferenceInput = ref('')
const authMode = ref<'login' | 'register'>('login')
const authEmail = ref('')
const authPassword = ref('')
const authName = ref('')
const personId = ref('')
const personName = ref('我的世界书')
const collections = ref<Collection[]>([])
const selectedCollectionId = ref('')
const detail = ref<CollectionDetail>()
const world = ref<WorldBook>()
const selectedPageKey = ref('')
const pageOverview = ref(false)
const newPageTitle = ref('')
const showPageCreator = ref(false)
const showComposer = ref(false)
const showChat = ref(false)
const showProfileMenu = ref(false)
const confirmLogout = ref(false)
const showNarrativeWorkbench = ref(false)
const editingNarrativeId = ref('')
const narrativeEdit = reactive({ title: '', content: '', status: 'draft' })
const fileInput = ref<HTMLInputElement>()
const replaceFileInput = ref<HTMLInputElement>()
const wall = ref<HTMLElement>()
const wallStage = ref<HTMLElement>()
const wallViewport = ref<HTMLElement>()
const narrativeWorkbench = ref<HTMLElement>()
const message = ref('')
const mood = ref('')
const occurredAt = ref('')
const placeLabel = ref('')
const titleHint = ref('')
const photoCaption = ref('')
const stagedMedia = ref<StagedMedia[]>([])
const segmentPreview = ref<MemorySegmentPreview[]>([])
const segmentSelection = ref<boolean[]>([])
const showSegmentConfirm = ref(false)
const layoutPreset = ref<'free' | 'grid2' | 'grid3' | 'polaroid'>('free')
const stickerChoice = ref('✨')
const newCollectionTitle = ref('')
const notice = ref('登录后，你的画布会只同步到自己的记忆空间。')
const busy = ref(false)
const searchQuery = ref('')
const searchHits = ref<Array<{ title: string; excerpt: string; matched_by: string[]; rank_components?: Record<string, number> }>>([])
const dragging = ref<{ id: string; startX: number; startY: number; x: number; y: number }>()
const resizing = ref<{ id: string; startX: number; startY: number; width: number; height: number }>()
const selectedBlock = ref<Block>()
const editorSide = ref<'left' | 'right'>('left')
const editorWidth = ref(330)
const editorHeight = ref(620)
const previewBlock = ref<Block>()
const previewScale = ref(1)
const chatMessage = ref('')
const chatMessages = ref<Array<{ role: 'user' | 'ai'; text: string; suggested?: string; memory?: CopilotContext[] }>>([])
const groups = ref<MemoryGroup[]>([])
const selectedGroupId = ref('')
const groupMembers = ref<MemoryGroupMember[]>([])
const groupPeople = ref<Array<{ id: string; display_name: string }>>([])
const groupNameInput = ref('')
const groupDescriptionInput = ref('')
const memberEmailInput = ref('')
const memberRoleInput = ref<'viewer' | 'editor' | 'admin'>('viewer')
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const panning = ref<{ startX: number; startY: number; x: number; y: number }>()
const reelDragBlockId = ref('')
const contextMenu = ref<{ block: Block; x: number; y: number }>()
const isImmersive = ref(false)
const coach = ref<Coach>()
const narrativePerspective = ref<'daily' | 'event' | 'stage' | 'world'>('daily')
const narrativeEventId = ref('')
const narrativeInstruction = ref('')
const mediaUrls = reactive<Record<string, string>>({})

const isOffline = computed(() => !apiBase.value)
const needsAuth = computed(() => !isOffline.value && !token.value)
const selectedCollection = computed(() => collections.value.find(item => item.id === selectedCollectionId.value))
const allBlocks = computed(() => detail.value?.blocks || [])
const pages = computed(() => [...(detail.value?.pages || [])].sort((a, b) => a.order_index - b.order_index))
const currentPage = computed(() => pages.value.find(page => page.page_key === selectedPageKey.value))
const timelineEvents = computed(() => detail.value?.events || [])
const eventById = computed(() => Object.fromEntries(timelineEvents.value.map(event => [event.id, event])))
const questions = computed(() => detail.value?.open_questions || [])
const visiblePageBlocks = computed(() => allBlocks.value.filter(block => pageKeyForBlock(block) === selectedPageKey.value && block.style?.hidden !== 'true'))
const hiddenPageBlocks = computed(() => allBlocks.value.filter(block => pageKeyForBlock(block) === selectedPageKey.value && block.style?.hidden === 'true'))
const currentPageBlocks = computed(() => allBlocks.value.filter(block => pageKeyForBlock(block) === selectedPageKey.value))
const pageIndex = computed(() => Math.max(0, pages.value.findIndex(page => page.page_key === selectedPageKey.value)))
const timelineGroups = computed(() => {
  const grouped = new Map<string, EventItem[]>()
  for (const event of [...timelineEvents.value].sort((a, b) => (a.timeline_sort_key || '').localeCompare(b.timeline_sort_key || ''))) {
    const label = event.day_label || event.start_label || '时间待补'
    grouped.set(label, [...(grouped.get(label) || []), event])
  }
  return [...grouped].map(([label, events]) => ({ label, events }))
})
const graphLayout = computed(() => {
  const nodes = (world.value?.graph_nodes || []).slice(0, 36)
  const positions: Record<string, { x: number; y: number }> = {}
  const center = nodes.find(node => node.type === 'person')
  if (center) positions[center.id] = { x: 500, y: 280 }
  const others = nodes.filter(node => node.id !== center?.id)
  others.forEach((node, index) => {
    const ring = index < 12 ? 175 : 245
    const localIndex = index < 12 ? index : index - 12
    const count = index < 12 ? Math.min(12, others.length) : Math.max(1, others.length - 12)
    const angle = (Math.PI * 2 * localIndex) / count - Math.PI / 2
    positions[node.id] = { x: 500 + Math.cos(angle) * ring, y: 280 + Math.sin(angle) * ring }
  })
  return { nodes, edges: (world.value?.graph_edges || []).filter(edge => positions[edge.source] && positions[edge.target]), positions }
})

function api(path: string) { return `${apiBase.value.replace(/\/$/, '')}${path}` }
function authHeaders(): Record<string, string> { return token.value ? { Authorization: `Bearer ${token.value}` } : {} }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }
function mediaUrl(url?: string) { return (url && mediaUrls[url]) || '' }
function demoAsset(name: string) { return `${config.app.baseURL || '/'}demo/${name}` }
function cardScale(block: Block) {
  // Keep a small card as a true miniature. The previous lower bound kept the
  // text at near full size and produced an unusable inner scrollbar.
  return clamp(Math.min(block.width / 34, block.height / 28), .46, 1)
}
function resetCanvasView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}
function setZoom(value: number) {
  zoom.value = clamp(value, .7, 1.6)
  if (zoom.value <= 1) {
    panX.value = 0
    panY.value = 0
  }
}
function handleCanvasWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    setZoom(zoom.value + (event.deltaY < 0 ? .1 : -.1))
  } else if (event.shiftKey && zoom.value > 1) {
    // Shift + wheel is the deliberate canvas-pan gesture. Plain wheel is
    // intentionally left to the browser so the page remains readable.
    event.preventDefault()
    panX.value -= event.deltaY || event.deltaX
  }
}
function beginCanvasPan(event: PointerEvent) {
  if (zoom.value <= 1 || (event.target as HTMLElement).closest('.memory-block,.page-turn,button,input,textarea,select') || (event.button !== 1 && !event.shiftKey)) return
  event.preventDefault()
  panning.value = { startX: event.clientX, startY: event.clientY, x: panX.value, y: panY.value }
}
function closeCanvasOverlays() {
  contextMenu.value = undefined
  selectedBlock.value = undefined
}
function openBlockMenu(block: Block, event: MouseEvent) {
  selectedBlock.value = { ...block, style: { ...block.style } }
  contextMenu.value = { block, x: clamp(event.clientX, 12, window.innerWidth - 220), y: clamp(event.clientY, 12, window.innerHeight - 280) }
}
function raiseBlock(block: Block) {
  const zIndex = Math.max(1, ...allBlocks.value.map(item => item.z_index)) + 1
  block.z_index = zIndex
  void patchBlock(block, { z_index: zIndex })
}
function rotateBlock(block: Block, delta: number) {
  block.rotation = clamp(block.rotation + delta, -20, 20)
  void patchBlock(block, { rotation: block.rotation })
}
async function deleteBlock(block: Block) {
  if (!confirm(`从这页移除“${block.title || '未命名卡片'}”？原始照片和记忆来源会保留在档案中。`)) return
  contextMenu.value = undefined
  if (isOffline.value && detail.value) {
    detail.value.blocks = detail.value.blocks.filter(item => item.id !== block.id)
    selectedBlock.value = undefined
    return
  }
  try {
    await $fetch(api(`/v1/collections/${block.collection_id}/blocks/${block.id}`), { method: 'DELETE', headers: authHeaders() })
    if (detail.value) detail.value.blocks = detail.value.blocks.filter(item => item.id !== block.id)
    selectedBlock.value = undefined
    notice.value = '卡片已从手账页移除，原始材料仍可在记忆档案中追溯。'
  } catch {
    notice.value = '移除失败，请稍后重试。'
  }
}
function openReplacePicker() { replaceFileInput.value?.click() }
async function replaceBlockMedia(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  const block = selectedBlock.value
  if (!file || !block) return
  if (replaceFileInput.value) replaceFileInput.value.value = ''
  if (isOffline.value) {
    const key = `offline-replaced-${Date.now()}`
    mediaUrls[key] = URL.createObjectURL(file)
    block.media_url = key
    block.body = block.body || file.name
    await patchBlock(block, { body: block.body })
    notice.value = '已替换离线预览图片。'
    return
  }
  busy.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('caption', block.body || block.title || file.name)
    const updated = await $fetch<Block>(api(`/v1/collections/${block.collection_id}/blocks/${block.id}/replace-media`), { method: 'POST', headers: authHeaders(), body: form })
    if (updated.media_url) {
      const blob = await $fetch<Blob>(api(updated.media_url), { headers: authHeaders(), responseType: 'blob' })
      mediaUrls[updated.media_url] = URL.createObjectURL(blob)
    }
    const index = allBlocks.value.findIndex(item => item.id === updated.id)
    if (index >= 0 && detail.value) detail.value.blocks[index] = updated
    selectedBlock.value = { ...updated, style: { ...updated.style } }
    notice.value = '图片已替换；旧照片仍作为可追溯素材保留。'
  } catch {
    notice.value = '图片替换失败，请检查文件后重试。'
  } finally {
    busy.value = false
  }
}
function pageKeyForBlock(block: Block) {
  if (block.style?.page_key) return block.style.page_key
  const event = eventById.value[block.event_id || '']
  return event ? `day:${event.day_label || event.start_label || '时间待补'}` : 'undated'
}
function pageCount(key: string) { return allBlocks.value.filter(block => pageKeyForBlock(block) === key && block.style?.hidden !== 'true').length }
function connectionFailureMessage(error: any, fallback = '私域记忆服务暂时不可用，请稍后重试或联系管理员。') {
  const detail = error?.data?.detail || error?.response?._data?.detail
  if (typeof detail === 'string') return `后端返回：${detail}`
  return fallback
}
function dateInputFor(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}
function parseRelativeDate() {
  if (/前天/.test(message.value)) occurredAt.value = dateInputFor(-2)
  else if (/昨天/.test(message.value)) occurredAt.value = dateInputFor(-1)
  else if (/明天/.test(message.value)) occurredAt.value = dateInputFor(1)
  else if (/后天/.test(message.value)) occurredAt.value = dateInputFor(2)
  else if (/今天|此刻|刚刚/.test(message.value)) occurredAt.value = dateInputFor(0)
  else {
    notice.value = '没有识别到相对日期。你可以从日历选择，也可以让 AI 只提取文字中明确出现的线索。'
    return
  }
  notice.value = `已换算为 ${occurredAt.value}，保存后不再用“今天”这类相对日期。`
}
function currentLayout() {
  const count = visiblePageBlocks.value.length
  return {
    x: 8 + (count * 13) % 56,
    y: 10 + (count * 17) % 52,
    width: 34,
    height: 28,
    rotation: [-2, 1, 3, -1][count % 4] ?? 0,
    z_index: allBlocks.value.length + 1,
  }
}
function layoutFor(index: number, kind: 'image' | 'note' = 'image') {
  const z_index = allBlocks.value.length + index + 1
  if (kind === 'note') return { ...currentLayout(), z_index }
  const presets: Record<string, number[][]> = {
    grid2: [[7, 12], [52, 12], [7, 55], [52, 55]],
    grid3: [[5, 11], [36, 11], [67, 11], [5, 54], [36, 54], [67, 54]],
    polaroid: [[9, 16], [43, 10], [66, 48], [28, 55]],
  }
  const positions = presets[layoutPreset.value]
  if (!positions) return { ...currentLayout(), z_index }
  const [x = 8, y = 10] = positions[index % positions.length] || []
  if (layoutPreset.value === 'grid2') return { x, y, width: 39, height: 37, rotation: 0, z_index }
  if (layoutPreset.value === 'grid3') return { x, y, width: 27, height: 38, rotation: 0, z_index }
  return { x, y, width: 30, height: 35, rotation: [-5, 3, -2, 5][index % 4]!, z_index }
}
function turnPage(direction: -1 | 1) {
  if (!pages.value.length) return
  const next = (pageIndex.value + direction + pages.value.length) % pages.value.length
  selectedPageKey.value = pages.value[next]!.page_key
  pageOverview.value = false
  selectedBlock.value = undefined
  resetCanvasView()
}
function selectPage(key: string) {
  selectedPageKey.value = key
  pageOverview.value = false
  selectedBlock.value = undefined
  resetCanvasView()
}
function textPosition(block: Block) {
  if (block.kind !== 'image') return 'note'
  return block.style?.text_position || 'bottom'
}

async function hydrateMedia(value: CollectionDetail) {
  if (isOffline.value) return
  await Promise.all(value.blocks.filter(block => block.media_url && !mediaUrls[block.media_url]).map(async (block) => {
    if (!block.media_url) return
    try {
      const blob = await $fetch<Blob>(api(block.media_url), { headers: authHeaders(), responseType: 'blob' })
      mediaUrls[block.media_url] = URL.createObjectURL(blob)
    } catch {
      notice.value = '有一张图片暂时无法读取。'
    }
  }))
}
async function selectCollection(id: string) {
  selectedCollectionId.value = id
  if (isOffline.value) return
  const next = await $fetch<CollectionDetail>(api(`/v1/collections/${id}`), { headers: authHeaders() })
  detail.value = next
  const firstWithContent = next.pages.find(page => next.blocks.some(block => {
    const event = next.events.find(item => item.id === block.event_id)
    const key = block.style?.page_key || (event ? `day:${event.day_label || event.start_label || '时间待补'}` : 'undated')
    return key === page.page_key && block.style?.hidden !== 'true'
  }))
  selectedPageKey.value = firstWithContent?.page_key || next.pages.find(page => page.page_type === 'day')?.page_key || next.pages[0]?.page_key || ''
  await hydrateMedia(next)
  await loadMemoryCoach()
}
async function ensureRemoteWorkspace() {
  const workspace = await $fetch<{ person: { id: string; display_name: string } }>(api('/v1/me/workspace'), { headers: authHeaders() })
  personId.value = workspace.person.id
  personName.value = workspace.person.display_name
  collections.value = await $fetch<Collection[]>(api(`/v1/people/${personId.value}/collections`), { headers: authHeaders() })
  if (!collections.value.length) {
    const first = await $fetch<Collection>(api(`/v1/people/${personId.value}/collections`), {
      method: 'POST',
      headers: authHeaders(),
      body: { title: '最近生活', description: '只属于你的第一本手账', accent: 'sunset' },
    })
    collections.value = [first]
  }
  await selectCollection(selectedCollectionId.value || collections.value[0]!.id)
  await Promise.all([refreshWorld(), loadPersonalSettings(), loadGroups()])
}
async function loadGroups() {
  if (isOffline.value) return
  groups.value = await $fetch<MemoryGroup[]>(api('/v1/groups'), { headers: authHeaders() })
  if (selectedGroupId.value && !groups.value.some(group => group.id === selectedGroupId.value)) selectedGroupId.value = ''
  if (!selectedGroupId.value && groups.value[0]) await selectGroup(groups.value[0].id)
}
async function selectGroup(groupId: string) {
  selectedGroupId.value = groupId
  if (isOffline.value) return
  const [members, people] = await Promise.all([
    $fetch<MemoryGroupMember[]>(api(`/v1/groups/${groupId}/members`), { headers: authHeaders() }),
    $fetch<Array<{ id: string; display_name: string }>>(api(`/v1/groups/${groupId}/people`), { headers: authHeaders() }),
  ])
  groupMembers.value = members
  groupPeople.value = people
}
async function createGroup() {
  if (isOffline.value || !groupNameInput.value.trim()) {
    notice.value = isOffline.value ? '离线展台只展示家庭组界面，连接私域后即可创建。' : '请先填写家庭组名称。'
    return
  }
  busy.value = true
  try {
    const group = await $fetch<MemoryGroup>(api('/v1/groups'), { method: 'POST', headers: authHeaders(), body: { name: groupNameInput.value.trim(), description: groupDescriptionInput.value.trim() || null } })
    groups.value = [group, ...groups.value]
    groupNameInput.value = ''; groupDescriptionInput.value = ''
    await selectGroup(group.id)
    notice.value = '家庭组已创建。你可以按邮箱添加成员，再选择共享哪些记忆空间。'
  } catch (error: any) { notice.value = connectionFailureMessage(error, '家庭组创建失败。') } finally { busy.value = false }
}
async function addGroupMember() {
  if (isOffline.value || !selectedGroupId.value || !memberEmailInput.value.trim()) return
  busy.value = true
  try {
    const member = await $fetch<MemoryGroupMember>(api(`/v1/groups/${selectedGroupId.value}/members`), { method: 'POST', headers: authHeaders(), body: { email: memberEmailInput.value.trim(), role: memberRoleInput.value } })
    groupMembers.value = [...groupMembers.value.filter(item => item.id !== member.id), member]
    memberEmailInput.value = ''
    notice.value = '成员权限已保存。'
  } catch (error: any) { notice.value = connectionFailureMessage(error, '成员添加失败，请确认对方已注册。') } finally { busy.value = false }
}
async function shareCurrentPerson() {
  if (isOffline.value || !selectedGroupId.value || !personId.value) return
  try {
    await $fetch(api(`/v1/groups/${selectedGroupId.value}/people/${personId.value}`), { method: 'POST', headers: authHeaders() })
    await selectGroup(selectedGroupId.value)
    notice.value = '当前记忆空间已加入家庭组。'
  } catch (error: any) { notice.value = connectionFailureMessage(error, '共享记忆空间失败。') }
}
async function revokeGroupPerson(person: { id: string; display_name: string }) {
  if (isOffline.value || !selectedGroupId.value || !confirm(`从家庭组撤销“${person.display_name}”？`)) return
  await $fetch(api(`/v1/groups/${selectedGroupId.value}/people/${person.id}`), { method: 'DELETE', headers: authHeaders() })
  groupPeople.value = groupPeople.value.filter(item => item.id !== person.id)
  notice.value = '共享记忆空间已撤销。'
}
async function removeGroupMember(member: MemoryGroupMember) {
  if (isOffline.value || !selectedGroupId.value || !confirm(`移除成员 ${member.email}？`)) return
  try {
    await $fetch(api(`/v1/groups/${selectedGroupId.value}/members/${member.id}`), { method: 'DELETE', headers: authHeaders() })
    groupMembers.value = groupMembers.value.filter(item => item.id !== member.id)
    notice.value = '成员已撤销访问。'
  } catch (error: any) { notice.value = connectionFailureMessage(error, '成员撤销失败。') }
}
async function loadPersonalSettings() {
  profile.value = await $fetch<Profile>(api('/v1/profile'), { headers: authHeaders() })
  applyUiPreferences(profile.value.ui_preferences)
  aiProfile.value = await $fetch<AIProfile>(api('/v1/ai-profile'), { headers: authHeaders() })
  preferenceInput.value = aiProfile.value.preferences.join('，')
}
async function loadIdentity() {
  currentUser.value = await $fetch<User>(api('/v1/auth/me'), { headers: authHeaders() })
  // A valid token is enough to enter the app. A slow workspace/profile call
  // must not turn a successful login into a generic login error on mobile.
  try {
    await ensureRemoteWorkspace()
  } catch (error) {
    notice.value = connectionFailureMessage(error, '登录成功，但私人记忆尚未完成同步。请稍后刷新。')
    return
  }
  if (import.meta.client) window.scrollTo({ top: 0 })
  notice.value = '已同步你的私人记忆空间。'
}
function loadOfflineDemo() {
  const collection: Collection = { id: 'offline-recent-life', person_id: 'offline-person', title: '夏日周末', description: '三天湖畔旅行的可交互产品展台', accent: 'sunset', created_at: '2026-07-18T08:00:00Z', updated_at: '2026-07-20T22:00:00Z' }
  const events: EventItem[] = [
    { id: 'offline-event-18', title: '抵达湖畔与落日散步', narrative: '下午抵达民宿，傍晚沿湖散步，拍下天空变暗前的最后一段橙色。', start_label: '2026-07-18', day_label: '2026年7月18日', timeline_sort_key: '2026-07-18', status: 'draft', evidence: ['傍晚沿湖散步，拍下天空变暗前的最后一段橙色。'] },
    { id: 'offline-event-19', title: '雨天咖啡馆写明信片', narrative: '第二天下雨，在旧街咖啡馆写了三张明信片，窗外的树一直在滴水。', start_label: '2026-07-19', day_label: '2026年7月19日', timeline_sort_key: '2026-07-19', status: 'draft', evidence: ['在旧街咖啡馆写了三张明信片。'] },
    { id: 'offline-event-20', title: '清晨码头与返程', narrative: '返程前去了安静的码头，把车票夹进手账，约定秋天再来。', start_label: '2026-07-20', day_label: '2026年7月20日', timeline_sort_key: '2026-07-20', status: 'draft', evidence: ['把车票夹进手账，约定秋天再来。'] },
  ]
  const demoPages: Page[] = [
    { id: 'cover', page_key: 'cover', page_type: 'cover', title: '夏日周末', order_index: 0, style: { theme: 'linen', border: 'album' } },
    { id: 'day-18', page_key: 'day:2026年7月18日', page_type: 'day', title: '2026年7月18日', order_index: 10, style: { theme: 'grid', border: 'classic' } },
    { id: 'day-19', page_key: 'day:2026年7月19日', page_type: 'day', title: '2026年7月19日', order_index: 20, style: { theme: 'floral', border: 'postcard' } },
    { id: 'day-20', page_key: 'day:2026年7月20日', page_type: 'day', title: '2026年7月20日', order_index: 30, style: { theme: 'film', border: 'album' } },
    { id: 'free', page_key: 'free:ticket-pocket', page_type: 'free', title: '票根与碎片', order_index: 40, style: { theme: 'linen', border: 'postcard' } },
    { id: 'back', page_key: 'back', page_type: 'back', title: '写在最后', order_index: 10000, style: { theme: 'minimal', border: 'postcard' } },
  ]
  mediaUrls['demo-lake'] = demoAsset('lake-sunset.svg')
  mediaUrls['demo-cafe'] = demoAsset('cafe-window.svg')
  mediaUrls['demo-ticket'] = demoAsset('train-ticket.svg')
  currentUser.value = { id: 'offline-user', email: 'preview@chronicle.local', display_name: '演示访客', role: 'member' }
  profile.value = { id: 'offline-profile', display_name: '演示访客', privacy_mode: 'local_first', ui_preferences: {} }
  personId.value = 'offline-person'
  collections.value = [collection]
  selectedCollectionId.value = collection.id
  selectedPageKey.value = demoPages[1]!.page_key
  personName.value = '我的世界书'
  detail.value = {
    ...collection,
    pages: demoPages,
    events,
    open_questions: [
      { id: 'offline-question-1', question: '那天的风是什么感觉？', rationale: '让湖边散步更具体' },
      { id: 'offline-question-2', question: '三张明信片分别写给了谁？', rationale: '把人物关系接回记忆' },
      { id: 'offline-question-3', question: '返程时最舍不得哪一个画面？', rationale: '补全旅程收束' },
    ],
    blocks: [
      { id: 'offline-lake-image', collection_id: collection.id, event_id: events[0]!.id, kind: 'image', title: '风把湖面吹成碎金', body: '到湖边时刚好是蓝调时刻，远处的灯一盏一盏亮起来。', emoji: '🌇', mood: '松弛', tags: ['夏天', '抵达'], style: { page_key: demoPages[1]!.page_key, text_position: 'bottom', frame: 'polaroid' }, media_url: 'demo-lake', place_labels: ['南岸步道'], x: 7, y: 10, width: 43, height: 50, rotation: -2, z_index: 1, created_at: '', updated_at: '' },
      { id: 'offline-note', collection_id: collection.id, event_id: events[0]!.id, kind: 'note', title: '湖边落日散步', body: '风里有晒过草木的味道。我们没有赶路，只沿着水边慢慢走。', emoji: '🌿', mood: '松弛', tags: ['散步', '夏天'], style: { page_key: demoPages[1]!.page_key }, place_labels: ['湖边'], x: 55, y: 14, width: 33, height: 25, rotation: 2, z_index: 2, created_at: '', updated_at: '' },
      { id: 'offline-arrival-note', collection_id: collection.id, event_id: events[0]!.id, kind: 'note', title: '民宿的第一盏灯', body: '推开窗时看见湖面像被云擦过。阿然说，今晚先什么也别安排。', emoji: '🏠', mood: '安定', tags: ['抵达', '同行'], style: { page_key: demoPages[1]!.page_key }, place_labels: ['湖畔民宿'], x: 15, y: 66, width: 35, height: 24, rotation: 1, z_index: 3, created_at: '', updated_at: '' },
      { id: 'offline-sticker', collection_id: collection.id, event_id: events[0]!.id, kind: 'sticker', title: '留给明天', body: '下次想带一本书，在同一张长椅上读完一章。', emoji: '📚', mood: '期待', tags: ['小计划'], style: { page_key: demoPages[1]!.page_key, hidden: 'true' }, place_labels: [], x: 57, y: 52, width: 28, height: 22, rotation: 3, z_index: 3, created_at: '', updated_at: '' },
      { id: 'offline-cafe-image', collection_id: collection.id, event_id: events[1]!.id, kind: 'image', title: '雨落在旧街的窗上', body: '咖啡馆放着很轻的爵士乐，三张明信片写了很久。', emoji: '☕', mood: '安静', tags: ['雨天', '明信片'], style: { page_key: demoPages[2]!.page_key, text_position: 'right', frame: 'free' }, media_url: 'demo-cafe', place_labels: ['旧街咖啡馆'], x: 9, y: 14, width: 58, height: 45, rotation: 1, z_index: 1, created_at: '', updated_at: '' },
      { id: 'offline-cafe-note', collection_id: collection.id, event_id: events[1]!.id, kind: 'sticker', title: '写给未来的我', body: '别急着把每一天过成答案，允许旅途中有一整个下午只是听雨。', emoji: '✉️', mood: '治愈', tags: ['手写'], style: { page_key: demoPages[2]!.page_key }, place_labels: [], x: 58, y: 57, width: 31, height: 27, rotation: -3, z_index: 2, created_at: '', updated_at: '' },
      { id: 'offline-cafe-note-two', collection_id: collection.id, event_id: events[1]!.id, kind: 'note', title: '第三张没有寄出的明信片', body: '写到最后只留下一句：雨停以后，城市会把人慢慢送回自己身边。', emoji: '🖋️', mood: '安静', tags: ['明信片', '雨天'], style: { page_key: demoPages[2]!.page_key }, place_labels: ['旧街咖啡馆'], x: 10, y: 64, width: 39, height: 23, rotation: -1, z_index: 3, created_at: '', updated_at: '' },
      { id: 'offline-ticket-image', collection_id: collection.id, event_id: events[2]!.id, kind: 'image', title: '返程车票', body: '车开出站时，湖面在窗外闪了一下。', emoji: '🎫', mood: '想念', tags: ['返程', '票根'], style: { page_key: demoPages[3]!.page_key, text_position: 'overlay', frame: 'polaroid' }, media_url: 'demo-ticket', place_labels: ['东站'], x: 18, y: 17, width: 50, height: 45, rotation: -4, z_index: 1, created_at: '', updated_at: '' },
      { id: 'offline-return-note', collection_id: collection.id, event_id: events[2]!.id, kind: 'note', title: '把日落夹进行李箱', body: '返程前没有再拍照，只把那段橙色和车票夹进了这本手账。', emoji: '🧡', mood: '想念', tags: ['返程', '纪念'], style: { page_key: demoPages[3]!.page_key }, place_labels: ['东站'], x: 60, y: 22, width: 30, height: 26, rotation: 3, z_index: 2, created_at: '', updated_at: '' },
      { id: 'offline-free-note', collection_id: collection.id, kind: 'note', title: '旅行带回来的小东西', body: '车票、咖啡店印章、没有寄出的明信片，以及一段还没写完的话。', emoji: '🧳', mood: '珍藏', tags: ['碎片'], style: { page_key: demoPages[4]!.page_key }, place_labels: [], x: 24, y: 22, width: 45, height: 34, rotation: 1, z_index: 1, created_at: '', updated_at: '' },
    ],
  }
  world.value = {
    person: { id: 'offline-person', display_name: '我的世界书' },
    collections: [collection],
    recent_events: events,
    entities: ['南岸步道', '旧街咖啡馆', '明信片', '返程车票', '夏天'],
    narratives: [],
    graph_nodes: [
      { id: 'person', label: '我', type: 'person', weight: 8 },
      { id: 'place', label: '湖边', type: 'place', weight: 5 },
      { id: 'event', label: '落日散步', type: 'event', weight: 5 },
      { id: 'cafe', label: '咖啡馆', type: 'place', weight: 4 },
      { id: 'postcard', label: '明信片', type: 'entity', weight: 4 },
    ],
    graph_edges: [
      { source: 'person', target: 'event', label: '经历' },
      { source: 'event', target: 'place', label: '发生在' },
      { source: 'event', target: 'cafe', label: '次日' },
      { source: 'cafe', target: 'postcard', label: '写下' },
    ],
  }
}
function applyUiPreferences(value: Record<string, string | number | boolean> = {}) {
  editorSide.value = value.editor_side === 'right' ? 'right' : 'left'
  editorWidth.value = clamp(Number(value.editor_width) || 330, 290, 520)
  editorHeight.value = clamp(Number(value.editor_height) || 620, 420, 820)
}
function uiPreferences() {
  return {
    editor_side: editorSide.value,
    editor_width: editorWidth.value,
    editor_height: editorHeight.value,
  }
}
async function persistUiPreferences() {
  const preferences = uiPreferences()
  if (isOffline.value) {
    localStorage.setItem('chronicle-ui-preferences', JSON.stringify(preferences))
    if (profile.value) profile.value.ui_preferences = preferences
    return
  }
  if (!profile.value) return
  profile.value = await $fetch<Profile>(api('/v1/profile'), {
    method: 'PUT',
    headers: authHeaders(),
    body: {
      display_name: profile.value.display_name,
      avatar_url: profile.value.avatar_url || null,
      privacy_mode: profile.value.privacy_mode,
      ui_preferences: preferences,
    },
  })
}
function toggleEditorSide() {
  editorSide.value = editorSide.value === 'left' ? 'right' : 'left'
  persistUiPreferences()
}
function closeFloatingEditor(event: PointerEvent) {
  const target = event.target as HTMLElement
  if (!selectedBlock.value || target.closest('.editor-float,.memory-block,.card-reel')) return
  selectedBlock.value = undefined
}
function handleFullscreenChange() {
  isImmersive.value = Boolean(document.fullscreenElement)
}
async function initialize() {
  if (isOffline.value) {
    loadOfflineDemo()
    const saved = localStorage.getItem('chronicle-ui-preferences')
    if (saved) {
      try { applyUiPreferences(JSON.parse(saved)) } catch { /* keep safe defaults */ }
    }
    notice.value = '这是离线设计预览；连接后端并登录后才会同步私人数据。'
    return
  }
  if (!token.value) return
  try {
    await loadIdentity()
  } catch {
    performLogout('登录已过期，请重新登录。')
  }
}
onMounted(() => {
  if (!token.value && demoEmail && demoPassword) {
    authEmail.value = demoEmail
    authPassword.value = demoPassword
    notice.value = '公开体验账号已填入。点击登录即可试用真实后端，注册入口仍可创建自己的账户。'
  }
  initialize()
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('pointerdown', closeFloatingEditor)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('pointerdown', closeFloatingEditor)
  Object.values(mediaUrls).filter(url => url.startsWith('blob:')).forEach(url => URL.revokeObjectURL(url))
})

function performLogout(messageText = '已安全退出。') {
  Object.values(mediaUrls).forEach(url => URL.revokeObjectURL(url))
  Object.keys(mediaUrls).forEach(key => delete mediaUrls[key])
  token.value = ''
  currentUser.value = undefined
  personId.value = ''
  collections.value = []
  detail.value = undefined
  world.value = undefined
  showProfileMenu.value = false
  confirmLogout.value = false
  if (import.meta.client) localStorage.removeItem('chronicle-user-token')
  notice.value = messageText
}
async function authenticate() {
  if (!authEmail.value || !authPassword.value) {
    notice.value = '请填写邮箱和密码。'
    return
  }
  busy.value = true
  try {
    if (authMode.value === 'register') {
      await $fetch(api('/v1/auth/register'), { method: 'POST', body: { email: authEmail.value, password: authPassword.value, display_name: authName.value || null } })
    }
    const body = new URLSearchParams()
    body.set('username', authEmail.value.trim())
    body.set('password', authPassword.value)
    const login = await $fetch<{ access_token: string }>(api('/v1/auth/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    token.value = login.access_token
    localStorage.setItem('chronicle-user-token', token.value)
    authPassword.value = ''
    await loadIdentity()
  } catch (error: any) {
    const code = Number(error?.statusCode || error?.status || error?.response?.status || 0)
    if (code === 409) {
      authMode.value = 'login'
      notice.value = '该邮箱已经注册，已切换到登录模式。'
    } else if (code === 401) notice.value = '邮箱或密码不正确。'
    else if (code === 422) notice.value = '注册信息不符合要求，密码至少需要 8 位。'
    else notice.value = connectionFailureMessage(error)
  } finally {
    busy.value = false
  }
}
async function createCollection() {
  const title = newCollectionTitle.value.trim()
  if (!title) return
  busy.value = true
  try {
    if (isOffline.value) {
      const collection: Collection = { id: `offline-${Date.now()}`, person_id: 'offline-person', title, description: '可交互离线样例合集', accent: 'lavender', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      collections.value = [collection, ...collections.value]
      const pageKey = `free:${Date.now()}`
      detail.value = {
        ...collection,
        pages: [
          { id: `${collection.id}-cover`, page_key: 'cover', page_type: 'cover', title, order_index: 0, style: { theme: 'linen', border: 'album' } },
          { id: `${collection.id}-page`, page_key: pageKey, page_type: 'free', title: '第一页', order_index: 10, style: { theme: 'grid', border: 'classic' } },
          { id: `${collection.id}-back`, page_key: 'back', page_type: 'back', title: '写在最后', order_index: 10000, style: { theme: 'minimal', border: 'postcard' } },
        ],
        blocks: [], events: [], open_questions: [],
      }
      selectedCollectionId.value = collection.id
      selectedPageKey.value = pageKey
      newCollectionTitle.value = ''
      notice.value = '离线样例合集已创建；连接后端后才会长期同步。'
      return
    }
    const collection = await $fetch<Collection>(api(`/v1/people/${personId.value}/collections`), {
      method: 'POST',
      headers: authHeaders(),
      body: { title, accent: 'lavender' },
    })
    collections.value = [collection, ...collections.value]
    newCollectionTitle.value = ''
    await selectCollection(collection.id)
  } finally {
    busy.value = false
  }
}
async function createPage() {
  const title = newPageTitle.value.trim()
  if (!title || !selectedCollectionId.value) return
  if (isOffline.value && detail.value) {
    const page: Page = { id: `offline-page-${Date.now()}`, page_key: `free:${Date.now()}`, page_type: 'free', title, order_index: Math.max(...pages.value.map(item => item.order_index), 0) + 10, style: { theme: 'linen', border: 'classic' } }
    detail.value.pages.push(page)
    selectedPageKey.value = page.page_key
    newPageTitle.value = ''
    showPageCreator.value = false
    notice.value = '已创建一张可独立编排的离线样例页。'
    return
  }
  const page = await $fetch<Page>(api(`/v1/collections/${selectedCollectionId.value}/pages`), {
    method: 'POST',
    headers: authHeaders(),
    body: { title, page_type: 'free', theme: 'linen', border: 'classic' },
  })
  if (detail.value) detail.value.pages.push(page)
  selectedPageKey.value = page.page_key
  newPageTitle.value = ''
  showPageCreator.value = false
}
async function updatePageStyle(key: 'theme' | 'border', value: string) {
  if (!currentPage.value) return
  if (isOffline.value) {
    currentPage.value.style = { ...currentPage.value.style, [key]: value }
    notice.value = '样式已应用到当前离线样例页。'
    return
  }
  const updated = await $fetch<Page>(api(`/v1/collections/${selectedCollectionId.value}/pages/${currentPage.value.id}`), {
    method: 'PATCH',
    headers: authHeaders(),
    body: { [key]: value },
  })
  if (!detail.value) return
  const index = detail.value.pages.findIndex(page => page.id === updated.id)
  if (index >= 0) detail.value.pages[index] = updated
}
async function enrichMetadata() {
  if (!message.value.trim() || !selectedCollectionId.value) {
    notice.value = '先写下内容，AI 才能只从这段话里提取线索。'
    return
  }
  busy.value = true
  try {
    const result = await $fetch<{ occurred_at?: string; place_label?: string; mood?: string; title_hint?: string; explanation: string }>(api(`/v1/collections/${selectedCollectionId.value}/interpret`), {
      method: 'POST',
      headers: authHeaders(),
      body: { content: message.value, occurred_at: occurredAt.value || null, place_label: placeLabel.value || null, mood: mood.value || null },
    })
    occurredAt.value = result.occurred_at || occurredAt.value
    placeLabel.value = result.place_label || placeLabel.value
    mood.value = result.mood || mood.value
    titleHint.value = result.title_hint || titleHint.value
    notice.value = result.explanation
  } catch {
    notice.value = 'AI 暂时无法补齐线索，原始文字不会受到影响。'
  } finally {
    busy.value = false
  }
}
async function previewMemorySegments() {
  if (isOffline.value || !personId.value) {
    notice.value = '连接后端并登录后，才能确认多日叙述的时间线分段。'
    return
  }
  if (!message.value.trim()) {
    notice.value = '先写下一段可能跨越多天的叙述。'
    return
  }
  busy.value = true
  try {
    segmentPreview.value = await $fetch<MemorySegmentPreview[]>(api(`/v1/people/${personId.value}/memory/segment-preview`), {
      method: 'POST',
      headers: authHeaders(),
      body: { content: message.value, base_label: occurredAt.value || null },
    })
    segmentSelection.value = segmentPreview.value.map(() => true)
    showSegmentConfirm.value = true
    notice.value = segmentPreview.value.length ? '请检查原文区间，再确认写入时间线。' : '没有识别到明确日期，原文暂不自动拆分。'
  } catch {
    notice.value = '分段预览失败，原始文字没有被修改。'
  } finally {
    busy.value = false
  }
}
async function confirmMemorySegments() {
  const indexes = segmentSelection.value.map((selected, index) => selected ? index : -1).filter(index => index >= 0)
  if (!indexes.length || !personId.value) {
    notice.value = '至少选择一个原文片段。'
    return
  }
  busy.value = true
  try {
    const result = await $fetch<{ segment_count: number }>(api(`/v1/people/${personId.value}/memory/segments/confirm`), {
      method: 'POST',
      headers: authHeaders(),
      body: { content: message.value, base_label: occurredAt.value || null, segment_indexes: indexes },
    })
    showSegmentConfirm.value = false
    segmentPreview.value = []
    segmentSelection.value = []
    const timeline = await $fetch<EventItem[]>(api(`/v1/people/${personId.value}/timeline`), { headers: authHeaders() })
    if (detail.value) detail.value.events = timeline
    await refreshWorld()
    notice.value = `已确认 ${result.segment_count} 个时间线片段；原始叙述仍作为一份证据保存。`
  } catch (error: any) {
    notice.value = error?.data?.detail || '确认失败，原始文字仍然安全保留。'
  } finally {
    busy.value = false
  }
}
async function publishComposition() {
  if ((!message.value.trim() && !stagedMedia.value.length) || !selectedCollectionId.value) {
    notice.value = '写下一句话、选择照片，或两者一起投放。'
    return
  }
  busy.value = true
  try {
    if (isOffline.value && detail.value) {
      const targetPage = selectedPageKey.value || 'undated'
      if (message.value.trim()) {
        const layout = layoutFor(0, 'note')
        detail.value.blocks.push({
          id: `offline-note-${Date.now()}`, collection_id: selectedCollectionId.value, kind: 'note',
          title: titleHint.value || message.value.trim().slice(0, 18), body: message.value.trim(), emoji: stickerChoice.value,
          mood: mood.value, tags: ['离线新建'], style: { page_key: targetPage }, place_labels: placeLabel.value ? [placeLabel.value] : [],
          ...layout, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        })
      }
      stagedMedia.value.forEach((staged, index) => {
        const layout = layoutFor(index)
        const key = `offline-upload-${Date.now()}-${index}`
        mediaUrls[key] = staged.url
        detail.value!.blocks.push({
          id: key, collection_id: selectedCollectionId.value, kind: 'image',
          title: photoCaption.value || staged.name, body: message.value || '在浏览器里临时预览这张照片。',
          emoji: '◌', mood: mood.value, tags: ['刚刚上传'], style: { page_key: targetPage, text_position: 'bottom', frame: layoutPreset.value },
          media_url: key, place_labels: placeLabel.value ? [placeLabel.value] : [], ...layout,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        })
      })
      selectedPageKey.value = targetPage
      stagedMedia.value = []
      message.value = ''
      mood.value = ''
      occurredAt.value = ''
      placeLabel.value = ''
      titleHint.value = ''
      photoCaption.value = ''
      showComposer.value = false
      notice.value = '内容已加入离线可交互样例；刷新页面会恢复预置展台。'
      return
    }
    let anchorEventId = ''
    const targetPage = selectedPageKey.value || 'undated'
    if (message.value.trim()) {
      const entry = await $fetch<{ event?: { id: string } }>(api(`/v1/collections/${selectedCollectionId.value}/entries`), {
        method: 'POST',
        headers: authHeaders(),
        body: {
          content: message.value,
          mood: mood.value || null,
          occurred_at: occurredAt.value || null,
          place_label: placeLabel.value || null,
          title_hint: titleHint.value || null,
          emoji_hint: stickerChoice.value || null,
          style: { page_key: targetPage },
          ...layoutFor(0, 'note'),
        },
      })
      anchorEventId = entry.event?.id || ''
    }
    for (const [index, staged] of stagedMedia.value.entries()) {
      const form = new FormData()
      const layout = layoutFor(index)
      form.append('file', staged.file)
      form.append('caption', photoCaption.value || message.value || staged.name)
      form.append('mood', mood.value)
      form.append('occurred_at', occurredAt.value)
      form.append('place_label', placeLabel.value)
      Object.entries(layout).forEach(([key, value]) => form.append(key, String(value)))
      form.append('style_json', JSON.stringify({ frame: layoutPreset.value, staged_count: String(stagedMedia.value.length), page_key: targetPage, text_position: 'bottom' }))
      if (anchorEventId) form.append('event_id', anchorEventId)
      await $fetch(api(`/v1/collections/${selectedCollectionId.value}/media`), { method: 'POST', headers: authHeaders(), body: form })
    }
    await selectCollection(selectedCollectionId.value)
    selectedPageKey.value = targetPage
    clearComposer()
    showComposer.value = false
    notice.value = '图文已经一起上墙。每一页拥有自己的布局，不会混到其他日期。'
  } catch {
    notice.value = '保存失败，请检查登录状态或稍后重试私域服务。'
  } finally {
    busy.value = false
  }
}
function openPhotoPicker() { fileInput.value?.click() }
function stagePhotos(event: Event) {
  const files = [...((event.target as HTMLInputElement).files || [])].slice(0, 6)
  stagedMedia.value.push(...files.map(file => ({ file, url: URL.createObjectURL(file), name: file.name })))
  if (fileInput.value) fileInput.value.value = ''
}
function removeStagedMedia(index: number) {
  const [item] = stagedMedia.value.splice(index, 1)
  if (item) URL.revokeObjectURL(item.url)
}
function clearComposer() {
  stagedMedia.value.forEach(item => URL.revokeObjectURL(item.url))
  stagedMedia.value = []
  message.value = ''
  mood.value = ''
  occurredAt.value = ''
  placeLabel.value = ''
  titleHint.value = ''
  photoCaption.value = ''
}
async function addSticker() {
  // A selected emoji belongs to the next text/photo by default. Creating a
  // second visual object only makes sense when the composer is otherwise empty.
  if (message.value.trim() || stagedMedia.value.length) {
    notice.value = `已选 ${stickerChoice.value}，会附在这次图文上墙，不会额外生成第二张贴纸。`
    return
  }
  if (!selectedCollectionId.value) return
  busy.value = true
  try {
    if (isOffline.value && detail.value) {
      detail.value.blocks.push({
        id: `offline-sticker-${Date.now()}`, collection_id: selectedCollectionId.value, kind: 'sticker',
        title: titleHint.value || '新贴纸', body: message.value.trim() || '拖动我，为这一页加一个小注脚。',
        emoji: stickerChoice.value, mood: mood.value, tags: ['贴纸'], style: { page_key: selectedPageKey.value },
        place_labels: [], ...layoutFor(allBlocks.value.length, 'note'), created_at: '', updated_at: '',
      })
      notice.value = '贴纸已加入离线样例画布。'
      return
    }
    await $fetch(api(`/v1/collections/${selectedCollectionId.value}/entries`), {
      method: 'POST',
      headers: authHeaders(),
      body: {
        content: message.value.trim() || '留下一枚贴纸',
        title_hint: message.value.trim() ? titleHint.value || null : '贴纸',
        emoji_hint: stickerChoice.value,
        block_kind: 'sticker',
        mood: mood.value || null,
        occurred_at: occurredAt.value || null,
        place_label: placeLabel.value || null,
        style: { sticker: 'openmoji-compatible', page_key: selectedPageKey.value },
        ...layoutFor(allBlocks.value.length, 'note'),
      },
    })
    await selectCollection(selectedCollectionId.value)
    notice.value = '贴纸已加入当前页面。'
  } finally {
    busy.value = false
  }
}
function beginDrag(block: Block, event: PointerEvent) {
  if ((event.target as HTMLElement).closest('button,input,textarea,select,.resize-handle')) return
  contextMenu.value = undefined
  dragging.value = { id: block.id, startX: event.clientX, startY: event.clientY, x: block.x, y: block.y }
}
function beginResize(block: Block, event: PointerEvent) {
  resizing.value = { id: block.id, startX: event.clientX, startY: event.clientY, width: block.width, height: block.height }
}
function movePointer(event: PointerEvent) {
  if (panning.value) {
    panX.value = panning.value.x + event.clientX - panning.value.startX
    panY.value = panning.value.y + event.clientY - panning.value.startY
    return
  }
  if (!wall.value) return
  const rect = wall.value.getBoundingClientRect()
  if (dragging.value) {
    const block = allBlocks.value.find(item => item.id === dragging.value?.id)
    if (block) {
      block.x = clamp(dragging.value.x + ((event.clientX - dragging.value.startX) / rect.width) * 100, 0, 92)
      block.y = clamp(dragging.value.y + ((event.clientY - dragging.value.startY) / rect.height) * 100, 0, 90)
    }
  }
  if (resizing.value) {
    const block = allBlocks.value.find(item => item.id === resizing.value?.id)
    if (block) {
      block.width = clamp(resizing.value.width + ((event.clientX - resizing.value.startX) / rect.width) * 100, 18, 90)
      block.height = clamp(resizing.value.height + ((event.clientY - resizing.value.startY) / rect.height) * 100, 16, 90)
    }
  }
}
async function endPointer() {
  const activeDrag = dragging.value
  const activeResize = resizing.value
  dragging.value = undefined
  resizing.value = undefined
  panning.value = undefined
  if (activeDrag) {
    const block = allBlocks.value.find(item => item.id === activeDrag.id)
    if (block) await patchBlock(block, { x: block.x, y: block.y })
  }
  if (activeResize) {
    const block = allBlocks.value.find(item => item.id === activeResize.id)
    if (block) await patchBlock(block, { width: block.width, height: block.height })
  }
}
async function patchBlock(block: Block, changes: Record<string, unknown>) {
  if (isOffline.value) {
    const index = allBlocks.value.findIndex(item => item.id === block.id)
    if (index >= 0 && detail.value) {
      const current = detail.value.blocks[index]!
      Object.assign(current, changes)
      if (changes.style) current.style = { ...(changes.style as Record<string, string>) }
      if (selectedBlock.value?.id === current.id) selectedBlock.value = { ...current, style: { ...current.style } }
    }
    return
  }
  try {
    const updated = await $fetch<Block>(api(`/v1/collections/${block.collection_id}/blocks/${block.id}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: changes,
    })
    const index = allBlocks.value.findIndex(item => item.id === block.id)
    if (index >= 0 && detail.value) detail.value.blocks[index] = updated
    if (selectedBlock.value?.id === updated.id) selectedBlock.value = { ...updated, style: { ...updated.style } }
  } catch {
    notice.value = '卡片修改未同步，请稍后重试。'
  }
}
function openBlock(block: Block) {
  selectedBlock.value = { ...block, style: { ...block.style } }
  contextMenu.value = undefined
  showChat.value = false
  showProfileMenu.value = false
}
function beginReelDrag(block: Block) {
  reelDragBlockId.value = block.id
}
async function dropReelBlock(event: DragEvent) {
  if (!wall.value || !reelDragBlockId.value) return
  const block = allBlocks.value.find(item => item.id === reelDragBlockId.value)
  reelDragBlockId.value = ''
  if (!block) return
  const rect = wall.value.getBoundingClientRect()
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100 - block.width / 2, 0, 100 - block.width)
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100 - block.height / 2, 0, 100 - block.height)
  await patchBlock(block, { x, y, style: { ...block.style, hidden: 'false' } })
  notice.value = '卡片已从胶片栏放回当前画布。'
}
function openPreview(block: Block) {
  previewScale.value = 1
  previewBlock.value = block
}
async function saveBlock() {
  if (!selectedBlock.value) return
  await patchBlock(selectedBlock.value, {
    title: selectedBlock.value.title,
    body: selectedBlock.value.body,
    mood: selectedBlock.value.mood,
    emoji: selectedBlock.value.emoji,
    rotation: selectedBlock.value.rotation,
    width: selectedBlock.value.width,
    height: selectedBlock.value.height,
    style: selectedBlock.value.style,
  })
  notice.value = '卡片已保存，画布位置与展示方式同步完成。'
}
async function toggleBlockHidden(block: Block, hidden: boolean) {
  const style = { ...block.style, hidden: hidden ? 'true' : 'false' }
  await patchBlock(block, { style })
  if (hidden) selectedBlock.value = undefined
}
async function openNarrativeForEvent(event: EventItem) {
  narrativePerspective.value = 'event'
  narrativeEventId.value = event.id
  narrativeInstruction.value = `围绕“${event.title}”整理，保留来源中的不确定处，并写出完整的起因、经过与当时细节。`
  showNarrativeWorkbench.value = true
  activeView.value = 'world'
  await nextTick()
  narrativeWorkbench.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  notice.value = `已选择事件“${event.title}”，现在可以补充写作重点并生成真实草稿。`
}
async function createNarrative() {
  if (!selectedCollectionId.value) return
  busy.value = true
  try {
    if (isOffline.value && world.value) {
      const event = timelineEvents.value.find(item => item.id === narrativeEventId.value) || timelineEvents.value[0]
      const narrative: Narrative = {
        id: `offline-narrative-${Date.now()}`,
        perspective: narrativePerspective.value,
        title: event ? `${event.title}：一页可继续修改的旅行叙事` : '夏日周末的片段',
        content: event
          ? `${event.start_label || '时间待补'}，${event.narrative}\n\n${narrativeInstruction.value || '这份草稿只使用展台中可见的事件与照片说明，并保留可以继续补充的细节。'}`
          : '这是一份离线可编辑叙事样例。',
        source_ids: ['offline-source'],
        status: 'draft',
        created_at: new Date().toISOString(),
      }
      world.value.narratives.unshift(narrative)
      showNarrativeWorkbench.value = false
      editNarrative(narrative)
      notice.value = '离线叙事草稿已生成，可以立即编辑和保存。'
      return
    }
    const narrative = await $fetch<Narrative>(api(`/v1/collections/${selectedCollectionId.value}/narratives`), {
      method: 'POST',
      headers: authHeaders(),
      body: { perspective: narrativePerspective.value, event_id: narrativeEventId.value || null, instruction: narrativeInstruction.value || null },
    })
    await refreshWorld()
    showNarrativeWorkbench.value = false
    narrativeInstruction.value = ''
    editNarrative(narrative)
    notice.value = `已生成“${narrative.title}”。它进入可编辑草稿区，不会覆盖事件或原始材料。`
  } catch {
    notice.value = 'AI 整理失败，请先检查个人 AI 配置。'
  } finally {
    busy.value = false
  }
}
function editNarrative(narrative: Narrative) {
  editingNarrativeId.value = narrative.id
  narrativeEdit.title = narrative.title
  narrativeEdit.content = narrative.content
  narrativeEdit.status = narrative.status
}
async function saveNarrative() {
  if (!editingNarrativeId.value) return
  if (isOffline.value && world.value) {
    const narrative = world.value.narratives.find(item => item.id === editingNarrativeId.value)
    if (narrative) Object.assign(narrative, narrativeEdit)
    editingNarrativeId.value = ''
    notice.value = '离线叙事草稿已更新。'
    return
  }
  const updated = await $fetch<Narrative>(api(`/v1/narratives/${editingNarrativeId.value}`), {
    method: 'PATCH',
    headers: authHeaders(),
    body: { title: narrativeEdit.title, content: narrativeEdit.content, status: narrativeEdit.status },
  })
  if (world.value) {
    const index = world.value.narratives.findIndex(item => item.id === updated.id)
    if (index >= 0) world.value.narratives[index] = updated
  }
  editingNarrativeId.value = ''
  notice.value = '叙事草稿已经保存。'
}
async function sendCopilot() {
  if (!chatMessage.value.trim() || !selectedCollectionId.value) return
  const text = chatMessage.value.trim()
  chatMessages.value.push({ role: 'user', text })
  chatMessage.value = ''
  busy.value = true
  try {
    if (isOffline.value) {
      chatMessages.value.push({
        role: 'ai',
        text: '从这页已有的湖边散步、咖啡馆和返程车票来看，可以补一张“风停下来之后”的细节卡，写下当时同行的人或你最后舍不得离开的画面。',
        suggested: '离开湖边前，我最后记住的是……',
        memory: [{ title: '湖边落日散步', excerpt: '天空变暗前的最后一段橙色', matched_by: ['当前页面', '地点', '时间'] }],
      })
      return
    }
    const answer = await $fetch<{ reply: string; suggested_prompt?: string; memory_context?: CopilotContext[] }>(api(`/v1/collections/${selectedCollectionId.value}/copilot`), {
      method: 'POST',
      headers: authHeaders(),
      body: { message: text },
    })
    chatMessages.value.push({ role: 'ai', text: answer.reply, suggested: answer.suggested_prompt, memory: answer.memory_context })
  } catch {
    chatMessages.value.push({ role: 'ai', text: '我暂时无法连接模型。你可以在“记忆引擎 → AI 配置”里检查自己的模型地址与密钥。' })
  } finally {
    busy.value = false
  }
}
function useSuggestion(value?: string) {
  if (!value) return
  message.value = value
  showChat.value = false
  showComposer.value = true
}
async function loadMemoryCoach() {
  if (!selectedCollectionId.value || isOffline.value) return
  try {
    coach.value = await $fetch<Coach>(api(`/v1/collections/${selectedCollectionId.value}/memory-coach`), { headers: authHeaders() })
  } catch {
    coach.value = undefined
  }
}
function useCoachSuggestion(suggestion: CoachSuggestion) {
  showComposer.value = true
  if (suggestion.action === 'photo') notice.value = '先选择照片，再把它和文字一起放进当前页。'
  else message.value = `${message.value ? `${message.value}\n` : ''}${suggestion.question}`
}
async function searchMemory() {
  if (!searchQuery.value.trim()) return
  if (isOffline.value) {
    const query = searchQuery.value.trim()
    searchHits.value = allBlocks.value
      .filter(block => `${block.title}${block.body}${block.tags.join('')}${block.place_labels.join('')}`.includes(query) || query.length <= 2)
      .slice(0, 6)
      .map(block => ({ title: block.title || '未命名记忆', excerpt: block.body, matched_by: ['离线样例', '当前合集'], rank_components: { keyword: .82, evidence: 1 } }))
    if (!searchHits.value.length) searchHits.value = [{ title: '湖边落日散步', excerpt: '试试搜索“湖边”“咖啡”“明信片”或“返程”。', matched_by: ['搜索建议'], rank_components: { keyword: .2 } }]
    return
  }
  searchHits.value = await $fetch(api(`/v1/people/${personId.value}/memory/search`), {
    method: 'POST',
    headers: authHeaders(),
    body: { query: searchQuery.value, collection_id: selectedCollectionId.value || null },
  })
}
async function reindexMemory() {
  if (!personId.value) return
  if (isOffline.value) {
    notice.value = `离线展台已载入 ${allBlocks.value.length} 枚示例记忆；连接后端后可重建真实向量索引。`
    return
  }
  busy.value = true
  try {
    const result = await $fetch<{ indexed: number; updated: number; unchanged: number; embedding_model: string }>(api(`/v1/people/${personId.value}/memory/reindex`), { method: 'POST', headers: authHeaders() })
    notice.value = `索引完成：新增 ${result.indexed}，更新 ${result.updated}，未变化 ${result.unchanged}（${result.embedding_model}）。`
  } finally {
    busy.value = false
  }
}
async function refreshWorld() {
  if (personId.value) world.value = await $fetch<WorldBook>(api(`/v1/people/${personId.value}/world-book`), { headers: authHeaders() })
}
function providerChanged() {
  const defaults: Record<AIProfile['provider'], [string, string]> = {
    deepseek: ['https://api.deepseek.com', 'deepseek-chat'],
    openai: ['https://api.openai.com/v1', 'gpt-4.1-mini'],
    openrouter: ['https://openrouter.ai/api/v1', 'openai/gpt-4.1-mini'],
    custom: ['', ''],
  }
  const [base, model] = defaults[aiProfile.value.provider]
  aiProfile.value.base_url = base
  aiProfile.value.model = model
}
async function saveAIProfile() {
  busy.value = true
  try {
    if (isOffline.value) {
      aiProfile.value.has_api_key = Boolean(aiKeyInput.value) || aiProfile.value.has_api_key
      aiProfile.value.preferences = preferenceInput.value.split(/[，,\n]/).map(value => value.trim()).filter(Boolean)
      aiKeyInput.value = ''
      notice.value = '离线展台已模拟保存配置；不会上传或持久保存密钥。'
      return
    }
    aiProfile.value = await $fetch<AIProfile>(api('/v1/ai-profile'), {
      method: 'PUT',
      headers: authHeaders(),
      body: {
        provider: aiProfile.value.provider,
        base_url: aiProfile.value.base_url,
        model: aiProfile.value.model,
        api_key: aiKeyInput.value || null,
        persona: aiProfile.value.persona,
        preferences: preferenceInput.value.split(/[，,\n]/).map(value => value.trim()).filter(Boolean),
      },
    })
    aiKeyInput.value = ''
    preferenceInput.value = aiProfile.value.preferences.join('，')
    notice.value = '个人 AI 配置已加密保存。共创、检索扩展与叙事会使用这套设置。'
  } catch (error: any) {
    notice.value = error?.data?.detail || 'AI 配置保存失败。'
  } finally {
    busy.value = false
  }
}
async function testAIProfile() {
  busy.value = true
  try {
    if (isOffline.value) {
      notice.value = '离线展台的交互链路正常；真实模型连通性需要连接你的后端。'
      return
    }
    const result = await $fetch<{ message: string; model: string }>(api('/v1/ai-profile/test'), { method: 'POST', headers: authHeaders() })
    notice.value = `${result.message}，当前模型：${result.model}`
  } catch (error: any) {
    notice.value = error?.data?.detail || '模型连接测试失败。'
  } finally {
    busy.value = false
  }
}
async function saveProfile() {
  if (!profile.value) return
  if (isOffline.value) {
    profile.value.ui_preferences = uiPreferences()
    localStorage.setItem('chronicle-ui-preferences', JSON.stringify(profile.value.ui_preferences))
    notice.value = '离线界面偏好已保存在这台设备。'
    return
  }
  profile.value = await $fetch<Profile>(api('/v1/profile'), {
    method: 'PUT',
    headers: authHeaders(),
    body: { display_name: profile.value.display_name, avatar_url: profile.value.avatar_url || null, privacy_mode: profile.value.privacy_mode, ui_preferences: uiPreferences() },
  })
  notice.value = '个人资料已保存。'
}
async function toggleFullscreen() {
  if (!wallStage.value) return
  if (document.fullscreenElement) await document.exitFullscreen()
  else await wallStage.value.requestFullscreen()
}
async function renderCurrentPage() {
  if (!wall.value) throw new Error('wall unavailable')
  return html2canvas(wall.value, { scale: 3, backgroundColor: '#fbf8f0', useCORS: true })
}
async function exportWall() {
  busy.value = true
  try {
    const canvas = await renderCurrentPage()
    const link = document.createElement('a')
    link.download = `${selectedCollection.value?.title || '我的手账'}-${currentPage.value?.title || '页面'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    notice.value = '当前页已导出为高清图片。'
  } catch {
    notice.value = '导出失败，请等待图片加载完成后重试。'
  } finally {
    busy.value = false
  }
}
async function shareWall() {
  if (activeView.value !== 'wall') {
    activeView.value = 'wall'
    return
  }
  busy.value = true
  try {
    const canvas = await renderCurrentPage()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error()
    const file = new File([blob], `${selectedCollection.value?.title || '手账'}.png`, { type: 'image/png' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: selectedCollection.value?.title, text: currentPage.value?.title, files: [file] })
      notice.value = '分享面板已经打开。'
    } else {
      await exportWall()
    }
  } catch {
    notice.value = '分享取消或生成失败。'
  } finally {
    busy.value = false
  }
}
function goToSettings(tab: SettingsTab) {
  settingsTab.value = tab
  activeView.value = 'settings'
  showProfileMenu.value = false
}
function scrollWorld(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <main v-if="needsAuth" class="auth-shell">
    <section class="auth-story">
      <div class="auth-brand"><span>CM</span><div><small>CHRONICLE MEMORY</small><strong>把生活编成一本会生长的书</strong></div></div>
      <div class="folio-preview">
        <div class="folio-orbit orbit-one"/>
        <div class="folio-orbit orbit-two"/>
        <article class="preview-photo"><div class="fake-sky"/><span>07 / 18</span><strong>风把湖面吹成了碎金</strong></article>
        <article class="preview-note"><span>🌇</span><p>走到长椅旁时，天刚好从橙色变成蓝紫色。</p></article>
        <article class="preview-ticket"><small>PRIVATE SCRAPBOOK</small><b>只属于你的记忆</b></article>
      </div>
      <div class="auth-points"><span>原始材料可追溯</span><span>照片墙自由编排</span><span>AI 只基于你的证据</span></div>
    </section>

    <section class="auth-panel">
      <div class="auth-mode"><button :class="{active:authMode==='login'}" @click="authMode='login'">登录</button><button :class="{active:authMode==='register'}" @click="authMode='register'">创建空间</button></div>
      <p class="eyebrow">YOUR PRIVATE WORLD BOOK</p>
      <h1>{{ authMode === 'login' ? '欢迎回到你的手账' : '从今天开始收藏人生' }}</h1>
      <p class="auth-copy">{{ authMode === 'login' ? '继续整理照片、片段与还没有讲完的故事。' : '注册后，每一张照片和文字都会明确归属于你的账户。' }}</p>
      <label v-if="authMode==='register'">昵称<input v-model="authName" autocomplete="name" placeholder="想让手账怎样称呼你"></label>
      <label>邮箱<input v-model="authEmail" type="email" autocomplete="email" placeholder="name@example.com"></label>
      <label>密码<input v-model="authPassword" type="password" :autocomplete="authMode==='login'?'current-password':'new-password'" placeholder="至少 8 位"></label>
      <button class="auth-submit" :disabled="busy" @click="authenticate"><span>{{ busy ? '正在连接…' : authMode === 'login' ? '进入我的世界书' : '创建私人记忆空间' }}</span><b>↗</b></button>
      <div class="private-backend-badge"><span>PRIVATE BACKEND</span><small>{{ isOffline ? 'GitHub 展示模式 · 不同步私人数据' : '已绑定 Chronicle Memory 私域服务' }}</small></div>
      <p class="auth-notice">{{ notice }}</p>
    </section>
  </main>

  <div v-else class="application">
    <header class="global-header">
      <button class="global-brand" @click="activeView='wall'">
        <span>{{ (profile?.display_name || currentUser?.display_name || 'MY').slice(0, 2).toUpperCase() }}</span>
        <div><small>CHRONICLE MEMORY</small><strong>{{ selectedCollection?.title || personName }}</strong></div>
      </button>
      <nav class="global-nav" aria-label="主导航">
        <button :class="{active:activeView==='wall'}" @click="activeView='wall'"><i>▦</i><span>手账</span></button>
        <button :class="{active:activeView==='timeline'}" @click="activeView='timeline'"><i>◷</i><span>事件</span></button>
        <button :class="{active:activeView==='world'}" @click="activeView='world'"><i>✦</i><span>世界书</span></button>
        <button :class="{active:activeView==='settings'}" @click="goToSettings('search')"><i>⌕</i><span>记忆引擎</span></button>
      </nav>
      <div class="header-actions">
        <button class="share-action" :disabled="busy" @click="shareWall"><span>↗</span><b>{{ activeView==='wall'?'分享当前页':'回到手账' }}</b></button>
        <button class="user-action" :aria-expanded="showProfileMenu" @click="showProfileMenu=!showProfileMenu">
          <span>{{ (currentUser?.display_name || '我').slice(0, 1) }}</span>
          <div><strong>{{ currentUser?.display_name }}</strong><small>{{ currentUser?.email }}</small></div>
          <b>⌄</b>
        </button>
      </div>
      <Transition name="menu">
        <aside v-if="showProfileMenu" class="profile-menu">
          <header><span>{{ (currentUser?.display_name || '我').slice(0, 1) }}</span><div><strong>{{ currentUser?.display_name }}</strong><small>{{ currentUser?.role === 'super_admin' ? '超级管理员' : currentUser?.role === 'admin' ? '管理员' : currentUser?.role === 'operator' ? '运营员' : '成员' }}</small></div></header>
          <button @click="goToSettings('profile')"><span>◎</span><div><strong>个人中心</strong><small>资料、隐私与账户</small></div></button>
          <button @click="goToSettings('ai')"><span>✦</span><div><strong>个人 AI</strong><small>{{ aiProfile.has_api_key ? `${aiProfile.provider} · 已连接` : '尚未配置模型' }}</small></div></button>
          <button class="danger-link" @click="confirmLogout=true;showProfileMenu=false"><span>⇥</span><div><strong>退出登录</strong><small>仅退出当前账户</small></div></button>
        </aside>
      </Transition>
    </header>

    <main class="app-shell">
      <section v-if="activeView==='wall'" class="wall-view">
        <div class="collection-bar">
          <div class="collection-list">
            <button v-for="collection in collections" :key="collection.id" :class="{active:selectedCollectionId===collection.id}" @click="selectCollection(collection.id)">
              <span :class="`accent-${collection.accent}`"/>{{ collection.title }}
            </button>
          </div>
          <form class="new-collection" @submit.prevent="createCollection">
            <input v-model="newCollectionTitle" placeholder="新建合集">
            <button type="submit">＋</button>
          </form>
        </div>

        <section class="page-heading">
          <div><p class="eyebrow">PRIVATE SCRAPBOOK · {{ selectedCollection?.accent || 'linen' }}</p><h1>{{ selectedCollection?.title || '我的手账' }}</h1><p>{{ selectedCollection?.description || '把照片、文字与那些容易消失的细节留在这里。' }}</p></div>
          <div class="page-heading-actions">
            <button class="ghost-action" @click="showChat=true"><span>✦</span>和记忆共创</button>
            <button class="primary-action" @click="showComposer=true"><span>＋</span>新建记忆</button>
          </div>
        </section>

        <section class="coach-ribbon">
          <div><small>MEMORY COACH</small><strong>{{ coach?.summary || '从这一页继续补一枚真实细节' }}</strong></div>
          <button v-for="suggestion in (coach?.suggestions || questions.map(item=>({question:item.question,rationale:item.rationale,action:'write' as const}))).slice(0,3)" :key="suggestion.question" @click="useCoachSuggestion(suggestion)">
            <span>{{ suggestion.action==='photo'?'▧':suggestion.action==='time'?'◷':'✦' }}</span>
            <div><strong>{{ suggestion.question }}</strong><small>{{ suggestion.rationale }}</small></div>
          </button>
          <button class="coach-create" @click="showComposer=true">＋ 接着记录</button>
        </section>

        <Transition name="reveal">
          <section v-if="showComposer" class="composer">
            <header><div><small>STAGING DESK</small><h2>先准备，再一起上墙</h2></div><button @click="showComposer=false">×</button></header>
            <textarea v-model="message" rows="4" placeholder="写下这一刻，或一次讲完几天的旅行。AI 会把时间线拆开，但不会替你编造。"/>
            <div class="composer-meta">
              <label>心情<select v-model="mood"><option value="">暂不标记</option><option>开心</option><option>松弛</option><option>想念</option><option>疲惫</option><option>治愈</option><option>雀跃</option></select></label>
              <label>发生日期<input v-model="occurredAt" type="date"></label>
              <label>发生在哪<input v-model="placeLabel" placeholder="地点会进入事件关系"></label>
              <label>投放页面<select v-model="selectedPageKey"><option v-for="page in pages" :key="page.id" :value="page.page_key">{{ page.title }}</option></select></label>
            </div>
            <div class="assistant-strip"><button @click="parseRelativeDate">◷ 解析今天 / 昨天</button><button :disabled="busy" @click="enrichMetadata">✦ AI 只补填写线索</button><button class="segment-action" :disabled="busy" @click="previewMemorySegments">⌁ 预览时间线分段</button><span>{{ titleHint ? `建议标题：${titleHint}` : '手动填写与 AI 提取相互独立' }}</span></div>
            <Transition name="reveal">
              <section v-if="showSegmentConfirm" class="segment-confirm-panel">
                <header><div><small>SEGMENT REVIEW</small><strong>确认多日叙述如何进入时间线</strong></div><button @click="showSegmentConfirm=false">×</button></header>
                <p>只展示原文区间，不替你补写事件。确认后会保留整段原始材料，并把选中的片段写成待审核事件。</p>
                <label v-for="(segment,index) in segmentPreview" :key="segment.segment_key" class="segment-option">
                  <input v-model="segmentSelection[index]" type="checkbox">
                  <span><b>{{ segment.start_label || '时间待确认' }}</b><small>{{ segment.text }}</small></span>
                  <em>{{ Math.round(segment.confidence * 100) }}%</em>
                </label>
                <footer><button class="soft-action" @click="showSegmentConfirm=false">稍后确认</button><button class="primary-action" :disabled="busy" @click="confirmMemorySegments">确认写入时间线</button></footer>
              </section>
            </Transition>
            <div class="media-staging">
              <div><strong>照片预备区</strong><small>最多 6 张，确认布局后再和文字一起提交</small></div>
              <button @click="openPhotoPicker">▧ 选择照片</button>
              <input ref="fileInput" hidden type="file" accept="image/*" multiple @change="stagePhotos">
              <input v-model="photoCaption" placeholder="给整组照片一句说明">
              <div class="layout-pills"><button v-for="preset in ['free','grid2','grid3','polaroid']" :key="preset" :class="{active:layoutPreset===preset}" @click="layoutPreset=preset as any">{{ {free:'自由',grid2:'四宫格',grid3:'六宫格',polaroid:'拍立得'}[preset] }}</button></div>
              <div v-if="stagedMedia.length" class="staged-list"><figure v-for="(item,index) in stagedMedia" :key="item.url"><img :src="item.url" :alt="item.name"><button @click="removeStagedMedia(index)">×</button></figure></div>
            </div>
            <div class="sticker-strip"><span>贴纸</span><button v-for="symbol in ['✨','🌿','🎫','📍','🌊','☕','🎧','🧸']" :key="symbol" :class="{active:stickerChoice===symbol}" @click="stickerChoice=symbol">{{ symbol }}</button><button class="soft-action" @click="addSticker">加入当前页</button></div>
            <footer><button class="soft-action" @click="clearComposer">清空预备区</button><button class="primary-action" :disabled="busy" @click="publishComposition">{{ busy ? '正在整理并保存…' : '图文一起上墙' }} <span>↗</span></button></footer>
          </section>
        </Transition>

        <section class="page-deck">
          <div class="page-tabs">
            <button :class="{active:pageOverview}" @click="pageOverview=true;selectedBlock=undefined"><span>▦</span>页面总览</button>
            <button v-for="(page,index) in pages" :key="page.id" :class="{active:!pageOverview&&selectedPageKey===page.page_key}" @click="selectPage(page.page_key)">
              <small>{{ page.page_type==='cover'?'封面':page.page_type==='back'?'尾页':String(index).padStart(2,'0') }}</small>
              <span>{{ page.title }}</span>
              <b>{{ pageCount(page.page_key) }}</b>
            </button>
            <button class="add-page" @click="showPageCreator=!showPageCreator">＋</button>
          </div>
          <div v-if="showPageCreator" class="page-creator"><input v-model="newPageTitle" placeholder="例如：旅途中的一天"><button @click="createPage">创建独立页</button></div>
          <div v-if="!pageOverview && currentPage" class="page-stylebar">
            <span>第 {{ pageIndex + 1 }} / {{ pages.length }} 页</span>
            <label>纸张<select :value="currentPage.style.theme" @change="updatePageStyle('theme', ($event.target as HTMLSelectElement).value)"><option value="linen">亚麻纸</option><option value="film">胶片黑</option><option value="floral">花页</option><option value="grid">方格纸</option><option value="minimal">留白</option></select></label>
            <label>页框<select :value="currentPage.style.border" @change="updatePageStyle('border', ($event.target as HTMLSelectElement).value)"><option value="classic">经典</option><option value="postcard">明信片</option><option value="album">相册</option><option value="none">无边框</option></select></label>
            <span v-if="hiddenPageBlocks.length" class="hidden-count">已隐藏 {{ hiddenPageBlocks.length }} 枚 · 在下方胶片栏恢复</span>
            <button @click="toggleFullscreen">⌗ 沉浸观看</button>
            <button @click="exportWall">⇩ 导出高清图</button>
          </div>
        </section>

        <section v-if="pageOverview" class="page-overview">
          <button v-for="(page,index) in pages" :key="page.id" @click="selectPage(page.page_key)">
            <div :class="['page-thumb',`theme-${page.style.theme}`,`border-${page.style.border}`]"><span>{{ page.page_type==='cover'?'COVER':page.page_type==='back'?'THE END':String(index).padStart(2,'0') }}</span><strong>{{ page.title }}</strong><small>{{ pageCount(page.page_key) }} 枚记忆</small></div>
          </button>
        </section>

        <section v-else ref="wallStage" class="wall-stage">
          <div class="immersive-toolbar"><div><small>{{ selectedCollection?.title }}</small><strong>{{ currentPage?.title }}</strong></div><span>第 {{ pageIndex + 1 }} / {{ pages.length }} 页</span><button @click="toggleFullscreen">退出沉浸</button></div>
          <div class="zoom-controls"><button @click="setZoom(zoom-.1)">−</button><span>{{ Math.round(zoom*100) }}%</span><button @click="setZoom(zoom+.1)">＋</button><button v-if="zoom!==1||panX||panY" @click="resetCanvasView">适合</button><small>普通滚轮阅读页面 · Ctrl/⌘＋滚轮缩放 · Shift＋拖动或中键平移</small></div>
          <div ref="wallViewport" class="wall-viewport" :class="{pannable:zoom>1,panning:Boolean(panning)}" @wheel="handleCanvasWheel" @pointerdown="beginCanvasPan" @pointermove="movePointer" @pointerup="endPointer" @pointerleave="endPointer">
            <button v-if="pages.length>1" class="page-turn previous" aria-label="上一页" @click="turnPage(-1)"><span>‹</span><small>上一页</small></button>
            <Transition name="sheet" mode="out-in">
              <section
                :key="selectedPageKey"
                ref="wall"
                :class="['memory-wall',`theme-${currentPage?.style.theme||'linen'}`,`border-${currentPage?.style.border||'classic'}`]"
                :style="{transform:`translate3d(${panX}px,${panY}px,0) scale(${zoom})`}"
                @dragover.prevent
                @drop.prevent="dropReelBlock"
                @click="closeCanvasOverlays"
                @contextmenu.prevent="contextMenu=undefined"
              >
                <div v-if="currentPage?.page_type==='cover'" class="page-chapter cover-page"><small>PRIVATE SCRAPBOOK</small><h2>{{ selectedCollection?.title }}</h2><p>{{ selectedCollection?.description || '一本只属于你的记忆手账' }}</p><span>{{ new Date(selectedCollection?.created_at || Date.now()).getFullYear() }}</span></div>
                <div v-else-if="currentPage?.page_type==='back'" class="page-chapter back-page"><span>✦</span><h2>{{ currentPage.title }}</h2><p>故事还会继续，下一次打开时仍可以从任意一页补充。</p></div>
                <div v-if="!visiblePageBlocks.length && currentPage?.page_type==='day'" class="wall-empty"><span>✦</span><h2>这一页还在等第一枚记忆</h2><p>新建一段文字、选择照片，或让共创助手从旧记忆里找到线索。</p><button class="primary-action" @click="showComposer=true">＋ 新建记忆</button></div>
                <article
                  v-for="block in visiblePageBlocks"
                  :key="block.id"
                  :class="['memory-block',`kind-${block.kind}`,`text-${textPosition(block)}`,`frame-${block.style?.frame||'free'}`,{selected:selectedBlock?.id===block.id,dragging:dragging?.id===block.id,resizing:resizing?.id===block.id}]"
                  :style="{left:`${block.x}%`,top:`${block.y}%`,width:`${block.width}%`,height:`${block.height}%`,transform:`rotate(${block.rotation}deg)`,zIndex:block.z_index,'--card-scale':cardScale(block)}"
                  @pointerdown="beginDrag(block,$event)"
                  @click.stop="openBlock(block)"
                  @contextmenu.prevent.stop="openBlockMenu(block,$event)"
                >
                  <div v-if="block.kind==='image' && mediaUrl(block.media_url)" class="block-media" :style="{filter:block.style?.filter||'none'}" @dblclick.stop="openPreview(block)"><img :src="mediaUrl(block.media_url)" :alt="block.title||'记忆照片'"></div>
                  <div v-else-if="block.kind==='image'" class="block-media media-placeholder"><span>{{ block.emoji || '▧' }}</span><small>图片正在载入</small></div>
                  <div class="block-content">
                    <div class="block-content-inner">
                      <div class="block-kicker"><span>{{ block.emoji || (block.kind==='image'?'◌':'✦') }}</span><small v-if="block.mood">{{ block.mood }}</small></div>
                      <h3>{{ block.title || '未命名便签' }}</h3>
                      <p>{{ block.ai_note || block.body }}</p>
                      <div class="chips"><span v-for="place in block.place_labels" :key="place">⌖ {{ place }}</span><span v-for="tag in block.tags" :key="tag">#{{ tag }}</span></div>
                    </div>
                  </div>
                  <button class="resize-handle" aria-label="调整卡片大小" @pointerdown.stop="beginResize(block,$event)">↘</button>
                </article>
              </section>
            </Transition>
            <button v-if="pages.length>1" class="page-turn next" aria-label="下一页" @click="turnPage(1)"><span>›</span><small>下一页</small></button>
          </div>
        </section>

        <section v-if="!pageOverview && currentPageBlocks.length" class="card-reel" aria-label="当前页卡片管理">
          <header><div><small>PAGE OBJECTS</small><strong>当前页的卡片胶片</strong></div><span>拖到画布即可恢复和重新摆放</span></header>
          <div class="reel-track">
            <article v-for="block in currentPageBlocks" :key="block.id" :class="{hidden:block.style?.hidden==='true',active:selectedBlock?.id===block.id}" draggable="true" @dragstart="beginReelDrag(block)" @click="block.style?.hidden==='true' ? toggleBlockHidden(block,false) : openBlock(block)">
              <div class="reel-preview"><img v-if="block.kind==='image'&&mediaUrl(block.media_url)" :src="mediaUrl(block.media_url)" :alt="block.title"><span v-else>{{ block.emoji||'✦' }}</span></div>
              <div><strong>{{ block.title||'未命名卡片' }}</strong><small>{{ block.style?.hidden==='true'?'已隐藏 · 点击恢复':`${Math.round(block.width)}×${Math.round(block.height)} · ${block.rotation}°` }}</small></div>
              <button :aria-label="block.style?.hidden==='true'?'恢复卡片':'隐藏卡片'" @click.stop="toggleBlockHidden(block,block.style?.hidden!=='true')">{{ block.style?.hidden==='true'?'◉':'◌' }}</button>
            </article>
          </div>
        </section>

        <p class="notice">{{ notice }}</p>
      </section>

      <section v-else-if="activeView==='timeline'" class="content-view timeline-view">
        <header class="section-heading"><div><p class="eyebrow">EVENT MEMORY</p><h1>事件与时间</h1><p>事件负责客观归档，叙事草稿负责可修改的表达。每一步都能回到原始来源。</p></div><button v-if="timelineEvents.length" class="ghost-action" @click="scrollWorld('timeline-list')">选择一个事件写叙事 ↓</button></header>
        <div id="timeline-list">
          <section v-for="group in timelineGroups" :key="group.label" class="timeline-group">
            <div class="timeline-date"><span>{{ group.label }}</span><b>{{ group.events.length }} 个事件</b></div>
            <article v-for="event in group.events" :key="event.id" class="event-card">
              <div class="event-time">{{ event.start_label || '时间待补' }}</div>
              <div><small>来源可追溯 · {{ event.status }}</small><h2>{{ event.title }}</h2><p>{{ event.narrative }}</p><blockquote v-for="quote in event.evidence" :key="quote">{{ quote }}</blockquote><footer><button @click="openNarrativeForEvent(event)">✦ 以此事件生成草稿</button><button @click="selectedCollectionId && (activeView='wall')">↗ 回到手账页</button></footer></div>
            </article>
          </section>
          <div v-if="!timelineGroups.length" class="empty-state"><span>◷</span><h2>还没有可以归档的事件</h2><p>从手账中新建文字或照片后，系统会保留来源并整理到这里。</p></div>
        </div>
      </section>

      <section v-else-if="activeView==='world'" class="content-view world-view">
        <header class="section-heading"><div><p class="eyebrow">WORLD BOOK</p><h1>我的世界书</h1><p>跨合集查看世界线、人物地点与可修改叙事。这里不会把时间线重复抄一遍。</p></div><button class="primary-action" @click="showNarrativeWorkbench=!showNarrativeWorkbench">✦ 打开叙事工作台</button></header>
        <div class="world-shell">
          <aside class="world-line">
            <small>YOUR WORLD LINE</small>
            <button @click="scrollWorld('world-overview')"><span>01</span><div><strong>世界概览</strong><small>{{ world?.collections.length || 0 }} 个合集</small></div></button>
            <button @click="scrollWorld('world-entities')"><span>02</span><div><strong>反复出现</strong><small>{{ world?.entities.length || 0 }} 个实体</small></div></button>
            <button @click="scrollWorld('world-narratives')"><span>03</span><div><strong>叙事草稿</strong><small>{{ world?.narratives.length || 0 }} 份可编辑</small></div></button>
            <div class="world-event-links"><button v-for="event in (world?.recent_events||[]).slice(0,6)" :key="event.id" @click="openNarrativeForEvent(event)"><i/>{{ event.title }}<small>{{ event.start_label || '时间待补' }}</small></button></div>
          </aside>
          <div class="world-content">
            <section v-if="showNarrativeWorkbench" ref="narrativeWorkbench" class="narrative-workbench">
              <header><div><small>NARRATIVE WORKBENCH</small><h2>确定范围，再让 AI 整理</h2><p>原始材料不会被覆盖，生成结果进入下方可编辑草稿。</p></div><button @click="showNarrativeWorkbench=false">×</button></header>
              <div class="workbench-fields">
                <label>叙事视角<select v-model="narrativePerspective"><option value="daily">一个日期片段</option><option value="event">一个具体事件</option><option value="stage">一段阶段经历</option><option value="world">跨合集人物画像</option></select></label>
                <label v-if="narrativePerspective==='event'">选择事件<select v-model="narrativeEventId"><option value="">请选择事件</option><option v-for="event in timelineEvents" :key="event.id" :value="event.id">{{ event.start_label || '时间待补' }} · {{ event.title }}</option></select></label>
                <label class="instruction">本次重点<textarea v-model="narrativeInstruction" rows="4" placeholder="例如：整理这次旅行从抵达到返程的变化，保留仍不确定的地方。"/></label>
              </div>
              <footer><span>AI 会同时读取个人偏好与召回证据，但不能替你补造事实。</span><button class="primary-action" :disabled="busy||(narrativePerspective==='event'&&!narrativeEventId)" @click="createNarrative">{{ busy?'正在整理证据…':'生成可修改草稿' }}</button></footer>
            </section>
            <section id="world-overview" class="world-section"><header><div><small>01 · COLLECTIONS</small><h2>我的合集</h2></div></header><div class="collection-cards"><button v-for="collection in world?.collections||collections" :key="collection.id" @click="selectCollection(collection.id);activeView='wall'"><span :class="`accent-${collection.accent}`"/><div><strong>{{ collection.title }}</strong><small>{{ collection.description || '打开这本手账' }}</small></div><b>↗</b></button></div></section>
            <section id="world-entities" class="world-section"><header><div><small>02 · RECURRING ENTITIES</small><h2>反复出现的人、地点与事物</h2></div><button @click="goToSettings('graph')">查看知识图谱 ↗</button></header><div class="entity-cloud"><span v-for="entity in world?.entities||[]" :key="entity">{{ entity }}</span><p v-if="!world?.entities.length">继续记录后，跨事件连接会逐渐显现。</p></div></section>
            <section id="world-narratives" class="world-section"><header><div><small>03 · EDITABLE NARRATIVES</small><h2>可管理的叙事草稿</h2></div></header><article v-for="narrative in world?.narratives||[]" :key="narrative.id" class="narrative-card">
              <template v-if="editingNarrativeId!==narrative.id"><div class="narrative-meta"><span>{{ narrative.perspective }}</span><span>{{ narrative.status }}</span><span>{{ narrative.source_ids.length }} 条来源</span></div><h3>{{ narrative.title }}</h3><p>{{ narrative.content }}</p><footer><button @click="editNarrative(narrative)">编辑与审核</button></footer></template>
              <template v-else><div class="narrative-edit"><label>标题<input v-model="narrativeEdit.title"></label><label>正文<textarea v-model="narrativeEdit.content" rows="10"/></label><label>状态<select v-model="narrativeEdit.status"><option value="draft">草稿</option><option value="reviewed">已复核</option><option value="approved">已确认</option></select></label><footer><button class="soft-action" @click="editingNarrativeId=''">取消</button><button class="primary-action" @click="saveNarrative">保存草稿</button></footer></div></template>
            </article><div v-if="!world?.narratives.length" class="empty-state compact"><h3>选择具体事件、日期或阶段后再生成</h3><p>这样每一份草稿都有明确范围，也便于二次修改。</p></div></section>
          </div>
        </div>
      </section>

      <section v-else class="content-view engine-view">
        <header class="section-heading"><div><p class="eyebrow">MEMORY ENGINE</p><h1>记忆引擎</h1><p>配置自己的模型、检索证据、维护人物设定，并在知识图谱中理解生活里的连接。</p></div></header>
        <nav class="engine-tabs"><button :class="{active:settingsTab==='search'}" @click="settingsTab='search'">⌕ 记忆检索</button><button :class="{active:settingsTab==='ai'}" @click="settingsTab='ai'">✦ AI 配置</button><button :class="{active:settingsTab==='graph'}" @click="settingsTab='graph'">⌘ 知识图谱</button><button :class="{active:settingsTab==='groups'}" @click="settingsTab='groups'">♧ 家庭组</button><button :class="{active:settingsTab==='profile'}" @click="settingsTab='profile'">◎ 个人中心</button></nav>

        <section v-if="settingsTab==='search'" class="engine-panel search-panel">
          <div class="engine-intro"><small>HYBRID RETRIEVAL</small><h2>问问你的记忆</h2><p>向量、关键词、时间与实体共同召回，再用 MMR 保留不同来源的片段。</p></div>
          <div class="search-box"><span>⌕</span><input v-model="searchQuery" placeholder="输入人物、地点、时间或一种模糊感觉" @keydown.enter="searchMemory"><button @click="searchMemory">检索</button></div>
          <div class="index-actions"><span>检索只返回属于当前账户的证据</span><button :disabled="busy" @click="reindexMemory">重建向量索引</button></div>
          <div class="search-results"><article v-for="hit in searchHits" :key="`${hit.title}-${hit.excerpt}`"><header><span v-for="reason in hit.matched_by" :key="reason">{{ reason }}</span><small v-if="hit.rank_components">语义 {{ Math.round((hit.rank_components.vector||0)*100) }}% · MMR #{{ hit.rank_components.mmr_rank||'—' }}</small></header><h3>{{ hit.title }}</h3><p>{{ hit.excerpt }}</p></article><div v-if="!searchHits.length" class="empty-state compact"><h3>还没有开始检索</h3><p>可以尝试“去年夏天的海边”“和某个人一起吃饭”等自然说法。</p></div></div>
        </section>

        <section v-else-if="settingsTab==='ai'" class="engine-panel ai-panel">
          <div class="engine-intro"><small>PERSONAL MODEL ROUTER</small><h2>使用你自己的 AI</h2><p>密钥只发送到本地后端并加密保存，页面不会再次读取完整密钥。</p></div>
          <div class="ai-status"><span :class="{on:aiProfile.has_api_key}"/><div><strong>{{ aiProfile.has_api_key ? '个人模型已连接' : '尚未保存 API Key' }}</strong><small>{{ aiProfile.provider }} · {{ aiProfile.model }} {{ aiProfile.key_hint || '' }}</small></div></div>
          <div class="form-grid">
            <label>厂商<select v-model="aiProfile.provider" @change="providerChanged"><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option><option value="openrouter">OpenRouter</option><option value="custom">自定义兼容接口</option></select></label>
            <label>模型<input v-model="aiProfile.model" placeholder="模型名称"></label>
            <label class="wide">API Base<input v-model="aiProfile.base_url" placeholder="https://api.example.com/v1"></label>
            <label class="wide">API Key<input v-model="aiKeyInput" type="password" :placeholder="aiProfile.has_api_key?'留空则保留现有密钥':'输入个人密钥'"></label>
            <label class="wide">我希望 AI 怎样理解我<textarea v-model="aiProfile.persona" rows="5" placeholder="写下你愿意主动告诉 AI 的身份、生活阶段、表达习惯。它不会被当成事件事实。"/></label>
            <label class="wide">偏好标签<textarea v-model="preferenceInput" rows="3" placeholder="摄影，慢旅行，不喜欢夸张文案，偏爱简洁排版"/></label>
          </div>
          <footer><button class="soft-action" :disabled="busy||!aiProfile.has_api_key" @click="testAIProfile">测试已保存连接</button><button class="primary-action" :disabled="busy" @click="saveAIProfile">加密保存配置</button></footer>
        </section>

        <section v-else-if="settingsTab==='graph'" class="engine-panel graph-panel">
          <div class="engine-intro"><small>PERSONAL KNOWLEDGE GRAPH</small><h2>生活中的连接</h2><p>节点来自可追溯事件与实体。它帮助你理解反复出现的关系，不替你推断性格。</p></div>
          <div class="graph-legend"><span><i class="person"/>自己</span><span><i class="event"/>事件</span><span><i class="place"/>地点与实体</span><span><i class="collection"/>合集</span></div>
          <div class="graph-canvas">
            <svg viewBox="0 0 1000 560" role="img" aria-label="个人记忆知识图谱">
              <line v-for="(edge,index) in graphLayout.edges" :key="index" :x1="graphLayout.positions[edge.source]?.x" :y1="graphLayout.positions[edge.source]?.y" :x2="graphLayout.positions[edge.target]?.x" :y2="graphLayout.positions[edge.target]?.y"/>
              <g v-for="node in graphLayout.nodes" :key="node.id" :transform="`translate(${graphLayout.positions[node.id]?.x||0} ${graphLayout.positions[node.id]?.y||0})`" :class="`node-${node.type}`">
                <circle :r="18+node.weight*2"/>
                <text text-anchor="middle" y="4">{{ node.label.slice(0, 8) }}</text>
              </g>
            </svg>
            <div v-if="!graphLayout.nodes.length" class="empty-state"><h3>知识图谱还没有节点</h3><p>新增几段包含人物、地点或作品的记忆后再来看。</p></div>
          </div>
        </section>

        <section v-else-if="settingsTab==='groups'" class="engine-panel groups-panel">
          <div class="engine-intro"><small>FAMILY MEMORY GROUPS</small><h2>把记忆交给可信的人</h2><p>家庭组共享的是明确的记忆空间边界。成员权限可以随时撤销，撤销后立即失去共享空间的媒体、检索与导出权限。</p></div>
          <div class="groups-create form-grid">
            <label>家庭组名称<input v-model="groupNameInput" placeholder="例如：我们家的相册"></label>
            <label>描述<input v-model="groupDescriptionInput" placeholder="共享范围和使用约定"></label>
            <button class="primary-action" :disabled="busy" @click="createGroup">创建家庭组</button>
          </div>
          <div v-if="!groups.length" class="empty-state compact"><h3>{{ isOffline ? '离线展台已保留家庭组入口' : '还没有家庭组' }}</h3><p>{{ isOffline ? '连接私域后即可创建家庭组、邀请成员并共享当前记忆空间。' : '创建后可以按邮箱邀请家人或朋友。' }}</p></div>
          <div v-else class="groups-layout">
            <aside class="group-list"><button v-for="group in groups" :key="group.id" :class="{active:selectedGroupId===group.id}" @click="selectGroup(group.id)"><strong>{{ group.name }}</strong><small>{{ group.member_count }} 位成员 · {{ group.people_count }} 个记忆空间</small></button></aside>
            <div class="group-detail" v-if="groups.find(group => group.id === selectedGroupId)">
              <header><div><small>GROUP ACCESS</small><h3>{{ groups.find(group => group.id === selectedGroupId)?.name }}</h3></div><span>共享范围可撤销</span></header>
              <div class="group-invite form-grid"><input v-model="memberEmailInput" type="email" placeholder="对方注册邮箱"><select v-model="memberRoleInput"><option value="viewer">查看者</option><option value="editor">编辑者</option><option value="admin">组管理员</option></select><button class="primary-action" :disabled="busy" @click="addGroupMember">保存成员权限</button></div>
              <div class="group-section"><h4>成员</h4><article v-for="member in groupMembers" :key="member.id"><div><strong>{{ member.display_name }}</strong><small>{{ member.email }} · {{ member.role }}</small></div><button v-if="member.user_id!==currentUser?.id" class="soft-action" @click="removeGroupMember(member)">撤销</button></article></div>
              <div class="group-section"><header><h4>共享记忆空间</h4><button class="soft-action" @click="shareCurrentPerson">共享当前空间</button></header><article v-for="person in groupPeople" :key="person.id"><span>{{ person.display_name }}</span><button class="soft-action" @click="revokeGroupPerson(person)">撤销共享</button></article><p v-if="!groupPeople.length" class="muted">尚未共享任何记忆空间。</p></div>
            </div>
          </div>
        </section>

        <section v-else class="engine-panel profile-panel">
          <div class="engine-intro"><small>PERSONAL SPACE</small><h2>个人中心</h2><p>管理显示名称、隐私方式和账户操作。</p></div>
          <div class="profile-layout">
            <div class="profile-avatar">{{ (profile?.display_name||currentUser?.display_name||'我').slice(0,1) }}</div>
            <div class="profile-fields">
              <label>空间名称<input v-if="profile" v-model="profile.display_name"></label>
              <label>隐私策略<select v-if="profile" v-model="profile.privacy_mode"><option value="local_first">本地优先</option><option value="cloud_opt_in">主动选择云同步</option></select></label>
              <button class="primary-action" @click="saveProfile">保存个人资料</button>
            </div>
          </div>
          <div class="connection-card"><div><small>PRIVATE BACKEND</small><strong>{{ isOffline ? 'GitHub 展示模式' : '已绑定私域服务' }}</strong><p>所有登录、记忆与 AI 请求固定走 Chronicle Memory 私域后端。</p></div></div>
          <div class="danger-zone"><div><strong>退出当前账户</strong><p>退出不会删除数据库中的照片、手账或模型配置。</p></div><button @click="confirmLogout=true">退出登录</button></div>
        </section>
        <p class="notice">{{ notice }}</p>
      </section>
    </main>

    <aside v-if="selectedBlock" :class="['editor-float',editorSide]" :style="{width:`${editorWidth}px`,height:`min(${editorHeight}px, calc(100vh - 125px))`}" @pointerdown.stop>
      <header><div><small>LIVE CANVAS EDITOR</small><strong>在画布旁修改</strong></div><div class="dock-controls"><button :title="editorSide==='left'?'固定到右侧':'固定到左侧'" @click="toggleEditorSide">⇄</button><button @click="selectedBlock=undefined">×</button></div></header>
      <label>标题<input v-model="selectedBlock.title" placeholder="具体、可检索的标题"></label>
      <label>正文<textarea v-model="selectedBlock.body" rows="5"/></label>
      <div class="editor-two"><label>心情<input v-model="selectedBlock.mood"></label><label>表情<input v-model="selectedBlock.emoji" maxlength="8"></label></div>
      <label v-if="selectedBlock.kind==='image'">文字位置<select v-model="selectedBlock.style.text_position"><option value="bottom">图片下方</option><option value="top">图片上方</option><option value="left">图片左侧</option><option value="right">图片右侧</option><option value="overlay">叠在图片上</option><option value="hidden">隐藏文字</option></select></label>
      <div v-if="selectedBlock.kind==='image'" class="editor-two"><label>图片效果<select v-model="selectedBlock.style.filter"><option value="none">自然</option><option value="saturate(1.25) contrast(1.06)">鲜明</option><option value="sepia(.38) saturate(1.12)">暖胶片</option><option value="grayscale(1) contrast(1.08)">黑白</option><option value="brightness(1.08) contrast(.9)">柔雾</option></select></label><label>图片操作<button class="soft-action compact-action" @click="openReplacePicker">替换图片</button></label></div>
      <input ref="replaceFileInput" class="visually-hidden" type="file" accept="image/*" @change="replaceBlockMedia">
      <details class="editor-preferences"><summary>编辑面板大小与停靠</summary><label>面板宽度<input v-model.number="editorWidth" type="range" min="290" max="520" @change="persistUiPreferences"><span>{{ editorWidth }}px</span></label><label>面板高度<input v-model.number="editorHeight" type="range" min="420" max="820" @change="persistUiPreferences"><span>{{ editorHeight }}px</span></label><small>这项设置对所有卡片生效，并随当前账号保存。</small></details>
      <footer><button v-if="selectedBlock.media_url" class="soft-action" @click="openPreview(selectedBlock)">放大原图</button><button class="soft-action" @click="rotateBlock(selectedBlock,5)">旋转 5°</button><button class="danger-action" @click="deleteBlock(selectedBlock)">移除卡片</button><button class="primary-action" @click="saveBlock">保存修改</button></footer>
    </aside>

    <aside v-if="contextMenu" class="canvas-context-menu" :style="{left:`${contextMenu.x}px`,top:`${contextMenu.y}px`}" @pointerdown.stop>
      <strong>{{ contextMenu.block.title || '这张卡片' }}</strong>
      <button @click="openBlock(contextMenu!.block)">编辑卡片</button><button @click="raiseBlock(contextMenu!.block)">置于最前</button>
      <div><button @click="rotateBlock(contextMenu!.block,-5)">↶ 旋转</button><button @click="rotateBlock(contextMenu!.block,5)">↷ 旋转</button></div>
      <button @click="toggleBlockHidden(contextMenu!.block,contextMenu!.block.style?.hidden!=='true');contextMenu=undefined">{{ contextMenu.block.style?.hidden==='true'?'恢复到本页':'暂时隐藏' }}</button>
      <button class="menu-danger" @click="deleteBlock(contextMenu!.block)">移除卡片</button>
    </aside>

    <section v-if="previewBlock" class="overlay preview-overlay" @click.self="previewBlock=undefined">
      <article><header><div><small>ORIGINAL IMAGE</small><h2>{{ previewBlock.title }}</h2></div><button @click="previewBlock=undefined">×</button></header><div class="preview-tools"><button @click="previewScale=clamp(previewScale-.25,.5,4)">−</button><span>{{ Math.round(previewScale*100) }}%</span><button @click="previewScale=clamp(previewScale+.25,.5,4)">＋</button><button @click="previewScale=1">适合窗口</button></div><div class="image-zoom-surface"><img v-if="mediaUrl(previewBlock.media_url)" :style="{transform:`scale(${previewScale})`}" :src="mediaUrl(previewBlock.media_url)" :alt="previewBlock.title||'原图'"></div><p>{{ previewBlock.body }}</p></article>
    </section>

    <aside v-if="showChat" class="chat-drawer">
      <header><div><small>MEMORY COPILOT · RETRIEVAL ON</small><h2>和你的记忆一起共创</h2><p>会检索相关人物、地点、时间和过去表达。</p></div><button @click="showChat=false">×</button></header>
      <div class="chat-log"><div v-if="!chatMessages.length" class="chat-welcome"><span>✦</span><h3>想从哪段记忆继续？</h3><p>可以问“这页还缺哪一天”，也可以让 AI 找出和某个人相关的旧片段。</p><button @click="chatMessage='这本手账里还有哪些与当前页面相关的记忆？'">从当前页寻找线索</button></div><article v-for="(item,index) in chatMessages" :key="index" :class="item.role"><small>{{ item.role==='user'?'你':'记忆共创' }}</small><p>{{ item.text }}</p><details v-if="item.memory?.length"><summary>查看本次参考的 {{ item.memory.length }} 条记忆</summary><span v-for="memory in item.memory" :key="memory.title">{{ memory.title }} · {{ memory.matched_by.join(' / ') }}</span></details><button v-if="item.suggested" @click="useSuggestion(item.suggested)">＋ 放进新记忆卡</button></article></div>
      <div class="chat-input"><textarea v-model="chatMessage" rows="3" placeholder="写下问题，Ctrl + Enter 发送" @keydown.ctrl.enter="sendCopilot"/><button :disabled="busy||!chatMessage.trim()" aria-label="发送" @click="sendCopilot"><span>↑</span></button></div>
    </aside>

    <section v-if="confirmLogout" class="overlay confirm-dialog" @click.self="confirmLogout=false"><article><span>⇥</span><h2>确认退出当前账户？</h2><p>你的数据仍保留在后端。下次登录会继续同步，当前设备上的登录令牌会被清除。</p><footer><button class="soft-action" @click="confirmLogout=false">继续留在这里</button><button class="danger-action" @click="performLogout()">确认退出</button></footer></article></section>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Serif+SC:wght@500;600;700;900&family=Source+Han+Sans+SC:wght@400;500;600;700&display=swap');
.segment-action{border-color:#c6a66f!important;color:#875f32!important;background:#fff8e9!important}.segment-confirm-panel{display:grid;gap:10px;margin:10px 0;padding:14px;border:1px solid #d9c8ae;border-radius:17px;background:linear-gradient(120deg,#fffaf0,#eef5ef)}.segment-confirm-panel header{display:flex;justify-content:space-between;align-items:start}.segment-confirm-panel header small{display:block;font:.55rem 'DM Mono';letter-spacing:.12em;color:#a17045}.segment-confirm-panel header strong{display:block;margin-top:3px;font:700 .98rem 'Noto Serif SC'}.segment-confirm-panel header button{border:0;background:transparent;font-size:1.2rem;cursor:pointer}.segment-confirm-panel>p{margin:0;color:#77756b;font-size:.72rem;line-height:1.6}.segment-option{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:start;padding:9px 10px;border:1px solid #e3d8c7;border-radius:12px;background:#fffdf9;cursor:pointer}.segment-option input{margin-top:4px;accent-color:#285746}.segment-option span{min-width:0}.segment-option b,.segment-option small{display:block}.segment-option b{color:#7d603e;font-size:.72rem}.segment-option small{margin-top:3px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;color:#4f5a51;line-height:1.5}.segment-option em{color:#a17145;font:600 .65rem 'DM Mono';font-style:normal}.segment-confirm-panel footer{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}
:root{--ink:#20382f;--forest:#285746;--deep:#17392d;--paper:#fffdf8;--cream:#f5f1e8;--line:#ded2c0;--gold:#bd8750;--muted:#72776e;--shadow:0 20px 55px #24362b18;color:var(--ink);background:var(--cream);font-family:'Source Han Sans SC',sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;background:radial-gradient(circle at 3% 12%,#dcece356 0 10%,transparent 28%),radial-gradient(circle at 96% 4%,#f2d89a42 0 9%,transparent 27%),var(--cream)}button,input,textarea,select{font:inherit}button{color:inherit}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #d9b56b66;outline-offset:2px}.eyebrow{margin:0;font:500 .68rem 'DM Mono';letter-spacing:.14em;color:#9b7045}.notice{margin:14px 2px;color:#756a5b;font-size:.86rem;line-height:1.6}.primary-action,.soft-action,.ghost-action,.danger-action{border:0;border-radius:999px;padding:11px 16px;cursor:pointer;font-weight:700;transition:background .2s ease,box-shadow .2s ease,opacity .2s ease}.primary-action{background:var(--forest);color:#fff;box-shadow:0 8px 18px #183c2e28}.primary-action:hover{background:var(--deep);box-shadow:0 12px 25px #183c2e34}.soft-action{background:#efe7d8;color:#4d6458}.ghost-action{background:#ffffff80;color:#2b684f;border:1px solid #d8cbb8}.danger-action{background:#99493e;color:#fff}button:disabled{opacity:.5;cursor:not-allowed}

.auth-shell{min-height:100vh;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(430px,.92fr);background:#f7f2e8}.auth-story{position:relative;min-height:100vh;padding:54px clamp(36px,6vw,100px);overflow:hidden;background:linear-gradient(145deg,#254b3e,#17352b);color:#fff}.auth-story:before{content:'';position:absolute;inset:0;opacity:.2;background-image:linear-gradient(#ffffff12 1px,transparent 1px),linear-gradient(90deg,#ffffff12 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(to bottom,black,transparent 84%)}.auth-brand{position:relative;z-index:2;display:flex;gap:14px;align-items:center}.auth-brand>span{display:grid;place-items:center;width:48px;height:48px;border:1px solid #ffffff44;border-radius:16px;background:#ffffff10;font:500 .82rem 'DM Mono'}.auth-brand small{display:block;font:.65rem 'DM Mono';letter-spacing:.17em;color:#dbbe86}.auth-brand strong{display:block;margin-top:4px;font:600 1.02rem 'Noto Serif SC'}.folio-preview{position:relative;height:610px;margin-top:30px}.folio-orbit{position:absolute;border:1px solid #ffffff18;border-radius:50%}.orbit-one{width:520px;height:520px;left:4%;top:5%}.orbit-two{width:310px;height:310px;right:-5%;bottom:5%}.preview-photo,.preview-note,.preview-ticket{position:absolute;border:1px solid #ffffff33;box-shadow:0 28px 65px #071c1440;backdrop-filter:blur(12px)}.preview-photo{left:7%;top:12%;width:min(430px,70%);height:330px;padding:18px;border-radius:8px;background:#f8f0df;color:#21392f;transform:rotate(-4deg)}.fake-sky{height:230px;border-radius:4px;background:linear-gradient(#708e98,#e8b66c 60%,#406457)}.preview-photo span{display:block;margin-top:13px;font:.65rem 'DM Mono';color:#a16f3d}.preview-photo strong{font:700 1.2rem 'Noto Serif SC'}.preview-note{right:3%;top:42%;width:285px;padding:24px;border-radius:18px;background:#fff6d9ed;color:#31463b;transform:rotate(3deg)}.preview-note span{font-size:1.8rem}.preview-note p{font:600 1.02rem/1.75 'Noto Serif SC'}.preview-ticket{left:20%;bottom:4%;padding:14px 20px;border-radius:12px;background:#173b31dd}.preview-ticket small,.preview-ticket b{display:block}.preview-ticket small{font:.58rem 'DM Mono';letter-spacing:.12em;color:#d5bd91}.preview-ticket b{margin-top:5px;font:600 .9rem 'Noto Serif SC'}.auth-points{position:absolute;left:clamp(36px,6vw,100px);right:clamp(36px,6vw,100px);bottom:30px;display:flex;justify-content:space-between;color:#d4dfd9;font-size:.78rem}.auth-points span:before{content:'✦';margin-right:7px;color:#d8aa65}.auth-panel{align-self:center;width:min(520px,calc(100% - 50px));margin:auto;padding:45px 48px;border:1px solid #e0d5c4;border-radius:30px;background:#fffdf9;box-shadow:0 30px 80px #26372e1a;animation:panel-in .55s cubic-bezier(.2,.8,.2,1)}.auth-mode{display:flex;gap:5px;width:max-content;margin-bottom:30px;padding:4px;border-radius:999px;background:#f0e8da}.auth-mode button{border:0;border-radius:999px;padding:8px 15px;background:transparent;color:#7a7061;cursor:pointer;font-size:.82rem}.auth-mode button.active{background:#fff;color:#285746;box-shadow:0 4px 12px #40331f14}.auth-panel h1{margin:10px 0;font:700 clamp(2rem,3.2vw,3rem) 'Noto Serif SC';letter-spacing:-.06em}.auth-copy{margin:0 0 28px;color:#727970;line-height:1.8}.auth-panel label{display:grid;gap:7px;margin:14px 0;color:#5e685f;font-size:.83rem}.auth-panel input{width:100%;border:1px solid #d9cdbb;border-radius:14px;padding:13px 14px;background:#fff;color:#28362f;transition:border .2s,box-shadow .2s}.auth-panel input:focus{border-color:#6fa085;box-shadow:0 0 0 4px #76a48a18;outline:0}.auth-submit{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:20px;border:0;border-radius:15px;padding:13px 16px;background:#285746;color:#fff;cursor:pointer;font-weight:700;box-shadow:0 10px 25px #254b3d30}.auth-submit b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#ffffff18}.endpoint-toggle{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;width:100%;margin-top:22px;border:0;border-top:1px solid #e7ddce;padding:18px 0 0;background:transparent;text-align:left;cursor:pointer}.endpoint-toggle small{overflow:hidden;color:#8a8073;text-overflow:ellipsis}.endpoint-panel{display:flex;gap:7px;margin-top:10px}.endpoint-panel input{min-width:0}.endpoint-panel button{border:0;border-radius:12px;padding:0 12px;background:#eee5d5;color:#476053;white-space:nowrap;cursor:pointer}.auth-notice{min-height:42px;margin:18px 0 0;color:#7b6d5d;font-size:.8rem;line-height:1.6}.reveal-enter-active,.reveal-leave-active{transition:.26s cubic-bezier(.2,.8,.2,1)}.reveal-enter-from,.reveal-leave-to{opacity:0;transform:translateY(-8px)}

.application{min-height:100vh}.global-header{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:minmax(210px,1fr) auto minmax(260px,1fr);align-items:center;gap:24px;height:82px;padding:0 max(3vw,24px);border-bottom:1px solid #d9cdbb;background:#f8f4ecdd;backdrop-filter:blur(22px) saturate(1.2);box-shadow:0 8px 28px #2b3c3210}.global-brand{display:flex;align-items:center;gap:11px;border:0;background:transparent;text-align:left;cursor:pointer}.global-brand>span{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#284d40;color:#fff;font:600 .74rem 'DM Mono';box-shadow:0 8px 18px #18382c28}.global-brand small{display:block;font:.58rem 'DM Mono';letter-spacing:.13em;color:#a07347}.global-brand strong{display:block;max-width:260px;overflow:hidden;font:700 1rem 'Noto Serif SC';text-overflow:ellipsis;white-space:nowrap}.global-nav{display:flex;gap:3px;padding:5px;border:1px solid #d8cebd;border-radius:16px;background:#fffdf9b8;box-shadow:0 8px 20px #26372f0e}.global-nav button{display:flex;gap:6px;align-items:center;border:0;border-radius:11px;padding:9px 13px;background:transparent;color:#6e766e;cursor:pointer;font-size:.78rem}.global-nav button.active{background:#285244;color:#fff;box-shadow:0 5px 13px #173b2e2c}.global-nav i{font-style:normal}.header-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px}.share-action{display:flex;gap:7px;align-items:center;border:1px solid #d8c9b5;border-radius:999px;padding:8px 12px;background:#fffdf9;color:#32624f;cursor:pointer}.share-action span{font-size:1.1rem}.share-action b{font-size:.75rem}.user-action{display:flex;gap:9px;align-items:center;border:0;border-radius:15px;padding:5px 8px 5px 5px;background:transparent;text-align:left;cursor:pointer}.user-action>span{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:#e6efe7;color:#285746;font:700 1rem 'Noto Serif SC'}.user-action div{max-width:160px}.user-action strong,.user-action small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.user-action strong{font-size:.8rem}.user-action small{font-size:.62rem;color:#8a847a}.profile-menu{position:absolute;right:max(3vw,24px);top:70px;width:290px;padding:12px;border:1px solid #dbcfbd;border-radius:20px;background:#fffdf9;box-shadow:0 25px 65px #1c30263a}.profile-menu header{display:flex;gap:10px;align-items:center;padding:9px 8px 14px;border-bottom:1px solid #e6ddcf}.profile-menu header>span{display:grid;place-items:center;width:40px;height:40px;border-radius:13px;background:#285244;color:#fff;font:700 1.1rem 'Noto Serif SC'}.profile-menu header strong,.profile-menu header small{display:block}.profile-menu header small{color:#8b8173}.profile-menu>button{display:flex;gap:12px;width:100%;margin-top:5px;border:0;border-radius:12px;padding:10px;background:transparent;text-align:left;cursor:pointer}.profile-menu>button:hover{background:#f3eee4}.profile-menu>button>span{font-size:1.1rem;color:#356452}.profile-menu>button strong,.profile-menu>button small{display:block}.profile-menu>button strong{font-size:.84rem}.profile-menu>button small{margin-top:2px;color:#8a8174;font-size:.7rem}.profile-menu .danger-link{color:#924d42}.menu-enter-active,.menu-leave-active{transition:.2s ease}.menu-enter-from,.menu-leave-to{opacity:0;transform:translateY(-6px) scale(.98)}

.app-shell{width:min(1480px,94vw);margin:auto;padding:34px 0 80px}.collection-bar{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:28px}.collection-list{display:flex;gap:8px;overflow:auto;scrollbar-width:none}.collection-list button{display:flex;gap:8px;align-items:center;border:1px solid #dccfbd;border-radius:999px;padding:9px 14px;background:#fffdf8;color:#625d54;white-space:nowrap;cursor:pointer}.collection-list button.active{border-color:#285244;background:#285244;color:#fff;box-shadow:0 8px 18px #1e3d3125}.collection-list button>span,.collection-cards button>span{width:7px;height:7px;border-radius:50%;background:#e1aa54}.accent-ocean{background:#73b5bd!important}.accent-lavender{background:#a798c9!important}.new-collection{display:flex;flex:0 0 210px;border:1px dashed #cbb99f;border-radius:999px;padding:3px;background:#fffdf8}.new-collection input{min-width:0;flex:1;border:0;padding:6px 9px;background:transparent;outline:0}.new-collection button{width:31px;border:0;border-radius:50%;background:#e9decc;cursor:pointer}.page-heading,.section-heading{display:flex;justify-content:space-between;gap:30px;align-items:flex-start;margin:20px 0 28px}.page-heading h1,.section-heading h1{margin:6px 0 9px;font:700 clamp(2.6rem,5vw,4.8rem) 'Noto Serif SC';letter-spacing:-.07em}.page-heading p,.section-heading p{max-width:680px;margin:0;color:#70766d;line-height:1.75}.page-heading-actions{display:flex;gap:8px;padding-top:24px}.composer{display:grid;gap:13px;margin-bottom:22px;padding:22px;border:1px solid #ddcfbb;border-radius:23px;background:#fffdf9;box-shadow:0 16px 40px #3d342517}.composer header,.chat-drawer header,.editor-float header,.hidden-drawer header,.preview-overlay header,.narrative-workbench header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.composer header small,.editor-float header small,.hidden-drawer header small,.chat-drawer header small,.narrative-workbench header small{font:.6rem 'DM Mono';letter-spacing:.12em;color:#a17245}.composer h2,.chat-drawer h2,.narrative-workbench h2{margin:3px 0;font:700 1.35rem 'Noto Serif SC'}.composer header>button,.chat-drawer header>button,.editor-float header>button,.hidden-drawer header>button,.preview-overlay header>button,.narrative-workbench header>button{border:0;background:transparent;font-size:1.35rem;cursor:pointer}.composer textarea,.composer input,.composer select,.editor-float input,.editor-float textarea,.editor-float select,.engine-panel input,.engine-panel textarea,.engine-panel select,.narrative-workbench input,.narrative-workbench textarea,.narrative-workbench select,.narrative-edit input,.narrative-edit textarea,.narrative-edit select{width:100%;border:1px solid #d9ccba;border-radius:12px;padding:11px;background:#fffefa;color:#28352e;outline:0}.composer>textarea{resize:vertical;line-height:1.7}.composer-meta{display:grid;grid-template-columns:.7fr .8fr 1fr 1fr;gap:9px}.composer-meta label,.editor-float label,.form-grid label,.narrative-workbench label,.narrative-edit label,.profile-fields label{display:grid;gap:6px;color:#6c7068;font-size:.75rem}.assistant-strip{display:flex;gap:8px;align-items:center}.assistant-strip button,.sticker-strip button,.layout-pills button,.page-stylebar button{border:1px solid #ded2c0;border-radius:999px;padding:7px 10px;background:#f8f2e7;color:#496052;cursor:pointer;font-size:.75rem}.assistant-strip span{margin-left:auto;color:#8a7b68;font-size:.75rem}.media-staging{display:grid;grid-template-columns:auto auto minmax(220px,1fr) auto;gap:10px;align-items:center;padding:14px;border:1px dashed #d3bea0;border-radius:16px;background:#fbf5e9}.media-staging strong,.media-staging small{display:block}.media-staging small{margin-top:3px;color:#8b806f;font-size:.7rem}.media-staging>button{border:0;border-radius:999px;padding:9px 12px;background:#e9f0e8;color:#2f624d;cursor:pointer}.layout-pills{display:flex;gap:4px}.layout-pills button.active,.sticker-strip button.active{background:#285746;color:#fff;border-color:#285746}.staged-list{grid-column:1/-1;display:flex;gap:9px;overflow:auto}.staged-list figure{position:relative;flex:0 0 90px;height:72px;margin:0;border-radius:10px;overflow:hidden}.staged-list img{width:100%;height:100%;object-fit:cover}.staged-list button{position:absolute;right:3px;top:3px;border:0;border-radius:50%;background:#17382ddd;color:#fff;cursor:pointer}.sticker-strip{display:flex;gap:6px;align-items:center}.sticker-strip>span{margin-right:4px;color:#826e54;font-size:.75rem}.composer footer,.engine-panel>footer,.narrative-workbench footer,.narrative-edit footer{display:flex;justify-content:space-between;gap:10px;align-items:center}

.page-deck{margin:20px 0 12px}.page-tabs{display:flex;gap:7px;align-items:stretch;overflow:auto;padding:5px 2px 9px;scrollbar-width:none}.page-tabs>button{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center;min-width:150px;border:1px solid #ddd0bd;border-radius:14px;padding:8px 10px;background:#fffdf8;text-align:left;cursor:pointer}.page-tabs>button:first-child,.page-tabs>button.add-page{display:flex;min-width:auto}.page-tabs button.active{border-color:#285746;background:#285746;color:#fff;box-shadow:0 8px 18px #1b3d3028}.page-tabs small{font:.55rem 'DM Mono';color:#a1774c}.page-tabs b{display:grid;place-items:center;min-width:21px;height:21px;border-radius:50%;background:#efe5d4;font-size:.65rem;color:#6d604e}.page-tabs button.active b{background:#ffffff22;color:#fff}.page-creator{display:flex;gap:7px;width:min(420px,100%);margin:4px 0 10px}.page-creator input{flex:1;border:1px solid #dacbb6;border-radius:12px;padding:9px 11px}.page-creator button{border:0;border-radius:12px;padding:9px 12px;background:#285746;color:#fff;cursor:pointer}.page-stylebar{display:flex;gap:9px;align-items:center;min-height:42px;padding:7px 10px;border-radius:13px;background:#eee7da;color:#70685d;font-size:.74rem}.page-stylebar label{display:flex;gap:5px;align-items:center}.page-stylebar select{border:0;background:#fffdf8;border-radius:8px;padding:5px 7px;color:#45584e}.page-stylebar button:nth-last-child(2){margin-left:auto}.page-overview{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px;padding:25px;border:1px solid #e1d6c6;border-radius:26px;background:#ffffff6b}.page-overview>button{border:0;background:transparent;cursor:pointer}.page-thumb{display:grid;place-content:center;aspect-ratio:1.35;border:8px solid #fff;border-radius:9px;background:#f9f5ec;box-shadow:0 15px 28px #3a322518;transition:transform .22s ease,box-shadow .22s}.page-overview button:hover .page-thumb{transform:translateY(-5px) rotate(-1deg);box-shadow:0 22px 36px #3a322526}.page-thumb span{font:.58rem 'DM Mono';letter-spacing:.14em;color:#a1784d}.page-thumb strong{margin:8px 0;font:700 1.35rem 'Noto Serif SC'}.page-thumb small{color:#857d71}.wall-stage{position:relative;padding:10px;border:1px solid #e4dacb;border-radius:30px;background:#fffdf873}.immersive-toolbar{display:none}.zoom-controls{display:flex;justify-content:flex-end;gap:7px;align-items:center;margin:3px 4px 8px}.zoom-controls button{width:29px;height:29px;border:1px solid #d8cbb8;border-radius:9px;background:#fffdf8;cursor:pointer}.zoom-controls span{font:.7rem 'DM Mono';color:#776c5d}.wall-viewport{position:relative;overflow:auto;border-radius:23px}.memory-wall{position:relative;min-height:720px;overflow:hidden;border:1px solid #ded3c3;border-radius:23px;transform-origin:top left;background:#fbf8f0;box-shadow:inset 0 0 80px #473e2c08}.memory-wall:before{content:'';position:absolute;inset:0;pointer-events:none}.theme-grid:before{background-image:linear-gradient(#b9ad9b15 1px,transparent 1px),linear-gradient(90deg,#b9ad9b15 1px,transparent 1px);background-size:28px 28px}.theme-linen:before{opacity:.45;background-image:repeating-linear-gradient(0deg,#9a89770a 0,#9a89770a 1px,transparent 1px,transparent 4px)}.theme-film{background:#25352f;color:#f8f2e8}.theme-film:before{background:linear-gradient(90deg,#1118 0 3%,transparent 3% 97%,#1118 97%),repeating-linear-gradient(0deg,#fff0 0 24px,#fff3 24px 31px)}.theme-floral{background:radial-gradient(circle at 8% 12%,#e8bdc959 0 10%,transparent 10.3%),radial-gradient(circle at 90% 82%,#b8d7b15c 0 12%,transparent 12.3%),#fffaf1}.theme-minimal{background:#fffdf9}.border-album{border:12px solid #fff8e9;box-shadow:inset 0 0 0 1px #b89768,0 18px 36px #3d35271a}.border-postcard{border:10px solid #fff;outline:2px dashed #c59d73;outline-offset:-16px}.border-none{border-color:transparent}.page-turn{position:absolute;z-index:8;top:50%;display:grid;place-items:center;width:48px;height:92px;border:1px solid #d3c1a7;background:#fffdf8eb;color:#2f604c;box-shadow:0 10px 24px #23372e25;cursor:pointer;opacity:.88;transform:translateY(-50%);transition:opacity .2s ease,box-shadow .2s ease,background .2s ease}.page-turn:hover{opacity:1;transform:translateY(-50%);background:#fff;box-shadow:0 14px 30px #23372e35}.page-turn span{font:2rem 'Noto Serif SC';line-height:1}.page-turn small{font-size:.6rem}.page-turn.previous{left:8px;border-radius:0 13px 13px 0}.page-turn.next{right:8px;border-radius:13px 0 0 13px}.sheet-enter-active,.sheet-leave-active{transition:opacity .25s ease,transform .34s cubic-bezier(.2,.8,.2,1)}.sheet-enter-from{opacity:0;transform:perspective(900px) rotateY(5deg) translateX(18px)!important}.sheet-leave-to{opacity:0;transform:perspective(900px) rotateY(-5deg) translateX(-18px)!important}.page-chapter{position:absolute;z-index:1;inset:10%;display:grid;place-content:center;text-align:center}.page-chapter small{font:.65rem 'DM Mono';letter-spacing:.18em;color:#a57545}.page-chapter h2{margin:16px 0;font:700 clamp(3rem,7vw,6rem) 'Noto Serif SC';letter-spacing:-.08em}.page-chapter p{color:#77786e}.page-chapter>span{margin-top:20px;font:.75rem 'DM Mono';color:#9b7b57}.back-page>span{font-size:2.3rem}.back-page h2{font-size:3.3rem}.wall-empty{position:absolute;z-index:1;inset:0;display:grid;place-content:center;justify-items:center;text-align:center;color:#6f756d}.wall-empty>span{font-size:2.5rem}.wall-empty h2{margin:8px;font:700 1.7rem 'Noto Serif SC'}.wall-empty p{margin:0 0 16px}.memory-block{position:absolute;display:grid;min-width:170px;min-height:120px;overflow:hidden;border:1px solid #fff7e9;border-radius:17px;background:#fffdf8;box-shadow:0 12px 28px #3d332420;cursor:grab;touch-action:none;user-select:none;transition:box-shadow .2s ease,filter .2s ease}.memory-block:hover{filter:saturate(1.05);box-shadow:0 18px 36px #3d33242b}.memory-block.selected{outline:3px solid #d3a65e;outline-offset:3px}.memory-block.dragging,.memory-block.resizing{cursor:grabbing;transition:none}.block-media{min-width:0;min-height:0;overflow:hidden;background:#1a3028}.block-media img{display:block;width:100%;height:100%;object-fit:cover}.block-content{position:relative;display:flex;flex-direction:column;min-width:0;min-height:0;padding:14px;background:linear-gradient(135deg,#fffef9,#fbefcf);overflow:auto}.block-kicker{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.block-kicker>span{font-size:1.2rem}.block-kicker small{padding:3px 7px;border-radius:99px;background:#ffffffa8;color:#58685e}.memory-block h3{margin:0 0 5px;font:700 1rem 'Noto Serif SC'}.memory-block p{margin:0;font-size:.8rem;line-height:1.55}.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:auto;padding-top:8px}.chips span{padding:3px 6px;border-radius:7px;background:#ffffffb8;color:#59675f;font-size:.64rem}.kind-sticker .block-content{background:#f4d8a6}.kind-note .block-content,.kind-text .block-content,.kind-sticker .block-content{height:100%}.kind-image.text-bottom{grid-template-rows:minmax(45%,1fr) auto}.kind-image.text-top{grid-template-rows:auto minmax(45%,1fr)}.kind-image.text-top .block-content{grid-row:1}.kind-image.text-top .block-media{grid-row:2}.kind-image.text-left{grid-template-columns:minmax(42%,1fr) minmax(42%,1fr)}.kind-image.text-left .block-content{grid-column:1;grid-row:1}.kind-image.text-left .block-media{grid-column:2;grid-row:1}.kind-image.text-right{grid-template-columns:minmax(42%,1fr) minmax(42%,1fr)}.kind-image.text-right .block-media{grid-column:1}.kind-image.text-right .block-content{grid-column:2}.kind-image.text-overlay{display:block}.kind-image.text-overlay .block-media{position:absolute;inset:0}.kind-image.text-overlay .block-content{position:absolute;left:0;right:0;bottom:0;max-height:64%;background:linear-gradient(transparent,#172b25ed);color:#fff}.kind-image.text-overlay .chips span{color:#334f42}.kind-image.text-hidden .block-media{position:absolute;inset:0}.kind-image.text-hidden .block-content{display:none}.frame-polaroid{border:8px solid #fff;border-bottom-width:25px;border-radius:5px}.resize-handle{position:absolute;z-index:4;right:4px;bottom:4px;display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:8px;background:#fffdf8dd;color:#2c5a48;cursor:nwse-resize;opacity:0}.memory-block:hover .resize-handle,.memory-block.selected .resize-handle{opacity:1}.memory-coach{display:grid;grid-template-columns:minmax(260px,1.2fr) repeat(3,minmax(180px,1fr));gap:10px;margin:18px 0}.memory-coach>div,.memory-coach>button{border:1px solid #dfd3c2;border-radius:16px;padding:13px;background:#fffdf8;text-align:left}.memory-coach>div small{font:.58rem 'DM Mono';letter-spacing:.12em;color:#a27548}.memory-coach h3{margin:5px 0;font:700 1rem 'Noto Serif SC'}.memory-coach>button{display:flex;gap:10px;cursor:pointer}.memory-coach button>span{font-size:1.2rem}.memory-coach button strong,.memory-coach button small{display:block}.memory-coach button strong{font-size:.78rem}.memory-coach button small{margin-top:4px;color:#8a7d6e;font-size:.66rem}.wall-stage:fullscreen{width:100vw;height:100dvh;padding:16px;background:#f3efe6}.wall-stage:fullscreen .immersive-toolbar{display:flex;justify-content:space-between;align-items:center;height:48px;margin:0 3vw 8px}.immersive-toolbar div small,.immersive-toolbar div strong{display:block}.immersive-toolbar div small{font:.55rem 'DM Mono';color:#9a744d}.immersive-toolbar button{border:1px solid #d6c6af;border-radius:999px;padding:7px 11px;background:#fffdf8;cursor:pointer}.wall-stage:fullscreen .zoom-controls{position:absolute;z-index:10;right:4vw;top:66px}.wall-stage:fullscreen .wall-viewport{height:calc(100dvh - 72px)}.wall-stage:fullscreen .memory-wall{min-height:calc(100dvh - 78px)}

.content-view{animation:content-in .35s ease}.section-heading{margin-top:5px}.section-heading .ghost-action,.section-heading .primary-action{margin-top:28px}.timeline-group{margin:28px 0 45px}.timeline-date{display:flex;gap:10px;align-items:center}.timeline-date span{padding:7px 12px;border-radius:999px;background:#e9dfca;color:#745d40;font:600 .8rem 'DM Mono'}.timeline-date b{color:#8a8174;font-size:.72rem}.event-card{display:grid;grid-template-columns:150px minmax(0,1fr);gap:26px;margin-left:18px;padding:28px 10px;border-left:1px solid #d5c5ae;border-bottom:1px solid #e1d6c7}.event-time{padding-top:7px;color:#a07342;font:600 .8rem 'DM Mono'}.event-card small{color:#91816b}.event-card h2{margin:5px 0;font:700 1.6rem 'Noto Serif SC'}.event-card p,.event-card blockquote{line-height:1.75;color:#575b52}.event-card blockquote{margin:9px 0;border-left:2px solid #c4aa7c;padding-left:11px}.event-card footer{display:flex;gap:8px;margin-top:12px}.event-card footer button,.world-section header>button,.narrative-card footer button{border:1px solid #d9cbb8;border-radius:999px;padding:8px 11px;background:#fffdf8;color:#35604e;cursor:pointer}.empty-state{display:grid;place-content:center;justify-items:center;min-height:320px;text-align:center;color:#747a72}.empty-state>span{font-size:2.5rem}.empty-state h2,.empty-state h3{font-family:'Noto Serif SC'}.empty-state.compact{min-height:160px}.world-shell{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px;align-items:start}.world-line{position:sticky;top:112px;padding:20px;border:1px solid #ddd1bf;border-radius:21px;background:#fffdf8;box-shadow:0 16px 36px #2f3e3412}.world-line>small{display:block;margin-bottom:15px;font:.6rem 'DM Mono';letter-spacing:.13em;color:#a07144}.world-line>button{display:flex;gap:10px;width:100%;border:0;border-top:1px solid #ece3d6;padding:13px 3px;background:transparent;text-align:left;cursor:pointer}.world-line>button>span{font:.65rem 'DM Mono';color:#a47849}.world-line button strong,.world-line button small{display:block}.world-line button strong{font:700 .9rem 'Noto Serif SC'}.world-line button small{margin-top:2px;color:#8a8276;font-size:.67rem}.world-event-links{margin-top:12px;padding-top:8px;border-top:1px solid #e9dfd2}.world-event-links button{display:grid;grid-template-columns:8px 1fr;gap:6px;width:100%;border:0;padding:7px 2px;background:transparent;text-align:left;cursor:pointer;font-size:.74rem}.world-event-links i{width:6px;height:6px;margin-top:6px;border-radius:50%;background:#c69155}.world-event-links small{grid-column:2}.world-content{min-width:0}.narrative-workbench{display:grid;gap:14px;margin-bottom:20px;padding:21px;border:1px solid #ddcdb5;border-radius:22px;background:linear-gradient(125deg,#fff9ed,#edf5ee)}.narrative-workbench header p{margin:4px 0;color:#70776e;font-size:.8rem}.workbench-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.workbench-fields .instruction{grid-column:1/-1}.narrative-workbench footer span{color:#7f786c;font-size:.73rem}.world-section{scroll-margin-top:105px;margin-bottom:18px;padding:22px;border:1px solid #dfd4c4;border-radius:22px;background:#fffdf8}.world-section>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.world-section header small{font:.58rem 'DM Mono';letter-spacing:.12em;color:#a27446}.world-section h2{margin:4px 0;font:700 1.5rem 'Noto Serif SC'}.collection-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.collection-cards button{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:0;border-radius:14px;padding:13px;background:#f4eee3;text-align:left;cursor:pointer}.collection-cards strong,.collection-cards small{display:block}.collection-cards small{margin-top:3px;color:#867d70;font-size:.68rem}.entity-cloud{display:flex;flex-wrap:wrap;gap:8px}.entity-cloud span{padding:7px 11px;border-radius:999px;background:#e9e1f2;color:#68547a;font-size:.8rem}.narrative-card{padding:18px 0;border-top:1px solid #e5dbcc}.narrative-meta{display:flex;gap:6px}.narrative-meta span{padding:4px 7px;border-radius:7px;background:#eee8dc;color:#756b5d;font-size:.65rem}.narrative-card h3{margin:8px 0;font:700 1.35rem 'Noto Serif SC'}.narrative-card>p{max-width:900px;white-space:pre-line;line-height:1.8;color:#555a52}.narrative-edit{display:grid;gap:10px}.narrative-edit footer{justify-content:flex-end}

.engine-view{max-width:1180px;margin:auto}.engine-tabs{display:flex;gap:5px;margin-bottom:18px;padding:5px;border:1px solid #ded2c1;border-radius:16px;background:#fffdf9;width:max-content}.engine-tabs button{border:0;border-radius:11px;padding:9px 13px;background:transparent;color:#687169;cursor:pointer;font-size:.78rem}.engine-tabs button.active{background:#285244;color:#fff}.engine-panel{display:grid;gap:18px;padding:25px;border:1px solid #ddd1bf;border-radius:24px;background:#fffdf8;box-shadow:0 18px 40px #2d3a3210}.engine-intro small{font:.6rem 'DM Mono';letter-spacing:.13em;color:#a07145}.engine-intro h2{margin:6px 0;font:700 1.7rem 'Noto Serif SC'}.engine-intro p{margin:0;color:#73786f;line-height:1.7}.search-box{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:7px 7px 7px 14px;border:1px solid #d8cbb8;border-radius:17px;background:#fff}.search-box>span{font-size:1.2rem;color:#537061}.search-box input{border:0!important;outline:0}.search-box button{border:0;border-radius:12px;padding:10px 18px;background:#285746;color:#fff;cursor:pointer}.index-actions{display:flex;justify-content:space-between;align-items:center;color:#80786b;font-size:.73rem}.index-actions button{border:0;background:transparent;color:#32634f;cursor:pointer}.search-results article{padding:16px 0;border-top:1px solid #e7ddd0}.search-results article header{display:flex;gap:5px;align-items:center}.search-results article header span{padding:3px 6px;border-radius:7px;background:#e8f0e8;color:#496454;font-size:.63rem}.search-results article header small{margin-left:auto;color:#9a734b}.search-results h3{margin:7px 0;font:700 1.16rem 'Noto Serif SC'}.search-results p{line-height:1.7}.ai-status{display:flex;gap:10px;align-items:center;padding:13px;border-radius:15px;background:#f2eee5}.ai-status>span{width:12px;height:12px;border-radius:50%;background:#b8aaa0;box-shadow:0 0 0 6px #b8aaa020}.ai-status>span.on{background:#4e9b70;box-shadow:0 0 0 6px #4e9b7020}.ai-status strong,.ai-status small{display:block}.ai-status small{margin-top:2px;color:#81786d}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.form-grid .wide{grid-column:1/-1}.engine-panel>footer{justify-content:flex-end}.graph-legend{display:flex;gap:13px;flex-wrap:wrap}.graph-legend span{display:flex;gap:6px;align-items:center;font-size:.72rem;color:#746c61}.graph-legend i{width:9px;height:9px;border-radius:50%;background:#a798c8}.graph-legend i.person{background:#285746}.graph-legend i.event{background:#d39a52}.graph-legend i.collection{background:#6caab3}.graph-canvas{position:relative;min-height:560px;border:1px solid #e1d6c6;border-radius:20px;overflow:hidden;background:radial-gradient(circle,#fff,#f5f0e7)}.graph-canvas svg{display:block;width:100%;height:560px}.graph-canvas line{stroke:#baa98f;stroke-width:1;opacity:.55}.graph-canvas circle{fill:#e9e1f1;stroke:#fff;stroke-width:3;filter:drop-shadow(0 5px 5px #40331f24)}.graph-canvas text{font:600 12px 'Source Han Sans SC';fill:#3a423d}.graph-canvas .node-person circle{fill:#285746}.graph-canvas .node-person text{fill:#fff}.graph-canvas .node-event circle{fill:#efc889}.graph-canvas .node-collection circle{fill:#add5d5}.profile-layout{display:grid;grid-template-columns:110px 1fr;gap:22px;align-items:start}.profile-avatar{display:grid;place-items:center;aspect-ratio:1;border-radius:34px;background:#285746;color:#fff;font:700 3rem 'Noto Serif SC';box-shadow:0 14px 30px #1c3c302a}.profile-fields{display:grid;gap:12px}.profile-fields .primary-action{justify-self:start}.connection-card,.danger-zone{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:17px;border:1px solid #e1d5c5;border-radius:17px;background:#f8f3e9}.connection-card small,.connection-card strong{display:block}.connection-card strong{margin-top:4px}.connection-card p,.danger-zone p{margin:4px 0 0;color:#7e766a;font-size:.75rem}.connection-card>div:last-child{display:flex;gap:7px;min-width:min(480px,50%)}.connection-card input{min-width:0}.danger-zone{border-color:#e1c6bf;background:#fcf4f1}.danger-zone button{border:1px solid #c98f84;border-radius:999px;padding:9px 13px;background:#fff;color:#984f43;cursor:pointer}

.editor-float,.hidden-drawer{position:fixed;z-index:26;left:22px;top:102px;display:grid;gap:11px;width:310px;max-height:calc(100vh - 125px);overflow:auto;padding:17px;border:1px solid #d9cbb7;border-radius:20px;background:#fffdf9ed;box-shadow:0 24px 65px #1e30254a;backdrop-filter:blur(18px);animation:float-in .25s cubic-bezier(.2,.8,.2,1)}.editor-float{grid-template-rows:auto auto auto auto auto minmax(0,1fr) auto;resize:none}.editor-float.right{left:auto;right:22px}.editor-float header strong,.hidden-drawer header strong{display:block;font:700 1rem 'Noto Serif SC'}.dock-controls{display:flex;gap:3px}.dock-controls button{border:0;background:transparent;font-size:1.15rem;cursor:pointer}.editor-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.editor-float label:has(input[type=range]){grid-template-columns:74px 1fr auto;align-items:center}.editor-float label:has(input[type=range]) input{padding:0}.editor-float footer{display:flex;flex-wrap:wrap;gap:7px;margin-top:auto}.editor-float footer .primary-action{margin-left:auto}.editor-preferences{padding:9px 0;border-top:1px solid #e7ddcf;color:#6f776e;font-size:.72rem}.editor-preferences summary{cursor:pointer;font-weight:700}.editor-preferences label{margin-top:9px}.editor-preferences>small{display:block;margin-top:8px;color:#918678;line-height:1.5}.hidden-drawer{left:auto;right:22px}.hidden-drawer article{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;padding:9px;border-radius:12px;background:#f4eee4}.hidden-drawer article strong,.hidden-drawer article small{display:block}.hidden-drawer article small{color:#827b70}.hidden-drawer article button{border:0;background:transparent;color:#2f634d;cursor:pointer}.chat-drawer{position:fixed;z-index:27;right:22px;top:102px;display:grid;grid-template-rows:auto minmax(0,1fr) auto;width:min(430px,calc(100vw - 32px));height:min(680px,calc(100vh - 124px));border:1px solid #d8cbb8;border-radius:24px;background:#fffdf9;box-shadow:0 25px 70px #1d30254d;animation:float-in .28s cubic-bezier(.2,.8,.2,1)}.chat-drawer>header{padding:18px 19px 14px;border-bottom:1px solid #e8ded0}.chat-drawer header p{margin:4px 0 0;color:#7e7c73;font-size:.72rem}.chat-log{display:flex;flex-direction:column;gap:12px;overflow:auto;padding:16px;align-items:stretch}.chat-welcome{margin:auto 0;display:grid;justify-items:center;padding:24px;text-align:center}.chat-welcome>span{font-size:2rem}.chat-welcome h3{margin:8px 0;font:700 1.25rem 'Noto Serif SC'}.chat-welcome p{max-width:300px;margin:0;color:#777c74;line-height:1.7}.chat-welcome button{margin-top:15px;border:1px solid #d7c9b5;border-radius:999px;padding:8px 11px;background:#fff;color:#35624f;cursor:pointer}.chat-log article{width:88%;padding:11px 13px;border-radius:15px;line-height:1.65}.chat-log article.user{align-self:flex-end;border-bottom-right-radius:4px;background:#e5efe8}.chat-log article.ai{align-self:flex-start;border-bottom-left-radius:4px;background:#f1eadf}.chat-log article>small{display:block;margin-bottom:4px;color:#917a5c;font-size:.63rem}.chat-log article p{margin:0}.chat-log details{margin-top:8px;color:#7c6e5d;font-size:.7rem}.chat-log details span{display:block;margin-top:4px;padding:4px 6px;border-radius:7px;background:#fff9}.chat-log article>button{margin-top:8px;border:0;background:transparent;color:#2c654e;cursor:pointer}.chat-input{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px;border-top:1px solid #e5dacb;background:#faf6ee;border-radius:0 0 24px 24px}.chat-input textarea{resize:none;border:1px solid #d7c9b6;border-radius:14px;padding:10px;background:#fff;outline:0}.chat-input button{align-self:end;display:grid;place-items:center;width:46px;height:46px;border:0;border-radius:15px;background:#285746;color:#fff;cursor:pointer;box-shadow:0 8px 18px #183a2d28}.chat-input button span{font-size:1.4rem}.overlay{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:20px;background:#1d302a99;backdrop-filter:blur(8px)}.preview-overlay>article{display:grid;gap:12px;width:min(1120px,96vw);max-height:94vh;padding:18px;border-radius:22px;background:#fffdf8;box-shadow:0 25px 75px #10201966}.preview-overlay h2{margin:3px 0;font:700 1.3rem 'Noto Serif SC'}.preview-overlay header small{font:.6rem 'DM Mono';color:#9f7449}.preview-tools{display:flex;gap:6px;justify-content:flex-end}.preview-tools button{border:1px solid #dacdbb;border-radius:8px;padding:6px 9px;background:#fff;cursor:pointer}.preview-tools span{padding:7px;font:.7rem 'DM Mono'}.image-zoom-surface{overflow:hidden;height:min(70vh,760px);border-radius:14px;background:#1a2e27}.image-zoom-surface img{display:block;width:100%;max-width:none;transform-origin:top center;transition:transform .2s ease}.preview-overlay article>p{margin:0}.confirm-dialog article{width:min(430px,100%);padding:28px;border-radius:24px;background:#fffdf8;text-align:center;box-shadow:0 25px 75px #10201966}.confirm-dialog article>span{font-size:2rem;color:#9a5247}.confirm-dialog h2{font:700 1.55rem 'Noto Serif SC'}.confirm-dialog p{color:#74786f;line-height:1.7}.confirm-dialog footer{display:flex;justify-content:center;gap:8px;margin-top:20px}

/* Canvas interaction layer: no native scrollbars, proportional card typography and object reel. */
.wall-viewport{height:720px;overflow:hidden;overscroll-behavior:contain}.wall-viewport.pannable{cursor:grab}.wall-viewport.panning{cursor:grabbing}.memory-wall{width:100%;height:720px;min-height:0;transform-origin:center;will-change:transform;transition:transform .18s ease}.wall-viewport.panning .memory-wall{transition:none}.zoom-controls button{width:auto;min-width:29px;padding:0 8px}.zoom-controls small{margin-left:5px;color:#918778;font-size:.64rem}.block-content{display:block;padding:0;overflow:hidden}.block-content-inner{display:flex;flex-direction:column;width:calc(100% / var(--card-scale,1));height:calc(100% / var(--card-scale,1));padding:14px;overflow:hidden;transform:scale(var(--card-scale,1));transform-origin:top left}.memory-block{min-width:150px;min-height:110px}.memory-block p{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:5}.chips{overflow:hidden}.chips span{white-space:nowrap}.wall-stage:fullscreen .memory-wall{height:calc(100dvh - 78px);min-height:0}
.kind-image.text-bottom{grid-template-rows:minmax(0,58%) minmax(0,42%)}.kind-image.text-top{grid-template-rows:minmax(0,42%) minmax(0,58%)}
.coach-ribbon{display:flex;gap:8px;align-items:stretch;margin:-10px 0 20px;padding:9px;border:1px solid #ddcfbb;border-radius:19px;background:#fffdf9;box-shadow:0 12px 30px #2c3d3210}.coach-ribbon>div{display:grid;align-content:center;min-width:220px;padding:5px 9px}.coach-ribbon>div small{font:.56rem 'DM Mono';letter-spacing:.12em;color:#a07146}.coach-ribbon>div strong{margin-top:4px;font:700 .92rem 'Noto Serif SC'}.coach-ribbon>button{display:flex;gap:8px;align-items:center;min-width:0;border:0;border-radius:13px;padding:9px 11px;background:#f4eee3;text-align:left;cursor:pointer}.coach-ribbon button>span{font-size:1.1rem}.coach-ribbon button strong,.coach-ribbon button small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.coach-ribbon button strong{max-width:210px;font-size:.75rem}.coach-ribbon button small{max-width:210px;margin-top:2px;color:#8b8173;font-size:.64rem}.coach-ribbon .coach-create{margin-left:auto;background:#285746;color:#fff;white-space:nowrap}.card-reel{margin:13px 0 0;padding:13px;border:1px solid #ded2c1;border-radius:20px;background:#fffdf9}.card-reel>header{display:flex;justify-content:space-between;align-items:end;margin:0 4px 10px}.card-reel header small,.card-reel header strong{display:block}.card-reel header small{font:.56rem 'DM Mono';letter-spacing:.13em;color:#a17145}.card-reel header strong{margin-top:3px;font:700 .96rem 'Noto Serif SC'}.card-reel header>span{color:#8a8174;font-size:.68rem}.reel-track{display:flex;gap:9px;overflow-x:auto;padding:2px 2px 7px;scrollbar-width:thin;scrollbar-color:#cabda9 transparent}.reel-track article{display:grid;grid-template-columns:56px minmax(110px,1fr) auto;gap:9px;align-items:center;flex:0 0 245px;border:1px solid #e2d6c5;border-radius:14px;padding:7px;background:#f8f3ea;cursor:grab}.reel-track article.active{border-color:#b98449;box-shadow:0 0 0 2px #d9b26f33}.reel-track article.hidden{border-style:dashed;opacity:.62}.reel-preview{display:grid;place-items:center;width:56px;height:45px;overflow:hidden;border-radius:8px;background:#e8dfd1;font-size:1.25rem}.reel-preview img{width:100%;height:100%;object-fit:cover}.reel-track strong,.reel-track small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reel-track strong{font-size:.74rem}.reel-track small{margin-top:4px;color:#8d8273;font-size:.62rem}.reel-track button{border:0;border-radius:50%;width:28px;height:28px;background:#fff;color:#315e4c;cursor:pointer}.hidden-count{margin-left:auto;color:#8d6a49}

@keyframes panel-in{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}@keyframes content-in{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}@keyframes float-in{from{opacity:0;transform:translateX(-12px) scale(.98)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
@media(max-width:1100px){.global-header{grid-template-columns:1fr auto}.global-nav{grid-row:2;grid-column:1/-1;justify-self:center;margin-top:-3px}.global-header{height:124px}.profile-menu{top:111px}.world-line{top:150px}.editor-float,.chat-drawer,.hidden-drawer{top:142px;max-height:calc(100vh - 160px)}.composer-meta{grid-template-columns:1fr 1fr}.media-staging{grid-template-columns:1fr 1fr}.media-staging>input,.layout-pills{grid-column:1/-1}.memory-coach{grid-template-columns:1fr 1fr}.memory-coach>div{grid-column:1/-1}}
@media(max-width:820px){.auth-shell{grid-template-columns:1fr}.auth-story{display:none}.auth-panel{margin:28px auto;padding:32px 26px}.global-header{grid-template-columns:1fr auto;padding:0 14px}.global-brand div,.user-action div,.share-action b{display:none}.global-nav{width:calc(100% - 28px);justify-content:space-between}.global-nav button{flex:1;justify-content:center}.app-shell{width:92vw;padding-top:20px}.collection-bar,.page-heading,.section-heading{display:block}.new-collection{margin-top:10px}.page-heading-actions{padding-top:15px}.composer-meta,.workbench-fields,.form-grid{grid-template-columns:1fr}.workbench-fields .instruction,.form-grid .wide{grid-column:auto}.media-staging{grid-template-columns:1fr}.assistant-strip,.sticker-strip{flex-wrap:wrap}.assistant-strip span{margin-left:0}.page-stylebar{overflow:auto}.page-stylebar button:nth-last-child(2){margin-left:0}.memory-wall{min-height:610px}.memory-coach{grid-template-columns:1fr}.memory-coach>div{grid-column:auto}.event-card{grid-template-columns:1fr;margin-left:0}.world-shell{grid-template-columns:1fr}.world-line{position:relative;top:0}.editor-float{left:8px;right:8px;top:auto;bottom:8px;width:auto;max-height:70vh}.hidden-drawer,.chat-drawer{left:8px;right:8px;top:auto;bottom:8px;width:auto;height:min(680px,calc(100vh - 20px));max-height:none}.connection-card,.danger-zone{display:grid}.connection-card>div:last-child{min-width:0}.profile-layout{grid-template-columns:80px 1fr}.page-turn{width:36px;height:65px}.page-turn small{display:none}}
@media(max-width:820px){
  body{padding-bottom:76px;background:var(--cream)}
  .global-header{position:sticky;top:0;display:flex;height:64px;padding:0 12px;background:#f8f4ecf2;backdrop-filter:none}
  .global-brand{flex:1}.global-brand>span{width:38px;height:38px;border-radius:12px}.global-brand div{display:block}.global-brand small{display:none}.global-brand strong{max-width:45vw;font-size:.9rem}
  .header-actions{gap:4px}.share-action{width:38px;height:38px;justify-content:center;padding:0;border-radius:12px}.share-action b,.user-action div,.user-action>b{display:none}.user-action{padding:0}.user-action>span{width:38px;height:38px}
  .global-nav{position:fixed;z-index:45;left:10px;right:10px;bottom:8px;display:grid;grid-template-columns:repeat(4,1fr);width:auto;margin:0;padding:5px;border-color:#d4c6b2;background:#fffdf9f2;box-shadow:0 14px 35px #1a30264a;backdrop-filter:blur(18px)}
  .global-nav button{display:grid;gap:2px;justify-items:center;padding:7px 3px}.global-nav button i{font-size:1rem}.global-nav button span{font-size:.62rem}
  .profile-menu{position:fixed;z-index:46;left:10px;right:10px;top:auto;bottom:76px;width:auto}
  .app-shell{width:100%;padding:14px 12px 28px}.collection-bar{display:flex;margin:0 0 14px;overflow:hidden}.collection-list{flex:1}.new-collection{display:none}
  .page-heading{display:flex;align-items:end;gap:10px;margin:12px 2px 14px}.page-heading h1{font-size:2.1rem}.page-heading>div:first-child>p:last-child,.page-heading .eyebrow{display:none}.page-heading-actions{padding:0}.page-heading-actions button{width:42px;height:42px;display:grid;place-items:center;padding:0;border-radius:13px}.page-heading-actions button span{font-size:1rem}.page-heading-actions button{font-size:0}.page-heading-actions button span{font-size:1rem}
  .coach-ribbon{margin:0 0 12px;padding:7px;overflow-x:auto;border-radius:15px}.coach-ribbon>div{min-width:180px}.coach-ribbon>button{flex:0 0 190px}.coach-ribbon>button:nth-of-type(n+3){display:none}.coach-ribbon .coach-create{display:flex;flex:0 0 auto}
  .composer{position:fixed;z-index:44;inset:64px 0 72px;overflow-y:auto;margin:0;padding:16px 14px;border:0;border-radius:0;background:#fffdf9}.composer h2{font-size:1.15rem}.composer>textarea{min-height:110px}.composer-meta{grid-template-columns:1fr 1fr}.composer-meta label:nth-child(3),.composer-meta label:nth-child(4){grid-column:1/-1}.assistant-strip span{display:none}.media-staging{grid-template-columns:1fr auto}.media-staging>input,.layout-pills{grid-column:1/-1}.layout-pills{overflow-x:auto}.sticker-strip{overflow-x:auto;flex-wrap:nowrap}.sticker-strip>span{display:none}.composer footer{position:sticky;bottom:0;padding-top:10px;background:#fffdf9}
  .page-deck{margin:8px 0}.page-tabs{gap:5px}.page-tabs>button{min-width:112px;padding:7px 8px}.page-tabs>button:first-child{min-width:44px;font-size:0}.page-tabs>button:first-child span{font-size:1rem}.page-tabs small{display:none}.page-stylebar{gap:6px;overflow-x:auto;padding:6px}.page-stylebar>span:first-child,.page-stylebar>button{display:none}.page-stylebar label{flex:0 0 auto}.hidden-count{margin-left:0;white-space:nowrap}
  .wall-stage{padding:5px;border-radius:20px}.zoom-controls{justify-content:center;margin:2px 0 6px}.zoom-controls small{display:none}.wall-viewport{height:min(67vh,570px);border-radius:16px}.memory-wall{height:min(67vh,570px);min-height:0;border-radius:16px}.page-turn{width:34px;height:58px}.page-turn.previous{left:2px}.page-turn.next{right:2px}
  .memory-block{min-width:112px;min-height:86px;border-radius:12px}.block-content-inner{padding:11px}.resize-handle{opacity:1;width:22px;height:22px}.frame-polaroid{border-width:5px;border-bottom-width:16px}
  .card-reel{margin-top:8px;padding:9px;border-radius:16px}.card-reel>header span{display:none}.reel-track article{grid-template-columns:48px minmax(90px,1fr) auto;flex-basis:205px}.reel-preview{width:48px;height:40px}
  .notice{padding:0 4px;font-size:.75rem}.editor-float{left:8px!important;right:8px!important;top:auto;bottom:82px;width:auto!important;height:min(62vh,590px)!important;max-height:none;border-radius:22px;padding:15px}.editor-preferences{display:none}.chat-drawer{left:8px;right:8px;top:auto;bottom:82px;width:auto;height:min(72vh,660px);border-radius:22px}
  .section-heading{display:block;margin:8px 2px 20px}.section-heading h1{font-size:2.2rem}.section-heading>button{width:100%;margin-top:12px!important}.event-card{grid-template-columns:1fr;gap:6px;margin-left:0;padding:20px 8px}.event-time{font-size:.7rem}.event-card h2{font-size:1.3rem}.event-card footer{overflow-x:auto}.world-shell{grid-template-columns:1fr}.world-line{display:flex;position:relative;top:0;gap:5px;overflow-x:auto;padding:8px;border-radius:15px}.world-line>small,.world-event-links{display:none}.world-line>button{flex:0 0 auto;border:0;border-radius:11px;padding:9px;background:#f2ebdf}.world-section,.engine-panel{padding:16px;border-radius:18px}.engine-tabs{position:sticky;z-index:5;top:70px;width:100%;overflow-x:auto}.engine-tabs button{flex:0 0 auto}.graph-canvas,.graph-canvas svg{min-height:390px;height:390px}.connection-card,.danger-zone{display:grid}.connection-card>div:last-child{display:grid;min-width:0}.profile-layout{grid-template-columns:64px 1fr}.profile-avatar{border-radius:20px;font-size:2rem}
  .coach-ribbon,.page-tabs,.page-stylebar,.reel-track,.world-line,.engine-tabs{scrollbar-width:none}
  .coach-ribbon::-webkit-scrollbar,.page-tabs::-webkit-scrollbar,.page-stylebar::-webkit-scrollbar,.reel-track::-webkit-scrollbar,.world-line::-webkit-scrollbar,.engine-tabs::-webkit-scrollbar{display:none}
}
/* Tablet landscape: keep desktop density without exposing page-level
   horizontal scrolling from desktop minimums inside a WebView. */
html,body,#\#__nuxt{width:100%;max-width:100%;overflow-x:hidden}
.application{width:100%;max-width:100%;overflow-x:clip}
.app-shell{width:min(1480px,calc(100% - 32px));max-width:100%}
@media (min-width:821px) and (max-width:1200px) and (orientation:landscape){
  .global-header{grid-template-columns:minmax(170px,1fr) auto minmax(170px,1fr);gap:12px;padding-inline:16px}
  .global-nav button{padding-inline:9px}
  .header-actions{min-width:0}
  .share-action b,.user-action div{display:none}
  .app-shell{width:calc(100% - 28px);padding-top:22px}
  .composer-meta{grid-template-columns:repeat(2,minmax(0,1fr))}
  .media-staging{grid-template-columns:auto minmax(0,1fr) auto}
  .memory-coach{grid-template-columns:repeat(2,minmax(0,1fr))}
  .memory-coach>div{grid-column:1/-1}
  .world-shell{grid-template-columns:210px minmax(0,1fr);gap:16px}
  .page-heading h1,.section-heading h1{font-size:clamp(2.5rem,5vw,4rem)}
}
/* WebView/mobile hardening: long titles and provider URLs must wrap inside
   their card instead of widening the page. */
html,body,#\#__nuxt,.application,.global-header,.app-shell,.content-view,.wall-view{min-width:0;max-width:100%}
button,input,select,textarea{max-width:100%;min-width:0}
button,small,strong,h1,h2,h3,p,span,blockquote{overflow-wrap:anywhere}
.collection-list,.page-tabs,.page-stylebar,.reel-track,.assistant-strip,.sticker-strip,.chat-log,.search-results{min-width:0}
.memory-block,.block-content,.block-content-inner,.block-media{min-width:0;max-width:100%;overflow:hidden}
.block-content-inner{word-break:break-word}
@media (max-width:820px){
  .auth-panel{width:min(520px,calc(100% - 24px));min-width:0}
  .global-header,.global-nav,.header-actions{min-width:0}
  .page-heading>div:first-child{min-width:0;flex:1}
  .page-heading-actions{flex:0 0 auto}
  .composer,.chat-drawer,.editor-float{max-width:100vw}
  .chat-log article{width:100%;max-width:100%}
  .connection-card>div:last-child,.danger-zone>div{min-width:0;max-width:100%}
.graph-canvas{max-width:100%;overflow:hidden}
}
.groups-create{align-items:end}.groups-create>button{justify-self:start}.groups-layout{display:grid;grid-template-columns:minmax(180px,.38fr) 1fr;gap:16px}.group-list{display:grid;align-content:start;gap:7px}.group-list button{display:grid;gap:4px;border:1px solid #ded2c1;border-radius:14px;padding:13px;background:#fff;color:#50655b;text-align:left;cursor:pointer}.group-list button.active{border-color:#285746;background:#e9f1e9;color:#285746}.group-list small,.group-detail small{color:#81786c;font-size:.72rem}.group-detail{display:grid;gap:14px;padding:17px;border:1px solid #ded2c1;border-radius:18px;background:#fffefa}.group-detail>header,.group-section>header{display:flex;justify-content:space-between;gap:12px;align-items:center}.group-detail>header h3{margin:5px 0 0;font:700 1.35rem 'Noto Serif SC'}.group-detail>header>span{color:#8a765c;font-size:.75rem}.group-invite{align-items:end}.group-invite>button{justify-self:start}.group-section{display:grid;gap:8px}.group-section h4{margin:0;font-size:.9rem}.group-section article{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 12px;border:1px solid #ebe2d6;border-radius:12px;background:#faf6ee}.group-section article strong,.group-section article small{display:block}.group-section article small{margin-top:3px}.muted{margin:0;color:#8b8378;font-size:.78rem}@media(max-width:820px){.groups-layout{grid-template-columns:1fr}.groups-create,.group-invite{grid-template-columns:1fr}.groups-create>button,.group-invite>button{width:100%}}

/* Canvas editor pass: preserve the page scroll, make every card a miniature,
   and offer the same core actions through mouse, touch and keyboard-visible UI. */
.wall-viewport{overflow:hidden;touch-action:pan-y}.memory-wall{overflow:hidden}.memory-block{isolation:isolate;contain:layout paint}.block-content,.block-content-inner{overflow:hidden!important}.block-content-inner{min-height:0}.memory-block h3{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.memory-block p{min-height:0;-webkit-line-clamp:4}.kind-image .block-media{min-height:0}.media-placeholder{display:grid;place-content:center;gap:5px;background:linear-gradient(135deg,#dce9e1,#99b5a6)!important;color:#234c3d}.media-placeholder span{font-size:2rem}.media-placeholder small{font-size:.65rem}.compact-action{width:100%;padding:10px 12px;border:1px solid #d9ccba;background:#f7f1e7}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;clip-path:inset(50%)}.canvas-context-menu{position:fixed;z-index:60;display:grid;gap:3px;width:208px;padding:9px;border:1px solid #d8c8b1;border-radius:15px;background:#fffdf9;box-shadow:0 20px 45px #19342838;animation:context-in .16s ease}.canvas-context-menu strong{padding:5px 7px;overflow:hidden;color:#536157;font-size:.74rem;text-overflow:ellipsis;white-space:nowrap}.canvas-context-menu button{border:0;border-radius:9px;padding:8px 9px;background:transparent;text-align:left;color:#315d4b;cursor:pointer;font-size:.78rem}.canvas-context-menu button:hover{background:#eef3ed}.canvas-context-menu>div{display:grid;grid-template-columns:1fr 1fr;gap:3px}.canvas-context-menu .menu-danger{color:#a04942}.canvas-context-menu .menu-danger:hover{background:#f7e8e5}.page-heading>div:first-child,.section-heading>div:first-child{min-width:0}.page-heading h1,.section-heading h1{max-width:100%;overflow-wrap:anywhere;text-wrap:balance}.global-brand strong{max-width:min(260px,30vw)}.editor-float footer .danger-action{padding:10px 11px;font-size:.72rem}@keyframes context-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
@media(max-width:820px){.canvas-context-menu{left:10px!important;right:10px;top:auto!important;bottom:78px;width:auto;grid-template-columns:1fr 1fr}.canvas-context-menu strong{grid-column:1/-1}.canvas-context-menu>div{grid-column:1/-1}.canvas-context-menu .menu-danger{grid-column:1/-1}.memory-block p{-webkit-line-clamp:3}.editor-float footer .danger-action{order:3}.page-heading h1,.section-heading h1{font-size:clamp(1.8rem,9vw,2.5rem)}}
</style>
