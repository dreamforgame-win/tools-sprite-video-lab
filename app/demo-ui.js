/* Showcase-only integration: reuse the production renderers and controls. */
(() => {
  const demo = window.SpriteDemo;
  const url = name => demo.base + name + '.svg';
  const frame = (name, index = 0) => ({ index, name: `${name}.svg`, original_name: `${name}.svg`, url: url(name), thumb_url: url(name), width: 512, height: 512 });
  const pages = [['project','项目总览'],['style','风格探索'],['aiCreation','图片生成'],['history','生成历史'],['image','图片处理'],['dual','双背景抠图'],['videoProcess','视频处理'],['video','序列帧提取'],['library','资产管理'],['integration','项目对接'],['trash','回收站'],['settings','项目设置'],['model','模型管理']];
  const notice = () => { setStatus(demo.blocked, 'warning'); document.getElementById('demoNotice').textContent = demo.blocked; };
  demo.syncPage = key => {
    const select = document.getElementById('demoPage');
    if (select) select.value = key === 'aiCreation' && state.aiCreation.view === 'history' ? 'history' : key;
  };

  function seedProcessing() {
    const names = ['moss-source', 'fox', 'potion', 'moss-black', 'moss-white'];
    const frames = names.map((name, i) => frame(name, i));
    state.imageUpload = { upload_id: 'demo-images', media_type: 'image_sequence', display_name: '森屿探险 · 素材组（示例）', source_frames: frames,
      media_info: { width: 512, height: 512, frame_count: frames.length }, frame_count: frames.length };
    state.imageJob = { job_id: 'demo-matte', upload_id: 'demo-images', source_media_type: 'image_sequence', frame_count: 5,
      processed_dir: '展示结果', options: { output_width: 512, output_height: 512, matte_mode: 'dual_background' },
      frames: ['moss','fox','potion','moss','moss'].map((name,i) => frame(name,i)) };
    state.imageSplit.byFrame = Object.fromEntries(frames.map((f,i) => [String(i), [{ id: `demo-box-${i}`, x: 100, y: 65, width: 300, height: 375, name: ['forest-guide','amber-merchant','moon-potion','guide-black','guide-white'][i] }]]));
    state.imageSplit.confirmed = true;
    state.dualBackground.black.index = '3';
    state.dualBackground.white.index = '4';
    renderImageWorkflow();
    const sequence = Array.from({ length: 12 }, (_, i) => frame(`frame-${i}`, i));
    applyUpload({ upload_id: 'demo-sequence', display_name: '苔苔 · 待机动画（12 帧示例）', media_type: 'image_sequence', media_url: url('frame-0'), image_url: url('frame-0'), source_frames: sequence,
      media_info: { width: 512, height: 512, fps: 12, duration: 1, frame_count: 12 }, frame_count: 12 });
    const job = { job_id: 'demo-sequence-result', source_media_type: 'image_sequence', frame_count: 12, frames: sequence,
      options: { output_width: 512, output_height: 512, output_scale: 1, keep_every: 1, matte_mode: 'none' } };
    state.extractJob = structuredClone(job);
    state.job = structuredClone(job);
    state.extractSelected = new Set(sequence.map(f => f.index));
    state.selected = new Set(sequence.map(f => f.index));
    state.preview.isPlaying = false;
    state.extractPreview.isPlaying = false;
    renderExtractJob();
    renderJob();
  }

  async function prepareVideo() {
    // Produce a tiny sample clip in memory; never upload or process visitor files.
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return;
    const type = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!type) return;
    const img = new Image(); img.src = url('forest'); await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 350000 });
    const chunks = [];
    recorder.ondataavailable = event => { if(event.data.size) chunks.push(event.data); };
    const done = new Promise(resolve => recorder.onstop = resolve);
    recorder.start();
    for(let i=0;i<24;i++) {
      ctx.drawImage(img,0,0,640,360);
      for(let k=0;k<6;k++) { ctx.fillStyle='#f9edac'; ctx.beginPath(); ctx.arc(90+k*89,210+Math.sin(i/4+k)*28,3,0,Math.PI*2); ctx.fill(); }
      await new Promise(resolve => setTimeout(resolve, 84));
    }
    recorder.stop(); await done; stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, { type });
    if (!blob.size) return;
    const videoUrl = URL.createObjectURL(blob);
    const upload = { upload_id: 'demo-video', display_name: '森屿 · 萤火片段（示例）', media_type: 'video', media_url: videoUrl, video_url: videoUrl,
      media_info: { width: 640, height: 360, duration: 2, fps: 12, frame_count: 24, bytes: blob.size } };
    state.videoProcess.upload = upload; state.videoProcess.library = [upload];
    state.videoProcess.settings.subtitles = [{ text: '森屿探险 · 示例片段', start: 0, end: 2 }];
    state.videoProcess.result = { url: videoUrl, path: '示例片段.webm', name: '示例片段（未实际压缩）', format: 'WebM', quality: '示例', width: 640, height: 360, bytes: blob.size, source_bytes: blob.size, output_bytes: blob.size, duration: 2 };
    renderVideoProcessModule();
    window.addEventListener('pagehide', () => URL.revokeObjectURL(videoUrl), { once: true });
  }

  demo.mount = () => {
    document.body.classList.add('demo-mode');
    const panel = document.createElement('aside');
    panel.className = 'demo-toolbar';
    panel.setAttribute('aria-label', '展示模式导航');
    panel.innerHTML = `<strong class="demo-label">仅展示 · 需本地部署</strong><span id="demoNotice" role="status">示例数据 · 不执行真实处理 · 刷新复位</span><label for="demoPage">预览界面</label><select id="demoPage"><option value="launcher">项目列表</option>${pages.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><button type="button" id="demoAnnouncementButton">公告</button><button type="button" id="demoReset">重置展示</button>`;
    document.body.append(panel);
    const announcement = document.createElement('dialog');
    announcement.id = 'demoAnnouncement';
    announcement.className = 'demo-announcement';
    announcement.setAttribute('aria-labelledby', 'demoAnnouncementTitle');
    announcement.setAttribute('aria-describedby', 'demoAnnouncementWarning');
    announcement.innerHTML = `<header class="demo-announcement-head"><div><p>灵帧工坊 · 功能展示站</p><h2 id="demoAnnouncementTitle">欢迎预览灵帧工坊</h2></div><button type="button" data-close-announcement aria-label="关闭公告">×</button></header>
      <div class="demo-announcement-body">
        <p id="demoAnnouncementWarning" class="demo-announcement-warning"><strong>本页面仅用于展示</strong><span>实际功能需要本地部署使用</span></p>
        <p>这里使用「森屿探险」示例项目展示界面与工作流程。你可以切换页面、浏览素材、查看大图和预览参数；本站不会执行真实生成、上传、处理或文件写入。</p>
        <h3>本地完整版已有功能</h3>
        <ul class="demo-feature-list">
          <li><strong>风格探索与图片生成</strong><span>参考图、风格模板、资产结构树、图片生成及历史管理。</span></li>
          <li><strong>图片处理</strong><span>主体抠图、双背景抠图、拆图、命名、压缩与导出。</span></li>
          <li><strong>视频与序列帧</strong><span>视频抽帧、透明帧预览、剪辑、字幕、拼接与压缩。</span></li>
          <li><strong>资产管理与项目对接</strong><span>素材筛选、确认入库、项目目录映射与交付预检。</span></li>
          <li><strong>模型与增强处理</strong><span>模型依赖管理、AI 抠图、MAGIC 线稿清理与超分处理。</span></li>
          <li><strong>项目与自动化</strong><span>文件化项目、回收站、项目设置及 Agent / CLI 工作流。</span></li>
        </ul>
        <p class="demo-announcement-note">AI 能力需在本地准备模型或配置生成服务；视频生成、音频生成仍待接入。示例改动刷新后复位。</p>
      </div>
      <footer class="demo-announcement-footer"><a href="https://github.com/dreamforgame-win/tools-sprite-video-lab#readme" target="_blank" rel="noopener noreferrer">查看本地部署说明 ↗</a><button class="primary-button" type="button" data-close-announcement autofocus>我知道了，开始预览</button></footer>`;
    document.body.append(announcement);
    announcement.querySelectorAll('[data-close-announcement]').forEach(button => button.addEventListener('click', () => announcement.close()));
    announcement.addEventListener('close', () => document.getElementById('demoAnnouncementButton').focus());
    document.getElementById('demoAnnouncementButton').addEventListener('click', () => announcement.showModal());
    document.getElementById('demoReset').addEventListener('click', () => location.reload());
    document.getElementById('demoPage').addEventListener('change', async event => {
      const key = event.target.value;
      if (key === 'launcher') { showProjectLauncher(); return; }
      if (!activeProjectId()) await enterProject(demo.project);
      if (key === 'history' || key === 'aiCreation') state.aiCreation.view = key === 'history' ? 'history' : 'image';
      setActiveModule(key === 'history' ? 'aiCreation' : key === 'dual' ? 'image' : key);
      if (key === 'dual') setActiveImagePage('dual', { announce: false, persist: false });
      else if (key === 'image') setActiveImagePage('full', { announce: false, persist: false });
      event.target.value = key;
    });
    const intro = document.querySelector('#projectLauncher .project-launcher-head p:last-child');
    if (intro) intro.textContent = '打开森屿探险，浏览一套完整的示例素材流程。也可从右下角直接切换界面。';
    // Block file pickers before native upload handlers; previews and local controls still work.
    document.addEventListener('click', event => {
      if (event.target.closest('input[type="file"]')) { event.preventDefault(); event.stopImmediatePropagation(); notice(); }
    }, true);
    document.addEventListener('drop', event => { if(event.dataTransfer?.files.length) { event.preventDefault(); event.stopImmediatePropagation(); notice(); } }, true);
    document.addEventListener('paste', event => { if(event.clipboardData?.files.length) { event.preventDefault(); event.stopImmediatePropagation(); notice(); } }, true);
    for (const id of ['projectCreateButton','projectOpenExistingButton']) document.getElementById(id)?.addEventListener('click', event => { event.stopImmediatePropagation(); notice(); }, true);
    // Model selection is a preview; no token/provider connection is configured.
    state.aiCreation.models = [{ id: 'demo-illustration', display_name: '插画模型（展示）', aspect_ratios: ['1:1','16:9'], resolutions: ['1K'] }];
    state.aiCreation.selectedModel = 'demo-illustration';
    renderGenerationModelOptions();
    seedProcessing();
    showProjectLauncher({ clearServerSelection: false });
    setStatus('展示已就绪：进入森屿探险，或使用「预览界面」切换。', 'success');
    announcement.showModal();
    void prepareVideo().catch(() => { document.getElementById('demoNotice').textContent = '当前浏览器不支持示例视频；可查看序列帧动画。'; });
  };
})();
