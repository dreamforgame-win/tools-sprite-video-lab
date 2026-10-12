/* Loaded only by the static showcase build. No requests leave this adapter. */
(() => {
  const base = '/app/demo-assets/';
  const date = '2026-10-12T08:30:00Z';
  const categories = [['character', '角色'], ['scene', '场景'], ['ui', 'UI'], ['icon', '图标'], ['effect', '特效'], ['other', '其他']];
  const seeds = [
    ['moss', '苔苔 · 森林向导', 'character'], ['fox', '琥珀 · 旅行商人', 'character'],
    ['forest', '晨光林地', 'scene'], ['night', '萤火秘境', 'scene'],
    ['panel', '探险任务面板', 'ui'], ['potion', '月露药水', 'icon'],
    ['gem', '森林结晶', 'icon'], ['burst', '治愈光环', 'effect'],
  ];
  const project = { id: 'demo-forest', slug: 'forest-island', display_name: '森屿探险',
    description: '从风格探索到工程交付的一套示例素材。可浏览、筛选、切换画布与查看大图；所有数据均为演示。',
    project_type: 'horizontal-game', aspect_ratio: '16:9', available: true, root_path: '展示项目 / 森屿探险',
    cover_relative_path: 'forest.svg', created_at: date, updated_at: date,
    default_background: 'transparent', default_image_count: 1 };
  const records = seeds.map(([id, name, category], index) => ({ id: `demo-${id}`, project_id: project.id,
    asset_node_id: `asset-${id}`, asset_name: name, title: name, name, media_type: 'image', status: 'succeeded',
    lifecycle_status: index < 6 ? 'in_library' : 'candidate', local_url: `${base}${id}.svg`,
    relative_path: `${id}.svg`, file_name: `${id}.svg`, width: category === 'scene' ? 960 : 512,
    height: category === 'scene' ? 540 : 512, created_at: date, updated_at: date,
    style_direction_id: index === 3 ? 'style-moon' : 'style-forest', model: 'demo-illustration',
    prompt: `${name}，森屿探险的${categories.find(c => c[0] === category)[1]}素材。柔和自然配色，简洁轮廓，层次清晰。示例插画，非在线生成结果。`,
    params: { aspect_ratio: category === 'scene' ? '16:9' : '1:1', resolution: '1K', background: category === 'scene' ? 'opaque' : 'transparent' },
  }));
  const assets = seeds.map(([id, name, category], i) => ({ id: `library-${id}`, name, category,
    status: i < 5 ? 'confirmed' : 'in_library', tags: ['森屿探险', '示例素材'], url: `${base}${id}.svg`,
    file_name: `${id}.svg`, file_format: 'svg', width: records[i].width, height: records[i].height,
    bytes: 4096, background: category === 'scene' ? 'opaque' : 'transparent',
    source_asset_node_id: `asset-${id}`, created_at: date, updated_at: date }));
  const styles = [
    { id: 'style-forest', name: '晨光森屿', status: 'confirmed', description: '暖金晨光、苔绿植被与圆润角色。清晰剪影适配游戏素材。', prompt: '柔和色块，手绘质感，森林童话，暖色光影。', cover_image_id: 'demo-forest', reference_images: [{ relative_path: 'forest.svg', display_name: '晨光林地 · 场景参考' }, { relative_path: 'moss.svg', display_name: '苔苔 · 角色参考' }], created_at: date, updated_at: date },
    { id: 'style-moon', name: '月下萤火', status: 'selected', description: '蓝紫夜色与薄荷色光点，用于夜间关卡。', prompt: '月光，蓝紫森林，萤火虫，层叠远景。', cover_image_id: 'demo-night', reference_images: [{ relative_path: 'night.svg', display_name: '萤火秘境 · 配色参考' }], created_at: date, updated_at: date },
  ];
  const nodes = [...categories.map(([key, name]) => ({ id: `category-${key}`, name, type: 'category', category: key, parent_id: null })),
    ...seeds.map(([id, name, category]) => ({ id: `asset-${id}`, name, type: 'asset', category, parent_id: `category-${category}`, description: `${name}的示例生产节点` }))];
  const models = [
    ['birefnet-hr-matting', 'BiRefNet · 示例状态', 'AI 主体抠图', true],
    ['corridorkey', 'CorridorKey · 示例状态', '绿幕/蓝幕精修', false],
    ['realesrgan', 'Real-ESRGAN · 示例状态', 'MAGIC / 线稿清理', true],
    ['ffmpeg', 'FFmpeg · 示例状态', '基础视频工具', true],
  ].map(([key, label, category, ready]) => ({ key, label, category, ready, downloadable: !ready, kind: 'tool', description: '仅展示本地完整版的依赖管理界面，本站未安装此工具。', path: '示例环境', detail: '演示数据' }));
  const guide = { id: 'guide-forest', title: '森屿探险 · 美术指导包', style_direction_id: 'style-forest', draft_revision: 1,
    latest_published_version: 1, latest_published_version_id: 'guide-v1', confirmed_version: 1, confirmed_version_id: 'guide-v1', is_default: false };
  const guideVersion = { id: 'guide-v1', version: 1, title: guide.title, published_at: date, style_board_relative_path: 'forest.svg',
    visual_guide: { mode: 'modular', model: '示例插画' }, resource_count: 5,
    core: { vision_statement: '温暖、可探索的森林童话；轮廓清楚，角色与环境色彩统一。', world_tone: '治愈、轻冒险', themes: ['自然','探索','陪伴'], palette: ['#356c52','#e2ac56','#fff0cf'], shape_language: '圆润几何形与柔和色块', references: [{ id: 'ref-forest', name: '晨光林地', relative_path: 'forest.svg', roles: ['style-anchor'] }] },
    modules: Object.fromEntries([['character','moss'],['environment','forest'],['ui_hud','panel'],['props_equipment','potion'],['skill_vfx','burst']].map(([key,id]) => [key, { enabled: true, summary: `${key} 模块的示例规范`, rules: ['保持完整剪影','统一自然配色'], references: [{ id: `ref-${key}`, name: id, relative_path: `${id}.svg`, roles: [key] }] }])) };
  const canvasStore = new Map();
  const clone = value => structuredClone(value);
  const blocked = '展示模式：此操作需要本地完整版，未执行生成、处理或文件写入。可继续浏览示例结果。';
  async function request(url, options = {}) {
    const p = new URL(url, 'https://demo.invalid').pathname;
    const method = options.method || 'GET';
    const payload = options.body || {};
    const ok = value => clone({ ok: true, ...value });
    if (p === '/api/v1/projects/select') return ok({ project });
    if (p === '/api/v1/projects/leave') return ok({});
    if (p.includes('/canvases/')) {
      if (method === 'POST') canvasStore.set(p, clone(payload.canvas));
      return ok({ canvas: canvasStore.get(p) || { viewport: { x: 0, y: 0, zoom: 1 }, nodes: [], groups: [] } });
    }
    if (p === '/api/v1/generation/estimate') return ok({ estimate: { available: false, reason: '展示模式不计费' } });
    if (p.endsWith('/compile-preview')) return ok({ compiled: { can_continue: true, references: guideVersion.core.references, module_types: payload.module_types || [], warnings: [], prompt: '森屿探险：柔和色块、自然色谱、清晰剪影（示例）' } });
    if (method !== 'GET') throw new Error(blocked);
    if (p === '/api/v1/projects') return ok({ projects: [project], default_parent_path: '展示项目', active_project_id: '' });
    if (p === `/api/v1/projects/${project.id}`) return ok({ project });
    if (p === '/api/local-profile') return ok({ profile: { name: '展示访客', avatar_url: `${base}moss.svg`, mcp: { configured: false } } });
    if (p === '/api/output-path') return ok({ output_path: '展示模式 · 不写入本地文件' });
    if (p === '/api/models') return ok({ models, summary: { total: 4, ready: 3, missing: 1, cache_root: '示例模型缓存', tools_root: '示例工具目录' } });
    if (p === '/api/v1/generation/models') return ok({ models: [{ id: 'demo-illustration', display_name: '插画模型（仅示例）', aspect_ratios: ['1:1','16:9'], resolutions: ['1K'], max_reference_images: 4 }] });
    if (p === '/api/v1/generation/history') return ok({ history: records });
    if (p.endsWith('/dashboard')) return ok({ dashboard: { progress: 57, categories: categories.map(([key, label]) => ({ key, label, completed: seeds.filter(s => s[2] === key).length, target: key === 'character' ? 4 : 2 })) } });
    if (p.endsWith('/events')) return ok({ events: [{ type: 'project.created', actor: '展示团队', created_at: date }, { type: 'library.assets-ingested', actor: '展示团队', created_at: date }] });
    if (p.endsWith('/workflow-runs')) return ok({ workflow_runs: [{ id: 'demo-run', request: '示例工作流：角色设计 → 抠图 → 入库', status: 'succeeded', actor: '演示', updated_at: date }] });
    if (p.endsWith('/styles')) return ok({ styles });
    if (p.endsWith('/style-guides')) return ok({ style_guides: [guide] });
    if (p.endsWith('/versions')) return ok({ versions: [guideVersion] });
    if (p.endsWith('/versions/guide-v1')) return ok({ version: guideVersion });
    if (p.endsWith('/draft')) return ok({ draft: { ...guideVersion, revision: 1, summary: '森屿的角色、场景与交互素材规范' } });
    if (p.endsWith('/visual-runs')) return ok({ runs: [] });
    if (p.endsWith('/asset-tree')) return ok({ asset_tree: { nodes } });
    if (p.endsWith('/library')) return ok({ assets });
    if (p.endsWith('/generation-results')) return ok({ results: records });
    if (p.endsWith('/trash')) return ok({ items: [{ id: 'trash-draft', name: '苔苔 · 早期配色草稿', object_id: 'draft-moss', object_type: 'generation_result', source_module: '风格探索', trashed_at: date }] });
    if (p.endsWith('/integration')) return ok({ integration: { target_root: '示例工程 / ForestIsland/assets', mappings: Object.fromEntries(categories.map(([key]) => [key, `art/${key}`])), deployments: [{ id: '示例交付 #001', status: 'succeeded（示例）', created_at: date, files: assets.slice(0, 5) }] } });
    if (p === '/api/v1/agent/manifest') return ok({ manifest: { version: 'demo', description: '展示模式不提供 Agent 执行服务', actions: [] } });
    throw new Error(blocked);
  }
  window.SpriteDemo = { request, project, assets, records, base, blocked };
})();
