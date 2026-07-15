const DEFAULT_IMAGE_NAMING_SIZE_PRESETS = [
  { label: "512 x 512", width: 512, height: 512 },
  { label: "1024 x 1024", width: 1024, height: 1024 },
  { label: "2048 x 2048", width: 2048, height: 2048 },
];

const state = {
  projectWorkspace: {
    projects: [],
    activeProject: null,
    defaultParentPath: "",
    resourceNode: "assets",
    loading: true,
  },
  projectAssets: {
    activeView: { style: "list", library: "list", production: "list" },
    styles: [],
    library: [],
    trash: [],
    integration: null,
    dashboard: null,
    selectedId: "",
    selectedIds: new Set(),
    filters: { query: "", status: "all", category: "all", format: "all", background: "all" },
    styleGroup: "all",
    settingsTab: "basic",
    canvas: null,
    canvasType: "",
    canvasSelection: new Set(),
    canvasUndo: [],
    canvasRedo: [],
    canvasDrag: null,
    canvasTool: "select",
    canvasSaveTimer: null,
    canvasHost: null,
    canvasItems: [],
  },
  localProfile: {
    name: "游客",
    avatar_url: "",
    mcp: { configured: false, validated: false, model_count: 0, last_error: "" },
  },
  localProfileAvatarDataUrl: "",
  aiCreation: {
    view: "image",
    loaded: false,
    loading: false,
    assetTree: [],
    selectedAssetNodeId: "",
    expandedNodeIds: new Set(["category-character", "category-scene", "category-ui", "category-icon", "category-effect", "category-other"]),
    assetTreeQuery: "",
    models: [],
    history: [],
    selectedModel: "",
    selectedIds: new Set(),
    pollingIds: new Set(),
    pollTimers: new Map(),
    filters: { media: "all", status: "all", query: "" },
    resultFilters: { status: "all", type: "all", ratio: "all", background: "all", time: "all", sort: "newest" },
    deleteIds: [],
  },
  activeModule: "video",
  activeImagePage: "full",
  activeImageTool: "import",
  imageUpload: null,
  imageImportFiles: [],
  imageClipboardHasImage: false,
  imageClipboardChecked: false,
  imageJob: null,
  imageSelectedIndex: 0,
  imageSplitSelectedIndex: 0,
  imageSplitDetectionStrength: 3,
  imagePreviewLinked: false,
  dualBackground: {
    black: { mode: "import", index: "", file: null, url: "", name: "" },
    white: { mode: "import", index: "", file: null, url: "", name: "" },
    activePasteTarget: "black",
    result: null,
  },
  upload: null,
  extractJob: null,
  job: null,
  exportResult: null,
  processPreview: null,
  extractSelected: new Set(),
  extractSelectionTouched: false,
  extractOrderedSelectionMode: false,
  extractSelectionOrder: [],
  extractSimilarity: null,
  extractSimilarityInFlight: false,
  selected: new Set(),
  orderedSelectionMode: false,
  selectionOrder: [],
  segment: { start: 0, end: 0, startFrame: 1, endFrame: 1, confirmed: false },
  segmentPlaybackRafId: null,
  preview: {
    rafId: null,
    currentIndex: 0,
    isPlaying: true,
    isReversed: false,
    renderToken: 0,
    warmupToken: 0,
    imageCache: new Map(),
    background: "#F6FBF6",
  },
  extractPreview: {
    rafId: null,
    currentIndex: 0,
    isPlaying: true,
    isReversed: false,
    renderToken: 0,
    warmupToken: 0,
    background: "#F6FBF6",
  },
  magicPreview: null,
  magicInFlight: false,
  magicResizeMode: "hard",
  processPreviewZoom: {
    source: 100,
    processed: 100,
  },
  processPreviewBackground: {
    mode: "checkerboard",
    color: "#F6FBF6",
  },
  processPreviewPan: {
    source: { x: 0, y: 0 },
    processed: { x: 0, y: 0 },
  },
  processPreviewDrag: null,
  imageProcessPreview: null,
  imageProcessPreviewZoom: {
    source: 100,
    processed: 100,
  },
  imageProcessPreviewBackground: {
    mode: "checkerboard",
    color: "#F6FBF6",
  },
  imagePreviewBackgrounds: {
    source: { mode: "checkerboard", color: "#F6FBF6" },
    processed: { mode: "checkerboard", color: "#F6FBF6" },
  },
  imageProcessPreviewPan: {
    source: { x: 0, y: 0 },
    processed: { x: 0, y: 0 },
  },
  imageProcessPreviewDrag: null,
  imageManualRepair: {
    enabled: false,
    mode: "keep",
    radius: 18,
    tolerance: 28,
    feather: 6,
    soften: 2,
    brushActive: false,
    brushPoints: [],
  },
  imageSplit: {
    byFrame: {},
    skipped: false,
    confirmed: false,
    selectedId: null,
    selectedIds: [],
    drag: null,
    view: {
      zoom: 100,
      pan: { x: 0, y: 0 },
      backgroundMode: "transparent",
      background: "#fffef9",
    },
  },
  imageNaming: {
    names: {},
    sizes: {},
    batch: {},
    sizePresets: DEFAULT_IMAGE_NAMING_SIZE_PRESETS.map((preset) => ({ ...preset })),
    exportMode: "folder",
    compression: {},
    excludedKeys: [],
    collapsedGroups: {},
    nineSlice: {},
    confirmed: false,
  },
  imageLightboxBackground: {
    mode: "opaque",
    color: "#ffffff",
  },
  resourceManager: {
    view: "overview",
    projects: [],
    activeProjectId: "",
    editProjectId: "",
    folderAssets: {},
    folderDirs: {},
    activeFolderTab: "all",
    collapsedFolders: {},
  },
  resourceSelection: new Set(),
  resourceDragSelection: null,
  modelManager: {
    models: [],
    summary: null,
    activeKey: "",
    activeAction: "",
    highlightKey: "",
    progressByKey: {},
    progressTimers: {},
  },
  videoProcess: {
    upload: null,
    library: [],
    selectedUploadId: "",
    activeTool: "import",
    result: null,
    settings: {
      format: "mp4",
      quality: "balanced",
      width: "",
      height: "",
      fps: "",
      name: "",
      mute: false,
      trimStart: "",
      trimEnd: "",
      segments: [],
      subtitles: [],
      subtitleText: "",
      subtitleStart: "",
      subtitleEnd: "",
      subtitleSize: 32,
      subtitlePosition: "bottom",
      subtitleColor: "#ffffff",
      subtitleBox: "boxed",
    },
  },
  processProgressTimerId: null,
  processProgressTarget: "process",
};

const els = {};
const STORAGE_KEY = "sprite-video-lab-session-v2";
const THEME_STORAGE_KEY = "sprite-video-lab-theme-v1";
const RUNTIME_MODEL_PROMPT_KEY = "sprite-forge-lab-runtime-model-prompt-v1";
const PRODUCT_TITLE = "\u7075\u5E27\u5DE5\u574A";
const PRODUCT_SUBTITLE = "Sprite Forge Lab";
const MATTE_MODE_BASE_LABELS = {
  edge_connected_chroma: "\u8FB9\u754C\u80CC\u666F\u62A0\u56FE\uFF08\u5FEB\u901F\u4FDD\u5185\uFF09",
  subject_protect_chroma: "\u4E3B\u4F53\u4FDD\u62A4\u62A0\u56FE\uFF08AI\u6162\u901F\uFF09",
  chroma: "色键抠图",
  birefnet: "\u53EA\u7528 BiRefNet",
  corridorkey: "\u53EA\u7528 CorridorKey",
  luma: "\u53EA\u7528 Luma",
  birefnet_corridorkey: "BiRefNet \u7C97\u8499\u7248 / CorridorKey \u7CBE\u4FEE\u8FB9\u7F18",
  birefnet_corridorkey_key: "BiRefNet \u540E\u518D\u7528 CorridorKey \u6536\u7D27\u62A0\u56FE",
  birefnet_luma: "BiRefNet \u4FDD\u4E3B\u4F53 / Luma \u8865\u4EAE\u90E8",
  birefnet_luma_key: "BiRefNet \u540E\u518D\u7528 Luma \u6536\u7D27\u62A0\u56FE",
  birefnet_luma_corridorkey: "BiRefNet + Luma \u5408\u5E76\u540E / CorridorKey \u7CBE\u4FEE",
  none: "\u4E0D\u62A0\u56FE\uFF0C\u53EA\u7F29\u653E\u5BF9\u9F50",
};
const BIREFNET_DEPENDENCY_KEYS = ["python-torch", "python-torchvision", "python-transformers", "python-huggingface_hub", "python-timm"];
const CORRIDORKEY_DEPENDENCY_KEYS = ["corridorkey", "python-torch", "python-numpy", "python-cv2"];
const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm", ".gif"];
const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];
const SUPPORTED_UPLOAD_EXTENSIONS = [...SUPPORTED_VIDEO_EXTENSIONS, ...SUPPORTED_IMAGE_EXTENSIONS];
const AI_RESOLUTION_MIN = 256;
const AI_RESOLUTION_MAX = 2560;
const AI_RESOLUTION_STEP = 32;
const AI_RESOLUTION_DEFAULT = 1024;
const AI_RESOLUTION_AUTO = "auto";
const IMAGE_LIGHTBOX_ZOOM_MIN = 0.25;
const IMAGE_LIGHTBOX_ZOOM_MAX = 8;
const AI_MODEL_AUTO = "birefnet-hr-matting";
const AI_DEVICE_AUTO = "auto";
const OUTPUT_SCALE_MIN_PERCENT = 5;
const OUTPUT_SCALE_MAX_PERCENT = 200;
const OUTPUT_SCALE_DEFAULT_PERCENT = 100;
const EXTRACT_SIMILARITY_NEAR_FRAME_COUNT = 4;
const EXTRACT_SIMILARITY_THUMB_SIZE = 16;
const EXTRACT_SIMILARITY_DEFAULT_THRESHOLD = 80;
const EXTRACT_SIMILARITY_GROUP_COLORS = [
  "#0d9b61",
  "#2f66d0",
  "#b45f36",
  "#a43dc2",
  "#d18a00",
  "#008a9c",
  "#d83d6c",
  "#5c7c00",
];
const MAGIC_VARIANT_CONFIGS = [
  {
    key: "half",
    label: "MAGIC 1/2",
    panelId: "magicPreviewPanel",
    canvasId: "magicPreviewCanvas",
    emptyId: "magicPreviewEmptyState",
    frameLabelId: "magicPreviewFrameLabel",
    countId: "magicPreviewSelectedCount",
    progressFillId: "magicPreviewProgressFill",
    progressLabelId: "magicPreviewProgressLabel",
    sizeLabelId: "magicOutputSizeLabel",
    exportButtonId: "exportMagicFramesButton",
  },
  {
    key: "quarter",
    label: "MAGIC 1/4",
    panelId: "magicQuarterPreviewPanel",
    canvasId: "magicQuarterPreviewCanvas",
    emptyId: "magicQuarterPreviewEmptyState",
    frameLabelId: "magicQuarterPreviewFrameLabel",
    countId: "magicQuarterPreviewSelectedCount",
    progressFillId: "magicQuarterPreviewProgressFill",
    progressLabelId: "magicQuarterPreviewProgressLabel",
    sizeLabelId: "magicQuarterOutputSizeLabel",
    exportButtonId: "exportMagicQuarterFramesButton",
  },
  {
    key: "eighth",
    label: "MAGIC 1/8",
    panelId: "magicEighthPreviewPanel",
    canvasId: "magicEighthPreviewCanvas",
    emptyId: "magicEighthPreviewEmptyState",
    frameLabelId: "magicEighthPreviewFrameLabel",
    countId: "magicEighthPreviewSelectedCount",
    progressFillId: "magicEighthPreviewProgressFill",
    progressLabelId: "magicEighthPreviewProgressLabel",
    sizeLabelId: "magicEighthOutputSizeLabel",
    exportButtonId: "exportMagicEighthFramesButton",
  },
];
const MAGIC_RESIZE_MODE_LABELS = {
  hard: "\u786C",
  soft: "\u8F6F",
};
let hotReloadVersion = null;
let hotReloadTimerId = null;
let uploadDragDepth = 0;
let workflowObserver = null;
let workflowScrollRafId = null;
let resourceExportContext = "matte";
let resourceExportSelectedKeys = new Set();
let resourceExportActiveGroupKey = "";
let resourceExportTargetProjectId = "";
let imageLightboxEditContext = null;
let imageNamingFormatBrush = null;
let imageNineSliceEditorState = null;
let projectSlugEdited = false;

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  initSunnyStageTheme();
  ensureWorkflowPanelOrder();
  createImageProcessPanel();
  bindEvents();
  setActiveModule(state.activeModule, { announce: false });
  setActiveImagePage(state.activeImagePage, { announce: false, persist: false });
  setActiveImageTool(state.activeImageTool, { announce: false });
  renderImageWorkflow();
  mergeSegmentRangeControls();
  renderLocalProfile();
  void loadLocalProfile();
  updatePreviewBackground(state.preview.background, false);
  updateExtractPreviewBackground(state.extractPreview.background, false);
  updateProcessPreviewBackground(state.processPreviewBackground.mode, state.processPreviewBackground.color, false, "video");
  updateProcessPreviewBackground(state.imageProcessPreviewBackground.mode, state.imageProcessPreviewBackground.color, false, "image");
  renderImagePreviewBackground("source");
  renderImagePreviewBackground("processed");
  syncManualColorLabel("video");
  syncManualColorLabel("image");
  updateChromaVisibility("video");
  updateChromaVisibility("image");
  updateImagePreviewLinkButtons();
  setImageSplitDetectionStrength(state.imageSplitDetectionStrength);
  normalizePreviewInterval();
  normalizeExtractPreviewInterval();
  updatePreviewControls(0);
  updateExtractPreviewControls(0);
  drawPreviewPlaceholder();
  drawExtractPreviewPlaceholder();
  resetProcessPreview("video");
  resetProcessPreview("image");
  updateSegmentConfirmationUI();
  showExtractWorkbench();
  showAnimationWorkbench();
  setStatus("\u7B49\u5F85\u5BFC\u5165\u7D20\u6750\u3002");
  void checkRuntimeReadiness();
  void refreshModelManager();
  void loadOutputPath();
  restoreSessionFromStorage();
  initWorkflowNavigation();
  enforceAutomaticAiSettings(false);
  startHotReloadPolling();
  void initializeProjectWorkspace();
  window.addEventListener("beforeunload", persistSession);
});

function imageMatteId(id) {
  return `image${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

function bindElements() {
  [
    "appEyebrow",
    "appTitle",
    "moduleSwitch",
    "projectLauncher",
    "projectLauncherGrid",
    "projectCreateButton",
    "projectOpenExistingButton",
    "projectSidebar",
    "projectBackButton",
    "projectSidebarName",
    "projectSidebarPath",
    "projectDashboard",
    "projectDashboardTitle",
    "projectDashboardDescription",
    "projectDashboardStatus",
    "projectDashboardProgress",
    "projectDashboardProgressBar",
    "projectDashboardCategories",
    "projectDashboardCover",
    "projectDashboardType",
    "projectDashboardRatio",
    "projectDashboardCreated",
    "projectDashboardSlug",
    "projectDashboardPath",
    "projectActivityList",
    "projectAssetModule",
    "projectAssetModuleKicker",
    "projectAssetModuleTitle",
    "projectAssetModuleActions",
    "projectAssetModuleBody",
    "projectCreateDialog",
    "projectCreateForm",
    "projectCreateCloseButton",
    "projectCreateCancelButton",
    "projectCreateSubmitButton",
    "projectNameInput",
    "projectSlugInput",
    "projectTypeInput",
    "projectAspectRatioInput",
    "projectCustomAspectRatioField",
    "projectCustomAspectRatioInput",
    "projectDescriptionInput",
    "projectStyleTagsInput",
    "projectCreateModeInput",
    "projectReferenceImagesField",
    "projectReferenceImagesInput",
    "projectTemplateField",
    "projectTemplateInput",
    "projectTemplateMoreButton",
    "projectTemplateHelp",
    "projectParentPathInput",
    "projectChooseParentButton",
    "projectRootPreview",
    "moduleVideoButton",
    "moduleVideoProcessButton",
    "moduleAiCreationButton",
    "moduleImageButton",
    "moduleResourceButton",
    "moduleModelButton",
    "themeLightButton",
    "themeDarkButton",
    "sourceStrip",
    "videoModule",
    "videoProcessModule",
    "aiCreationModule",
    "aiAssetTreeCount",
    "aiAssetNodeAddButton",
    "aiAssetGroupAddButton",
    "aiAssetTreeSearchInput",
    "aiAssetTree",
    "aiAssetNodeRenameButton",
    "aiAssetNodeDeleteButton",
    "aiCurrentNodeTitle",
    "aiCurrentNodeMeta",
    "aiChildAssetGrid",
    "aiCurrentAssetInput",
    "aiImageViewButton",
    "aiHistoryViewButton",
    "aiCreatePanel",
    "aiConnectionBadge",
    "aiTokenNotice",
    "aiOpenProfileButton",
    "aiPromptInput",
    "aiAssetDescriptionInput",
    "aiModelSelect",
    "aiAspectRatioSelect",
    "aiResolutionSelect",
    "aiBackgroundSelect",
    "aiCountSelect",
    "aiReferenceImageInput",
    "aiProjectStyleInput",
    "aiNegativePromptInput",
    "aiModelMeta",
    "aiGenerateButton",
    "aiImageWorkspace",
    "aiProductionListViewButton",
    "aiProductionCanvasViewButton",
    "aiProductionCanvasWorkspace",
    "aiProductionCanvasHost",
    "aiHistoryWorkspace",
    "aiResultSummary",
    "aiResultStatusFilter",
    "aiResultTypeFilter",
    "aiResultRatioFilter",
    "aiResultBackgroundFilter",
    "aiResultTimeFilter",
    "aiResultSortSelect",
    "aiResultGrid",
    "aiRefreshHistoryButton",
    "aiHistoryMediaFilter",
    "aiHistoryStatusFilter",
    "aiHistorySearchInput",
    "aiHistorySelectVisibleButton",
    "aiHistoryClearSelectionButton",
    "aiHistoryGrid",
    "aiHistorySelectionBar",
    "aiHistorySelectionCount",
    "aiHistoryAddToImageButton",
    "aiHistoryAddToLibraryButton",
    "aiHistoryDeleteButton",
    "aiTaskCount",
    "aiTaskList",
    "videoProcessImportToolButton",
    "videoProcessPreviewToolButton",
    "videoProcessCompressToolButton",
    "videoProcessEditToolButton",
    "videoProcessImportPanel",
    "videoProcessPreviewPanel",
    "videoProcessCompressPanel",
    "videoProcessEditPanel",
    "videoProcessPathInput",
    "videoProcessImportPathButton",
    "videoProcessDropzone",
    "videoProcessUploadInput",
    "videoProcessImportSummary",
    "videoProcessAssetList",
    "videoProcessEditImportButton",
    "videoProcessEditAssetList",
    "imageModule",
    "resourceModule",
    "modelModule",
    "modelRefreshButton",
    "modelSummary",
    "modelList",
    "resourceOverviewPage",
    "resourceDetailPage",
    "resourceCreateProjectButton",
    "resourceBackToProjectsButton",
    "resourceProjectList",
    "resourceProjectTitle",
    "resourceRenameProjectButton",
    "resourceProjectEditDialog",
    "resourceProjectEditTitle",
    "resourceProjectEditCloseButton",
    "resourceProjectEditNameInput",
    "resourceProjectEditSaveButton",
    "resourceProjectEditDeleteButton",
    "resourceExportProjectDialog",
    "resourceExportProjectTitle",
    "resourceExportProjectCloseButton",
    "resourceExportProjectList",
    "resourceExportPreviewList",
    "resourceExportGroupTabs",
    "resourceExportSelectionSummary",
    "resourceExportSelectAllButton",
    "resourceExportClearAllButton",
    "resourceExportSelectCurrentPageButton",
    "resourceExportConfirmButton",
    "resourceMoveDialog",
    "resourceMoveCloseButton",
    "resourceMoveTargetList",
    "resourceBindFolderButton",
    "resourceProjectSummary",
    "resourceFolderInput",
    "resourceFolderList",
    "resourceRefreshFolderButton",
    "resourceFolderTabs",
    "resourceAssetGrid",
    "resourceSelectionBar",
    "resourceSelectionCount",
    "resourceDeleteSelectedButton",
    "resourceMoveSelectedButton",
    "imageFullFlowTabButton",
    "imageDualMatteTabButton",
    "imageFullFlowPage",
    "imageDualMattePage",
    "dualBlackImportSelect",
    "dualWhiteImportSelect",
    "dualBlackFileInput",
    "dualWhiteFileInput",
    "dualBlackPreview",
    "dualWhitePreview",
    "dualPasteBlackButton",
    "dualPasteWhiteButton",
    "dualClearBlackButton",
    "dualClearWhiteButton",
    "dualMatteBiasInput",
    "dualMatteFeatherInput",
    "dualMatteTrimInput",
    "dualMatteRunButton",
    "dualMatteSummary",
    "dualResultPreview",
    "dualResultSummary",
    "dualExportButton",
    "dualExportResourceButton",
    "dualGoSplitButton",
    "imageImportPanel",
    "imagePreviewPanel",
    "imageMattePanel",
    "imageSplitPanel",
    "imageSplitPreviewPanel",
    "imageSplitPreviewList",
    "imageSplitPreviewSummary",
    "imageSplitPreviewBackButton",
    "imageSplitPreviewExportButton",
    "imageNamingPanel",
    "imageResultPanel",
    "imageMatteModuleHost",
    "imageResultPreviewHost",
    "imageDropzone",
    "imageImportGallery",
    "imageUploadInput",
    "imageImportButton",
    "imagePasteButton",
    "imageClearButton",
    "imageImportSummary",
    "imagePreviewImage",
    "imagePreviewEmpty",
    "imagePreviewNote",
    "imagePreviewSummary",
    "imageExportResultButton",
    "imageExportToResourceButton",
    "imageStartSplitButton",
    "imageResultCount",
    "imageResultGrid",
    "imageSplitTabs",
    "imageSplitStage",
    "imageSplitEmpty",
    "imageSplitImage",
    "imageSplitOverlay",
    "imageSplitZoomInput",
    "imageSplitZoomLabel",
    "imageSplitFitButton",
    "imageSplitCenterButton",
    "imageSplitTransparentBgButton",
    "imageSplitSolidBgButton",
    "imageSplitBackgroundColorField",
    "imageSplitBackgroundInput",
    "imageSplitAnalyzeButton",
    "imageSplitSkipButton",
    "imageSplitConfirmButton",
    "imageSplitAddBoxButton",
    "imageSplitDeleteBoxButton",
    "imageSplitMergeBoxButton",
    "imageSplitSummary",
    "imageSplitStrengthInput",
    "imageSplitStrengthLabel",
    "imageSplitBoxXInput",
    "imageSplitBoxYInput",
    "imageSplitBoxWInput",
    "imageSplitBoxHInput",
    "imageSplitBoxList",
    "imageNamingList",
    "imageNamingSummary",
    "imageNamingBackButton",
    "imageNamingExportToResourceButton",
    "imageNamingConfirmButton",
    "imageLightbox",
    "imageLightboxImage",
    "imageLightboxCaption",
    "imageLightboxCloseButton",
    "imageLightboxTransparentButton",
    "imageLightboxOpaqueButton",
    "imageLightboxColorInput",
    "imageLightboxColorField",
    "imageLightboxNamingEditor",
    "imageLightboxNameInput",
    "imageLightboxWidthInput",
    "imageLightboxHeightInput",
    "imageLightboxAspectLockInput",
    "imageLightboxFitModeInput",
    "imageLightboxNoneModeInput",
    "imageLightboxModeLabel",
    "imageLightboxNineSliceButton",
    "imageNineSliceEditor",
    "imageNineSliceCanvas",
    "imageNineSlicePreviewCanvas",
    "imageNineSliceLeftInput",
    "imageNineSliceRightInput",
    "imageNineSliceTopInput",
    "imageNineSliceBottomInput",
    "imageNineSliceTargetWidthInput",
    "imageNineSliceTargetHeightInput",
    "imageNineSliceStretchModeInput",
    "imageNineSliceShrinkModeInput",
    "imageNineSliceZoomOutButton",
    "imageNineSliceZoomInButton",
    "imageNineSliceFitButton",
    "imageNineSliceCenterButton",
    "imageNineSliceCancelButton",
    "imageNineSliceSaveButton",
    "imageNineSliceExportResourceButton",
    "imageNineSliceStatus",
    "pathInput",
    "importPathButton",
    "outputPathInput",
    "saveOutputPathButton",
    "uploadDropzone",
    "uploadInput",
    "localProfileButton",
    "accountName",
    "localProfileAvatar",
    "localProfileAvatarFallback",
    "localProfileMcpStatus",
    "localProfileDialog",
    "localProfileCloseButton",
    "localProfileAvatarPreview",
    "localProfileAvatarPreviewFallback",
    "localProfileAvatarInput",
    "localProfileNameInput",
    "localProfileTokenInput",
    "localProfileConnectionStatus",
    "localProfileModelButton",
    "localProfileClearTokenButton",
    "localProfileTestButton",
    "localProfileSaveButton",
    "aiPreviewDialog",
    "aiPreviewDialogTitle",
    "aiPreviewCloseButton",
    "aiPreviewImage",
    "aiPreviewCaption",
    "aiDeleteDialog",
    "aiDeleteCloseButton",
    "aiDeleteSummary",
    "aiDeleteInitialActions",
    "aiDeleteRecordOnlyButton",
    "aiDeleteWithFilesButton",
    "aiDeleteConfirmFiles",
    "aiDeleteBackButton",
    "aiDeleteConfirmFilesButton",
    "videoName",
    "videoSize",
    "videoFps",
    "videoDuration",
    "videoProcessPreview",
    "videoProcessEmpty",
    "videoProcessCompressPreview",
    "videoProcessCompressEmpty",
    "videoProcessCompressSummary",
    "videoProcessEditPreview",
    "videoProcessEditControls",
    "videoProcessEditCurrentTime",
    "videoProcessEditSeekInput",
    "videoProcessEditDuration",
    "videoProcessUseCurrentTrimStartButton",
    "videoProcessUseCurrentTrimEndButton",
    "videoProcessUseCurrentSegmentStartButton",
    "videoProcessUseCurrentSegmentEndButton",
    "videoProcessUseCurrentSubtitleStartButton",
    "videoProcessUseCurrentSubtitleEndButton",
    "videoProcessEditEmpty",
    "videoProcessSummary",
    "videoProcessSourceSelect",
    "videoProcessFormatInput",
    "videoProcessQualityInput",
    "videoProcessWidthInput",
    "videoProcessHeightInput",
    "videoProcessFpsInput",
    "videoProcessNameInput",
    "videoProcessMuteInput",
    "videoProcessTrimStartInput",
    "videoProcessTrimEndInput",
    "videoProcessSegmentStartInput",
    "videoProcessSegmentEndInput",
    "videoProcessAddSegmentButton",
    "videoProcessAddFullClipButton",
    "videoProcessSplitAtPlayheadButton",
    "videoProcessClearSegmentsButton",
    "videoProcessSegmentList",
    "videoProcessSubtitleTextInput",
    "videoProcessSubtitleStartInput",
    "videoProcessSubtitleEndInput",
    "videoProcessSubtitleSizeInput",
    "videoProcessSubtitlePositionInput",
    "videoProcessSubtitleColorInput",
    "videoProcessSubtitleBoxInput",
    "videoProcessAddSubtitleButton",
    "videoProcessClearSubtitlesButton",
    "videoProcessSubtitleList",
    "videoProcessRenderEditButton",
    "videoProcessExportEditButton",
    "videoProcessCompressButton",
    "videoProcessExportButton",
    "videoProcessResult",
    "videoProcessTimelineDuration",
    "videoProcessTrimTrack",
    "videoProcessSegmentTrack",
    "videoProcessSubtitleTrack",
    "previewPanel",
    "extractPanel",
    "extractResultPanel",
    "processPanel",
    "resultPanel",
    "videoPreview",
    "mediaPreviewImage",
    "sourcePlayerControls",
    "videoProgress",
    "videoProgressFill",
    "videoProgressLabel",
    "videoToolbar",
    "sourcePreviewPlayButton",
    "sourcePreviewRestartButton",
    "sourcePreviewSeekRange",
    "sourcePreviewCurrentTime",
    "sourcePreviewDurationLabel",
    "sourcePreviewSpeedSelect",
    "sourceFrameControls",
    "sourceGoFirstFrameButton",
    "sourceSetStartFrameButton",
    "sourcePreviousFrameButton",
    "sourceCurrentFrameLabel",
    "sourceNextFrameButton",
    "sourceSetEndFrameButton",
    "sourceGoLastFrameButton",
    "currentTimeLabel",
    "startRange",
    "startInput",
    "startStepUpButton",
    "startStepDownButton",
    "endRange",
    "endInput",
    "endStepUpButton",
    "endStepDownButton",
    "segmentLength",
    "segmentConfirmStatus",
    "segmentConfirmHint",
    "keepEveryInput",
    "outputScaleInput",
    "canvasModeInput",
    "reducePxInput",
    "chromaEnabledInput",
    "matteModeInput",
    "matteDependencyHint",
    "keyModeInput",
    "manualColorField",
    "manualKeyInput",
    "manualKeyLabel",
    "thresholdInput",
    "softnessInput",
    "despillInput",
    "haloInput",
    "corridorEnabledInput",
    "corridorScreenInput",
    "aiModelInput",
    "aiDeviceInput",
    "aiResolutionInput",
    "lumaBlackInput",
    "lumaWhiteInput",
    "lumaGammaInput",
    "lumaStrengthInput",
    "batchGreenToBlackInput",
    "batchGreenDesaturateInput",
    "batchSemiTransparentToBlackInput",
    "batchSemiTransparentToOpaqueInput",
    "previewFrameButton",
    "greenToBlackButton",
    "greenDesaturateButton",
    "semiTransparentToBlackButton",
    "semiTransparentToOpaqueButton",
    "savePreviewButton",
    "processPreviewTimeLabel",
    "processPreviewKeyLabel",
    "previewSourceImage",
    "previewSourceEmpty",
    "previewSourceZoomInput",
    "previewSourceZoomLabel",
    "previewSourceZoomOutButton",
    "previewSourceZoomResetButton",
    "previewSourcePanResetButton",
    "previewSourceZoomInButton",
    "previewProcessedImage",
    "previewProcessedEmpty",
    "previewProcessedStage",
    "processPreviewBackgroundToggleButton",
    "processPreviewBackgroundPopover",
    "processPreviewBackgroundCheckerboardButton",
    "processPreviewBackgroundColorButton",
    "processPreviewBackgroundInput",
    "processPreviewBackgroundLabel",
    "processPreviewBackgroundColorRow",
    "previewProcessedZoomInput",
    "previewProcessedZoomLabel",
    "previewProcessedZoomOutButton",
    "previewProcessedZoomResetButton",
    "previewProcessedPanResetButton",
    "previewProcessedZoomInButton",
    "extractStepShell",
    "extractLockNote",
    "extractProgress",
    "extractProgressFill",
    "extractProgressLabel",
    "extractButton",
    "processStepShell",
    "processLockNote",
    "processProgress",
    "processProgressFill",
    "processProgressLabel",
    "processButton",
    "extractJobSummary",
    "extractPreviewCanvas",
    "extractPreviewEmptyState",
    "extractPreviewFrameLabel",
    "extractPreviewSelectedCount",
    "extractPreviewProgressBar",
    "extractPreviewProgressFill",
    "extractPreviewProgressLabel",
    "extractPreviewPlayPauseButton",
    "extractPreviewRestartButton",
    "extractPreviewReverseInput",
    "extractPreviewBackgroundInput",
    "extractPreviewBackgroundLabel",
    "extractPreviewIntervalInput",
    "extractFrameGrid",
    "extractSelectionCount",
    "extractSelectAllButton",
    "extractSelectNoneButton",
    "extractSelectOddButton",
    "extractSelectEvenButton",
    "extractInvertSelectionButton",
    "extractOrderedSelectionInput",
    "extractAnalyzeSimilarityButton",
    "extractSimilarityIgnoreNearInput",
    "extractSimilarityThresholdInput",
    "extractSimilarityStatus",
    "extractSimilarityKeepFirstButton",
    "extractSimilarityDropSimilarButton",
    "clearExtractFramesButton",
    "jobSummary",
    "selectionCount",
    "customAnimationInput",
    "customAnimationFolderInput",
    "clearPreviewFramesButton",
    "importAnimationButton",
    "importAnimationFolderButton",
    "openProcessedButton",
    "animationPreviewCanvas",
    "previewEmptyState",
    "previewFrameLabel",
    "previewSelectedCount",
    "previewProgressBar",
    "previewProgressFill",
    "previewProgressLabel",
    "previewPlayPauseButton",
    "previewRestartButton",
    "previewReverseInput",
    "previewBackgroundInput",
    "previewBackgroundLabel",
    "previewIntervalInput",
    "magicPreviewPanel",
    "magicPreviewCanvas",
    "magicPreviewEmptyState",
    "magicPreviewFrameLabel",
    "magicPreviewSelectedCount",
    "magicPreviewProgressBar",
    "magicPreviewProgressFill",
    "magicPreviewProgressLabel",
    "magicOutputSizeLabel",
    "exportMagicFramesButton",
    "magicQuarterPreviewPanel",
    "magicQuarterPreviewCanvas",
    "magicQuarterPreviewEmptyState",
    "magicQuarterPreviewFrameLabel",
    "magicQuarterPreviewSelectedCount",
    "magicQuarterPreviewProgressBar",
    "magicQuarterPreviewProgressFill",
    "magicQuarterPreviewProgressLabel",
    "magicQuarterOutputSizeLabel",
    "exportMagicQuarterFramesButton",
    "magicEighthPreviewPanel",
    "magicEighthPreviewCanvas",
    "magicEighthPreviewEmptyState",
    "magicEighthPreviewFrameLabel",
    "magicEighthPreviewSelectedCount",
    "magicEighthPreviewProgressBar",
    "magicEighthPreviewProgressFill",
    "magicEighthPreviewProgressLabel",
    "magicEighthOutputSizeLabel",
    "exportMagicEighthFramesButton",
    "frameGrid",
    "selectAllButton",
    "selectNoneButton",
    "selectOddButton",
    "selectEvenButton",
    "invertSelectionButton",
    "orderedSelectionInput",
    "exportButton",
    "magicResizeHardInput",
    "magicResizeSoftInput",
    "magicButton",
    "exportResult",
    "appStatus",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function videoWorkflowMain() {
  return els.extractPanel?.parentElement || null;
}

function ensureWorkflowPanelOrder() {
  if (!els.extractResultPanel || !els.processPanel || !els.extractPanel) {
    return;
  }
  const mainGrid = videoWorkflowMain();
  if (!mainGrid || els.extractResultPanel.compareDocumentPosition(els.processPanel) & Node.DOCUMENT_POSITION_FOLLOWING) {
    return;
  }
  mainGrid.insertBefore(els.extractResultPanel, els.processPanel);
}

function createImageProcessPanel() {
  if (!els.processPanel || !els.imageMatteModuleHost || !els.imageResultPreviewHost || document.getElementById("imageProcessPanel")) {
    return;
  }

  const imagePanel = els.processPanel.cloneNode(true);
  imagePanel.id = "imageProcessPanel";
  imagePanel.classList.remove("workflow-target");
  imagePanel.classList.add("image-matte-module");
  imagePanel.hidden = false;

  imagePanel.querySelectorAll("[id]").forEach((element) => {
    element.id = imageMatteId(element.id);
  });
  imagePanel.querySelectorAll("label[for]").forEach((element) => {
    const targetId = element.getAttribute("for");
    if (targetId) {
      element.setAttribute("for", imageMatteId(targetId));
    }
  });

  const kicker = imagePanel.querySelector(".section-kicker");
  if (kicker) kicker.textContent = "图片抠图";
  const title = imagePanel.querySelector("h2");
  if (title) title.textContent = "\u62A0\u56FE";
  const lockNote = imagePanel.querySelector(`#${imageMatteId("processLockNote")}`);
  if (lockNote) lockNote.textContent = "\u5148\u5BFC\u5165\u56FE\u7247\uFF0C\u518D\u914D\u7F6E\u62A0\u56FE\u7B97\u6CD5\u4E0E\u8F93\u51FA\u8BBE\u7F6E\u3002";
  const processButton = imagePanel.querySelector(`#${imageMatteId("processButton")}`);
  if (processButton) processButton.textContent = "\u5F00\u59CB\u62A0\u56FE";
  const parameterColumn = imagePanel.querySelector(".parameter-column");
  if (parameterColumn) {
    parameterColumn.insertAdjacentHTML(
      "afterbegin",
      `
        <div class="control-group">
          <div class="group-title">
            <span>\u56FE\u7247\u8F93\u51FA\u8BBE\u7F6E</span>
          </div>
          <div class="form-grid">
            <label class="field">
              <span>\u8F93\u51FA\u500D\u6570</span>
              <input id="imageOutputScaleInput" type="number" min="5" max="200" step="5" value="100">
            </label>
            <label class="field">
              <span>\u753B\u5E03\u5E03\u5C40</span>
              <select id="imageCanvasModeInput">
                <option value="auto" selected>\u81EA\u52A8\u5BBD\u5EA6 / \u5C45\u4E2D</option>
                <option value="square">\u6B63\u65B9\u5F62 / \u5C45\u4E2D</option>
                <option value="source">\u6E90\u753B\u5E03 / \u5C45\u4E2D</option>
                <option value="tight">\u7D27\u8D34\u4E3B\u4F53</option>
              </select>
            </label>
            <label class="field">
              <span>\u753B\u5E03\u8FB9\u8DDD</span>
              <input id="imageReducePxInput" type="number" min="0" step="1" value="0">
            </label>
          </div>
        </div>
      `
    );
  }

  imagePanel.querySelector("#imageOutputScaleInput")?.closest(".control-group")?.remove();
  const imageMatteModeInput = imagePanel.querySelector("#imageMatteModeInput");
  if (imageMatteModeInput) {
    const edgeConnectedOption = document.createElement("option");
    edgeConnectedOption.value = "edge_connected_chroma";
    edgeConnectedOption.textContent = MATTE_MODE_BASE_LABELS.edge_connected_chroma;
    const subjectProtectOption = document.createElement("option");
    subjectProtectOption.value = "subject_protect_chroma";
    subjectProtectOption.textContent = MATTE_MODE_BASE_LABELS.subject_protect_chroma;
    imageMatteModeInput.insertBefore(subjectProtectOption, imageMatteModeInput.firstElementChild);
    imageMatteModeInput.insertBefore(edgeConnectedOption, imageMatteModeInput.firstElementChild);
    imageMatteModeInput.value = "edge_connected_chroma";
  }

  const layout = imagePanel.querySelector(".parameter-layout");
  const previewColumn = imagePanel.querySelector(".preview-column");
  const previewToolbar = imagePanel.querySelector(".preview-toolbar");
  const actionBar = imagePanel.querySelector(".action-bar");
  const comparePanels = imagePanel.querySelectorAll(".compare-panel");
  const sourceTitle = comparePanels[0]?.querySelector(".compare-head > span");
  if (sourceTitle) {
    sourceTitle.textContent = "\u521D\u59CB\u56FE\u7247";
  }
  comparePanels.forEach((panel, index) => {
    const zoomControls = panel.querySelector(".zoom-controls");
    if (!zoomControls) {
      return;
    }
    const button = document.createElement("button");
    button.id = index === 0 ? "imagePreviewSourceLinkButton" : "imagePreviewProcessedLinkButton";
    button.className = "ghost-button tiny preview-link-button";
    button.type = "button";
    button.textContent = "\u8054\u52A8";
    button.setAttribute("aria-pressed", "false");
    zoomControls.appendChild(createImagePreviewBackgroundControl(index === 0 ? "source" : "processed"));
    zoomControls.appendChild(button);
  });
  if (layout) {
    layout.classList.add("image-parameter-layout");
  }
  if (previewToolbar) {
    previewToolbar.remove();
  }
  imagePanel.querySelector(".preview-options")?.remove();
  imagePanel.querySelector(".postprocess-actions")?.remove();
  if (parameterColumn && actionBar) {
    const skipMatteButton = document.createElement("button");
    skipMatteButton.id = "imageSkipMatteButton";
    skipMatteButton.className = "ghost-button large image-skip-matte-button";
    skipMatteButton.type = "button";
    skipMatteButton.textContent = "\u4E0D\u62A0\u56FE";
    if (processButton) {
      processButton.insertAdjacentElement("afterend", skipMatteButton);
    } else {
      actionBar.appendChild(skipMatteButton);
    }
    const actionShell = document.createElement("div");
    actionShell.className = "image-matte-action-shell";
    actionShell.appendChild(actionBar);
    parameterColumn.appendChild(actionShell);
  }
  if (previewColumn) {
    previewColumn.classList.add("image-result-preview-column");
    els.imageResultPreviewHost.appendChild(previewColumn);
  }
  els.imageResultPreviewHost.insertAdjacentHTML(
    "beforeend",
    `
      <div id="imageManualRepairPanel" class="manual-repair-panel">
        <div class="manual-repair-head">
          <div>
            <strong>\u4E8C\u6B21\u6D82\u62B9\u4FEE\u8865</strong>
            <span id="imageManualRepairStatus">\u9ED8\u8BA4\u6D4F\u89C8\u56FE\u7247\uFF1B\u70B9\u51FB\u201C\u5F00\u59CB\u4FEE\u8865\u201D\u540E\u5728\u53F3\u4FA7\u7ED3\u679C\u56FE\u4E0A\u6D82\u62B9\u3002</span>
          </div>
          <label class="checkbox-row compact manual-repair-toggle">
            <input id="imageManualRepairEnabledInput" type="checkbox">
            <span>\u542F\u7528\u4FEE\u8865</span>
          </label>
        </div>
        <div class="manual-repair-controls">
          <label class="manual-repair-option">
            <input type="radio" name="imageManualRepairMode" value="keep" checked>
            <span>\u8865\u56DE\u4E3B\u4F53</span>
          </label>
          <label class="manual-repair-option">
            <input type="radio" name="imageManualRepairMode" value="remove">
            <span>\u5220\u9664\u6B8B\u7559</span>
          </label>
          <label class="field compact-field">
            <span>\u534A\u5F84</span>
            <input id="imageManualRepairRadiusInput" type="number" min="1" max="240" step="1" value="18">
          </label>
          <label class="field compact-field">
            <span>\u5BB9\u5DEE</span>
            <input id="imageManualRepairToleranceInput" type="number" min="0" max="120" step="1" value="28">
          </label>
          <label class="field compact-field">
            <span>\u67D4\u8FB9</span>
            <input id="imageManualRepairFeatherInput" type="number" min="0" max="80" step="1" value="6">
          </label>
          <label class="field compact-field">
            <span>\u8FB9\u7F18\u67D4\u5316</span>
            <input id="imageManualRepairSoftenInput" type="number" min="1" max="12" step="1" value="2">
          </label>
          <button id="imageManualRepairUndoButton" class="ghost-button" type="button">\u64A4\u9500</button>
          <button id="imageManualRepairRedoButton" class="ghost-button" type="button">\u91CD\u505A</button>
        </div>
      </div>
    `
  );
  els.imageMatteModuleHost.appendChild(imagePanel);
  els.imageProcessPanel = imagePanel;
  [imagePanel, els.imageResultPreviewHost].forEach((root) => {
    root.querySelectorAll("[id]").forEach((element) => {
      els[element.id] = element;
    });
  });
  normalizeImageManualRepairPanel();
}

function normalizeImageManualRepairPanel() {
  const panel = els.imageManualRepairPanel;
  const controls = panel?.querySelector(".manual-repair-controls");
  if (!panel || !controls || controls.querySelector("#imageManualRepairToggleButton")) {
    return;
  }

  const title = panel.querySelector(".manual-repair-head strong");
  if (title) {
    title.textContent = "\u4E8C\u6B21\u6D82\u62B9\u4FEE\u8865";
  }
  if (els.imageManualRepairStatus) {
    els.imageManualRepairStatus.textContent = "\u9ED8\u8BA4\u6D4F\u89C8\u56FE\u7247\uFF1B\u70B9\u51FB\u201C\u5F00\u59CB\u4FEE\u8865\u201D\u540E\u5728\u53F3\u4FA7\u7ED3\u679C\u56FE\u4E0A\u6D82\u62B9\u3002";
  }
  panel.querySelector(".manual-repair-toggle")?.remove();

  const fields = Array.from(controls.querySelectorAll(".compact-field"));
  const fieldLabels = {
    imageManualRepairRadiusInput: "\u534A\u5F84",
    imageManualRepairToleranceInput: "\u5BB9\u5DEE",
    imageManualRepairFeatherInput: "\u67D4\u8FB9",
    imageManualRepairSoftenInput: "\u8FB9\u7F18\u67D4\u5316",
  };
  fields.forEach((field) => {
    const input = field.querySelector("input[id]");
    const label = field.querySelector("span");
    if (input?.id && label && fieldLabels[input.id]) {
      label.textContent = fieldLabels[input.id];
    }
  });

  const modes = document.createElement("div");
  modes.className = "manual-repair-modes";
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", "repair mode");
  Array.from(controls.querySelectorAll(".manual-repair-option")).forEach((option) => {
    const input = option.querySelector("input[name='imageManualRepairMode']");
    const label = option.querySelector("span");
    if (input?.value === "remove" && label) {
      label.textContent = "\u5220\u9664\u6B8B\u7559";
    } else if (label) {
      label.textContent = "\u8865\u56DE\u4E3B\u4F53";
    }
    modes.appendChild(option);
  });

  const inputs = document.createElement("div");
  inputs.className = "manual-repair-inputs";
  fields.forEach((field) => inputs.appendChild(field));

  const history = document.createElement("div");
  history.className = "manual-repair-history-actions";
  history.setAttribute("role", "group");
  history.setAttribute("aria-label", "repair history");
  [
    [els.imageManualRepairUndoButton, "\u2190", "\u64A4\u9500\u4FEE\u8865"],
    [els.imageManualRepairRedoButton, "\u2192", "\u91CD\u505A\u4FEE\u8865"],
  ].forEach(([button, label, titleText]) => {
    if (!button) {
      return;
    }
    button.className = "ghost-button icon-button manual-repair-arrow";
    button.textContent = label;
    button.title = titleText;
    button.setAttribute("aria-label", titleText);
    history.appendChild(button);
  });

  const toggleButton = document.createElement("button");
  toggleButton.id = "imageManualRepairToggleButton";
  toggleButton.className = "primary-button manual-repair-toggle-button";
  toggleButton.type = "button";
  toggleButton.textContent = "\u5F00\u59CB\u4FEE\u8865";
  toggleButton.setAttribute("aria-pressed", "false");

  const toolbox = document.createElement("div");
  toolbox.className = "manual-repair-toolbox";
  toolbox.setAttribute("aria-label", "manual repair tools");
  toolbox.append(modes, history, toggleButton);

  controls.replaceChildren(inputs, toolbox);
  els.imageManualRepairToggleButton = toggleButton;
}

function getMatteEls(scope = activeMatteScope()) {
  if (scope !== "image") {
    return els;
  }
  return new Proxy(els, {
    get(target, property) {
      if (typeof property !== "string") {
        return target[property];
      }
      return target[imageMatteId(property)] || target[property];
    },
  });
}

function getDirectMatteElement(id, scope = activeMatteScope()) {
  return scope === "image" ? els[imageMatteId(id)] : els[id];
}

function activeMatteScope() {
  return state.activeModule === "image" ? "image" : "video";
}

function getProcessPreviewState(scope = activeMatteScope()) {
  if (scope === "image") {
    return {
      preview: state.imageProcessPreview,
      zoom: state.imageProcessPreviewZoom,
      background: state.imageProcessPreviewBackground,
      pan: state.imageProcessPreviewPan,
      dragKey: "imageProcessPreviewDrag",
    };
  }
  return {
    preview: state.processPreview,
    zoom: state.processPreviewZoom,
    background: state.processPreviewBackground,
    pan: state.processPreviewPan,
    dragKey: "processPreviewDrag",
  };
}

function activeProject() {
  return state.projectWorkspace.activeProject;
}

function activeProjectId() {
  return String(activeProject()?.id || "");
}

function projectTypeLabel(value) {
  const labels = {
    "game-art": "游戏美术",
    "vertical-game": "竖屏游戏",
    "horizontal-game": "横屏游戏",
    "ui-system": "UI 系统",
    other: "其他",
  };
  return labels[value] || value || "未设置";
}

function renderProjectLauncher() {
  if (!els.projectLauncherGrid) return;
  const projects = state.projectWorkspace.projects;
  els.projectLauncherGrid.innerHTML = projects.length
    ? projects.map((project) => {
        const available = Boolean(project.available);
        const description = project.description || (project.is_default ? "临时和非项目性工作默认存放在这里" : "本地文件化项目");
        return `
          <button class="project-launcher-card ${project.is_default ? "default" : ""} ${available ? "" : "unavailable"}" type="button" data-project-enter="${escapeHtml(project.id)}" ${available ? "" : "disabled"}>
            <span class="project-launcher-card-head">
              <span class="project-launcher-card-icon" aria-hidden="true">${project.cover_relative_path ? `<img src="/api/v1/projects/${encodeURIComponent(project.id)}/files/${escapeHtml(project.cover_relative_path)}" alt="">` : project.is_default ? "DF" : "PR"}</span>
              <span class="project-launcher-card-status ${available ? "ready" : ""}">${available ? "本地可用" : "目录不可用"}</span>
            </span>
            <span class="project-launcher-card-copy">
              <strong title="${escapeHtml(project.display_name || project.slug)}">${escapeHtml(project.display_name || project.slug)}</strong>
              <span>${escapeHtml(project.slug || "-")} · ${escapeHtml(projectTypeLabel(project.project_type))}</span>
              <small title="${escapeHtml(description)}">${escapeHtml(description)}</small>
            </span>
            <span class="project-launcher-card-footer">
              <span title="${escapeHtml(project.root_path || "")}">${escapeHtml(project.root_path || "")}</span>
              <strong>${available ? "进入项目 →" : "重新定位"}</strong>
            </span>
          </button>`;
      }).join("")
    : '<div class="project-launcher-empty">暂无可用项目</div>';
}

async function loadProjectRegistry() {
  const data = await apiJson(`/api/v1/projects?ts=${Date.now()}`);
  state.projectWorkspace.projects = Array.isArray(data.projects) ? data.projects : [];
  state.projectWorkspace.defaultParentPath = data.default_parent_path || "";
  return data;
}

async function initializeProjectWorkspace() {
  document.body.classList.add("project-launcher-active");
  state.projectWorkspace.loading = true;
  try {
    const data = await loadProjectRegistry();
    renderProjectLauncher();
    const resumed = state.projectWorkspace.projects.find(
      (project) => project.id === data.active_project_id && project.available
    );
    if (resumed) {
      await enterProject(resumed, { selectOnServer: false, announce: false });
    } else {
      showProjectLauncher({ clearServerSelection: false });
    }
  } catch (error) {
    showProjectLauncher({ clearServerSelection: false });
    if (els.projectLauncherGrid) {
      els.projectLauncherGrid.innerHTML = `<div class="project-launcher-empty">读取项目失败：${escapeHtml(error.message)}</div>`;
    }
    setStatus(`读取项目失败：${error.message}`, "error");
  } finally {
    state.projectWorkspace.loading = false;
  }
}

function showProjectLauncher({ clearServerSelection = true } = {}) {
  state.projectWorkspace.activeProject = null;
  document.body.classList.add("project-launcher-active");
  document.body.classList.remove("project-active", "workbench-scroll-locked", "resource-scroll-locked");
  document.documentElement.classList.remove("workbench-scroll-locked", "resource-scroll-locked");
  if (els.projectLauncher) els.projectLauncher.hidden = false;
  if (els.projectSidebar) els.projectSidebar.hidden = true;
  if (els.moduleSwitch) els.moduleSwitch.hidden = true;
  document.querySelectorAll(".module-view").forEach((view) => {
    view.hidden = true;
  });
  els.appEyebrow.textContent = PRODUCT_SUBTITLE;
  els.appTitle.textContent = "项目总览";
  document.title = `项目总览 - ${PRODUCT_TITLE}`;
  renderProjectLauncher();
  if (clearServerSelection) {
    void apiJson("/api/v1/projects/leave", { method: "POST", body: {} }).catch((error) => {
      setStatus(`返回项目总览失败：${error.message}`, "error");
    });
  }
}

function syncProjectContext(project) {
  if (!project) return;
  if (els.projectSidebarName) els.projectSidebarName.textContent = project.display_name || project.slug;
  if (els.projectSidebarPath) {
    els.projectSidebarPath.textContent = project.root_path || "";
    els.projectSidebarPath.title = project.root_path || "";
  }
  if (els.projectDashboardTitle) els.projectDashboardTitle.textContent = project.display_name || project.slug;
  if (els.projectDashboardDescription) {
    els.projectDashboardDescription.textContent = project.description || "项目资产生产与处理总览";
  }
  if (els.projectDashboardType) els.projectDashboardType.textContent = projectTypeLabel(project.project_type);
  if (els.projectDashboardRatio) els.projectDashboardRatio.textContent = project.aspect_ratio || "1:1";
  if (els.projectDashboardCreated) els.projectDashboardCreated.textContent = aiRecordDate({ created_at: project.created_at }) || "-";
  if (els.projectDashboardCover) {
    els.projectDashboardCover.innerHTML = project.cover_relative_path
      ? `<img src="/api/v1/projects/${encodeURIComponent(project.id)}/files/${escapeHtml(project.cover_relative_path)}" alt="${escapeHtml(project.display_name || "项目封面")}">`
      : "<span>PROJECT</span>";
  }
  if (els.projectDashboardSlug) els.projectDashboardSlug.textContent = project.slug || "-";
  if (els.projectDashboardPath) {
    els.projectDashboardPath.textContent = project.root_path || "-";
    els.projectDashboardPath.title = project.root_path || "";
  }
  if (els.projectDashboardStatus) {
    els.projectDashboardStatus.textContent = project.is_default ? "Default 项目" : "本地项目";
  }
  if (els.aiBackgroundSelect) els.aiBackgroundSelect.value = project.default_background || "transparent";
  if (els.aiCountSelect) els.aiCountSelect.value = String(project.default_image_count || 4);
}

async function loadProjectActivity() {
  const projectId = activeProjectId();
  if (!projectId || !els.projectActivityList) return;
  try {
    const [eventData, workflowData] = await Promise.all([
      apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/events?limit=12&ts=${Date.now()}`),
      apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/workflow-runs?limit=8&ts=${Date.now()}`),
    ]);
    const events = Array.isArray(eventData.events) ? eventData.events.slice().reverse() : [];
    const workflows = Array.isArray(workflowData.workflow_runs) ? workflowData.workflow_runs : [];
    const labels = {
      "project.created": "项目已创建",
      "workflow.created": "自动化工作流已创建",
      "workflow.updated": "自动化工作流状态已更新",
      "generation.submitted": "资产生成任务已提交",
      "generation.legacy-history-migrated": "旧生成记录已迁移",
      "asset-node.created": "资产节点已创建",
      "asset-node.updated": "资产节点已更新",
      "asset-node.deleted": "资产节点已删除",
      "asset-node.trashed": "资产节点已移入回收站",
      "style.trashed": "风格方向已移入回收站",
      "library.assets-ingested": "生成结果已加入资产管理",
      "integration.deployed": "资产已部署到正式项目",
      "processing.intake-created": "图片已加入资产处理",
    };
    const rows = [
      ...workflows.map((workflow) => ({ type: `workflow:${workflow.status}`, actor: workflow.actor, created_at: workflow.updated_at, label: workflow.request || workflow.id })),
      ...events.map((event) => ({ ...event, label: labels[event.type] || event.type || "项目事件" })),
    ].sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)).slice(0, 14);
    els.projectActivityList.innerHTML = rows.length
      ? rows.map((event) => `
          <div class="project-activity-item">
            <strong>${escapeHtml(String(event.type || "").startsWith("workflow:") ? `[${String(event.type).split(":")[1]}] ${event.label}` : event.label)}</strong>
            <small>${escapeHtml(event.actor || "system")} · ${escapeHtml(aiRecordDate({ created_at: event.created_at }))}</small>
          </div>`).join("")
      : '<div class="project-activity-empty">暂无运行记录</div>';
  } catch (error) {
    els.projectActivityList.innerHTML = `<div class="project-activity-empty">记录读取失败：${escapeHtml(error.message)}</div>`;
  }
}

async function loadProjectDashboard() {
  const projectId = activeProjectId();
  if (!projectId) return;
  try {
    const data = await apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/dashboard?ts=${Date.now()}`);
    const dashboard = data.dashboard || {};
    state.projectAssets.dashboard = dashboard;
    const progress = Math.max(0, Math.min(100, Number(dashboard.progress || 0)));
    if (els.projectDashboardProgress) els.projectDashboardProgress.textContent = `${progress}%`;
    if (els.projectDashboardProgressBar) els.projectDashboardProgressBar.style.width = `${progress}%`;
    if (els.projectDashboardCategories) {
      els.projectDashboardCategories.innerHTML = (dashboard.categories || []).map((item) => `
        <button type="button" data-project-module="aiCreation" data-asset-category="${escapeHtml(item.key)}"><span>${escapeHtml(item.label || item.key)}</span><strong>${Number(item.completed || 0)} / ${Number(item.target || 0)}</strong></button>
      `).join("");
    }
  } catch (error) {
    setStatus(`读取项目进度失败：${error.message}`, "error");
  }
}

function syncLegacyResourceProject(project) {
  if (!project) return;
  const existing = resourceProjectById(project.id);
  const resourceProject = existing || {
    id: project.id,
    name: project.display_name,
    folderPath: "",
    folderPaths: [],
    resources: [],
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
  resourceProject.name = project.display_name;
  state.resourceManager.projects = [resourceProject];
  state.resourceManager.activeProjectId = project.id;
  state.resourceManager.view = "detail";
  state.resourceManager.activeFolderTab = "all";
}

async function enterProject(project, { selectOnServer = true, announce = true } = {}) {
  if (!project?.id || !project.available) return;
  let selectedProject = project;
  if (selectOnServer) {
    const data = await apiJson("/api/v1/projects/select", {
      method: "POST",
      body: { project_id: project.id },
    });
    selectedProject = data.project;
  }
  const changedProject = activeProjectId() !== selectedProject.id;
  state.projectWorkspace.activeProject = selectedProject;
  if (changedProject) {
    state.aiCreation.loaded = false;
    state.aiCreation.assetTree = [];
    state.aiCreation.selectedAssetNodeId = "";
    state.aiCreation.assetTreeQuery = "";
    state.aiCreation.history = [];
    state.aiCreation.selectedIds.clear();
    state.projectAssets.styles = [];
    state.projectAssets.library = [];
    state.projectAssets.trash = [];
    state.projectAssets.integration = null;
    state.projectAssets.selectedId = "";
    state.projectAssets.selectedIds.clear();
    state.projectAssets.canvas = null;
  }
  document.body.classList.remove("project-launcher-active");
  document.body.classList.add("project-active");
  if (els.projectLauncher) els.projectLauncher.hidden = true;
  if (els.projectSidebar) els.projectSidebar.hidden = false;
  if (els.moduleSwitch) els.moduleSwitch.hidden = true;
  syncProjectContext(selectedProject);
  syncLegacyResourceProject(selectedProject);
  setActiveModule("project", { announce: false });
  void loadProjectActivity();
  void loadProjectDashboard();
  if (announce) setStatus(`已进入项目：${selectedProject.display_name}`, "success");
}

function projectSlugFromName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function updateProjectRootPreview() {
  if (!els.projectRootPreview) return;
  const parent = els.projectParentPathInput?.value || state.projectWorkspace.defaultParentPath || "work/projects";
  const slug = els.projectSlugInput?.value.trim() || "project-slug";
  const separator = parent.includes("\\") ? "\\" : "/";
  els.projectRootPreview.textContent = `${parent.replace(/[\\/]+$/, "")}${separator}${slug}`;
}

function openProjectCreateDialog() {
  if (!els.projectCreateDialog) return;
  projectSlugEdited = false;
  els.projectCreateForm.reset();
  els.projectTypeInput.value = "game-art";
  els.projectAspectRatioInput.value = "1:1";
  if (els.projectCustomAspectRatioInput) els.projectCustomAspectRatioInput.value = "";
  if (els.projectCreateModeInput) els.projectCreateModeInput.value = "blank";
  if (els.projectTemplateHelp) els.projectTemplateHelp.hidden = true;
  if (els.projectTemplateMoreButton) {
    els.projectTemplateMoreButton.setAttribute("aria-expanded", "false");
    els.projectTemplateMoreButton.textContent = "查看更多模板";
  }
  els.projectParentPathInput.value = state.projectWorkspace.defaultParentPath || "";
  syncProjectCreateModeFields();
  updateProjectRootPreview();
  els.projectCreateDialog.hidden = false;
  window.requestAnimationFrame(() => els.projectNameInput?.focus());
}

function syncProjectCreateModeFields() {
  const mode = els.projectCreateModeInput?.value || "blank";
  if (els.projectReferenceImagesField) els.projectReferenceImagesField.hidden = mode !== "reference";
  if (els.projectTemplateField) els.projectTemplateField.hidden = mode !== "template";
  if (els.projectCustomAspectRatioField) els.projectCustomAspectRatioField.hidden = els.projectAspectRatioInput?.value !== "custom";
}

function toggleProjectTemplateHelp() {
  if (!els.projectTemplateHelp || !els.projectTemplateMoreButton) return;
  els.projectTemplateHelp.hidden = !els.projectTemplateHelp.hidden;
  const expanded = !els.projectTemplateHelp.hidden;
  els.projectTemplateMoreButton.setAttribute("aria-expanded", String(expanded));
  els.projectTemplateMoreButton.textContent = expanded ? "收起模板说明" : "查看更多模板";
}

function validProjectAspectRatio(value) {
  return /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(String(value || "").trim());
}

function projectAspectRatioFromCreateForm() {
  if (els.projectAspectRatioInput?.value !== "custom") return els.projectAspectRatioInput?.value || "1:1";
  const custom = els.projectCustomAspectRatioInput?.value.trim() || "";
  if (!validProjectAspectRatio(custom)) throw new Error("自定义比例需要使用“宽:高”格式，例如 21:9。");
  return custom;
}

function closeProjectCreateDialog() {
  if (els.projectCreateDialog) els.projectCreateDialog.hidden = true;
}

async function chooseProjectParent() {
  await withBusy(els.projectChooseParentButton, async () => {
    const data = await apiJson("/api/v1/projects/pick-parent", { method: "POST", body: {} });
    if (data.cancelled) return;
    els.projectParentPathInput.value = data.folder?.path || state.projectWorkspace.defaultParentPath;
    updateProjectRootPreview();
  });
}

async function createProjectFromForm(event) {
  event.preventDefault();
  const displayName = els.projectNameInput.value.trim();
  if (displayName.length < 2 || displayName.length > 30) {
    setStatus("项目名称需要 2 到 30 个字符。", "error");
    els.projectNameInput.focus();
    return;
  }
  const slug = els.projectSlugInput.value.trim();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) {
    setStatus("英文目录名只能使用小写英文、数字和短横线。", "error");
    els.projectSlugInput.focus();
    return;
  }
  const createMode = els.projectCreateModeInput?.value || "blank";
  if (createMode === "reference" && !(els.projectReferenceImagesInput?.files?.length)) {
    setStatus("参考风格模式需要至少上传一张参考图。", "error");
    els.projectReferenceImagesInput?.focus();
    return;
  }
  if (createMode === "template" && !els.projectTemplateInput?.value) {
    setStatus("模板模式需要选择一个项目模板。", "error");
    els.projectTemplateInput?.focus();
    return;
  }
  let aspectRatio = "1:1";
  try {
    aspectRatio = projectAspectRatioFromCreateForm();
  } catch (error) {
    setStatus(error.message, "error");
    els.projectCustomAspectRatioInput?.focus();
    return;
  }
  await withBusy(els.projectCreateSubmitButton, async () => {
    const data = await apiJson("/api/v1/projects", {
      method: "POST",
      body: {
        display_name: displayName,
        slug,
        parent_path: els.projectParentPathInput.value.trim(),
        project_type: els.projectTypeInput.value,
        aspect_ratio: aspectRatio,
        description: els.projectDescriptionInput.value.trim(),
        style_tags: String(els.projectStyleTagsInput?.value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean),
        create_mode: createMode,
        template_id: createMode === "template" ? els.projectTemplateInput?.value || "" : "",
      },
    });
    if (createMode === "reference" && els.projectReferenceImagesInput?.files?.length) {
      await uploadProjectReferenceImages(data.project.id, Array.from(els.projectReferenceImagesInput.files));
    }
    closeProjectCreateDialog();
    await loadProjectRegistry();
    renderProjectLauncher();
    await enterProject(data.project, { selectOnServer: false });
  });
}

async function openExistingProject() {
  await withBusy(els.projectOpenExistingButton, async () => {
    const picked = await apiJson("/api/v1/projects/pick-existing", { method: "POST", body: {} });
    if (picked.cancelled) return;
    const data = await apiJson("/api/v1/projects/open", {
      method: "POST",
      body: { root_path: picked.folder?.path || "" },
    });
    await loadProjectRegistry();
    renderProjectLauncher();
    await enterProject(data.project, { selectOnServer: false });
  });
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function askText(title, initialValue = "", placeholder = "") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "resource-project-dialog";
    overlay.innerHTML = `<form class="resource-project-dialog-panel project-text-dialog"><div class="resource-project-dialog-head"><h2>${escapeHtml(title)}</h2><button class="icon-button" type="button" data-text-cancel aria-label="关闭">×</button></div><label class="ai-field"><span>${escapeHtml(title)}</span><input type="text" maxlength="120" value="${escapeHtml(initialValue)}" placeholder="${escapeHtml(placeholder)}"></label><div class="resource-project-dialog-actions"><button class="ghost-button" type="button" data-text-cancel>取消</button><button class="primary-button" type="submit">确定</button></div></form>`;
    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");
    const input = overlay.querySelector("input");
    const finish = (value) => { overlay.remove(); document.body.classList.remove("modal-open"); resolve(value); };
    overlay.querySelectorAll("[data-text-cancel]").forEach((button) => button.addEventListener("click", () => finish(null)));
    overlay.querySelector("form").addEventListener("submit", (event) => { event.preventDefault(); finish(input.value.trim() || null); });
    window.requestAnimationFrame(() => { input.focus(); input.select(); });
  });
}

async function uploadProjectReferenceImages(projectId, files, role = "reference") {
  const uploaded = [];
  for (const file of files.slice(0, 20)) {
    const data = await apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/images/import`, {
      method: "POST",
      body: { data_url: await fileAsDataUrl(file), file_name: file.name, role },
    });
    if (data.image) uploaded.push(data.image);
  }
  return uploaded;
}

function projectModuleViewSwitch(kind) {
  const active = state.projectAssets.activeView[kind] || "list";
  return `
    <div class="workbench-view-switch" role="group" aria-label="视图切换">
      <button class="icon-text-button ${active === "list" ? "active" : ""}" type="button" data-project-action="set-view" data-kind="${kind}" data-view="list" aria-pressed="${active === "list"}">列表</button>
      <button class="icon-text-button ${active === "canvas" ? "active" : ""}" type="button" data-project-action="set-view" data-kind="${kind}" data-view="canvas" aria-pressed="${active === "canvas"}">画布</button>
    </div>`;
}

async function loadProjectAssetModule(moduleName) {
  const projectId = activeProjectId();
  if (!projectId || !els.projectAssetModuleBody) return;
  els.projectAssetModuleBody.innerHTML = '<div class="project-tool-loading">正在读取项目文件...</div>';
  try {
    if (moduleName === "style") {
      const [styles, history] = await Promise.all([
        apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/styles?ts=${Date.now()}`),
        apiJson(`/api/v1/generation/history?project_id=${encodeURIComponent(projectId)}&ts=${Date.now()}`),
      ]);
      state.projectAssets.styles = styles.styles || [];
      state.aiCreation.history = history.history || [];
    } else if (moduleName === "library") {
      const data = await apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/library?ts=${Date.now()}`);
      state.projectAssets.library = data.assets || [];
    } else if (moduleName === "trash") {
      const data = await apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/trash?ts=${Date.now()}`);
      state.projectAssets.trash = data.items || [];
      state.projectAssets.selectedIds.clear();
    } else if (moduleName === "integration") {
      const [integration, library] = await Promise.all([
        apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/integration?ts=${Date.now()}`),
        apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/library?ts=${Date.now()}`),
      ]);
      state.projectAssets.integration = integration.integration || {};
      state.projectAssets.library = library.assets || [];
    }
    renderProjectAssetModule(moduleName);
  } catch (error) {
    els.projectAssetModuleBody.innerHTML = `<div class="project-tool-error">${escapeHtml(error.message)}</div>`;
    setStatus(`读取${projectModuleLabel(moduleName)}失败：${error.message}`, "error");
  }
}

function projectModuleLabel(moduleName) {
  return { style: "风格探索", library: "资产管理", integration: "项目对接", trash: "回收站", settings: "项目设置" }[moduleName] || "项目资产";
}

function renderProjectAssetModule(moduleName = state.activeModule) {
  if (!els.projectAssetModuleBody) return;
  els.projectAssetModuleTitle.textContent = projectModuleLabel(moduleName);
  els.projectAssetModuleKicker.textContent = {
    style: "Style exploration", library: "Asset management", integration: "Project integration", trash: "Recoverable trash", settings: "Project settings",
  }[moduleName] || "Project assets";
  els.projectAssetModuleActions.innerHTML = "";
  if (moduleName === "style") renderStyleModule();
  else if (moduleName === "library") renderLibraryModule();
  else if (moduleName === "integration") renderIntegrationModule();
  else if (moduleName === "trash") renderTrashModule();
  else if (moduleName === "settings") renderProjectSettingsModule();
}

function styleStatusLabel(status) {
  return { normal: "普通", selected: "候选", confirmed: "已确认", archived: "已归档" }[status] || status || "普通";
}

function selectedStyleDirection() {
  const styles = state.projectAssets.styles || [];
  return styles.find((item) => item.id === state.projectAssets.selectedId) || styles[0] || null;
}

function styleCoverRecord(direction) {
  const records = state.aiCreation.history.filter((item) => item.style_direction_id === direction?.id && item.status === "succeeded");
  return records.find((item) => item.id === direction?.cover_image_id) || records[0] || null;
}

function styleReferenceUrl(reference) {
  return reference?.relative_path
    ? `/api/v1/projects/${encodeURIComponent(activeProjectId())}/files/${String(reference.relative_path).split("/").map(encodeURIComponent).join("/")}`
    : "";
}

function styleCanvasItems() {
  const directions = state.projectAssets.styles.map((item) => ({
    id: item.id,
    refType: "style_direction",
    title: item.name,
    subtitle: `${styleStatusLabel(item.status)} · ${(item.tags || []).join(" / ")}`,
    image: styleCoverRecord(item)?.local_url || "",
  }));
  const images = state.aiCreation.history
    .filter((item) => item.style_direction_id && item.status === "succeeded" && item.lifecycle_status !== "trashed")
    .map((item) => ({
      id: item.id,
      refType: "generation_result",
      title: item.prompt || "风格探索结果",
      subtitle: `${styleStatusLabel(item.lifecycle_status || "normal")} · ${aiRecordDate(item)}`,
      image: item.local_url || "",
    }));
  return [...directions, ...images];
}

function renderStyleModule() {
  const styles = state.projectAssets.styles || [];
  if (!state.projectAssets.selectedId && styles[0]) state.projectAssets.selectedId = styles[0].id;
  const selected = selectedStyleDirection();
  const view = state.projectAssets.activeView.style || "list";
  els.projectAssetModuleActions.innerHTML = `${projectModuleViewSwitch("style")}<button class="primary-button" type="button" data-project-action="style-new">新建方向</button>`;
  if (view === "canvas") {
    els.projectAssetModuleBody.innerHTML = `<div class="style-canvas-layout">
      <aside class="canvas-context-panel"><div class="canvas-side-head"><strong>已保存方向</strong><span>${styles.length}</span></div><div class="canvas-direction-list">${styles.map((item) => `<button class="${selected?.id === item.id ? "active" : ""}" type="button" data-project-action="style-select" data-id="${escapeHtml(item.id)}"><span class="asset-row-thumb">${styleCoverRecord(item)?.local_url ? `<img src="${escapeHtml(styleCoverRecord(item).local_url)}" alt="">` : "ST"}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(styleStatusLabel(item.status))} · ${escapeHtml(aiRecordDate({ created_at: item.updated_at }))}</small></span></button>`).join("") || '<div class="asset-table-empty">暂无方向</div>'}</div></aside>
      <div id="styleCanvasHost" class="asset-canvas-host"></div>
      <aside class="canvas-settings-panel"><h3>生成设置</h3>${selected ? `<label class="ai-field"><span>描述需求</span><textarea id="stylePromptEditor" rows="6">${escapeHtml(selected.description || "")}</textarea></label><label class="ai-field"><span>参考图</span><input id="styleReferenceInput" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><div class="ai-field-grid"><label class="ai-field"><span>图片比例</span><select id="styleRatioSelect">${["1:1","9:16","16:9","4:3","3:4"].map((value) => `<option ${value === (activeProject()?.default_aspect_ratio || "1:1") ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="ai-field"><span>生成数量</span><select id="styleCountSelect"><option>1</option><option selected>2</option><option>4</option></select></label></div><label class="ai-field"><span>风格强度</span><input id="styleStrengthInput" type="range" min="0" max="100" value="70"></label><details class="ai-advanced-settings"><summary>高级设置</summary><label class="ai-field"><span>负面提示</span><textarea id="styleNegativePromptInput" rows="3"></textarea></label></details><div class="asset-detail-actions"><button class="primary-button" type="button" data-project-action="style-generate" data-id="${escapeHtml(selected.id)}">生成图片</button><button class="ghost-button" type="button" data-project-action="style-variant" data-id="${escapeHtml(selected.id)}">生成变体</button></div><button class="ghost-button wide" type="button" data-project-action="style-status" data-status="confirmed" data-id="${escapeHtml(selected.id)}">确认为项目风格</button>` : '<div class="asset-detail-empty">选择方向后生成</div>'}</aside>
    </div>`;
    renderProjectCanvasModule("style", styleCanvasItems(), document.getElementById("styleCanvasHost"));
    return;
  }
  const stats = { selected: styles.filter((item) => item.status === "selected").length, confirmed: styles.filter((item) => item.status === "confirmed").length, archived: styles.filter((item) => item.status === "archived").length };
  const visibleStyles = styles.filter((item) => {
    if (state.projectAssets.styleGroup === "ungrouped" && item.group_id) return false;
    if (!["all", "ungrouped"].includes(state.projectAssets.styleGroup) && item.group_id !== state.projectAssets.styleGroup) return false;
    return !state.projectAssets.filters.query || `${item.name} ${item.description} ${(item.tags || []).join(" ")}`.toLowerCase().includes(state.projectAssets.filters.query.toLowerCase());
  });
  els.projectAssetModuleBody.innerHTML = `
    <div class="project-stat-strip">
      <span><small>全部</small><strong>${styles.length}</strong></span><span><small>候选</small><strong>${stats.selected}</strong></span><span><small>已确认</small><strong>${stats.confirmed}</strong></span><span><small>已归档</small><strong>${stats.archived}</strong></span>
    </div>
    <div class="asset-list-layout style-list-layout">
      <aside class="asset-filter-panel">
        <h3>方向分组</h3>
        <button class="filter-row ${state.projectAssets.styleGroup === "all" ? "active" : ""}" type="button" data-project-action="style-group-filter" data-group="all"><span>全部方向</span><strong>${styles.length}</strong></button>
        <button class="filter-row ${state.projectAssets.styleGroup === "ungrouped" ? "active" : ""}" type="button" data-project-action="style-group-filter" data-group="ungrouped"><span>未分组</span><strong>${styles.filter((item) => !item.group_id).length}</strong></button>
        ${Array.from(new Set(styles.map((item) => item.group_id).filter(Boolean))).map((group) => `<button class="filter-row ${state.projectAssets.styleGroup === group ? "active" : ""}" type="button" data-project-action="style-group-filter" data-group="${escapeHtml(group)}"><span>${escapeHtml(group)}</span><strong>${styles.filter((item) => item.group_id === group).length}</strong></button>`).join("")}
      </aside>
      <section class="asset-table-panel">
        <div class="asset-table-toolbar"><input type="search" data-project-filter="query" placeholder="搜索方向名称、标签或描述" value="${escapeHtml(state.projectAssets.filters.query)}"><button class="ghost-button" type="button" data-project-action="style-new-group">新建分组</button><button class="ghost-button" type="button" data-project-action="style-manage-groups">管理分组</button></div>
        <div class="asset-data-table style-data-table">
          <div class="asset-data-head"><span>预览</span><span>方向名称</span><span>状态</span><span>更新时间</span><span></span></div>
          ${visibleStyles.map((item) => {
            const cover = styleCoverRecord(item);
            return `<button class="asset-data-row ${selected?.id === item.id ? "selected" : ""}" type="button" data-project-action="style-select" data-id="${escapeHtml(item.id)}">
              <span class="asset-row-thumb">${cover?.local_url ? `<img src="${escapeHtml(cover.local_url)}" alt="">` : "<b>ST</b>"}</span>
              <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description || (item.tags || []).join(" / ") || "暂无描述")}</small></span>
              <span><em class="lifecycle-chip ${escapeHtml(item.status)}">${escapeHtml(styleStatusLabel(item.status))}</em></span>
              <span>${escapeHtml(aiRecordDate({ created_at: item.updated_at }))}</span><span>›</span>
            </button>`;
          }).join("") || '<div class="asset-table-empty">暂无风格方向</div>'}
        </div>
      </section>
      <aside class="asset-detail-panel">${selected ? renderStyleDetail(selected) : '<div class="asset-detail-empty">选择或新建一个风格方向</div>'}</aside>
    </div>`;
}

function renderStyleDetail(style) {
  const cover = styleCoverRecord(style);
  const images = state.aiCreation.history.filter((item) => item.style_direction_id === style.id && item.status === "succeeded");
  return `
    <div class="asset-detail-preview">${cover?.local_url ? `<img src="${escapeHtml(cover.local_url)}" alt="${escapeHtml(style.name)}">` : "<span>尚未生成风格图</span>"}</div>
    <label class="ai-field"><span>方向名称</span><input id="styleNameEditor" type="text" maxlength="60" value="${escapeHtml(style.name)}"></label>
    <label class="ai-field"><span>风格标签</span><input id="styleTagsEditor" type="text" value="${escapeHtml((style.tags || []).join(", "))}" placeholder="标签以逗号分隔"></label>
    <label class="ai-field"><span>分组</span><input id="styleGroupEditor" type="text" value="${escapeHtml(style.group_id || "")}" placeholder="未分组"></label>
    <label class="ai-field"><span>风格描述</span><textarea id="styleDescriptionEditor" rows="5">${escapeHtml(style.description || "")}</textarea></label>
    <label class="ai-field"><span>继续探索</span><textarea id="stylePromptEditor" rows="4" placeholder="描述希望继续探索的视觉方向">${escapeHtml(style.description || "")}</textarea></label>
    <label class="ai-field"><span>参考图</span><input id="styleReferenceInput" type="file" accept="image/png,image/jpeg,image/webp" multiple></label>
    <div class="asset-reference-strip">${(style.reference_images || []).map((item) => `<img src="${escapeHtml(styleReferenceUrl(item))}" alt="${escapeHtml(item.file_name || "参考图")}">`).join("")}</div>
    <div class="asset-reference-strip">${images.slice(0, 6).map((item) => `<button type="button" data-project-action="style-cover" data-id="${escapeHtml(item.id)}"><img src="${escapeHtml(item.local_url)}" alt=""></button>`).join("")}</div>
    <dl class="asset-detail-meta"><div><dt>当前状态</dt><dd>${escapeHtml(styleStatusLabel(style.status))}</dd></div><div><dt>创建时间</dt><dd>${escapeHtml(aiRecordDate({ created_at: style.created_at }))}</dd></div><div><dt>更新时间</dt><dd>${escapeHtml(aiRecordDate({ created_at: style.updated_at }))}</dd></div></dl>
    <div class="asset-detail-actions"><button class="primary-button" type="button" data-project-action="style-generate" data-id="${escapeHtml(style.id)}">生成图片</button><button class="ghost-button" type="button" data-project-action="style-save" data-id="${escapeHtml(style.id)}">保存</button></div>
    <div class="asset-detail-actions"><button class="ghost-button" type="button" data-project-action="style-status" data-status="selected" data-id="${escapeHtml(style.id)}">设为候选</button><button class="ghost-button" type="button" data-project-action="style-status" data-status="confirmed" data-id="${escapeHtml(style.id)}">确认为项目风格</button></div>
    <div class="asset-detail-actions"><button class="ghost-button" type="button" data-project-action="style-status" data-status="archived" data-id="${escapeHtml(style.id)}">归档</button><button class="ghost-button danger" type="button" data-project-action="style-delete" data-id="${escapeHtml(style.id)}">移入回收站</button></div>`;
}

function libraryStatusLabel(status) {
  return { normal: "普通", selected: "已选", confirmed: "已确认", in_library: "已入库", archived: "已归档" }[status] || status || "已入库";
}

function selectedLibraryAsset() {
  const assets = state.projectAssets.library || [];
  return assets.find((item) => item.id === state.projectAssets.selectedId) || assets[0] || null;
}

function filteredLibraryAssets() {
  const filters = state.projectAssets.filters;
  return (state.projectAssets.library || []).filter((item) => {
    if (filters.query && !`${item.name} ${(item.tags || []).join(" ")}`.toLowerCase().includes(filters.query.toLowerCase())) return false;
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.format !== "all" && item.file_format !== filters.format) return false;
    if (filters.background !== "all" && (item.background || "transparent") !== filters.background) return false;
    return true;
  });
}

function renderLibraryModule() {
  const assets = state.projectAssets.library || [];
  if (!state.projectAssets.selectedId && assets[0]) state.projectAssets.selectedId = assets[0].id;
  const view = state.projectAssets.activeView.library || "list";
  const selected = selectedLibraryAsset();
  const visible = filteredLibraryAssets();
  els.projectAssetModuleActions.innerHTML = `${projectModuleViewSwitch("library")}<button class="ghost-button" type="button" data-project-action="library-download-selected">下载已选</button>`;
  if (view === "canvas") {
    els.projectAssetModuleBody.innerHTML = `<div class="library-canvas-layout">
      <aside class="canvas-context-panel"><h3>资产筛选</h3><label><span>分类</span><select data-project-filter="category"><option value="all">全部分类</option>${[["character","角色"],["scene","场景"],["ui","UI"],["icon","图标"],["effect","特效"],["other","其他"]].map(([value,label]) => `<option value="${value}" ${state.projectAssets.filters.category === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label><span>状态</span><select data-project-filter="status"><option value="all">全部状态</option>${["in_library","selected","confirmed","archived"].map((value) => `<option value="${value}" ${state.projectAssets.filters.status === value ? "selected" : ""}>${libraryStatusLabel(value)}</option>`).join("")}</select></label><label><span>标签</span><input type="search" data-project-filter="query" value="${escapeHtml(state.projectAssets.filters.query)}" placeholder="搜索标签或名称"></label><div class="canvas-side-summary"><strong>${visible.length}</strong><span>项符合条件</span></div></aside>
      <div id="libraryCanvasHost" class="asset-canvas-host"></div>
      <aside class="canvas-settings-panel"><h3>当前资产</h3>${selected ? renderLibraryDetail(selected) : '<div class="asset-detail-empty">选择资产查看详情</div>'}</aside>
    </div>`;
    renderProjectCanvasModule("library", visible.map((item) => ({ id: item.id, refType: "library_asset", title: item.name, subtitle: `${item.category} · ${libraryStatusLabel(item.status)}`, image: item.url || "" })), document.getElementById("libraryCanvasHost"));
    return;
  }
  els.projectAssetModuleBody.innerHTML = `
    <div class="asset-list-layout library-list-layout">
      <aside class="asset-filter-panel"><h3>筛选</h3>
        <label><span>分类</span><select data-project-filter="category"><option value="all">全部分类</option>${[["character","角色"],["scene","场景"],["ui","UI"],["icon","图标"],["effect","特效"],["other","其他"]].map(([value,label]) => `<option value="${value}" ${state.projectAssets.filters.category === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label><span>状态</span><select data-project-filter="status"><option value="all">全部状态</option><option value="in_library" ${state.projectAssets.filters.status === "in_library" ? "selected" : ""}>已入库</option><option value="selected" ${state.projectAssets.filters.status === "selected" ? "selected" : ""}>已选</option><option value="confirmed" ${state.projectAssets.filters.status === "confirmed" ? "selected" : ""}>已确认</option><option value="archived" ${state.projectAssets.filters.status === "archived" ? "selected" : ""}>已归档</option></select></label>
        <label><span>文件格式</span><select data-project-filter="format"><option value="all">全部格式</option><option value="png" ${state.projectAssets.filters.format === "png" ? "selected" : ""}>PNG</option><option value="jpg" ${state.projectAssets.filters.format === "jpg" ? "selected" : ""}>JPG</option><option value="webp" ${state.projectAssets.filters.format === "webp" ? "selected" : ""}>WebP</option></select></label>
        <label><span>背景</span><select data-project-filter="background"><option value="all">全部背景</option><option value="transparent" ${state.projectAssets.filters.background === "transparent" ? "selected" : ""}>透明</option><option value="solid" ${state.projectAssets.filters.background === "solid" ? "selected" : ""}>纯色</option><option value="scene" ${state.projectAssets.filters.background === "scene" ? "selected" : ""}>场景</option></select></label>
      </aside>
      <section class="asset-table-panel"><div class="asset-table-toolbar"><input type="search" data-project-filter="query" placeholder="搜索名称或标签" value="${escapeHtml(state.projectAssets.filters.query)}"><span>${visible.length} 项资产</span></div>
        <div class="asset-data-table library-data-table"><div class="asset-data-head"><span></span><span>缩略图</span><span>名称</span><span>分类</span><span>状态</span><span>格式 / 尺寸</span><span>更新时间</span></div>
          ${visible.map((item) => `<div class="asset-data-row ${selected?.id === item.id ? "selected" : ""}" data-project-action="library-select" data-id="${escapeHtml(item.id)}">
            <span><input type="checkbox" data-project-action="library-check" data-id="${escapeHtml(item.id)}" ${state.projectAssets.selectedIds.has(item.id) ? "checked" : ""}></span><span class="asset-row-thumb"><img src="${escapeHtml(item.url || "")}" alt=""></span>
            <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml((item.tags || []).join(" / ") || item.file_name || "")}</small></span><span>${escapeHtml(item.category || "other")}</span><span><em class="lifecycle-chip">${escapeHtml(libraryStatusLabel(item.status))}</em></span><span>${escapeHtml(String(item.file_format || "").toUpperCase())} · ${Number(item.width || 0)}×${Number(item.height || 0)}</span><span>${escapeHtml(aiRecordDate({ created_at: item.updated_at }))}</span>
          </div>`).join("") || '<div class="asset-table-empty">暂无符合条件的资产</div>'}</div>
      </section>
      <aside class="asset-detail-panel">${selected ? renderLibraryDetail(selected) : '<div class="asset-detail-empty">选择资产查看详情</div>'}</aside>
    </div>`;
}

function renderLibraryDetail(asset) {
  return `<div class="asset-detail-preview checker"><img src="${escapeHtml(asset.url || "")}" alt="${escapeHtml(asset.name)}"></div>
    <label class="ai-field"><span>名称</span><input id="libraryNameEditor" type="text" value="${escapeHtml(asset.name)}"></label>
    <label class="ai-field"><span>标签</span><input id="libraryTagsEditor" type="text" value="${escapeHtml((asset.tags || []).join(", "))}"></label>
    <label class="ai-field"><span>分类</span><select id="libraryCategoryEditor">${["character","scene","ui","icon","effect","other"].map((value) => `<option value="${value}" ${asset.category === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
    <label class="ai-field"><span>状态</span><select id="libraryStatusEditor">${["in_library","selected","confirmed","archived"].map((value) => `<option value="${value}" ${asset.status === value ? "selected" : ""}>${libraryStatusLabel(value)}</option>`).join("")}</select></label>
    <dl class="asset-detail-meta"><div><dt>尺寸</dt><dd>${Number(asset.width || 0)} × ${Number(asset.height || 0)}</dd></div><div><dt>格式</dt><dd>${escapeHtml(String(asset.file_format || "").toUpperCase())}</dd></div><div><dt>大小</dt><dd>${formatImageBytes(Number(asset.bytes || 0))}</dd></div><div><dt>背景</dt><dd>${escapeHtml(asset.background || "transparent")}</dd></div><div><dt>更新时间</dt><dd>${escapeHtml(aiRecordDate({ created_at: asset.updated_at }))}</dd></div><div><dt>来源资产</dt><dd>${escapeHtml(asset.source_asset_node_id || "-")}</dd></div><div><dt>来源项目</dt><dd>${escapeHtml(activeProject()?.display_name || "-")}</dd></div></dl>
    <div class="asset-detail-actions"><a class="primary-button" href="${escapeHtml(asset.url || "")}" download="${escapeHtml(asset.file_name || "asset")}">下载素材</a><button class="ghost-button" type="button" data-project-action="library-save" data-id="${escapeHtml(asset.id)}">保存信息</button></div>
    <div class="asset-detail-actions"><button class="ghost-button" type="button" data-project-action="library-preview" data-id="${escapeHtml(asset.id)}">预览原图</button><button class="ghost-button" type="button" data-project-action="library-remove" data-id="${escapeHtml(asset.id)}">移出资产管理</button><button class="ghost-button danger" type="button" data-project-action="library-delete" data-id="${escapeHtml(asset.id)}">删除</button></div>`;
}

function renderIntegrationModule() {
  const integration = state.projectAssets.integration || { target_root: "", mappings: {}, deployments: [] };
  const mappings = integration.mappings || {};
  const categories = [["character","角色"],["scene","场景"],["ui","UI"],["icon","图标"],["effect","特效"],["other","其他"]];
  els.projectAssetModuleActions.innerHTML = '<button class="ghost-button" type="button" data-project-action="integration-preflight">冲突预检</button><button class="primary-button" type="button" data-project-action="integration-deploy">部署已入库资产</button>';
  els.projectAssetModuleBody.innerHTML = `<div class="integration-layout">
    <section class="integration-config-panel"><h3>正式项目目录</h3><div class="path-picker-row"><input id="integrationTargetInput" type="text" value="${escapeHtml(integration.target_root || "")}" placeholder="选择或输入正式项目根目录"><button class="ghost-button" type="button" data-project-action="integration-browse">选择文件夹</button><button class="primary-button" type="button" data-project-action="integration-save">保存绑定</button></div>
      <h3>分类映射</h3><div class="integration-mapping-grid">${categories.map(([key,label]) => `<label><span>${label}</span><input data-integration-mapping="${key}" value="${escapeHtml(mappings[key] || key)}" placeholder="目标相对目录"></label>`).join("")}</div>
      <div id="integrationPreflightResult" class="integration-preflight-result"><span>部署前会检查目标路径、缺失文件、同名冲突和文件哈希。</span></div>
    </section>
    <aside class="integration-deployment-panel"><div class="integration-summary"><span><small>可部署资产</small><strong>${state.projectAssets.library.length}</strong></span><span><small>部署记录</small><strong>${(integration.deployments || []).length}</strong></span></div><h3>最近部署</h3>
      <div class="deployment-list">${(integration.deployments || []).slice(0, 12).map((item) => `<article><strong>${escapeHtml(item.id)}</strong><span>${(item.files || []).length} 个文件 · ${escapeHtml(item.status)}</span><small>${escapeHtml(aiRecordDate({ created_at: item.created_at }))}</small></article>`).join("") || '<div class="asset-table-empty">暂无部署记录</div>'}</div>
    </aside></div>`;
}

function trashTypeLabel(value) {
  return { style_direction: "风格方向", generation_result: "生成结果", library_asset: "入库资产", asset_node: "资产节点" }[value] || value || "项目对象";
}

function renderTrashModule() {
  const items = state.projectAssets.trash || [];
  els.projectAssetModuleActions.innerHTML = '<button class="ghost-button" type="button" data-project-action="trash-restore-selected">批量恢复</button><button class="ghost-button danger" type="button" data-project-action="trash-purge-selected">彻底删除</button><button class="primary-button danger" type="button" data-project-action="trash-clear">清空回收站</button>';
  els.projectAssetModuleBody.innerHTML = `<div class="trash-table"><div class="asset-data-head"><span></span><span>名称</span><span>类型</span><span>原位置</span><span>删除时间</span><span>操作</span></div>
    ${items.map((item) => `<div class="asset-data-row"><span><input type="checkbox" data-project-action="trash-check" data-id="${escapeHtml(item.id)}" ${state.projectAssets.selectedIds.has(item.id) ? "checked" : ""}></span><span><strong>${escapeHtml(item.name || item.object_id)}</strong><small>${escapeHtml(item.object_id || "")}</small></span><span>${escapeHtml(trashTypeLabel(item.object_type))}</span><span>${escapeHtml(item.source_module || "-")}</span><span>${escapeHtml(aiRecordDate({ created_at: item.trashed_at }))}</span><span><button class="ghost-button tiny" type="button" data-project-action="trash-restore" data-id="${escapeHtml(item.id)}">恢复</button><button class="ghost-button tiny danger" type="button" data-project-action="trash-purge" data-id="${escapeHtml(item.id)}">彻底删除</button></span></div>`).join("") || '<div class="asset-table-empty">回收站为空</div>'}</div>`;
}

const PROJECT_RATIO_PRESETS = ["1:1", "9:16", "16:9", "4:3", "3:4"];

function projectRatioOptions(value) {
  const current = String(value || "1:1");
  const custom = !PROJECT_RATIO_PRESETS.includes(current);
  return `${PROJECT_RATIO_PRESETS.map((ratio) => `<option value="${ratio}" ${current === ratio ? "selected" : ""}>${ratio}</option>`).join("")}<option value="custom" ${custom ? "selected" : ""}>自定义</option>`;
}

function renderProjectSettingsModule() {
  const project = activeProject() || {};
  const tab = state.projectAssets.settingsTab;
  els.projectAssetModuleActions.innerHTML = '<button class="primary-button" type="button" data-project-action="settings-save">保存设置</button>';
  const tabs = [["basic","基础信息"],["generation","默认生成参数"],["style","风格设置"],["data","数据管理"]];
  let body = "";
  if (tab === "basic") body = `<div class="settings-form-grid"><label class="ai-field"><span>项目名称</span><input id="settingsProjectName" maxlength="30" value="${escapeHtml(project.display_name || "")}"></label><label class="ai-field"><span>项目类型</span><select id="settingsProjectType">${["game-art","vertical-game","horizontal-game","ui-system","other"].map((value) => `<option value="${value}" ${project.project_type === value ? "selected" : ""}>${projectTypeLabel(value)}</option>`).join("")}</select></label><label class="ai-field"><span>项目比例</span><select id="settingsAspectRatio">${projectRatioOptions(project.aspect_ratio)}</select></label><label class="ai-field"><span>自定义比例</span><input id="settingsCustomAspectRatio" value="${escapeHtml(PROJECT_RATIO_PRESETS.includes(project.aspect_ratio) ? "" : project.aspect_ratio || "")}" placeholder="选择自定义时填写，例如 21:9"></label><label class="ai-field settings-wide"><span>项目简介</span><textarea id="settingsDescription" maxlength="200" rows="5">${escapeHtml(project.description || "")}</textarea></label><label class="ai-field settings-wide"><span>项目封面</span><input id="settingsCoverInput" type="file" accept="image/png,image/jpeg,image/webp"></label></div>`;
  else if (tab === "generation") body = `<div class="settings-form-grid"><label class="ai-field"><span>默认图片比例</span><select id="settingsDefaultRatio">${projectRatioOptions(project.default_aspect_ratio)}</select></label><label class="ai-field"><span>自定义默认比例</span><input id="settingsCustomDefaultRatio" value="${escapeHtml(PROJECT_RATIO_PRESETS.includes(project.default_aspect_ratio) ? "" : project.default_aspect_ratio || "")}" placeholder="选择自定义时填写，例如 21:9"></label><label class="ai-field"><span>默认背景</span><select id="settingsDefaultBackground"><option value="transparent" ${project.default_background === "transparent" ? "selected" : ""}>透明</option><option value="solid" ${project.default_background === "solid" ? "selected" : ""}>纯色</option><option value="scene" ${project.default_background === "scene" ? "selected" : ""}>场景</option></select></label><label class="ai-field"><span>默认生成数量</span><input id="settingsDefaultCount" type="number" min="1" max="16" value="${Number(project.default_image_count || 4)}"></label><label class="ai-field"><span>默认文件格式</span><select id="settingsDefaultFormat"><option value="png" ${project.default_file_format === "png" ? "selected" : ""}>PNG</option><option value="jpg" ${project.default_file_format === "jpg" ? "selected" : ""}>JPG</option><option value="webp" ${project.default_file_format === "webp" ? "selected" : ""}>WebP</option></select></label></div>`;
  else if (tab === "style") {
    const confirmed = state.projectAssets.styles.find((item) => item.id === project.current_style_direction_id) || null;
    body = `<div class="settings-style-panel"><div class="settings-current-style"><span>当前项目风格</span><strong>${escapeHtml(confirmed?.name || "尚未确认")}</strong><small>${escapeHtml(confirmed?.description || "可在风格探索中选择候选并确认")}</small></div>${confirmed ? `<div class="asset-reference-strip">${(confirmed.reference_images || []).map((item) => `<img src="${escapeHtml(styleReferenceUrl(item))}" alt="${escapeHtml(item.file_name || "风格参考图")}">`).join("") || '<span>暂无风格参考图</span>'}</div>` : ""}<label class="ai-field"><span>默认风格标签</span><input id="settingsStyleTags" value="${escapeHtml((project.style_tags || []).join(", "))}"></label><button class="ghost-button danger" type="button" data-project-action="settings-unconfirm-style" ${confirmed ? "" : "disabled"}>解除风格确认</button></div>`;
  } else body = `<div class="settings-data-panel"><article><div><strong>导出项目数据</strong><span>导出项目清单、风格、资产树、入库资产、画布和事件摘要。</span></div><button class="ghost-button" type="button" data-project-action="settings-export">导出 JSON</button></article><article><div><strong>清空生成结果</strong><span>所有生成结果会进入项目回收站，可在彻底删除前恢复。</span></div><button class="ghost-button danger" type="button" data-project-action="settings-clear-generation">移入回收站</button></article><article><div><strong>删除项目</strong><span>项目目录将移动到本机 deleted-projects 归档区。</span></div><button class="primary-button danger" type="button" data-project-action="settings-delete-project" ${project.is_default ? "disabled" : ""}>删除项目</button></article></div>`;
  els.projectAssetModuleBody.innerHTML = `<div class="settings-layout"><nav class="settings-tabs">${tabs.map(([value,label]) => `<button class="${tab === value ? "active" : ""}" type="button" data-project-action="settings-tab" data-tab="${value}">${label}</button>`).join("")}</nav><section class="settings-panel">${body}</section></div>`;
}

async function loadCanvasForType(canvasType, items) {
  const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/canvases/${encodeURIComponent(canvasType)}?ts=${Date.now()}`);
  const canvas = data.canvas || { viewport: { x: 0, y: 0, zoom: 1 }, nodes: [] };
  const known = new Set(canvas.nodes.map((node) => node.ref_id).filter(Boolean));
  items.forEach((item, index) => {
    if (known.has(item.id)) return;
    canvas.nodes.push({ id: `node_${item.id}`, ref_type: item.refType || (canvasType === "style" ? "style_direction" : canvasType === "library" ? "library_asset" : "asset"), ref_id: item.id, title: item.title, note: item.subtitle || "", x: 70 + (index % 4) * 260, y: 70 + Math.floor(index / 4) * 210, width: 220, height: 160, locked: false, z_index: index, group_id: "" });
  });
  state.projectAssets.canvas = canvas;
  state.projectAssets.canvasType = canvasType;
  state.projectAssets.canvasSelection.clear();
  return canvas;
}

async function renderProjectCanvasModule(canvasType, items, host = els.projectAssetModuleBody) {
  host.innerHTML = '<div class="project-tool-loading">正在读取画布...</div>';
  try {
    await loadCanvasForType(canvasType, items);
    paintProjectCanvas(host, items);
    scheduleCanvasSave();
  } catch (error) {
    host.innerHTML = `<div class="project-tool-error">画布读取失败：${escapeHtml(error.message)}</div>`;
  }
}

function canvasItemMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function paintProjectCanvas(host, items) {
  const canvas = state.projectAssets.canvas || { viewport: { x: 0, y: 0, zoom: 1 }, nodes: [] };
  const viewport = canvas.viewport || { x: 0, y: 0, zoom: 1 };
  const itemMap = canvasItemMap(items);
  const groups = Array.from(new Set((canvas.nodes || []).map((node) => node.group_id).filter(Boolean))).map((groupId) => {
    const nodes = canvas.nodes.filter((node) => node.group_id === groupId);
    const left = Math.min(...nodes.map((node) => Number(node.x || 0))) - 24;
    const top = Math.min(...nodes.map((node) => Number(node.y || 0))) - 42;
    const right = Math.max(...nodes.map((node) => Number(node.x || 0) + Number(node.width || 220))) + 24;
    const bottom = Math.max(...nodes.map((node) => Number(node.y || 0) + Number(node.height || 160))) + 24;
    return { id: groupId, left, top, width: right - left, height: bottom - top };
  });
  const edges = state.projectAssets.canvasType === "production"
    ? (canvas.nodes || []).flatMap((node) => {
      const item = itemMap.get(node.ref_id);
      if (!item?.parentId) return [];
      const parent = canvas.nodes.find((candidate) => candidate.ref_id === item.parentId);
      if (!parent) return [];
      const x1 = Number(parent.x || 0) + Number(parent.width || 220) / 2;
      const y1 = Number(parent.y || 0) + Number(parent.height || 160) / 2;
      const x2 = Number(node.x || 0) + Number(node.width || 220) / 2;
      const y2 = Number(node.y || 0) + Number(node.height || 160) / 2;
      const width = Math.hypot(x2 - x1, y2 - y1);
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      return [{ x: x1, y: y1, width, angle }];
    })
    : [];
  host.innerHTML = `<div class="asset-canvas-shell" data-canvas-type="${escapeHtml(state.projectAssets.canvasType)}">
    <div class="asset-canvas-toolbar"><button type="button" data-canvas-action="select" class="${state.projectAssets.canvasTool === "select" ? "active" : ""}">选择</button><button type="button" data-canvas-action="box-select" class="${state.projectAssets.canvasTool === "box" ? "active" : ""}">框选</button><button type="button" data-canvas-action="note">便签</button><button type="button" data-canvas-action="group">分组</button><button type="button" data-canvas-action="align">对齐</button><button type="button" data-canvas-action="lock">锁定</button><button type="button" data-canvas-action="delete">删除</button><span></span><button class="asset-canvas-icon-button" type="button" data-canvas-action="undo" title="撤销" aria-label="撤销">↶</button><button class="asset-canvas-icon-button" type="button" data-canvas-action="redo" title="重做" aria-label="重做">↷</button><button class="asset-canvas-icon-button" type="button" data-canvas-action="zoom-out" title="缩小" aria-label="缩小">−</button><strong>${Math.round(Number(viewport.zoom || 1) * 100)}%</strong><button class="asset-canvas-icon-button" type="button" data-canvas-action="zoom-in" title="放大" aria-label="放大">＋</button><button type="button" data-canvas-action="fit">适应</button></div>
    <div class="asset-canvas-viewport"><div class="asset-canvas-scene" style="transform:translate(${Number(viewport.x || 0)}px,${Number(viewport.y || 0)}px) scale(${Number(viewport.zoom || 1)})">
      ${edges.map((edge) => `<span class="asset-canvas-edge" style="left:${edge.x}px;top:${edge.y}px;width:${edge.width}px;transform:rotate(${edge.angle}deg)"></span>`).join("")}
      ${groups.map((group) => `<div class="asset-canvas-group-frame" style="left:${group.left}px;top:${group.top}px;width:${group.width}px;height:${group.height}px"><span>分组</span></div>`).join("")}
      ${(canvas.nodes || []).map((node) => {
        const item = itemMap.get(node.ref_id) || {};
        const selected = state.projectAssets.canvasSelection.has(node.id);
        return `<article class="asset-canvas-node ${selected ? "selected" : ""} ${node.locked ? "locked" : ""} ${node.ref_type === "note" ? "note" : ""}" data-canvas-node="${escapeHtml(node.id)}" style="left:${Number(node.x || 0)}px;top:${Number(node.y || 0)}px;width:${Number(node.width || 220)}px;height:${Number(node.height || 160)}px;z-index:${Number(node.z_index || 0)}">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : node.ref_type === "note" ? "" : '<div class="asset-canvas-placeholder">ASSET</div>'}<div class="asset-canvas-node-copy"><strong>${escapeHtml(node.title || item.title || "未命名")}</strong><small>${escapeHtml(node.note || item.subtitle || "")}</small>${(node.tags || []).length ? `<span class="canvas-node-tags">${node.tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("")}</span>` : ""}</div>${node.locked ? '<span class="canvas-lock-indicator">锁</span>' : ""}
        </article>`;
      }).join("")}
    </div></div>
    <div class="asset-canvas-status"><span>${(canvas.nodes || []).length} 个节点</span><span>已选 ${state.projectAssets.canvasSelection.size}</span><span>位置与视口已保存到项目文件</span></div>
  </div>`;
  bindCanvasInteractions(host, items);
}

function canvasSnapshot() {
  return JSON.parse(JSON.stringify(state.projectAssets.canvas || {}));
}

function pushCanvasUndo() {
  state.projectAssets.canvasUndo.push(canvasSnapshot());
  if (state.projectAssets.canvasUndo.length > 50) state.projectAssets.canvasUndo.shift();
  state.projectAssets.canvasRedo = [];
}

function scheduleCanvasSave() {
  window.clearTimeout(state.projectAssets.canvasSaveTimer);
  state.projectAssets.canvasSaveTimer = window.setTimeout(async () => {
    if (!activeProjectId() || !state.projectAssets.canvasType || !state.projectAssets.canvas) return;
    try {
      await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/canvases/${encodeURIComponent(state.projectAssets.canvasType)}`, { method: "POST", body: { canvas: state.projectAssets.canvas } });
    } catch (error) {
      setStatus(`保存画布失败：${error.message}`, "error");
    }
  }, 450);
}

function bindCanvasInteractions(host, items) {
  state.projectAssets.canvasHost = host;
  state.projectAssets.canvasItems = items;
  const viewportElement = host.querySelector(".asset-canvas-viewport");
  viewportElement?.addEventListener("wheel", (event) => {
    event.preventDefault();
    const viewport = state.projectAssets.canvas.viewport;
    viewport.zoom = Math.max(0.1, Math.min(4, Number(viewport.zoom || 1) * (event.deltaY > 0 ? 0.9 : 1.1)));
    paintProjectCanvas(host, items);
    scheduleCanvasSave();
  }, { passive: false });
  viewportElement?.addEventListener("pointerdown", (event) => {
    const nodeElement = event.target.closest("[data-canvas-node]");
    const canvas = state.projectAssets.canvas;
    if (nodeElement) {
      const node = canvas.nodes.find((item) => item.id === nodeElement.dataset.canvasNode);
      if (!node) return;
      if (state.projectAssets.canvasType === "library" && node.ref_type === "library_asset") {
        state.projectAssets.selectedId = node.ref_id;
        const asset = state.projectAssets.library.find((item) => item.id === node.ref_id);
        const detail = host.closest(".library-canvas-layout")?.querySelector(".canvas-settings-panel");
        if (asset && detail) detail.innerHTML = `<h3>当前资产</h3>${renderLibraryDetail(asset)}`;
      }
      if (!event.ctrlKey && !event.metaKey && !state.projectAssets.canvasSelection.has(node.id)) state.projectAssets.canvasSelection.clear();
      if ((event.ctrlKey || event.metaKey) && state.projectAssets.canvasSelection.has(node.id)) state.projectAssets.canvasSelection.delete(node.id);
      else state.projectAssets.canvasSelection.add(node.id);
      if (!node.locked) {
        pushCanvasUndo();
        state.projectAssets.canvasDrag = { mode: "node", startX: event.clientX, startY: event.clientY, originals: new Map(canvas.nodes.filter((item) => state.projectAssets.canvasSelection.has(item.id) && !item.locked).map((item) => [item.id, { x: item.x, y: item.y }])) };
      }
    } else if (state.projectAssets.canvasTool === "box") {
      if (!event.ctrlKey && !event.metaKey) state.projectAssets.canvasSelection.clear();
      const rect = viewportElement.getBoundingClientRect();
      state.projectAssets.canvasDrag = { mode: "box", startX: event.clientX, startY: event.clientY, viewportRect: rect };
      const box = document.createElement("div");
      box.className = "asset-canvas-selection-box";
      viewportElement.appendChild(box);
    } else {
      if (!event.ctrlKey && !event.metaKey) state.projectAssets.canvasSelection.clear();
      state.projectAssets.canvasDrag = { mode: "pan", startX: event.clientX, startY: event.clientY, x: Number(canvas.viewport.x || 0), y: Number(canvas.viewport.y || 0) };
    }
    paintProjectCanvas(host, items);
  });
  host.querySelectorAll("[data-canvas-action]").forEach((button) => button.addEventListener("click", () => handleCanvasAction(button.dataset.canvasAction, host, items)));
  if (!document.documentElement.dataset.projectCanvasBound) {
    document.documentElement.dataset.projectCanvasBound = "true";
    document.addEventListener("pointermove", (event) => {
      const drag = state.projectAssets.canvasDrag;
      if (!drag || !state.projectAssets.canvas) return;
      const currentHost = state.projectAssets.canvasHost;
      if (!currentHost) return;
      if (drag.mode === "node") {
        const zoom = Number(state.projectAssets.canvas.viewport.zoom || 1);
        drag.originals.forEach((origin, id) => {
          const node = state.projectAssets.canvas.nodes.find((item) => item.id === id);
          if (node) { node.x = origin.x + (event.clientX - drag.startX) / zoom; node.y = origin.y + (event.clientY - drag.startY) / zoom; }
        });
      } else if (drag.mode === "pan") {
        state.projectAssets.canvas.viewport.x = drag.x + event.clientX - drag.startX;
        state.projectAssets.canvas.viewport.y = drag.y + event.clientY - drag.startY;
      } else if (drag.mode === "box") {
        const left = Math.min(drag.startX, event.clientX);
        const top = Math.min(drag.startY, event.clientY);
        const right = Math.max(drag.startX, event.clientX);
        const bottom = Math.max(drag.startY, event.clientY);
        const selectionBox = currentHost.querySelector(".asset-canvas-selection-box");
        if (selectionBox) {
          selectionBox.style.left = `${left - drag.viewportRect.left}px`;
          selectionBox.style.top = `${top - drag.viewportRect.top}px`;
          selectionBox.style.width = `${right - left}px`;
          selectionBox.style.height = `${bottom - top}px`;
        }
        currentHost.querySelectorAll("[data-canvas-node]").forEach((element) => {
          const nodeRect = element.getBoundingClientRect();
          if (nodeRect.left <= right && nodeRect.right >= left && nodeRect.top <= bottom && nodeRect.bottom >= top) {
            state.projectAssets.canvasSelection.add(element.dataset.canvasNode);
            element.classList.add("selected");
          }
        });
        return;
      }
      const scene = currentHost.querySelector(".asset-canvas-scene");
      if (scene) {
        const viewport = state.projectAssets.canvas.viewport;
        scene.style.transform = `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})`;
        state.projectAssets.canvas.nodes.forEach((node) => {
          const element = scene.querySelector(`[data-canvas-node="${CSS.escape(node.id)}"]`);
          if (element) { element.style.left = `${node.x}px`; element.style.top = `${node.y}px`; }
        });
      }
    });
    document.addEventListener("pointerup", () => {
      if (!state.projectAssets.canvasDrag) return;
      const wasBox = state.projectAssets.canvasDrag.mode === "box";
      state.projectAssets.canvasDrag = null;
      state.projectAssets.canvasHost?.querySelector(".asset-canvas-selection-box")?.remove();
      if (wasBox && state.projectAssets.canvasHost) {
        paintProjectCanvas(state.projectAssets.canvasHost, state.projectAssets.canvasItems);
      }
      scheduleCanvasSave();
    });
  }
}

function handleCanvasAction(action, host, items) {
  const canvas = state.projectAssets.canvas;
  if (!canvas) return;
  if (action === "select" || action === "box-select") {
    state.projectAssets.canvasTool = action === "box-select" ? "box" : "select";
  } else if (action === "undo" && state.projectAssets.canvasUndo.length) {
    state.projectAssets.canvasRedo.push(canvasSnapshot());
    state.projectAssets.canvas = state.projectAssets.canvasUndo.pop();
  } else if (action === "redo" && state.projectAssets.canvasRedo.length) {
    state.projectAssets.canvasUndo.push(canvasSnapshot());
    state.projectAssets.canvas = state.projectAssets.canvasRedo.pop();
  } else if (action === "zoom-in" || action === "zoom-out") {
    canvas.viewport.zoom = Math.max(0.1, Math.min(4, Number(canvas.viewport.zoom || 1) * (action === "zoom-in" ? 1.2 : 0.8)));
  } else if (action === "fit") {
    canvas.viewport = { x: 30, y: 30, zoom: 0.85 };
  } else if (action === "note") {
    void askText("便签内容", "新便签").then((note) => {
      if (!note) return;
      pushCanvasUndo();
      canvas.nodes.push({ id: `note_${Date.now()}`, ref_type: "note", ref_id: "", title: "便签", note, x: 120, y: 120, width: 220, height: 140, locked: false, z_index: canvas.nodes.length, group_id: "" });
      paintProjectCanvas(host, items);
      scheduleCanvasSave();
    });
    return;
  } else if (action === "group" && state.projectAssets.canvasSelection.size) {
    pushCanvasUndo();
    const groupId = `group_${Date.now()}`;
    canvas.nodes.filter((node) => state.projectAssets.canvasSelection.has(node.id)).forEach((node) => { node.group_id = groupId; });
  } else if (action === "align" && state.projectAssets.canvasSelection.size > 1) {
    pushCanvasUndo();
    const nodes = canvas.nodes.filter((node) => state.projectAssets.canvasSelection.has(node.id) && !node.locked);
    const left = Math.min(...nodes.map((node) => Number(node.x || 0)));
    nodes.forEach((node) => { node.x = left; });
  } else if (action === "lock" && state.projectAssets.canvasSelection.size) {
    pushCanvasUndo();
    const nodes = canvas.nodes.filter((node) => state.projectAssets.canvasSelection.has(node.id));
    const shouldLock = nodes.some((node) => !node.locked);
    nodes.forEach((node) => { node.locked = shouldLock; });
  } else if (action === "delete" && state.projectAssets.canvasSelection.size) {
    pushCanvasUndo();
    canvas.nodes = canvas.nodes.filter((node) => !state.projectAssets.canvasSelection.has(node.id));
    state.projectAssets.canvasSelection.clear();
  }
  paintProjectCanvas(host, items);
  scheduleCanvasSave();
}

function productionCanvasItems() {
  const nodes = state.aiCreation.assetTree.map((item) => {
    const record = state.aiCreation.history.find((entry) => entry.asset_node_id === item.id && entry.status === "succeeded");
    return { id: item.id, parentId: item.parent_id || "", refType: item.type === "category" ? "category" : item.type === "group" ? "group" : "asset", title: item.name, subtitle: `${Number(item.generated_count || 0)} 已生成 · ${Number(item.selected_count || 0)} 已选`, image: record?.local_url || "" };
  });
  const selectedResults = state.aiCreation.history.filter((entry) => entry.status === "succeeded" && ["selected", "confirmed", "in_library"].includes(entry.lifecycle_status)).slice(0, 120).map((entry) => ({ id: entry.id, refType: "generation_result", title: entry.prompt || "已选结果", subtitle: `${entry.lifecycle_status} · ${aiRecordDate(entry)}`, image: entry.local_url || "" }));
  return [...nodes, ...selectedResults];
}

function setProductionView(view) {
  state.projectAssets.activeView.production = view === "canvas" ? "canvas" : "list";
  const isCanvas = state.projectAssets.activeView.production === "canvas";
  els.aiProductionListViewButton?.classList.toggle("active", !isCanvas);
  els.aiProductionCanvasViewButton?.classList.toggle("active", isCanvas);
  els.aiProductionListViewButton?.setAttribute("aria-pressed", String(!isCanvas));
  els.aiProductionCanvasViewButton?.setAttribute("aria-pressed", String(isCanvas));
  if (els.aiImageWorkspace) els.aiImageWorkspace.hidden = isCanvas || state.aiCreation.view === "history";
  if (els.aiProductionCanvasWorkspace) els.aiProductionCanvasWorkspace.hidden = !isCanvas || state.aiCreation.view === "history";
  if (isCanvas && els.aiProductionCanvasHost) void renderProjectCanvasModule("production", productionCanvasItems(), els.aiProductionCanvasHost);
}

function selectedProductionCanvasRecords() {
  const canvas = state.projectAssets.canvas;
  if (!canvas || state.projectAssets.canvasType !== "production") return [];
  const ids = new Set(canvas.nodes.filter((node) => state.projectAssets.canvasSelection.has(node.id) && node.ref_type === "generation_result").map((node) => node.ref_id));
  return state.aiCreation.history.filter((record) => ids.has(record.id));
}

async function handleProductionCanvasQuickAction(event) {
  const button = event.target.closest("[data-production-canvas-action]");
  if (!button) return;
  const action = button.dataset.productionCanvasAction;
  const canvas = state.projectAssets.canvas;
  if (action === "add") {
    const selected = selectedAiAssetNode();
    const node = canvas?.nodes?.find((item) => item.ref_id === selected?.id);
    if (!selected || !node) { setStatus("请先在结构树中选择要加入画布的资产节点。", "error"); return; }
    state.projectAssets.canvasSelection.clear();
    state.projectAssets.canvasSelection.add(node.id);
    paintProjectCanvas(els.aiProductionCanvasHost, productionCanvasItems());
    setStatus(`已在画布中定位“${selected.name}”。`, "success");
    return;
  }
  if (action === "tag") {
    const nodes = canvas?.nodes?.filter((node) => state.projectAssets.canvasSelection.has(node.id)) || [];
    if (!nodes.length) { setStatus("请先选择要添加标签的画布节点。", "error"); return; }
    const value = await askText("添加标签", "", "多个标签可用逗号分隔");
    if (!value) return;
    const tags = value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
    if (!tags.length) return;
    pushCanvasUndo();
    nodes.forEach((node) => { node.tags = Array.from(new Set([...(node.tags || []), ...tags])).slice(0, 12); });
    paintProjectCanvas(els.aiProductionCanvasHost, productionCanvasItems());
    scheduleCanvasSave();
    setStatus(`已为 ${nodes.length} 个画布节点添加标签。`, "success");
    return;
  }
  const records = selectedProductionCanvasRecords();
  if (action === "delete") {
    handleCanvasAction("delete", els.aiProductionCanvasHost, productionCanvasItems());
    return;
  }
  if (!records.length) { setStatus("请先在画布中选择一个生成结果节点。", "error"); return; }
  if (action === "variant") await submitAiImageGeneration(records[0]);
  else if (action === "select-result") await setAiRecordLifecycle(records.map((record) => record.id), records.every((record) => record.lifecycle_status === "selected") ? "normal" : "selected");
  else if (action === "library") await addAiRecordsToLibrary(records.map((record) => record.id));
  else if (action === "download") records.forEach((record, index) => window.setTimeout(() => { const anchor = document.createElement("a"); anchor.href = record.local_url; anchor.download = ""; anchor.click(); }, index * 120));
}

function handleProjectAssetModuleInput(event) {
  const field = event.target.closest("[data-project-filter]");
  if (!field) return;
  state.projectAssets.filters[field.dataset.projectFilter] = field.value;
  if (state.activeModule === "style") renderStyleModule();
  if (state.activeModule === "library") renderLibraryModule();
}

function handleProjectAssetModuleChange(event) {
  handleProjectAssetModuleInput(event);
}

function handleProjectAssetModuleClick(event) {
  const target = event.target.closest("[data-project-action]");
  if (!target) return;
  event.preventDefault();
  void runProjectAssetAction(target.dataset.projectAction || "", target);
}

async function refreshCurrentProjectModule(message = "") {
  await loadProjectAssetModule(state.activeModule);
  await loadProjectDashboard();
  if (message) setStatus(message, "success");
}

async function patchStyle(styleId, changes) {
  const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/styles/${encodeURIComponent(styleId)}`, { method: "PATCH", body: changes });
  const index = state.projectAssets.styles.findIndex((item) => item.id === styleId);
  if (index >= 0) state.projectAssets.styles[index] = data.style;
  return data.style;
}

async function generateStyleImage(style) {
  await ensureAiCreationLoaded();
  const prompt = document.getElementById("stylePromptEditor")?.value.trim() || style.description || style.name;
  const model = state.aiCreation.selectedModel || state.aiCreation.models[0]?.id;
  if (!prompt || !model) throw new Error("请先配置生成服务并填写风格描述");
  const files = Array.from(document.getElementById("styleReferenceInput")?.files || []);
  if (files.length) {
    const references = await uploadProjectReferenceImages(activeProjectId(), files, `style-reference-${style.id}`);
    style = await patchStyle(style.id, { reference_images: [...(style.reference_images || []), ...references].slice(-20) });
  }
  const count = Math.max(1, Math.min(4, Number(document.getElementById("styleCountSelect")?.value || 1)));
  const params = {
    aspect_ratio: document.getElementById("styleRatioSelect")?.value || activeProject()?.default_aspect_ratio || "1:1",
    resolution: "1K",
    style_strength: Number(document.getElementById("styleStrengthInput")?.value || 70),
    negative_prompt: document.getElementById("styleNegativePromptInput")?.value.trim() || "",
    reference_images: (style.reference_images || []).map((item) => item.relative_path),
  };
  const records = [];
  for (let index = 0; index < count; index += 1) {
    const data = await apiJson("/api/v1/generation/tasks", { method: "POST", body: { project_id: activeProjectId(), asset_node_id: "category-other", style_direction_id: style.id, prompt, model, params, actor: "user" } });
    upsertAiHistoryRecord(data.record);
    pollAiGenerationRecord(data.record.id);
    records.push(data.record);
  }
  return records;
}

async function saveIntegration() {
  const mappings = {};
  document.querySelectorAll("[data-integration-mapping]").forEach((input) => { mappings[input.dataset.integrationMapping] = input.value.trim(); });
  const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/integration`, { method: "PATCH", body: { target_root: document.getElementById("integrationTargetInput")?.value.trim() || "", mappings } });
  state.projectAssets.integration = data.integration;
  renderIntegrationModule();
}

async function integrationPreflight() {
  await saveIntegration();
  const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/integration/preflight`, { method: "POST", body: {} });
  const result = data.preflight || {};
  const host = document.getElementById("integrationPreflightResult");
  if (host) host.innerHTML = `<strong class="${result.ready ? "success" : "error"}">${result.ready ? "预检通过" : "预检未通过"}</strong><span>${(result.files || []).length} 个文件，${(result.conflicts || []).length} 个冲突</span>${(result.errors || []).map((item) => `<small>${escapeHtml(item)}</small>`).join("")}`;
  return result;
}

function downloadJsonFile(name, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportProjectData() {
  const projectId = activeProjectId();
  const [project, dashboard, styles, tree, results, library, trash, integration, styleCanvas, productionCanvas, libraryCanvas] = await Promise.all([
    apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/dashboard`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/styles`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/asset-tree`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/generation-results`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/library`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/trash`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/integration`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/canvases/style`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/canvases/production`), apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/canvases/library`),
  ]);
  downloadJsonFile(`${activeProject()?.slug || "project"}-sprite-forge-data.json`, { schema_version: 1, exported_at: new Date().toISOString(), project: project.project, dashboard: dashboard.dashboard, styles: styles.styles, asset_tree: tree.asset_tree, generation_results: results.results, library: library.assets, trash: trash.items, integration: integration.integration, canvases: { style: styleCanvas.canvas, production: productionCanvas.canvas, library: libraryCanvas.canvas } });
}

async function saveProjectSettings() {
  const tab = state.projectAssets.settingsTab;
  const changes = {};
  if (tab === "basic") {
    const selectedRatio = document.getElementById("settingsAspectRatio")?.value || "1:1";
    const aspectRatio = selectedRatio === "custom" ? document.getElementById("settingsCustomAspectRatio")?.value.trim() || "" : selectedRatio;
    if (!validProjectAspectRatio(aspectRatio)) throw new Error("项目比例需要使用“宽:高”格式，例如 21:9。");
    Object.assign(changes, { display_name: document.getElementById("settingsProjectName")?.value, project_type: document.getElementById("settingsProjectType")?.value, aspect_ratio: aspectRatio, description: document.getElementById("settingsDescription")?.value });
  }
  if (tab === "generation") {
    const selectedRatio = document.getElementById("settingsDefaultRatio")?.value || "1:1";
    const defaultRatio = selectedRatio === "custom" ? document.getElementById("settingsCustomDefaultRatio")?.value.trim() || "" : selectedRatio;
    if (!validProjectAspectRatio(defaultRatio)) throw new Error("默认图片比例需要使用“宽:高”格式，例如 21:9。");
    Object.assign(changes, { default_aspect_ratio: defaultRatio, default_background: document.getElementById("settingsDefaultBackground")?.value, default_image_count: Number(document.getElementById("settingsDefaultCount")?.value || 4), default_file_format: document.getElementById("settingsDefaultFormat")?.value });
  }
  if (tab === "style") changes.style_tags = String(document.getElementById("settingsStyleTags")?.value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  if (Object.keys(changes).length) {
    const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}`, { method: "PATCH", body: changes });
    state.projectWorkspace.activeProject = data.project;
    syncProjectContext(data.project);
  }
  const cover = document.getElementById("settingsCoverInput")?.files?.[0];
  if (cover) {
    await uploadProjectReferenceImages(activeProjectId(), [cover], "cover");
    const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}`);
    state.projectWorkspace.activeProject = data.project;
    syncProjectContext(data.project);
  }
  renderProjectSettingsModule();
}

async function runProjectAssetAction(action, target) {
  const id = target.dataset.id || "";
  try {
    if (action === "set-view") {
      state.projectAssets.activeView[target.dataset.kind] = target.dataset.view === "canvas" ? "canvas" : "list";
      renderProjectAssetModule();
    } else if (action === "style-new" || action === "style-new-group") {
      const name = await askText(action === "style-new-group" ? "新方向名称" : "风格方向名称", "新风格方向");
      if (!name) return;
      const groupId = action === "style-new-group" ? await askText("分组名称", "探索组") || "" : "";
      const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/styles`, { method: "POST", body: { name, group_id: groupId } });
      state.projectAssets.styles.unshift(data.style); state.projectAssets.selectedId = data.style.id; renderStyleModule();
    } else if (action === "style-select") {
      state.projectAssets.selectedId = id; renderStyleModule();
    } else if (action === "style-group-filter") {
      state.projectAssets.styleGroup = target.dataset.group || "all"; renderStyleModule();
    } else if (action === "style-manage-groups") {
      const groups = Array.from(new Set(state.projectAssets.styles.map((item) => item.group_id).filter(Boolean)));
      if (!groups.length) { setStatus("当前没有可管理的风格分组。", "error"); return; }
      const source = await askText("要重命名的分组", groups[0], groups.join(" / ")); if (!source || !groups.includes(source)) return;
      const next = await askText("新的分组名称", source); if (!next || next === source) return;
      await Promise.all(state.projectAssets.styles.filter((item) => item.group_id === source).map((item) => patchStyle(item.id, { group_id: next })));
      state.projectAssets.styleGroup = next; renderStyleModule();
    } else if (action === "style-save") {
      let style = state.projectAssets.styles.find((item) => item.id === id);
      const references = await uploadProjectReferenceImages(activeProjectId(), Array.from(document.getElementById("styleReferenceInput")?.files || []), `style-reference-${id}`);
      await patchStyle(id, { name: document.getElementById("styleNameEditor")?.value, description: document.getElementById("styleDescriptionEditor")?.value, tags: String(document.getElementById("styleTagsEditor")?.value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean), group_id: document.getElementById("styleGroupEditor")?.value, reference_images: [...(style?.reference_images || []), ...references].slice(-20) }); renderStyleModule(); setStatus("风格方向已保存。", "success");
    } else if (action === "style-status") {
      await patchStyle(id, { status: target.dataset.status });
      if (target.dataset.status === "confirmed") {
        const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}`);
        state.projectWorkspace.activeProject = data.project; syncProjectContext(data.project);
      }
      renderStyleModule(); await loadProjectDashboard(); setStatus("风格状态已更新。", "success");
    } else if (action === "style-cover") {
      const style = selectedStyleDirection(); if (!style) return; await patchStyle(style.id, { cover_image_id: id }); renderStyleModule();
    } else if (action === "style-generate" || action === "style-variant") {
      const style = state.projectAssets.styles.find((item) => item.id === id); if (!style) return; await generateStyleImage(style); setStatus("风格探索任务已提交，结果会自动进入当前项目。", "success");
    } else if (action === "style-delete") {
      if (!window.confirm("将这个风格方向移入项目回收站？")) return; await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/styles/${encodeURIComponent(id)}`, { method: "DELETE" }); state.projectAssets.selectedId = ""; await refreshCurrentProjectModule("风格方向已移入回收站。");
    } else if (action === "library-select") {
      state.projectAssets.selectedId = id; renderLibraryModule();
    } else if (action === "library-check") {
      if (target.checked) state.projectAssets.selectedIds.add(id); else state.projectAssets.selectedIds.delete(id);
    } else if (action === "library-save") {
      const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/library/${encodeURIComponent(id)}`, { method: "PATCH", body: { name: document.getElementById("libraryNameEditor")?.value, tags: String(document.getElementById("libraryTagsEditor")?.value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean), category: document.getElementById("libraryCategoryEditor")?.value, status: document.getElementById("libraryStatusEditor")?.value } });
      const index = state.projectAssets.library.findIndex((item) => item.id === id); if (index >= 0) state.projectAssets.library[index] = { ...data.asset, url: state.projectAssets.library[index].url }; renderLibraryModule(); setStatus("资产信息已保存。", "success");
    } else if (action === "library-preview") {
      const asset = state.projectAssets.library.find((item) => item.id === id); if (asset?.url) openImageLightbox(asset.url, asset.name || asset.file_name || "资产预览");
    } else if (action === "library-remove") {
      const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/library/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: "archived" } });
      const index = state.projectAssets.library.findIndex((item) => item.id === id); if (index >= 0) state.projectAssets.library[index] = { ...data.asset, url: state.projectAssets.library[index].url }; renderLibraryModule(); setStatus("资产已移出当前管理视图并归档。", "success");
    } else if (action === "library-delete") {
      if (!window.confirm("将这项资产移入项目回收站？")) return; await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/library/${encodeURIComponent(id)}`, { method: "DELETE" }); state.projectAssets.selectedId = ""; await refreshCurrentProjectModule("资产已移入回收站。");
    } else if (action === "library-download-selected") {
      const selected = state.projectAssets.library.filter((item) => state.projectAssets.selectedIds.has(item.id));
      selected.forEach((item, index) => window.setTimeout(() => { const anchor = document.createElement("a"); anchor.href = item.url; anchor.download = item.file_name || item.name; anchor.click(); }, index * 120));
    } else if (action === "integration-browse") {
      const data = await apiJson("/api/select-resource-folder", { method: "POST" }); if (!data.cancelled && data.folder?.path) document.getElementById("integrationTargetInput").value = data.folder.path;
    } else if (action === "integration-save") {
      await saveIntegration(); setStatus("项目目录和分类映射已保存。", "success");
    } else if (action === "integration-preflight") {
      const result = await integrationPreflight(); setStatus(result.ready ? "项目对接预检通过。" : "项目对接预检发现问题。", result.ready ? "success" : "error");
    } else if (action === "integration-deploy") {
      const preflight = await integrationPreflight(); if (!preflight.ready || !window.confirm(`将 ${preflight.files.length} 个资产复制到正式项目目录？同名冲突会先备份。`)) return;
      await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/integration/deploy`, { method: "POST", body: { idempotency_key: `ui-${Date.now()}` } }); await refreshCurrentProjectModule("资产部署并校验完成。");
    } else if (action === "trash-check") {
      if (target.checked) state.projectAssets.selectedIds.add(id); else state.projectAssets.selectedIds.delete(id);
    } else if (action === "trash-restore" || action === "trash-restore-selected") {
      const ids = action === "trash-restore" ? [id] : Array.from(state.projectAssets.selectedIds); if (!ids.length) return;
      await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/trash/restore`, { method: "POST", body: { item_ids: ids } }); await refreshCurrentProjectModule("所选项目对象已恢复。");
    } else if (action === "trash-purge" || action === "trash-purge-selected" || action === "trash-clear") {
      const ids = action === "trash-purge" ? [id] : action === "trash-purge-selected" ? Array.from(state.projectAssets.selectedIds) : state.projectAssets.trash.map((item) => item.id); if (!ids.length) return;
      if (!window.confirm(`彻底删除 ${ids.length} 项？此操作无法撤销。`)) return;
      await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/trash/purge`, { method: "POST", body: { item_ids: ids } }); await refreshCurrentProjectModule("所选项目对象已彻底删除。");
    } else if (action === "settings-tab") {
      state.projectAssets.settingsTab = target.dataset.tab || "basic"; if (state.projectAssets.settingsTab === "style" && !state.projectAssets.styles.length) { const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/styles`); state.projectAssets.styles = data.styles || []; } renderProjectSettingsModule();
    } else if (action === "settings-save") {
      await saveProjectSettings(); setStatus("项目设置已保存。", "success");
    } else if (action === "settings-unconfirm-style") {
      const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}`, { method: "PATCH", body: { style_status: "unconfirmed", current_style_direction_id: "" } }); state.projectWorkspace.activeProject = data.project; renderProjectSettingsModule();
    } else if (action === "settings-export") {
      await exportProjectData(); setStatus("项目数据已导出。", "success");
    } else if (action === "settings-clear-generation") {
      const records = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/generation-results`); const ids = (records.results || []).filter((item) => item.lifecycle_status !== "trashed").map((item) => item.id); if (!ids.length || !window.confirm(`将 ${ids.length} 条生成结果移入回收站？`)) return;
      await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/generation-results/lifecycle`, { method: "POST", body: { record_ids: ids, status: "trashed" } }); setStatus("生成结果已移入回收站。", "success");
    } else if (action === "settings-delete-project") {
      const project = activeProject(); if (!project || project.is_default || !window.confirm(`删除项目“${project.display_name}”？项目目录会移动到本机归档区。`)) return;
      await apiJson(`/api/v1/projects/${encodeURIComponent(project.id)}`, { method: "DELETE" }); await loadProjectRegistry(); showProjectLauncher({ clearServerSelection: false }); setStatus("项目已移入本机归档区。", "success");
    }
  } catch (error) {
    setStatus(`${projectModuleLabel(state.activeModule)}操作失败：${error.message}`, "error");
  }
}

function activateProjectModule(moduleName, resourceNode = "") {
  if (!activeProjectId()) return;
  if (resourceNode) state.projectWorkspace.resourceNode = resourceNode;
  setActiveModule(moduleName);
}

function setProcessPreview(preview, scope = activeMatteScope()) {
  if (scope === "image") {
    state.imageProcessPreview = preview;
  } else {
    state.processPreview = preview;
  }
}

function setActiveModule(moduleName, { announce = true } = {}) {
  const nextModule = ["project", "style", "video", "videoProcess", "aiCreation", "image", "library", "integration", "trash", "settings", "resource", "model"].includes(moduleName) ? moduleName : "project";
  state.activeModule = nextModule;
  const isProject = nextModule === "project";
  const isImage = nextModule === "image";
  const isVideoProcess = nextModule === "videoProcess";
  const isAiCreation = nextModule === "aiCreation";
  const isResource = nextModule === "resource";
  const isModel = nextModule === "model";
  const isProjectAsset = ["style", "library", "integration", "trash", "settings"].includes(nextModule);
  const isFixedWorkbench = isProject || nextModule === "video" || isVideoProcess || isAiCreation || isImage || isProjectAsset;
  if (els.projectDashboard) {
    els.projectDashboard.hidden = !isProject;
  }
  if (els.projectAssetModule) {
    els.projectAssetModule.hidden = !isProjectAsset;
  }
  els.videoModule.hidden = nextModule !== "video";
  if (els.videoProcessModule) {
    els.videoProcessModule.hidden = !isVideoProcess;
  }
  if (els.aiCreationModule) {
    els.aiCreationModule.hidden = !isAiCreation;
  }
  els.imageModule.hidden = !isImage;
  if (els.resourceModule) {
    els.resourceModule.hidden = !isResource;
  }
  if (els.modelModule) {
    els.modelModule.hidden = !isModel;
  }
  els.moduleVideoButton.classList.toggle("active", nextModule === "video");
  els.moduleVideoProcessButton?.classList.toggle("active", isVideoProcess);
  els.moduleAiCreationButton?.classList.toggle("active", isAiCreation);
  els.moduleImageButton.classList.toggle("active", isImage);
  els.moduleResourceButton?.classList.toggle("active", isResource);
  els.moduleModelButton?.classList.toggle("active", isModel);
  els.moduleVideoButton.setAttribute("aria-pressed", String(nextModule === "video"));
  els.moduleVideoProcessButton?.setAttribute("aria-pressed", String(isVideoProcess));
  els.moduleAiCreationButton?.setAttribute("aria-pressed", String(isAiCreation));
  els.moduleImageButton.setAttribute("aria-pressed", String(isImage));
  els.moduleResourceButton?.setAttribute("aria-pressed", String(isResource));
  els.moduleModelButton?.setAttribute("aria-pressed", String(isModel));
  document.querySelectorAll("[data-project-module]").forEach((button) => {
    const resourceMatches = nextModule !== "resource"
      || !button.dataset.resourceNode
      || button.dataset.resourceNode === state.projectWorkspace.resourceNode;
    const aiViewMatches = nextModule !== "aiCreation"
      || !button.dataset.aiView
      || button.dataset.aiView === state.aiCreation.view;
    button.classList.toggle("active", button.dataset.projectModule === nextModule && resourceMatches && aiViewMatches);
  });
  document.documentElement.classList.toggle("workbench-scroll-locked", isFixedWorkbench);
  document.body.classList.toggle("workbench-scroll-locked", isFixedWorkbench);
  document.documentElement.classList.toggle("resource-scroll-locked", isResource || isModel);
  document.body.classList.toggle("resource-scroll-locked", isResource || isModel);
  const project = activeProject();
  const moduleLabels = {
    project: "项目总览",
    style: "风格探索",
    aiCreation: state.aiCreation.view === "history" ? "生成历史" : "图片生成",
    image: "图片处理",
    videoProcess: "视频处理",
    video: "序列帧提取",
    library: "资产管理",
    integration: "项目对接",
    trash: "回收站",
    settings: "项目设置",
    resource: "资源管理",
    model: "项目设置",
  };
  els.appEyebrow.textContent = moduleLabels[nextModule] || PRODUCT_SUBTITLE;
  els.appTitle.textContent = project?.display_name || PRODUCT_TITLE;
  document.title = `${moduleLabels[nextModule] || PRODUCT_TITLE} - ${project?.display_name || PRODUCT_TITLE}`;
  if (isFixedWorkbench || isResource || isModel) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  if (announce) {
    setStatus(`已切换到${moduleLabels[nextModule] || "项目工作台"}。`, "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (isImage) {
    void refreshImagePasteButtonAvailability();
  }
  if (isAiCreation) {
    void ensureAiCreationLoaded();
  }
  if (isProjectAsset) {
    void loadProjectAssetModule(nextModule);
  }
  renderVideoProcessModule();
  renderResourceManager();
  if (isModel) {
    void refreshModelManager();
  }
  syncResultActions();
  window.requestAnimationFrame(() => refreshWorkflowNavigation());
}

function modelStatusTone(model) {
  return model?.ready ? "ready" : model?.downloadable ? "missing" : "blocked";
}

function modelStatusLabel(model) {
  if (model?.ready) {
    return "\u5DF2\u5C31\u7EEA";
  }
  return model?.downloadable ? "\u672A\u5B89\u88C5" : "\u9700\u624B\u52A8\u914D\u7F6E";
}

function modelItemByKey(key) {
  return (state.modelManager.models || []).find((item) => item.key === key) || null;
}

function dependencyBadgeLabel(item) {
  if (!item) {
    return "\u7F3A\u4F9D\u8D56";
  }
  if (item.kind === "huggingface") {
    return "\u7F3A\u6A21\u578B";
  }
  if (item.kind === "tool" || item.kind === "release") {
    return "\u7F3A\u5DE5\u5177";
  }
  if (item.kind === "git") {
    return "\u7F3A\u7EC4\u4EF6";
  }
  return "\u7F3A\u4F9D\u8D56";
}

function dependencyKeysForMatteMode(mode, scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const keys = [];
  if (matteModeUsesBiRefNet(mode)) {
    keys.push(controls.aiModelInput?.value || AI_MODEL_AUTO, ...BIREFNET_DEPENDENCY_KEYS);
  }
  if (matteModeUsesCorridorKey(mode)) {
    keys.push(...CORRIDORKEY_DEPENDENCY_KEYS);
  }
  return [...new Set(keys)];
}

function matteDependencyState(mode, scope = activeMatteScope()) {
  const keys = dependencyKeysForMatteMode(mode, scope);
  const missing = keys
    .map((key) => modelItemByKey(key) || { key, label: key, kind: "python", ready: false, message: "\u672A\u8BFB\u53D6\u4F9D\u8D56\u72B6\u6001" })
    .filter((item) => !item.ready);
  const localOnly = !keys.length;
  const firstMissing = missing[0] || null;
  return {
    keys,
    missing,
    ready: missing.length === 0,
    localOnly,
    badge: firstMissing ? dependencyBadgeLabel(firstMissing) : localOnly ? "\u672C\u5730\u7B97\u6CD5" : "\u5DF2\u5C31\u7EEA",
  };
}

function refreshMatteDependencyOptions(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  if (!controls.matteModeInput) {
    return;
  }
  Array.from(controls.matteModeInput.options).forEach((option) => {
    const baseLabel = MATTE_MODE_BASE_LABELS[option.value] || option.textContent.replace(/\s*（缺[^）]+）$/, "");
    const dependency = matteDependencyState(option.value, scope);
    option.textContent = dependency.ready ? baseLabel : `${baseLabel}\uFF08${dependency.badge}\uFF09`;
    option.classList.toggle("missing-dependency", !dependency.ready);
  });
  const currentDependency = matteDependencyState(currentMatteMode(scope), scope);
  controls.matteModeInput.classList.toggle("has-missing-dependency", !currentDependency.ready);
  renderMatteDependencyHint(scope, currentDependency);
}

function renderMatteDependencyHint(scope, dependency = matteDependencyState(currentMatteMode(scope), scope)) {
  const controls = getMatteEls(scope);
  const hint = controls.matteDependencyHint;
  if (!hint) {
    return;
  }
  if (dependency.ready) {
    hint.hidden = true;
    hint.textContent = "";
    return;
  }
  const labels = dependency.missing.slice(0, 3).map((item) => item.label || item.key).join("\u3001");
  const extra = dependency.missing.length > 3 ? ` \u7B49 ${dependency.missing.length} \u9879` : "";
  hint.hidden = false;
  hint.dataset.scope = scope;
  hint.textContent = `${dependency.badge}\uFF1A${labels}${extra}`;
}

function showMatteDependencyPrompt(scope = activeMatteScope()) {
  const dependency = matteDependencyState(currentMatteMode(scope), scope);
  if (dependency.ready) {
    return;
  }
  const modeLabel = MATTE_MODE_BASE_LABELS[currentMatteMode(scope)] || currentMatteMode(scope);
  const missingText = dependency.missing
    .map((item) => `- ${item.label || item.key}\uFF1A${item.message || item.description || "\u672A\u5C31\u7EEA"}`)
    .join("\n");
  const confirmed = window.confirm(`${modeLabel} \u9700\u8981\u8865\u5145\u4EE5\u4E0B\u9879\u76EE\uFF1A\n\n${missingText}\n\n\u662F\u5426\u524D\u5F80\u6A21\u578B\u7BA1\u7406\u4E0B\u8F7D\u6216\u67E5\u770B\u914D\u7F6E\uFF1F`);
  if (confirmed) {
    const target = dependency.missing.find((item) => item.downloadable) || dependency.missing[0];
    jumpToModelManagerItem(target?.key || "");
  }
}

function jumpToModelManagerItem(modelKey) {
  state.modelManager.highlightKey = modelKey || "";
  setActiveModule("model");
  window.setTimeout(() => highlightModelManagerItem(modelKey), 120);
}

function highlightModelManagerItem(modelKey) {
  if (!modelKey) {
    return;
  }
  const row = els.modelList?.querySelector(`[data-model-key="${CSS.escape(modelKey)}"]`);
  if (!row) {
    return;
  }
  row.scrollIntoView({ block: "center", behavior: "smooth" });
  row.classList.add("is-highlighted");
  const downloadButton = row.querySelector('[data-model-action="download"]:not(:disabled)');
  downloadButton?.classList.add("is-highlighted");
  window.setTimeout(() => {
    row.classList.remove("is-highlighted");
    downloadButton?.classList.remove("is-highlighted");
    if (state.modelManager.highlightKey === modelKey) {
      state.modelManager.highlightKey = "";
    }
  }, 2600);
}

function renderModelSummary(summary) {
  if (!els.modelSummary) {
    return;
  }
  const data = summary || { total: 0, ready: 0, missing: 0, cache_root: "-", tools_root: "-" };
  els.modelSummary.innerHTML = `
    <div class="model-summary-chip">
      <span>\u603B\u6570</span>
      <strong>${Number(data.total || 0)}</strong>
    </div>
    <div class="model-summary-chip success">
      <span>\u5DF2\u5C31\u7EEA</span>
      <strong>${Number(data.ready || 0)}</strong>
    </div>
    <div class="model-summary-chip ${Number(data.missing || 0) ? "warning" : "success"}">
      <span>\u672A\u5B89\u88C5</span>
      <strong>${Number(data.missing || 0)}</strong>
    </div>
    <div class="model-summary-path">
      <span>\u6A21\u578B\u7F13\u5B58</span>
      <strong title="${escapeHtml(data.cache_root || "-")}">${escapeHtml(data.cache_root || "-")}</strong>
    </div>
    <div class="model-summary-path">
      <span>\u5916\u90E8\u5DE5\u5177</span>
      <strong title="${escapeHtml(data.tools_root || "-")}">${escapeHtml(data.tools_root || "-")}</strong>
    </div>
  `;
}

function renderModelManager() {
  renderModelSummary(state.modelManager.summary);
  if (!els.modelList) {
    return;
  }
  const models = Array.isArray(state.modelManager.models) ? state.modelManager.models : [];
  if (!models.length) {
    els.modelList.innerHTML = `<div class="empty-state">\u5C1A\u672A\u8BFB\u53D6\u6A21\u578B\u72B6\u6001\u3002</div>`;
    return;
  }
  const categoryOrder = ["AI \u4E3B\u4F53\u62A0\u56FE", "\u7EFF\u5E55/\u84DD\u5E55\u7CBE\u4FEE", "MAGIC / \u7EBF\u7A3F\u6E05\u7406", "\u57FA\u7840\u89C6\u9891\u5DE5\u5177", "Python AI \u4F9D\u8D56"];
  const categories = [...new Set([...categoryOrder, ...models.map((model) => model.category || "\u5176\u4ED6")])].filter((category) =>
    models.some((model) => (model.category || "\u5176\u4ED6") === category)
  );
  els.modelList.innerHTML = categories.map((category) => {
    const groupModels = models.filter((model) => (model.category || "\u5176\u4ED6") === category);
    const readyCount = groupModels.filter((model) => model.ready).length;
    return `
      <div class="model-category-head">
        <strong>${escapeHtml(category)}</strong>
        <span>${readyCount}/${groupModels.length} \u5DF2\u5C31\u7EEA</span>
      </div>
      ${groupModels.map((model) => renderModelRow(model)).join("")}
    `;
  }).join("");
}

function renderModelRow(model) {
    const active = state.modelManager.activeKey === model.key;
    const actionLabel = state.modelManager.activeAction === "download" ? "\u4E0B\u8F7D\u4E2D..." : state.modelManager.activeAction === "uninstall" ? "\u5378\u8F7D\u4E2D..." : "";
    const progress = state.modelManager.progressByKey?.[model.key] || null;
    const progressActive = progress && !progress.done;
    const progressPercent = progress ? Math.round((Number(progress.current || 0) / Math.max(1, Number(progress.total || 1))) * 100) : 0;
    const progressLabel = progress ? `${progress.detail || progress.phase || "\u5904\u7406\u4E2D"}${progress.error ? `\uFF1A${progress.error}` : ""}` : "";
    const tone = modelStatusTone(model);
    const sizeLabel = model.size_bytes ? formatImageBytes(model.size_bytes) : "-";
    const affectedLabel = Array.isArray(model.affected) && model.affected.length ? `\u5F71\u54CD\uFF1A${model.affected.join("\u3001")}` : "";
    const downloadDisabled = active || progressActive || !model.downloadable || model.ready;
    const uninstallDisabled = active || !model.uninstallable;
    return `
      <article class="model-row ${tone}${state.modelManager.highlightKey === model.key ? " is-highlighted" : ""}" data-model-key="${escapeHtml(model.key)}">
        <div class="model-row-status">
          <span class="model-status-dot ${tone}" aria-hidden="true"></span>
          <strong>${modelStatusLabel(model)}</strong>
          ${model.required ? `<span class="model-required">\u9ED8\u8BA4</span>` : ""}
        </div>
        <div class="model-row-main">
          <div class="model-row-title">
            <h3>${escapeHtml(model.label || model.key)}</h3>
            <span>${escapeHtml(model.category || "-")}</span>
          </div>
          <p>${escapeHtml(model.description || model.message || "")}</p>
          <div class="model-row-meta">
            <span title="${escapeHtml(model.source || "-")}">\u6765\u6E90\uFF1A${escapeHtml(model.source || "-")}</span>
            <span title="${escapeHtml(model.path || "-")}">\u8DEF\u5F84\uFF1A${escapeHtml(model.path || "-")}</span>
            <span>\u5360\u7528\uFF1A${sizeLabel}</span>
          </div>
          ${affectedLabel ? `<div class="model-row-message neutral">${escapeHtml(affectedLabel)}</div>` : ""}
          ${model.message ? `<div class="model-row-message">${escapeHtml(model.message)}</div>` : ""}
          ${progress ? `
            <div class="model-download-progress ${progress.error ? "error" : progress.done ? "done" : ""}">
              <div class="model-download-progress-track">
                <span style="width: ${Math.max(0, Math.min(100, progressPercent))}%"></span>
              </div>
              <div class="model-download-progress-label">
                <strong>${progress.done && !progress.error ? "\u5B8C\u6210" : `${progressPercent}%`}</strong>
                <span>${escapeHtml(progressLabel)}</span>
              </div>
            </div>
          ` : ""}
        </div>
        <div class="model-row-actions">
          <button class="primary-button" type="button" data-model-action="download" data-model-key="${escapeHtml(model.key)}" ${downloadDisabled ? "disabled" : ""}>${active && state.modelManager.activeAction === "download" ? actionLabel : "\u4E0B\u8F7D"}</button>
          <button class="ghost-button danger-button" type="button" data-model-action="uninstall" data-model-key="${escapeHtml(model.key)}" ${uninstallDisabled ? "disabled" : ""}>${active && state.modelManager.activeAction === "uninstall" ? actionLabel : "\u5378\u8F7D"}</button>
        </div>
      </article>
    `;
}

function nextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

async function refreshModelManager({ announce = false } = {}) {
  if (!els.modelList) {
    return;
  }
  if (announce) {
    setStatus("\u6B63\u5728\u5237\u65B0\u6A21\u578B\u72B6\u6001...");
  }
  try {
    const data = await apiJson(`/api/models?ts=${Date.now()}`);
    state.modelManager.models = data.models || [];
    state.modelManager.summary = data.summary || null;
    renderModelManager();
    updateChromaVisibility("video");
    updateChromaVisibility("image");
    if (state.modelManager.highlightKey && state.activeModule === "model") {
      window.setTimeout(() => highlightModelManagerItem(state.modelManager.highlightKey), 80);
    }
    if (announce) {
      const missing = Number(data.summary?.missing || 0);
      setStatus(missing ? `\u6A21\u578B\u72B6\u6001\u5DF2\u5237\u65B0\uFF1A${missing} \u9879\u672A\u5C31\u7EEA\u3002` : "\u6A21\u578B\u72B6\u6001\u5DF2\u5237\u65B0\uFF0C\u5168\u90E8\u5C31\u7EEA\u3002", missing ? "warning" : "success");
    }
  } catch (error) {
    setStatus(`\u6A21\u578B\u72B6\u6001\u8BFB\u53D6\u5931\u8D25\uFF1A${error.message || String(error)}`, "error");
  }
}

async function handleModelAction(modelKey, action) {
  const model = state.modelManager.models.find((item) => item.key === modelKey);
  if (!model || !["download", "uninstall"].includes(action)) {
    return;
  }
  if (action === "uninstall") {
    const confirmed = window.confirm(`\u786E\u8BA4\u5378\u8F7D\u201C${model.label || model.key}\u201D\uFF1F\u8FD9\u4F1A\u5220\u9664\u5DF2\u7F13\u5B58\u7684\u6A21\u578B\u6216\u5916\u90E8\u7EC4\u4EF6\u76EE\u5F55\u3002`);
    if (!confirmed) {
      return;
    }
  }
  if (action === "download" && model.kind !== "huggingface") {
    const confirmed = window.confirm(`\u5C06\u4ECE\u5916\u90E8\u6765\u6E90\u4E0B\u8F7D\u201C${model.label || model.key}\u201D\u3002\u8FD9\u53EF\u80FD\u9700\u8981\u51E0\u5206\u949F\uFF0C\u662F\u5426\u7EE7\u7EED\uFF1F`);
    if (!confirmed) {
      return;
    }
  }
  state.modelManager.activeKey = modelKey;
  state.modelManager.activeAction = action;
  setStatus(action === "download" ? `\u6B63\u5728\u4E0B\u8F7D ${model.label || model.key}...` : `\u6B63\u5728\u5378\u8F7D ${model.label || model.key}...`);
  renderModelManager();
  await nextFrame();
  if (action === "download") {
    try {
      const data = await apiJson("/api/model-download-start", {
        method: "POST",
        body: { key: modelKey },
      });
      state.modelManager.progressByKey[modelKey] = data.progress || {
        id: data.progress_id,
        current: 0,
        total: 100,
        phase: "queued",
        detail: "\u7B49\u5F85\u4E0B\u8F7D\u4EFB\u52A1\u542F\u52A8",
        done: false,
        error: "",
      };
      renderModelManager();
      pollModelDownloadProgress(modelKey, data.progress_id);
    } catch (error) {
      setStatus(`\u4E0B\u8F7D\u5931\u8D25\uFF1A${error.message || String(error)}`, "error");
      state.modelManager.activeKey = "";
      state.modelManager.activeAction = "";
      renderModelManager();
    }
    return;
  }
  try {
    const data = await apiJson("/api/model-uninstall", {
      method: "POST",
      body: { key: modelKey },
    });
    state.modelManager.models = data.models || [];
    state.modelManager.summary = data.summary || null;
    renderModelManager();
    await checkRuntimeReadiness({ promptDownload: false });
    setStatus(data.result?.message || (action === "download" ? "\u6A21\u578B\u5DF2\u4E0B\u8F7D\u3002" : "\u6A21\u578B\u5DF2\u5378\u8F7D\u3002"), "success");
  } catch (error) {
    setStatus(`${action === "download" ? "\u4E0B\u8F7D" : "\u5378\u8F7D"}\u5931\u8D25\uFF1A${error.message || String(error)}`, "error");
  } finally {
    state.modelManager.activeKey = "";
    state.modelManager.activeAction = "";
    renderModelManager();
  }
}

function pollModelDownloadProgress(modelKey, progressId) {
  if (!modelKey || !progressId) {
    return;
  }
  if (state.modelManager.progressTimers[modelKey]) {
    window.clearInterval(state.modelManager.progressTimers[modelKey]);
  }
  const poll = async () => {
    try {
      const data = await apiJson(`/api/process-progress?id=${encodeURIComponent(progressId)}&ts=${Date.now()}`);
      const progress = data.progress || {};
      state.modelManager.progressByKey[modelKey] = progress;
      const percent = Math.round((Number(progress.current || 0) / Math.max(1, Number(progress.total || 1))) * 100);
      setStatus(progress.error ? `\u6A21\u578B\u4E0B\u8F7D\u5931\u8D25\uFF1A${progress.error}` : `\u6B63\u5728\u4E0B\u8F7D\u6A21\u578B\uFF1A${progress.detail || progress.phase || ""} ${Math.max(0, Math.min(100, percent))}%`, progress.error ? "error" : "");
      renderModelManager();
      if (progress.done) {
        window.clearInterval(state.modelManager.progressTimers[modelKey]);
        delete state.modelManager.progressTimers[modelKey];
        state.modelManager.activeKey = "";
        state.modelManager.activeAction = "";
        await refreshModelManager();
        await checkRuntimeReadiness({ promptDownload: false });
        if (progress.error) {
          setStatus(`\u6A21\u578B\u4E0B\u8F7D\u5931\u8D25\uFF1A${progress.error}`, "error");
        } else {
          setStatus("\u6A21\u578B\u4E0B\u8F7D\u5B8C\u6210\u3002", "success");
        }
        renderModelManager();
      }
    } catch (error) {
      window.clearInterval(state.modelManager.progressTimers[modelKey]);
      delete state.modelManager.progressTimers[modelKey];
      state.modelManager.activeKey = "";
      state.modelManager.activeAction = "";
      state.modelManager.progressByKey[modelKey] = {
        id: progressId,
        current: 0,
        total: 1,
        phase: "error",
        detail: "\u8FDB\u5EA6\u8BFB\u53D6\u5931\u8D25",
        done: true,
        error: error.message || String(error),
      };
      renderModelManager();
      setStatus(`\u6A21\u578B\u4E0B\u8F7D\u8FDB\u5EA6\u8BFB\u53D6\u5931\u8D25\uFF1A${error.message || String(error)}`, "error");
    }
  };
  void poll();
  state.modelManager.progressTimers[modelKey] = window.setInterval(poll, 900);
}

function resourceProjects() {
  return Array.isArray(state.resourceManager.projects) ? state.resourceManager.projects : [];
}

function normalizeResourceView(view) {
  return view === "detail" ? "detail" : "overview";
}

function setResourceView(view, { persist = true } = {}) {
  state.resourceManager.view = normalizeResourceView(view);
  state.resourceSelection.clear();
  renderResourceManager();
  if (persist) {
    persistSession();
  }
}

function currentResourceProject() {
  const projects = resourceProjects();
  return projects.find((project) => project.id === state.resourceManager.activeProjectId) || projects[0] || null;
}

function ensureResourceProjectSelection() {
  const projects = resourceProjects();
  if (!projects.length) {
    state.resourceManager.activeProjectId = "";
    state.resourceManager.view = "overview";
    return null;
  }
  if (!projects.some((project) => project.id === state.resourceManager.activeProjectId)) {
    state.resourceManager.activeProjectId = projects[0].id;
  }
  return currentResourceProject();
}

function normalizeResourceFolderPaths(project) {
  if (!project) {
    return [];
  }
  const paths = [
    ...(Array.isArray(project.folderPaths) ? project.folderPaths : []),
    project.folderPath || "",
  ]
    .map((path) => String(path || "").trim())
    .filter(Boolean);
  const uniquePaths = [];
  const seen = new Set();
  paths.forEach((path) => {
    const key = path.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniquePaths.push(path);
    }
  });
  project.folderPaths = uniquePaths;
  project.folderPath = uniquePaths[0] || "";
  return uniquePaths;
}

function resourceProjectFolderPaths(project = currentResourceProject()) {
  return normalizeResourceFolderPaths(project);
}

function resourcePathLabel(path, index = 0) {
  const text = String(path || "").replaceAll("\\", "/");
  const name = text.split("/").filter(Boolean).pop() || `\u6587\u4EF6\u5939 ${index + 1}`;
  return name;
}

function resourceFolderAssetList(projectId) {
  const value = state.resourceManager.folderAssets?.[projectId];
  return Array.isArray(value) ? value : [];
}

function resourceFolderDirList(projectId) {
  const value = state.resourceManager.folderDirs?.[projectId];
  return Array.isArray(value) ? value : [];
}

function renderResourceBoundFolderList(project) {
  if (!els.resourceFolderList) {
    return;
  }
  const paths = resourceProjectFolderPaths(project);
  if (!paths.length) {
    els.resourceFolderList.innerHTML = `<div class="resource-bound-folder-empty">\u672A\u7ED1\u5B9A\u6587\u4EF6\u5939</div>`;
    return;
  }
  els.resourceFolderList.innerHTML = paths.map((path, index) => `
    <div class="resource-bound-folder-item">
      <span title="${escapeHtml(path)}">${escapeHtml(resourcePathLabel(path, index))}</span>
      <small title="${escapeHtml(path)}">${escapeHtml(path)}</small>
      <button class="ghost-button icon-button resource-bound-folder-remove" type="button" data-resource-remove-folder="${escapeHtml(path)}" title="\u79FB\u9664\u7ED1\u5B9A" aria-label="\u79FB\u9664\u7ED1\u5B9A">×</button>
    </div>
  `).join("");
}

function restoreResourceManager(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.projects)) {
    return;
  }
  state.resourceManager = {
    projects: snapshot.projects.map((project) => {
      const nextProject = {
        id: String(project.id || `project_${Date.now()}`),
        name: String(project.name || "\u672A\u547D\u540D\u9879\u76EE"),
        folderPath: String(project.folderPath || ""),
        folderPaths: Array.isArray(project.folderPaths) ? project.folderPaths.map((path) => String(path || "")) : [],
        resources: Array.isArray(project.resources) ? project.resources : [],
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
      };
      normalizeResourceFolderPaths(nextProject);
      return nextProject;
    }),
    view: normalizeResourceView(snapshot.view),
    activeProjectId: String(snapshot.activeProjectId || ""),
    editProjectId: "",
    folderAssets: snapshot.folderAssets && typeof snapshot.folderAssets === "object" ? snapshot.folderAssets : {},
    folderDirs: snapshot.folderDirs && typeof snapshot.folderDirs === "object" ? snapshot.folderDirs : {},
    activeFolderTab: String(snapshot.activeFolderTab || "all"),
    collapsedFolders: snapshot.collapsedFolders && typeof snapshot.collapsedFolders === "object" ? snapshot.collapsedFolders : {},
  };
  ensureResourceProjectSelection();
  if (!state.resourceManager.activeProjectId) {
    state.resourceManager.view = "overview";
  }
  state.resourceSelection.clear();
}

async function createResourceProject() {
  const projectName = await askText("\u9879\u76EE\u540D\u79F0", `\u8D44\u6E90\u9879\u76EE ${resourceProjects().length + 1}`);
  const name = String(projectName || "").trim();
  if (!name) {
    return;
  }
  const now = new Date().toISOString();
  const project = {
    id: `resource_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    name,
    folderPath: "",
    folderPaths: [],
    resources: [],
    createdAt: now,
    updatedAt: now,
  };
  state.resourceManager.projects = [project, ...resourceProjects()];
  state.resourceManager.activeProjectId = project.id;
  state.resourceManager.activeFolderTab = "all";
  state.resourceManager.view = "detail";
  renderResourceManager();
  persistSession();
  setStatus("\u5DF2\u521B\u5EFA\u8D44\u6E90\u9879\u76EE\u3002", "success");
}

function selectResourceProject(projectId) {
  state.resourceManager.activeProjectId = String(projectId || "");
  state.resourceManager.activeFolderTab = "all";
  state.resourceManager.view = "detail";
  state.resourceSelection.clear();
  ensureResourceProjectSelection();
  renderResourceManager();
  persistSession();
}

function resourceProjectById(projectId) {
  return resourceProjects().find((item) => item.id === projectId) || null;
}

function openResourceProjectEditDialog(projectId = state.resourceManager.activeProjectId) {
  const project = resourceProjectById(String(projectId || ""));
  if (!project || !els.resourceProjectEditDialog) {
    return;
  }
  state.resourceManager.editProjectId = project.id;
  if (els.resourceProjectEditTitle) {
    els.resourceProjectEditTitle.textContent = project.name;
  }
  if (els.resourceProjectEditNameInput) {
    els.resourceProjectEditNameInput.value = project.name;
  }
  els.resourceProjectEditDialog.hidden = false;
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => els.resourceProjectEditNameInput?.focus());
}

function closeResourceProjectEditDialog() {
  if (els.resourceProjectEditDialog) {
    els.resourceProjectEditDialog.hidden = true;
  }
  state.resourceManager.editProjectId = "";
  document.body.classList.remove("modal-open");
}

function closeResourceExportProjectDialog() {
  if (els.resourceExportProjectDialog) {
    els.resourceExportProjectDialog.hidden = true;
  }
  document.body.classList.remove("modal-open");
}

function closeResourceMoveDialog() {
  if (els.resourceMoveDialog) {
    els.resourceMoveDialog.hidden = true;
  }
  document.body.classList.remove("modal-open");
}

function saveResourceProjectEdit() {
  const project = resourceProjectById(state.resourceManager.editProjectId);
  if (!project || !els.resourceProjectEditNameInput) {
    return;
  }
  const name = String(els.resourceProjectEditNameInput.value || "").trim();
  if (!name) {
    setStatus("\u9879\u76EE\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A\u3002", "error");
    els.resourceProjectEditNameInput.focus();
    return;
  }
  if (name !== project.name) {
    project.name = name;
    project.updatedAt = new Date().toISOString();
    renderResourceManager();
    persistSession();
    setStatus("\u5DF2\u4FDD\u5B58\u9879\u76EE\u4FEE\u6539\u3002", "success");
  }
  closeResourceProjectEditDialog();
}

function renameResourceProject(projectId = state.resourceManager.activeProjectId) {
  openResourceProjectEditDialog(projectId);
}

function deleteResourceProject(projectId = state.resourceManager.activeProjectId) {
  const project = resourceProjects().find((item) => item.id === projectId);
  if (!project) {
    return;
  }
  const confirmed = window.confirm(`\u5220\u9664\u9879\u76EE\u300C${project.name}\u300D\uFF1F\u8FD9\u53EA\u4F1A\u79FB\u9664\u9879\u76EE\u8BB0\u5F55\uFF0C\u4E0D\u4F1A\u5220\u9664\u672C\u5730\u6587\u4EF6\u3002`);
  if (!confirmed) {
    return;
  }
  state.resourceManager.projects = resourceProjects().filter((item) => item.id !== project.id);
  if (state.resourceManager.folderAssets && typeof state.resourceManager.folderAssets === "object") {
    delete state.resourceManager.folderAssets[project.id];
  }
  if (state.resourceManager.folderDirs && typeof state.resourceManager.folderDirs === "object") {
    delete state.resourceManager.folderDirs[project.id];
  }
  if (state.resourceManager.activeProjectId === project.id) {
    state.resourceManager.activeProjectId = resourceProjects()[0]?.id || "";
  }
  state.resourceManager.activeFolderTab = "all";
  state.resourceManager.view = "overview";
  closeResourceProjectEditDialog();
  renderResourceManager();
  persistSession();
  setStatus("\u5DF2\u5220\u9664\u8D44\u6E90\u9879\u76EE\u3002", "success");
}

function addResourceEntriesToProject(projectId, entries) {
  const project = resourceProjectById(String(projectId || ""));
  if (!project) {
    setStatus("\u8BF7\u5148\u521B\u5EFA\u6216\u9009\u62E9\u8D44\u6E90\u9879\u76EE\u3002", "error");
    return 0;
  }
  const now = new Date().toISOString();
  const resources = Array.isArray(project.resources) ? project.resources : [];
  const nextResources = [...resources];
  const resourceKey = (item) => String(item?.key || item?.url || item?.path || item?.name || "");
  const existingByKey = new Map(resources.map((item, index) => [resourceKey(item), index]).filter(([key]) => key));
  let changedCount = 0;
  entries.filter(Boolean).forEach((item, index) => {
    const key = resourceKey(item);
    const existingIndex = key ? existingByKey.get(key) : undefined;
    if (existingIndex !== undefined) {
      const previous = nextResources[existingIndex] || {};
      nextResources[existingIndex] = {
        ...previous,
        ...item,
        id: previous.id || `asset_${Date.now()}_${index}_${Math.random().toString(16).slice(2, 6)}`,
        createdAt: previous.createdAt || now,
        updatedAt: now,
      };
      changedCount += 1;
      return;
    }
    const nextItem = {
      id: `asset_${Date.now()}_${index}_${Math.random().toString(16).slice(2, 6)}`,
      createdAt: now,
      ...item,
    };
    nextResources.push(nextItem);
    if (key) {
      existingByKey.set(key, nextResources.length - 1);
    }
    changedCount += 1;
  });
  if (!changedCount) {
    return 0;
  }
  project.resources = nextResources;
  project.updatedAt = now;
  renderResourceManager();
  persistSession();
  return changedCount;
}

function addResourceEntries(entries) {
  const project = ensureResourceProjectSelection();
  if (!project) {
    setStatus("\u8BF7\u5148\u521B\u5EFA\u6216\u9009\u62E9\u8D44\u6E90\u9879\u76EE\u3002", "error");
    return 0;
  }
  return addResourceEntriesToProject(project.id, entries);
}

function imageResultResourceEntries() {
  return imageResultEntries()
    .filter((entry) => entry.result?.url || entry.result?.thumb_url)
    .map((entry, index) => {
      const frame = entry.result || {};
      const source = entry.source || {};
      const url = frame.url || frame.thumb_url || "";
      const name = frame.original_name || frame.name || source.name || `matte_${index + 1}.png`;
      const groupKey = `group:${Number(entry.index ?? index)}`;
      return {
        key: `image-result:${url || name}:${Number(entry.index ?? index)}`,
        name,
        type: "matte",
        kind: "image",
        source: "\u56FE\u7247\u5BFC\u51FA\u7ED3\u679C",
        url,
        thumbUrl: frame.thumb_url || frame.url || "",
        width: Number(frame.width || source.width || 0),
        height: Number(frame.height || source.height || 0),
        groupKey,
        groupTitle: source.name || frame.original_name || frame.name || `image_${index + 1}`,
        groupThumbUrl: frame.thumb_url || frame.url || url,
        groupIndex: Number(entry.index ?? index),
      };
    });
}

function imageSplitResourceEntries() {
  const namingItems = imageNamingItems();
  const namingByKey = new Map(namingItems.map((item, index) => [item.key || `item:${index}`, item]));
  const groups = imageNamingGroups();
  const groupByKey = new Map(groups.map((group) => [group.key, group]));
  return imageNamingExportItems().map((exportItem, index) => {
    const item = namingByKey.get(exportItem.key) || namingItems[index] || {};
    const output = exportItem.output || imageNamingOutputSize(item);
    const name = exportItem.name?.endsWith(".png") ? exportItem.name : `${exportItem.name || `part_${index + 1}`}.png`;
    const source = imageNamingSourceSize(item);
    const outputUrl = exportItem.outputUrl || imageNamingPreviewUrl(item);
    const groupKey = exportItem.key?.startsWith("frame:")
      ? `group:${exportItem.key.split(":")[1]}`
      : `group:${exportItem.key?.split(":")[0]}`;
    const group = groupByKey.get(groupKey);
    const crop = exportItem.crop || item.crop || (item.imageUrl
      ? {
          x: 0,
          y: 0,
          w: source.width,
          h: source.height,
          frameWidth: source.width,
          frameHeight: source.height,
        }
      : null);
    return {
      key: `split:${exportItem.key || index}:${name}`,
      name,
      type: "split",
      kind: "image",
      source: "\u62C6\u56FE\u5BFC\u51FA\u7ED3\u679C",
      url: outputUrl || item.imageUrl || "",
      thumbUrl: outputUrl || item.imageUrl || "",
      width: Number(output.width || source.width || item.sourceWidth || 0),
      height: Number(output.height || source.height || item.sourceHeight || 0),
      groupKey,
      groupTitle: group?.title || item.sourceName || `\u56FE\u7247 ${index + 1}`,
      groupThumbUrl: group?.imageUrl || item.imageUrl || "",
      groupIndex: Number(item.sourceIndex ?? index),
      crop: exportItem.outputUrl
        ? null
        : crop
        ? {
            ...crop,
            outputWidth: Number(output.width || crop.w || source.width || item.sourceWidth || 1),
            outputHeight: Number(output.height || crop.h || source.height || item.sourceHeight || 1),
            outputMode: output.mode || "source",
          }
        : null,
    };
  });
}

function currentResourceExportEntries() {
  return resourceExportContext === "split" ? imageSplitResourceEntries() : imageResultResourceEntries();
}

function currentResourceExportName() {
  return resourceExportContext === "split" ? "\u62C6\u56FE\u7ED3\u679C" : "\u56FE\u7247\u7ED3\u679C";
}

function currentResourceExportGroups(entries = currentResourceExportEntries()) {
  const groups = [];
  const seen = new Set();
  entries.forEach((entry, index) => {
    const key = String(entry.groupKey || `group:${index}`);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    groups.push({
      key,
      title: entry.groupTitle || entry.source || `\u5206\u7EC4 ${groups.length + 1}`,
      thumbUrl: entry.groupThumbUrl || entry.thumbUrl || entry.url || "",
      index: entry.groupIndex ?? groups.length,
    });
  });
  return groups;
}

function activeResourceExportGroup(entries = currentResourceExportEntries()) {
  const groups = currentResourceExportGroups(entries);
  if (!groups.length) {
    resourceExportActiveGroupKey = "";
    return null;
  }
  if (!groups.some((group) => group.key === resourceExportActiveGroupKey)) {
    resourceExportActiveGroupKey = groups[0].key;
  }
  return groups.find((group) => group.key === resourceExportActiveGroupKey) || groups[0];
}

function currentResourceExportPageEntries(entries = currentResourceExportEntries()) {
  const group = activeResourceExportGroup(entries);
  return group ? entries.filter((entry) => String(entry.groupKey || "") === group.key) : entries;
}

function selectedResourceExportEntries() {
  return currentResourceExportEntries().filter((entry) => resourceExportSelectedKeys.has(entry.key));
}

function resourceExportCropAttrs(entry) {
  const crop = entry?.crop;
  if (!crop || !entry?.url) {
    return "";
  }
  return [
    'data-resource-export-crop="1"',
    `data-crop-src="${escapeHtml(entry.url)}"`,
    `data-crop-x="${escapeHtml(crop.x)}"`,
    `data-crop-y="${escapeHtml(crop.y)}"`,
    `data-crop-w="${escapeHtml(crop.w)}"`,
    `data-crop-h="${escapeHtml(crop.h)}"`,
    `data-frame-w="${escapeHtml(crop.frameWidth || crop.w || entry.width || 1)}"`,
    `data-frame-h="${escapeHtml(crop.frameHeight || crop.h || entry.height || 1)}"`,
    `data-output-w="${escapeHtml(crop.outputWidth || entry.width || 0)}"`,
    `data-output-h="${escapeHtml(crop.outputHeight || entry.height || 0)}"`,
    `data-output-mode="${escapeHtml(crop.outputMode || "source")}"`,
  ].join(" ");
}

function renderResourceExportPreviewList() {
  if (!els.resourceExportPreviewList || !els.resourceExportGroupTabs) {
    return;
  }
  const entries = currentResourceExportEntries();
  const groups = currentResourceExportGroups(entries);
  const pageEntries = currentResourceExportPageEntries(entries);
  const selectedCount = selectedResourceExportEntries().length;
  if (els.resourceExportSelectionSummary) {
    els.resourceExportSelectionSummary.textContent = `\u5DF2\u9009\u62E9 ${selectedCount} / ${entries.length} \u9879`;
  }
  if (!pageEntries.length) {
    els.resourceExportPreviewList.innerHTML = `<div class="resource-empty-note">\u5F53\u524D\u5206\u7EC4\u6CA1\u6709\u53EF\u5BFC\u51FA\u8D44\u6E90\u3002</div>`;
  } else {
    els.resourceExportPreviewList.innerHTML = pageEntries.map((entry, index) => {
      const selected = resourceExportSelectedKeys.has(entry.key);
      const thumb = entry.thumbUrl || entry.url || "";
      return `
        <button class="resource-export-preview-item ${selected ? "selected" : ""}" type="button" data-resource-export-entry-key="${escapeHtml(entry.key)}" aria-pressed="${selected ? "true" : "false"}">
          <span class="resource-export-check" aria-hidden="true">${selected ? "\u2713" : ""}</span>
          <span class="resource-export-thumb">
            ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(entry.name || `resource ${index + 1}`)}" ${resourceExportCropAttrs(entry)}>` : `<span>${String(index + 1).padStart(2, "0")}</span>`}
          </span>
          <span class="resource-export-preview-meta">
            <strong title="${escapeHtml(entry.name || "")}">${escapeHtml(entry.name || `resource_${index + 1}`)}</strong>
            <small>${escapeHtml(Math.max(1, Number(entry.width || 0)))} x ${escapeHtml(Math.max(1, Number(entry.height || 0)))}</small>
          </span>
        </button>
      `;
    }).join("");
  }
  els.resourceExportGroupTabs.hidden = groups.length <= 1;
  els.resourceExportGroupTabs.innerHTML = groups.length > 1
    ? groups.map((group, index) => `
        <button class="resource-export-group-tab ${group.key === resourceExportActiveGroupKey ? "selected" : ""}" type="button" data-resource-export-group-key="${escapeHtml(group.key)}" title="${escapeHtml(group.title)}">
          ${group.thumbUrl ? `<img src="${escapeHtml(group.thumbUrl)}" alt="${escapeHtml(group.title)}">` : `<span>${String(index + 1).padStart(2, "0")}</span>`}
        </button>
      `).join("")
    : "";
  void renderResourceExportCropPreviews();
}

async function renderResourceExportCropPreviews() {
  if (!els.resourceExportPreviewList) {
    return;
  }
  const images = Array.from(els.resourceExportPreviewList.querySelectorAll("img[data-resource-export-crop]"));
  const cache = new Map();
  await Promise.all(images.map(async (image) => {
    const sourceUrl = image.dataset.cropSrc || image.src;
    try {
      if (!cache.has(sourceUrl)) {
        cache.set(sourceUrl, loadImageElement(sourceUrl));
      }
      const source = await cache.get(sourceUrl);
      const crop = {
        x: Number(image.dataset.cropX || 0),
        y: Number(image.dataset.cropY || 0),
        w: Number(image.dataset.cropW || 1),
        h: Number(image.dataset.cropH || 1),
        frameWidth: Number(image.dataset.frameW || source.naturalWidth || 1),
        frameHeight: Number(image.dataset.frameH || source.naturalHeight || 1),
        outputWidth: Number(image.dataset.outputW || 0),
        outputHeight: Number(image.dataset.outputH || 0),
        outputMode: image.dataset.outputMode || "source",
      };
      image.src = cropCanvasDataUrl(source, crop, { maxSide: 360 });
      image.removeAttribute("data-resource-export-crop");
    } catch (error) {
      console.warn("resource export crop preview failed", error);
    }
  }));
}

function renderResourceExportProjectList() {
  if (!els.resourceExportProjectList) {
    return;
  }
  const projects = resourceProjects();
  const entries = selectedResourceExportEntries();
  if (els.resourceExportProjectTitle) {
    els.resourceExportProjectTitle.textContent = "\u5BFC\u51FA\u5230\u8D44\u6E90\u7BA1\u7406";
  }
  if (!projects.length) {
    els.resourceExportProjectList.innerHTML = `<div class="resource-empty-note">\u6682\u65E0\u8D44\u6E90\u9879\u76EE\uFF0C\u8BF7\u5148\u5230\u8D44\u6E90\u7BA1\u7406\u521B\u5EFA\u9879\u76EE\u3002</div>`;
    resourceExportTargetProjectId = "";
    if (els.resourceExportConfirmButton) {
      els.resourceExportConfirmButton.disabled = true;
    }
    return;
  }
  if (!projects.some((project) => project.id === resourceExportTargetProjectId)) {
    resourceExportTargetProjectId = projects[0]?.id || "";
  }
  els.resourceExportProjectList.innerHTML = projects.map((project) => {
    const count = Array.isArray(project.resources) ? project.resources.length : 0;
    const folderPaths = resourceProjectFolderPaths(project);
    const folderText = folderPaths.length ? folderPaths.join(" / ") : "\u672A\u7ED1\u5B9A\u6587\u4EF6\u5939";
    const selected = project.id === resourceExportTargetProjectId;
    return `
      <button class="resource-export-project-option ${selected ? "selected" : ""}" type="button" data-resource-export-project-id="${escapeHtml(project.id)}" aria-pressed="${selected ? "true" : "false"}">
        <span>
          <strong>${escapeHtml(project.name)}</strong>
          <small title="${escapeHtml(folderText)}">${escapeHtml(folderText)}</small>
        </span>
        <b>${count} + ${entries.length}</b>
      </button>
    `;
  }).join("");
  if (els.resourceExportConfirmButton) {
    els.resourceExportConfirmButton.disabled = !resourceExportTargetProjectId || !entries.length;
    els.resourceExportConfirmButton.textContent = entries.length ? `\u5BFC\u51FA ${entries.length} \u9879` : "\u8BF7\u5148\u9009\u62E9\u8D44\u6E90";
  }
}

function renderResourceExportDialog() {
  renderResourceExportPreviewList();
  renderResourceExportProjectList();
}

function openResourceExportProjectDialog(context = "matte", options = {}) {
  resourceExportContext = context === "split" ? "split" : "matte";
  const entries = currentResourceExportEntries();
  if (!entries.length) {
    setStatus(`\u6682\u65E0\u53EF\u5BFC\u51FA\u5230\u8D44\u6E90\u7BA1\u7406\u7684${currentResourceExportName()}\u3002`, "error");
    return;
  }
  if (!els.resourceExportProjectDialog) {
    return;
  }
  const selectedEntryKeys = Array.isArray(options.selectedEntryKeys) ? new Set(options.selectedEntryKeys) : null;
  resourceExportSelectedKeys = selectedEntryKeys?.size
    ? new Set(entries.filter((entry) => selectedEntryKeys.has(entry.key)).map((entry) => entry.key))
    : new Set(entries.map((entry) => entry.key));
  resourceExportActiveGroupKey = currentResourceExportGroups(entries)[0]?.key || "";
  resourceExportTargetProjectId = resourceProjects()[0]?.id || "";
  renderResourceExportDialog();
  els.resourceExportProjectDialog.hidden = false;
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => {
    els.resourceExportPreviewList?.querySelector("button")?.focus();
  });
}

function exportImageResultsToResourceProject(projectId) {
  const project = resourceProjectById(String(projectId || ""));
  if (!project) {
    setStatus("\u6CA1\u6709\u627E\u5230\u9009\u4E2D\u7684\u8D44\u6E90\u9879\u76EE\u3002", "error");
    renderResourceExportDialog();
    return;
  }
  const entries = selectedResourceExportEntries();
  if (!entries.length) {
    setStatus("\u8BF7\u5148\u9009\u62E9\u8981\u5BFC\u51FA\u7684\u8D44\u6E90\u3002", "error");
    return;
  }
  const added = addResourceEntriesToProject(project.id, entries);
  closeResourceExportProjectDialog();
  setStatus(
    added ? `\u5DF2\u5BFC\u51FA ${added} \u4E2A${currentResourceExportName()}\u5230\u300C${project.name}\u300D\u3002` : `\u300C${project.name}\u300D\u5DF2\u5305\u542B\u8FD9\u4E9B${currentResourceExportName()}\u3002`,
    added ? "success" : "error"
  );
}

function collectCurrentMatteResources() {
  const frames = state.imageJob?.frames || state.job?.frames || [];
  const entries = frames.map((frame, index) => ({
    key: `matte:${frame.url || frame.name || index}`,
    name: frame.original_name || frame.name || `matte_${index + 1}.png`,
    type: "matte",
    kind: "image",
    source: "\u62A0\u56FE\u7ED3\u679C",
    url: frame.url || frame.thumb_url || "",
    thumbUrl: frame.thumb_url || frame.url || "",
    width: frame.width || 0,
    height: frame.height || 0,
  }));
  const added = addResourceEntries(entries);
  setStatus(added ? `\u5DF2\u6536\u96C6 ${added} \u4E2A\u62A0\u56FE\u8D44\u6E90\u3002` : "\u6CA1\u6709\u53EF\u6536\u96C6\u7684\u65B0\u62A0\u56FE\u8D44\u6E90\u3002", added ? "success" : "error");
}

function collectCurrentSplitResources() {
  const items = imageNamingItems();
  const entries = items.map((item, index) => {
    const output = imageNamingOutputSize(item);
    return {
      key: `split:${item.key || index}:${item.fallback || item.label}`,
      name: `${item.fallback || item.label || `part_${index + 1}`}.png`,
      type: "split",
      kind: "image",
      source: "\u62C6\u56FE\u6E05\u5355",
      url: item.imageUrl || "",
      thumbUrl: item.imageUrl || "",
      width: output.width || item.sourceWidth || 0,
      height: output.height || item.sourceHeight || 0,
      crop: item.crop || null,
    };
  });
  const added = addResourceEntries(entries);
  setStatus(added ? `\u5DF2\u6536\u96C6 ${added} \u4E2A\u62C6\u56FE\u8D44\u6E90\u3002` : "\u6CA1\u6709\u53EF\u6536\u96C6\u7684\u65B0\u62C6\u56FE\u8D44\u6E90\u3002", added ? "success" : "error");
}

async function bindResourceProjectFolder() {
  const project = ensureResourceProjectSelection();
  if (!project) {
    setStatus("\u8BF7\u5148\u521B\u5EFA\u8D44\u6E90\u9879\u76EE\u3002", "error");
    return;
  }
  try {
    const data = await apiJson("/api/select-resource-folder", { method: "POST" });
    if (data.cancelled || !data.folder?.path) {
      return;
    }
    const paths = resourceProjectFolderPaths(project);
    const nextPath = String(data.folder.path || "").trim();
    if (!paths.some((path) => path.toLowerCase() === nextPath.toLowerCase())) {
      project.folderPaths = [...paths, nextPath];
      project.folderPath = project.folderPaths[0] || "";
    }
    project.updatedAt = new Date().toISOString();
    await refreshResourceProjectFolder();
    persistSession();
    setStatus(paths.some((path) => path.toLowerCase() === nextPath.toLowerCase()) ? "\u8FD9\u4E2A\u6587\u4EF6\u5939\u5DF2\u7ED1\u5B9A\u3002" : "\u5DF2\u6DFB\u52A0\u9879\u76EE\u6587\u4EF6\u5939\u3002", "success");
  } catch (error) {
    setStatus(error.message || "\u7ED1\u5B9A\u6587\u4EF6\u5939\u5931\u8D25\u3002", "error");
  }
}

async function refreshResourceProjectFolder() {
  const project = ensureResourceProjectSelection();
  const folderPaths = resourceProjectFolderPaths(project);
  if (!folderPaths.length) {
    renderResourceManager();
    setStatus("\u5F53\u524D\u9879\u76EE\u8FD8\u6CA1\u6709\u7ED1\u5B9A\u6587\u4EF6\u5939\u3002", "error");
    return;
  }
  try {
    const results = await Promise.all(folderPaths.map(async (path, index) => {
      const data = await apiJson("/api/resource-folder-assets", {
        method: "POST",
        body: { path },
      });
      const rootPath = data.path || path;
      const rootName = resourcePathLabel(rootPath, index);
      return {
        assets: (data.assets || []).map((asset) => ({
          ...asset,
          root_path: rootPath,
          root_name: rootName,
          root_index: index,
        })),
        folders: (data.folders || []).map((name) => ({
          name: String(name || ""),
          root_path: rootPath,
          root_name: rootName,
          root_index: index,
        })).filter((item) => item.name),
      };
    }));
    state.resourceManager.folderAssets[project.id] = results.flatMap((result) => result.assets);
    state.resourceManager.folderDirs[project.id] = results.flatMap((result) => result.folders);
    renderResourceManager();
    persistSession();
  } catch (error) {
    setStatus(error.message || "\u5237\u65B0\u6587\u4EF6\u5939\u8D44\u6E90\u5931\u8D25\u3002", "error");
  }
}

function removeResourceProjectFolder(path) {
  const project = currentResourceProject();
  if (!project) {
    return;
  }
  const target = String(path || "").trim().toLowerCase();
  const nextPaths = resourceProjectFolderPaths(project).filter((item) => item.toLowerCase() !== target);
  project.folderPaths = nextPaths;
  project.folderPath = nextPaths[0] || "";
  project.updatedAt = new Date().toISOString();
  state.resourceManager.folderAssets[project.id] = resourceFolderAssetList(project.id).filter((asset) => String(asset.root_path || "").toLowerCase() !== target);
  if (state.resourceManager.folderDirs && typeof state.resourceManager.folderDirs === "object") {
    state.resourceManager.folderDirs[project.id] = (state.resourceManager.folderDirs[project.id] || []).filter((folder) => String(folder.root_path || "").toLowerCase() !== target);
  }
  state.resourceSelection.clear();
  renderResourceManager();
  persistSession();
  setStatus("\u5DF2\u79FB\u9664\u7ED1\u5B9A\u6587\u4EF6\u5939\u3002", "success");
}

function resourceKindLabel(kind) {
  if (kind === "video") return "\u89C6\u9891";
  if (kind === "folder") return "\u6587\u4EF6\u5939";
  if (kind === "other") return "\u6587\u4EF6";
  return "\u56FE\u7247";
}

function resourceTypeLabel(type) {
  if (type === "folder") return "\u7ED1\u5B9A\u6587\u4EF6\u5939";
  if (type === "split") return "\u62C6\u56FE";
  if (type === "matte") return "\u62A0\u56FE";
  return "\u9879\u76EE";
}

function resourceAssetKey(asset, sourceType = "") {
  const source = sourceType || asset.__resourceSource || (asset.type === "folder" ? "folder" : "project");
  const root = asset.root_path || asset.rootPath || "";
  const identity = asset.id || asset.path || asset.key || asset.url || asset.thumbUrl || asset.name || "";
  if (root && source === "folder") {
    return `${source}:${root}:${identity}`;
  }
  return `${source}:${identity}`;
}

function normalizeResourceAssetForRender(asset, sourceType) {
  const nextAsset = {
    ...asset,
    type: sourceType === "folder" ? "folder" : asset.type || "project",
    __resourceSource: sourceType,
  };
  nextAsset.__resourceKey = resourceAssetKey(nextAsset, sourceType);
  return nextAsset;
}

function currentResourceAssetEntries(projectAssets = null, folderAssets = null) {
  const project = currentResourceProject();
  const projectItems = projectAssets || project?.resources || [];
  const folderItems = folderAssets || (project ? resourceFolderAssetList(project.id) : []);
  return [
    ...projectItems.map((asset) => normalizeResourceAssetForRender(asset, "project")),
    ...folderItems.map((asset) => normalizeResourceAssetForRender(asset, "folder")),
  ];
}

function pruneResourceSelection(entries = currentResourceAssetEntries()) {
  const validKeys = new Set(entries.map((asset) => asset.__resourceKey));
  state.resourceSelection.forEach((key) => {
    if (!validKeys.has(key)) {
      state.resourceSelection.delete(key);
    }
  });
}

function selectedResourceAssetEntries() {
  const entries = currentResourceAssetEntries();
  pruneResourceSelection(entries);
  return entries.filter((asset) => state.resourceSelection.has(asset.__resourceKey));
}

function renderResourceSelectionBar() {
  if (!els.resourceSelectionBar) {
    return;
  }
  const selectedCount = selectedResourceAssetEntries().length;
  const visible = selectedCount > 0 && state.resourceManager.view === "detail";
  els.resourceSelectionBar.hidden = !visible;
  if (els.resourceSelectionCount) {
    els.resourceSelectionCount.textContent = `\u5DF2\u9009 ${selectedCount} \u9879`;
  }
  if (els.resourceDeleteSelectedButton) {
    els.resourceDeleteSelectedButton.disabled = !selectedCount;
  }
  if (els.resourceMoveSelectedButton) {
    els.resourceMoveSelectedButton.disabled = !selectedCount;
  }
}

function updateResourceSelectionClasses() {
  els.resourceAssetGrid?.querySelectorAll(".resource-asset-card[data-resource-asset-key]").forEach((card) => {
    const key = card.dataset.resourceAssetKey || "";
    const selected = state.resourceSelection.has(key);
    card.classList.toggle("selected", selected);
    const button = card.querySelector("[data-resource-select-asset]");
    if (button) {
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = selected ? "\u2713" : "";
      const label = selected ? "\u53D6\u6D88\u52FE\u9009" : "\u52FE\u9009\u8D44\u6E90";
      button.setAttribute("title", label);
      button.setAttribute("aria-label", label);
    }
  });
  renderResourceSelectionBar();
}

function toggleResourceAssetSelection(assetKey) {
  const key = String(assetKey || "");
  if (!key) {
    return;
  }
  if (state.resourceSelection.has(key)) {
    state.resourceSelection.delete(key);
  } else {
    state.resourceSelection.add(key);
  }
  renderResourceManager();
}

function isResourceDragIgnoredTarget(target) {
  return Boolean(target.closest("button, input, select, textarea, a, [role='button']"));
}

function resourceDragBoxRect(startX, startY, currentX, currentY) {
  return {
    left: Math.min(startX, currentX),
    top: Math.min(startY, currentY),
    right: Math.max(startX, currentX),
    bottom: Math.max(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  };
}

function rectsIntersect(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function applyResourceDragSelection(drag, event) {
  const viewportRect = resourceDragBoxRect(drag.clientStartX, drag.clientStartY, event.clientX, event.clientY);
  const nextSelection = new Set(drag.baseSelection);
  const hitKeys = [];
  els.resourceAssetGrid?.querySelectorAll(".resource-asset-card[data-resource-asset-key]").forEach((card) => {
    const cardRect = card.getBoundingClientRect();
    const key = card.dataset.resourceAssetKey || "";
    if (key && rectsIntersect(viewportRect, cardRect)) {
      hitKeys.push(key);
    }
  });
  hitKeys.forEach((key) => {
    if (drag.baseSelection.has(key)) {
      nextSelection.delete(key);
    } else {
      nextSelection.add(key);
    }
  });
  state.resourceSelection = nextSelection;
  updateResourceSelectionClasses();
}

function updateResourceDragBox(drag, event) {
  const contentX = event.clientX - drag.gridRect.left + els.resourceAssetGrid.scrollLeft;
  const contentY = event.clientY - drag.gridRect.top + els.resourceAssetGrid.scrollTop;
  const rect = resourceDragBoxRect(drag.startX, drag.startY, contentX, contentY);
  drag.box.style.left = `${rect.left}px`;
  drag.box.style.top = `${rect.top}px`;
  drag.box.style.width = `${rect.width}px`;
  drag.box.style.height = `${rect.height}px`;
}

function beginResourceDragSelection(event) {
  if (event.button !== 0 || !els.resourceAssetGrid || isResourceDragIgnoredTarget(event.target)) {
    return;
  }
  const gridRect = els.resourceAssetGrid.getBoundingClientRect();
  const startX = event.clientX - gridRect.left + els.resourceAssetGrid.scrollLeft;
  const startY = event.clientY - gridRect.top + els.resourceAssetGrid.scrollTop;
  state.resourceDragSelection = {
    pointerId: event.pointerId,
    clientStartX: event.clientX,
    clientStartY: event.clientY,
    startX,
    startY,
    gridRect,
    started: false,
    baseSelection: new Set(state.resourceSelection),
    box: null,
  };
  els.resourceAssetGrid.setPointerCapture?.(event.pointerId);
}

function moveResourceDragSelection(event) {
  const drag = state.resourceDragSelection;
  if (!drag || drag.pointerId !== event.pointerId || !els.resourceAssetGrid) {
    return;
  }
  const distance = Math.hypot(event.clientX - drag.clientStartX, event.clientY - drag.clientStartY);
  if (!drag.started && distance < 5) {
    return;
  }
  event.preventDefault();
  if (!drag.started) {
    drag.started = true;
    drag.box = document.createElement("div");
    drag.box.className = "resource-drag-select-box";
    els.resourceAssetGrid.appendChild(drag.box);
  }
  updateResourceDragBox(drag, event);
  applyResourceDragSelection(drag, event);
}

function endResourceDragSelection(event) {
  const drag = state.resourceDragSelection;
  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }
  if (drag.started) {
    event.preventDefault();
    applyResourceDragSelection(drag, event);
  }
  drag.box?.remove();
  els.resourceAssetGrid?.releasePointerCapture?.(event.pointerId);
  state.resourceDragSelection = null;
}

function resourceMoveTargets() {
  const project = currentResourceProject();
  const folderPaths = resourceProjectFolderPaths(project);
  if (!folderPaths.length) {
    return [];
  }
  const targets = new Map(folderPaths.map((path, index) => [`${path}::`, { root: path, relative: "", name: resourcePathLabel(path, index), detail: "\u7ED1\u5B9A\u6839\u76EE\u5F55" }]));
  resourceFolderDirList(project.id).forEach((folder) => {
    const root = String(folder.root_path || "");
    const folderName = String(folder.name || "").replaceAll("\\", "/").split("/").filter(Boolean)[0] || "";
    if (root && folderName) {
      targets.set(`${root}::${folderName}`, {
        root,
        relative: folderName,
        name: `${folder.root_name || resourcePathLabel(root)} / ${folderName}`,
        detail: "\u4E00\u7EA7\u5B50\u6587\u4EF6\u5939",
      });
    }
  });
  const folderAssets = resourceFolderAssetList(project.id);
  folderAssets.forEach((asset) => {
    const relativePath = String(asset.relative_path || "").replaceAll("\\", "/");
    const firstFolder = relativePath.split("/").filter(Boolean)[0] || "";
    const root = String(asset.root_path || folderPaths[0] || "");
    if (firstFolder) {
      targets.set(`${root}::${firstFolder}`, {
        root,
        relative: firstFolder,
        name: `${resourcePathLabel(root)} / ${firstFolder}`,
        detail: "\u4E00\u7EA7\u5B50\u6587\u4EF6\u5939",
      });
    }
  });
  return Array.from(targets, ([key, target]) => ({ key, ...target })).sort((a, b) => {
    if (!a.relative && b.relative) return -1;
    if (a.relative && !b.relative) return 1;
    return a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true });
  });
}

function renderResourceMoveTargets() {
  if (!els.resourceMoveTargetList) {
    return;
  }
  const targets = resourceMoveTargets();
  if (!targets.length) {
    els.resourceMoveTargetList.innerHTML = `<div class="resource-empty-note">\u5F53\u524D\u9879\u76EE\u8FD8\u6CA1\u6709\u7ED1\u5B9A\u6587\u4EF6\u5939\u3002</div>`;
    return;
  }
  els.resourceMoveTargetList.innerHTML = targets.map((target) => `
    <button class="resource-export-project-option" type="button" data-resource-move-target-root="${escapeHtml(target.root)}" data-resource-move-target="${escapeHtml(target.relative)}">
      <span>
        <strong>${escapeHtml(target.name)}</strong>
        <small>${escapeHtml(target.detail)}</small>
      </span>
      <b>\u79FB\u52A8</b>
    </button>
  `).join("");
}

function openResourceMoveDialog() {
  const selected = selectedResourceAssetEntries();
  const project = currentResourceProject();
  if (!selected.length) {
    setStatus("\u8BF7\u5148\u52FE\u9009\u8981\u79FB\u52A8\u7684\u8D44\u6E90\u3002", "error");
    return;
  }
  if (!resourceProjectFolderPaths(project).length) {
    setStatus("\u8BF7\u5148\u7ED1\u5B9A\u9879\u76EE\u6587\u4EF6\u5939\uFF0C\u518D\u79FB\u52A8\u8D44\u6E90\u3002", "error");
    return;
  }
  renderResourceMoveTargets();
  if (els.resourceMoveDialog) {
    els.resourceMoveDialog.hidden = false;
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => els.resourceMoveTargetList?.querySelector("button")?.focus());
  }
}

function resourceAssetPayload(asset) {
  return {
    client_key: asset.__resourceKey,
    source: asset.__resourceSource,
    root: asset.root_path || asset.rootPath || "",
    id: asset.id || "",
    key: asset.key || "",
    name: asset.name || "",
    type: asset.type || "",
    kind: asset.kind || "",
    path: asset.path || "",
    url: asset.url || "",
    thumbUrl: asset.thumbUrl || "",
    width: Number(asset.width || 0),
    height: Number(asset.height || 0),
    crop: asset.crop || null,
  };
}

async function deleteSelectedResourceAssets() {
  const project = currentResourceProject();
  const selected = selectedResourceAssetEntries();
  if (!project || !selected.length) {
    setStatus("\u8BF7\u5148\u52FE\u9009\u8981\u5220\u9664\u7684\u8D44\u6E90\u3002", "error");
    return;
  }
  const projectAssets = selected.filter((asset) => asset.__resourceSource === "project");
  const folderAssets = selected.filter((asset) => asset.__resourceSource === "folder");
  const confirmed = window.confirm(`\u5220\u9664\u9009\u4E2D\u7684 ${selected.length} \u4E2A\u8D44\u6E90\uFF1F\u9879\u76EE\u8D44\u6E90\u53EA\u4ECE\u9879\u76EE\u79FB\u9664\uFF0C\u6587\u4EF6\u5939\u8D44\u6E90\u4F1A\u76F4\u63A5\u4ECE\u672C\u5730\u6587\u4EF6\u5939\u5220\u9664\u3002`);
  if (!confirmed) {
    return;
  }

  let deletedFolderKeys = new Set();
  let errorCount = 0;
  if (folderAssets.length) {
    const folderGroups = new Map();
    folderAssets.forEach((asset) => {
      const root = String(asset.root_path || resourceProjectFolderPaths(project)[0] || "");
      if (!folderGroups.has(root)) {
        folderGroups.set(root, []);
      }
      folderGroups.get(root).push(asset);
    });
    if (!folderGroups.size) {
      setStatus("\u9879\u76EE\u672A\u7ED1\u5B9A\u6587\u4EF6\u5939\uFF0C\u65E0\u6CD5\u5220\u9664\u6587\u4EF6\u5939\u8D44\u6E90\u3002", "error");
      return;
    }
    for (const [root, assets] of folderGroups) {
      const data = await apiJson("/api/resource-assets-delete", {
        method: "POST",
        body: {
          root,
          assets: assets.map(resourceAssetPayload),
        },
      });
      (data.deleted || []).forEach((item) => {
        if (item.client_key) deletedFolderKeys.add(item.client_key);
      });
      errorCount += (data.errors || []).length;
    }
  }

  if (projectAssets.length) {
    const removeKeys = new Set(projectAssets.map((asset) => asset.__resourceKey));
    project.resources = (project.resources || []).filter((asset) => !removeKeys.has(resourceAssetKey(asset, "project")));
    project.updatedAt = new Date().toISOString();
  }

  selected.forEach((asset) => {
    if (asset.__resourceSource === "project" || deletedFolderKeys.has(asset.__resourceKey)) {
      state.resourceSelection.delete(asset.__resourceKey);
    }
  });
  if (folderAssets.length) {
    await refreshResourceProjectFolder();
  }
  renderResourceManager();
  persistSession();
  const removedCount = projectAssets.length + deletedFolderKeys.size;
  setStatus(errorCount ? `\u5DF2\u5904\u7406 ${removedCount} \u4E2A\u8D44\u6E90\uFF0C${errorCount} \u4E2A\u6587\u4EF6\u5220\u9664\u5931\u8D25\u3002` : `\u5DF2\u5220\u9664 ${removedCount} \u4E2A\u8D44\u6E90\u3002`, errorCount ? "error" : "success");
}

async function moveSelectedResourceAssets(targetRoot, targetRelativePath) {
  const project = currentResourceProject();
  const selected = selectedResourceAssetEntries();
  if (!resourceProjectFolderPaths(project).length || !selected.length || !targetRoot) {
    closeResourceMoveDialog();
    setStatus("\u8BF7\u5148\u7ED1\u5B9A\u6587\u4EF6\u5939\u5E76\u52FE\u9009\u8981\u79FB\u52A8\u7684\u8D44\u6E90\u3002", "error");
    return;
  }
  try {
    const data = await apiJson("/api/resource-assets-move", {
      method: "POST",
      body: {
        root: targetRoot,
        target_relative_path: String(targetRelativePath || ""),
        assets: selected.map(resourceAssetPayload),
      },
    });
    const movedKeys = new Set((data.moved || []).map((item) => item.client_key).filter(Boolean));
    if (movedKeys.size) {
      project.resources = (project.resources || []).filter((asset) => !movedKeys.has(resourceAssetKey(asset, "project")));
      project.updatedAt = new Date().toISOString();
      movedKeys.forEach((key) => state.resourceSelection.delete(key));
      await refreshResourceProjectFolder();
      persistSession();
    }
    closeResourceMoveDialog();
    const errorCount = (data.errors || []).length;
    renderResourceManager();
    setStatus(errorCount ? `\u5DF2\u79FB\u52A8 ${movedKeys.size} \u4E2A\u8D44\u6E90\uFF0C${errorCount} \u4E2A\u8D44\u6E90\u5931\u8D25\u3002` : `\u5DF2\u79FB\u52A8 ${movedKeys.size} \u4E2A\u8D44\u6E90\u5230\u76EE\u6807\u6587\u4EF6\u5939\u3002`, errorCount ? "error" : "success");
  } catch (error) {
    setStatus(error.message || "\u79FB\u52A8\u8D44\u6E90\u5931\u8D25\u3002", "error");
  }
}

function resourceCropAttrs(asset, sourceUrl) {
  const crop = asset?.crop;
  if (!crop || !sourceUrl) {
    return "";
  }
  const outputWidth = Number(crop.outputWidth || asset.width || crop.w || 1);
  const outputHeight = Number(crop.outputHeight || asset.height || crop.h || 1);
  return [
    `data-resource-crop="1"`,
    `data-crop-src="${escapeHtml(sourceUrl)}"`,
    `data-crop-x="${Number(crop.x || 0)}"`,
    `data-crop-y="${Number(crop.y || 0)}"`,
    `data-crop-w="${Number(crop.w || 1)}"`,
    `data-crop-h="${Number(crop.h || 1)}"`,
    `data-frame-w="${Number(crop.frameWidth || 1)}"`,
    `data-frame-h="${Number(crop.frameHeight || 1)}"`,
    `data-output-w="${outputWidth}"`,
    `data-output-h="${outputHeight}"`,
    `data-output-mode="${escapeHtml(crop.outputMode || "source")}"`,
  ].join(" ");
}

function renderResourceAssetCard(asset) {
  const thumb = asset.thumbUrl || asset.url || "";
  const canPreview = asset.kind === "image" && thumb;
  const cropAttrs = resourceCropAttrs(asset, thumb);
  const assetKey = asset.__resourceKey || resourceAssetKey(asset);
  const selected = state.resourceSelection.has(assetKey);
  const media = canPreview
    ? `<button class="resource-asset-thumb ${cropAttrs ? "resource-asset-thumb-crop" : ""}" type="button" data-image-lightbox="${escapeHtml(thumb)}" data-caption="${escapeHtml(asset.name || "")}"><img src="${escapeHtml(thumb)}" alt="${escapeHtml(asset.name || "\u8D44\u6E90")}" ${cropAttrs}></button>`
    : `<div class="resource-asset-thumb empty"><strong>${escapeHtml(resourceKindLabel(asset.kind))}</strong></div>`;
  const pathDetail = asset.__resourceSource === "folder" && asset.root_name
    ? `${asset.root_name}${asset.relative_path ? ` / ${asset.relative_path}` : ""}`
    : asset.path || asset.source || "";
  const detail = asset.width && asset.height ? `${asset.width} x ${asset.height}` : pathDetail;
  return `
    <article class="resource-asset-card ${selected ? "selected" : ""}" data-resource-asset-key="${escapeHtml(assetKey)}">
      <button class="resource-asset-select" type="button" data-resource-select-asset="${escapeHtml(assetKey)}" aria-pressed="${selected ? "true" : "false"}" title="${selected ? "\u53D6\u6D88\u52FE\u9009" : "\u52FE\u9009\u8D44\u6E90"}" aria-label="${selected ? "\u53D6\u6D88\u52FE\u9009" : "\u52FE\u9009\u8D44\u6E90"}">${selected ? "\u2713" : ""}</button>
      ${media}
      <div class="resource-asset-body">
        <span>${escapeHtml(resourceTypeLabel(asset.type))}</span>
        <strong title="${escapeHtml(asset.name || "")}">${escapeHtml(asset.name || "\u672A\u547D\u540D\u8D44\u6E90")}</strong>
        <small title="${escapeHtml(detail)}">${escapeHtml(detail || "\u5F85\u7EC6\u5316")}</small>
      </div>
    </article>
  `;
}

async function renderResourceCropPreviews() {
  const images = Array.from(els.resourceAssetGrid?.querySelectorAll("img[data-resource-crop]") || []);
  if (!images.length) {
    return;
  }
  const cache = new Map();
  await Promise.all(images.map(async (image) => {
    const sourceUrl = image.dataset.cropSrc || image.src;
    try {
      if (!cache.has(sourceUrl)) {
        cache.set(sourceUrl, loadImageElement(sourceUrl));
      }
      const source = await cache.get(sourceUrl);
      const crop = {
        x: Number(image.dataset.cropX || 0),
        y: Number(image.dataset.cropY || 0),
        w: Number(image.dataset.cropW || 1),
        h: Number(image.dataset.cropH || 1),
        frameWidth: Number(image.dataset.frameW || source.naturalWidth || 1),
        frameHeight: Number(image.dataset.frameH || source.naturalHeight || 1),
        outputWidth: Number(image.dataset.outputW || 0),
        outputHeight: Number(image.dataset.outputH || 0),
        outputMode: image.dataset.outputMode || "source",
      };
      const previewDataUrl = cropCanvasDataUrl(source, crop, { maxSide: 640 });
      image.src = previewDataUrl;
      image.closest("[data-image-lightbox]")?.setAttribute("data-image-lightbox", previewDataUrl);
      image.removeAttribute("data-resource-crop");
    } catch (error) {
      console.warn("resource crop preview failed", error);
    }
  }));
}

function resourceFolderGroupName(asset) {
  if (asset.type !== "folder") {
    return "\u9879\u76EE\u8D44\u6E90";
  }
  const relativePath = String(asset.relative_path || asset.name || "").replaceAll("\\", "/");
  const parts = relativePath.split("/").filter(Boolean);
  const rootName = asset.root_name || resourcePathLabel(asset.root_path || "");
  const groupName = parts.length > 1 ? parts[0] : "\u6839\u76EE\u5F55";
  return rootName ? `${rootName} / ${groupName}` : groupName;
}

function resourceFolderGroups(assets) {
  const groups = new Map();
  const addGroup = (groupName) => {
    if (!groups.has(groupName)) {
      groups.set(groupName, { key: groupName, name: groupName, assets: [] });
    }
    return groups.get(groupName);
  };
  const project = currentResourceProject();
  const folderPaths = resourceProjectFolderPaths(project);
  folderPaths.forEach((path, index) => {
    addGroup(`${resourcePathLabel(path, index)} / \u6839\u76EE\u5F55`);
  });
  if (project?.id) {
    resourceFolderDirList(project.id).forEach((folder) => {
      const rootName = folder.root_name || resourcePathLabel(folder.root_path || "");
      if (rootName && folder.name) {
        addGroup(`${rootName} / ${folder.name}`);
      }
    });
  }
  const addAsset = (asset) => {
    const groupName = resourceFolderGroupName(asset);
    addGroup(groupName).assets.push(asset);
  };
  assets.forEach((asset) => addAsset(asset));
  return Array.from(groups.values()).sort((a, b) => {
    if (a.name === "\u9879\u76EE\u8D44\u6E90") return -1;
    if (b.name === "\u9879\u76EE\u8D44\u6E90") return 1;
    if (a.name.endsWith(" / \u6839\u76EE\u5F55") && !b.name.endsWith(" / \u6839\u76EE\u5F55")) return -1;
    if (!a.name.endsWith(" / \u6839\u76EE\u5F55") && b.name.endsWith(" / \u6839\u76EE\u5F55")) return 1;
    return a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true });
  });
}

function setResourceFolderTab(folderKey) {
  state.resourceManager.activeFolderTab = String(folderKey || "all");
  renderResourceManager();
  persistSession();
}

function toggleResourceFolderCollapse(folderKey) {
  if (!folderKey) {
    return;
  }
  const collapsed = state.resourceManager.collapsedFolders || {};
  collapsed[folderKey] = !collapsed[folderKey];
  state.resourceManager.collapsedFolders = collapsed;
  renderResourceManager();
  persistSession();
}

function renderResourceFolderTabs(groups) {
  if (!els.resourceFolderTabs) {
    return;
  }
  const active = state.resourceManager.activeFolderTab || "all";
  const tabs = [
    { key: "all", name: "\u5168\u90E8", count: groups.reduce((total, group) => total + group.assets.length, 0) },
    ...groups.map((group) => ({ key: group.key, name: group.name, count: group.assets.length })),
  ];
  els.resourceFolderTabs.innerHTML = tabs.map((tab) => `
    <button class="resource-folder-tab ${active === tab.key ? "active" : ""}" type="button" data-resource-folder-tab="${escapeHtml(tab.key)}">
      <span>${escapeHtml(tab.name)}</span>
      <b>${tab.count}</b>
    </button>
  `).join("");
}

function renderResourceFolderSection(group, { collapsible = true } = {}) {
  const collapsed = Boolean(state.resourceManager.collapsedFolders?.[group.key]);
  const body = group.assets.length
    ? `<div class="resource-folder-grid">${group.assets.map(renderResourceAssetCard).join("")}</div>`
    : `<div class="resource-folder-empty-row">\u6587\u4EF6\u5939\u4E3A\u7A7A</div>`;
  return `
    <section class="resource-folder-section ${collapsed ? "collapsed" : ""}">
      <button class="resource-folder-header" type="button" ${collapsible ? `data-resource-folder-toggle="${escapeHtml(group.key)}"` : ""}>
        <span class="resource-folder-arrow" aria-hidden="true">${collapsed ? "\u25B8" : "\u25BE"}</span>
        <strong>${escapeHtml(group.name)}</strong>
        <small>${group.assets.length} \u9879</small>
      </button>
      ${collapsed ? "" : body}
    </section>
  `;
}

function renderResourceFolderAssetsOnly(group) {
  if (!group?.assets?.length) {
    return `<div class="resource-folder-empty-row">\u8FD9\u4E2A\u6587\u4EF6\u5939\u8FD8\u6CA1\u6709\u8D44\u6E90\u3002</div>`;
  }
  return `<div class="resource-folder-grid">${group.assets.map(renderResourceAssetCard).join("")}</div>`;
}

function renderResourceAssets(projectAssets, folderAssets) {
  const entries = currentResourceAssetEntries(projectAssets, folderAssets);
  pruneResourceSelection(entries);
  const groups = resourceFolderGroups(entries);
  if (!els.resourceAssetGrid) {
    return;
  }
  if (!groups.length) {
    state.resourceManager.activeFolderTab = "all";
    renderResourceFolderTabs(groups);
    els.resourceAssetGrid.innerHTML = `<div class="resource-empty-note">\u8FD9\u4E2A\u9879\u76EE\u8FD8\u6CA1\u6709\u8D44\u6E90\u3002</div>`;
    renderResourceSelectionBar();
    return;
  }
  let active = state.resourceManager.activeFolderTab || "all";
  if (active !== "all" && !groups.some((group) => group.key === active)) {
    state.resourceManager.activeFolderTab = "all";
    active = "all";
  }
  renderResourceFolderTabs(groups);
  if (active === "all") {
    els.resourceAssetGrid.innerHTML = groups.map((group) => renderResourceFolderSection(group, { collapsible: true })).join("");
    renderResourceSelectionBar();
    void renderResourceCropPreviews();
    return;
  }
  const selectedGroup = groups.find((group) => group.key === active) || groups[0];
  state.resourceManager.activeFolderTab = selectedGroup?.key || "all";
  els.resourceAssetGrid.innerHTML = selectedGroup
    ? renderResourceFolderAssetsOnly(selectedGroup)
    : `<div class="resource-empty-note">\u8FD9\u4E2A\u6587\u4EF6\u5939\u8FD8\u6CA1\u6709\u8D44\u6E90\u3002</div>`;
  renderResourceSelectionBar();
  void renderResourceCropPreviews();
}

function renderResourceManager() {
  if (!els.resourceModule) {
    return;
  }
  const project = ensureResourceProjectSelection();
  const projects = resourceProjects();
  const view = project ? normalizeResourceView(state.resourceManager.view) : "overview";
  state.resourceManager.view = view;
  els.resourceModule.classList.toggle("resource-detail-mode", view === "detail");
  if (els.resourceOverviewPage) {
    els.resourceOverviewPage.hidden = view !== "overview";
  }
  if (els.resourceDetailPage) {
    els.resourceDetailPage.hidden = view !== "detail";
  }
  if (view !== "detail") {
    state.resourceSelection.clear();
    renderResourceSelectionBar();
  }
  if (els.resourceProjectList) {
    els.resourceProjectList.innerHTML = projects.length
      ? projects.map((item) => {
          const resourceCount = (item.resources || []).length;
          const folderCount = resourceFolderAssetList(item.id).length;
          const folderPathCount = resourceProjectFolderPaths(item).length;
          const boundText = folderPathCount ? `\u5DF2\u7ED1\u5B9A ${folderPathCount} \u4E2A\u6587\u4EF6\u5939` : "\u672A\u7ED1\u5B9A";
          return `
            <article class="resource-project-item resource-project-card ${view === "detail" && project?.id === item.id ? "active" : ""}" data-resource-project-card="${escapeHtml(item.id)}">
              <div class="resource-project-card-head">
                <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
                <span>${resourceCount + folderCount} \u9879\u8D44\u6E90</span>
              </div>
              <div class="resource-project-card-meta">
                <span><b>${resourceCount}</b> \u9879\u76EE\u5185</span>
                <span><b>${folderCount}</b> \u6587\u4EF6\u5939</span>
                <span>${boundText}</span>
              </div>
              <div class="resource-project-card-actions">
                <button class="ghost-button" type="button" data-resource-project-rename="${escapeHtml(item.id)}">\u4FEE\u6539</button>
                <button class="primary-button resource-project-enter-button" type="button" data-resource-project-enter="${escapeHtml(item.id)}">\u8FDB\u5165\u9879\u76EE</button>
              </div>
            </article>
          `;
        }).join("")
      : `<div class="resource-empty-note resource-overview-empty">\u8FD8\u6CA1\u6709\u9879\u76EE\uFF0C\u70B9\u51FB\u53F3\u4E0A\u89D2\u7684 + \u65B0\u5EFA\u4E00\u4E2A\u3002</div>`;
  }
  if (!project) {
    if (els.resourceProjectTitle) els.resourceProjectTitle.textContent = "\u672A\u9009\u62E9\u9879\u76EE";
    if (els.resourceFolderInput) els.resourceFolderInput.value = "";
    renderResourceBoundFolderList(null);
    if (els.resourceProjectSummary) {
      els.resourceProjectSummary.innerHTML = `
        <span><b>0</b> \u9879\u76EE\u5185\u8D44\u6E90</span>
        <span><b>0</b> \u6587\u4EF6\u5939\u8D44\u6E90</span>
      `;
    }
    if (els.resourceBindFolderButton) {
      els.resourceBindFolderButton.textContent = "\u7ED1\u5B9A\u6587\u4EF6\u5939";
      els.resourceBindFolderButton.classList.add("primary-button");
      els.resourceBindFolderButton.classList.remove("ghost-button", "is-short");
    }
    if (els.resourceRefreshFolderButton) {
      els.resourceRefreshFolderButton.hidden = true;
    }
    if (els.resourceAssetGrid) {
      els.resourceAssetGrid.innerHTML = `<div class="resource-empty-note">\u521B\u5EFA\u9879\u76EE\u540E\u53EF\u4EE5\u6536\u96C6\u62A0\u56FE\u3001\u62C6\u56FE\u548C\u672C\u5730\u6587\u4EF6\u5939\u8D44\u6E90\u3002</div>`;
    }
    if (els.resourceFolderTabs) {
      els.resourceFolderTabs.innerHTML = "";
    }
    state.resourceSelection.clear();
    renderResourceSelectionBar();
    return;
  }
  if (view !== "detail") {
    return;
  }
  const projectAssets = project.resources || [];
  const folderAssets = resourceFolderAssetList(project.id);
  const folderPaths = resourceProjectFolderPaths(project);
  const hasFolder = folderPaths.length > 0;
  if (els.resourceProjectTitle) els.resourceProjectTitle.textContent = project.name;
  if (els.resourceFolderInput) els.resourceFolderInput.value = hasFolder ? `${folderPaths.length} \u4E2A\u6587\u4EF6\u5939` : "";
  renderResourceBoundFolderList(project);
  if (els.resourceProjectSummary) {
    els.resourceProjectSummary.innerHTML = `
      <span><b>${projectAssets.length}</b> \u9879\u76EE\u5185\u8D44\u6E90</span>
      <span><b>${folderAssets.length}</b> \u6587\u4EF6\u5939\u8D44\u6E90</span>
    `;
  }
  if (els.resourceBindFolderButton) {
    els.resourceBindFolderButton.textContent = hasFolder ? "\u6DFB\u52A0" : "\u7ED1\u5B9A\u6587\u4EF6\u5939";
    els.resourceBindFolderButton.classList.toggle("primary-button", !hasFolder);
    els.resourceBindFolderButton.classList.toggle("ghost-button", hasFolder);
    els.resourceBindFolderButton.classList.toggle("is-short", hasFolder);
  }
  if (els.resourceRefreshFolderButton) {
    els.resourceRefreshFolderButton.hidden = !hasFolder;
  }
  renderResourceAssets(projectAssets, folderAssets);
}

const VIDEO_PROCESS_TOOL_COPY = {
  import: "\u5BFC\u5165\u6A21\u5757",
  preview: "\u9884\u89C8\u89C6\u9891",
  edit: "\u526A\u8F91\u89C6\u9891",
  compress: "\u538B\u7F29\u89C6\u9891",
};

function setActiveVideoProcessTool(toolName, { announce = true, render = true, scroll = true } = {}) {
  const nextTool = VIDEO_PROCESS_TOOL_COPY[toolName] ? toolName : "import";
  state.videoProcess.activeTool = nextTool;
  document.querySelectorAll("[data-video-process-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.videoProcessTool === nextTool);
    button.setAttribute("aria-pressed", String(button.dataset.videoProcessTool === nextTool));
  });
  document.querySelectorAll("[data-video-process-panel]").forEach((panel) => {
    panel.hidden = false;
  });
  const panel = document.querySelector(`[data-video-process-panel="${nextTool}"]`);
  if (scroll && panel) {
    scrollWorkbenchTargetIntoView(panel, announce ? "smooth" : "auto");
  }
  if (announce) {
    setStatus(`\u5DF2\u5207\u6362\u5230${VIDEO_PROCESS_TOOL_COPY[nextTool]}\u3002`, "success");
  }
  if (render) {
    renderVideoProcessModule({ syncInputs: false });
  }
}

const IMAGE_TOOL_COPY = {
  import: { title: "\u5BFC\u5165\u56FE\u7247", panelId: "imageImportPanel" },
  matte: { title: "\u62A0\u56FE", panelId: "imageMattePanel" },
  result: { title: "\u62A0\u56FE\u7ED3\u679C\u9884\u89C8", panelId: "imageResultPanel" },
  split: { title: "\u62C6\u56FE", panelId: "imageSplitPanel" },
  splitPreview: { title: "\u62C6\u56FE\u7ED3\u679C\u9884\u89C8", panelId: "imageSplitPreviewPanel" },
  naming: { title: "\u5BFC\u51FA", panelId: "imageNamingPanel" },
};

const IMAGE_PAGE_COPY = {
  full: "\u5168\u6D41\u7A0B",
  dual: "\u53CC\u80CC\u666F\u62A0\u56FE",
};

function setActiveImagePage(pageName = "full", { announce = true, persist = true } = {}) {
  const nextPage = pageName === "dual" ? "dual" : "full";
  state.activeImagePage = nextPage;
  document.querySelectorAll("[data-image-page]").forEach((button) => {
    const isActive = button.dataset.imagePage === nextPage;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.querySelectorAll("[data-image-page-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.imagePagePanel !== nextPage;
  });
  if (nextPage === "dual") {
    renderDualBackgroundMatte();
  }
  requestWorkflowNavigationRefresh();
  if (persist) {
    persistSession();
  }
  if (announce) {
    setStatus(`\u5DF2\u5207\u6362\u5230\u56FE\u7247\u5904\u7406\uFF1A${IMAGE_PAGE_COPY[nextPage]}\u3002`, "success");
  }
}

function setActiveImageTool(toolName, { announce = true } = {}) {
  const normalizedTool = toolName === "preview" ? "matte" : toolName;
  const nextTool = IMAGE_TOOL_COPY[normalizedTool] ? normalizedTool : "import";
  state.activeImageTool = nextTool;
  const copy = IMAGE_TOOL_COPY[nextTool];
  document.querySelectorAll("[data-image-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.imageTool === nextTool);
    button.setAttribute("aria-pressed", String(button.dataset.imageTool === nextTool));
  });
  if (announce) {
    const target = document.getElementById(copy.panelId);
    if (target) {
      scrollWorkbenchTargetIntoView(target, "smooth");
    }
    setStatus("\u5DF2\u5207\u6362\u5230\u56FE\u7247\u5904\u7406\uFF1A" + copy.title + "\u3002", "success");
  }
}

function workbenchScrollContainerForTarget(target) {
  if (!target || !document.body.classList.contains("workbench-scroll-locked")) {
    return null;
  }
  const container = target.closest(".main-grid, .image-module-main, .video-process-main");
  if (!container) {
    return null;
  }
  const style = window.getComputedStyle(container);
  if (style.overflowY === "visible" || style.overflowY === "hidden") {
    return null;
  }
  return container;
}

function scrollWorkbenchTargetIntoView(target, behavior = "smooth") {
  const container = workbenchScrollContainerForTarget(target);
  if (!container) {
    target.scrollIntoView({ behavior, block: "start" });
    return;
  }
  const targetRect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const top = targetRect.top - containerRect.top + container.scrollTop;
  container.scrollTo({ top: Math.max(0, top), behavior });
  requestWorkflowNavigationRefresh();
}

function mergeSegmentRangeControls() {
  const segmentPanel = document.querySelector(".segment-panel");
  const startField = els.startRange?.closest(".field");
  const endField = els.endRange?.closest(".field");
  const startStepper = els.startInput?.closest(".stepper-input");
  const endStepper = els.endInput?.closest(".stepper-input");
  if (!segmentPanel || !startField || !endField || !startStepper || !endStepper) {
    return;
  }
  if (segmentPanel.querySelector(".segment-range-field")) {
    return;
  }

  const rangeField = document.createElement("div");
  rangeField.className = "segment-range-field field";

  const rangeControl = document.createElement("div");
  rangeControl.className = "segment-range-control";

  const rangeTrack = document.createElement("div");
  rangeTrack.className = "segment-range-track";
  els.startRange.classList.add("segment-range-thumb", "segment-range-start");
  els.endRange.classList.add("segment-range-thumb", "segment-range-end");
  rangeTrack.append(els.startRange, els.endRange);

  const startBox = document.createElement("div");
  startBox.className = "segment-frame-box";
  startBox.innerHTML = "<span>起始帧</span>";
  startBox.append(startStepper);

  const endBox = document.createElement("div");
  endBox.className = "segment-frame-box";
  endBox.innerHTML = "<span>结束帧</span>";
  endBox.append(endStepper);

  rangeControl.append(startBox, rangeTrack, endBox);
  rangeField.append(rangeControl);
  segmentPanel.insertBefore(rangeField, startField);
  startField.remove();
  endField.remove();
  updateSegmentRangeVisual();
}

function updateSegmentRangeVisual() {
  const track = document.querySelector(".segment-range-track");
  if (!track || !els.startRange || !els.endRange) {
    return;
  }
  const min = Number(els.startRange.min || 0);
  const max = Number(els.startRange.max || 1);
  const span = Math.max(max - min, 1);
  const start = clamp(((Number(els.startRange.value || min) - min) / span) * 100, 0, 100);
  const end = clamp(((Number(els.endRange.value || max) - min) / span) * 100, 0, 100);
  track.style.setProperty("--segment-start", `${Math.min(start, end)}%`);
  track.style.setProperty("--segment-end", `${Math.max(start, end)}%`);
}

function workflowLinks() {
  return Array.from(document.querySelectorAll(".rail-item[data-workflow-target]"));
}

function workflowTargetForLink(link) {
  return document.getElementById(link.dataset.workflowTarget || "");
}

function isWorkflowTargetVisible(target) {
  return Boolean(target && target.getClientRects().length > 0);
}

function setActiveWorkflowTarget(targetId) {
  workflowLinks().forEach((link) => {
    const isActive = link.dataset.workflowTarget === targetId;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "step" : "false");
  });

  document.querySelectorAll(".workflow-target").forEach((target) => {
    target.classList.toggle("workflow-active", target.id === targetId && isWorkflowTargetVisible(target));
  });
}

function currentWorkflowTargetId() {
  const topOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar")) || 76;
  const visibleTargets = workflowLinks()
    .map(workflowTargetForLink)
    .filter(isWorkflowTargetVisible);
  const internalContainer = visibleTargets.map(workbenchScrollContainerForTarget).find(Boolean);
  const scanLine = internalContainer
    ? internalContainer.getBoundingClientRect().top + 72
    : topOffset + 92;

  let current = visibleTargets[0] || null;
  visibleTargets.forEach((target) => {
    const rect = target.getBoundingClientRect();
    if (rect.top <= scanLine && rect.bottom > scanLine) {
      current = target;
    } else if (rect.top <= scanLine) {
      current = target;
    }
  });
  return current?.id || "";
}

function refreshWorkflowNavigation() {
  const links = workflowLinks();
  links.forEach((link) => {
    const target = workflowTargetForLink(link);
    const isVisible = isWorkflowTargetVisible(target);
    link.classList.toggle("is-disabled", !isVisible);
    link.setAttribute("aria-disabled", isVisible ? "false" : "true");
  });

  const activeId = currentWorkflowTargetId();
  if (activeId) {
    setActiveWorkflowTarget(activeId);
  }
}

function requestWorkflowNavigationRefresh() {
  if (workflowScrollRafId !== null) {
    return;
  }
  workflowScrollRafId = window.requestAnimationFrame(() => {
    workflowScrollRafId = null;
    refreshWorkflowNavigation();
  });
}

function scrollToWorkflowTarget(targetId, behavior = "smooth") {
  const target = document.getElementById(targetId);
  if (!isWorkflowTargetVisible(target)) {
    return;
  }
  setActiveWorkflowTarget(target.id);
  scrollWorkbenchTargetIntoView(target, behavior);
}

function initWorkflowNavigation() {
  const links = workflowLinks();
  if (!links.length) {
    return;
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = workflowTargetForLink(link);
      if (!isWorkflowTargetVisible(target)) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      scrollToWorkflowTarget(target.id);
    });
  });

  if ("IntersectionObserver" in window) {
    workflowObserver?.disconnect();
    workflowObserver = new IntersectionObserver(
      () => requestWorkflowNavigationRefresh(),
      {
        root: null,
        rootMargin: "-110px 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75],
      }
    );
    links.map(workflowTargetForLink).filter(Boolean).forEach((target) => workflowObserver.observe(target));
  }

  const mainGrid = document.querySelector(".main-grid");
  if (mainGrid && "MutationObserver" in window) {
    const mutationObserver = new MutationObserver(() => requestWorkflowNavigationRefresh());
    mutationObserver.observe(mainGrid, { attributes: true, subtree: true, attributeFilter: ["hidden", "class"] });
  }

  document.querySelectorAll(".main-grid, .image-module-main, .video-process-main").forEach((container) => {
    container.addEventListener("scroll", requestWorkflowNavigationRefresh, { passive: true });
  });
  window.addEventListener("scroll", requestWorkflowNavigationRefresh, { passive: true });
  window.addEventListener("resize", requestWorkflowNavigationRefresh);
  document.addEventListener("focusin", (event) => {
    const target = event.target instanceof Element ? event.target.closest(".workflow-target, #aiPolishModule, #exportModule") : null;
    if (target?.id && isWorkflowTargetVisible(target)) {
      setActiveWorkflowTarget(target.id);
    }
  });

  refreshWorkflowNavigation();
}

function normalizeThemeMode(mode) {
  return mode === "dark" ? "dark" : "light";
}

function applySunnyStageTheme(mode, { persist = true } = {}) {
  const normalized = normalizeThemeMode(mode);
  document.documentElement.dataset.theme = normalized;
  document.body.dataset.theme = normalized;
  els.themeLightButton?.classList.toggle("active", normalized === "light");
  els.themeDarkButton?.classList.toggle("active", normalized === "dark");
  els.themeLightButton?.setAttribute("aria-pressed", String(normalized === "light"));
  els.themeDarkButton?.setAttribute("aria-pressed", String(normalized === "dark"));
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      // Theme persistence is optional; the visible mode still updates.
    }
  }
}

function initSunnyStageTheme() {
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
  } catch {
    savedTheme = "light";
  }
  applySunnyStageTheme(savedTheme, { persist: false });
}

function normalizeMagicResizeMode(mode) {
  return mode === "soft" ? "soft" : "hard";
}

function magicResizeModeLabel(mode = state.magicResizeMode) {
  return MAGIC_RESIZE_MODE_LABELS[normalizeMagicResizeMode(mode)];
}

function setMagicResizeMode(mode, { clearExisting = true } = {}) {
  const normalized = normalizeMagicResizeMode(mode);
  const changed = state.magicResizeMode !== normalized;
  state.magicResizeMode = normalized;
  if (els.magicResizeHardInput) {
    els.magicResizeHardInput.checked = normalized === "hard";
  }
  if (els.magicResizeSoftInput) {
    els.magicResizeSoftInput.checked = normalized === "soft";
  }
  if (changed && clearExisting) {
    clearMagicPreview();
  }
}

function bindEvents() {
  els.projectCreateButton?.addEventListener("click", openProjectCreateDialog);
  els.projectOpenExistingButton?.addEventListener("click", () => void openExistingProject());
  els.projectBackButton?.addEventListener("click", () => showProjectLauncher());
  els.projectCreateCloseButton?.addEventListener("click", closeProjectCreateDialog);
  els.projectCreateCancelButton?.addEventListener("click", closeProjectCreateDialog);
  els.projectChooseParentButton?.addEventListener("click", () => void chooseProjectParent());
  els.projectCreateForm?.addEventListener("submit", (event) => void createProjectFromForm(event));
  els.projectCreateModeInput?.addEventListener("change", syncProjectCreateModeFields);
  els.projectAspectRatioInput?.addEventListener("change", syncProjectCreateModeFields);
  els.projectTemplateMoreButton?.addEventListener("click", toggleProjectTemplateHelp);
  els.projectNameInput?.addEventListener("input", () => {
    if (!projectSlugEdited) {
      els.projectSlugInput.value = projectSlugFromName(els.projectNameInput.value);
    }
    updateProjectRootPreview();
  });
  els.projectSlugInput?.addEventListener("input", () => {
    projectSlugEdited = true;
    els.projectSlugInput.value = els.projectSlugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    updateProjectRootPreview();
  });
  els.aiProductionListViewButton?.addEventListener("click", () => setProductionView("list"));
  els.aiProductionCanvasViewButton?.addEventListener("click", () => setProductionView("canvas"));
  els.aiProductionCanvasWorkspace?.addEventListener("click", (event) => void handleProductionCanvasQuickAction(event));
  els.projectAssetModuleBody?.addEventListener("click", handleProjectAssetModuleClick);
  els.projectAssetModuleBody?.addEventListener("input", handleProjectAssetModuleInput);
  els.projectAssetModuleBody?.addEventListener("change", handleProjectAssetModuleChange);
  els.projectAssetModuleActions?.addEventListener("click", handleProjectAssetModuleClick);
  els.projectLauncherGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-enter]");
    if (!button) return;
    const project = state.projectWorkspace.projects.find((item) => item.id === button.dataset.projectEnter);
    if (project) void enterProject(project);
  });
  [els.projectSidebar, els.projectDashboard].forEach((container) => {
    container?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-project-module]");
      if (!button || button.disabled) return;
      if (button.dataset.assetCategory) state.aiCreation.selectedAssetNodeId = `category-${button.dataset.assetCategory}`;
      activateProjectModule(button.dataset.projectModule || "project", button.dataset.resourceNode || "");
    });
  });
  els.moduleVideoButton.addEventListener("click", () => setActiveModule("video"));
  els.moduleVideoProcessButton?.addEventListener("click", () => setActiveModule("videoProcess"));
  els.moduleAiCreationButton?.addEventListener("click", () => setActiveModule("aiCreation"));
  els.moduleImageButton.addEventListener("click", () => setActiveModule("image"));
  els.moduleResourceButton?.addEventListener("click", () => setActiveModule("resource"));
  els.moduleModelButton?.addEventListener("click", () => setActiveModule("model"));
  els.themeLightButton?.addEventListener("click", () => applySunnyStageTheme("light"));
  els.themeDarkButton?.addEventListener("click", () => applySunnyStageTheme("dark"));
  els.modelRefreshButton?.addEventListener("click", () => refreshModelManager({ announce: true }));
  els.modelList?.addEventListener("click", (event) => {
    const clickTarget = event.target instanceof Element ? event.target : event.target?.parentElement;
    const button = clickTarget?.closest("[data-model-action]");
    if (!button) {
      return;
    }
    event.preventDefault();
    void handleModelAction(button.dataset.modelKey || "", button.dataset.modelAction || "");
  });
  els.resourceCreateProjectButton?.addEventListener("click", createResourceProject);
  els.resourceBackToProjectsButton?.addEventListener("click", () => setResourceView("overview"));
  els.resourceRenameProjectButton?.addEventListener("click", () => renameResourceProject());
  els.resourceProjectEditCloseButton?.addEventListener("click", closeResourceProjectEditDialog);
  els.resourceProjectEditSaveButton?.addEventListener("click", saveResourceProjectEdit);
  els.resourceProjectEditDeleteButton?.addEventListener("click", () => deleteResourceProject(state.resourceManager.editProjectId));
  els.resourceExportProjectCloseButton?.addEventListener("click", closeResourceExportProjectDialog);
  els.resourceMoveCloseButton?.addEventListener("click", closeResourceMoveDialog);
  els.resourceExportSelectAllButton?.addEventListener("click", () => {
    resourceExportSelectedKeys = new Set(currentResourceExportEntries().map((entry) => entry.key));
    renderResourceExportDialog();
  });
  els.resourceExportClearAllButton?.addEventListener("click", () => {
    resourceExportSelectedKeys = new Set();
    renderResourceExportDialog();
  });
  els.resourceExportSelectCurrentPageButton?.addEventListener("click", () => {
    resourceExportSelectedKeys = new Set(currentResourceExportPageEntries().map((entry) => entry.key));
    renderResourceExportDialog();
  });
  els.resourceExportConfirmButton?.addEventListener("click", () => exportImageResultsToResourceProject(resourceExportTargetProjectId));
  els.resourceDeleteSelectedButton?.addEventListener("click", () => {
    void deleteSelectedResourceAssets().catch((error) => {
      setStatus(error.message || "\u5220\u9664\u8D44\u6E90\u5931\u8D25\u3002", "error");
    });
  });
  els.resourceMoveSelectedButton?.addEventListener("click", openResourceMoveDialog);
  els.resourceExportPreviewList?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-resource-export-entry-key]");
    if (!item) {
      return;
    }
    const key = item.dataset.resourceExportEntryKey || "";
    if (resourceExportSelectedKeys.has(key)) {
      resourceExportSelectedKeys.delete(key);
    } else {
      resourceExportSelectedKeys.add(key);
    }
    renderResourceExportDialog();
  });
  els.resourceExportGroupTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-resource-export-group-key]");
    if (!tab) {
      return;
    }
    resourceExportActiveGroupKey = tab.dataset.resourceExportGroupKey || "";
    renderResourceExportDialog();
  });
  els.resourceExportProjectList?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-resource-export-project-id]");
    if (!option) {
      return;
    }
    resourceExportTargetProjectId = option.dataset.resourceExportProjectId || "";
    renderResourceExportProjectList();
  });
  els.resourceMoveTargetList?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-resource-move-target]");
    if (!option) {
      return;
    }
    void moveSelectedResourceAssets(option.dataset.resourceMoveTargetRoot || "", option.dataset.resourceMoveTarget || "");
  });
  els.resourceProjectEditNameInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveResourceProjectEdit();
    }
  });
  els.resourceProjectList?.addEventListener("click", (event) => {
    const renameButton = event.target.closest("[data-resource-project-rename]");
    if (renameButton) {
      renameResourceProject(renameButton.dataset.resourceProjectRename);
      return;
    }
    const enterButton = event.target.closest("[data-resource-project-enter]");
    if (enterButton) {
      selectResourceProject(enterButton.dataset.resourceProjectEnter);
      return;
    }
  });
  els.resourceBindFolderButton?.addEventListener("click", () => void bindResourceProjectFolder());
  els.resourceRefreshFolderButton?.addEventListener("click", () => void refreshResourceProjectFolder());
  els.resourceFolderList?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-resource-remove-folder]");
    if (!removeButton) {
      return;
    }
    removeResourceProjectFolder(removeButton.dataset.resourceRemoveFolder || "");
  });
  els.resourceFolderTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-resource-folder-tab]");
    if (tab) {
      setResourceFolderTab(tab.dataset.resourceFolderTab || "all");
    }
  });
  els.resourceAssetGrid?.addEventListener("click", (event) => {
    const selectButton = event.target.closest("[data-resource-select-asset]");
    if (selectButton) {
      toggleResourceAssetSelection(selectButton.dataset.resourceSelectAsset || "");
      return;
    }
    const folderToggle = event.target.closest("[data-resource-folder-toggle]");
    if (folderToggle) {
      toggleResourceFolderCollapse(folderToggle.dataset.resourceFolderToggle || "");
      return;
    }
    const previewButton = event.target.closest("[data-image-lightbox]");
    if (previewButton) {
      openImageLightbox(previewButton.dataset.imageLightbox, previewButton.dataset.caption || "");
    }
  });
  els.resourceAssetGrid?.addEventListener("pointerdown", beginResourceDragSelection);
  els.resourceAssetGrid?.addEventListener("pointermove", moveResourceDragSelection);
  els.resourceAssetGrid?.addEventListener("pointerup", endResourceDragSelection);
  els.resourceAssetGrid?.addEventListener("pointercancel", endResourceDragSelection);
  document.querySelectorAll("[data-video-process-tool]").forEach((button) => {
    button.addEventListener("click", () => setActiveVideoProcessTool(button.dataset.videoProcessTool));
  });
  document.querySelectorAll("[data-video-process-jump]").forEach((button) => {
    button.addEventListener("click", () => setActiveVideoProcessTool(button.dataset.videoProcessJump));
  });
  els.videoProcessImportPathButton?.addEventListener("click", () => void importVideoProcessFromPath());
  els.videoProcessUploadInput?.addEventListener("change", async () => {
    await uploadVideoProcessFiles(Array.from(els.videoProcessUploadInput.files || []));
    els.videoProcessUploadInput.value = "";
  });
  els.videoProcessDropzone?.addEventListener("click", () => openVideoProcessFilePicker());
  els.videoProcessEditImportButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openVideoProcessFilePicker();
  });
  els.videoProcessEditImportButton?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openVideoProcessFilePicker();
    }
  });
  els.videoProcessDropzone?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openVideoProcessFilePicker();
    }
  });
  els.videoProcessDropzone?.addEventListener("dragover", (event) => {
    if (!dragEventHasFiles(event)) return;
    event.preventDefault();
    els.videoProcessDropzone.classList.add("dragging");
  });
  els.videoProcessDropzone?.addEventListener("dragleave", () => {
    els.videoProcessDropzone.classList.remove("dragging");
  });
  els.videoProcessDropzone?.addEventListener("drop", async (event) => {
    if (!dragEventHasFiles(event)) return;
    event.preventDefault();
    els.videoProcessDropzone.classList.remove("dragging");
    await uploadVideoProcessFiles(Array.from(event.dataTransfer?.files || []));
  });
  [
    els.videoProcessFormatInput,
    els.videoProcessQualityInput,
    els.videoProcessWidthInput,
    els.videoProcessHeightInput,
    els.videoProcessFpsInput,
    els.videoProcessNameInput,
    els.videoProcessMuteInput,
    els.videoProcessTrimStartInput,
    els.videoProcessTrimEndInput,
    els.videoProcessSourceSelect,
    els.videoProcessSubtitleTextInput,
    els.videoProcessSubtitleStartInput,
    els.videoProcessSubtitleEndInput,
    els.videoProcessSubtitleSizeInput,
    els.videoProcessSubtitlePositionInput,
    els.videoProcessSubtitleColorInput,
    els.videoProcessSubtitleBoxInput,
  ].forEach((input) => {
    input?.addEventListener("input", updateVideoProcessSettingsFromInputs);
    input?.addEventListener("change", updateVideoProcessSettingsFromInputs);
  });
  els.videoProcessSourceSelect?.addEventListener("change", () => {
    selectVideoProcessAsset(els.videoProcessSourceSelect.value);
  });
  els.videoProcessAddSegmentButton?.addEventListener("click", addVideoProcessSegment);
  els.videoProcessAddFullClipButton?.addEventListener("click", addCurrentVideoProcessFullClip);
  els.videoProcessSplitAtPlayheadButton?.addEventListener("click", splitCurrentVideoProcessSourceAtPlayhead);
  els.videoProcessClearSegmentsButton?.addEventListener("click", clearVideoProcessSegments);
  els.videoProcessAddSubtitleButton?.addEventListener("click", addVideoProcessSubtitle);
  els.videoProcessClearSubtitlesButton?.addEventListener("click", clearVideoProcessSubtitles);
  els.videoProcessAssetList?.addEventListener("click", handleVideoProcessAssetListClick);
  els.videoProcessEditAssetList?.addEventListener("click", handleVideoProcessAssetListClick);
  els.videoProcessSegmentList?.addEventListener("click", (event) => {
    const removeButton = event.target?.closest?.("[data-remove-video-segment]");
    if (removeButton) {
      removeVideoProcessSegment(Number(removeButton.dataset.removeVideoSegment));
      return;
    }
    const moveButton = event.target?.closest?.("[data-move-video-segment]");
    if (moveButton) {
      moveVideoProcessSegment(Number(moveButton.dataset.moveVideoSegment), Number(moveButton.dataset.direction || 0));
    }
  });
  els.videoProcessSubtitleList?.addEventListener("click", (event) => {
    const removeButton = event.target?.closest?.("[data-remove-video-subtitle]");
    if (removeButton) {
      removeVideoProcessSubtitle(Number(removeButton.dataset.removeVideoSubtitle));
      return;
    }
    const useButton = event.target?.closest?.("[data-use-video-subtitle]");
    if (useButton) {
      useVideoProcessSubtitle(Number(useButton.dataset.useVideoSubtitle));
    }
  });
  els.videoProcessEditPreview?.addEventListener("loadedmetadata", updateVideoProcessEditPlaybackUI);
  els.videoProcessEditPreview?.addEventListener("durationchange", updateVideoProcessEditPlaybackUI);
  els.videoProcessEditPreview?.addEventListener("timeupdate", updateVideoProcessEditPlaybackUI);
  els.videoProcessEditPreview?.addEventListener("seeked", updateVideoProcessEditPlaybackUI);
  els.videoProcessEditSeekInput?.addEventListener("input", seekVideoProcessEditFromRange);
  els.videoProcessUseCurrentTrimStartButton?.addEventListener("click", () => markVideoProcessTime("trimStart"));
  els.videoProcessUseCurrentTrimEndButton?.addEventListener("click", () => markVideoProcessTime("trimEnd"));
  els.videoProcessUseCurrentSegmentStartButton?.addEventListener("click", () => markVideoProcessTime("segmentStart"));
  els.videoProcessUseCurrentSegmentEndButton?.addEventListener("click", () => markVideoProcessTime("segmentEnd"));
  els.videoProcessUseCurrentSubtitleStartButton?.addEventListener("click", () => markVideoProcessTime("subtitleStart"));
  els.videoProcessUseCurrentSubtitleEndButton?.addEventListener("click", () => markVideoProcessTime("subtitleEnd"));
  [
    els.videoProcessTrimTrack,
    els.videoProcessSegmentTrack,
    els.videoProcessSubtitleTrack,
  ].forEach((track) => {
    track?.addEventListener("click", seekVideoProcessEditFromTrack);
  });
  els.videoProcessCompressButton?.addEventListener("click", () => void compressProcessedVideo());
  els.videoProcessExportButton?.addEventListener("click", () => void exportVideoProcessResult());
  els.videoProcessRenderEditButton?.addEventListener("click", () => void compressProcessedVideo());
  els.videoProcessExportEditButton?.addEventListener("click", () => void exportVideoProcessResult());
  document.querySelectorAll("[data-image-tool], [data-image-tool-action]").forEach((element) => {
    element.addEventListener("click", () => {
      const toolName = element.dataset.imageTool || element.dataset.imageToolAction;
      setActiveImageTool(toolName);
    });
  });
  document.querySelectorAll("[data-image-page]").forEach((element) => {
    element.addEventListener("click", () => setActiveImagePage(element.dataset.imagePage));
  });
  document.querySelectorAll("[data-image-dual-target]").forEach((element) => {
    element.addEventListener("click", () => {
      const targetId = element.dataset.imageDualTarget || "";
      const target = document.getElementById(targetId);
      if (target) {
        scrollWorkbenchTargetIntoView(target, "smooth");
      }
      document.querySelectorAll("[data-image-dual-target]").forEach((button) => {
        const active = button === element;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    });
  });
  els.dualBlackImportSelect?.addEventListener("change", () => setDualBackgroundImportSource("black", els.dualBlackImportSelect.value));
  els.dualWhiteImportSelect?.addEventListener("change", () => setDualBackgroundImportSource("white", els.dualWhiteImportSelect.value));
  els.dualBlackFileInput?.addEventListener("change", () => {
    setDualBackgroundFileSource("black", els.dualBlackFileInput.files?.[0]);
    els.dualBlackFileInput.value = "";
  });
  els.dualWhiteFileInput?.addEventListener("change", () => {
    setDualBackgroundFileSource("white", els.dualWhiteFileInput.files?.[0]);
    els.dualWhiteFileInput.value = "";
  });
  els.dualPasteBlackButton?.addEventListener("click", () => void pasteDualBackgroundSource("black"));
  els.dualPasteWhiteButton?.addEventListener("click", () => void pasteDualBackgroundSource("white"));
  els.dualClearBlackButton?.addEventListener("click", () => clearDualBackgroundSource("black"));
  els.dualClearWhiteButton?.addEventListener("click", () => clearDualBackgroundSource("white"));
  document.querySelectorAll("[data-dual-source-card]").forEach((card) => {
    const setTarget = () => setDualBackgroundPasteTarget(card.dataset.dualSourceCard);
    card.addEventListener("pointerdown", setTarget);
    card.addEventListener("focusin", setTarget);
  });
  [els.dualMatteBiasInput, els.dualMatteFeatherInput, els.dualMatteTrimInput].forEach((input) => {
    input?.addEventListener("input", renderDualBackgroundMatte);
    input?.addEventListener("change", renderDualBackgroundMatte);
  });
  els.dualMatteRunButton?.addEventListener("click", () => void runDualBackgroundMatte());
  els.dualExportButton?.addEventListener("click", () => void exportImageMatteResult(els.dualExportButton));
  els.dualExportResourceButton?.addEventListener("click", () => openResourceExportProjectDialog("matte"));
  els.dualGoSplitButton?.addEventListener("click", () => void goDualResultToSplit());
  [els.dualBlackPreview, els.dualWhitePreview, els.dualResultPreview].forEach((container) => {
    container?.addEventListener("click", (event) => {
      const image = event.target.closest("[data-image-lightbox]");
      if (image) {
        openImageLightbox(image.dataset.imageLightbox, image.dataset.caption || "");
      }
    });
  });
  els.imageImportButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openImageFilePicker();
    }
  });
  els.imagePasteButton?.addEventListener("click", () => {
    void importImageFromClipboardButton();
  });
  els.imageDropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openImageFilePicker();
    }
  });
  els.imageDropzone.addEventListener("click", (event) => {
    if (event.target.closest("[data-image-lightbox]")) {
      return;
    }
    openImageFilePicker();
  });
  els.imageImportGallery.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-image-frame]");
    if (removeButton) {
      event.preventDefault();
      event.stopPropagation();
      void removeImageImportFrame(Number(removeButton.dataset.removeImageFrame || -1));
      return;
    }
    const button = event.target.closest("[data-image-lightbox]");
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    openImageLightbox(button.dataset.imageLightbox, button.dataset.caption || "");
  });
  els.imageUploadInput.addEventListener("change", async () => {
    await uploadImageFiles(Array.from(els.imageUploadInput.files || []));
    els.imageUploadInput.value = "";
  });
  els.imageSplitImage?.addEventListener("load", () => applyImageSplitView({ renderOverlay: true }));
  window.addEventListener("resize", () => applyImageSplitView({ renderOverlay: true }));
  els.imageDropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.imageDropzone.classList.add("dragging");
  });
  els.imageDropzone.addEventListener("dragleave", () => {
    els.imageDropzone.classList.remove("dragging");
  });
  els.imageDropzone.addEventListener("drop", async (event) => {
    event.preventDefault();
    els.imageDropzone.classList.remove("dragging");
    await uploadImageFiles(Array.from(event.dataTransfer?.files || []));
  });
  document.addEventListener("paste", (event) => {
    void handleImagePasteImport(event);
  });
  window.addEventListener("focus", () => {
    void refreshImagePasteButtonAvailability();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void refreshImagePasteButtonAvailability();
    }
  });
  els.imageClearButton.addEventListener("click", clearImageWorkflow);
  els.imageResultGrid.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-image-result-index]");
    if (!tab) {
      return;
    }
    event.preventDefault();
    setSelectedImageIndex(Number(tab.dataset.imageResultIndex || 0), { persist: true });
  });
  els.imageSplitTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-image-split-index]");
    if (!tab) {
      return;
    }
    event.preventDefault();
    setImageSplitSelectedIndex(Number(tab.dataset.imageSplitIndex || 0), { persist: true });
  });
  els.imageSplitAnalyzeButton?.addEventListener("click", () => void analyzeImageSplitBoxes());
  els.imageSplitSkipButton?.addEventListener("click", skipImageSplit);
  els.imageSplitConfirmButton?.addEventListener("click", confirmImageSplit);
  els.imageSplitAddBoxButton?.addEventListener("click", addImageSplitBox);
  els.imageSplitDeleteBoxButton?.addEventListener("click", deleteSelectedImageSplitBox);
  els.imageSplitMergeBoxButton?.addEventListener("click", mergeCheckedImageSplitBoxes);
  els.imageSplitZoomInput?.addEventListener("input", () => setImageSplitZoom(els.imageSplitZoomInput.value, { persist: true }));
  els.imageSplitFitButton?.addEventListener("click", fitImageSplitView);
  els.imageSplitCenterButton?.addEventListener("click", centerImageSplitView);
  els.imageSplitTransparentBgButton?.addEventListener("click", () => setImageSplitBackgroundMode("transparent", { persist: true }));
  els.imageSplitSolidBgButton?.addEventListener("click", () => setImageSplitBackgroundMode("solid", { persist: true }));
  els.imageSplitBackgroundInput?.addEventListener("input", () => setImageSplitBackground(els.imageSplitBackgroundInput.value, { persist: true }));
  els.imageSplitStage?.addEventListener("wheel", handleImageSplitWheel, { passive: false });
  els.imageSplitStage?.addEventListener("contextmenu", (event) => {
    if (event.target?.closest?.(".image-split-stage-actions")) {
      return;
    }
    event.preventDefault();
  });
  els.imageSplitStrengthInput?.addEventListener("input", () => {
    setImageSplitDetectionStrength(els.imageSplitStrengthInput.value, { persist: true });
  });
  els.imageSplitOverlay?.addEventListener("pointerdown", startImageSplitBoxPointer);
  els.imageSplitOverlay?.addEventListener("pointermove", moveImageSplitBoxPointer);
  els.imageSplitOverlay?.addEventListener("pointerup", finishImageSplitBoxPointer);
  els.imageSplitOverlay?.addEventListener("pointercancel", finishImageSplitBoxPointer);
  [els.imageSplitBoxXInput, els.imageSplitBoxYInput, els.imageSplitBoxWInput, els.imageSplitBoxHInput].forEach((input) => {
    input?.addEventListener("change", updateSelectedImageSplitBoxFromInputs);
  });
  els.imageSplitBoxList?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-split-box-id]");
    if (!row) {
      return;
    }
    selectImageSplitBox(row.dataset.splitBoxId);
  });
  els.imageSplitBoxList?.addEventListener("change", (event) => {
    if (event.target?.matches?.("[data-split-box-name]")) {
      updateImageSplitBoxName(event.target.dataset.splitBoxName, event.target.value);
    }
  });
  els.imageSplitPreviewBackButton?.addEventListener("click", () => setActiveImageTool("split"));
  els.imageSplitPreviewExportButton?.addEventListener("click", () => setActiveImageTool("naming"));
  els.imageNamingBackButton?.addEventListener("click", () => setActiveImageTool("splitPreview"));
  els.imageNamingExportToResourceButton?.addEventListener("click", () => openResourceExportProjectDialog("split"));
  els.imageNamingConfirmButton?.addEventListener("click", confirmImageNaming);
  document.querySelectorAll("input[name='imageSplitExportMode']").forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      state.imageNaming.exportMode = input.value === "direct" ? "direct" : "folder";
      state.imageNaming.confirmed = false;
      persistSession();
      renderImageNaming();
    });
  });
  els.imageNamingList?.addEventListener("input", (event) => {
    if (event.target?.matches?.("[data-image-name-key]")) {
      state.imageNaming.names[event.target.dataset.imageNameKey] = event.target.value;
      state.imageNaming.compression ||= {};
      delete state.imageNaming.compression[event.target.dataset.imageNameKey];
      state.imageNaming.confirmed = false;
      persistSession();
    } else if (event.target?.matches?.("[data-naming-batch-field]")) {
      updateImageNamingBatchState(event.target);
      persistSession();
    }
  });
  els.imageNamingList?.addEventListener("change", (event) => {
    if (event.target?.matches?.("[data-naming-batch-field]")) {
      updateImageNamingBatchState(event.target);
      if (event.target.type === "radio") {
        event.target.closest(".image-naming-mode-menu")?.removeAttribute("open");
      }
      persistSession();
    }
  });
  els.imageNamingList?.addEventListener("keydown", (event) => {
    const groupToggle = event.target?.closest?.("[data-image-naming-group-toggle]");
    if (groupToggle && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setImageNamingGroupCollapsed(groupToggle.dataset.imageNamingGroupToggle, groupToggle.getAttribute("aria-expanded") === "true");
      return;
    }
    const namingPreview = event.target?.closest?.("[data-naming-lightbox]");
    if (!namingPreview || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }
    event.preventDefault();
    if (imageNamingFormatBrush) {
      applyImageNamingFormatBrush(namingPreview.dataset.namingItemKey);
      return;
    }
    void openImageNamingPreviewLightbox(namingPreview);
  });
  els.imageNamingList?.addEventListener("click", (event) => {
    const groupToggle = event.target?.closest?.("[data-image-naming-group-toggle]");
    if (groupToggle) {
      event.preventDefault();
      setImageNamingGroupCollapsed(groupToggle.dataset.imageNamingGroupToggle, groupToggle.getAttribute("aria-expanded") === "true");
      return;
    }
    const formatButton = event.target?.closest?.("[data-format-brush-item]");
    if (formatButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleImageNamingFormatBrush(formatButton.dataset.formatBrushItem);
      return;
    }
    const removeButton = event.target?.closest?.("[data-remove-naming-item]");
    if (removeButton) {
      event.preventDefault();
      event.stopPropagation();
      removeImageNamingItem(removeButton.dataset.removeNamingItem);
      return;
    }
    const namingPreview = event.target?.closest?.("[data-naming-lightbox]");
    if (namingPreview) {
      event.preventDefault();
      event.stopPropagation();
      if (imageNamingFormatBrush) {
        applyImageNamingFormatBrush(namingPreview.dataset.namingItemKey);
        return;
      }
      void openImageNamingPreviewLightbox(namingPreview);
      return;
    }
    const presetRemoveButton = event.target?.closest?.("[data-naming-size-remove]");
    if (presetRemoveButton) {
      event.preventDefault();
      event.stopPropagation();
      removeImageNamingSizePreset(
        presetRemoveButton.dataset.namingSizeRemove,
        presetRemoveButton.dataset.presetValue
      );
      return;
    }
    const presetOption = event.target?.closest?.("[data-naming-size-preset]");
    if (presetOption) {
      event.preventDefault();
      applyImageNamingPresetValue(
        presetOption.dataset.batchKey,
        presetOption.dataset.presetValue,
        presetOption.closest("[data-naming-group]")
      );
      presetOption.closest(".image-naming-preset-dropdown")?.removeAttribute("open");
      persistSession();
      return;
    }
    const sizeButton = event.target?.closest?.("[data-naming-size-apply]");
    if (sizeButton) {
      event.preventDefault();
      applyImageNamingBatchSize(sizeButton.dataset.namingSizeApply);
      return;
    }
    const addSizeButton = event.target?.closest?.("[data-naming-size-add]");
    if (addSizeButton) {
      event.preventDefault();
      addImageNamingSizePreset(addSizeButton.dataset.namingSizeAdd);
      return;
    }
    const nameButton = event.target?.closest?.("[data-naming-name-apply]");
    if (nameButton) {
      event.preventDefault();
      applyImageNamingBatchNames(nameButton.dataset.namingNameApply);
      return;
    }
    const compressButton = event.target?.closest?.("[data-naming-compress]");
    if (compressButton) {
      event.preventDefault();
      void compressImageNamingGroup(compressButton.dataset.namingCompress, compressButton);
    }
  });
  els.imageSplitPreviewList?.addEventListener("keydown", (event) => {
    const groupToggle = event.target?.closest?.("[data-image-naming-group-toggle]");
    if (groupToggle && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setImageNamingGroupCollapsed(groupToggle.dataset.imageNamingGroupToggle, groupToggle.getAttribute("aria-expanded") === "true");
      return;
    }
    const namingPreview = event.target?.closest?.("[data-naming-lightbox]");
    if (!namingPreview || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }
    event.preventDefault();
    void openImageNamingPreviewLightbox(namingPreview);
  });
  els.imageSplitPreviewList?.addEventListener("click", (event) => {
    const groupToggle = event.target?.closest?.("[data-image-naming-group-toggle]");
    if (groupToggle) {
      event.preventDefault();
      setImageNamingGroupCollapsed(groupToggle.dataset.imageNamingGroupToggle, groupToggle.getAttribute("aria-expanded") === "true");
      return;
    }
    const namingPreview = event.target?.closest?.("[data-naming-lightbox]");
    if (namingPreview) {
      event.preventDefault();
      event.stopPropagation();
      void openImageNamingPreviewLightbox(namingPreview);
    }
  });
  els.imageLightboxCloseButton?.addEventListener("click", closeImageLightbox);
  [els.imageLightboxTransparentButton, els.imageLightboxOpaqueButton].forEach((button) => {
    button?.addEventListener("click", () => {
      setImageLightboxBackground(button.dataset.lightboxBgMode || "opaque");
    });
  });
  els.imageLightboxColorInput?.addEventListener("input", () => {
    setImageLightboxBackground("opaque", els.imageLightboxColorInput.value || "#ffffff");
  });
  els.imageLightboxNameInput?.addEventListener("input", updateImageLightboxNamingName);
  [els.imageLightboxWidthInput, els.imageLightboxHeightInput].forEach((input) => {
    input?.addEventListener("input", updateImageLightboxNamingSize);
  });
  [els.imageLightboxFitModeInput, els.imageLightboxNoneModeInput].forEach((input) => {
    input?.addEventListener("change", updateImageLightboxNamingMode);
  });
  els.imageLightboxNamingEditor?.addEventListener("change", (event) => {
    if (event.target?.matches?.("input[name='imageLightboxNamingMode']")) {
      event.target.closest(".image-lightbox-mode-menu")?.removeAttribute("open");
    }
  });
  els.imageLightboxAspectLockInput?.addEventListener("change", () => {
    if (imageLightboxEditContext) {
      imageLightboxEditContext.aspectLocked = Boolean(els.imageLightboxAspectLockInput.checked);
      if (imageLightboxEditContext.aspectLocked) {
        imageLightboxEditContext.aspectRatio = imageLightboxCurrentSizeRatio(imageNamingItemByKey(imageLightboxEditContext.itemKey));
      }
    }
  });
  els.imageLightboxNineSliceButton?.addEventListener("click", () => void openImageNineSliceEditor());
  [els.imageNineSliceLeftInput, els.imageNineSliceRightInput, els.imageNineSliceTopInput, els.imageNineSliceBottomInput].forEach((input) => {
    input?.addEventListener("input", updateImageNineSliceLinesFromInputs);
  });
  [els.imageNineSliceTargetWidthInput, els.imageNineSliceTargetHeightInput].forEach((input) => {
    input?.addEventListener("input", updateImageNineSliceTarget);
  });
  [els.imageNineSliceStretchModeInput, els.imageNineSliceShrinkModeInput].forEach((input) => {
    input?.addEventListener("change", updateImageNineSliceMode);
  });
  els.imageNineSliceZoomInButton?.addEventListener("click", () => {
    if (!imageNineSliceEditorState) return;
    imageNineSliceEditorState.zoom = clamp(Number(imageNineSliceEditorState.zoom || 1) * 1.15, 0.1, 12);
    renderImageNineSliceEditor();
  });
  els.imageNineSliceZoomOutButton?.addEventListener("click", () => {
    if (!imageNineSliceEditorState) return;
    imageNineSliceEditorState.zoom = clamp(Number(imageNineSliceEditorState.zoom || 1) / 1.15, 0.1, 12);
    renderImageNineSliceEditor();
  });
  els.imageNineSliceFitButton?.addEventListener("click", fitImageNineSliceView);
  els.imageNineSliceCenterButton?.addEventListener("click", () => {
    if (!imageNineSliceEditorState) return;
    imageNineSliceEditorState.pan = { x: 0, y: 0 };
    renderImageNineSliceEditor();
  });
  els.imageNineSliceCancelButton?.addEventListener("click", closeImageNineSliceEditor);
  els.imageNineSliceSaveButton?.addEventListener("click", () => void saveImageNineSliceResult());
  els.imageNineSliceExportResourceButton?.addEventListener("click", () => void saveImageNineSliceResult({ exportResource: true }));
  els.imageNineSliceCanvas?.addEventListener("pointerdown", beginImageNineSliceLineDrag);
  els.imageNineSliceCanvas?.addEventListener("pointermove", moveImageNineSliceLineDrag);
  els.imageNineSliceCanvas?.addEventListener("pointerup", endImageNineSliceLineDrag);
  els.imageNineSliceCanvas?.addEventListener("pointercancel", endImageNineSliceLineDrag);
  els.imageNineSliceCanvas?.addEventListener("pointerleave", () => {
    if (!imageNineSliceEditorState?.dragLine && els.imageNineSliceCanvas) {
      els.imageNineSliceCanvas.style.cursor = "crosshair";
    }
  });
  els.imageNineSliceEditor?.addEventListener("click", (event) => {
    const handle = event.target?.closest?.("[data-nine-slice-resize]");
    if (handle) {
      resizeImageNineSliceTarget(handle.dataset.nineSliceResize || "", event);
    }
  });
  els.imageNineSliceEditor?.addEventListener("pointerdown", beginImageNineSliceTargetResize);
  els.imageNineSliceEditor?.addEventListener("pointermove", moveImageNineSliceTargetResize);
  els.imageNineSliceEditor?.addEventListener("pointerup", endImageNineSliceTargetResize);
  els.imageNineSliceEditor?.addEventListener("pointercancel", endImageNineSliceTargetResize);
  els.imageLightbox?.addEventListener("click", (event) => {
    if (event.target === els.imageLightbox) {
      closeImageLightbox();
    }
  });
  els.imageLightbox?.addEventListener("wheel", handleImageLightboxWheel, { passive: false });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (imageNamingFormatBrush) {
      cancelImageNamingFormatBrush();
      return;
    }
    if (!els.localProfileDialog?.hidden) {
      closeLocalProfileDialog();
      return;
    }
    if (!els.projectCreateDialog?.hidden) {
      closeProjectCreateDialog();
      return;
    }
    if (!els.aiPreviewDialog?.hidden) {
      closeAiPreviewDialog();
      return;
    }
    if (!els.aiDeleteDialog?.hidden) {
      closeAiDeleteDialog();
      return;
    }
    if (!els.resourceProjectEditDialog?.hidden) {
      closeResourceProjectEditDialog();
      return;
    }
    if (!els.resourceExportProjectDialog?.hidden) {
      closeResourceExportProjectDialog();
      return;
    }
    if (!els.resourceMoveDialog?.hidden) {
      closeResourceMoveDialog();
      return;
    }
    if (!els.imageLightbox?.hidden) {
      closeImageLightbox();
    }
  });
  document.addEventListener("wheel", handleImagePreviewWheelZoom, { passive: false, capture: true });
  els.imageExportResultButton?.addEventListener("click", () => void exportImageMatteResult());
  els.imageExportToResourceButton?.addEventListener("click", () => openResourceExportProjectDialog("matte"));
  els.imageStartSplitButton?.addEventListener("click", startImageSplitFlow);
  els.localProfileButton?.addEventListener("click", openLocalProfileDialog);
  els.aiOpenProfileButton?.addEventListener("click", openLocalProfileDialog);
  document.querySelectorAll("[data-open-profile]").forEach((button) => {
    button.addEventListener("click", openLocalProfileDialog);
  });
  els.localProfileCloseButton?.addEventListener("click", closeLocalProfileDialog);
  els.localProfileModelButton?.addEventListener("click", openModelManagerFromLocalProfile);
  els.localProfileSaveButton?.addEventListener("click", () => void saveLocalProfile());
  els.localProfileTestButton?.addEventListener("click", () => void testGenerationProviderConnection());
  els.localProfileClearTokenButton?.addEventListener("click", () => void clearGenerationProviderToken());
  els.localProfileAvatarInput?.addEventListener("change", handleLocalProfileAvatarChange);
  els.aiImageViewButton?.addEventListener("click", () => setAiCreationView("image"));
  els.aiHistoryViewButton?.addEventListener("click", () => setAiCreationView("history"));
  els.aiAssetTreeSearchInput?.addEventListener("input", () => {
    state.aiCreation.assetTreeQuery = els.aiAssetTreeSearchInput.value.trim().toLowerCase();
    renderAiAssetTree();
  });
  els.aiAssetTree?.addEventListener("click", handleAiAssetNodeClick);
  els.aiChildAssetGrid?.addEventListener("click", handleAiAssetNodeClick);
  els.aiAssetNodeAddButton?.addEventListener("click", () => void createAiAssetNode());
  els.aiAssetGroupAddButton?.addEventListener("click", () => void createAiAssetNode("group"));
  els.aiAssetNodeRenameButton?.addEventListener("click", () => void renameSelectedAiAssetNode());
  els.aiAssetNodeDeleteButton?.addEventListener("click", () => void deleteSelectedAiAssetNode());
  els.aiModelSelect?.addEventListener("change", () => {
    state.aiCreation.selectedModel = els.aiModelSelect.value;
    renderGenerationCapabilityControls();
  });
  els.aiPromptInput?.addEventListener("input", updateAiGenerateAvailability);
  els.aiGenerateButton?.addEventListener("click", () => void submitAiImageGeneration());
  els.aiResultStatusFilter?.addEventListener("change", syncAiResultFilters);
  els.aiResultTypeFilter?.addEventListener("change", syncAiResultFilters);
  els.aiResultRatioFilter?.addEventListener("change", syncAiResultFilters);
  els.aiResultBackgroundFilter?.addEventListener("change", syncAiResultFilters);
  els.aiResultTimeFilter?.addEventListener("change", syncAiResultFilters);
  els.aiResultSortSelect?.addEventListener("change", syncAiResultFilters);
  els.aiRefreshHistoryButton?.addEventListener("click", () => void loadAiHistory({ refreshRemote: true }));
  els.aiHistoryMediaFilter?.addEventListener("change", syncAiHistoryFilters);
  els.aiHistoryStatusFilter?.addEventListener("change", syncAiHistoryFilters);
  els.aiHistorySearchInput?.addEventListener("input", syncAiHistoryFilters);
  els.aiHistorySelectVisibleButton?.addEventListener("click", selectVisibleAiHistory);
  els.aiHistoryClearSelectionButton?.addEventListener("click", clearAiHistorySelection);
  els.aiHistoryAddToImageButton?.addEventListener("click", () => void addSelectedAiRecordsToImageProcessing());
  els.aiHistoryAddToLibraryButton?.addEventListener("click", () => void addAiRecordsToLibrary(Array.from(state.aiCreation.selectedIds)));
  els.aiHistoryDeleteButton?.addEventListener("click", () => void setAiRecordLifecycle(Array.from(state.aiCreation.selectedIds), "trashed"));
  els.aiResultGrid?.addEventListener("click", handleAiCardAction);
  els.aiHistoryGrid?.addEventListener("click", handleAiCardAction);
  els.aiPreviewCloseButton?.addEventListener("click", closeAiPreviewDialog);
  els.aiDeleteCloseButton?.addEventListener("click", closeAiDeleteDialog);
  els.aiDeleteRecordOnlyButton?.addEventListener("click", () => void deleteAiHistoryRecords(false));
  els.aiDeleteWithFilesButton?.addEventListener("click", showAiDeleteFileConfirmation);
  els.aiDeleteBackButton?.addEventListener("click", hideAiDeleteFileConfirmation);
  els.aiDeleteConfirmFilesButton?.addEventListener("click", () => void deleteAiHistoryRecords(true));
  els.importPathButton.addEventListener("click", importFromPath);
  els.saveOutputPathButton?.addEventListener("click", selectOutputPath);
  els.uploadInput.addEventListener("change", handleUploadInputChange);
  els.previewFrameButton.addEventListener("click", () => void previewCurrentFrame());
  els.imagePreviewFrameButton?.addEventListener("click", () => void previewCurrentImage());
  els.imagePreviewImage?.addEventListener("click", () => {
    openImageLightbox(els.imagePreviewImage.dataset.imageLightbox || els.imagePreviewImage.currentSrc, els.imagePreviewImage.dataset.caption || "");
  });
  els.imagePreviewSourceImage?.addEventListener("click", () => {
    openImageLightbox(els.imagePreviewSourceImage.currentSrc, els.imagePreviewSourceImage.dataset.caption || "");
  });
  els.imagePreviewProcessedImage?.addEventListener("click", (event) => {
    if (state.imageManualRepair.enabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    openImageLightbox(els.imagePreviewProcessedImage.currentSrc, els.imagePreviewProcessedImage.dataset.caption || "");
  });
  els.imagePreviewProcessedStage?.addEventListener("click", (event) => {
    if (!state.imageManualRepair.enabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  });
  els.imagePreviewProcessedStage?.addEventListener("pointerdown", startImageManualRepairBrush);
  els.imagePreviewProcessedStage?.addEventListener("pointermove", continueImageManualRepairBrush);
  els.imagePreviewProcessedStage?.addEventListener("pointerup", finishImageManualRepairBrush);
  els.imagePreviewProcessedStage?.addEventListener("pointercancel", cancelImageManualRepairBrush);
  els.imagePreviewProcessedStage?.addEventListener("lostpointercapture", finishImageManualRepairBrush);
  els.greenToBlackButton.addEventListener("click", applyGreenToBlackPreview);
  els.greenDesaturateButton.addEventListener("click", applyGreenDesaturatePreview);
  els.semiTransparentToBlackButton.addEventListener("click", applySemiTransparentToBlackPreview);
  els.semiTransparentToOpaqueButton.addEventListener("click", applySemiTransparentToOpaquePreview);
  els.savePreviewButton.addEventListener("click", downloadProcessPreviewResult);
  els.imageGreenToBlackButton?.addEventListener("click", () => applyGreenToBlackPreview("image"));
  els.imageGreenDesaturateButton?.addEventListener("click", () => applyGreenDesaturatePreview("image"));
  els.imageSemiTransparentToBlackButton?.addEventListener("click", () => applySemiTransparentToBlackPreview("image"));
  els.imageSemiTransparentToOpaqueButton?.addEventListener("click", () => applySemiTransparentToOpaquePreview("image"));
  els.imageSavePreviewButton?.addEventListener("click", () => downloadProcessPreviewResult("image"));
  els.imagePreviewSourceLinkButton?.addEventListener("click", () => toggleImagePreviewLink("source"));
  els.imagePreviewProcessedLinkButton?.addEventListener("click", () => toggleImagePreviewLink("processed"));
  els.imageManualRepairToggleButton?.addEventListener("click", toggleImageManualRepairMode);
  document.querySelectorAll("input[name='imageManualRepairMode']").forEach((input) => {
    input.addEventListener("change", syncImageManualRepairControls);
  });
  els.imageManualRepairRadiusInput?.addEventListener("input", syncImageManualRepairControls);
  els.imageManualRepairToleranceInput?.addEventListener("input", syncImageManualRepairControls);
  els.imageManualRepairFeatherInput?.addEventListener("input", syncImageManualRepairControls);
  els.imageManualRepairSoftenInput?.addEventListener("input", syncImageManualRepairControls);
  els.imageManualRepairUndoButton?.addEventListener("click", () => void applyImageRepairHistory("undo"));
  els.imageManualRepairRedoButton?.addEventListener("click", () => void applyImageRepairHistory("redo"));
  els.extractButton.addEventListener("click", extractFrames);
  els.processButton.addEventListener("click", () => void processSelectedFrames());
  els.imageProcessButton.addEventListener("click", () => void processImageMatte());
  els.imageSkipMatteButton?.addEventListener("click", () => void skipImageMatteToSplit());
  els.exportButton.addEventListener("click", exportFrames);
  els.magicButton.addEventListener("click", runMagicPreview);
  els.magicResizeHardInput.addEventListener("change", () => {
    setMagicResizeMode(els.magicResizeHardInput.checked ? "hard" : "soft");
  });
  els.magicResizeSoftInput.addEventListener("change", () => {
    setMagicResizeMode(els.magicResizeSoftInput.checked ? "soft" : "hard");
  });
  setMagicResizeMode(state.magicResizeMode, { clearExisting: false });
  els.exportMagicFramesButton.addEventListener("click", () => exportMagicFrames("half", els.exportMagicFramesButton));
  els.exportMagicQuarterFramesButton.addEventListener("click", () => exportMagicFrames("quarter", els.exportMagicQuarterFramesButton));
  els.exportMagicEighthFramesButton.addEventListener("click", () => exportMagicFrames("eighth", els.exportMagicEighthFramesButton));
  document.querySelectorAll("[data-luma-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const scope = button.closest("#imageProcessPanel") ? "image" : "video";
      applyLumaPreset(button.dataset.lumaPreset, scope);
    });
  });
  bindUploadDropzone();

  bindTimePair("start", els.startRange, els.startInput, els.startStepDownButton, els.startStepUpButton);
  bindTimePair("end", els.endRange, els.endInput, els.endStepDownButton, els.endStepUpButton);

  els.videoPreview.addEventListener("loadedmetadata", () => {
    if (!isVideoUpload()) {
      return;
    }
    muteVideoPreview();
    applySourcePreviewPlaybackRate();
    updateVideoProgress(state.segment.start || 0);
    restartSegmentPlayback({ autoplay: false });
  });

  els.videoPreview.addEventListener("click", toggleSourcePreviewPlayback);
  els.videoPreview.addEventListener("timeupdate", () => {
    if (!isVideoUpload()) {
      return;
    }
    const current = els.videoPreview.currentTime || 0;
    els.currentTimeLabel.textContent = `\u5f53\u524d ${formatSeconds(current)}`;
    updateVideoProgress(current);
  });
  els.videoPreview.addEventListener("play", startSegmentPlaybackMonitor);
  els.videoPreview.addEventListener("pause", stopSegmentPlaybackMonitor);
  els.videoPreview.addEventListener("play", updateSourcePreviewPlaybackUI);
  els.videoPreview.addEventListener("pause", updateSourcePreviewPlaybackUI);
  els.videoPreview.addEventListener("ended", () => restartSegmentPlayback({ autoplay: true }));
  els.sourcePreviewPlayButton.addEventListener("click", toggleSourcePreviewPlayback);
  els.sourcePreviewRestartButton.addEventListener("click", () => restartSegmentPlayback({ autoplay: true }));
  els.sourcePreviewSeekRange.addEventListener("input", seekSourcePreviewFromControl);
  els.sourcePreviewSpeedSelect.addEventListener("change", applySourcePreviewPlaybackRate);
  els.sourceGoFirstFrameButton.addEventListener("click", () => seekSourcePreviewToFrame(1));
  els.sourcePreviousFrameButton.addEventListener("click", () => stepSourcePreviewFrame(-1));
  els.sourceNextFrameButton.addEventListener("click", () => stepSourcePreviewFrame(1));
  els.sourceGoLastFrameButton.addEventListener("click", () => seekSourcePreviewToFrame(getSegmentFrameCount()));
  els.sourceSetStartFrameButton.addEventListener("click", () => setSegmentBoundaryFromCurrentFrame("start"));
  els.sourceSetEndFrameButton.addEventListener("click", () => setSegmentBoundaryFromCurrentFrame("end"));

  els.manualKeyInput.addEventListener("input", () => syncManualColorLabel("video"));
  els.matteModeInput.addEventListener("change", () => updateChromaVisibility("video"));
  els.matteDependencyHint?.addEventListener("click", () => showMatteDependencyPrompt("video"));
  els.keyModeInput.addEventListener("change", () => updateChromaVisibility("video"));
  els.chromaEnabledInput.addEventListener("change", () => updateChromaVisibility("video"));
  els.corridorEnabledInput.addEventListener("change", () => updateChromaVisibility("video"));
  els.imageManualKeyInput.addEventListener("input", () => syncManualColorLabel("image"));
  els.imageMatteModeInput.addEventListener("change", () => updateChromaVisibility("image"));
  els.imageMatteDependencyHint?.addEventListener("click", () => showMatteDependencyPrompt("image"));
  els.imageKeyModeInput.addEventListener("change", () => updateChromaVisibility("image"));
  els.imageChromaEnabledInput.addEventListener("change", () => updateChromaVisibility("image"));
  els.imageCorridorEnabledInput.addEventListener("change", () => updateChromaVisibility("image"));
  els.aiResolutionInput.addEventListener("change", normalizeAiResolutionInput);

  els.extractFrameGrid.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
      return;
    }
    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }
    setExtractFrameSelected(index, target.checked);
    if (state.extractOrderedSelectionMode) {
      renderExtractFrames();
    } else {
      refreshExtractCardSelection(index, target.checked);
      renderExtractSelectionCount();
      syncExtractAnimationPreview();
      syncResultActions();
      persistSession();
    }
  });

  els.frameGrid.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
      return;
    }
    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }
    setFrameSelected(index, target.checked);
    clearMagicPreview();
    if (state.orderedSelectionMode) {
      renderFrames();
    } else {
      refreshCardSelection(index, target.checked);
      renderSelectionCount();
      syncAnimationPreview();
      syncResultActions();
      persistSession();
    }
  });

  els.extractSelectAllButton.addEventListener("click", () => selectExtractFrames(() => true));
  els.extractSelectNoneButton.addEventListener("click", () => {
    state.extractSelected = new Set();
    state.extractSelectionTouched = true;
    state.extractSelectionOrder = [];
    state.extractPreview.currentIndex = 0;
    renderExtractFrames();
  });
  els.extractSelectOddButton.addEventListener("click", () => selectExtractFrames((frame) => (frame.index + 1) % 2 === 1));
  els.extractSelectEvenButton.addEventListener("click", () => selectExtractFrames((frame) => (frame.index + 1) % 2 === 0));
  els.extractInvertSelectionButton.addEventListener("click", () => {
    if (!state.extractJob) return;
    const next = new Set();
    state.extractJob.frames.forEach((frame) => {
      if (!state.extractSelected.has(frame.index)) {
        next.add(frame.index);
      }
    });
    state.extractSelected = next;
    state.extractSelectionTouched = true;
    state.extractSelectionOrder = state.extractJob.frames.filter((frame) => next.has(frame.index)).map((frame) => frame.index);
    state.extractPreview.currentIndex = 0;
    renderExtractFrames();
  });
  els.extractOrderedSelectionInput.addEventListener("change", () => {
    setExtractOrderedSelectionMode(els.extractOrderedSelectionInput.checked);
    normalizeExtractSelectionOrder();
    state.extractPreview.currentIndex = 0;
    renderExtractFrames();
  });
  els.extractAnalyzeSimilarityButton?.addEventListener("click", () => void analyzeExtractSimilarity());
  els.extractSimilarityIgnoreNearInput?.addEventListener("change", () => {
    invalidateExtractSimilarity("\u76F8\u4F3C\u5EA6\u89C4\u5219\u5DF2\u53D8\u66F4\uFF0C\u8BF7\u91CD\u65B0\u5206\u6790\u3002");
  });
  els.extractSimilarityThresholdInput?.addEventListener("change", () => {
    normalizeExtractSimilarityThresholdInput();
    refreshExtractSimilarityGroups();
  });
  els.extractSimilarityKeepFirstButton?.addEventListener("click", () => applyExtractSimilarityKeepFirst());
  els.extractSimilarityDropSimilarButton?.addEventListener("click", () => applyExtractSimilarityDropSimilar());
  els.clearExtractFramesButton.addEventListener("click", clearExtractFrames);
  els.extractPreviewPlayPauseButton.addEventListener("click", toggleExtractPreviewPlayback);
  els.extractPreviewRestartButton.addEventListener("click", restartExtractPreviewPlayback);
  els.extractPreviewReverseInput.addEventListener("change", () => {
    state.extractPreview.isReversed = els.extractPreviewReverseInput.checked;
    state.extractPreview.currentIndex = 0;
    syncExtractAnimationPreview();
    persistSession();
  });
  els.extractPreviewBackgroundInput.addEventListener("input", () => {
    updateExtractPreviewBackground(els.extractPreviewBackgroundInput.value, true);
    syncExtractAnimationPreview(false);
  });
  els.extractPreviewIntervalInput.addEventListener("change", () => {
    normalizeExtractPreviewInterval();
    restartExtractPreviewTimer();
    persistSession();
  });

  els.selectAllButton.addEventListener("click", () => selectFrames(() => true));
  els.selectNoneButton.addEventListener("click", () => {
    state.selected = new Set();
    state.selectionOrder = [];
    state.preview.currentIndex = 0;
    clearMagicPreview();
    renderFrames();
  });
  els.selectOddButton.addEventListener("click", () => selectFrames((frame) => (frame.index + 1) % 2 === 1));
  els.selectEvenButton.addEventListener("click", () => selectFrames((frame) => (frame.index + 1) % 2 === 0));
  els.invertSelectionButton.addEventListener("click", () => {
    if (!state.job) return;
    const next = new Set();
    state.job.frames.forEach((frame) => {
      if (!state.selected.has(frame.index)) {
        next.add(frame.index);
      }
    });
    state.selected = next;
    state.selectionOrder = state.job.frames.filter((frame) => next.has(frame.index)).map((frame) => frame.index);
    state.preview.currentIndex = 0;
    clearMagicPreview();
    renderFrames();
  });
  els.orderedSelectionInput.addEventListener("change", () => {
    setOrderedSelectionMode(els.orderedSelectionInput.checked);
    normalizeSelectionOrder();
    state.preview.currentIndex = 0;
    clearMagicPreview();
    renderFrames();
  });
  els.clearPreviewFramesButton.addEventListener("click", clearPreviewFrames);
  els.importAnimationButton.addEventListener("click", () => els.customAnimationInput.click());
  els.importAnimationFolderButton.addEventListener("click", () => els.customAnimationFolderInput.click());
  els.customAnimationInput.addEventListener("change", async () => {
    await importCustomAnimationFrames(Array.from(els.customAnimationInput.files || []), els.importAnimationButton);
    els.customAnimationInput.value = "";
  });
  els.customAnimationFolderInput.addEventListener("change", async () => {
    await importCustomAnimationFrames(Array.from(els.customAnimationFolderInput.files || []), els.importAnimationFolderButton);
    els.customAnimationFolderInput.value = "";
  });

  els.openProcessedButton.addEventListener("click", async () => {
    if (state.job?.processed_dir) {
      await openPath(state.job.processed_dir);
    }
  });

  els.previewPlayPauseButton.addEventListener("click", togglePreviewPlayback);
  els.previewRestartButton.addEventListener("click", restartPreviewPlayback);
  els.previewReverseInput.addEventListener("change", () => {
    state.preview.isReversed = els.previewReverseInput.checked;
    state.preview.currentIndex = 0;
    syncAnimationPreview();
    persistSession();
  });
  els.previewBackgroundInput.addEventListener("input", () => {
    updatePreviewBackground(els.previewBackgroundInput.value, true);
    syncAnimationPreview(false);
  });
  els.previewIntervalInput.addEventListener("change", () => {
    normalizePreviewInterval();
    restartPreviewTimer();
    persistSession();
  });
  bindProcessPreviewZoom("source");
  bindProcessPreviewZoom("processed");
  bindProcessPreviewPan("source");
  bindProcessPreviewPan("processed");
  bindProcessPreviewZoom("source", "image");
  bindProcessPreviewZoom("processed", "image");
  bindProcessPreviewPan("source", "image");
  bindProcessPreviewPan("processed", "image");
  window.addEventListener("resize", () => {
    applyProcessPreviewTransform("source", "video");
    applyProcessPreviewTransform("processed", "video");
    applyProcessPreviewTransform("source", "image");
    applyProcessPreviewTransform("processed", "image");
  });

  [
    els.keepEveryInput,
    els.outputScaleInput,
    els.canvasModeInput,
    els.reducePxInput,
    els.chromaEnabledInput,
    els.keyModeInput,
    els.manualKeyInput,
    els.thresholdInput,
    els.softnessInput,
    els.despillInput,
    els.haloInput,
    els.corridorEnabledInput,
    els.corridorScreenInput,
    els.matteModeInput,
    els.aiModelInput,
    els.aiDeviceInput,
    els.aiResolutionInput,
    els.lumaBlackInput,
    els.lumaWhiteInput,
    els.lumaGammaInput,
    els.lumaStrengthInput,
    els.batchGreenToBlackInput,
    els.batchGreenDesaturateInput,
    els.batchSemiTransparentToBlackInput,
    els.batchSemiTransparentToOpaqueInput,
    els.imageChromaEnabledInput,
    els.imageOutputScaleInput,
    els.imageCanvasModeInput,
    els.imageReducePxInput,
    els.imageKeyModeInput,
    els.imageManualKeyInput,
    els.imageThresholdInput,
    els.imageSoftnessInput,
    els.imageDespillInput,
    els.imageHaloInput,
    els.imageCorridorEnabledInput,
    els.imageCorridorScreenInput,
    els.imageMatteModeInput,
    els.imageAiModelInput,
    els.imageAiDeviceInput,
    els.imageAiResolutionInput,
    els.imageLumaBlackInput,
    els.imageLumaWhiteInput,
    els.imageLumaGammaInput,
    els.imageLumaStrengthInput,
    els.imageBatchGreenToBlackInput,
    els.imageBatchGreenDesaturateInput,
    els.imageBatchSemiTransparentToBlackInput,
    els.imageBatchSemiTransparentToOpaqueInput,
    els.startInput,
    els.endInput,
  ].filter(Boolean).forEach((element) => {
    const eventName = element instanceof HTMLInputElement && element.type === "checkbox" ? "change" : "input";
    element.addEventListener(eventName, () => {
      persistSession();
      renderImageMatteSummary();
      if (element === els.aiModelInput || element === els.matteModeInput || element === els.chromaEnabledInput) {
        updateChromaVisibility("video");
      }
      if (element === els.imageAiModelInput || element === els.imageMatteModeInput || element === els.imageChromaEnabledInput) {
        updateChromaVisibility("image");
      }
    });
  });
}

function bindTimePair(key, rangeEl, numberEl, decreaseButton, increaseButton) {
  const frameKey = key === "start" ? "startFrame" : "endFrame";
  const applySegmentFrame = (nextFrame) => {
    state.segment[frameKey] = clampSegmentFrame(nextFrame);
    normalizeSegment(key);
    renderSegmentControls();
    updateSegmentConfirmationUI();
    restartSegmentPlayback({ autoplay: true });
    persistSession();
  };

  const handler = (event) => {
    const nextValue = Number(event.target.value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    applySegmentFrame(nextValue);
  };

  rangeEl.addEventListener("input", handler);
  numberEl.addEventListener("input", handler);
  numberEl.addEventListener("change", handler);
  decreaseButton.addEventListener("click", () => {
    applySegmentFrame(state.segment[frameKey] - 1);
  });
  increaseButton.addEventListener("click", () => {
    applySegmentFrame(state.segment[frameKey] + 1);
  });
  numberEl.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowUp" ? 1 : -1;
    applySegmentFrame(state.segment[frameKey] + direction);
  });
}

function bindProcessPreviewZoom(kind, scope = "video") {
  const { input, decreaseButton, zoomResetButton, panResetButton, increaseButton } = getProcessPreviewElements(kind, scope);
  const previewState = getProcessPreviewState(scope);

  input.addEventListener("input", () => {
    updateProcessPreviewZoom(kind, Number(input.value || 100), true, scope);
  });
  decreaseButton.addEventListener("click", () => {
    updateProcessPreviewZoom(kind, previewState.zoom[kind] - 10, true, scope);
  });
  zoomResetButton.addEventListener("click", () => {
    resetProcessPreviewZoom(kind, true, scope);
  });
  panResetButton.addEventListener("click", () => {
    resetProcessPreviewPan(kind, true, scope);
  });
  increaseButton.addEventListener("click", () => {
    updateProcessPreviewZoom(kind, previewState.zoom[kind] + 10, true, scope);
  });
}

function bindProcessPreviewPan(kind, scope = "video") {
  const { image, stage } = getProcessPreviewElements(kind, scope);
  if (!stage) {
    return;
  }

  image.addEventListener("load", () => {
    applyProcessPreviewTransform(kind, scope);
  });

  stage.addEventListener("pointerdown", (event) => {
    if (image.hidden || !image.getAttribute("src")) {
      return;
    }
    if (!shouldStartProcessPreviewPan(event, kind, scope)) {
      return;
    }

    const previewState = getProcessPreviewState(scope);
    const pan = previewState.pan[kind] || { x: 0, y: 0 };
    state[previewState.dragKey] = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    stage.classList.add("dragging");
    if (typeof stage.setPointerCapture === "function") {
      stage.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  });

  stage.addEventListener("pointermove", (event) => {
    const previewState = getProcessPreviewState(scope);
    const drag = state[previewState.dragKey];
    if (!drag || drag.kind !== kind || drag.pointerId !== event.pointerId) {
      return;
    }

    updateProcessPreviewPan(
      kind,
      drag.startPanX + event.clientX - drag.startX,
      drag.startPanY + event.clientY - drag.startY,
      scope
    );
    event.preventDefault();
  });

  const endDrag = (event) => {
    const previewState = getProcessPreviewState(scope);
    const drag = state[previewState.dragKey];
    if (!drag || drag.kind !== kind || drag.pointerId !== event.pointerId) {
      return;
    }

    state[previewState.dragKey] = null;
    stage.classList.remove("dragging");
    if (typeof stage.hasPointerCapture === "function" && stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
  };

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("lostpointercapture", endDrag);
  stage.addEventListener("contextmenu", (event) => {
    if (shouldReserveProcessedPreviewAuxPointer(kind, scope)) {
      event.preventDefault();
    }
  });
  stage.addEventListener("auxclick", (event) => {
    if (shouldReserveProcessedPreviewAuxPointer(kind, scope)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  stage.addEventListener("dblclick", () => {
    updateProcessPreviewPan(kind, 0, 0, scope);
  });
}

function shouldReserveProcessedPreviewAuxPointer(kind, scope) {
  return scope === "image" && kind === "processed" && state.imageManualRepair.enabled;
}

function shouldStartProcessPreviewPan(event, kind, scope) {
  const button = Number(event.button ?? 0);
  if (shouldReserveProcessedPreviewAuxPointer(kind, scope)) {
    return button === 1 || button === 2;
  }
  return button === 0;
}

function handleImagePreviewWheelZoom(event) {
  const stage = event.target?.closest?.("#imageResultPreviewHost .image-preview-stage");
  if (!stage) {
    return;
  }
  if (!event.ctrlKey) {
    return;
  }
  event.preventDefault();

  const kind = stage.querySelector("#imagePreviewProcessedImage") ? "processed" : "source";
  const { image } = getProcessPreviewElements(kind, "image");
  if (!image || image.hidden || !image.getAttribute("src")) {
    return;
  }

  const previewState = getProcessPreviewState("image");
  const direction = event.deltaY > 0 ? -1 : 1;
  updateProcessPreviewZoom(kind, previewState.zoom[kind] + direction * 10, true, "image");
}

function getProcessPreviewElements(kind, scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const isSource = kind === "source";
  const image = isSource ? controls.previewSourceImage : controls.previewProcessedImage;
  return {
    input: isSource ? controls.previewSourceZoomInput : controls.previewProcessedZoomInput,
    label: isSource ? controls.previewSourceZoomLabel : controls.previewProcessedZoomLabel,
    image,
    stage: image?.closest(".image-preview-stage") || null,
    decreaseButton: isSource ? controls.previewSourceZoomOutButton : controls.previewProcessedZoomOutButton,
    zoomResetButton: isSource ? controls.previewSourceZoomResetButton : controls.previewProcessedZoomResetButton,
    panResetButton: isSource ? controls.previewSourcePanResetButton : controls.previewProcessedPanResetButton,
    increaseButton: isSource ? controls.previewSourceZoomInButton : controls.previewProcessedZoomInButton,
  };
}

function oppositePreviewKind(kind) {
  return kind === "source" ? "processed" : "source";
}

function updateImagePreviewLinkButtons() {
  [els.imagePreviewSourceLinkButton, els.imagePreviewProcessedLinkButton].forEach((button) => {
    if (!button) {
      return;
    }
    button.classList.toggle("active", state.imagePreviewLinked);
    button.setAttribute("aria-pressed", String(state.imagePreviewLinked));
    button.textContent = state.imagePreviewLinked ? "\u5DF2\u8054\u52A8" : "\u8054\u52A8";
  });
}

function imagePreviewBackgroundControlIds(kind) {
  const prefix = kind === "source" ? "imagePreviewSourceBackground" : "imagePreviewProcessedBackground";
  return {
    toggle: `${prefix}ToggleButton`,
    checkerboard: `${prefix}CheckerboardButton`,
    color: `${prefix}ColorButton`,
    colorRow: `${prefix}ColorRow`,
    colorLabel: `${prefix}ColorLabel`,
    colorInput: `${prefix}ColorInput`,
  };
}

function createImagePreviewBackgroundControl(kind) {
  const ids = imagePreviewBackgroundControlIds(kind);
  const control = document.createElement("details");
  control.className = "preview-background-control preview-toolbar-background-control";
  control.innerHTML = `
    <summary id="${ids.toggle}" class="preview-background-toggle" aria-label="\u66f4\u6362\u9884\u89c8\u5e95\u677f" title="\u66f4\u6362\u9884\u89c8\u5e95\u677f">
      <span class="preview-background-indicator checkerboard-swatch" aria-hidden="true"></span>
    </summary>
    <div class="preview-background-popover" role="menu" aria-label="\u9884\u89c8\u5e95\u677f">
      <button id="${ids.checkerboard}" class="preview-background-option" type="button" role="menuitemradio" aria-label="\u900f\u660e\u5e95\u677f" title="\u900f\u660e\u5e95\u677f">
        <span class="preview-background-swatch checkerboard-swatch" aria-hidden="true"></span><span>\u900f\u660e</span>
      </button>
      <button id="${ids.color}" class="preview-background-option" type="button" role="menuitemradio" aria-label="\u7eaf\u8272\u5e95\u677f" title="\u7eaf\u8272\u5e95\u677f">
        <span class="preview-background-swatch solid-swatch" aria-hidden="true"></span><span>\u989c\u8272</span>
      </button>
      <label id="${ids.colorRow}" class="preview-background-color-row">
        <span>\u989c\u8272 <strong id="${ids.colorLabel}">#F6FBF6</strong></span>
        <input id="${ids.colorInput}" type="color" value="#f6fbf6" aria-label="\u9009\u62e9\u9884\u89c8\u5e95\u677f\u989c\u8272">
      </label>
    </div>
  `;
  control.querySelector(`#${ids.checkerboard}`)?.addEventListener("click", () => {
    updateImagePreviewBackground(kind, "checkerboard", getImagePreviewBackground(kind).color, true);
    control.open = false;
  });
  control.querySelector(`#${ids.color}`)?.addEventListener("click", () => {
    updateImagePreviewBackground(kind, "color", getImagePreviewBackground(kind).color, true);
  });
  control.querySelector(`#${ids.colorInput}`)?.addEventListener("input", (event) => {
    updateImagePreviewBackground(kind, "color", event.currentTarget.value, true);
  });
  return control;
}

function getImagePreviewBackground(kind) {
  return state.imagePreviewBackgrounds[kind] || state.imagePreviewBackgrounds.processed;
}

function normalizeImagePreviewBackground(value, fallback = { mode: "checkerboard", color: "#F6FBF6" }) {
  const base = value && typeof value === "object" ? value : {};
  return {
    mode: normalizeProcessPreviewBackgroundMode(base.mode),
    color: normalizeHexColor(base.color, fallback.color),
  };
}

function restoreImagePreviewBackgrounds(snapshot) {
  const source = normalizeImagePreviewBackground(snapshot?.source, state.imagePreviewBackgrounds.source);
  const processed = normalizeImagePreviewBackground(snapshot?.processed, state.imagePreviewBackgrounds.processed);
  state.imagePreviewBackgrounds = { source, processed };
  renderImagePreviewBackground("source");
  renderImagePreviewBackground("processed");
}

function renderImagePreviewBackground(kind) {
  const background = getImagePreviewBackground(kind);
  const ids = imagePreviewBackgroundControlIds(kind);
  const { stage } = getProcessPreviewElements(kind, "image");
  const toggle = document.getElementById(ids.toggle);
  const control = toggle?.closest(".preview-background-control");
  const checkerboardButton = document.getElementById(ids.checkerboard);
  const colorButton = document.getElementById(ids.color);
  const colorRow = document.getElementById(ids.colorRow);
  const colorLabel = document.getElementById(ids.colorLabel);
  const colorInput = document.getElementById(ids.colorInput);
  if (control) control.style.setProperty("--process-preview-bg-color", background.color);
  if (toggle) toggle.classList.toggle("is-color", background.mode === "color");
  if (checkerboardButton) checkerboardButton.setAttribute("aria-checked", String(background.mode === "checkerboard"));
  if (colorButton) colorButton.setAttribute("aria-checked", String(background.mode === "color"));
  if (colorRow) colorRow.classList.toggle("is-visible", background.mode === "color");
  if (colorLabel) colorLabel.textContent = background.color;
  if (colorInput) colorInput.value = background.color;
  if (stage) {
    stage.style.setProperty("--process-preview-bg-color", background.color);
    stage.classList.toggle("checkerboard-stage", background.mode === "checkerboard");
    stage.classList.toggle("solid-preview-stage", background.mode === "color");
  }
}

function updateImagePreviewBackground(kind, mode, color, shouldPersist = false) {
  const background = getImagePreviewBackground(kind);
  background.mode = normalizeProcessPreviewBackgroundMode(mode);
  background.color = normalizeHexColor(color, background.color);
  renderImagePreviewBackground(kind);
  if (state.imagePreviewLinked) {
    const targetKind = oppositePreviewKind(kind);
    state.imagePreviewBackgrounds[targetKind] = { ...background };
    renderImagePreviewBackground(targetKind);
  }
  if (shouldPersist) {
    persistSession();
  }
}

function syncLinkedProcessPreviewView(kind, scope = activeMatteScope()) {
  if (scope !== "image" || !state.imagePreviewLinked) {
    return;
  }
  const previewState = getProcessPreviewState(scope);
  const targetKind = oppositePreviewKind(kind);
  previewState.zoom[targetKind] = previewState.zoom[kind];
  previewState.pan[targetKind] = { ...(previewState.pan[kind] || { x: 0, y: 0 }) };
  const { input, label } = getProcessPreviewElements(targetKind, scope);
  if (input) {
    input.value = String(previewState.zoom[targetKind]);
  }
  if (label) {
    label.textContent = `${previewState.zoom[targetKind]}%`;
  }
  applyProcessPreviewTransform(targetKind, scope);
  state.imagePreviewBackgrounds[targetKind] = { ...getImagePreviewBackground(kind) };
  renderImagePreviewBackground(targetKind);
}

function toggleImagePreviewLink(anchorKind = "source") {
  const nextLinked = !state.imagePreviewLinked;
  state.imagePreviewLinked = nextLinked;
  if (nextLinked) {
    syncLinkedProcessPreviewView(anchorKind, "image");
  }
  updateImagePreviewLinkButtons();
  persistSession();
}

function toggleImageManualRepairMode() {
  state.imageManualRepair.enabled = !state.imageManualRepair.enabled;
  if (!state.imageManualRepair.enabled) {
    cancelImageManualRepairBrush();
  }
  syncImageManualRepairControls();
}

function syncImageManualRepairControls() {
  const modeInput = document.querySelector("input[name='imageManualRepairMode']:checked");
  state.imageManualRepair.mode = modeInput?.value === "remove" ? "remove" : "keep";
  state.imageManualRepair.radius = clamp(Number(els.imageManualRepairRadiusInput?.value || 18), 1, 240);
  state.imageManualRepair.tolerance = clamp(Number(els.imageManualRepairToleranceInput?.value || 28), 0, 120);
  state.imageManualRepair.feather = clamp(Number(els.imageManualRepairFeatherInput?.value || 6), 0, 80);
  state.imageManualRepair.soften = clamp(Number(els.imageManualRepairSoftenInput?.value || 2), 1, 12);

  const enabled = Boolean(state.imageManualRepair.enabled);
  els.imageResultPreviewHost?.classList.toggle("manual-repair-active", enabled);
  els.imageManualRepairPanel?.classList.toggle("is-active", enabled);

  if (els.imageManualRepairToggleButton) {
    els.imageManualRepairToggleButton.textContent = enabled ? "\u53D6\u6D88\u64CD\u4F5C" : "\u5F00\u59CB\u4FEE\u8865";
    els.imageManualRepairToggleButton.setAttribute("aria-pressed", enabled ? "true" : "false");
    els.imageManualRepairToggleButton.classList.toggle("is-active", enabled);
  }

  if (els.imageManualRepairStatus) {
    const modeLabel = state.imageManualRepair.mode === "remove" ? "\u5220\u9664\u6B8B\u7559" : "\u8865\u56DE\u4E3B\u4F53";
    els.imageManualRepairStatus.textContent = enabled
      ? `\u5DF2\u8FDB\u5165${modeLabel}\uFF1A\u5728\u53F3\u4FA7\u7ED3\u679C\u56FE\u4E0A\u62D6\u52A8\u6D82\u62B9\uFF0C\u677E\u624B\u540E\u5E94\u7528\u3002`
      : "\u9ED8\u8BA4\u6D4F\u89C8\u56FE\u7247\uFF1B\u70B9\u51FB\u201C\u5F00\u59CB\u4FEE\u8865\u201D\u540E\u5728\u53F3\u4FA7\u7ED3\u679C\u56FE\u4E0A\u6D82\u62B9\u3002";
  }
}

function imagePointFromClick(event) {
  const image = els.imagePreviewProcessedImage;
  if (!image || image.hidden || !image.naturalWidth || !image.naturalHeight) {
    return null;
  }
  const rect = image.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    return null;
  }
  const x = Math.round(((event.clientX - rect.left) / rect.width) * image.naturalWidth);
  const y = Math.round(((event.clientY - rect.top) / rect.height) * image.naturalHeight);
  return {
    x: clamp(x, 0, image.naturalWidth - 1),
    y: clamp(y, 0, image.naturalHeight - 1),
  };
}

function selectedImageResultEntry() {
  const selectedIndex = ensureSelectedImageIndex();
  const entries = imageResultEntries();
  const selected = entries.find((entry) => Number(entry.index) === Number(selectedIndex));
  if (selected?.result) {
    return selected;
  }
  const currentUrl = els.imagePreviewProcessedImage?.currentSrc || els.imagePreviewProcessedImage?.src || "";
  if (currentUrl) {
    const currentPath = new URL(currentUrl, window.location.href).pathname;
    const byUrl = entries.find((entry) => {
      const resultUrl = entry.result?.url ? new URL(entry.result.url, window.location.href).pathname : "";
      const thumbUrl = entry.result?.thumb_url ? new URL(entry.result.thumb_url, window.location.href).pathname : "";
      return resultUrl === currentPath || thumbUrl === currentPath;
    });
    if (byUrl?.result) {
      return byUrl;
    }
  }
  return entries.find((entry) => entry.result) || selected || null;
}

function jobIdFromImageResult(entry) {
  if (state.imageJob?.job_id) {
    return state.imageJob.job_id;
  }
  const previewJobId = getProcessPreviewState("image").preview?.job_id;
  if (previewJobId) {
    return previewJobId;
  }
  const urls = [entry?.result?.url, entry?.result?.thumb_url, els.imagePreviewProcessedImage?.currentSrc, els.imagePreviewProcessedImage?.src];
  for (const value of urls) {
    if (!value) {
      continue;
    }
    const match = String(value).match(/\/work\/jobs\/([^/]+)\//u);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  return "";
}

function appendImageManualRepairPoint(event) {
  const point = imagePointFromClick(event);
  if (!point) {
    return false;
  }
  const points = state.imageManualRepair.brushPoints;
  const previous = points[points.length - 1];
  if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 2) {
    points.push(point);
  }
  return true;
}

function startImageManualRepairBrush(event) {
  if (!state.imageManualRepair.enabled || (event.button != null && event.button !== 0)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  state.imageManualRepair.brushActive = true;
  state.imageManualRepair.brushPoints = [];
  appendImageManualRepairPoint(event);
  els.imagePreviewProcessedStage?.classList.add("brush-drawing");
  if (typeof els.imagePreviewProcessedStage?.setPointerCapture === "function") {
    els.imagePreviewProcessedStage.setPointerCapture(event.pointerId);
  }
}

function continueImageManualRepairBrush(event) {
  if (!state.imageManualRepair.enabled || !state.imageManualRepair.brushActive) {
    return;
  }
  event.preventDefault();
  appendImageManualRepairPoint(event);
}

function cancelImageManualRepairBrush(event) {
  state.imageManualRepair.brushActive = false;
  state.imageManualRepair.brushPoints = [];
  els.imagePreviewProcessedStage?.classList.remove("brush-drawing");
  if (event?.pointerId != null && typeof els.imagePreviewProcessedStage?.hasPointerCapture === "function" && els.imagePreviewProcessedStage.hasPointerCapture(event.pointerId)) {
    els.imagePreviewProcessedStage.releasePointerCapture(event.pointerId);
  }
}

function finishImageManualRepairBrush(event) {
  if (!state.imageManualRepair.brushActive) {
    return;
  }
  event?.preventDefault?.();
  event?.stopPropagation?.();
  appendImageManualRepairPoint(event);
  const points = [...state.imageManualRepair.brushPoints];
  cancelImageManualRepairBrush(event);
  if (!points.length) {
    setStatus("No processed image is available for repair.", "error");
    return;
  }
  void applyImageManualRepairPoints(points);
}

async function applyImageManualRepairPoints(points) {
  syncImageManualRepairControls();
  const payload = {
    x: points[0].x,
    y: points[0].y,
    points,
    mode: state.imageManualRepair.mode,
    radius: Math.round(state.imageManualRepair.radius),
    tolerance: Math.round(state.imageManualRepair.tolerance),
    feather: Math.round(state.imageManualRepair.feather),
  };
  const modeLabel = payload.mode === "remove" ? "remove residue" : "restore subject";
  const preview = getProcessPreviewState("image").preview;
  const selectedEntry = selectedImageResultEntry();
  const repairJobId = jobIdFromImageResult(selectedEntry);

  try {
    setStatus("Applying " + modeLabel + " brush repair...");
    if (preview?.preview_id) {
      const data = await apiJson("/api/preview-manual-point", {
        method: "POST",
        body: {
          preview_id: preview.preview_id,
          ...payload,
        },
      });
      setProcessPreview(data.preview, "image");
      renderProcessPreview("image");
      const changed = Number(data.preview?.postprocess?.manual_point_repair?.last_operation?.changed_pixels || 0);
      setStatus(modeLabel + " brush repair completed, changed " + changed.toLocaleString() + " pixels.", "success");
      return;
    }

    if (repairJobId && selectedEntry?.result) {
      const data = await apiJson("/api/job-manual-point", {
        method: "POST",
        body: {
          job_id: repairJobId,
          frame_index: Number(selectedEntry.result.index ?? selectedEntry.position ?? 0),
          ...payload,
        },
      });
      state.imageJob = data.job;
      renderImageResult();
      const changed = Number(data.job?.postprocess?.manual_point_repair?.last_operation?.changed_pixels || 0);
      setStatus(modeLabel + " brush repair completed, changed " + changed.toLocaleString() + " pixels.", "success");
      return;
    }

    setStatus("No processed image is available for repair.", "error");
  } catch (error) {
    setStatus(error.message || "Manual repair failed.", "error");
  }
}

async function applyImageEdgeSoften() {
  syncImageManualRepairControls();
  const preview = getProcessPreviewState("image").preview;
  const selectedEntry = selectedImageResultEntry();
  const repairJobId = jobIdFromImageResult(selectedEntry);
  const radius = Math.round(state.imageManualRepair.soften);

  try {
    setStatus("Softening alpha edge...");
    if (preview?.preview_id) {
      const data = await apiJson("/api/preview-soften-alpha", {
        method: "POST",
        body: {
          preview_id: preview.preview_id,
          radius,
          passes: 1,
        },
      });
      setProcessPreview(data.preview, "image");
      renderProcessPreview("image");
      const changed = Number(data.preview?.postprocess?.edge_soften?.last_operation?.changed_pixels || 0);
      setStatus("Edge soften completed, changed " + changed.toLocaleString() + " alpha pixels.", "success");
      return;
    }

    if (repairJobId && selectedEntry?.result) {
      const data = await apiJson("/api/job-soften-alpha", {
        method: "POST",
        body: {
          job_id: repairJobId,
          frame_index: Number(selectedEntry.result.index ?? selectedEntry.position ?? 0),
          radius,
          passes: 1,
        },
      });
      state.imageJob = data.job;
      renderImageResult();
      const changed = Number(data.job?.postprocess?.edge_soften?.last_operation?.changed_pixels || 0);
      setStatus("Edge soften completed, changed " + changed.toLocaleString() + " alpha pixels.", "success");
      return;
    }

    setStatus("No processed image is available for edge soften.", "error");
  } catch (error) {
    setStatus(error.message || "Edge soften failed.", "error");
  }
}

async function applyImageRepairHistory(direction) {
  const action = direction === "redo" ? "redo" : "undo";
  const label = action === "redo" ? "redo" : "undo";
  const preview = getProcessPreviewState("image").preview;
  const selectedEntry = selectedImageResultEntry();
  const repairJobId = jobIdFromImageResult(selectedEntry);
  const busyButton = action === "redo" ? els.imageManualRepairRedoButton : els.imageManualRepairUndoButton;

  await withBusy(busyButton, async () => {
    try {
      setStatus("Applying repair " + label + "...");
      if (preview?.preview_id) {
        const data = await apiJson("/api/preview-repair-history", {
          method: "POST",
          body: {
            preview_id: preview.preview_id,
            direction: action,
          },
        });
        setProcessPreview(data.preview, "image");
        renderProcessPreview("image");
        setStatus("Repair " + label + " completed.", "success");
        return;
      }

      if (repairJobId && selectedEntry?.result) {
        const data = await apiJson("/api/job-repair-history", {
          method: "POST",
          body: {
            job_id: repairJobId,
            frame_index: Number(selectedEntry.result.index ?? selectedEntry.position ?? 0),
            direction: action,
          },
        });
        state.imageJob = data.job;
        renderImageResult();
        setStatus("Repair " + label + " completed.", "success");
        return;
      }

      setStatus("No repair history is available.", "error");
    } catch (error) {
      setStatus(error.message || "Repair " + label + " failed.", "error");
    }
  });
}

async function applyImageManualRepairAtEvent(event) {
  const point = imagePointFromClick(event);
  if (!point) {
    setStatus("No processed image is available for repair.", "error");
    return;
  }

  syncImageManualRepairControls();
  const payload = {
    x: point.x,
    y: point.y,
    mode: state.imageManualRepair.mode,
    radius: Math.round(state.imageManualRepair.radius),
    tolerance: Math.round(state.imageManualRepair.tolerance),
  };
  const modeLabel = payload.mode === "remove" ? "remove residue" : "restore subject";
  const preview = getProcessPreviewState("image").preview;
  const selectedEntry = selectedImageResultEntry();
  const repairJobId = jobIdFromImageResult(selectedEntry);

  try {
    setStatus("Applying " + modeLabel + " point repair...");
    if (preview?.preview_id) {
      const data = await apiJson("/api/preview-manual-point", {
        method: "POST",
        body: {
          preview_id: preview.preview_id,
          ...payload,
        },
      });
      setProcessPreview(data.preview, "image");
      renderProcessPreview("image");
      const changed = Number(data.preview?.postprocess?.manual_point_repair?.last_operation?.changed_pixels || 0);
      setStatus(modeLabel + " point repair completed, changed " + changed.toLocaleString() + " pixels.", "success");
      return;
    }

    if (repairJobId && selectedEntry?.result) {
      const data = await apiJson("/api/job-manual-point", {
        method: "POST",
        body: {
          job_id: repairJobId,
          frame_index: Number(selectedEntry.result.index ?? selectedEntry.position ?? 0),
          ...payload,
        },
      });
      state.imageJob = data.job;
      renderImageResult();
      const changed = Number(data.job?.postprocess?.manual_point_repair?.last_operation?.changed_pixels || 0);
      setStatus(modeLabel + " point repair completed, changed " + changed.toLocaleString() + " pixels.", "success");
      return;
    }

    setStatus("No processed image is available for repair.", "error");
  } catch (error) {
    setStatus(error.message || "Point repair failed.", "error");
  }
}

function updateProcessPreviewZoom(kind, value, shouldPersist = false, scope = activeMatteScope()) {
  const previewState = getProcessPreviewState(scope);
  const normalized = clamp(Math.round(value / 10) * 10, 50, 800);
  previewState.zoom[kind] = normalized;

  const { input, label } = getProcessPreviewElements(kind, scope);

  input.value = String(normalized);
  label.textContent = `${normalized}%`;
  applyProcessPreviewTransform(kind, scope);
  syncLinkedProcessPreviewView(kind, scope);

  if (shouldPersist) {
    persistSession();
  }
}

function updateProcessPreviewPan(kind, x, y, scope = activeMatteScope()) {
  const previewState = getProcessPreviewState(scope);
  previewState.pan[kind] = normalizeProcessPreviewPan(x, y);
  applyProcessPreviewTransform(kind, scope);
  syncLinkedProcessPreviewView(kind, scope);
}

function normalizeProcessPreviewPan(x, y) {
  const panX = Number.isFinite(Number(x)) ? Number(x) : 0;
  const panY = Number.isFinite(Number(y)) ? Number(y) : 0;
  return { x: panX, y: panY };
}

function applyProcessPreviewTransform(kind, scope = activeMatteScope()) {
  const previewState = getProcessPreviewState(scope);
  const { image } = getProcessPreviewElements(kind, scope);
  if (!image) {
    return;
  }
  const pan = previewState.pan[kind] || { x: 0, y: 0 };
  const scale = previewState.zoom[kind] / 100;
  image.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`;
}

function resetProcessPreviewPan(kind, shouldPersist = false, scope = activeMatteScope()) {
  const previewState = getProcessPreviewState(scope);
  previewState.pan[kind] = { x: 0, y: 0 };
  applyProcessPreviewTransform(kind, scope);
  syncLinkedProcessPreviewView(kind, scope);
  if (shouldPersist) {
    persistSession();
  }
}

function resetProcessPreviewZoom(kind, shouldPersist = false, scope = activeMatteScope()) {
  updateProcessPreviewZoom(kind, 100, false, scope);
  if (shouldPersist) {
    persistSession();
  }
}

function resetProcessPreviewView(kind, shouldPersist = false, scope = activeMatteScope()) {
  resetProcessPreviewZoom(kind, false, scope);
  resetProcessPreviewPan(kind, false, scope);
  if (shouldPersist) {
    persistSession();
  }
}

function setProcessPreviewStageActive(kind, isActive, scope = activeMatteScope()) {
  const { stage } = getProcessPreviewElements(kind, scope);
  if (!stage) {
    return;
  }
  stage.classList.toggle("is-pannable", isActive);
  if (!isActive) {
    stage.classList.remove("dragging");
  }
}

function currentMatteMode(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  if (!controls.chromaEnabledInput.checked) {
    return "none";
  }
  return controls.matteModeInput.value || "chroma";
}

function matteModeUsesBiRefNet(mode) {
  return (
    mode === "birefnet" ||
    mode === "birefnet_corridorkey" ||
    mode === "birefnet_corridorkey_key" ||
    mode === "birefnet_luma" ||
    mode === "birefnet_luma_key" ||
    mode === "birefnet_luma_corridorkey" ||
    mode === "subject_protect_chroma"
  );
}

function matteModeUsesCorridorKey(mode) {
  return (
    mode === "corridorkey" ||
    mode === "birefnet_corridorkey" ||
    mode === "birefnet_corridorkey_key" ||
    mode === "birefnet_luma_corridorkey"
  );
}

function matteModeUsesLuma(mode) {
  return mode === "luma" || mode === "birefnet_luma" || mode === "birefnet_luma_key" || mode === "birefnet_luma_corridorkey";
}

function matteModeUsesChromaSeed(mode) {
  return mode === "chroma" || mode === "edge_connected_chroma" || mode === "corridorkey" || mode === "subject_protect_chroma";
}

function currentUsesCorridorKey(scope = activeMatteScope()) {
  return matteModeUsesCorridorKey(currentMatteMode(scope));
}

function normalizeAiResolution(value) {
  const rawText = String(value ?? "").trim().toLowerCase();
  if (!rawText || rawText === AI_RESOLUTION_AUTO) {
    return AI_RESOLUTION_AUTO;
  }
  const numeric = Number(value);
  const raw = Number.isFinite(numeric) ? numeric : AI_RESOLUTION_DEFAULT;
  const clamped = clamp(Math.round(raw), AI_RESOLUTION_MIN, AI_RESOLUTION_MAX);
  const aligned = Math.floor((clamped + AI_RESOLUTION_STEP / 2) / AI_RESOLUTION_STEP) * AI_RESOLUTION_STEP;
  return clamp(aligned, AI_RESOLUTION_MIN, AI_RESOLUTION_MAX);
}

function ensureAiResolutionOption(value) {
  const normalizedValue = String(value);
  if ([...els.aiResolutionInput.options].some((option) => option.value === normalizedValue)) {
    return;
  }
  const option = document.createElement("option");
  option.value = normalizedValue;
  option.textContent = `${normalizedValue} px`;
  els.aiResolutionInput.appendChild(option);
}

function setAiResolutionValue(value) {
  const normalized = normalizeAiResolution(value);
  ensureAiResolutionOption(normalized);
  els.aiResolutionInput.value = String(normalized);
}

function normalizeAiResolutionInput(shouldPersist = true) {
  const normalized = normalizeAiResolution(els.aiResolutionInput.value);
  setAiResolutionValue(normalized);
  if (shouldPersist) {
    persistSession();
  }
}

function enforceAutomaticAiSettings(shouldPersist = false) {
  els.aiModelInput.value = AI_MODEL_AUTO;
  els.aiDeviceInput.value = AI_DEVICE_AUTO;
  setAiResolutionValue(AI_RESOLUTION_AUTO);
  if (shouldPersist) {
    persistSession();
  }
}

function normalizeOutputScalePercent(value) {
  const numeric = Number(value);
  const raw = Number.isFinite(numeric) ? numeric : OUTPUT_SCALE_DEFAULT_PERCENT;
  return clamp(Math.round(raw), OUTPUT_SCALE_MIN_PERCENT, OUTPUT_SCALE_MAX_PERCENT);
}

function currentOutputScale(scope = "video") {
  const controls = getMatteEls(scope);
  return normalizeOutputScalePercent(controls.outputScaleInput.value) / 100;
}

function outputScalePercentFromLegacyTarget(targetSize) {
  const height = Number(currentUploadInfo().height || 0);
  const target = Number(targetSize || 0);
  if (!height || !target) {
    return null;
  }
  return normalizeOutputScalePercent((target / height) * 100);
}

const LUMA_PRESETS = {
  soft: {
    label: "\u6E29\u548C",
    black: 4,
    white: 110,
    gamma: 0.7,
    strength: 1.3,
  },
  balanced: {
    label: "\u4E2D\u7B49",
    black: 0,
    white: 85,
    gamma: 0.55,
    strength: 1.7,
  },
  strong: {
    label: "\u5F3A\u529B",
    black: 0,
    white: 65,
    gamma: 0.45,
    strength: 2,
  },
};

function applyLumaPreset(key, scope = activeMatteScope()) {
  const preset = LUMA_PRESETS[key];
  if (!preset) {
    return;
  }
  const controls = getMatteEls(scope);
  controls.chromaEnabledInput.checked = true;
  controls.matteModeInput.value = "birefnet_luma";
  controls.haloInput.value = "0";
  controls.corridorEnabledInput.checked = false;
  controls.aiResolutionInput.value = AI_RESOLUTION_AUTO;
  controls.lumaBlackInput.value = String(preset.black);
  controls.lumaWhiteInput.value = String(preset.white);
  controls.lumaGammaInput.value = String(preset.gamma);
  controls.lumaStrengthInput.value = String(preset.strength);
  updateChromaVisibility(scope);
  persistSession();
  setStatus(`\u5DF2\u5957\u7528\u4E3B\u4F53\u4FDD\u62A4\u9884\u8BBE\uFF1A${preset.label}\u3002`, "success");
}

function collectFormState() {
  return {
    keep_every: Number(els.keepEveryInput.value || 1),
    output_scale: currentOutputScale("video"),
    canvas_mode: els.canvasModeInput.value,
    reduce_px: Number(els.reducePxInput.value || 0),
    chroma_enabled: els.chromaEnabledInput.checked,
    matte_mode: currentMatteMode("video"),
    key_mode: els.keyModeInput.value,
    manual_key_hex: els.manualKeyInput.value,
    threshold: Number(els.thresholdInput.value || 0),
    softness: Number(els.softnessInput.value === "" ? 1 : els.softnessInput.value),
    despill_strength: Number(els.despillInput.value || 0),
    halo_pixels: Number(els.haloInput.value || 0),
    corridorkey_enabled: currentUsesCorridorKey("video"),
    corridorkey_screen: els.corridorScreenInput.value,
    ai_model: els.aiModelInput.value,
    ai_device: els.aiDeviceInput.value,
    ai_resolution: normalizeAiResolution(els.aiResolutionInput.value),
    ai_resolution_mode: normalizeAiResolution(els.aiResolutionInput.value) === AI_RESOLUTION_AUTO ? "auto" : "manual",
    luma_black: Number(els.lumaBlackInput.value || 24),
    luma_white: Number(els.lumaWhiteInput.value || 230),
    luma_gamma: Number(els.lumaGammaInput.value || 1),
    luma_strength: Number(els.lumaStrengthInput.value || 1),
    batch_green_to_black: els.batchGreenToBlackInput.checked,
    batch_green_desaturate: els.batchGreenDesaturateInput.checked,
    batch_semitransparent_to_black: els.batchSemiTransparentToBlackInput.checked,
    batch_semitransparent_to_opaque: els.batchSemiTransparentToOpaqueInput.checked,
    preview_background: state.preview.background,
    preview_interval: clamp(Number(els.previewIntervalInput.value || 100), 20, 5000),
    preview_reversed: state.preview.isReversed,
    extract_preview_background: state.extractPreview.background,
    extract_preview_interval: clamp(Number(els.extractPreviewIntervalInput.value || 100), 20, 5000),
    extract_preview_reversed: state.extractPreview.isReversed,
    extract_similarity_ignore_near: Boolean(els.extractSimilarityIgnoreNearInput?.checked),
    extract_similarity_threshold: normalizeExtractSimilarityThresholdInput(false),
    process_preview_zoom: {
      source: state.processPreviewZoom.source,
      processed: state.processPreviewZoom.processed,
    },
    process_preview_background: {
      mode: state.processPreviewBackground.mode,
      color: state.processPreviewBackground.color,
    },
    segment: {
      start: Number(state.segment.start || 0),
      end: Number(state.segment.end || 0),
      startFrame: Number(state.segment.startFrame || 1),
      endFrame: Number(state.segment.endFrame || 1),
      confirmed: Boolean(state.segment.confirmed),
    },
  };
}

function collectProcessingPayload(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  return {
    upload_id: state.upload?.upload_id || "",
    start_time: state.segment.start,
    end_time: state.segment.end,
    start_frame: state.segment.startFrame,
    end_frame: state.segment.endFrame,
    keep_every: Number(els.keepEveryInput.value || 1),
    output_scale: currentOutputScale(scope),
    canvas_mode: controls.canvasModeInput.value,
    reduce_px: Number(controls.reducePxInput.value || 0),
    chroma_enabled: controls.chromaEnabledInput.checked,
    matte_mode: currentMatteMode(scope),
    key_mode: controls.keyModeInput.value,
    manual_key_hex: controls.manualKeyInput.value,
    threshold: Number(controls.thresholdInput.value || 0),
    softness: Number(controls.softnessInput.value === "" ? 1 : controls.softnessInput.value),
    despill_strength: Number(controls.despillInput.value || 0),
    halo_pixels: Number(controls.haloInput.value || 0),
    corridorkey_enabled: currentUsesCorridorKey(scope),
    corridorkey_screen: controls.corridorScreenInput.value,
    ai_model: controls.aiModelInput.value,
    ai_device: controls.aiDeviceInput.value,
    ai_resolution: normalizeAiResolution(controls.aiResolutionInput.value),
    luma_black: Number(controls.lumaBlackInput.value || 24),
    luma_white: Number(controls.lumaWhiteInput.value || 230),
    luma_gamma: Number(controls.lumaGammaInput.value || 1),
    luma_strength: Number(controls.lumaStrengthInput.value || 1),
    batch_green_to_black: controls.batchGreenToBlackInput.checked,
    batch_green_desaturate: controls.batchGreenDesaturateInput.checked,
    batch_semitransparent_to_black: controls.batchSemiTransparentToBlackInput.checked,
    batch_semitransparent_to_opaque: controls.batchSemiTransparentToOpaqueInput.checked,
  };
}

function applyFormState(snapshot) {
  if (!snapshot) {
    return;
  }

  if (snapshot.keep_every != null) els.keepEveryInput.value = String(snapshot.keep_every);
  if (snapshot.output_scale != null) {
    els.outputScaleInput.value = String(normalizeOutputScalePercent(Number(snapshot.output_scale) * 100));
  } else if (snapshot.target_size != null) {
    const legacyPercent = outputScalePercentFromLegacyTarget(snapshot.target_size);
    if (legacyPercent != null) {
      els.outputScaleInput.value = String(legacyPercent);
    }
  }
  if (snapshot.canvas_mode && [...els.canvasModeInput.options].some((option) => option.value === snapshot.canvas_mode)) {
    els.canvasModeInput.value = snapshot.canvas_mode;
  }
  if (snapshot.reduce_px != null) els.reducePxInput.value = String(snapshot.reduce_px);
  if (snapshot.chroma_enabled != null) els.chromaEnabledInput.checked = Boolean(snapshot.chroma_enabled);
  if (snapshot.matte_mode && [...els.matteModeInput.options].some((option) => option.value === snapshot.matte_mode)) {
    els.matteModeInput.value = snapshot.matte_mode;
  }
  if (snapshot.corridorkey_enabled && !matteModeUsesCorridorKey(els.matteModeInput.value)) {
    if (els.matteModeInput.value === "birefnet") {
      els.matteModeInput.value = "birefnet_corridorkey";
    } else if (els.matteModeInput.value === "birefnet_luma") {
      els.matteModeInput.value = "birefnet_luma_corridorkey";
    } else if (els.matteModeInput.value === "chroma") {
      els.matteModeInput.value = "corridorkey";
    }
  }
  if (snapshot.key_mode) els.keyModeInput.value = snapshot.key_mode;
  if (snapshot.manual_key_hex) els.manualKeyInput.value = snapshot.manual_key_hex;
  if (snapshot.threshold != null) els.thresholdInput.value = String(snapshot.threshold);
  if (snapshot.softness != null) els.softnessInput.value = String(snapshot.softness);
  if (snapshot.despill_strength != null) els.despillInput.value = String(snapshot.despill_strength);
  if (snapshot.halo_pixels != null) els.haloInput.value = String(snapshot.halo_pixels);
  els.corridorEnabledInput.checked = currentUsesCorridorKey("video");
  if (
    snapshot.corridorkey_screen &&
    [...els.corridorScreenInput.options].some((option) => option.value === snapshot.corridorkey_screen)
  ) {
    els.corridorScreenInput.value = snapshot.corridorkey_screen;
  }
  enforceAutomaticAiSettings(false);
  if (snapshot.luma_black != null) els.lumaBlackInput.value = String(snapshot.luma_black);
  if (snapshot.luma_white != null) els.lumaWhiteInput.value = String(snapshot.luma_white);
  if (snapshot.luma_gamma != null) els.lumaGammaInput.value = String(snapshot.luma_gamma);
  if (snapshot.luma_strength != null) els.lumaStrengthInput.value = String(snapshot.luma_strength);
  if (snapshot.batch_green_to_black != null) els.batchGreenToBlackInput.checked = Boolean(snapshot.batch_green_to_black);
  if (snapshot.batch_green_desaturate != null) {
    els.batchGreenDesaturateInput.checked = Boolean(snapshot.batch_green_desaturate);
  }
  if (snapshot.batch_semitransparent_to_black != null) {
    els.batchSemiTransparentToBlackInput.checked = Boolean(snapshot.batch_semitransparent_to_black);
  }
  if (snapshot.batch_semitransparent_to_opaque != null) {
    els.batchSemiTransparentToOpaqueInput.checked = Boolean(snapshot.batch_semitransparent_to_opaque);
  }
  updatePreviewBackground(snapshot.preview_background || state.preview.background, false);
  if (snapshot.preview_interval != null) els.previewIntervalInput.value = String(snapshot.preview_interval);
  state.preview.isReversed = Boolean(snapshot.preview_reversed);
  if (els.previewReverseInput) {
    els.previewReverseInput.checked = state.preview.isReversed;
  }
  updateExtractPreviewBackground(snapshot.extract_preview_background || state.extractPreview.background, false);
  if (snapshot.extract_preview_interval != null) {
    els.extractPreviewIntervalInput.value = String(snapshot.extract_preview_interval);
  }
  state.extractPreview.isReversed = Boolean(snapshot.extract_preview_reversed);
  if (els.extractPreviewReverseInput) {
    els.extractPreviewReverseInput.checked = state.extractPreview.isReversed;
  }
  if (snapshot.extract_similarity_ignore_near != null && els.extractSimilarityIgnoreNearInput) {
    els.extractSimilarityIgnoreNearInput.checked = Boolean(snapshot.extract_similarity_ignore_near);
  }
  if (snapshot.extract_similarity_threshold != null && els.extractSimilarityThresholdInput) {
    els.extractSimilarityThresholdInput.value = String(snapshot.extract_similarity_threshold);
    normalizeExtractSimilarityThresholdInput();
  }
  if (snapshot.process_preview_zoom) {
    updateProcessPreviewZoom("source", Number(snapshot.process_preview_zoom.source || 100), false, "video");
    updateProcessPreviewZoom("processed", Number(snapshot.process_preview_zoom.processed || 100), false, "video");
  } else {
    updateProcessPreviewZoom("source", 100, false, "video");
    updateProcessPreviewZoom("processed", 100, false, "video");
  }
  if (snapshot.process_preview_background) {
    updateProcessPreviewBackground(
      snapshot.process_preview_background.mode,
      snapshot.process_preview_background.color,
      false,
      "video"
    );
  } else {
    updateProcessPreviewBackground("checkerboard", state.processPreviewBackground.color, false, "video");
  }

  if (snapshot.segment) {
    state.segment.start = Number(snapshot.segment.start || 0);
    state.segment.end = Number(snapshot.segment.end || 0);
    if (snapshot.segment.startFrame != null && snapshot.segment.endFrame != null) {
      state.segment.startFrame = Number(snapshot.segment.startFrame || 1);
      state.segment.endFrame = Number(snapshot.segment.endFrame || 1);
      syncSegmentTimesFromFrames();
    } else {
      syncSegmentFramesFromTimes();
    }
    state.segment.confirmed = Boolean(snapshot.segment.confirmed);
  }

  syncManualColorLabel("video");
  updateChromaVisibility("video");
  normalizePreviewInterval();
  normalizeExtractPreviewInterval();
  renderResourceManager();
}

function persistSession() {
  try {
    const snapshot = {
      activeImagePage: state.activeImagePage,
      activeImageTool: state.activeImageTool,
      imageSplitDetectionStrength: state.imageSplitDetectionStrength,
      imagePreviewLinked: state.imagePreviewLinked,
      imagePreviewBackgrounds: state.imagePreviewBackgrounds,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("persistSession failed", error);
  }
}

function restoreSessionFromStorage() {
  let snapshot = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    snapshot = JSON.parse(raw);
  } catch (error) {
    console.warn("restoreSessionFromStorage failed", error);
    return;
  }

  if (!snapshot) {
    return;
  }
  if (snapshot.activeImagePage) {
    setActiveImagePage(snapshot.activeImagePage, { announce: false, persist: false });
  }
  if (snapshot.activeImageTool) {
    setActiveImageTool(snapshot.activeImageTool, { announce: false });
  }

  setImageSplitDetectionStrength(snapshot.imageSplitDetectionStrength ?? state.imageSplitDetectionStrength);
  state.imagePreviewLinked = Boolean(snapshot.imagePreviewLinked);
  restoreImagePreviewBackgrounds(snapshot.imagePreviewBackgrounds);
  updateImagePreviewLinkButtons();
}

function startHotReloadPolling() {
  if (hotReloadTimerId !== null) {
    window.clearTimeout(hotReloadTimerId);
    hotReloadTimerId = null;
  }

  const poll = async () => {
    try {
      const data = await apiJson(`/api/app-version?ts=${Date.now()}`);
      const nextVersion = String(data.version || "0");
      const pollMs = Number(data.poll_ms || 1200);
      if (hotReloadVersion === null) {
        hotReloadVersion = nextVersion;
      } else if (nextVersion !== hotReloadVersion) {
        hotReloadVersion = nextVersion;
        persistSession();
        setStatus("\u68C0\u6D4B\u5230\u4EE3\u7801\u53D8\u66F4\uFF0C\u6B63\u5728\u81EA\u52A8\u5237\u65B0...", "success");
        window.setTimeout(() => window.location.reload(), 900);
        return;
      }
      hotReloadTimerId = window.setTimeout(poll, pollMs);
    } catch (error) {
      hotReloadTimerId = window.setTimeout(poll, 1200);
    }
  };

  poll();
}

function bindUploadDropzone() {
  els.uploadDropzone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    if (els.uploadInput.disabled) {
      return;
    }
    els.uploadInput.click();
  });

  els.uploadDropzone.addEventListener("dragenter", (event) => {
    if (!dragEventHasFiles(event)) {
      return;
    }
    event.preventDefault();
    uploadDragDepth += 1;
    els.uploadDropzone.classList.add("dragging");
  });

  els.uploadDropzone.addEventListener("dragover", (event) => {
    if (!dragEventHasFiles(event)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    els.uploadDropzone.classList.add("dragging");
  });

  els.uploadDropzone.addEventListener("dragleave", (event) => {
    if (!dragEventHasFiles(event)) {
      return;
    }
    event.preventDefault();
    uploadDragDepth = Math.max(0, uploadDragDepth - 1);
    if (uploadDragDepth === 0) {
      els.uploadDropzone.classList.remove("dragging");
    }
  });

  els.uploadDropzone.addEventListener("drop", async (event) => {
    if (!dragEventHasFiles(event)) {
      return;
    }
    event.preventDefault();
    uploadDragDepth = 0;
    els.uploadDropzone.classList.remove("dragging");
    await uploadSelectedFiles(Array.from(event.dataTransfer?.files || []));
  });
}

function dragEventHasFiles(event) {
  const types = Array.from(event.dataTransfer?.types || []);
  return types.includes("Files");
}

function setUploadDropzoneBusy(isBusy) {
  els.uploadDropzone.classList.toggle("busy", isBusy);
  els.uploadDropzone.setAttribute("aria-busy", isBusy ? "true" : "false");
  els.uploadDropzone.setAttribute("aria-disabled", isBusy ? "true" : "false");
  els.uploadInput.disabled = isBusy;
}

function openImageFilePicker() {
  if (els.imageUploadInput.disabled) {
    return;
  }
  if (typeof els.imageUploadInput.showPicker === "function") {
    try {
      els.imageUploadInput.showPicker();
      return;
    } catch (error) {
      console.warn("image file picker showPicker failed", error);
    }
  }
  els.imageUploadInput.click();
}

function openVideoProcessFilePicker() {
  if (els.videoProcessUploadInput?.disabled) {
    return;
  }
  if (typeof els.videoProcessUploadInput?.showPicker === "function") {
    try {
      els.videoProcessUploadInput.showPicker();
      return;
    } catch (error) {
      console.warn("video process file picker showPicker failed", error);
    }
  }
  els.videoProcessUploadInput?.click();
}

function currentUploadInfo(upload = state.upload) {
  return upload?.media_info || upload?.video_info || {};
}

function uploadMediaType(upload = state.upload) {
  const info = currentUploadInfo(upload);
  return String(upload?.media_type || info.media_type || "video").toLowerCase();
}

function activeProcessingUpload() {
  return state.activeModule === "image" ? state.imageUpload : state.upload;
}

function isImageUpload(upload = state.upload) {
  return uploadMediaType(upload) === "image";
}

function isImageSequenceUpload(upload = state.upload) {
  return uploadMediaType(upload) === "image_sequence";
}

function isVideoUpload(upload = state.upload) {
  return uploadMediaType(upload) === "video";
}

function isSupportedVideoFile(file) {
  if (!file || !file.name) {
    return false;
  }
  const name = String(file.name).toLowerCase();
  return SUPPORTED_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function isSupportedUploadFile(file) {
  if (!file || !file.name) {
    return false;
  }
  const name = String(file.name).toLowerCase();
  return SUPPORTED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function isSupportedImageFile(file) {
  if (!file || !file.name) {
    return false;
  }
  const name = String(file.name).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function formatSourceModeLabel(ffmpegAccel, sourceMediaType = uploadMediaType()) {
  const type = String(sourceMediaType || "video").toLowerCase();
  if (type === "animation") {
    return "\u81EA\u5B9A\u4E49\u52A8\u753B";
  }
  if (type === "image_sequence") {
    return "\u56FE\u7247\u5E8F\u5217";
  }
  if (type === "image") {
    return "\u9759\u6001\u56FE\u7247";
  }
  return `FFmpeg ${formatFfmpegAccelLabel(ffmpegAccel)}`;
}

function formatMatteModeLabel(matte) {
  const mode = typeof matte === "string" ? matte : (matte?.mode || "chroma");
  let label = "\u7EAF\u8272\u62A0\u56FE";
  if (mode === "none") label = "\u4E0D\u62A0\u56FE";
  if (mode === "dual_background") label = "\u53CC\u80CC\u666F\u62A0\u56FE";
  if (mode === "edge_connected_chroma") label = "\u8FB9\u754C\u80CC\u666F\u62A0\u56FE";
  if (mode === "birefnet") label = "BiRefNet";
  if (mode === "corridorkey") label = "CorridorKey";
  if (mode === "luma") label = "Luma";
  if (mode === "birefnet_corridorkey") label = "BiRefNet \u7C97\u8499\u7248 / CorridorKey \u7CBE\u4FEE\u8FB9\u7F18";
  if (mode === "birefnet_corridorkey_key") label = "BiRefNet \u540E\u518D\u7528 CorridorKey \u6536\u7D27\u62A0\u56FE";
  if (mode === "birefnet_luma") label = "BiRefNet \u4FDD\u4E3B\u4F53 / Luma \u8865\u4EAE\u90E8";
  if (mode === "birefnet_luma_key") label = "BiRefNet \u540E\u518D\u7528 Luma \u6536\u7D27\u62A0\u56FE";
  if (mode === "birefnet_luma_corridorkey") label = "BiRefNet + Luma \u5408\u5E76\u540E / CorridorKey \u7CBE\u4FEE";
  if (mode === "subject_protect_chroma") label = "\u4E3B\u4F53\u4FDD\u62A4\u62A0\u56FE";
  if (
    mode !== "none" &&
    !matteModeUsesCorridorKey(mode) &&
    typeof matte !== "string" &&
    matte?.corridorkey_enabled
  ) {
    label = `${label} + CorridorKey`;
  }
  return label;
}

function formatCorridorScreenLabel(value) {
  if (value === "blue") return "\u84DD\u5E55";
  if (value === "green") return "\u7EFF\u5E55";
  return "\u81EA\u52A8";
}

function formatMatteDetail(matte) {
  if (!matte) {
    return "";
  }
  if (matte.mode === "none") {
    return "";
  }
  const parts = [];
  if (matteModeUsesBiRefNet(matte.mode) && matte.model_label) {
    parts.push(matte.model_label);
  }
  if (matteModeUsesLuma(matte.mode) && matte.luma_enabled) {
    parts.push(`Luma ${matte.luma_black}-${matte.luma_white}`);
  }
  if (matte.resolution) {
    parts.push(matteModeUsesBiRefNet(matte.mode) ? `AI ${matte.resolution}px` : `${matte.resolution}px`);
  }
  if (matte.corridorkey_enabled) {
    const screen = formatCorridorScreenLabel(matte.corridorkey_screen_color);
    const device = matte.corridorkey_device ? ` / ${matte.corridorkey_device}` : "";
    parts.push(`CorridorKey ${screen}${device}`);
  }
  return parts.join(" / ");
}

function formatCanvasModeLabel(value) {
  if (value === "custom") return "\u539F\u59CB\u5E27\u5C3A\u5BF8";
  if (value === "square_bottom") return "\u65B9\u5F62 / \u5E95\u90E8";
  if (value === "square_center") return "\u65B9\u5F62 / \u5C45\u4E2D";
  return "\u81EA\u52A8\u5BBD\u5EA6 / \u5C45\u4E2D";
}

function formatOutputScaleLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "-";
  }
  return `${Math.round(numeric * 100)}%`;
}

function formatSizeLabel(width, height) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight) || safeWidth <= 0 || safeHeight <= 0) {
    return "";
  }
  return `${Math.round(safeWidth)} \u00d7 ${Math.round(safeHeight)}`;
}

async function importFromPath() {
  const path = els.pathInput.value.trim();
  if (!path) {
    setStatus("\u5148\u586B\u4E00\u4E2A\u672C\u5730\u89C6\u9891\u6216\u56FE\u7247\u7684\u7EDD\u5BF9\u8DEF\u5F84\u3002", "error");
    return;
  }

  await withBusy(els.importPathButton, async () => {
    setStatus("\u6B63\u5728\u5BFC\u5165\u672C\u5730\u7D20\u6750\u8DEF\u5F84...");
    const data = await apiJson("/api/import-path", {
      method: "POST",
      body: { path },
    });
    applyUpload(data.upload);
    setStatus(`\u5df2\u5bfc\u5165 ${data.upload.display_name}\u3002`, "success");
  });
}

function renderOutputPath(payload) {
  if (!els.outputPathInput || !payload) {
    return;
  }
  els.outputPathInput.value = payload.path || "";
  els.outputPathInput.placeholder = payload.default_path || "F:\\Codex-Program\\sprite-video-lab\\work\\exports";
}

async function loadOutputPath() {
  try {
    const data = await apiJson("/api/output-path");
    renderOutputPath(data.output_path);
  } catch (error) {
    console.warn("loadOutputPath failed", error);
  }
}

async function selectOutputPath() {
  await withBusy(els.saveOutputPathButton, async () => {
    setStatus("\u8BF7\u5728\u5F39\u51FA\u7A97\u53E3\u91CC\u9009\u62E9\u8F93\u51FA\u6587\u4EF6\u5939...");
    const data = await apiJson("/api/select-output-path", { method: "POST" });
    renderOutputPath(data.output_path);
    if (data.cancelled) {
      setStatus("\u5DF2\u53D6\u6D88\u8BBE\u7F6E\u8F93\u51FA\u8DEF\u5F84\u3002");
      return;
    }
    setStatus(`\u8F93\u51FA\u8DEF\u5F84\u5DF2\u8BBE\u7F6E\uFF1A${data.output_path.path}`, "success");
  });
}

async function handleUploadInputChange() {
  await uploadSelectedFiles(Array.from(els.uploadInput.files || []));
  els.uploadInput.value = "";
}

async function uploadSelectedFiles(files) {
  if (!files.length) {
    return;
  }
  if (files.length > 1 && !files.every(isSupportedImageFile)) {
    setStatus("\u591A\u6587\u4EF6\u5BFC\u5165\u53EA\u652F\u6301\u56FE\u7247\u5E8F\u5217\uFF0C\u8BF7\u4E00\u6B21\u9009\u5165\u591A\u5F20 PNG/JPG/WebP/BMP\u3002", "error");
    return;
  }
  if (files.length === 1 && !isSupportedUploadFile(files[0])) {
    setStatus("\u53EA\u652F\u6301\u89C6\u9891\u3001GIF \u52A8\u56FE\u3001\u5355\u5F20\u56FE\u7247\u6216\u591A\u56FE\u5E8F\u5217\uFF1A.mp4 / .mov / .mkv / .webm / .gif / .png / .jpg / .jpeg / .webp / .bmp\u3002", "error");
    return;
  }

  const form = new FormData();
  files.forEach((file) => {
    form.append("video", file, file.webkitRelativePath || file.name);
  });
  const isSequence = files.length > 1;

  setUploadDropzoneBusy(true);
  await withBusy(els.importPathButton, async () => {
    try {
      setStatus(isSequence ? `\u6B63\u5728\u6309\u6587\u4EF6\u540D\u8F7D\u5165 ${files.length} \u5F20\u56FE\u7247...` : `\u6b63\u5728\u8F7D\u5165 ${files[0].name}...`);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "\u4E0A\u4F20\u5931\u8D25");
      }
      applyUpload(data.upload);
      setStatus(
        isSequence
          ? `\u5DF2\u6309\u6587\u4EF6\u540D\u987A\u5E8F\u8F7D\u5165 ${data.upload.media_info?.frame_count || files.length} \u5F20\u56FE\u7247\u3002`
          : `\u5DF2\u8F7D\u5165 ${data.upload.display_name}\u3002`,
        "success"
      );
    } finally {
      setUploadDropzoneBusy(false);
      uploadDragDepth = 0;
      els.uploadDropzone.classList.remove("dragging");
      els.uploadInput.value = "";
    }
  });
}

async function importVideoProcessFromPath() {
  const rawPath = els.videoProcessPathInput?.value?.trim() || "";
  if (!rawPath) {
    setStatus("\u8BF7\u8F93\u5165\u8981\u5BFC\u5165\u7684\u89C6\u9891\u8DEF\u5F84\u3002", "error");
    return;
  }
  await withBusy(els.videoProcessImportPathButton, async () => {
    setStatus("\u6B63\u5728\u5BFC\u5165\u89C6\u9891\u5904\u7406\u7D20\u6750...");
    const data = await apiJson("/api/import-path", {
      method: "POST",
      body: { path: rawPath },
    });
    if (!isVideoUpload(data.upload)) {
      setStatus("\u89C6\u9891\u5904\u7406\u6A21\u5757\u53EA\u652F\u6301\u5BFC\u5165\u89C6\u9891\u6216 GIF\u3002", "error");
      return;
    }
    applyVideoProcessUpload(data.upload, { append: true });
    setActiveVideoProcessTool("preview", { announce: false });
    setStatus(`\u5DF2\u5BFC\u5165 ${data.upload.display_name}\u3002`, "success");
  });
}

async function uploadVideoProcessFiles(files) {
  const videoFiles = sortFilesByDisplayName(files).filter(isSupportedVideoFile);
  if (!videoFiles.length) {
    setStatus("\u8BF7\u5BFC\u5165 MP4 / MOV / MKV / WebM / GIF \u89C6\u9891\u6587\u4EF6\u3002", "error");
    return;
  }
  els.videoProcessDropzone?.classList.add("busy");
  els.videoProcessDropzone?.setAttribute("aria-busy", "true");
  els.videoProcessUploadInput.disabled = true;
  await withBusy(els.videoProcessImportPathButton, async () => {
    try {
      const imported = [];
      for (const file of videoFiles) {
        const form = new FormData();
        form.append("video", file, file.webkitRelativePath || file.name);
        setStatus(`\u6B63\u5728\u5BFC\u5165 ${file.name}...`);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "\u4E0A\u4F20\u5931\u8D25");
        }
        if (isVideoUpload(data.upload)) {
          imported.push(data.upload);
        }
      }
      if (!imported.length) {
        setStatus("\u89C6\u9891\u5904\u7406\u6A21\u5757\u53EA\u652F\u6301\u89C6\u9891\u6216 GIF\u3002", "error");
        return;
      }
      imported.forEach((upload, index) => applyVideoProcessUpload(upload, { append: true, render: index === imported.length - 1 }));
      setActiveVideoProcessTool("preview", { announce: false });
      setStatus(imported.length > 1 ? `\u5DF2\u5BFC\u5165 ${imported.length} \u4E2A\u89C6\u9891\u7D20\u6750\u3002` : `\u5DF2\u5BFC\u5165 ${imported[0].display_name}\u3002`, "success");
    } finally {
      els.videoProcessDropzone?.classList.remove("busy", "dragging");
      els.videoProcessDropzone?.setAttribute("aria-busy", "false");
      els.videoProcessUploadInput.disabled = false;
    }
  });
}

function applyVideoProcessUpload(upload, { append = true, render = true } = {}) {
  if (append) {
    upsertVideoProcessAsset(upload);
  } else {
    state.videoProcess.library = [upload];
  }
  state.videoProcess.upload = upload;
  state.videoProcess.selectedUploadId = upload.upload_id || "";
  state.videoProcess.result = null;
  resetVideoProcessEditSettingsForUpload(upload);
  if (render) {
    renderVideoProcessModule();
  }
  persistSession();
}

async function uploadImageFiles(files) {
  const newImageFiles = sortFilesByDisplayName(files).filter(isSupportedImageFile);
  if (!newImageFiles.length) {
    setStatus("\u8BF7\u5BFC\u5165 PNG / JPG / JPEG / WebP / BMP \u56FE\u7247\u3002", "error");
    return;
  }
  const existingFiles = await ensureImageImportFiles();
  const imageFiles = [...existingFiles, ...newImageFiles];
  state.imageImportFiles = imageFiles;
  await uploadImageFileBatch(imageFiles, {
    statusText: existingFiles.length
      ? `\u6B63\u5728\u8FFD\u52A0 ${newImageFiles.length} \u5F20\u56FE\u7247\uFF0C\u5F53\u524D\u5171 ${imageFiles.length} \u5F20...`
      : (newImageFiles.length > 1 ? "\u6B63\u5728\u5BFC\u5165 " + newImageFiles.length + " \u5F20\u56FE\u7247..." : "\u6B63\u5728\u5BFC\u5165 " + newImageFiles[0].name + "..."),
    successText: existingFiles.length
      ? `\u5DF2\u8FFD\u52A0 ${newImageFiles.length} \u5F20\u56FE\u7247\uFF0C\u5F53\u524D\u5171 ${imageFiles.length} \u5F20\u3002`
      : (newImageFiles.length > 1 ? "\u5DF2\u5BFC\u5165 " + imageFiles.length + " \u5F20\u56FE\u7247\u3002" : "\u5DF2\u5BFC\u5165 " + newImageFiles[0].name + "\u3002"),
  });
}

async function uploadImageFileBatch(imageFiles, { statusText = "", successText = "" } = {}) {
  const form = new FormData();
  imageFiles.forEach((file) => {
    form.append("video", file, file.webkitRelativePath || file.name);
  });

  els.imageDropzone.classList.add("busy");
  els.imageDropzone.setAttribute("aria-busy", "true");
  els.imageDropzone.setAttribute("aria-disabled", "true");
  els.imageUploadInput.disabled = true;
  await withBusy(els.imageImportButton, async () => {
    setStatus(statusText || (imageFiles.length > 1 ? "\u6B63\u5728\u5BFC\u5165 " + imageFiles.length + " \u5F20\u56FE\u7247..." : "\u6B63\u5728\u5BFC\u5165 " + imageFiles[0].name + "..."));
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Image import failed");
      }
      applyImageUpload(data.upload);
      setActiveImageTool("matte", { announce: true });
      setStatus(
        successText || (imageFiles.length > 1
          ? "\u5DF2\u5BFC\u5165 " + (data.upload.media_info?.frame_count || imageFiles.length) + " \u5F20\u56FE\u7247\u3002"
          : "\u5DF2\u5BFC\u5165 " + data.upload.display_name + "\u3002"),
        "success"
      );
    } finally {
      els.imageDropzone.classList.remove("busy", "dragging");
      els.imageDropzone.setAttribute("aria-busy", "false");
      els.imageDropzone.setAttribute("aria-disabled", "false");
      els.imageUploadInput.disabled = false;
    }
  });
}

async function ensureImageImportFiles() {
  if (Array.isArray(state.imageImportFiles) && state.imageImportFiles.length) {
    return state.imageImportFiles;
  }
  const frames = sortedImageSourceFrames();
  if (!frames.length) {
    state.imageImportFiles = [];
    return [];
  }
  try {
    const files = await Promise.all(frames.map(async (frame, index) => {
      const response = await fetch(frame.url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`failed to read image ${frame.name || index + 1}`);
      }
      const blob = await response.blob();
      const extension = clipboardImageExtension(blob.type) || PathExtensionFallback(frame.name);
      const name = imageImportFileName(frame.name || `image_${index + 1}.${extension}`, extension);
      return new File([blob], name, { type: blob.type || `image/${extension}` });
    }));
    state.imageImportFiles = files;
    return files;
  } catch (error) {
    console.warn("restore image import files failed", error);
    return [];
  }
}

function PathExtensionFallback(name) {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "png";
}

function imageImportFileName(name, extension = "png") {
  const clean = String(name || "").replace(/[\\/:*?"<>|]/g, "_").trim();
  if (/\.(png|jpe?g|webp|bmp)$/i.test(clean)) {
    return clean;
  }
  return `${clean || "image"}.${extension || "png"}`;
}

async function removeImageImportFrame(position) {
  const files = [...(await ensureImageImportFiles())];
  if (position < 0 || position >= files.length) {
    return;
  }
  const removed = files.splice(position, 1)[0];
  state.imageImportFiles = files;
  if (!files.length) {
    clearImageWorkflow();
    setStatus(`\u5DF2\u79FB\u9664 ${removed?.name || "\u56FE\u7247"}\u3002`, "success");
    return;
  }
  await uploadImageFileBatch(files, {
    statusText: `\u6B63\u5728\u79FB\u9664\u56FE\u7247\u5E76\u91CD\u5EFA ${files.length} \u5F20\u56FE\u7247\u5E8F\u5217...`,
    successText: `\u5DF2\u79FB\u9664 ${removed?.name || "\u56FE\u7247"}\uFF0C\u5F53\u524D\u5171 ${files.length} \u5F20\u3002`,
  });
}

function isPasteInsideEditable(target) {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function clipboardImageExtension(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("bmp")) return "bmp";
  return "png";
}

function clipboardImageFiles(event) {
  const clipboard = event.clipboardData;
  if (!clipboard) {
    return [];
  }
  const files = [];
  Array.from(clipboard.items || []).forEach((item, index) => {
    if (!String(item.type || "").startsWith("image/")) {
      return;
    }
    const blob = item.getAsFile?.();
    if (!blob) {
      return;
    }
    const extension = clipboardImageExtension(blob.type || item.type);
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    files.push(new File([blob], `clipboard-${stamp}-${index + 1}.${extension}`, { type: blob.type || item.type || `image/${extension}` }));
  });
  if (files.length) {
    return files;
  }
  return Array.from(clipboard.files || []).filter((file) => String(file.type || "").startsWith("image/"));
}

function supportsClipboardImageRead() {
  return Boolean(navigator.clipboard?.read && window.ClipboardItem);
}

async function readClipboardImageFiles() {
  if (!supportsClipboardImageRead()) {
    return [];
  }
  const items = await navigator.clipboard.read();
  const files = [];
  for (const item of items) {
    const imageType = (item.types || []).find((type) => String(type).startsWith("image/"));
    if (!imageType) {
      continue;
    }
    const blob = await item.getType(imageType);
    const extension = clipboardImageExtension(blob.type || imageType);
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    files.push(new File([blob], `clipboard-${stamp}-${files.length + 1}.${extension}`, { type: blob.type || imageType }));
  }
  return files;
}

function syncImagePasteButton() {
  if (!els.imagePasteButton) {
    return;
  }
  const unsupported = !supportsClipboardImageRead();
  const noImage = state.imageClipboardChecked && !state.imageClipboardHasImage;
  els.imagePasteButton.classList.toggle("is-disabled", unsupported || noImage);
  els.imagePasteButton.setAttribute("aria-disabled", String(unsupported || noImage));
  els.imagePasteButton.title = unsupported
    ? "\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u70B9\u51FB\u8BFB\u53D6\u526A\u8D34\u677F\u56FE\u7247\uFF0C\u53EF\u76F4\u63A5 Ctrl+V"
    : noImage
      ? "\u526A\u8D34\u677F\u91CC\u6CA1\u6709\u53EF\u7C98\u8D34\u7684\u56FE\u7247\uFF0C\u590D\u5236\u56FE\u7247\u540E\u518D\u70B9\u51FB"
      : "\u4ECE\u526A\u8D34\u677F\u7C98\u8D34\u56FE\u7247";
}

async function refreshImagePasteButtonAvailability() {
  if (state.activeModule !== "image" || !supportsClipboardImageRead()) {
    syncImagePasteButton();
    return;
  }
  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: "clipboard-read" });
      if (permission.state !== "granted") {
        state.imageClipboardChecked = false;
        state.imageClipboardHasImage = false;
        syncImagePasteButton();
        return;
      }
    }
    const files = await readClipboardImageFiles();
    state.imageClipboardChecked = true;
    state.imageClipboardHasImage = files.length > 0;
  } catch (error) {
    state.imageClipboardChecked = false;
    state.imageClipboardHasImage = false;
  }
  syncImagePasteButton();
}

async function importImageFromClipboardButton() {
  if (state.activeModule !== "image") {
    setActiveModule("image");
  }
  if (!supportsClipboardImageRead()) {
    syncImagePasteButton();
    setStatus("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u70B9\u51FB\u8BFB\u53D6\u526A\u8D34\u677F\u56FE\u7247\uFF0C\u8BF7\u76F4\u63A5 Ctrl+V\u3002", "error");
    return;
  }
  try {
    const files = await readClipboardImageFiles();
    state.imageClipboardChecked = true;
    state.imageClipboardHasImage = files.length > 0;
    syncImagePasteButton();
    if (!files.length) {
      setStatus("\u526A\u8D34\u677F\u91CC\u6CA1\u6709\u53EF\u7C98\u8D34\u7684\u56FE\u7247\u3002", "error");
      return;
    }
    setStatus(files.length > 1 ? `\u6B63\u5728\u4ECE\u526A\u8D34\u677F\u8FFD\u52A0 ${files.length} \u5F20\u56FE\u7247...` : "\u6B63\u5728\u4ECE\u526A\u8D34\u677F\u8FFD\u52A0\u56FE\u7247...");
    await uploadImageFiles(files);
  } catch (error) {
    state.imageClipboardChecked = true;
    state.imageClipboardHasImage = false;
    syncImagePasteButton();
    setStatus("\u8BFB\u53D6\u526A\u8D34\u677F\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u5141\u8BB8\u9875\u9762\u8BBF\u95EE\u526A\u8D34\u677F\u3002", "error");
  }
}

async function handleImagePasteImport(event) {
  if (state.activeModule !== "image" || isPasteInsideEditable(event.target)) {
    return;
  }
  const files = clipboardImageFiles(event);
  if (state.activeImagePage === "dual") {
    if (!files.length) {
      return;
    }
    const file = files.find(isSupportedImageFile);
    if (!file) {
      setStatus("\u526A\u8D34\u677F\u91CC\u6CA1\u6709\u53EF\u7528\u4E8E\u53CC\u80CC\u666F\u62A0\u56FE\u7684\u56FE\u7247\u3002", "error");
      return;
    }
    event.preventDefault();
    setDualBackgroundFileSource(preferredDualBackgroundPasteTarget(), file);
    return;
  }
  if (!files.length) {
    state.imageClipboardChecked = true;
    state.imageClipboardHasImage = false;
    syncImagePasteButton();
    return;
  }
  event.preventDefault();
  state.imageClipboardChecked = true;
  state.imageClipboardHasImage = true;
  syncImagePasteButton();
  els.imageDropzone?.classList.add("dragging");
  try {
    setStatus(files.length > 1 ? `\u6B63\u5728\u4ECE\u526A\u8D34\u677F\u5BFC\u5165 ${files.length} \u5F20\u56FE\u7247...` : "\u6B63\u5728\u4ECE\u526A\u8D34\u677F\u5BFC\u5165\u56FE\u7247...");
    await uploadImageFiles(files);
  } finally {
    els.imageDropzone?.classList.remove("dragging");
  }
}

function applyImageUpload(upload) {
  state.imageUpload = upload;
  state.imageJob = null;
  state.imageSelectedIndex = Number(sortedImageSourceFrames(upload)[0]?.index || 0);
  state.imageSplitSelectedIndex = state.imageSelectedIndex;
  resetImageSplitState();
  resetImageNamingState();
  resetProcessPreview("image");
  renderImageWorkflow();
  persistSession();
}

function clearImageWorkflow() {
  state.imageUpload = null;
  state.imageImportFiles = [];
  state.imageJob = null;
  state.imageSelectedIndex = 0;
  state.imageSplitSelectedIndex = 0;
  resetImageSplitState();
  resetImageNamingState();
  hideProcessProgress("image");
  resetProcessPreview("image");
  renderImageWorkflow();
  persistSession();
  setActiveImageTool("import", { announce: true });
  setStatus("Image workflow cleared.", "success");
}

function imageFrameCount(upload = state.imageUpload) {
  const info = currentUploadInfo(upload);
  return Math.max(1, Number(info.frame_count || (uploadMediaType(upload) === "image_sequence" ? 0 : 1)) || 1);
}

function imageUploadPreviewUrl(upload = state.imageUpload) {
  return upload?.media_url || upload?.video_url || "";
}

function sourceFrameUrl(upload, frame) {
  if (frame?.url) {
    return frame.url;
  }
  if (uploadMediaType(upload) === "image_sequence" && upload?.upload_id && frame?.index != null) {
    return `/media/upload/${encodeURIComponent(upload.upload_id)}/frames/${Number(frame.index)}`;
  }
  return imageUploadPreviewUrl(upload);
}

function imageSourceFrames(upload = state.imageUpload) {
  if (!upload) {
    return [];
  }
  const info = currentUploadInfo(upload);
  const mediaType = uploadMediaType(upload);
  if (mediaType === "image_sequence") {
    if (Array.isArray(upload.source_frames) && upload.source_frames.length) {
      return upload.source_frames.map((frame, position) => ({
        index: Number(frame.index ?? position),
        name: frame.name || frame.raw_name || `image_${position + 1}`,
        width: Number(frame.width || 0),
        height: Number(frame.height || 0),
        url: sourceFrameUrl(upload, frame),
      }));
    }
    const frameCount = imageFrameCount(upload);
    return Array.from({ length: frameCount }, (_, index) => ({
      index,
      name: `image_${index + 1}`,
      width: Number(info.width || 0),
      height: Number(info.height || 0),
      url: sourceFrameUrl(upload, { index }),
    }));
  }
  return [
    {
      index: 0,
      name: upload.display_name || "image",
      width: Number(info.width || 0),
      height: Number(info.height || 0),
      url: imageUploadPreviewUrl(upload),
    },
  ].filter((frame) => frame.url);
}

function imageFrameArea(frame) {
  return Math.max(1, Number(frame?.width || 0) * Number(frame?.height || 0));
}

function sortedImageSourceFrames(upload = state.imageUpload) {
  return imageSourceFrames(upload).sort((a, b) => {
    const areaDelta = imageFrameArea(b) - imageFrameArea(a);
    if (areaDelta !== 0) {
      return areaDelta;
    }
    return Number(a.index || 0) - Number(b.index || 0);
  });
}

function imageTileStyle(frame, rank = 0) {
  const ratio = frame?.width && frame?.height ? frame.width / frame.height : 1;
  const columnSpan = rank < 2 && imageFrameArea(frame) > 160000 ? 2 : 1;
  const baseWidth = columnSpan === 2 ? 288 : 136;
  const estimatedHeight = clamp(Math.round(baseWidth / Math.max(0.35, Math.min(2.4, ratio))), 96, columnSpan === 2 ? 260 : 190);
  const rowSpan = clamp(Math.ceil(estimatedHeight / 8), 12, 34);
  return `--tile-column-span:${columnSpan};--tile-row-span:${rowSpan};--tile-aspect-ratio:${ratio};`;
}

function ensureSelectedImageIndex() {
  const frames = sortedImageSourceFrames();
  if (!frames.length) {
    state.imageSelectedIndex = 0;
    return null;
  }
  const selected = frames.find((frame) => Number(frame.index) === Number(state.imageSelectedIndex));
  if (selected) {
    return selected;
  }
  state.imageSelectedIndex = Number(frames[0].index || 0);
  return frames[0];
}

function setSelectedImageIndex(index, { persist = false } = {}) {
  state.imageSelectedIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  renderImageResult();
  renderImageNaming();
  if (persist) {
    persistSession();
  }
}

function ensureImageSplitSelectedIndex() {
  const entries = imageResultEntries().filter((entry) => entry.result);
  if (!entries.length) {
    state.imageSplitSelectedIndex = 0;
    return null;
  }
  const selected = entries.find((entry) => Number(entry.index) === Number(state.imageSplitSelectedIndex));
  if (selected) {
    return selected;
  }
  state.imageSplitSelectedIndex = Number(entries[0].index || 0);
  return entries[0];
}

function setImageSplitSelectedIndex(index, { persist = false } = {}) {
  state.imageSplitSelectedIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  renderImageSplit();
  renderImageNaming();
  if (persist) {
    persistSession();
  }
}

function imageResultEntries() {
  const sourceFrames = sortedImageSourceFrames();
  const resultFrames = state.imageJob?.frames || [];
  const resultBySourceIndex = new Map(
    resultFrames.map((frame) => [Number(frame.source_index ?? frame.index ?? 0), frame])
  );
  if (sourceFrames.length) {
    return sourceFrames.map((source, position) => ({
      source,
      result: resultBySourceIndex.get(Number(source.index)),
      index: Number(source.index),
      position,
    }));
  }
  return resultFrames
    .map((result, position) => ({
      source: {
        index: Number(result.source_index ?? result.index ?? position),
        name: result.original_name || result.name || `image_${position + 1}`,
        width: Number(result.width || 0),
        height: Number(result.height || 0),
        url: result.source_url || "",
      },
      result,
      index: Number(result.source_index ?? result.index ?? position),
      position,
    }))
    .sort((a, b) => imageFrameArea(b.source) - imageFrameArea(a.source));
}

function renderImageWorkflow() {
  syncImagePasteButton();
  renderImageImportPreview();
  renderImageImportSummary();
  renderImagePreview();
  renderImageMatteSummary();
  renderImageResult();
  renderImageSplit();
  renderImageNaming();
  renderDualBackgroundMatte();
}

function dualBackgroundSource(kind) {
  if (!state.dualBackground?.[kind]) {
    state.dualBackground ||= {};
    state.dualBackground[kind] = { mode: "import", index: "", file: null, url: "", name: "" };
  }
  return state.dualBackground[kind];
}

function normalizeDualBackgroundKind(kind) {
  return kind === "white" ? "white" : "black";
}

function setDualBackgroundPasteTarget(kind) {
  state.dualBackground.activePasteTarget = normalizeDualBackgroundKind(kind);
  renderDualBackgroundPasteTarget();
}

function preferredDualBackgroundPasteTarget() {
  const active = normalizeDualBackgroundKind(state.dualBackground?.activePasteTarget);
  if (!dualBackgroundHasSource("black")) return "black";
  if (!dualBackgroundHasSource("white")) return "white";
  return active;
}

function renderDualBackgroundPasteTarget() {
  document.querySelectorAll("[data-dual-source-card]").forEach((card) => {
    const active = card.dataset.dualSourceCard === normalizeDualBackgroundKind(state.dualBackground?.activePasteTarget);
    card.classList.toggle("is-paste-target", active);
  });
}

function dualBackgroundFrames() {
  return sortedImageSourceFrames().map((frame, rank) => ({
    ...frame,
    rank,
    value: String(frame.index),
  }));
}

function dualBackgroundSourceUrl(source) {
  if (source.file) {
    if (!source.url) {
      source.url = URL.createObjectURL(source.file);
    }
    return source.url;
  }
  const frame = dualBackgroundFrames().find((item) => String(item.index) === String(source.index));
  return frame?.url || "";
}

function dualBackgroundSourceName(source, fallback = "") {
  if (source.file) {
    return source.name || source.file.name || fallback;
  }
  const frame = dualBackgroundFrames().find((item) => String(item.index) === String(source.index));
  return frame?.name || fallback;
}

function setDualBackgroundImportSource(kind, index) {
  kind = normalizeDualBackgroundKind(kind);
  state.dualBackground.activePasteTarget = kind;
  const source = dualBackgroundSource(kind);
  if (source.url && source.file) {
    URL.revokeObjectURL(source.url);
  }
  source.mode = "import";
  source.index = String(index || "");
  source.file = null;
  source.url = "";
  source.name = "";
  renderDualBackgroundMatte();
  persistSession();
}

function setDualBackgroundFileSource(kind, file) {
  kind = normalizeDualBackgroundKind(kind);
  if (!file || !isSupportedImageFile(file)) {
    setStatus("\u8BF7\u9009\u62E9 PNG / JPG / JPEG / WebP / BMP \u56FE\u7247\u3002", "error");
    return;
  }
  state.dualBackground.activePasteTarget = kind;
  const source = dualBackgroundSource(kind);
  if (source.url && source.file) {
    URL.revokeObjectURL(source.url);
  }
  source.mode = "file";
  source.index = "";
  source.file = file;
  source.url = URL.createObjectURL(file);
  source.name = file.name;
  renderDualBackgroundMatte();
  setStatus(`${kind === "black" ? "\u9ED1\u5E95" : "\u767D\u5E95"}\u56FE\u7247\u5DF2\u9009\u62E9\uFF1A${file.name}\u3002`, "success");
}

function clearDualBackgroundSource(kind) {
  kind = normalizeDualBackgroundKind(kind);
  state.dualBackground.activePasteTarget = kind;
  const source = dualBackgroundSource(kind);
  if (source.url && source.file) {
    URL.revokeObjectURL(source.url);
  }
  state.dualBackground[kind] = { mode: "import", index: "", file: null, url: "", name: "" };
  renderDualBackgroundMatte();
  persistSession();
}

function dualBackgroundHasSource(kind) {
  const source = dualBackgroundSource(kind);
  return Boolean(source.file || source.index !== "");
}

function renderDualBackgroundSelect(select, kind) {
  if (!select) {
    return;
  }
  const source = dualBackgroundSource(kind);
  const frames = dualBackgroundFrames();
  const hasImportSource = frames.some((frame) => String(frame.index) === String(source.index));
  if (source.mode === "import" && source.index !== "" && !hasImportSource) {
    source.index = "";
  }
  select.innerHTML = [
    `<option value="">${frames.length ? "\u4E0D\u4F7F\u7528\u5DF2\u5BFC\u5165\u56FE\u7247" : "\u6682\u65E0\u5DF2\u5BFC\u5165\u56FE\u7247"}</option>`,
    ...frames.map((frame, index) => {
      const label = `${index + 1}. ${frame.name || "\u56FE\u7247"}${frame.width && frame.height ? ` / ${frame.width} x ${frame.height}` : ""}`;
      return `<option value="${escapeHtml(frame.value)}">${escapeHtml(label)}</option>`;
    }),
  ].join("");
  select.value = source.mode === "import" ? String(source.index || "") : "";
}

function renderDualBackgroundPreview(container, kind) {
  if (!container) {
    return;
  }
  const source = dualBackgroundSource(kind);
  const url = dualBackgroundSourceUrl(source);
  const name = dualBackgroundSourceName(source, kind === "black" ? "\u9ED1\u5E95\u56FE\u7247" : "\u767D\u5E95\u56FE\u7247");
  if (!url) {
    container.innerHTML = `<span class="empty-state">${kind === "black" ? "\u672A\u9009\u62E9\u9ED1\u5E95\u56FE\u7247" : "\u672A\u9009\u62E9\u767D\u5E95\u56FE\u7247"}</span>`;
    return;
  }
  container.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" data-image-lightbox="${escapeHtml(url)}" data-caption="${escapeHtml(name)}">`;
}

function renderDualBackgroundMatte() {
  if (!els.dualBlackImportSelect || !els.dualWhiteImportSelect) {
    return;
  }
  renderDualBackgroundSelect(els.dualBlackImportSelect, "black");
  renderDualBackgroundSelect(els.dualWhiteImportSelect, "white");
  renderDualBackgroundPreview(els.dualBlackPreview, "black");
  renderDualBackgroundPreview(els.dualWhitePreview, "white");
  const hasBlack = dualBackgroundHasSource("black");
  const hasWhite = dualBackgroundHasSource("white");
  if (els.dualMatteRunButton) {
    els.dualMatteRunButton.disabled = !(hasBlack && hasWhite);
  }
  if (els.dualMatteSummary) {
    els.dualMatteSummary.innerHTML = [
      summaryCard("\u9ED1\u5E95", hasBlack ? escapeHtml(dualBackgroundSourceName(dualBackgroundSource("black"), "\u5DF2\u9009\u62E9")) : "\u672A\u9009"),
      summaryCard("\u767D\u5E95", hasWhite ? escapeHtml(dualBackgroundSourceName(dualBackgroundSource("white"), "\u5DF2\u9009\u62E9")) : "\u672A\u9009"),
      summaryCard("\u72B6\u6001", state.imageJob?.options?.matte_mode === "dual_background" ? "\u5DF2\u751F\u6210" : "\u7B49\u5F85\u751F\u6210"),
    ].join("");
  }
  renderDualBackgroundPasteTarget();
  renderDualBackgroundResult();
}

async function pasteDualBackgroundSource(kind = preferredDualBackgroundPasteTarget()) {
  const target = normalizeDualBackgroundKind(kind);
  setDualBackgroundPasteTarget(target);
  if (!supportsClipboardImageRead()) {
    setStatus("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u6309\u94AE\u8BFB\u53D6\u526A\u8D34\u677F\uFF0C\u8BF7\u590D\u5236\u56FE\u7247\u540E\u76F4\u63A5 Ctrl+V\u3002", "error");
    return;
  }
  try {
    const files = await readClipboardImageFiles();
    const file = files.find(isSupportedImageFile);
    if (!file) {
      setStatus("\u526A\u8D34\u677F\u91CC\u6CA1\u6709\u53EF\u7C98\u8D34\u7684\u56FE\u7247\u3002", "error");
      return;
    }
    setDualBackgroundFileSource(target, file);
  } catch (error) {
    setStatus("\u8BFB\u53D6\u526A\u8D34\u677F\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u5141\u8BB8\u9875\u9762\u8BBF\u95EE\u526A\u8D34\u677F\u3002", "error");
  }
}

function renderDualBackgroundResult() {
  const frame = state.imageJob?.options?.matte_mode === "dual_background" ? state.imageJob?.frames?.[0] : null;
  const url = frame?.url || frame?.thumb_url || "";
  if (els.dualResultPreview) {
    els.dualResultPreview.innerHTML = url
      ? `<img src="${escapeHtml(url)}" alt="\u53CC\u80CC\u666F\u62A0\u56FE\u7ED3\u679C" data-image-lightbox="${escapeHtml(url)}" data-caption="\u53CC\u80CC\u666F\u62A0\u56FE\u7ED3\u679C">`
      : `<span class="empty-state">\u751F\u6210\u7ED3\u679C\u540E\u5728\u8FD9\u91CC\u9884\u89C8\u900F\u660E PNG</span>`;
  }
  if (els.dualResultSummary) {
    els.dualResultSummary.innerHTML = [
      summaryCard("\u7ED3\u679C", url ? "\u53EF\u7528" : "\u672A\u751F\u6210"),
      summaryCard("\u5C3A\u5BF8", frame?.width && frame?.height ? `${frame.width} x ${frame.height}` : "-"),
      summaryCard("\u8F93\u51FA", url ? "\u900F\u660E PNG" : "\u7B49\u5F85\u62A0\u56FE"),
    ].join("");
  }
  [els.dualExportButton, els.dualExportResourceButton, els.dualGoSplitButton].forEach((button) => {
    if (button) {
      button.disabled = !url;
    }
  });
}

function scrollDualBackgroundResult() {
  const target = els.dualMatteResultPanel || document.getElementById("dualMatteResultPanel");
  if (target) {
    scrollWorkbenchTargetIntoView(target, "smooth");
  }
  document.querySelectorAll("[data-image-dual-target]").forEach((button) => {
    const active = button.dataset.imageDualTarget === "dualMatteResultPanel";
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

async function runDualBackgroundMatte() {
  if (!dualBackgroundHasSource("black") || !dualBackgroundHasSource("white")) {
    setStatus("\u8BF7\u5148\u9009\u62E9\u9ED1\u5E95\u548C\u767D\u5E95\u56FE\u7247\u3002", "error");
    return;
  }
  const form = new FormData();
  form.append("upload_id", state.imageUpload?.upload_id || "");
  ["black", "white"].forEach((kind) => {
    const source = dualBackgroundSource(kind);
    form.append(`${kind}_mode`, source.file ? "file" : "import");
    if (source.file) {
      form.append(`${kind}_file`, source.file, source.file.name);
    } else {
      form.append(`${kind}_index`, String(source.index || ""));
    }
  });
  form.append("bias", String(Number(els.dualMatteBiasInput?.value || 0) || 0));
  form.append("feather", String(Number(els.dualMatteFeatherInput?.value || 0) || 0));
  form.append("trim", els.dualMatteTrimInput?.checked ? "1" : "0");

  await withBusy(els.dualMatteRunButton, async () => {
    setStatus("\u6B63\u5728\u53CD\u89E3\u53CC\u80CC\u666F\u900F\u660E\u901A\u9053...");
    const data = await apiJson("/api/dual-background-matte", {
      method: "POST",
      body: form,
    });
    state.imageJob = data.job;
    state.imageSelectedIndex = 0;
    state.imageSplitSelectedIndex = 0;
    resetImageSplitState();
    resetImageNamingState();
    renderImageWorkflow();
    scrollDualBackgroundResult();
    persistSession();
    setStatus("\u53CC\u80CC\u666F\u62A0\u56FE\u5B8C\u6210\uFF0C\u5DF2\u751F\u6210\u900F\u660E PNG\u3002", "success");
  });
}

async function syncDualResultAsImageUpload() {
  const frame = state.imageJob?.frames?.[0];
  if (!state.imageJob?.job_id || !frame) {
    throw new Error("\u8BF7\u5148\u751F\u6210\u53CC\u80CC\u666F\u62A0\u56FE\u7ED3\u679C\u3002");
  }
  const alreadySynced = state.imageUpload?.source_job_id === state.imageJob.job_id
    || state.imageUpload?.display_name === (frame.original_name || frame.name);
  if (alreadySynced && imageUploadPreviewUrl(state.imageUpload)) {
    return state.imageUpload;
  }
  const data = await apiJson("/api/register-job-frame-upload", {
    method: "POST",
    body: {
      job_id: state.imageJob.job_id,
      frame_index: Number(frame.index || 0),
    },
  });
  state.imageUpload = data.upload;
  state.imageImportFiles = [];
  state.imageSelectedIndex = 0;
  state.imageSplitSelectedIndex = 0;
  resetProcessPreview("image");
  return data.upload;
}

async function goDualResultToSplit() {
  if (!state.imageJob?.frames?.length) {
    setStatus("\u8BF7\u5148\u751F\u6210\u53CC\u80CC\u666F\u62A0\u56FE\u7ED3\u679C\u3002", "error");
    return;
  }
  await withBusy(els.dualGoSplitButton, async () => {
    setStatus("\u6B63\u5728\u628A\u53CC\u80CC\u666F\u7ED3\u679C\u540C\u6B65\u5230\u5168\u6D41\u7A0B\u5BFC\u5165\u533A...");
    await syncDualResultAsImageUpload();
    renderImageWorkflow();
    setActiveImagePage("full", { announce: false });
    renderImageSplit();
    setActiveImageTool("split", { announce: true });
    persistSession();
    setStatus("\u5DF2\u5C06\u53CC\u80CC\u666F\u7ED3\u679C\u540C\u6B65\u5230\u5BFC\u5165\u533A\uFF0C\u53EF\u76F4\u63A5\u62C6\u56FE\u3002", "success");
  });
}

function renderImageImportPreview() {
  const frames = sortedImageSourceFrames();
  if (!frames.length) {
    els.imageDropzone.classList.remove("has-preview");
    els.imageImportGallery.hidden = true;
    els.imageImportGallery.innerHTML = "";
    return;
  }

  els.imageImportGallery.classList.toggle("single-image", frames.length === 1);
  els.imageImportGallery.innerHTML = frames
    .map((frame, rank) => {
      const label = frame.width && frame.height ? `${frame.width} x ${frame.height}` : "image";
      return `
        <div class="image-gallery-tile ${frames.length === 1 ? "single-image" : ""}" style="${imageTileStyle(frame, rank)}">
          <button class="image-gallery-preview-button" type="button" data-image-lightbox="${escapeHtml(frame.url)}" data-caption="${escapeHtml(frame.name)}" title="查看大图">
            <img src="${escapeHtml(frame.url)}" alt="${escapeHtml(frame.name)}">
            <span>${escapeHtml(label)}</span>
          </button>
          <button class="image-gallery-remove-button" type="button" data-remove-image-frame="${rank}" title="移除这张图片" aria-label="移除 ${escapeHtml(frame.name)}">×</button>
        </div>
      `;
    })
    .join("");
  els.imageImportGallery.hidden = false;
  els.imageDropzone.classList.add("has-preview");
}

function renderImageImportSummary() {
  const upload = state.imageUpload;
  if (!upload) {
    els.imageImportSummary.innerHTML = [
      summaryCard("\u5F53\u524D\u56FE\u7247", "\u672A\u5BFC\u5165"),
      summaryCard("\u5904\u7406\u72B6\u6001", "\u5148\u5BFC\u5165\u56FE\u7247"),
    ].join("");
    els.imageClearButton.disabled = true;
    return;
  }

  const info = currentUploadInfo(upload);
  const mediaType = uploadMediaType(upload);
  els.imageImportSummary.innerHTML = [
    summaryCard("\u5F53\u524D\u56FE\u7247", escapeHtml(upload.display_name || "\u672A\u547D\u540D\u56FE\u7247")),
    summaryCard("\u5C3A\u5BF8", info.width && info.height ? `${info.width} x ${info.height}` : "-"),
    summaryCard("\u6570\u91CF", mediaType === "image_sequence" ? String(imageFrameCount(upload)) + " \u5F20" : "\u5355\u5F20\u56FE\u7247"),
  ].join("");
  els.imageClearButton.disabled = false;
}

function renderImagePreview() {
  const upload = state.imageUpload;
  const selectedFrame = ensureSelectedImageIndex();
  const mediaUrl = selectedFrame?.url || imageUploadPreviewUrl(upload);
  if (!upload || !mediaUrl) {
    els.imagePreviewImage.hidden = true;
    els.imagePreviewImage.removeAttribute("src");
    delete els.imagePreviewImage.dataset.imageLightbox;
    delete els.imagePreviewImage.dataset.caption;
    els.imagePreviewEmpty.hidden = false;
    els.imagePreviewNote.textContent = "\u5148\u5BFC\u5165\u56FE\u7247\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u5F53\u524D\u5F85\u5904\u7406\u7D20\u6750\u3002";
    els.imagePreviewSummary.innerHTML = [
      summaryCard("\u9884\u89C8", "\u7B49\u5F85\u5BFC\u5165"),
      summaryCard("\u4E0B\u4E00\u6B65", "\u5BFC\u5165\u540E\u8FDB\u884C\u62A0\u56FE"),
    ].join("");
    return;
  }

  const info = currentUploadInfo(upload);
  const mediaType = uploadMediaType(upload);
  els.imagePreviewImage.src = mediaUrl;
  els.imagePreviewImage.dataset.imageLightbox = mediaUrl;
  els.imagePreviewImage.dataset.caption = selectedFrame?.name || upload.display_name || "image";
  els.imagePreviewImage.hidden = false;
  els.imagePreviewEmpty.hidden = true;
  els.imagePreviewNote.textContent = mediaType === "image_sequence" ? "\u6B63\u5728\u663E\u793A\u56FE\u7247\u5E8F\u5217\u7684\u7B2C\u4E00\u5F20\u3002" : "\u6B63\u5728\u663E\u793A\u5DF2\u5BFC\u5165\u56FE\u7247\u9884\u89C8\u3002";
  els.imagePreviewSummary.innerHTML = [
    summaryCard("\u7D20\u6750", escapeHtml(upload.display_name || "\u56FE\u7247")),
    summaryCard("\u5C3A\u5BF8", info.width && info.height ? `${info.width} x ${info.height}` : "-"),
    summaryCard("\u7C7B\u578B", mediaType === "image_sequence" ? "\u56FE\u7247\u5E8F\u5217" : "\u5355\u5F20\u56FE\u7247"),
    summaryCard("\u6570\u91CF", String(imageFrameCount(upload)) + " \u5F20"),
  ].join("");
}

function renderImageMatteSummary() {
  syncResultActions();
}

function syncImageResultPreviewFromJob() {
  const job = state.imageJob;
  const upload = state.imageUpload;
  const selectedSource = ensureSelectedImageIndex();
  const selectedEntry = imageResultEntries().find((entry) => Number(entry.index) === Number(state.imageSelectedIndex));
  const sourceUrl = selectedEntry?.source?.url || selectedSource?.url || imageUploadPreviewUrl(upload);
  const processedFrame = selectedEntry?.result;
  const processedUrl = processedFrame?.url || processedFrame?.thumb_url || "";
  if (!upload || !sourceUrl) {
    resetProcessPreview("image");
    return;
  }

  const options = job?.options || {};
  setProcessPreview(
    {
      job_id: job?.job_id || "",
      upload_id: upload.upload_id,
      source_url: sourceUrl,
      processed_url: processedUrl,
      source_media_type: job?.source_media_type || uploadMediaType(upload),
      sample_time: 0,
      sample_frame: Number(selectedEntry?.position ?? selectedSource?.index ?? 0) + 1,
      source_name: selectedEntry?.source?.name || selectedSource?.name || upload.display_name || "",
      processed_name: processedFrame?.original_name || processedFrame?.name || "",
      ffmpeg_accel: job?.ffmpeg_accel || {},
      options,
      key_color: options.key_color || "",
      matte: {
        mode: options.matte_mode || currentMatteMode("image"),
        corridorkey_enabled: Boolean(options.corridorkey_enabled),
        corridorkey_screen_color: options.corridorkey_screen,
        luma_enabled: matteModeUsesLuma(options.matte_mode),
        luma_black: options.luma_black,
        luma_white: options.luma_white,
      },
    },
    "image"
  );
  renderProcessPreview("image");
}

function renderImageResult() {
  const job = state.imageJob;
  const entries = imageResultEntries();
  ensureSelectedImageIndex();
  syncImageResultPreviewFromJob();
  if (els.imageExportResultButton) {
    els.imageExportResultButton.disabled = !job?.processed_dir;
  }
  if (els.imageExportToResourceButton) {
    els.imageExportToResourceButton.disabled = !entries.some((entry) => entry.result?.url || entry.result?.thumb_url);
  }
  if (els.imageStartSplitButton) {
    els.imageStartSplitButton.disabled = !job?.frames?.length;
  }
  els.imageResultCount.textContent = String(job?.frame_count || 0) + " \u5F20";
  if (!entries.length || !job?.frames?.length) {
    els.imageResultGrid.innerHTML = `<div class="empty-state">\u62A0\u56FE\u5B8C\u6210\u540E\uFF0C\u7ED3\u679C\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002</div>`;
    return;
  }

  els.imageResultGrid.innerHTML = entries
    .filter((entry) => entry.result)
    .map((entry, rank) => {
      const frame = entry.result;
      const frameNumber = String(rank + 1).padStart(3, "0");
      const isSelected = Number(entry.index) === Number(state.imageSelectedIndex);
      const imageUrl = frame.thumb_url || frame.url;
      return `
        <button class="frame-card image-result-tab ${isSelected ? "selected" : ""}" type="button" data-image-result-index="${Number(entry.index)}">
          <img src="${escapeHtml(imageUrl)}" alt="image result ${frameNumber}">
          <div class="frame-meta">
            <span>#${frameNumber}</span>
            <span>${escapeHtml(entry.source.name || frame.original_name || frame.name)}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function resetImageSplitState() {
  state.imageSplit = {
    byFrame: {},
    skipped: false,
    confirmed: false,
    selectedId: null,
    selectedIds: [],
    drag: null,
    view: defaultImageSplitView(),
  };
}

function normalizeImageSplitDetectionStrength(value) {
  return clamp(Math.round(Number(value || 3)), 1, 5);
}

function imageSplitDetectionStrengthLabel(value = state.imageSplitDetectionStrength) {
  return {
    1: "\u6574\u4F53",
    2: "\u504F\u6574\u4F53",
    3: "\u4E2D\u7B49",
    4: "\u504F\u7EC6",
    5: "\u7EC6\u81F4",
  }[normalizeImageSplitDetectionStrength(value)];
}

function setImageSplitDetectionStrength(value, { persist = false } = {}) {
  state.imageSplitDetectionStrength = normalizeImageSplitDetectionStrength(value);
  if (els.imageSplitStrengthInput) {
    els.imageSplitStrengthInput.value = String(state.imageSplitDetectionStrength);
  }
  if (els.imageSplitStrengthLabel) {
    els.imageSplitStrengthLabel.textContent = imageSplitDetectionStrengthLabel();
  }
  if (persist) {
    persistSession();
  }
}

function defaultImageSplitView() {
  return {
    zoom: 100,
    pan: { x: 0, y: 0 },
    backgroundMode: "transparent",
    background: "#fffef9",
  };
}

function normalizeImageSplitView(view = {}) {
  const fallback = defaultImageSplitView();
  const zoom = clamp(Math.round(Number(view.zoom || fallback.zoom)), 25, 400);
  const pan = view.pan || {};
  const backgroundMode = view.backgroundMode === "solid" || view.backgroundMode === "color" ? "solid" : "transparent";
  return {
    zoom,
    pan: {
      x: Number.isFinite(Number(pan.x)) ? Number(pan.x) : 0,
      y: Number.isFinite(Number(pan.y)) ? Number(pan.y) : 0,
    },
    backgroundMode,
    background: normalizeImageSplitBackgroundColor(view.background || fallback.background),
  };
}

function normalizeImageSplitBackgroundColor(value) {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : "#fffef9";
}

function imageSplitView() {
  state.imageSplit.view = normalizeImageSplitView(state.imageSplit.view);
  return state.imageSplit.view;
}

function imageSplitToolbarHeight() {
  return Math.max(0, els.imageSplitStage?.querySelector(".image-split-stage-actions")?.getBoundingClientRect().height || 0);
}

function clampImageSplitPan(pan = imageSplitView().pan, zoomPercent = imageSplitView().zoom) {
  const image = els.imageSplitImage;
  const stage = els.imageSplitStage;
  const zoom = clamp(Number(zoomPercent || 100), 25, 400) / 100;
  if (!image || !stage || image.hidden || zoom <= 1) {
    return { x: 0, y: 0 };
  }
  const stageRect = stage.getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();
  const renderedZoom = Math.max(
    0.25,
    Number.parseFloat(getComputedStyle(stage).getPropertyValue("--image-split-zoom")) || Number(imageSplitView().zoom || 100) / 100
  );
  const baseWidth = imageRect.width / renderedZoom;
  const baseHeight = imageRect.height / renderedZoom;
  const toolbarHeight = imageSplitToolbarHeight();
  const availableWidth = Math.max(1, stageRect.width - 32);
  const availableHeight = Math.max(1, stageRect.height - toolbarHeight - 32);
  const maxX = Math.max(0, (baseWidth * zoom - availableWidth) / 2 + 48);
  const maxY = Math.max(0, (baseHeight * zoom - availableHeight) / 2 + 48);
  return {
    x: clamp(Number(pan.x || 0), -maxX, maxX),
    y: clamp(Number(pan.y || 0), -maxY, maxY),
  };
}

function applyImageSplitView({ renderOverlay = true, persist = false } = {}) {
  const view = imageSplitView();
  view.pan = clampImageSplitPan(view.pan, view.zoom);
  const zoom = view.zoom / 100;
  if (els.imageSplitStage) {
    els.imageSplitStage.style.setProperty("--image-split-zoom", String(zoom));
    els.imageSplitStage.style.setProperty("--image-split-pan-x", `${view.pan.x}px`);
    els.imageSplitStage.style.setProperty("--image-split-pan-y", `${view.pan.y}px`);
    els.imageSplitStage.style.setProperty("--image-split-bg", view.background);
    els.imageSplitStage.classList.toggle("is-pannable", view.zoom > 100);
    els.imageSplitStage.classList.toggle("is-transparent-bg", view.backgroundMode === "transparent");
    els.imageSplitStage.classList.toggle("is-solid-bg", view.backgroundMode === "solid");
  }
  if (els.imageSplitZoomInput) {
    els.imageSplitZoomInput.value = String(view.zoom);
  }
  if (els.imageSplitZoomLabel) {
    els.imageSplitZoomLabel.textContent = `${view.zoom}%`;
  }
  if (els.imageSplitBackgroundInput) {
    els.imageSplitBackgroundInput.value = view.background;
    els.imageSplitBackgroundInput.disabled = view.backgroundMode !== "solid";
  }
  if (els.imageSplitBackgroundColorField) {
    els.imageSplitBackgroundColorField.classList.toggle("is-disabled", view.backgroundMode !== "solid");
  }
  if (els.imageSplitTransparentBgButton) {
    els.imageSplitTransparentBgButton.setAttribute("aria-pressed", String(view.backgroundMode === "transparent"));
  }
  if (els.imageSplitSolidBgButton) {
    els.imageSplitSolidBgButton.setAttribute("aria-pressed", String(view.backgroundMode === "solid"));
  }
  if (renderOverlay) {
    window.requestAnimationFrame(renderImageSplitOverlay);
  }
  if (persist) {
    persistSession();
  }
}

function setImageSplitZoom(value, { anchor = null, persist = false } = {}) {
  const view = imageSplitView();
  const previousZoom = view.zoom;
  const nextZoom = clamp(Math.round(Number(value || 100)), 25, 400);
  if (anchor && previousZoom > 0 && nextZoom !== previousZoom) {
    const ratio = nextZoom / previousZoom;
    view.pan = {
      x: anchor.x - (anchor.x - view.pan.x) * ratio,
      y: anchor.y - (anchor.y - view.pan.y) * ratio,
    };
  }
  view.zoom = nextZoom;
  if (view.zoom <= 100) {
    view.pan = { x: 0, y: 0 };
  }
  applyImageSplitView({ persist });
}

function fitImageSplitView() {
  const view = imageSplitView();
  view.zoom = 100;
  view.pan = { x: 0, y: 0 };
  applyImageSplitView({ persist: true });
}

function centerImageSplitView() {
  const view = imageSplitView();
  view.pan = { x: 0, y: 0 };
  applyImageSplitView({ persist: true });
}

function setImageSplitBackground(value, { persist = false } = {}) {
  imageSplitView().background = normalizeImageSplitBackgroundColor(value);
  applyImageSplitView({ renderOverlay: false, persist });
}

function setImageSplitBackgroundMode(mode, { persist = false } = {}) {
  imageSplitView().backgroundMode = mode === "solid" || mode === "color" ? "solid" : "transparent";
  applyImageSplitView({ renderOverlay: false, persist });
}

function imageSplitStageAnchor(event) {
  const rect = els.imageSplitStage?.getBoundingClientRect();
  if (!rect) {
    return null;
  }
  return {
    x: event.clientX - rect.left - rect.width / 2,
    y: event.clientY - rect.top - rect.height / 2,
  };
}

function handleImageSplitWheel(event) {
  if (!event.ctrlKey || event.target?.closest?.(".image-split-stage-actions") || !currentImageSplitEntry()?.result) {
    return;
  }
  event.preventDefault();
  const view = imageSplitView();
  const direction = event.deltaY > 0 ? -1 : 1;
  const factor = direction > 0 ? 1.08 : 0.92;
  setImageSplitZoom(view.zoom * factor, {
    anchor: imageSplitStageAnchor(event),
    persist: true,
  });
}

function resetImageNamingState() {
  const sizePresets = normalizeImageNamingSizePresets(state.imageNaming.sizePresets);
  state.imageNaming = {
    names: {},
    sizes: {},
    batch: {},
    sizePresets,
    exportMode: "folder",
    compression: {},
    excludedKeys: [],
    collapsedGroups: state.imageNaming.collapsedGroups || {},
    nineSlice: {},
    confirmed: false,
  };
}

function imageSplitFrameKey() {
  const selectedEntry = ensureImageSplitSelectedIndex();
  return String(selectedEntry?.index ?? state.imageSplitSelectedIndex ?? 0);
}

function currentImageSplitEntry() {
  return ensureImageSplitSelectedIndex();
}

function currentImageSplitBoxes() {
  return state.imageSplit.byFrame[imageSplitFrameKey()] || [];
}

function setCurrentImageSplitBoxes(boxes) {
  state.imageSplit.byFrame[imageSplitFrameKey()] = boxes;
  clearImageNamingCompression();
}

function normalizeImageSplitSelection(ids = state.imageSplit.selectedIds) {
  const validIds = new Set(currentImageSplitBoxes().map((box) => box.id));
  return Array.from(new Set(ids)).filter((id) => validIds.has(id));
}

function selectedImageSplitIds() {
  const ids = normalizeImageSplitSelection(state.imageSplit.selectedIds);
  if (ids.length) {
    state.imageSplit.selectedIds = ids;
    state.imageSplit.selectedId = ids.includes(state.imageSplit.selectedId) ? state.imageSplit.selectedId : ids[0];
    return ids;
  }
  const fallback = state.imageSplit.selectedId ? normalizeImageSplitSelection([state.imageSplit.selectedId]) : [];
  state.imageSplit.selectedIds = fallback;
  state.imageSplit.selectedId = fallback[0] || null;
  return fallback;
}

function setImageSplitSelection(ids, { primaryId = null } = {}) {
  const nextIds = normalizeImageSplitSelection(ids);
  state.imageSplit.selectedIds = nextIds;
  state.imageSplit.selectedId = primaryId && nextIds.includes(primaryId) ? primaryId : nextIds[0] || null;
}

function toggleImageSplitSelection(id) {
  const ids = selectedImageSplitIds();
  const nextIds = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
  setImageSplitSelection(nextIds, { primaryId: nextIds.includes(id) ? id : nextIds[0] || null });
}

function imageSplitOrderedBoxes(boxes = currentImageSplitBoxes()) {
  const sorted = [...boxes].sort((a, b) => {
    const centerDelta = (a.y + a.h / 2) - (b.y + b.h / 2);
    if (Math.abs(centerDelta) > Math.max(8, Math.min(a.h, b.h) * 0.35)) {
      return centerDelta;
    }
    return a.x - b.x;
  });
  const rows = [];
  sorted.forEach((box) => {
    const centerY = box.y + box.h / 2;
    const row = rows.find((item) => Math.abs(centerY - item.centerY) <= Math.max(8, item.height * 0.45));
    if (row) {
      row.boxes.push(box);
      row.centerY = row.boxes.reduce((sum, item) => sum + item.y + item.h / 2, 0) / row.boxes.length;
      row.height = Math.max(row.height, box.h);
    } else {
      rows.push({ centerY, height: box.h, boxes: [box] });
    }
  });
  return rows
    .sort((a, b) => a.centerY - b.centerY)
    .flatMap((row) => row.boxes.sort((a, b) => a.x - b.x));
}

function imageSplitFrameSize(entry = currentImageSplitEntry()) {
  const image = els.imageSplitImage;
  const result = entry?.result || {};
  return {
    width: Math.max(1, Number(result.width || image?.naturalWidth || entry?.source?.width || 1)),
    height: Math.max(1, Number(result.height || image?.naturalHeight || entry?.source?.height || 1)),
  };
}

function normalizeImageSplitBox(box, frameSize = imageSplitFrameSize()) {
  const width = Math.max(1, Number(frameSize.width || 1));
  const height = Math.max(1, Number(frameSize.height || 1));
  const x = clamp(Math.round(Number(box.x || 0)), 0, Math.max(0, width - 1));
  const y = clamp(Math.round(Number(box.y || 0)), 0, Math.max(0, height - 1));
  const w = clamp(Math.round(Number(box.w || 1)), 1, Math.max(1, width - x));
  const h = clamp(Math.round(Number(box.h || 1)), 1, Math.max(1, height - y));
  return {
    id: box.id || `part_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: box.name || "\u4E3B\u4F53",
    x,
    y,
    w,
    h,
  };
}

function renderImageSplitTabs() {
  if (!els.imageSplitTabs) {
    return;
  }
  const entries = imageResultEntries().filter((entry) => entry.result);
  if (!entries.length) {
    els.imageSplitTabs.innerHTML = `<div class="empty-state">\u62A0\u56FE\u5B8C\u6210\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u62C6\u56FE\u9884\u89C8\u9875\u7B7E\u3002</div>`;
    return;
  }
  const selected = ensureImageSplitSelectedIndex();
  els.imageSplitTabs.innerHTML = entries
    .map((entry, index) => {
      const frame = entry.result;
      const imageUrl = frame.thumb_url || frame.url;
      const isSelected = Number(entry.index) === Number(selected?.index);
      const label = entry.source?.name || frame.original_name || frame.name || ("\u56FE\u7247 " + (index + 1));
      return `
        <button class="image-split-tab ${isSelected ? "selected" : ""}" type="button" data-image-split-index="${Number(entry.index)}">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}">
          <span>${String(index + 1).padStart(2, "0")}</span>
        </button>
      `;
    })
    .join("");
}

function renderImageSplit() {
  renderImageSplitTabs();
  const entry = currentImageSplitEntry();
  const imageUrl = entry?.result?.url || entry?.result?.thumb_url || "";
  const hasResult = Boolean(entry?.result && imageUrl);
  if (els.imageSplitImage) {
    if (hasResult) {
      if (els.imageSplitImage.src !== new URL(imageUrl, window.location.href).href) {
        els.imageSplitImage.src = imageUrl;
      }
      els.imageSplitImage.hidden = false;
    } else {
      els.imageSplitImage.hidden = true;
      els.imageSplitImage.removeAttribute("src");
    }
  }
  if (els.imageSplitEmpty) {
    els.imageSplitEmpty.hidden = hasResult;
    els.imageSplitEmpty.textContent = state.imageJob ? "\u8BF7\u9009\u62E9\u4E00\u5F20\u62A0\u56FE\u7ED3\u679C\u8FDB\u884C\u62C6\u56FE\u3002" : "\u62A0\u56FE\u5B8C\u6210\u540E\u4F1A\u5728\u8FD9\u91CC\u8FDB\u884C\u62C6\u56FE\u6807\u6CE8";
  }

  const boxes = currentImageSplitBoxes();
  selectedImageSplitIds();
  const boxCountText = state.imageSplit.skipped ? "\u5DF2\u8DF3\u8FC7" : String(boxes.length) + " \u4E2A\u5206\u533A";
  if (els.imageSplitSummary) {
    els.imageSplitSummary.innerHTML = [
      summaryCard("\u5F53\u524D\u56FE\u7247", escapeHtml(entry?.source?.name || entry?.result?.original_name || entry?.result?.name || "-")),
      summaryCard("\u62C6\u56FE\u72B6\u6001", escapeHtml(state.imageSplit.confirmed ? "\u5DF2\u786E\u8BA4 / " + boxCountText : boxCountText)),
    summaryCard("\u4E0B\u4E00\u6B65", "\u5BFC\u51FA\u62C6\u56FE\u7ED3\u679C"),
    ].join("");
  }
  [els.imageSplitAnalyzeButton, els.imageSplitSkipButton].forEach((button) => {
    if (button) button.disabled = !hasResult;
  });
  if (els.imageSplitConfirmButton) {
    els.imageSplitConfirmButton.disabled = !hasResult || (!boxes.length && !state.imageSplit.skipped);
  }
  if (els.imageSplitAddBoxButton) {
    els.imageSplitAddBoxButton.disabled = !hasResult;
  }
  if (els.imageSplitDeleteBoxButton) {
    els.imageSplitDeleteBoxButton.disabled = !selectedImageSplitIds().length;
  }
  if (els.imageSplitMergeBoxButton) {
    els.imageSplitMergeBoxButton.disabled = selectedImageSplitIds().length < 2;
  }
  syncImageSplitEditorInputs(boxes.find((box) => box.id === state.imageSplit.selectedId) || null);
  if (els.imageSplitBoxList) {
    els.imageSplitBoxList.innerHTML = "";
  }
  applyImageSplitView();
}

function syncImageSplitEditorInputs(box) {
  const inputs = [
    [els.imageSplitBoxXInput, box?.x],
    [els.imageSplitBoxYInput, box?.y],
    [els.imageSplitBoxWInput, box?.w],
    [els.imageSplitBoxHInput, box?.h],
  ];
  inputs.forEach(([input, value]) => {
    if (!input) return;
    input.disabled = !box;
    input.value = box ? String(value) : "";
  });
}

function renderImageSplitBoxList() {
  const boxes = currentImageSplitBoxes();
  if (!els.imageSplitBoxList) {
    return;
  }
  if (!boxes.length) {
    els.imageSplitBoxList.innerHTML = `<div class="empty-state">\u70B9\u51FB\u201C\u8BC6\u522B\u5206\u533A\u201D\u81EA\u52A8\u6807\u6CE8\uFF0C\u6216\u624B\u52A8\u6DFB\u52A0\u6846\u9009\u3002</div>`;
    return;
  }
  els.imageSplitBoxList.innerHTML = boxes
    .map((box, index) => {
      const selected = box.id === state.imageSplit.selectedId;
      return `
        <div class="image-split-box-row ${selected ? "selected" : ""}" data-split-box-id="${escapeHtml(box.id)}">
          <input class="image-split-check" type="checkbox" data-split-box-check="${escapeHtml(box.id)}" aria-label="\u9009\u62E9\u5408\u5E76 ${index + 1}">
          <strong>${String(index + 1).padStart(2, "0")}</strong>
          <input type="text" value="${escapeHtml(box.name || ("\u4E3B\u4F53 " + (index + 1)))}" data-split-box-name="${escapeHtml(box.id)}">
          <span>${Math.round(box.w)} x ${Math.round(box.h)}</span>
        </div>
      `;
    })
    .join("");
}

function imageSplitDisplayMetrics() {
  const image = els.imageSplitImage;
  const stage = els.imageSplitStage;
  if (!image || !stage || image.hidden || !image.naturalWidth || !image.naturalHeight) {
    return null;
  }
  const imageRect = image.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const frame = imageSplitFrameSize();
  return {
    frameWidth: frame.width,
    frameHeight: frame.height,
    imageLeft: imageRect.left - stageRect.left,
    imageTop: imageRect.top - stageRect.top,
    imageWidth: imageRect.width,
    imageHeight: imageRect.height,
  };
}

function imageSplitBoxDisplayRect(box, metrics = imageSplitDisplayMetrics()) {
  if (!metrics) {
    return null;
  }
  const left = metrics.imageLeft + (box.x / metrics.frameWidth) * metrics.imageWidth;
  const top = metrics.imageTop + (box.y / metrics.frameHeight) * metrics.imageHeight;
  const width = (box.w / metrics.frameWidth) * metrics.imageWidth;
  const height = (box.h / metrics.frameHeight) * metrics.imageHeight;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function imageSplitMarqueeRect() {
  const drag = state.imageSplit.drag;
  if (!drag || drag.mode !== "marquee") {
    return null;
  }
  const left = Math.min(drag.startStageX, drag.currentStageX);
  const top = Math.min(drag.startStageY, drag.currentStageY);
  const right = Math.max(drag.startStageX, drag.currentStageX);
  const bottom = Math.max(drag.startStageY, drag.currentStageY);
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function renderImageSplitMarquee() {
  const rect = imageSplitMarqueeRect();
  if (!rect || rect.width < 2 || rect.height < 2) {
    return "";
  }
  return `<div class="image-split-marquee" style="left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;"></div>`;
}

function rectsIntersect(a, b) {
  return Boolean(a && b && a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top);
}

function updateImageSplitMarqueeSelection() {
  const drag = state.imageSplit.drag;
  const metrics = drag?.metrics;
  const marquee = imageSplitMarqueeRect();
  if (!drag || drag.mode !== "marquee" || !metrics || !marquee) {
    return;
  }
  const hitIds = currentImageSplitBoxes()
    .filter((box) => rectsIntersect(imageSplitBoxDisplayRect(box, metrics), marquee))
    .map((box) => box.id);
  const ids = drag.additive ? [...drag.baseSelectedIds, ...hitIds] : hitIds;
  setImageSplitSelection(ids, { primaryId: hitIds[0] || drag.baseSelectedIds[0] || null });
}

function renderImageSplitOverlay() {
  if (!els.imageSplitOverlay) {
    return;
  }
  const metrics = imageSplitDisplayMetrics();
  const boxes = currentImageSplitBoxes();
  if (!metrics || !boxes.length) {
    els.imageSplitOverlay.innerHTML = renderImageSplitMarquee();
    return;
  }
  const selectedIds = new Set(selectedImageSplitIds());
  els.imageSplitOverlay.innerHTML = imageSplitOrderedBoxes(boxes)
    .map((box, index) => {
      const selected = selectedIds.has(box.id);
      const left = metrics.imageLeft + (box.x / metrics.frameWidth) * metrics.imageWidth;
      const top = metrics.imageTop + (box.y / metrics.frameHeight) * metrics.imageHeight;
      const width = (box.w / metrics.frameWidth) * metrics.imageWidth;
      const height = (box.h / metrics.frameHeight) * metrics.imageHeight;
      return `
        <div class="image-split-box ${selected ? "selected" : ""}" data-split-box-id="${escapeHtml(box.id)}" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px;">
          <span class="image-split-box-index">${index + 1}</span>
          ${["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => `<i data-split-handle="${handle}"></i>`).join("")}
        </div>
      `;
    })
    .join("") + renderImageSplitMarquee();
}

function selectImageSplitBox(id) {
  const boxes = currentImageSplitBoxes();
  const nextId = boxes.some((box) => box.id === id) ? id : boxes[0]?.id || null;
  setImageSplitSelection(nextId ? [nextId] : [], { primaryId: nextId });
  renderImageSplit();
  persistSession();
}

function updateImageSplitBoxName(id, name) {
  const boxes = currentImageSplitBoxes().map((box) => (box.id === id ? { ...box, name: name || box.name } : box));
  setCurrentImageSplitBoxes(boxes);
  state.imageSplit.confirmed = false;
  state.imageNaming.confirmed = false;
  renderImageNaming();
  persistSession();
}

function updateSelectedImageSplitBoxFromInputs() {
  const boxes = currentImageSplitBoxes();
  const selected = boxes.find((box) => box.id === state.imageSplit.selectedId);
  if (!selected) {
    return;
  }
  const next = normalizeImageSplitBox(
    {
      ...selected,
      x: Number(els.imageSplitBoxXInput?.value || 0),
      y: Number(els.imageSplitBoxYInput?.value || 0),
      w: Number(els.imageSplitBoxWInput?.value || 1),
      h: Number(els.imageSplitBoxHInput?.value || 1),
    },
    imageSplitFrameSize()
  );
  setCurrentImageSplitBoxes(boxes.map((box) => (box.id === selected.id ? next : box)));
  state.imageSplit.confirmed = false;
  renderImageSplit();
  renderImageNaming();
  persistSession();
}

function addImageSplitBox() {
  const entry = currentImageSplitEntry();
  if (!entry?.result) {
    setStatus("\u8BF7\u5148\u5B8C\u6210\u62A0\u56FE\uFF0C\u518D\u6DFB\u52A0\u62C6\u56FE\u6846\u3002", "error");
    return;
  }
  const frame = imageSplitFrameSize(entry);
  const size = Math.round(Math.min(frame.width, frame.height) * 0.36);
  const boxes = currentImageSplitBoxes();
  const box = normalizeImageSplitBox(
    {
      id: `part_${boxes.length + 1}_${Date.now().toString(36)}`,
      name: "\u4E3B\u4F53 " + (boxes.length + 1),
      x: Math.round((frame.width - size) / 2),
      y: Math.round((frame.height - size) / 2),
      w: size,
      h: size,
    },
    frame
  );
  setCurrentImageSplitBoxes([...boxes, box]);
  state.imageSplit.skipped = false;
  state.imageSplit.confirmed = false;
  setImageSplitSelection([box.id], { primaryId: box.id });
  renderImageSplit();
  renderImageNaming();
  persistSession();
}

function deleteSelectedImageSplitBox() {
  const selectedIds = selectedImageSplitIds();
  if (!selectedIds.length) {
    return;
  }
  const selectedSet = new Set(selectedIds);
  const boxes = currentImageSplitBoxes().filter((box) => !selectedSet.has(box.id));
  setCurrentImageSplitBoxes(boxes);
  const nextId = imageSplitOrderedBoxes(boxes)[0]?.id || null;
  setImageSplitSelection(nextId ? [nextId] : [], { primaryId: nextId });
  state.imageSplit.confirmed = false;
  renderImageSplit();
  renderImageNaming();
  persistSession();
}

function checkedImageSplitBoxIds() {
  return selectedImageSplitIds();
}

function mergeCheckedImageSplitBoxes() {
  const boxes = currentImageSplitBoxes();
  if (boxes.length < 2) {
    return;
  }
  const ids = checkedImageSplitBoxIds();
  const selected = boxes.filter((box) => ids.includes(box.id));
  if (selected.length < 2) {
    setStatus("\u8BF7\u5148\u9009\u4E2D\u81F3\u5C11\u4E24\u4E2A\u5206\u533A\u518D\u5408\u5E76\u3002", "error");
    return;
  }
  const minX = Math.min(...selected.map((box) => box.x));
  const minY = Math.min(...selected.map((box) => box.y));
  const maxX = Math.max(...selected.map((box) => box.x + box.w));
  const maxY = Math.max(...selected.map((box) => box.y + box.h));
  const merged = normalizeImageSplitBox({
    id: selected[0].id,
    name: selected[0].name || "\u5408\u5E76\u4E3B\u4F53",
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  });
  setCurrentImageSplitBoxes([merged, ...boxes.filter((box) => !ids.includes(box.id))]);
  setImageSplitSelection([merged.id], { primaryId: merged.id });
  state.imageSplit.confirmed = false;
  renderImageSplit();
  renderImageNaming();
  persistSession();
}

function resizeImageSplitBoxFromHandle(box, handle, dx, dy) {
  let x1 = box.x;
  let y1 = box.y;
  let x2 = box.x + box.w;
  let y2 = box.y + box.h;
  if (handle.includes("w")) x1 += dx;
  if (handle.includes("e")) x2 += dx;
  if (handle.includes("n")) y1 += dy;
  if (handle.includes("s")) y2 += dy;
  if (x1 > x2 - 1) {
    const midpoint = Math.round((x1 + x2) / 2);
    x1 = midpoint - 1;
    x2 = midpoint;
  }
  if (y1 > y2 - 1) {
    const midpoint = Math.round((y1 + y2) / 2);
    y1 = midpoint - 1;
    y2 = midpoint;
  }
  return {
    ...box,
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
  };
}

function imageSplitStagePoint(event) {
  const rect = els.imageSplitStage?.getBoundingClientRect();
  if (!rect) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
}

function startImageSplitBoxPointer(event) {
  if (event.button != null && ![0, 1, 2].includes(event.button)) {
    return;
  }
  if (event.button === 1 || event.button === 2) {
    const metrics = imageSplitDisplayMetrics();
    if (!metrics) {
      return;
    }
    event.preventDefault();
    state.imageSplit.drag = {
      mode: "pan",
      startX: event.clientX,
      startY: event.clientY,
      pan: { ...imageSplitView().pan },
    };
    els.imageSplitStage?.classList.add("is-panning");
    els.imageSplitOverlay?.setPointerCapture?.(event.pointerId);
    return;
  }
  const boxEl = event.target.closest("[data-split-box-id]");
  if (!boxEl) {
    if (event.target !== els.imageSplitOverlay) {
      return;
    }
    const metrics = imageSplitDisplayMetrics();
    if (!metrics) {
      return;
    }
    event.preventDefault();
    const point = imageSplitStagePoint(event);
    state.imageSplit.drag = {
      mode: "marquee",
      startStageX: point.x,
      startStageY: point.y,
      currentStageX: point.x,
      currentStageY: point.y,
      additive: Boolean(event.ctrlKey || event.metaKey),
      baseSelectedIds: selectedImageSplitIds(),
      metrics,
    };
    if (!state.imageSplit.drag.additive) {
      setImageSplitSelection([]);
    }
    els.imageSplitOverlay?.setPointerCapture?.(event.pointerId);
    renderImageSplitOverlay();
    return;
  }
  event.preventDefault();
  const id = boxEl.dataset.splitBoxId;
  const box = currentImageSplitBoxes().find((item) => item.id === id);
  const metrics = imageSplitDisplayMetrics();
  if (!box || !metrics) {
    return;
  }
  const handle = event.target.dataset.splitHandle || "";
  if (!handle && (event.ctrlKey || event.metaKey)) {
    toggleImageSplitSelection(id);
    renderImageSplit();
    persistSession();
    return;
  }
  setImageSplitSelection([id], { primaryId: id });
  state.imageSplit.drag = {
    id,
    mode: handle ? "resize" : "move",
    handle,
    startX: event.clientX,
    startY: event.clientY,
    box: { ...box },
    metrics,
  };
  els.imageSplitOverlay?.setPointerCapture?.(event.pointerId);
  renderImageSplit();
}

function moveImageSplitBoxPointer(event) {
  const drag = state.imageSplit.drag;
  if (!drag) {
    return;
  }
  event.preventDefault();
  if (drag.mode === "marquee") {
    const point = imageSplitStagePoint(event);
    drag.currentStageX = point.x;
    drag.currentStageY = point.y;
    updateImageSplitMarqueeSelection();
    state.imageSplit.confirmed = false;
    renderImageSplitOverlay();
    return;
  }
  if (drag.mode === "pan") {
    const view = imageSplitView();
    view.pan = clampImageSplitPan({
      x: drag.pan.x + event.clientX - drag.startX,
      y: drag.pan.y + event.clientY - drag.startY,
    }, view.zoom);
    applyImageSplitView({ persist: false });
    return;
  }
  const scaleX = drag.metrics.frameWidth / Math.max(1, drag.metrics.imageWidth);
  const scaleY = drag.metrics.frameHeight / Math.max(1, drag.metrics.imageHeight);
  const dx = Math.round((event.clientX - drag.startX) * scaleX);
  const dy = Math.round((event.clientY - drag.startY) * scaleY);
  const rawBox = drag.mode === "resize"
    ? resizeImageSplitBoxFromHandle(drag.box, drag.handle, dx, dy)
    : { ...drag.box, x: drag.box.x + dx, y: drag.box.y + dy };
  const next = normalizeImageSplitBox(rawBox, { width: drag.metrics.frameWidth, height: drag.metrics.frameHeight });
  setCurrentImageSplitBoxes(currentImageSplitBoxes().map((box) => (box.id === drag.id ? next : box)));
  state.imageSplit.confirmed = false;
  syncImageSplitEditorInputs(next);
  renderImageSplitOverlay();
}

function finishImageSplitBoxPointer(event) {
  if (!state.imageSplit.drag) {
    return;
  }
  if (event?.pointerId != null && els.imageSplitOverlay?.hasPointerCapture?.(event.pointerId)) {
    els.imageSplitOverlay.releasePointerCapture(event.pointerId);
  }
  const wasMarquee = state.imageSplit.drag.mode === "marquee";
  const wasPan = state.imageSplit.drag.mode === "pan";
  if (wasMarquee) {
    updateImageSplitMarqueeSelection();
  }
  els.imageSplitStage?.classList.remove("is-panning");
  state.imageSplit.drag = null;
  renderImageSplit();
  if (!wasPan) {
    renderImageNaming();
  }
  persistSession();
}

async function analyzeImageSplitBoxes() {
  const entry = currentImageSplitEntry();
  const url = entry?.result?.url || entry?.result?.thumb_url || "";
  if (!url) {
    setStatus("\u8BF7\u5148\u5B8C\u6210\u62A0\u56FE\uFF0C\u518D\u8FDB\u884C\u62C6\u56FE\u8BC6\u522B\u3002", "error");
    return;
  }
  await withBusy(els.imageSplitAnalyzeButton, async () => {
    setStatus("\u6B63\u5728\u8BC6\u522B\u4E3B\u4F53\u5206\u533A...");
    const boxes = await detectImageSplitBoxes(url, entry);
    setCurrentImageSplitBoxes(boxes);
    state.imageSplit.skipped = false;
    state.imageSplit.confirmed = false;
    const firstId = imageSplitOrderedBoxes(boxes)[0]?.id || null;
    setImageSplitSelection(firstId ? [firstId] : [], { primaryId: firstId });
    state.imageNaming.confirmed = false;
    renderImageSplit();
    renderImageNaming();
    persistSession();
    setStatus("\u5DF2\u8BC6\u522B " + boxes.length + " \u4E2A\u5206\u533A\uFF0C\u53EF\u7EE7\u7EED\u8C03\u6574\u6846\u9009\u3002", "success");
  });
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("\u56FE\u7247\u52A0\u8F7D\u5931\u8D25"));
    image.src = url;
  });
}

async function detectImageSplitBoxes(url, entry) {
  try {
    const image = await loadImageElement(url);
    const naturalWidth = image.naturalWidth || entry?.result?.width || 1;
    const naturalHeight = image.naturalHeight || entry?.result?.height || 1;
    const maxSide = 1000;
    const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const tuning = imageSplitDetectionTuning();
    const minArea = Math.max(48, Math.round(width * height * 0.0012 * tuning.minAreaScale));
    const alphaBoxes = detectImageSplitConnectedBoxes(data, width, height, {
      minArea,
      isForeground: (offset) => data[offset + 3] > 24,
    });
    const fallbackBoxes = shouldUseVisualImageSplitFallback(alphaBoxes, width, height)
      ? detectVisualImageSplitBoxes(data, width, height, tuning)
      : [];
    const boxes = refineImageSplitDetectedBoxes(
      fallbackBoxes.length > alphaBoxes.length ? fallbackBoxes : alphaBoxes,
      data,
      width,
      height,
      tuning
    );
    const frame = { width: naturalWidth, height: naturalHeight };
    const detected = boxes
      .sort((a, b) => b.area - a.area)
      .slice(0, 24)
      .map((box, index) => {
        const pad = Math.max(2, Math.round(4 / scale));
        return normalizeImageSplitBox(
          {
            id: `part_${String(index + 1).padStart(3, "0")}`,
            name: "\u4E3B\u4F53 " + (index + 1),
            x: Math.floor(box.minX / scale) - pad,
            y: Math.floor(box.minY / scale) - pad,
            w: Math.ceil((box.maxX - box.minX + 1) / scale) + pad * 2,
            h: Math.ceil((box.maxY - box.minY + 1) / scale) + pad * 2,
          },
          frame
        );
      });
    return detected.length ? detected : [defaultImageSplitBox(entry)];
  } catch (error) {
    console.warn("detectImageSplitBoxes failed", error);
    return [defaultImageSplitBox(entry)];
  }
}

function detectImageSplitConnectedBoxes(data, width, height, { minArea, isForeground }) {
  const visited = new Uint8Array(width * height);
  const boxes = [];
  const queue = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      const startOffset = start * 4;
      if (visited[start] || !isForeground(startOffset, start)) {
        visited[start] = 1;
        continue;
      }
      let head = 0;
      let area = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      visited[start] = 1;
      queue.length = 0;
      queue.push(start);
      while (head < queue.length) {
        const cursor = queue[head++];
        const cx = cursor % width;
        const cy = Math.floor(cursor / width);
        area += 1;
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);
        const neighbors = [cursor - 1, cursor + 1, cursor - width, cursor + width];
        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue;
          const nx = next % width;
          if ((next === cursor - 1 && nx > cx) || (next === cursor + 1 && nx < cx)) continue;
          visited[next] = 1;
          if (isForeground(next * 4, next)) {
            queue.push(next);
          }
        }
      }
      if (area >= minArea) {
        boxes.push({ minX, minY, maxX, maxY, area });
      }
    }
  }
  return boxes;
}

function imageSplitRawBoxArea(box) {
  return Math.max(0, box.maxX - box.minX + 1) * Math.max(0, box.maxY - box.minY + 1);
}

function shouldUseVisualImageSplitFallback(boxes, width, height) {
  if (!boxes.length) {
    return true;
  }
  if (boxes.length > 1) {
    return false;
  }
  const canvasArea = Math.max(1, width * height);
  return imageSplitRawBoxArea(boxes[0]) / canvasArea >= 0.18 || boxes[0].area / canvasArea >= 0.16;
}

function estimateImageSplitBackgroundColor(data, width, height) {
  const step = Math.max(1, Math.floor(Math.max(width, height) / 160));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const addSample = (x, y) => {
    const offset = (y * width + x) * 4;
    const alpha = data[offset + 3] / 255;
    red += data[offset] * alpha + 255 * (1 - alpha);
    green += data[offset + 1] * alpha + 255 * (1 - alpha);
    blue += data[offset + 2] * alpha + 255 * (1 - alpha);
    count += 1;
  };
  for (let x = 0; x < width; x += step) {
    addSample(x, 0);
    addSample(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    addSample(0, y);
    addSample(width - 1, y);
  }
  return count
    ? { r: red / count, g: green / count, b: blue / count }
    : { r: 255, g: 255, b: 255 };
}

function isVisualImageSplitForegroundPixel(data, offset, background) {
  const alpha = data[offset + 3];
  if (alpha <= 10) {
    return false;
  }
  const alphaRatio = alpha / 255;
  const red = data[offset] * alphaRatio + 255 * (1 - alphaRatio);
  const green = data[offset + 1] * alphaRatio + 255 * (1 - alphaRatio);
  const blue = data[offset + 2] * alphaRatio + 255 * (1 - alphaRatio);
  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const saturation = maxChannel - minChannel;
  const backgroundDistance = Math.abs(red - background.r) + Math.abs(green - background.g) + Math.abs(blue - background.b);
  const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
  const backgroundLuminance = background.r * 0.299 + background.g * 0.587 + background.b * 0.114;
  return saturation >= 24 || backgroundDistance >= 46 || Math.abs(luminance - backgroundLuminance) >= 38;
}

function imageSplitDetectionTuning(strength = state.imageSplitDetectionStrength) {
  const normalized = normalizeImageSplitDetectionStrength(strength);
  const detail = (normalized - 1) / 4;
  return {
    strength: normalized,
    minAreaScale: 1.65 - detail * 1.1,
    visualMinAreaScale: 1.8 - detail * 1.35,
    rowGapScale: 1.45 - detail * 0.75,
    wideRatio: 1.85 - detail * 0.55,
    tallRatio: 2.9 - detail * 1.45,
    valleyScale: 0.74 + detail * 0.58,
    fragmentGapScale: 1.55 - detail * 0.9,
    fragmentAreaRatio: 0.78 - detail * 0.35,
    fragmentSizeRatio: 0.84 - detail * 0.26,
  };
}

function detectVisualImageSplitBoxes(data, width, height, tuning = imageSplitDetectionTuning()) {
  const background = estimateImageSplitBackgroundColor(data, width, height);
  const componentBoxes = detectImageSplitConnectedBoxes(data, width, height, {
    minArea: Math.max(16, Math.round(width * height * 0.00008 * tuning.visualMinAreaScale)),
    isForeground: (offset) => isVisualImageSplitForegroundPixel(data, offset, background),
  }).filter((box) => {
    const boxWidth = box.maxX - box.minX + 1;
    const boxHeight = box.maxY - box.minY + 1;
    return boxWidth >= 4 && boxHeight >= 4;
  });
  const mergedBoxes = mergeVisualImageSplitComponents(componentBoxes, width, height, tuning);
  return splitWideVisualImageSplitBoxes(mergedBoxes, data, width, height, background, tuning);
}

function refineImageSplitDetectedBoxes(boxes, data, width, height, tuning = imageSplitDetectionTuning()) {
  if (boxes.length <= 1) {
    return boxes;
  }
  const background = estimateImageSplitBackgroundColor(data, width, height);
  const merged = mergeVisualImageSplitComponents(boxes, width, height, tuning);
  const split = splitWideVisualImageSplitBoxes(merged, data, width, height, background, tuning);
  const recovered = mergeImageSplitTinyFragments(split, width, height, tuning);
  return splitWideVisualImageSplitBoxes(recovered, data, width, height, background, tuning);
}

function splitWideVisualImageSplitBoxes(boxes, data, width, height, background, tuning = imageSplitDetectionTuning()) {
  return boxes.flatMap((box) =>
    splitWideVisualImageSplitBox(box, data, width, height, background, tuning)
      .flatMap((part) => splitTallVisualImageSplitBox(part, data, width, height, background, tuning))
  );
}

function splitWideVisualImageSplitBox(box, data, width, height, background, tuning = imageSplitDetectionTuning()) {
  const boxWidth = box.maxX - box.minX + 1;
  const boxHeight = box.maxY - box.minY + 1;
  const widthRatio = boxWidth / Math.max(1, boxHeight);
  if (widthRatio < tuning.wideRatio) {
    return [box];
  }

  const partCount = Math.min(3, Math.max(2, Math.round(widthRatio)));
  const projection = [];
  for (let x = box.minX; x <= box.maxX; x += 1) {
    let density = 0;
    for (let y = box.minY; y <= box.maxY; y += 1) {
      if (isVisualImageSplitForegroundPixel(data, (y * width + x) * 4, background)) {
        density += 1;
      }
    }
    projection.push(density);
  }

  const averageDensity = projection.reduce((sum, density) => sum + density, 0) / Math.max(1, projection.length);
  const smoothRadius = clamp(Math.round(boxHeight * 0.018), 2, 5);
  const smoothed = projection.map((_, index) => {
    let total = 0;
    let count = 0;
    for (let cursor = Math.max(0, index - smoothRadius); cursor <= Math.min(projection.length - 1, index + smoothRadius); cursor += 1) {
      total += projection[cursor];
      count += 1;
    }
    return total / count;
  });
  const partWidth = boxWidth / partCount;
  const minPartWidth = Math.max(18, Math.round(partWidth * 0.52));
  const valleyLimit = Math.max(4, averageDensity * 0.38, boxHeight * 0.08) * tuning.valleyScale;
  const cuts = [];
  for (let partIndex = 1; partIndex < partCount; partIndex += 1) {
    const ideal = Math.round(partWidth * partIndex);
    const searchRadius = Math.max(8, Math.round(partWidth * 0.26));
    const start = Math.max(cuts[cuts.length - 1] + minPartWidth || minPartWidth, ideal - searchRadius);
    const end = Math.min(projection.length - minPartWidth - 1, ideal + searchRadius);
    if (start > end) {
      return [box];
    }
    let cut = start;
    for (let index = start + 1; index <= end; index += 1) {
      if (smoothed[index] < smoothed[cut]) {
        cut = index;
      }
    }
    if (smoothed[cut] > valleyLimit) {
      return [box];
    }
    cuts.push(cut);
  }

  const boundaries = [-1, ...cuts, projection.length - 1];
  const parts = [];
  for (let index = 1; index < boundaries.length; index += 1) {
    const part = visualImageSplitBoxFromColumns(
      box,
      boundaries[index - 1] + 1,
      boundaries[index],
      data,
      width,
      height,
      background
    );
    if (!part) {
      return [box];
    }
    parts.push(part);
  }
  return parts;
}

function splitTallVisualImageSplitBox(box, data, width, height, background, tuning = imageSplitDetectionTuning()) {
  const boxWidth = box.maxX - box.minX + 1;
  const boxHeight = box.maxY - box.minY + 1;
  const heightRatio = boxHeight / Math.max(1, boxWidth);
  if (heightRatio < tuning.tallRatio) {
    return [box];
  }

  const partCount = Math.min(5, Math.max(2, Math.round(heightRatio)));
  const projection = [];
  for (let y = box.minY; y <= box.maxY; y += 1) {
    let density = 0;
    for (let x = box.minX; x <= box.maxX; x += 1) {
      if (isVisualImageSplitForegroundPixel(data, (y * width + x) * 4, background)) {
        density += 1;
      }
    }
    projection.push(density);
  }

  const averageDensity = projection.reduce((sum, density) => sum + density, 0) / Math.max(1, projection.length);
  const smoothRadius = clamp(Math.round(boxWidth * 0.018), 2, 5);
  const smoothed = projection.map((_, index) => {
    let total = 0;
    let count = 0;
    for (let cursor = Math.max(0, index - smoothRadius); cursor <= Math.min(projection.length - 1, index + smoothRadius); cursor += 1) {
      total += projection[cursor];
      count += 1;
    }
    return total / count;
  });
  const partHeight = boxHeight / partCount;
  const minPartHeight = Math.max(18, Math.round(partHeight * 0.52));
  const valleyLimit = Math.max(4, averageDensity * 0.38, boxWidth * 0.08) * tuning.valleyScale;
  const cuts = [];
  for (let partIndex = 1; partIndex < partCount; partIndex += 1) {
    const ideal = Math.round(partHeight * partIndex);
    const searchRadius = Math.max(8, Math.round(partHeight * 0.28));
    const start = Math.max(cuts[cuts.length - 1] + minPartHeight || minPartHeight, ideal - searchRadius);
    const end = Math.min(projection.length - minPartHeight - 1, ideal + searchRadius);
    if (start > end) {
      return [box];
    }
    let cut = start;
    for (let index = start + 1; index <= end; index += 1) {
      if (smoothed[index] < smoothed[cut]) {
        cut = index;
      }
    }
    if (smoothed[cut] > valleyLimit) {
      return [box];
    }
    cuts.push(cut);
  }

  const boundaries = [-1, ...cuts, projection.length - 1];
  const parts = [];
  for (let index = 1; index < boundaries.length; index += 1) {
    const part = visualImageSplitBoxFromRows(
      box,
      boundaries[index - 1] + 1,
      boundaries[index],
      data,
      width,
      height,
      background
    );
    if (!part) {
      return [box];
    }
    parts.push(part);
  }
  return parts;
}

function visualImageSplitBoxFromColumns(box, startColumn, endColumn, data, width, height, background) {
  let minX = box.maxX;
  let minY = box.maxY;
  let maxX = box.minX;
  let maxY = box.minY;
  let area = 0;
  for (let x = box.minX + startColumn; x <= box.minX + endColumn; x += 1) {
    for (let y = box.minY; y <= box.maxY; y += 1) {
      if (!isVisualImageSplitForegroundPixel(data, (y * width + x) * 4, background)) {
        continue;
      }
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return area ? { minX, minY, maxX, maxY, area } : null;
}

function visualImageSplitBoxFromRows(box, startRow, endRow, data, width, height, background) {
  let minX = box.maxX;
  let minY = box.maxY;
  let maxX = box.minX;
  let maxY = box.minY;
  let area = 0;
  for (let y = box.minY + startRow; y <= box.minY + endRow; y += 1) {
    for (let x = box.minX; x <= box.maxX; x += 1) {
      if (!isVisualImageSplitForegroundPixel(data, (y * width + x) * 4, background)) {
        continue;
      }
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return area ? { minX, minY, maxX, maxY, area } : null;
}

function mergeVisualImageSplitComponents(boxes, width, height, tuning = imageSplitDetectionTuning()) {
  if (boxes.length <= 1) {
    return boxes;
  }
  const componentHeights = boxes.map(imageSplitRawBoxHeight).sort((a, b) => a - b);
  const componentAreas = boxes.map((box) => box.area).sort((a, b) => a - b);
  const medianHeight = componentHeights[Math.floor(componentHeights.length / 2)] || 1;
  const medianArea = componentAreas[Math.floor(componentAreas.length / 2)] || 1;
  const centerLimit = Math.max(8, medianHeight * (0.66 + tuning.rowGapScale * 0.23));
  const overlapLimit = 0.12 + Math.max(0, 2 - tuning.rowGapScale) * 0.05;
  const fragmentGapLimit = Math.max(3, medianHeight * (0.08 + tuning.rowGapScale * 0.035));
  const sorted = [...boxes].sort((a, b) => {
    const centerDelta = (a.minY + a.maxY) / 2 - (b.minY + b.maxY) / 2;
    if (Math.abs(centerDelta) > 6) {
      return centerDelta;
    }
    return a.minX - b.minX;
  });
  const rows = [];
  sorted.forEach((box) => {
    const boxHeight = Math.max(1, box.maxY - box.minY + 1);
    const centerY = (box.minY + box.maxY) / 2;
    const boxIsFragment = box.area < medianArea * 0.55 || boxHeight < medianHeight * 0.62;
    let row = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    rows.forEach((item) => {
      const centerDistance = Math.abs(centerY - item.centerY);
      if (centerDistance > centerLimit) {
        return;
      }
      const rowHeight = Math.max(1, item.maxY - item.minY + 1);
      const overlap = Math.max(0, Math.min(box.maxY, item.maxY) - Math.max(box.minY, item.minY) + 1);
      const overlapRatio = overlap / Math.max(1, Math.min(boxHeight, rowHeight));
      const gap = Math.max(0, Math.max(box.minY, item.minY) - Math.min(box.maxY, item.maxY) - 1);
      const rowIsFragment = item.area / item.boxes.length < medianArea * 0.55 || item.height < medianHeight * 0.62;
      const fragmentsAreClose = (boxIsFragment || rowIsFragment) && gap <= fragmentGapLimit;
      if (overlapRatio < overlapLimit && !fragmentsAreClose) {
        return;
      }
      const score = overlapRatio * 2 - gap / medianHeight - (centerDistance / medianHeight) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        row = item;
      }
    });
    if (row) {
      row.boxes.push(box);
      row.centerY = row.boxes.reduce((sum, item) => sum + (item.minY + item.maxY) / 2, 0) / row.boxes.length;
      row.height = Math.max(row.height, boxHeight);
      row.minY = Math.min(row.minY, box.minY);
      row.maxY = Math.max(row.maxY, box.maxY);
      row.area += box.area;
    } else {
      rows.push({ centerY, height: boxHeight, minY: box.minY, maxY: box.maxY, area: box.area, boxes: [box] });
    }
  });
  const merged = [];
  rows.forEach((row) => {
    const rowBoxes = row.boxes.sort((a, b) => a.minX - b.minX);
    const gapLimit = visualImageSplitGapLimit(rowBoxes, row.height, width, tuning);
    let current = null;
    rowBoxes.forEach((box) => {
      if (!current) {
        current = { ...box };
        return;
      }
      const gap = box.minX - current.maxX;
      if (gap <= gapLimit) {
        current.minX = Math.min(current.minX, box.minX);
        current.minY = Math.min(current.minY, box.minY);
        current.maxX = Math.max(current.maxX, box.maxX);
        current.maxY = Math.max(current.maxY, box.maxY);
        current.area += box.area;
      } else {
        merged.push(current);
        current = { ...box };
      }
    });
    if (current) {
      merged.push(current);
    }
  });
  const minGroupArea = Math.max(28, Math.round(width * height * 0.00018 * tuning.visualMinAreaScale));
  return merged.filter((box) => {
    const boxWidth = box.maxX - box.minX + 1;
    const boxHeight = box.maxY - box.minY + 1;
    return box.area >= minGroupArea && boxWidth >= 8 && boxHeight >= 8;
  });
}

function visualImageSplitGapLimit(rowBoxes, rowHeight, width, tuning = imageSplitDetectionTuning()) {
  const gaps = [];
  for (let index = 1; index < rowBoxes.length; index += 1) {
    const gap = rowBoxes[index].minX - rowBoxes[index - 1].maxX;
    if (gap > 0) {
      gaps.push(gap);
    }
  }
  if (!gaps.length) {
    return Math.max(8, Math.min(26, rowHeight * 0.22)) * tuning.rowGapScale;
  }
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];
  const smallGap = sortedGaps[Math.max(0, Math.floor(sortedGaps.length * 0.35))];
  return clamp(
    Math.round(Math.max(8, Math.min(medianGap * 0.72, smallGap * 1.55, rowHeight * 0.28))),
    8,
    Math.max(12, Math.round(width * 0.045))
  ) * tuning.rowGapScale;
}

function imageSplitRawBoxWidth(box) {
  return Math.max(1, box.maxX - box.minX + 1);
}

function imageSplitRawBoxHeight(box) {
  return Math.max(1, box.maxY - box.minY + 1);
}

function mergeImageSplitRawBoxes(boxes) {
  return boxes.reduce(
    (merged, box) => ({
      minX: Math.min(merged.minX, box.minX),
      minY: Math.min(merged.minY, box.minY),
      maxX: Math.max(merged.maxX, box.maxX),
      maxY: Math.max(merged.maxY, box.maxY),
      area: merged.area + box.area,
    }),
    { ...boxes[0] }
  );
}

function imageSplitRawGap(a, b) {
  const gapX = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX) - 1);
  const gapY = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY) - 1);
  return Math.hypot(gapX, gapY);
}

function imageSplitRawOverlapRatio(a, b, axis) {
  const aMin = axis === "x" ? a.minX : a.minY;
  const aMax = axis === "x" ? a.maxX : a.maxY;
  const bMin = axis === "x" ? b.minX : b.minY;
  const bMax = axis === "x" ? b.maxX : b.maxY;
  const overlap = Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin) + 1);
  const smaller = Math.max(1, Math.min(aMax - aMin + 1, bMax - bMin + 1));
  return overlap / smaller;
}

function shouldMergeImageSplitTinyFragment(fragment, target, medianHeight, width, tuning = imageSplitDetectionTuning()) {
  const fragmentWidth = imageSplitRawBoxWidth(fragment);
  const fragmentHeight = imageSplitRawBoxHeight(fragment);
  const targetWidth = imageSplitRawBoxWidth(target);
  const targetHeight = imageSplitRawBoxHeight(target);
  const fragmentArea = imageSplitRawBoxArea(fragment);
  const targetArea = imageSplitRawBoxArea(target);
  const isFragment =
    fragmentArea < targetArea * tuning.fragmentAreaRatio ||
    fragmentHeight < targetHeight * tuning.fragmentSizeRatio ||
    fragmentWidth < targetWidth * tuning.fragmentSizeRatio;
  if (!isFragment) {
    return false;
  }
  const merged = mergeImageSplitRawBoxes([target, fragment]);
  const mergedWidth = imageSplitRawBoxWidth(merged);
  const mergedHeight = imageSplitRawBoxHeight(merged);
  const charHeight = Math.max(medianHeight, targetHeight, fragmentHeight);
  const gap = imageSplitRawGap(fragment, target);
  const gapLimit = clamp(Math.round(charHeight * 0.18), 6, Math.max(10, Math.round(width * 0.032))) * tuning.fragmentGapScale;
  if (gap > gapLimit) {
    return false;
  }
  const xOverlap = imageSplitRawOverlapRatio(fragment, target, "x");
  const yOverlap = imageSplitRawOverlapRatio(fragment, target, "y");
  const hasInterleaving = xOverlap >= 0.16 || yOverlap >= 0.16;
  if (!hasInterleaving) {
    return false;
  }
  const compactWidthLimit = Math.max(targetWidth, fragmentWidth) + charHeight * 0.72;
  const compactHeightLimit = Math.max(targetHeight, fragmentHeight) + charHeight * 0.72;
  const verticallyAttached = xOverlap >= 0.18 && mergedHeight <= compactHeightLimit;
  const horizontallyAttached = yOverlap >= 0.18 && mergedWidth <= compactWidthLimit;
  const cornerAttached = xOverlap >= 0.14 && yOverlap >= 0.14;
  return verticallyAttached || horizontallyAttached || cornerAttached;
}

function mergeImageSplitTinyFragments(boxes, width, height, tuning = imageSplitDetectionTuning()) {
  if (boxes.length <= 1) {
    return boxes;
  }
  const heights = boxes.map(imageSplitRawBoxHeight).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || Math.max(width, height) * 0.08;
  const minArea = Math.max(28, Math.round(width * height * 0.00018 * tuning.visualMinAreaScale));
  const sorted = [...boxes].sort((a, b) => imageSplitRawBoxArea(b) - imageSplitRawBoxArea(a));
  const groups = [];
  sorted.forEach((box) => {
    let bestGroup = null;
    let bestGap = Number.POSITIVE_INFINITY;
    groups.forEach((group) => {
      if (!shouldMergeImageSplitTinyFragment(box, group.box, medianHeight, width, tuning)) {
        return;
      }
      const gap = imageSplitRawGap(box, group.box);
      if (gap < bestGap) {
        bestGap = gap;
        bestGroup = group;
      }
    });
    if (bestGroup) {
      bestGroup.parts.push(box);
      bestGroup.box = mergeImageSplitRawBoxes([bestGroup.box, box]);
    } else {
      groups.push({ box: { ...box }, parts: [box] });
    }
  });
  return groups
    .map((group) => group.box)
    .filter((box) => box.area >= minArea && imageSplitRawBoxWidth(box) >= 8 && imageSplitRawBoxHeight(box) >= 8);
}

function defaultImageSplitBox(entry = currentImageSplitEntry()) {
  const frame = imageSplitFrameSize(entry);
  return normalizeImageSplitBox({
    id: "part_001",
    name: "\u4E3B\u4F53 1",
    x: Math.round(frame.width * 0.08),
    y: Math.round(frame.height * 0.08),
    w: Math.round(frame.width * 0.84),
    h: Math.round(frame.height * 0.84),
  }, frame);
}

function skipImageSplit() {
  if (!state.imageJob?.frames?.length) {
    setStatus("\u8BF7\u5148\u5B8C\u6210\u62A0\u56FE\uFF0C\u518D\u8DF3\u8FC7\u62C6\u56FE\u3002", "error");
    return;
  }
  setCurrentImageSplitBoxes([]);
  state.imageSplit.skipped = true;
  state.imageSplit.confirmed = true;
  setImageSplitSelection([]);
  state.imageNaming.excludedKeys = [];
  state.imageNaming.confirmed = false;
  renderImageSplit();
  renderImageNaming();
  persistSession();
  setActiveImageTool("splitPreview");
  setStatus("\u5DF2\u8DF3\u8FC7\u62C6\u56FE\uFF0C\u8FDB\u5165\u62C6\u56FE\u7ED3\u679C\u9884\u89C8\u3002", "success");
}

function confirmImageSplit() {
  if (!state.imageJob?.frames?.length) {
    setStatus("\u8BF7\u5148\u5B8C\u6210\u62A0\u56FE\uFF0C\u518D\u786E\u8BA4\u62C6\u56FE\u3002", "error");
    return;
  }
  const boxes = currentImageSplitBoxes();
  if (!boxes.length) {
    setStatus("\u8FD8\u6CA1\u6709\u62C6\u56FE\u5206\u533A\uFF1B\u53EF\u5148\u8BC6\u522B\u5206\u533A\u3001\u624B\u52A8\u6DFB\u52A0\uFF0C\u6216\u76F4\u63A5\u8DF3\u8FC7\u3002", "error");
    return;
  }
  state.imageSplit.skipped = false;
  state.imageSplit.confirmed = true;
  state.imageNaming.excludedKeys = [];
  state.imageNaming.confirmed = false;
  renderImageSplit();
  renderImageNaming();
  persistSession();
  setActiveImageTool("splitPreview");
  setStatus("\u62C6\u56FE\u5DF2\u786E\u8BA4\uFF0C\u8FDB\u5165\u62C6\u56FE\u7ED3\u679C\u9884\u89C8\u3002", "success");
}

function imageSplitBoxesForEntry(entry) {
  return state.imageSplit.byFrame[String(entry?.index ?? 0)] || [];
}

function imageNamingExcludedKeySet() {
  const keys = state.imageNaming.excludedKeys;
  if (Array.isArray(keys)) {
    return new Set(keys.map(String));
  }
  if (keys && typeof keys === "object") {
    return new Set(Object.keys(keys).filter((key) => keys[key]));
  }
  return new Set();
}

function isImageNamingItemExcluded(key) {
  return imageNamingExcludedKeySet().has(String(key || ""));
}

function removeImageNamingItem(key) {
  const itemKey = String(key || "");
  if (!itemKey) {
    return;
  }
  const excluded = imageNamingExcludedKeySet();
  excluded.add(itemKey);
  state.imageNaming.excludedKeys = Array.from(excluded);
  delete state.imageNaming.names[itemKey];
  delete state.imageNaming.sizes[itemKey];
  delete state.imageNaming.compression?.[itemKey];
  state.imageNaming.confirmed = false;
  renderImageNaming();
  persistSession();
  setStatus("\u5DF2\u4ECE\u5F53\u524D\u5BFC\u51FA\u6E05\u5355\u79FB\u9664\u8BE5\u56FE\u7247\u3002", "success");
}

function imageNamingGroups() {
  return imageResultEntries()
    .filter((entry) => entry.result)
    .map((entry, groupIndex) => {
      const result = entry.result;
      const frameWidth = Math.max(1, Number(result.width || entry.source?.width || 1));
      const frameHeight = Math.max(1, Number(result.height || entry.source?.height || 1));
      const sourceName = entry.source?.name || result.original_name || result.name || ("\u56FE\u7247 " + (groupIndex + 1));
      const imageUrl = result.url || result.thumb_url || "";
      const boxes = state.imageSplit.skipped ? [] : imageSplitOrderedBoxes(imageSplitBoxesForEntry(entry));
      const parts = state.imageSplit.skipped || !boxes.length
        ? [{
            key: `frame:${entry.index}`,
            label: sourceName,
            detail: frameWidth && frameHeight ? `${frameWidth} x ${frameHeight}` : "\u62A0\u56FE\u7ED3\u679C",
            sourceDetail: frameWidth && frameHeight ? `${frameWidth} x ${frameHeight}` : "\u62A0\u56FE\u7ED3\u679C",
            sourceWidth: frameWidth,
            sourceHeight: frameHeight,
            sourceIndex: entry.index,
            sourceName: result.name,
            fallback: stripFileExtension(sourceName || `image_${groupIndex + 1}`),
            imageUrl,
            crop: null,
          }]
        : boxes.map((box, partIndex) => ({
            key: `${entry.index}:${box.id}`,
            label: box.name || ("\u4E3B\u4F53 " + (partIndex + 1)),
            sourceDetail: `${Math.round(box.w)} x ${Math.round(box.h)}`,
            sourceWidth: Math.max(1, Math.round(box.w)),
            sourceHeight: Math.max(1, Math.round(box.h)),
            sourceIndex: entry.index,
            sourceName: result.name,
            fallback: box.name || `part_${String(partIndex + 1).padStart(2, "0")}`,
            imageUrl,
            crop: {
              x: box.x,
              y: box.y,
              w: box.w,
              h: box.h,
              frameWidth,
              frameHeight,
            },
          }));
      return {
        key: `group:${entry.index}`,
        index: entry.index,
        title: sourceName,
        imageUrl,
        frameWidth,
        frameHeight,
        parts: parts.filter((part) => !isImageNamingItemExcluded(part.key)),
      };
    })
    .filter((group) => group.parts.length);
}

function imageNamingItems() {
  return imageNamingGroups().flatMap((group) => group.parts);
}

function imageNamingItemByKey(key) {
  const itemKey = String(key || "");
  return imageNamingItems().find((item) => String(item.key || "") === itemKey) || null;
}

function imageNamingExportMode() {
  return state.imageNaming.exportMode === "direct" ? "direct" : "folder";
}

function syncImageNamingExportModeControls() {
  const mode = imageNamingExportMode();
  document.querySelectorAll("input[name='imageSplitExportMode']").forEach((input) => {
    input.checked = input.value === mode;
  });
  document.querySelectorAll(".image-export-mode-switch").forEach((switcher) => {
    switcher.dataset.mode = mode;
  });
}

function imageNamingExportItems() {
  return imageNamingItems().map((item, index) => {
    const output = imageNamingOutputSize(item);
    const nineSlice = imageNamingNineSliceResult(item);
    const groupKey = item.key?.startsWith("frame:")
      ? `group:${item.key.split(":")[1]}`
      : `group:${item.key?.split(":")[0]}`;
    const group = groupKey ? imageNamingGroupByKey(groupKey) : null;
    const batch = group ? imageNamingBatch(group.key, group) : {};
    const compression = state.imageNaming.compression?.[item.key];
    const fallback = item.fallback || `part_${String(index + 1).padStart(2, "0")}`;
    const name = String(state.imageNaming.names[item.key] || fallback).trim() || fallback;
    return {
      key: item.key,
      name,
      source_index: Number(item.sourceIndex ?? 0),
      source_name: item.sourceName || "",
      crop: nineSlice ? null : item.crop || null,
      outputUrl: nineSlice?.outputUrl || "",
      nineSlice: nineSlice
        ? {
            mode: nineSlice.mode,
            lines: nineSlice.lines,
            width: nineSlice.width,
            height: nineSlice.height,
          }
        : null,
      compressed: Boolean(compression),
      compression_level: compression?.compression_level || batch.compressionLevel || "balanced",
      output: {
        width: output.width,
        height: output.height,
        mode: output.mode,
      },
    };
  });
}

function imageNamingSizePresets() {
  state.imageNaming.sizePresets = normalizeImageNamingSizePresets(state.imageNaming.sizePresets);
  return state.imageNaming.sizePresets;
}

function normalizeImageNamingSizePresets(presets) {
  const source = Array.isArray(presets) && presets.length
    ? presets
    : DEFAULT_IMAGE_NAMING_SIZE_PRESETS;
  const seen = new Set();
  const normalized = [];
  source.forEach((preset) => {
    const width = Math.round(Number(preset?.width || 0));
    const height = Math.round(Number(preset?.height || 0));
    if (width <= 0 || height <= 0) {
      return;
    }
    const key = `${width}x${height}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push({
      label: String(preset?.label || `${width} x ${height}`),
      width,
      height,
    });
  });
  return normalized.length
    ? normalized
    : DEFAULT_IMAGE_NAMING_SIZE_PRESETS.map((preset) => ({ ...preset }));
}

function imageNamingSourceSize(item) {
  const crop = item.crop || {};
  const width = Math.max(1, Math.round(Number(item.sourceWidth || crop.w || crop.frameWidth || 1)));
  const height = Math.max(1, Math.round(Number(item.sourceHeight || crop.h || crop.frameHeight || 1)));
  return { width, height };
}

function imageNamingNineSliceResult(itemOrKey) {
  const key = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.key;
  const result = key ? state.imageNaming.nineSlice?.[key] : null;
  if (!result?.outputUrl) {
    return null;
  }
  const width = Math.max(1, Math.round(Number(result.width || 0)));
  const height = Math.max(1, Math.round(Number(result.height || 0)));
  if (!width || !height) {
    return null;
  }
  return {
    ...result,
    width,
    height,
    mode: result.mode === "shrink" ? "shrink" : "stretch",
  };
}

function imageNamingPreviewUrl(item) {
  return imageNamingNineSliceResult(item)?.outputUrl || item?.imageUrl || "";
}

function imageNamingOutputSize(item) {
  const nineSlice = imageNamingNineSliceResult(item);
  if (nineSlice) {
    return { width: nineSlice.width, height: nineSlice.height, mode: `nine-slice-${nineSlice.mode}` };
  }
  const source = imageNamingSourceSize(item);
  const size = state.imageNaming.sizes[item.key];
  if (size?.mode === "none") {
    return { ...source, mode: "none" };
  }
  const width = Math.round(Number(size?.width || 0));
  const height = Math.round(Number(size?.height || 0));
  if (width > 0 && height > 0) {
    return { width, height, mode: "fit" };
  }
  return { ...source, mode: "source" };
}

function imageNamingPartDetail(item) {
  const output = imageNamingOutputSize(item);
  if (output.mode === "none") {
    return `\u5C3A\u5BF8 ${output.width} x ${output.height} / \u4E0D\u7F29\u653E`;
  }
  if (output.mode === "fit") {
    return `\u5C3A\u5BF8 ${output.width} x ${output.height} / \u81EA\u9002\u5E94`;
  }
  if (output.mode === "nine-slice-stretch") {
    return `\u5C3A\u5BF8 ${output.width} x ${output.height} / \u4E5D\u5BAB\u683C\u6269\u56FE`;
  }
  if (output.mode === "nine-slice-shrink") {
    return `\u5C3A\u5BF8 ${output.width} x ${output.height} / \u4E5D\u5BAB\u683C\u7F29\u56FE`;
  }
  return `\u5C3A\u5BF8 ${output.width} x ${output.height}`;
}

function formatImageBytes(bytes) {
  const value = Math.max(0, Number(bytes || 0));
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${Math.round(value)} B`;
}

function imageCompressionLevelLabel(level) {
  if (level === "faithful") {
    return "\u4FDD\u771F";
  }
  if (level === "strong") {
    return "\u9AD8\u538B\u7F29";
  }
  if (level === "extreme") {
    return "\u6781\u9650";
  }
  return "\u5747\u8861";
}

function imageNamingCompressionDetail(item) {
  const result = state.imageNaming.compression?.[item.key];
  if (!result) {
    return "";
  }
  const before = formatImageBytes(result.before_bytes);
  const after = formatImageBytes(result.after_bytes);
  const ratio = Math.round(Number(result.saved_ratio || 0) * 100);
  return `${imageCompressionLevelLabel(result.compression_level)} ${before} -> ${after} / -${ratio}%`;
}

function imageNamingStorageDetail(item) {
  const result = state.imageNaming.compression?.[item.key];
  if (result?.after_bytes) {
    return formatImageBytes(result.after_bytes);
  }
  const nineSlice = imageNamingNineSliceResult(item);
  if (nineSlice?.outputUrl) {
    return formatImageBytes(dataUrlByteLength(nineSlice.outputUrl));
  }
  return "\u8BA1\u7B97\u4E2D";
}

function dataUrlByteLength(dataUrl = "") {
  const value = String(dataUrl || "");
  const commaIndex = value.indexOf(",");
  if (commaIndex < 0) {
    return 0;
  }
  const base64 = value.slice(commaIndex + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function updateImageNamingStorageLabels(key, bytes) {
  if (!key || !bytes) {
    return;
  }
  const label = formatImageBytes(bytes);
  document.querySelectorAll(`[data-naming-byte-meta="${CSS.escape(key)}"]`).forEach((element) => {
    element.textContent = `\u5927\u5C0F ${label}`;
  });
}

function clearImageNamingCompression(keys = null) {
  if (!keys) {
    state.imageNaming.compression = {};
    return;
  }
  keys.forEach((key) => {
    delete state.imageNaming.compression[key];
  });
}

function imageNamingFormatNamePattern(name) {
  const value = String(name || "").trim();
  const fallback = value || "\u4E3B\u4F53";
  const match = fallback.match(/^(.*?)(\d+)$/);
  if (match) {
    return {
      prefix: match[1],
      start: Number(match[2]) + 1,
      digits: match[2].length,
      separator: "",
    };
  }
  return {
    prefix: fallback,
    start: 1,
    digits: 1,
    separator: "_",
  };
}

function imageNamingNameFromPattern(pattern, offset) {
  const sequence = String(Math.max(0, Number(pattern?.start || 1) + Math.max(0, Number(offset || 0))))
    .padStart(Math.max(1, Number(pattern?.digits || 1)), "0");
  return `${pattern?.prefix || "\u4E3B\u4F53"}${pattern?.separator || ""}${sequence}`;
}

function imageNamingFormatBrushFromItem(item) {
  if (!item?.key) {
    return null;
  }
  const output = imageNamingOutputSize(item);
  const currentName = String(state.imageNaming.names[item.key] ?? item.fallback ?? item.label ?? "").trim();
  return {
    sourceKey: item.key,
    size: {
      mode: output.mode === "none" ? "none" : "fit",
      width: Math.max(1, Math.round(Number(output.width || 1))),
      height: Math.max(1, Math.round(Number(output.height || 1))),
    },
    namePattern: imageNamingFormatNamePattern(currentName),
    appliedCount: 0,
  };
}

function toggleImageNamingFormatBrush(itemKey) {
  const item = imageNamingItemByKey(itemKey);
  if (!item) {
    return;
  }
  if (imageNamingFormatBrush?.sourceKey === item.key) {
    cancelImageNamingFormatBrush();
    return;
  }
  imageNamingFormatBrush = imageNamingFormatBrushFromItem(item);
  renderImageNaming();
  setStatus("\u683C\u5F0F\u5237\u5DF2\u542F\u7528\uFF0C\u70B9\u51FB\u5176\u4ED6\u9884\u89C8\u56FE\u5373\u53EF\u5957\u7528\u5C3A\u5BF8\u548C\u547D\u540D\u3002", "success");
}

function cancelImageNamingFormatBrush() {
  if (!imageNamingFormatBrush) {
    return;
  }
  imageNamingFormatBrush = null;
  renderImageNaming();
  setStatus("\u5DF2\u9000\u51FA\u683C\u5F0F\u5237\u3002");
}

function applyImageNamingFormatBrush(itemKey) {
  const brush = imageNamingFormatBrush;
  const target = imageNamingItemByKey(itemKey);
  if (!brush || !target || target.key === brush.sourceKey) {
    return;
  }
  state.imageNaming.sizes[target.key] = brush.size.mode === "none"
    ? { mode: "none" }
    : { mode: "fit", width: brush.size.width, height: brush.size.height };
  state.imageNaming.names[target.key] = imageNamingNameFromPattern(brush.namePattern, brush.appliedCount);
  brush.appliedCount += 1;
  clearImageNamingCompression([target.key]);
  state.imageNaming.confirmed = false;
  renderImageNaming();
  persistSession();
  setStatus("\u5DF2\u5957\u7528\u683C\u5F0F\u5237\u3002", "success");
}

function defaultImageNamingBatch(group) {
  const first = group.parts[0] || {};
  const savedSize = state.imageNaming.sizes[first.key] || {};
  const sourceSize = first.key ? imageNamingSourceSize(first) : { width: "", height: "" };
  const baseName = stripFileExtension(group.title || "\u4E3B\u4F53");
  return {
    width: savedSize.width || sourceSize.width || "",
    height: savedSize.height || sourceSize.height || "",
    mode: savedSize.mode || "fit",
    aspectLocked: true,
    prefix: baseName,
    start: 1,
    digits: 2,
    compressionLevel: "balanced",
  };
}

function imageNamingBatch(groupKey, group = null) {
  if (!state.imageNaming.batch[groupKey]) {
    state.imageNaming.batch[groupKey] = defaultImageNamingBatch(group || { parts: [], title: "" });
  }
  const batch = state.imageNaming.batch[groupKey];
  const first = group?.parts?.[0] || null;
  if (first && (!Number(batch.width || 0) || !Number(batch.height || 0))) {
    const sourceSize = imageNamingSourceSize(first);
    if (!Number(batch.width || 0)) {
      batch.width = sourceSize.width;
    }
    if (!Number(batch.height || 0)) {
      batch.height = sourceSize.height;
    }
  }
  if (state.imageNaming.batch[groupKey].digits == null) {
    state.imageNaming.batch[groupKey].digits = 2;
  }
  if (!state.imageNaming.batch[groupKey].compressionLevel) {
    state.imageNaming.batch[groupKey].compressionLevel = "balanced";
  }
  if (state.imageNaming.batch[groupKey].aspectLocked == null) {
    state.imageNaming.batch[groupKey].aspectLocked = true;
  }
  return state.imageNaming.batch[groupKey];
}

function imageNamingBatchAspectRatio(batch, group) {
  const width = Number(batch?.width || 0);
  const height = Number(batch?.height || 0);
  if (width > 0 && height > 0) {
    return width / height;
  }
  const first = group?.parts?.[0] || null;
  if (first) {
    const source = imageNamingSourceSize(first);
    if (source.width > 0 && source.height > 0) {
      return source.width / source.height;
    }
  }
  return 1;
}

function imageNamingPresetLabel(selectedWidth, selectedHeight) {
  const width = Number(selectedWidth || 0);
  const height = Number(selectedHeight || 0);
  const preset = imageNamingSizePresets().find((item) => {
    return Number(item.width) === width && Number(item.height) === height;
  });
  if (preset) {
    return preset.label || `${width} x ${height}`;
  }
  if (width > 0 && height > 0) {
    return `${width} x ${height}`;
  }
  return "\u9009\u62E9\u9884\u8BBE";
}

function renderImageNamingPresetDropdown(groupKey, selectedWidth, selectedHeight) {
  const presets = imageNamingSizePresets();
  const options = presets.length
    ? presets.map((preset) => {
        const value = `${Number(preset.width)}x${Number(preset.height)}`;
        const selected = Number(selectedWidth) === Number(preset.width) && Number(selectedHeight) === Number(preset.height);
        return `
          <div class="image-naming-preset-row${selected ? " selected" : ""}">
            <button class="image-naming-preset-option" type="button" data-naming-size-preset data-batch-key="${escapeHtml(groupKey)}" data-preset-value="${value}">
              ${escapeHtml(preset.label || value)}
            </button>
            <button class="image-naming-preset-remove" type="button" data-naming-size-remove="${escapeHtml(groupKey)}" data-preset-value="${value}">
              \u79FB\u9664
            </button>
          </div>
        `;
      }).join("")
    : `<div class="image-naming-preset-empty">\u6682\u65E0\u5C3A\u5BF8\u9884\u8BBE</div>`;
  return `
    <details class="image-naming-preset-dropdown">
      <summary>${escapeHtml(imageNamingPresetLabel(selectedWidth, selectedHeight))}</summary>
      <div class="image-naming-preset-menu">
        ${options}
      </div>
    </details>
  `;
}

function renderImageNamingBatchTools(group) {
  const batch = imageNamingBatch(group.key, group);
  return `
    <div class="image-naming-batch-tools" data-naming-group="${escapeHtml(group.key)}">
      <section class="image-naming-batch-card">
        <div class="image-naming-batch-head">
          <strong>\u4FEE\u6539\u8F93\u51FA\u5C3A\u5BF8</strong>
        </div>
        <div class="image-naming-size-grid">
          <label class="field compact-field">
            <span>宽</span>
            <input type="number" min="1" step="1" value="${escapeHtml(batch.width || "")}" data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="width">
          </label>
          <label class="image-naming-ratio-toggle" title="锁定比例" aria-label="锁定比例">
            <input type="checkbox" ${batch.aspectLocked === false ? "" : "checked"} data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="aspectLocked">
            <span class="chain-link-icon" aria-hidden="true"></span>
          </label>
          <label class="field compact-field">
            <span>高</span>
            <input type="number" min="1" step="1" value="${escapeHtml(batch.height || "")}" data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="height">
          </label>
          <button class="ghost-button" type="button" data-naming-size-add="${escapeHtml(group.key)}">\u6DFB\u52A0\u5C3A\u5BF8</button>
          ${renderImageNamingPresetDropdown(group.key, batch.width, batch.height)}
        </div>
        <details class="image-naming-mode-menu">
          <summary>
            <span>适配方式</span>
            <strong>${escapeHtml(imageNamingScaleModeLabel(batch.mode))}</strong>
          </summary>
          <div class="image-naming-mode-menu-list">
            <label><input type="radio" name="naming-size-mode-${escapeHtml(group.key)}" value="fit" ${batch.mode !== "none" ? "checked" : ""} data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="mode"> <span>自适应</span></label>
            <label><input type="radio" name="naming-size-mode-${escapeHtml(group.key)}" value="none" ${batch.mode === "none" ? "checked" : ""} data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="mode"> <span>不缩放</span></label>
          </div>
        </details>
        <button class="primary-button" type="button" data-naming-size-apply="${escapeHtml(group.key)}">\u6279\u91CF\u4FEE\u6539</button>
      </section>
      <section class="image-naming-batch-card">
        <div class="image-naming-batch-head">
          <strong>\u6279\u91CF\u547D\u540D</strong>
        </div>
        <label class="field">
          <span>\u524D\u7F00</span>
          <input type="text" value="${escapeHtml(batch.prefix || "")}" data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="prefix">
        </label>
        <div class="image-naming-name-grid">
          <label class="field">
            <span>\u5E8F\u53F7\u8D77\u59CB</span>
            <input type="number" min="0" step="1" value="${escapeHtml(batch.start ?? 1)}" data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="start">
          </label>
          <label class="field">
            <span>\u5E8F\u53F7\u4F4D\u6570</span>
            <input type="number" min="1" max="12" step="1" value="${escapeHtml(batch.digits ?? 2)}" data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="digits">
          </label>
        </div>
        <button class="primary-button" type="button" data-naming-name-apply="${escapeHtml(group.key)}">\u6279\u91CF\u4FEE\u6539</button>
      </section>
      <label class="field image-compression-field">
        <span>\u538B\u7F29\u7387</span>
        <select data-naming-batch-field data-batch-key="${escapeHtml(group.key)}" data-batch-field="compressionLevel">
          <option value="faithful" ${batch.compressionLevel === "faithful" ? "selected" : ""}>\u4F4E\u538B\u7F29\uFF08256 \u8272\uFF09</option>
          <option value="balanced" ${batch.compressionLevel !== "faithful" && batch.compressionLevel !== "strong" && batch.compressionLevel !== "extreme" ? "selected" : ""}>\u4E2D\u7B49\u538B\u7F29\uFF08128 \u8272\uFF09</option>
          <option value="strong" ${batch.compressionLevel === "strong" ? "selected" : ""}>\u9AD8\u538B\u7F29\uFF0864 \u8272\uFF09</option>
          <option value="extreme" ${batch.compressionLevel === "extreme" ? "selected" : ""}>\u6781\u9650\u538B\u7F29\uFF0832 \u8272\uFF09</option>
        </select>
      </label>
      <button class="primary-button image-compress-button" type="button" data-naming-compress="${escapeHtml(group.key)}">\u538B\u7F29\u8D44\u6E90</button>
    </div>
  `;
}

function imageNamingGroupByKey(groupKey) {
  return imageNamingGroups().find((group) => group.key === groupKey) || null;
}

function updateImageNamingBatchState(input) {
  const groupKey = input.dataset.batchKey;
  const field = input.dataset.batchField;
  if (!groupKey || !field) {
    return;
  }
  const group = imageNamingGroupByKey(groupKey);
  const batch = imageNamingBatch(groupKey, group);
  const ratio = imageNamingBatchAspectRatio(batch, group);
  if (input.type === "checkbox") {
    batch[field] = Boolean(input.checked);
  } else {
    batch[field] = input.type === "radio" ? input.value : input.value;
  }
  if ((field === "width" || field === "height") && batch.aspectLocked !== false) {
    const value = Math.round(Number(input.value || 0));
    if (value > 0 && ratio > 0) {
      if (field === "width") {
        batch.height = Math.max(1, Math.round(value / ratio));
        const heightInput = input.closest("[data-naming-group]")?.querySelector(`[data-batch-field="height"]`);
        if (heightInput) heightInput.value = String(batch.height);
      } else {
        batch.width = Math.max(1, Math.round(value * ratio));
        const widthInput = input.closest("[data-naming-group]")?.querySelector(`[data-batch-field="width"]`);
        if (widthInput) widthInput.value = String(batch.width);
      }
    }
  }
  if (field === "compressionLevel" && group?.parts?.length) {
    clearImageNamingCompression(group.parts.map((item) => item.key));
  }
  state.imageNaming.confirmed = false;
}

function applyImageNamingPresetToInputs(select) {
  const groupKey = select.dataset.batchKey;
  return applyImageNamingPresetValue(groupKey, select.value, select.closest("[data-naming-group]"));
}

function applyImageNamingPresetValue(groupKey, value, root = null) {
  const match = String(value || "").match(/^(\d+)x(\d+)$/);
  if (!groupKey || !match) {
    return;
  }
  const group = imageNamingGroupByKey(groupKey);
  const batch = imageNamingBatch(groupKey, group);
  batch.width = Number(match[1]);
  batch.height = Number(match[2]);
  const widthInput = root?.querySelector(`[data-batch-field="width"]`);
  const heightInput = root?.querySelector(`[data-batch-field="height"]`);
  if (widthInput) widthInput.value = String(batch.width);
  if (heightInput) heightInput.value = String(batch.height);
}

function removeImageNamingSizePreset(groupKey, presetValue = "") {
  const group = imageNamingGroupByKey(groupKey);
  const batch = imageNamingBatch(groupKey, group);
  const match = String(presetValue || "").match(/^(\d+)x(\d+)$/);
  const width = match ? Number(match[1]) : Math.round(Number(batch.width || 0));
  const height = match ? Number(match[2]) : Math.round(Number(batch.height || 0));
  if (width <= 0 || height <= 0) {
    setStatus("\u8BF7\u5148\u9009\u62E9\u6216\u8F93\u5165\u8981\u79FB\u9664\u7684\u5C3A\u5BF8\u9884\u8BBE\u3002", "error");
    return;
  }
  const before = imageNamingSizePresets();
  state.imageNaming.sizePresets = before.filter((preset) => {
    return Number(preset.width) !== width || Number(preset.height) !== height;
  });
  if (state.imageNaming.sizePresets.length === before.length) {
    setStatus("\u5F53\u524D\u5C3A\u5BF8\u4E0D\u5728\u9884\u8BBE\u5217\u8868\u4E2D\u3002", "error");
    return;
  }
  state.imageNaming.confirmed = false;
  renderImageNaming();
  persistSession();
  setStatus(`\u5DF2\u79FB\u9664 ${width} x ${height} \u5C3A\u5BF8\u9884\u8BBE\u3002`, "success");
}

function addImageNamingSizePreset(groupKey) {
  const group = imageNamingGroupByKey(groupKey);
  const batch = imageNamingBatch(groupKey, group);
  const width = Math.round(Number(batch.width || 0));
  const height = Math.round(Number(batch.height || 0));
  if (width <= 0 || height <= 0) {
    setStatus("\u8BF7\u5148\u8F93\u5165\u6709\u6548\u7684\u8F93\u51FA\u5C3A\u5BF8\u3002", "error");
    return;
  }
  const exists = imageNamingSizePresets().some((preset) => Number(preset.width) === width && Number(preset.height) === height);
  if (!exists) {
    state.imageNaming.sizePresets = [...imageNamingSizePresets(), { label: `${width} x ${height}`, width, height }];
  }
  renderImageNaming();
  persistSession();
  setStatus("\u5DF2\u6DFB\u52A0\u5C3A\u5BF8\u9884\u8BBE\u3002", "success");
}

function applyImageNamingBatchSize(groupKey) {
  const group = imageNamingGroupByKey(groupKey);
  if (!group?.parts?.length) {
    return;
  }
  const batch = imageNamingBatch(groupKey, group);
  const mode = batch.mode === "none" ? "none" : "fit";
  const width = Math.round(Number(batch.width || 0));
  const height = Math.round(Number(batch.height || 0));
  if (mode !== "none" && (width <= 0 || height <= 0)) {
    setStatus("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u8F93\u51FA\u5C3A\u5BF8\uFF0C\u6216\u9009\u62E9\u4E0D\u7F29\u653E\u3002", "error");
    return;
  }
  group.parts.forEach((item) => {
    state.imageNaming.sizes[item.key] = mode === "none"
      ? { mode: "none" }
      : { mode: "fit", width, height };
  });
  clearImageNamingCompression(group.parts.map((item) => item.key));
  state.imageNaming.confirmed = false;
  renderImageNaming();
  persistSession();
  setStatus("\u5DF2\u6279\u91CF\u540C\u6B65\u8F93\u51FA\u5C3A\u5BF8\u3002", "success");
}

function applyImageNamingBatchNames(groupKey) {
  const group = imageNamingGroupByKey(groupKey);
  if (!group?.parts?.length) {
    return;
  }
  const batch = imageNamingBatch(groupKey, group);
  const prefix = String(batch.prefix || "\u4E3B\u4F53").trim() || "\u4E3B\u4F53";
  const start = Math.max(0, Math.round(Number(batch.start ?? 1)));
  const digits = clamp(Math.round(Number(batch.digits ?? 2)), 1, 12);
  group.parts.forEach((item, index) => {
    const sequence = String(start + index).padStart(digits, "0");
    state.imageNaming.names[item.key] = `${prefix}_${sequence}`;
  });
  clearImageNamingCompression(group.parts.map((item) => item.key));
  state.imageNaming.confirmed = false;
  renderImageNaming();
  persistSession();
  setStatus("\u5DF2\u6279\u91CF\u540C\u6B65\u547D\u540D\u3002", "success");
}

async function compressImageNamingGroup(groupKey, button) {
  const group = imageNamingGroupByKey(groupKey);
  if (!group?.parts?.length) {
    setStatus("\u6CA1\u6709\u53EF\u538B\u7F29\u7684\u62C6\u56FE\u8D44\u6E90\u3002", "error");
    return;
  }
  if (!state.imageJob?.job_id || !state.imageJob?.processed_dir) {
    setStatus("\u8BF7\u5148\u5B8C\u6210\u62A0\u56FE\uFF0C\u518D\u538B\u7F29\u62C6\u56FE\u8D44\u6E90\u3002", "error");
    return;
  }
  const groupKeys = new Set(group.parts.map((item) => item.key));
  const batch = imageNamingBatch(group.key, group);
  const items = imageNamingExportItems().filter((item) => groupKeys.has(item.key));
  await withBusy(button, async () => {
    setStatus("\u6B63\u5728\u538B\u7F29\u62C6\u56FE\u8D44\u6E90...");
    const data = await apiJson("/api/compress-image-split-result", {
      method: "POST",
      body: {
        job_id: state.imageJob.job_id,
        items,
        compression_level: batch.compressionLevel || "balanced",
      },
    });
    state.imageNaming.compression ||= {};
    (data.compression?.frames || []).forEach((frame) => {
      if (frame.key) {
        state.imageNaming.compression[frame.key] = frame;
      }
    });
    state.imageNaming.confirmed = false;
    renderImageNaming();
    persistSession();
    const frames = data.compression?.frames || [];
    const before = frames.reduce((sum, frame) => sum + Number(frame.before_bytes || 0), 0);
    const after = frames.reduce((sum, frame) => sum + Number(frame.after_bytes || 0), 0);
    const ratio = before ? Math.round((1 - after / before) * 100) : 0;
    setStatus(`\u5DF2\u538B\u7F29 ${frames.length} \u4E2A\u8D44\u6E90\uFF1A${formatImageBytes(before)} -> ${formatImageBytes(after)}\uFF0C\u8282\u7701 ${Math.max(0, ratio)}%\u3002`, "success");
  });
}

function imageNamingCropAttrs(item) {
  const source = imageNamingSourceSize(item);
  const crop = item.crop || {
    x: 0,
    y: 0,
    w: source.width,
    h: source.height,
    frameWidth: source.width,
    frameHeight: source.height,
  };
  const output = imageNamingOutputSize(item);
  if (!item.imageUrl) {
    return "";
  }
  return [
    `data-naming-crop="1"`,
    `data-crop-src="${escapeHtml(item.imageUrl)}"`,
    `data-crop-x="${Number(crop.x || 0)}"`,
    `data-crop-y="${Number(crop.y || 0)}"`,
    `data-crop-w="${Number(crop.w || 1)}"`,
    `data-crop-h="${Number(crop.h || 1)}"`,
    `data-frame-w="${Number(crop.frameWidth || 1)}"`,
    `data-frame-h="${Number(crop.frameHeight || 1)}"`,
    `data-output-w="${Number(output.width || source.width || 1)}"`,
    `data-output-h="${Number(output.height || source.height || 1)}"`,
    `data-output-mode="${escapeHtml(output.mode || "source")}"`,
  ].join(" ");
}

function polishTransparentCanvasEdges(ctx, width, height, passes = 2) {
  const pixelCount = Math.max(0, width * height);
  if (!ctx || pixelCount <= 0 || pixelCount > 5000000) {
    return;
  }
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let pass = 0; pass < passes; pass += 1) {
      const source = new Uint8ClampedArray(data);
      let changed = false;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 4;
          const alpha = source[offset + 3];
          if (alpha <= 0) {
            continue;
          }
          let minAlpha = alpha;
          let maxAlpha = alpha;
          let alphaSum = 0;
          let sampleCount = 0;
          let colorWeight = 0;
          let redSum = 0;
          let greenSum = 0;
          let blueSum = 0;
          for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny += 1) {
            for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx += 1) {
              const nextOffset = (ny * width + nx) * 4;
              const nextAlpha = source[nextOffset + 3];
              minAlpha = Math.min(minAlpha, nextAlpha);
              maxAlpha = Math.max(maxAlpha, nextAlpha);
              alphaSum += nextAlpha;
              sampleCount += 1;
              if (nextAlpha > 0) {
                redSum += source[nextOffset] * nextAlpha;
                greenSum += source[nextOffset + 1] * nextAlpha;
                blueSum += source[nextOffset + 2] * nextAlpha;
                colorWeight += nextAlpha;
              }
            }
          }
          if (maxAlpha - minAlpha < 20 || minAlpha > 8) {
            continue;
          }
          const averageAlpha = alphaSum / Math.max(1, sampleCount);
          const softenedAlpha = Math.min(alpha, Math.round(alpha * 0.42 + averageAlpha * 0.58));
          data[offset + 3] = softenedAlpha <= 2 ? 0 : softenedAlpha >= 253 ? 255 : softenedAlpha;
          if (colorWeight > 0) {
            data[offset] = Math.round(source[offset] * 0.65 + (redSum / colorWeight) * 0.35);
            data[offset + 1] = Math.round(source[offset + 1] * 0.65 + (greenSum / colorWeight) * 0.35);
            data[offset + 2] = Math.round(source[offset + 2] * 0.65 + (blueSum / colorWeight) * 0.35);
          }
          changed = true;
        }
      }
      if (!changed) {
        break;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } catch (error) {
    console.warn("canvas edge polish failed", error);
  }
}

function cropCanvasDataUrl(source, crop, options = {}) {
  const scaleX = source.naturalWidth / Math.max(1, crop.frameWidth);
  const scaleY = source.naturalHeight / Math.max(1, crop.frameHeight);
  const x = clamp(Math.round(crop.x), 0, Math.max(0, crop.frameWidth - 1));
  const y = clamp(Math.round(crop.y), 0, Math.max(0, crop.frameHeight - 1));
  const right = clamp(Math.round(crop.x + crop.w), x + 1, crop.frameWidth);
  const bottom = clamp(Math.round(crop.y + crop.h), y + 1, crop.frameHeight);
  const sx = Math.round(x * scaleX);
  const sy = Math.round(y * scaleY);
  const sw = Math.max(1, Math.round((right - x) * scaleX));
  const sh = Math.max(1, Math.round((bottom - y) * scaleY));
  const sourceWidth = Math.max(1, right - x);
  const sourceHeight = Math.max(1, bottom - y);
  const outputWidth = Math.max(1, Math.round(Number(crop.outputWidth || sourceWidth)));
  const outputHeight = Math.max(1, Math.round(Number(crop.outputHeight || sourceHeight)));
  const maxSide = Number(options.maxSide || 0);
  const scale = maxSide > 0 ? Math.min(1, maxSide / Math.max(outputWidth, outputHeight)) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(outputWidth * scale));
  canvas.height = Math.max(1, Math.round(outputHeight * scale));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let dx = 0;
  let dy = 0;
  let dw = outputWidth;
  let dh = outputHeight;
  if (crop.outputMode === "fit") {
    const fitScale = Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight);
    dw = Math.max(1, sourceWidth * fitScale);
    dh = Math.max(1, sourceHeight * fitScale);
    dx = (outputWidth - dw) / 2;
    dy = (outputHeight - dh) / 2;
  }
  ctx.drawImage(
    source,
    sx,
    sy,
    sw,
    sh,
    Math.round(dx * scale),
    Math.round(dy * scale),
    Math.max(1, Math.round(dw * scale)),
    Math.max(1, Math.round(dh * scale))
  );
  polishTransparentCanvasEdges(ctx, canvas.width, canvas.height, scale < 1 ? 1 : 2);
  return canvas.toDataURL("image/png");
}

function normalizeNineSliceLines(lines, width, height) {
  const w = Math.max(2, Math.round(Number(width || 2)));
  const h = Math.max(2, Math.round(Number(height || 2)));
  const left = clamp(Math.round(Number(lines?.left ?? w * 0.33)), 0, w - 1);
  const right = clamp(Math.round(Number(lines?.right ?? w * 0.66)), left + 1, w);
  const top = clamp(Math.round(Number(lines?.top ?? h * 0.33)), 0, h - 1);
  const bottom = clamp(Math.round(Number(lines?.bottom ?? h * 0.66)), top + 1, h);
  return { left, right, top, bottom };
}

function drawImagePiece(ctx, source, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) {
    return;
  }
  ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
}

function nineSliceStretchCanvas(source, lines, targetWidth, targetHeight) {
  const sourceWidth = Math.max(1, source.naturalWidth || source.width || 1);
  const sourceHeight = Math.max(1, source.naturalHeight || source.height || 1);
  const normalized = normalizeNineSliceLines(lines, sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(Number(targetWidth || sourceWidth)));
  canvas.height = Math.max(1, Math.round(Number(targetHeight || sourceHeight)));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sourceXs = [0, normalized.left, normalized.right, sourceWidth];
  const sourceYs = [0, normalized.top, normalized.bottom, sourceHeight];
  const fixedLeft = Math.min(normalized.left, Math.floor(canvas.width / 2));
  const fixedRight = Math.min(sourceWidth - normalized.right, Math.max(0, canvas.width - fixedLeft));
  const fixedTop = Math.min(normalized.top, Math.floor(canvas.height / 2));
  const fixedBottom = Math.min(sourceHeight - normalized.bottom, Math.max(0, canvas.height - fixedTop));
  const destXs = [0, fixedLeft, Math.max(fixedLeft, canvas.width - fixedRight), canvas.width];
  const destYs = [0, fixedTop, Math.max(fixedTop, canvas.height - fixedBottom), canvas.height];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      drawImagePiece(
        ctx,
        source,
        sourceXs[column],
        sourceYs[row],
        sourceXs[column + 1] - sourceXs[column],
        sourceYs[row + 1] - sourceYs[row],
        destXs[column],
        destYs[row],
        destXs[column + 1] - destXs[column],
        destYs[row + 1] - destYs[row]
      );
    }
  }
  return canvas;
}

function nineSliceShrinkCanvas(source, lines) {
  const sourceWidth = Math.max(1, source.naturalWidth || source.width || 1);
  const sourceHeight = Math.max(1, source.naturalHeight || source.height || 1);
  const normalized = normalizeNineSliceLines(lines, sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, normalized.left + (sourceWidth - normalized.right));
  canvas.height = Math.max(1, normalized.top + (sourceHeight - normalized.bottom));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawImagePiece(ctx, source, 0, 0, normalized.left, normalized.top, 0, 0, normalized.left, normalized.top);
  drawImagePiece(ctx, source, normalized.right, 0, sourceWidth - normalized.right, normalized.top, normalized.left, 0, sourceWidth - normalized.right, normalized.top);
  drawImagePiece(ctx, source, 0, normalized.bottom, normalized.left, sourceHeight - normalized.bottom, 0, normalized.top, normalized.left, sourceHeight - normalized.bottom);
  drawImagePiece(ctx, source, normalized.right, normalized.bottom, sourceWidth - normalized.right, sourceHeight - normalized.bottom, normalized.left, normalized.top, sourceWidth - normalized.right, sourceHeight - normalized.bottom);
  return canvas;
}

function renderNineSliceOutputCanvas(source, state = imageNineSliceEditorState) {
  if (!source || !state) {
    return null;
  }
  return state.mode === "shrink"
    ? nineSliceShrinkCanvas(source, state.lines)
    : nineSliceStretchCanvas(source, state.lines, state.targetWidth, state.targetHeight);
}

function imageNamingLightboxCrop(item) {
  const source = imageNamingSourceSize(item);
  const crop = item.crop || {
    x: 0,
    y: 0,
    w: source.width,
    h: source.height,
    frameWidth: source.width,
    frameHeight: source.height,
  };
  const output = imageNamingOutputSize(item);
  return {
    x: Number(crop.x || 0),
    y: Number(crop.y || 0),
    w: Number(crop.w || 1),
    h: Number(crop.h || 1),
    frameWidth: Number(crop.frameWidth || source.width || 1),
    frameHeight: Number(crop.frameHeight || source.height || 1),
    outputWidth: Number(output.width || source.width || 1),
    outputHeight: Number(output.height || source.height || 1),
    outputMode: output.mode || "source",
  };
}

function imageNamingLightboxCaption(item) {
  const output = imageNamingOutputSize(item);
  const name = String(state.imageNaming.names[item.key] || item.fallback || item.label || "").trim() || item.label || "";
  return `${name} / ${Math.max(1, output.width)} x ${Math.max(1, output.height)}`;
}

function imageNamingScaleModeLabel(mode) {
  return mode === "none" ? "不缩放" : "自适应";
}

function imageLightboxCurrentSizeRatio(fallbackItem = null) {
  const inputWidth = Number(els.imageLightboxWidthInput?.value);
  const inputHeight = Number(els.imageLightboxHeightInput?.value);
  if (Number.isFinite(inputWidth) && Number.isFinite(inputHeight) && inputWidth > 0 && inputHeight > 0) {
    return inputWidth / inputHeight;
  }
  if (fallbackItem) {
    const output = imageNamingOutputSize(fallbackItem);
    return Math.max(0.0001, Math.max(1, Number(output.width || 1)) / Math.max(1, Number(output.height || 1)));
  }
  return 1;
}

function renderImageLightboxNamingEditor() {
  const editor = els.imageLightboxNamingEditor;
  const context = imageLightboxEditContext;
  const item = context?.itemKey ? imageNamingItemByKey(context.itemKey) : null;
  if (!editor || !item) {
    if (editor) editor.hidden = true;
    els.imageLightbox?.classList.toggle("has-naming-editor", false);
    if (els.imageLightboxNineSliceButton) els.imageLightboxNineSliceButton.hidden = true;
    return;
  }
  const output = imageNamingOutputSize(item);
  const source = imageNamingSourceSize(item);
  const isNone = output.mode === "none";
  const name = String(state.imageNaming.names[item.key] ?? item.fallback ?? item.label ?? "");
  if (context && !context.aspectRatio) {
    context.aspectRatio = Math.max(0.0001, Math.max(1, Number(output.width || source.width || 1)) / Math.max(1, Number(output.height || source.height || 1)));
  }
  editor.hidden = false;
  if (els.imageLightboxNameInput) {
    els.imageLightboxNameInput.value = name;
  }
  if (els.imageLightboxWidthInput) {
    els.imageLightboxWidthInput.value = String(Math.max(1, output.width || source.width));
    els.imageLightboxWidthInput.disabled = isNone;
  }
  if (els.imageLightboxHeightInput) {
    els.imageLightboxHeightInput.value = String(Math.max(1, output.height || source.height));
    els.imageLightboxHeightInput.disabled = isNone;
  }
  if (els.imageLightboxAspectLockInput) {
    els.imageLightboxAspectLockInput.checked = context.aspectLocked !== false;
    els.imageLightboxAspectLockInput.disabled = isNone;
  }
  if (els.imageLightboxFitModeInput) {
    els.imageLightboxFitModeInput.checked = !isNone;
  }
  if (els.imageLightboxNoneModeInput) {
    els.imageLightboxNoneModeInput.checked = isNone;
  }
  if (els.imageLightboxModeLabel) {
    els.imageLightboxModeLabel.textContent = imageNamingScaleModeLabel(isNone ? "none" : "fit");
  }
  els.imageLightbox?.classList.toggle("has-naming-editor", true);
  if (els.imageLightboxNineSliceButton) {
    els.imageLightboxNineSliceButton.hidden = false;
  }
  if (els.imageLightboxCaption) {
    els.imageLightboxCaption.textContent = imageNamingLightboxCaption(item);
  }
}

function markImageNamingItemEdited(itemKey, { render = true, clearCompression = true } = {}) {
  if (!itemKey) {
    return;
  }
  if (clearCompression) {
    state.imageNaming.compression ||= {};
    delete state.imageNaming.compression[itemKey];
  }
  state.imageNaming.confirmed = false;
  if (render) {
    renderImageNaming();
  }
  persistSession();
}

async function refreshImageLightboxNamingPreview() {
  const context = imageLightboxEditContext;
  if (!context?.itemKey || !context.sourceImage || !els.imageLightboxImage) {
    return;
  }
  const item = imageNamingItemByKey(context.itemKey);
  if (!item) {
    return;
  }
  try {
    els.imageLightboxImage.src = cropCanvasDataUrl(context.sourceImage, imageNamingLightboxCrop(item), { maxSide: 0 });
    els.imageLightboxCaption.textContent = imageNamingLightboxCaption(item);
  } catch (error) {
    console.warn("image naming lightbox refresh failed", error);
  }
}

function updateImageLightboxNamingName() {
  const context = imageLightboxEditContext;
  const itemKey = context?.itemKey || "";
  if (!itemKey || !els.imageLightboxNameInput) {
    return;
  }
  state.imageNaming.names[itemKey] = els.imageLightboxNameInput.value;
  markImageNamingItemEdited(itemKey, { render: false, clearCompression: false });
  const selector = `[data-image-name-key="${CSS.escape(itemKey)}"]`;
  document.querySelectorAll(selector).forEach((input) => {
    if (input !== document.activeElement) {
      input.value = els.imageLightboxNameInput.value;
    }
  });
  const item = imageNamingItemByKey(itemKey);
  if (item && els.imageLightboxCaption) {
    els.imageLightboxCaption.textContent = imageNamingLightboxCaption(item);
  }
}

function updateImageLightboxNamingSize(event) {
  const context = imageLightboxEditContext;
  const item = context?.itemKey ? imageNamingItemByKey(context.itemKey) : null;
  if (!item || !els.imageLightboxWidthInput || !els.imageLightboxHeightInput) {
    return;
  }
  if (els.imageLightboxNoneModeInput?.checked) {
    state.imageNaming.sizes[item.key] = { mode: "none" };
    markImageNamingItemEdited(item.key);
    void refreshImageLightboxNamingPreview();
    return;
  }
  const rawWidth = Number(els.imageLightboxWidthInput.value);
  const rawHeight = Number(els.imageLightboxHeightInput.value);
  if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawWidth <= 0 || rawHeight <= 0) {
    return;
  }
  const source = imageNamingSourceSize(item);
  const ratio = Math.max(0.0001, Number(context.aspectRatio || imageLightboxCurrentSizeRatio(item)));
  let width = Math.max(1, Math.round(rawWidth));
  let height = Math.max(1, Math.round(rawHeight));
  if (els.imageLightboxAspectLockInput?.checked && event?.target === els.imageLightboxWidthInput) {
    height = Math.max(1, Math.round(width / ratio));
    els.imageLightboxHeightInput.value = String(height);
  } else if (els.imageLightboxAspectLockInput?.checked && event?.target === els.imageLightboxHeightInput) {
    width = Math.max(1, Math.round(height * ratio));
    els.imageLightboxWidthInput.value = String(width);
  }
  state.imageNaming.sizes[item.key] = { width, height, mode: "fit" };
  markImageNamingItemEdited(item.key);
  void refreshImageLightboxNamingPreview();
}

function updateImageLightboxNamingMode() {
  const context = imageLightboxEditContext;
  const item = context?.itemKey ? imageNamingItemByKey(context.itemKey) : null;
  if (!item) {
    return;
  }
  if (els.imageLightboxNoneModeInput?.checked) {
    state.imageNaming.sizes[item.key] = { mode: "none" };
  } else {
    const source = imageNamingSourceSize(item);
    const width = Math.max(1, Math.round(Number(els.imageLightboxWidthInput?.value || source.width)));
    const height = Math.max(1, Math.round(Number(els.imageLightboxHeightInput?.value || source.height)));
    state.imageNaming.sizes[item.key] = { width, height, mode: "fit" };
  }
  markImageNamingItemEdited(item.key);
  renderImageLightboxNamingEditor();
  void refreshImageLightboxNamingPreview();
}

function imageNineSliceCurrentItem() {
  const itemKey = imageNineSliceEditorState?.itemKey || imageLightboxEditContext?.itemKey || "";
  return itemKey ? imageNamingItemByKey(itemKey) : null;
}

function setImageNineSliceStatus(message) {
  if (els.imageNineSliceStatus) {
    els.imageNineSliceStatus.textContent = message || "";
  }
}

function imageNineSliceSourceSize() {
  const source = imageNineSliceEditorState?.sourceImage;
  return {
    width: Math.max(1, Number(source?.naturalWidth || source?.width || 1)),
    height: Math.max(1, Number(source?.naturalHeight || source?.height || 1)),
  };
}

function fillImageNineSliceDisplayBackground(ctx, width, height) {
  const mode = state.imageLightboxBackground.mode === "transparent" ? "transparent" : "opaque";
  if (mode !== "transparent") {
    ctx.fillStyle = normalizeLightboxBackgroundColor(state.imageLightboxBackground.color);
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const cell = 20;
  ctx.fillStyle = "#fffef9";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(5, 5, 5, 0.08)";
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      if (((x / cell) + (y / cell)) % 2 === 0) {
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
}

function syncImageNineSliceInputs() {
  if (!imageNineSliceEditorState) {
    return;
  }
  const { width, height } = imageNineSliceSourceSize();
  imageNineSliceEditorState.lines = normalizeNineSliceLines(imageNineSliceEditorState.lines, width, height);
  const { left, right, top, bottom } = imageNineSliceEditorState.lines;
  if (els.imageNineSliceLeftInput) {
    els.imageNineSliceLeftInput.value = String(left);
    els.imageNineSliceLeftInput.max = String(width - 1);
  }
  if (els.imageNineSliceRightInput) {
    els.imageNineSliceRightInput.value = String(Math.max(0, width - right));
    els.imageNineSliceRightInput.max = String(width - 1);
  }
  if (els.imageNineSliceTopInput) {
    els.imageNineSliceTopInput.value = String(top);
    els.imageNineSliceTopInput.max = String(height - 1);
  }
  if (els.imageNineSliceBottomInput) {
    els.imageNineSliceBottomInput.value = String(Math.max(0, height - bottom));
    els.imageNineSliceBottomInput.max = String(height - 1);
  }
  if (els.imageNineSliceTargetWidthInput) {
    els.imageNineSliceTargetWidthInput.value = String(imageNineSliceEditorState.targetWidth);
    els.imageNineSliceTargetWidthInput.disabled = imageNineSliceEditorState.mode === "shrink";
  }
  if (els.imageNineSliceTargetHeightInput) {
    els.imageNineSliceTargetHeightInput.value = String(imageNineSliceEditorState.targetHeight);
    els.imageNineSliceTargetHeightInput.disabled = imageNineSliceEditorState.mode === "shrink";
  }
  if (els.imageNineSliceStretchModeInput) els.imageNineSliceStretchModeInput.checked = imageNineSliceEditorState.mode !== "shrink";
  if (els.imageNineSliceShrinkModeInput) els.imageNineSliceShrinkModeInput.checked = imageNineSliceEditorState.mode === "shrink";
  if (els.imageNineSliceEditor) {
    els.imageNineSliceEditor.dataset.mode = imageNineSliceEditorState.mode;
  }
}

function fitImageNineSliceView() {
  if (!imageNineSliceEditorState || !els.imageNineSliceCanvas) {
    return;
  }
  const rect = els.imageNineSliceCanvas.getBoundingClientRect();
  const { width, height } = imageNineSliceSourceSize();
  const scale = Math.min(rect.width / width, rect.height / height) * 0.92;
  imageNineSliceEditorState.zoom = clamp(scale || 1, 0.1, 12);
  imageNineSliceEditorState.pan = { x: 0, y: 0 };
  renderImageNineSliceEditor();
}

function imageNineSliceImageRect() {
  const state = imageNineSliceEditorState;
  const canvas = els.imageNineSliceCanvas;
  if (!state || !canvas) {
    return null;
  }
  const { width, height } = imageNineSliceSourceSize();
  const rect = canvas.getBoundingClientRect();
  const dpr = canvas.width / Math.max(1, rect.width);
  const scale = Number(state.zoom || 1) * dpr;
  const imageWidth = width * scale;
  const imageHeight = height * scale;
  const x = (canvas.width - imageWidth) / 2 + Number(state.pan?.x || 0) * dpr;
  const y = (canvas.height - imageHeight) / 2 + Number(state.pan?.y || 0) * dpr;
  return { x, y, width: imageWidth, height: imageHeight, scale };
}

function renderImageNineSliceEditorCanvas() {
  const state = imageNineSliceEditorState;
  const canvas = els.imageNineSliceCanvas;
  const source = state?.sourceImage;
  if (!state || !canvas || !source) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);
  const cssRect = {
    width: canvas.width / dpr,
    height: canvas.height / dpr,
  };
  const imageRect = imageNineSliceImageRect();
  const scaledRect = {
    x: imageRect.x / dpr,
    y: imageRect.y / dpr,
    width: imageRect.width / dpr,
    height: imageRect.height / dpr,
    scale: imageRect.scale / dpr,
  };
  fillImageNineSliceDisplayBackground(ctx, cssRect.width, cssRect.height);
  ctx.drawImage(source, scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height);
  ctx.strokeStyle = "rgba(5, 5, 5, 0.72)";
  ctx.lineWidth = 2;
  ctx.strokeRect(scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height);
  const lines = state.lines;
  const xLines = [lines.left, lines.right].map((value) => scaledRect.x + value * scaledRect.scale);
  const yLines = [lines.top, lines.bottom].map((value) => scaledRect.y + value * scaledRect.scale);
  ctx.strokeStyle = "#ff3b4d";
  ctx.lineWidth = 2;
  xLines.forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, scaledRect.y);
    ctx.lineTo(x, scaledRect.y + scaledRect.height);
    ctx.stroke();
  });
  yLines.forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(scaledRect.x, y);
    ctx.lineTo(scaledRect.x + scaledRect.width, y);
    ctx.stroke();
  });
  ctx.fillStyle = "rgba(255, 59, 77, 0.12)";
  ctx.fillRect(xLines[0], yLines[0], xLines[1] - xLines[0], yLines[1] - yLines[0]);
  const handlePoints = [
    { key: "left", x: xLines[0], y: scaledRect.y + scaledRect.height / 2 },
    { key: "right", x: xLines[1], y: scaledRect.y + scaledRect.height / 2 },
    { key: "top", x: scaledRect.x + scaledRect.width / 2, y: yLines[0] },
    { key: "bottom", x: scaledRect.x + scaledRect.width / 2, y: yLines[1] },
  ];
  handlePoints.forEach((point) => {
    const active = state.dragLine === point.key;
    ctx.beginPath();
    ctx.arc(point.x, point.y, active ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = active ? "#050505" : "#fffef9";
    ctx.fill();
    ctx.lineWidth = active ? 3 : 2;
    ctx.strokeStyle = "#ff3b4d";
    ctx.stroke();
  });
  ctx.restore();
  state.view = imageRect;
}

function drawCanvasIntoPreview(sourceCanvas) {
  const canvas = els.imageNineSlicePreviewCanvas;
  if (!canvas || !sourceCanvas) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);
  fillImageNineSliceDisplayBackground(ctx, rect.width, rect.height);
  const previewPadding = 24;
  const availableWidth = Math.max(1, rect.width - previewPadding);
  const availableHeight = Math.max(1, rect.height - previewPadding);
  const scale = Math.min(1, availableWidth / sourceCanvas.width, availableHeight / sourceCanvas.height);
  const width = sourceCanvas.width * scale;
  const height = sourceCanvas.height * scale;
  const x = (rect.width - width) / 2;
  const y = (rect.height - height) / 2;
  ctx.drawImage(sourceCanvas, x, y, width, height);
  ctx.strokeStyle = "rgba(5, 5, 5, 0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
  const stage = canvas.closest(".image-nine-slice-preview-stage");
  if (stage) {
    stage.style.setProperty("--preview-left", `${x}px`);
    stage.style.setProperty("--preview-top", `${y}px`);
    stage.style.setProperty("--preview-right", `${x + width}px`);
    stage.style.setProperty("--preview-bottom", `${y + height}px`);
    stage.style.setProperty("--preview-center-x", `${x + width / 2}px`);
    stage.style.setProperty("--preview-center-y", `${y + height / 2}px`);
  }
}

function renderImageNineSlicePreview() {
  const state = imageNineSliceEditorState;
  if (!state?.sourceImage) {
    return;
  }
  const outputCanvas = renderNineSliceOutputCanvas(state.sourceImage, state);
  state.outputCanvas = outputCanvas;
  drawCanvasIntoPreview(outputCanvas);
  setImageNineSliceStatus(
    state.mode === "shrink"
      ? `缩图结果 ${outputCanvas.width} x ${outputCanvas.height}`
      : `扩图结果 ${outputCanvas.width} x ${outputCanvas.height}`
  );
}

function renderImageNineSliceEditor() {
  if (!imageNineSliceEditorState) {
    return;
  }
  syncImageNineSliceInputs();
  renderImageNineSliceEditorCanvas();
  renderImageNineSlicePreview();
}

function updateImageNineSliceLinesFromInputs() {
  if (!imageNineSliceEditorState) {
    return;
  }
  const { width, height } = imageNineSliceSourceSize();
  const leftDistance = Math.max(0, Math.round(Number(els.imageNineSliceLeftInput?.value || 0)));
  const rightDistance = Math.max(0, Math.round(Number(els.imageNineSliceRightInput?.value || 0)));
  const topDistance = Math.max(0, Math.round(Number(els.imageNineSliceTopInput?.value || 0)));
  const bottomDistance = Math.max(0, Math.round(Number(els.imageNineSliceBottomInput?.value || 0)));
  imageNineSliceEditorState.lines = normalizeNineSliceLines({
    left: leftDistance,
    right: width - rightDistance,
    top: topDistance,
    bottom: height - bottomDistance,
  }, width, height);
  renderImageNineSliceEditor();
}

function updateImageNineSliceMode() {
  if (!imageNineSliceEditorState) {
    return;
  }
  imageNineSliceEditorState.mode = els.imageNineSliceShrinkModeInput?.checked ? "shrink" : "stretch";
  renderImageNineSliceEditor();
}

function updateImageNineSliceTarget() {
  if (!imageNineSliceEditorState || imageNineSliceEditorState.mode === "shrink") {
    return;
  }
  imageNineSliceEditorState.targetWidth = Math.max(1, Math.round(Number(els.imageNineSliceTargetWidthInput?.value || 1)));
  imageNineSliceEditorState.targetHeight = Math.max(1, Math.round(Number(els.imageNineSliceTargetHeightInput?.value || 1)));
  renderImageNineSliceEditor();
}

function imageNineSlicePointerToSource(event) {
  const state = imageNineSliceEditorState;
  const canvas = els.imageNineSliceCanvas;
  if (!state?.view || !canvas) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  return {
    x: (x - state.view.x) / state.view.scale,
    y: (y - state.view.y) / state.view.scale,
  };
}

function imageNineSliceLineHitTarget(event) {
  const state = imageNineSliceEditorState;
  if (!state?.view) {
    return null;
  }
  const point = imageNineSlicePointerToSource(event);
  if (!point) {
    return null;
  }
  const { width, height } = imageNineSliceSourceSize();
  const canvas = els.imageNineSliceCanvas;
  const rect = canvas?.getBoundingClientRect();
  const dpr = canvas && rect ? canvas.width / Math.max(1, rect.width) : window.devicePixelRatio || 1;
  const threshold = 22 * dpr / Math.max(0.001, state.view.scale);
  const lines = state.lines;
  const candidates = [];
  if (point.y >= -threshold && point.y <= height + threshold) {
    candidates.push(["left", Math.abs(point.x - lines.left), "ew-resize"]);
    candidates.push(["right", Math.abs(point.x - lines.right), "ew-resize"]);
  }
  if (point.x >= -threshold && point.x <= width + threshold) {
    candidates.push(["top", Math.abs(point.y - lines.top), "ns-resize"]);
    candidates.push(["bottom", Math.abs(point.y - lines.bottom), "ns-resize"]);
  }
  const target = candidates
    .filter((candidate) => candidate[1] <= threshold)
    .sort((a, b) => a[1] - b[1])[0];
  return target ? { line: target[0], cursor: target[2] } : null;
}

function beginImageNineSliceLineDrag(event) {
  if (!imageNineSliceEditorState) {
    return;
  }
  const target = imageNineSliceLineHitTarget(event);
  if (!target) {
    return;
  }
  event.preventDefault();
  imageNineSliceEditorState.dragLine = target.line;
  els.imageNineSliceCanvas?.setPointerCapture?.(event.pointerId);
  renderImageNineSliceEditor();
}

function moveImageNineSliceLineDrag(event) {
  const state = imageNineSliceEditorState;
  if (!state?.dragLine) {
    const target = imageNineSliceLineHitTarget(event);
    if (els.imageNineSliceCanvas) {
      els.imageNineSliceCanvas.style.cursor = target?.cursor || "crosshair";
    }
    return;
  }
  const point = imageNineSlicePointerToSource(event);
  if (!point) {
    return;
  }
  const { width, height } = imageNineSliceSourceSize();
  const next = { ...state.lines };
  if (state.dragLine === "left") next.left = clamp(Math.round(point.x), 0, next.right - 1);
  if (state.dragLine === "right") next.right = clamp(Math.round(point.x), next.left + 1, width);
  if (state.dragLine === "top") next.top = clamp(Math.round(point.y), 0, next.bottom - 1);
  if (state.dragLine === "bottom") next.bottom = clamp(Math.round(point.y), next.top + 1, height);
  state.lines = normalizeNineSliceLines(next, width, height);
  renderImageNineSliceEditor();
}

function endImageNineSliceLineDrag(event) {
  if (!imageNineSliceEditorState) {
    return;
  }
  imageNineSliceEditorState.dragLine = "";
  const target = imageNineSliceLineHitTarget(event);
  if (els.imageNineSliceCanvas) {
    els.imageNineSliceCanvas.style.cursor = target?.cursor || "crosshair";
  }
  els.imageNineSliceCanvas?.releasePointerCapture?.(event.pointerId);
  renderImageNineSliceEditor();
}

function resizeImageNineSliceTarget(direction, event) {
  if (!imageNineSliceEditorState || imageNineSliceEditorState.mode === "shrink") {
    return;
  }
  if (imageNineSliceEditorState.suppressResizeClick) {
    imageNineSliceEditorState.suppressResizeClick = false;
    event.preventDefault();
    return;
  }
  event.preventDefault();
  const delta = event.shiftKey ? 8 : 32;
  const horizontal = direction.includes("e") ? delta : direction.includes("w") ? -delta : 0;
  const vertical = direction.includes("s") ? delta : direction.includes("n") ? -delta : 0;
  imageNineSliceEditorState.targetWidth = Math.max(1, imageNineSliceEditorState.targetWidth + horizontal);
  imageNineSliceEditorState.targetHeight = Math.max(1, imageNineSliceEditorState.targetHeight + vertical);
  renderImageNineSliceEditor();
}

function beginImageNineSliceTargetResize(event) {
  const handle = event.target?.closest?.("[data-nine-slice-resize]");
  if (!handle || !imageNineSliceEditorState || imageNineSliceEditorState.mode === "shrink") {
    return;
  }
  event.preventDefault();
  imageNineSliceEditorState.resize = {
    direction: handle.dataset.nineSliceResize || "",
    startX: event.clientX,
    startY: event.clientY,
    width: imageNineSliceEditorState.targetWidth,
    height: imageNineSliceEditorState.targetHeight,
  };
  handle.setPointerCapture?.(event.pointerId);
}

function moveImageNineSliceTargetResize(event) {
  const resize = imageNineSliceEditorState?.resize;
  if (!resize) {
    return;
  }
  const dx = event.clientX - resize.startX;
  const dy = event.clientY - resize.startY;
  const horizontal = resize.direction.includes("e") ? dx : resize.direction.includes("w") ? -dx : 0;
  const vertical = resize.direction.includes("s") ? dy : resize.direction.includes("n") ? -dy : 0;
  resize.moved = resize.moved || Math.abs(dx) > 2 || Math.abs(dy) > 2;
  imageNineSliceEditorState.targetWidth = Math.max(1, Math.round(resize.width + horizontal));
  imageNineSliceEditorState.targetHeight = Math.max(1, Math.round(resize.height + vertical));
  renderImageNineSliceEditor();
}

function endImageNineSliceTargetResize(event) {
  if (!imageNineSliceEditorState?.resize) {
    return;
  }
  imageNineSliceEditorState.suppressResizeClick = Boolean(imageNineSliceEditorState.resize?.moved);
  imageNineSliceEditorState.resize = null;
  event.target?.releasePointerCapture?.(event.pointerId);
}

async function openImageNineSliceEditor() {
  const item = imageLightboxEditContext?.itemKey ? imageNamingItemByKey(imageLightboxEditContext.itemKey) : null;
  if (!item) {
    return;
  }
  const sourceImage = imageLightboxEditContext.sourceImage || await loadImageElement(item.imageUrl);
  const sourceWidth = Math.max(1, sourceImage.naturalWidth || sourceImage.width || 1);
  const sourceHeight = Math.max(1, sourceImage.naturalHeight || sourceImage.height || 1);
  const saved = imageNamingNineSliceResult(item);
  const output = imageNamingOutputSize(item);
  imageNineSliceEditorState = {
    itemKey: item.key,
    sourceImage,
    lines: normalizeNineSliceLines(saved?.lines, sourceWidth, sourceHeight),
    mode: saved?.mode || "stretch",
    targetWidth: Math.max(1, Number(saved?.width || output.width || sourceWidth)),
    targetHeight: Math.max(1, Number(saved?.height || output.height || sourceHeight)),
    zoom: 1,
    pan: { x: 0, y: 0 },
    dragLine: "",
    outputCanvas: null,
  };
  els.imageNineSliceEditor.hidden = false;
  els.imageLightbox?.classList.add("has-nine-slice-editor");
  if (els.imageLightboxNamingEditor) els.imageLightboxNamingEditor.hidden = true;
  requestAnimationFrame(fitImageNineSliceView);
}

function closeImageNineSliceEditor() {
  imageNineSliceEditorState = null;
  if (els.imageNineSliceEditor) {
    els.imageNineSliceEditor.hidden = true;
  }
  els.imageLightbox?.classList.remove("has-nine-slice-editor");
  renderImageLightboxNamingEditor();
}

async function saveImageNineSliceResult({ exportResource = false } = {}) {
  const stateForSave = imageNineSliceEditorState;
  const item = imageNineSliceCurrentItem();
  if (!stateForSave?.sourceImage || !item) {
    return;
  }
  const outputCanvas = renderNineSliceOutputCanvas(stateForSave.sourceImage, stateForSave);
  const outputUrl = outputCanvas.toDataURL("image/png");
  state.imageNaming.nineSlice ||= {};
  state.imageNaming.nineSlice[item.key] = {
    mode: stateForSave.mode,
    lines: { ...stateForSave.lines },
    width: outputCanvas.width,
    height: outputCanvas.height,
    outputUrl,
    updatedAt: new Date().toISOString(),
  };
  state.imageNaming.sizes[item.key] = { width: outputCanvas.width, height: outputCanvas.height, mode: "fit" };
  markImageNamingItemEdited(item.key);
  if (els.imageLightboxImage) {
    els.imageLightboxImage.src = outputUrl;
  }
  if (els.imageLightboxCaption) {
    els.imageLightboxCaption.textContent = imageNamingLightboxCaption(item);
  }
  setImageNineSliceStatus(`已保存 ${outputCanvas.width} x ${outputCanvas.height}`);
  if (exportResource) {
    const entry = imageSplitResourceEntries().find((resource) => resource.key.startsWith(`split:${item.key}:`));
    openResourceExportProjectDialog("split", { selectedEntryKeys: entry ? [entry.key] : [] });
  }
}

async function openImageNamingPreviewLightbox(preview) {
  const image = preview?.querySelector?.("img");
  if (!image) {
    return;
  }
  const caption = preview.dataset.caption || image.alt || "";
  const fallbackUrl = image.currentSrc || image.src || preview.dataset.namingLightbox || "";
  const itemKey = preview.dataset.namingItemKey || image.closest(".image-naming-part")?.querySelector("[data-image-name-key]")?.dataset.imageNameKey || "";
  const item = imageNamingItemByKey(itemKey);
  try {
    const sourceUrl = item?.imageUrl || image.dataset.cropSrc || image.dataset.namingLightbox || preview.dataset.namingLightbox || fallbackUrl;
    if (!sourceUrl || !item) {
      openImageLightbox(fallbackUrl, caption);
      return;
    }
    const source = await loadImageElement(sourceUrl);
    const saved = imageNamingNineSliceResult(item);
    openImageLightbox(saved?.outputUrl || cropCanvasDataUrl(source, imageNamingLightboxCrop(item), { maxSide: 0 }), imageNamingLightboxCaption(item), {
      namingItemKey: item.key,
      sourceImage: source,
    });
  } catch (error) {
    console.warn("image naming lightbox preview failed", error);
    openImageLightbox(fallbackUrl, caption);
  }
}

async function renderImageNamingCropPreviews() {
  const images = Array.from(document.querySelectorAll("#imageNamingList img[data-naming-crop], #imageSplitPreviewList img[data-naming-crop]"));
  const cache = new Map();
  await Promise.all(images.map(async (image) => {
    const sourceUrl = image.dataset.cropSrc || image.src;
    try {
      if (!cache.has(sourceUrl)) {
        cache.set(sourceUrl, loadImageElement(sourceUrl));
      }
      const source = await cache.get(sourceUrl);
      const crop = {
        x: Number(image.dataset.cropX || 0),
        y: Number(image.dataset.cropY || 0),
        w: Number(image.dataset.cropW || 1),
        h: Number(image.dataset.cropH || 1),
        frameWidth: Number(image.dataset.frameW || source.naturalWidth || 1),
        frameHeight: Number(image.dataset.frameH || source.naturalHeight || 1),
        outputWidth: Number(image.dataset.outputW || 0),
        outputHeight: Number(image.dataset.outputH || 0),
        outputMode: image.dataset.outputMode || "source",
      };
      const previewDataUrl = cropCanvasDataUrl(source, crop, { maxSide: 640 });
      image.src = previewDataUrl;
      const itemKey = image.closest(".image-naming-part")?.querySelector("[data-image-name-key]")?.dataset.imageNameKey || "";
      if (!state.imageNaming.compression?.[itemKey]?.after_bytes) {
        const outputDataUrl = cropCanvasDataUrl(source, crop, { maxSide: 0 });
        updateImageNamingStorageLabels(itemKey, dataUrlByteLength(outputDataUrl));
      }
      image.removeAttribute("data-naming-crop");
    } catch (error) {
      console.warn("image naming crop preview failed", error);
    }
  }));
}

function isImageNamingGroupCollapsed(groupKey) {
  return Boolean(state.imageNaming.collapsedGroups?.[groupKey]);
}

function setImageNamingGroupCollapsed(groupKey, collapsed) {
  if (!groupKey) {
    return;
  }
  state.imageNaming.collapsedGroups ||= {};
  if (collapsed) {
    state.imageNaming.collapsedGroups[groupKey] = true;
  } else {
    delete state.imageNaming.collapsedGroups[groupKey];
  }
  renderImageNaming();
  persistSession();
}

function renderImageNamingGroup(group, groupIndex, { mode = "export" } = {}) {
  const isPreview = mode === "preview";
  const collapsed = isImageNamingGroupCollapsed(group.key);
  const groupNumber = String(groupIndex + 1).padStart(2, "0");
  const bodyId = `${mode}-${group.key}`.replace(/[^a-z0-9_-]/gi, "-");
  return `
    <section class="image-naming-group ${collapsed ? "collapsed" : ""}">
      <button class="image-naming-group-toggle" type="button" data-image-naming-group-toggle="${escapeHtml(group.key)}" aria-expanded="${collapsed ? "false" : "true"}" aria-controls="${escapeHtml(bodyId)}">
        <span class="image-naming-group-index">${groupNumber}</span>
        <strong title="${escapeHtml(group.title)}">${escapeHtml(group.title)}</strong>
        <small>${group.parts.length} \u9879</small>
        <b aria-hidden="true">${collapsed ? "+" : "-"}</b>
      </button>
      <div id="${escapeHtml(bodyId)}" class="image-naming-group-body" ${collapsed ? "hidden" : ""}>
        <figure class="image-naming-source">
          <img src="${escapeHtml(group.imageUrl)}" alt="${escapeHtml(group.title)}">
          ${isPreview ? "" : renderImageNamingBatchTools(group)}
        </figure>
        <div class="image-naming-parts ${isPreview ? "preview-only" : ""}">
          ${group.parts.map((item, partIndex) => {
            const value = state.imageNaming.names[item.key] ?? item.fallback;
            const outputSize = imageNamingOutputSize(item);
            const cropRatio = `${Math.max(1, outputSize.width)} / ${Math.max(1, outputSize.height)}`;
            const storageLabel = imageNamingStorageDetail(item);
            const previewUrl = imageNamingPreviewUrl(item);
            const hasNineSlice = Boolean(imageNamingNineSliceResult(item));
            const isBrushSource = imageNamingFormatBrush?.sourceKey === item.key;
            const isBrushTarget = Boolean(imageNamingFormatBrush && !isBrushSource);
            const brushClass = isBrushSource ? "format-brush-source" : isBrushTarget ? "format-brush-target" : "";
            return `
              <article class="image-naming-part ${isPreview ? "preview-only" : ""} ${brushClass}">
                <span class="image-naming-part-preview" role="button" tabindex="0" data-naming-lightbox="${escapeHtml(previewUrl)}" data-naming-item-key="${escapeHtml(item.key)}" data-caption="${escapeHtml(`${item.label} / ${Math.max(1, outputSize.width)} x ${Math.max(1, outputSize.height)}`)}" style="aspect-ratio:${cropRatio};">
                  <img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(item.label)}" ${hasNineSlice ? "" : imageNamingCropAttrs(item)}>
                  <em>${String(partIndex + 1).padStart(2, "0")}</em>
                </span>
                ${isPreview ? "" : `
                  <button class="image-naming-remove-button" type="button" data-remove-naming-item="${escapeHtml(item.key)}" title="\u4ECE\u5BFC\u51FA\u6E05\u5355\u79FB\u9664" aria-label="\u79FB\u9664 ${escapeHtml(item.label)}">\u00D7</button>
                  <button class="image-naming-format-button" type="button" data-format-brush-item="${escapeHtml(item.key)}" title="\u683C\u5F0F\u5237" aria-label="\u590D\u5236 ${escapeHtml(item.label)} \u7684\u5C3A\u5BF8\u548C\u547D\u540D\u683C\u5F0F">
                    <span aria-hidden="true"></span>
                  </button>
                `}
                <span class="image-naming-part-meta">
                  <strong>${escapeHtml(item.label)}</strong>
                  <small class="storage" data-naming-byte-meta="${escapeHtml(item.key)}">\u5927\u5C0F ${escapeHtml(storageLabel)}</small>
                  <small>${escapeHtml(imageNamingPartDetail(item))}</small>
                  ${imageNamingCompressionDetail(item) ? `<small class="compression">${escapeHtml(imageNamingCompressionDetail(item))}</small>` : ""}
                </span>
                ${isPreview ? "" : `<input type="text" value="${escapeHtml(value)}" data-image-name-key="${escapeHtml(item.key)}">`}
              </article>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderImageSplitPreview(groups = imageNamingGroups(), items = groups.flatMap((group) => group.parts)) {
  if (els.imageSplitPreviewSummary) {
    els.imageSplitPreviewSummary.innerHTML = [
      summaryCard("\u9884\u89C8\u5BF9\u8C61", items.length ? String(items.length) + " \u9879" : "\u7B49\u5F85\u62A0\u56FE"),
      summaryCard("\u5206\u7EC4", groups.length ? String(groups.length) + " \u7EC4" : "-"),
      summaryCard("\u62C6\u56FE\u72B6\u6001", state.imageSplit.skipped ? "\u5DF2\u8DF3\u8FC7" : state.imageSplit.confirmed ? "\u5DF2\u786E\u8BA4" : "\u672A\u786E\u8BA4"),
    ].join("");
  }
  if (els.imageSplitPreviewExportButton) {
    els.imageSplitPreviewExportButton.disabled = !items.length;
  }
  if (!els.imageSplitPreviewList) {
    return;
  }
  if (!items.length) {
    els.imageSplitPreviewList.innerHTML = `<div class="empty-state">\u5B8C\u6210\u62A0\u56FE\u5E76\u786E\u8BA4\u62C6\u56FE\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u62C6\u56FE\u7ED3\u679C\u9884\u89C8\u3002</div>`;
    return;
  }
  els.imageSplitPreviewList.innerHTML = groups.map((group, groupIndex) => renderImageNamingGroup(group, groupIndex, { mode: "preview" })).join("");
}

function renderImageNaming() {
  syncImageNamingExportModeControls();
  const groups = imageNamingGroups();
  const items = groups.flatMap((group) => group.parts);
  if (imageNamingFormatBrush && !items.some((item) => item.key === imageNamingFormatBrush.sourceKey)) {
    imageNamingFormatBrush = null;
  }
  renderImageSplitPreview(groups, items);
  if (els.imageNamingSummary) {
    els.imageNamingSummary.innerHTML = "";
  }
  if (els.imageNamingConfirmButton) {
    els.imageNamingConfirmButton.disabled = !items.length;
  }
  if (els.imageNamingExportToResourceButton) {
    els.imageNamingExportToResourceButton.disabled = !items.length;
  }
  if (!els.imageNamingList) {
    return;
  }
  els.imageNamingList.classList.toggle("is-format-brushing", Boolean(imageNamingFormatBrush));
  if (!items.length) {
    els.imageNamingList.innerHTML = `<div class="empty-state">\u5B8C\u6210\u62A0\u56FE\u5E76\u786E\u8BA4\u62C6\u56FE\u540E\uFF0C\u4F1A\u5728\u8FD9\u91CC\u5217\u51FA\u9700\u8981\u5BFC\u51FA\u7684\u56FE\u7247\u3002</div>`;
    return;
  }
  els.imageNamingList.innerHTML = groups
    .map((group, groupIndex) => renderImageNamingGroup(group, groupIndex, { mode: "export" }))
    .join("");
  void renderImageNamingCropPreviews();
  return;
  els.imageNamingList.innerHTML = groups
    .map((group, groupIndex) => {
      return `
        <section class="image-naming-group">
          <figure class="image-naming-source">
            <img src="${escapeHtml(group.imageUrl)}" alt="${escapeHtml(group.title)}">
            ${renderImageNamingBatchTools(group)}
          </figure>
          <div class="image-naming-parts">
            ${group.parts.map((item, partIndex) => {
              const value = state.imageNaming.names[item.key] ?? item.fallback;
              const outputSize = imageNamingOutputSize(item);
              const cropRatio = `${Math.max(1, outputSize.width)} / ${Math.max(1, outputSize.height)}`;
              const storageLabel = imageNamingStorageDetail(item);
              return `
                <article class="image-naming-part">
                  <span class="image-naming-part-preview" role="button" tabindex="0" data-naming-lightbox="${escapeHtml(item.imageUrl)}" data-naming-item-key="${escapeHtml(item.key)}" data-caption="${escapeHtml(`${item.label} / ${Math.max(1, outputSize.width)} x ${Math.max(1, outputSize.height)}`)}" style="aspect-ratio:${cropRatio};">
                    <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.label)}" ${imageNamingCropAttrs(item)}>
                    <em>${String(partIndex + 1).padStart(2, "0")}</em>
                  </span>
                  <button class="image-naming-remove-button" type="button" data-remove-naming-item="${escapeHtml(item.key)}" title="从导出清单移除" aria-label="移除 ${escapeHtml(item.label)}">×</button>
                  <span class="image-naming-part-meta">
                    <strong>${escapeHtml(item.label)}</strong>
                    <small class="storage" data-naming-byte-meta="${escapeHtml(item.key)}">\u5927\u5C0F ${escapeHtml(storageLabel)}</small>
                    <small>${escapeHtml(imageNamingPartDetail(item))}</small>
                    ${imageNamingCompressionDetail(item) ? `<small class="compression">${escapeHtml(imageNamingCompressionDetail(item))}</small>` : ""}
                  </span>
                  <input type="text" value="${escapeHtml(value)}" data-image-name-key="${escapeHtml(item.key)}">
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
    })
    .join("");
  void renderImageNamingCropPreviews();
}

async function confirmImageNaming() {
  const items = imageNamingExportItems();
  if (!items.length) {
    setStatus("\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u62C6\u56FE\u9879\u76EE\u3002", "error");
    return;
  }
  if (!state.imageJob?.job_id || !state.imageJob?.processed_dir) {
    setStatus("\u8BF7\u5148\u5B8C\u6210\u62A0\u56FE\uFF0C\u518D\u5BFC\u51FA\u62C6\u56FE\u7ED3\u679C\u3002", "error");
    return;
  }
  items.forEach((item, index) => {
    if (!state.imageNaming.names[item.key]) {
      state.imageNaming.names[item.key] = item.name || `part_${String(index + 1).padStart(2, "0")}`;
    }
  });
  await withBusy(els.imageNamingConfirmButton, async () => {
    setStatus("\u8BF7\u9009\u62E9\u62C6\u56FE\u7ED3\u679C\u7684\u5BFC\u51FA\u4F4D\u7F6E...");
    const picker = await apiJson("/api/select-output-path", { method: "POST" });
    if (picker.cancelled) {
      setStatus("\u5DF2\u53D6\u6D88\u5BFC\u51FA\u3002");
      return;
    }
    setStatus("\u6B63\u5728\u5BFC\u51FA\u62C6\u56FE\u7ED3\u679C...");
    const data = await apiJson("/api/export-image-split-result", {
      method: "POST",
      body: {
        job_id: state.imageJob.job_id,
        items,
        export_mode: imageNamingExportMode(),
      },
    });
    state.imageNaming.confirmed = true;
    renderImageNaming();
    persistSession();
    setStatus("\u5DF2\u5BFC\u51FA " + (data.export?.frame_count || 0) + " \u5F20\u62C6\u56FE\u7ED3\u679C\u5230 " + (data.export?.target_dir || "\u9009\u5B9A\u6587\u4EF6\u5939") + "\u3002", "success");
  });
}

function startImageSplitFlow() {
  if (!state.imageJob?.frames?.length) {
    setStatus("No matte result is available for splitting.", "error");
    return;
  }
  renderImageSplit();
  setActiveImageTool("split", { announce: true });
  setStatus("Ready to split the matte result.", "success");
}

async function exportImageMatteResult(button = els.imageExportResultButton) {
  if (!state.imageJob?.job_id || !state.imageJob?.processed_dir) {
    setStatus("No matte result is available for export.", "error");
    return;
  }
  await withBusy(button || els.imageExportResultButton, async () => {
    setStatus("\u8BF7\u9009\u62E9\u62A0\u56FE\u7ED3\u679C\u7684\u5BFC\u51FA\u4F4D\u7F6E...");
    const picker = await apiJson("/api/select-output-path", { method: "POST" });
    if (picker.cancelled) {
      setStatus("\u5DF2\u53D6\u6D88\u5BFC\u51FA\u3002");
      return;
    }
    setStatus("\u6B63\u5728\u5BFC\u51FA\u62A0\u56FE\u7ED3\u679C...");
    const data = await apiJson("/api/export-image-result", {
      method: "POST",
      body: {
        job_id: state.imageJob.job_id,
      },
    });
    setStatus("\u5DF2\u5BFC\u51FA " + (data.export?.frame_count || 0) + " \u5F20\u62A0\u56FE\u7ED3\u679C\u5230 " + (data.export?.target_dir || "\u9009\u5B9A\u6587\u4EF6\u5939") + "\u3002", "success");
  });
}

function collectImageProcessingPayload(progressId) {
  return {
    ...collectProcessingPayload("image"),
    upload_id: state.imageUpload?.upload_id || "",
    start_time: 0,
    end_time: 0,
    start_frame: 1,
    end_frame: imageFrameCount(state.imageUpload),
    keep_every: 1,
    output_scale: 1,
    canvas_mode: "auto",
    reduce_px: 0,
    progress_id: progressId,
  };
}

async function runImageProcessing(payload, {
  button,
  statusText,
  progressTarget = "image",
  onComplete,
} = {}) {
  const total = imageFrameCount(state.imageUpload);
  await withBusy(button || els.imageProcessButton, async () => {
    startProcessProgress(payload.progress_id, total, progressTarget);
    setStatus(statusText);
    try {
      const data = await apiJson("/api/process", {
        method: "POST",
        body: payload,
      });
      state.imageJob = data.job;
      state.imageSplitSelectedIndex = Number(imageResultEntries()[0]?.index ?? state.imageSelectedIndex ?? 0);
      resetImageSplitState();
      resetImageNamingState();
      renderImageWorkflow();
      updateProcessProgress(data.job.frame_count, data.job.frame_count);
      onComplete?.(data.job);
    } finally {
      stopProcessProgressPolling();
      window.setTimeout(() => hideProcessProgress(progressTarget), 900);
    }
  });
}

async function processImageMatte() {
  if (!state.imageUpload) {
    setStatus("\u8BF7\u5148\u5BFC\u5165\u56FE\u7247\u540E\u518D\u8FDB\u884C\u62A0\u56FE\u3002", "error");
    return;
  }

  const progressId = makeProcessProgressId();
  const total = imageFrameCount(state.imageUpload);
  await runImageProcessing(collectImageProcessingPayload(progressId), {
    button: els.imageProcessButton,
    statusText: "\u6B63\u5728\u6309\u5F53\u524D\u62A0\u56FE\u8BBE\u7F6E\u5904\u7406 " + total + " \u5F20\u56FE\u7247...",
    onComplete: (job) => {
      setActiveImageTool("result", { announce: true });
      setStatus("\u62A0\u56FE\u5B8C\u6210\uFF0C\u5DF2\u751F\u6210 " + job.frame_count + " \u5F20\u7ED3\u679C\u3002", "success");
    },
  });
  renderImageMatteSummary();
}

async function skipImageMatteToSplit() {
  if (!state.imageUpload) {
    setStatus("\u8BF7\u5148\u5BFC\u5165\u56FE\u7247\u540E\u518D\u8DF3\u8FC7\u62A0\u56FE\u3002", "error");
    return;
  }

  const progressId = makeProcessProgressId();
  const total = imageFrameCount(state.imageUpload);
  const payload = {
    ...collectImageProcessingPayload(progressId),
    matte_mode: "none",
    chroma_enabled: false,
    key_mode: "auto",
    batch_green_to_black: false,
    batch_green_desaturate: false,
    batch_semitransparent_to_black: false,
    batch_semitransparent_to_opaque: false,
  };
  await runImageProcessing(payload, {
    button: els.imageSkipMatteButton,
    statusText: "\u6B63\u5728\u4E0D\u62A0\u56FE\u5904\u7406 " + total + " \u5F20\u56FE\u7247\uFF0C\u5B8C\u6210\u540E\u76F4\u63A5\u8FDB\u5165\u62C6\u56FE...",
    onComplete: (job) => {
      renderImageSplit();
      setActiveImageTool("split", { announce: true });
      setStatus("\u5DF2\u8DF3\u8FC7\u62A0\u56FE\uFF0C\u53EF\u76F4\u63A5\u62C6\u5206 " + job.frame_count + " \u5F20\u56FE\u7247\u3002", "success");
    },
  });
  renderImageMatteSummary();
}

function sortFilesByDisplayName(files) {
  return [...files].sort((a, b) => {
    const aName = a.webkitRelativePath || a.name || "";
    const bName = b.webkitRelativePath || b.name || "";
    return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: "base" });
  });
}

async function importCustomAnimationFrames(files, button) {
  const imageFiles = sortFilesByDisplayName(files).filter(isSupportedImageFile);
  if (imageFiles.length === 0) {
    setStatus("\u8BF7\u9009\u62E9 PNG / JPG / WebP / BMP \u5E8F\u5217\u5E27\u3002", "error");
    return;
  }

  const form = new FormData();
  imageFiles.forEach((file) => {
    form.append("frames", file, file.webkitRelativePath || file.name);
  });

  await withBusy(button, async () => {
    stopPreviewTimer();
    setStatus(`\u6B63\u5728\u6309\u6587\u4EF6\u540D\u5BFC\u5165 ${imageFiles.length} \u5E27...`);
    const data = await apiJson("/api/import-animation", {
      method: "POST",
      body: form,
    });

    state.upload = null;
    state.processPreview = null;
    state.job = data.job;
    state.exportResult = null;
    clearMagicPreview();
    state.selected = new Set(data.job.frames.map((frame) => frame.index));
    state.selectionOrder = data.job.frames.map((frame) => frame.index);
    setOrderedSelectionMode(false);
    state.preview.currentIndex = 0;
    state.preview.isPlaying = true;
    els.previewReverseInput.checked = state.preview.isReversed;
    els.previewPanel.hidden = true;
    els.extractPanel.hidden = true;
    els.processPanel.hidden = true;
    resetProcessPreview("video");
    updateSegmentConfirmationUI();
    renderJob();
    setStatus(`\u5DF2\u6309\u6587\u4EF6\u540D\u987A\u5E8F\u5BFC\u5165 ${data.job.frame_count} \u5E27\u3002`, "success");
  });
}

function clearPreviewFrames() {
  stopPreviewTimer();
  resetPreviewState();
  state.job = null;
  state.exportResult = null;
  clearMagicPreview();
  state.selected = new Set();
  state.selectionOrder = [];
  setOrderedSelectionMode(false);
  els.jobSummary.innerHTML = "";
  els.frameGrid.innerHTML = "";
  els.exportResult.hidden = true;
  els.exportResult.innerHTML = "";
  showAnimationWorkbench();
  renderSelectionCount();
  drawPreviewPlaceholder();
  updatePreviewControls(0);
  persistSession();
  setStatus("\u5DF2\u6E05\u7A7A\u53C2\u4E0E\u52A8\u753B\u9884\u89C8\u7684\u5E27\u3002", "success");
}

function showAnimationWorkbench() {
  els.resultPanel.hidden = !state.job;
  if (!state.job) {
    els.jobSummary.innerHTML = "";
    els.frameGrid.innerHTML = "";
    els.exportResult.hidden = true;
    els.exportResult.innerHTML = "";
    renderSelectionCount();
    syncAnimationPreview(false);
  }
  syncResultActions();
}

function showExtractWorkbench() {
  els.extractResultPanel.hidden = !state.extractJob;
  if (!state.extractJob) {
    els.extractJobSummary.innerHTML = "";
    els.extractFrameGrid.innerHTML = "";
    renderExtractSelectionCount();
    renderExtractSimilarityStatus();
    syncExtractAnimationPreview(false);
  }
  syncResultActions();
}

function syncResultActions() {
  const hasUpload = Boolean(state.upload);
  const hasExtractJob = Boolean(state.extractJob);
  const hasExtractSelection = hasExtractJob && state.extractSelected.size > 0;
  const hasJob = Boolean(state.job);
  const hasSelection = hasJob && state.selected.size > 0;
  const hasImageUpload = Boolean(state.imageUpload);
  if (els.processButton) {
    els.processButton.disabled = !hasExtractSelection;
    els.processButton.textContent = "抠选中帧";
  }
  if (els.imageProcessButton) {
    els.imageProcessButton.disabled = !hasImageUpload;
    els.imageProcessButton.textContent = "\u5F00\u59CB\u62A0\u56FE";
  }
  if (els.imageSkipMatteButton) {
    els.imageSkipMatteButton.disabled = !hasImageUpload;
    els.imageSkipMatteButton.textContent = "\u4E0D\u62A0\u56FE";
  }
  if (els.previewFrameButton) {
    els.previewFrameButton.disabled = !state.upload;
    els.previewFrameButton.textContent = "预览当前帧";
  }
  if (els.imagePreviewFrameButton) {
    els.imagePreviewFrameButton.disabled = !hasImageUpload;
    els.imagePreviewFrameButton.textContent = "\u9884\u89C8\u5F53\u524D\u56FE\u7247";
  }
  if (els.processStepShell) {
    els.processStepShell.classList.toggle("locked", !hasExtractSelection);
  }
  if (els.imageProcessStepShell) {
    els.imageProcessStepShell.classList.toggle("locked", !hasImageUpload);
  }
  if (els.processLockNote) {
    els.processLockNote.hidden = hasExtractSelection;
    els.processLockNote.textContent = "先在提取结果里选择需要处理的帧，再对选中帧抠图。";
  }
  if (els.imageProcessLockNote) {
    els.imageProcessLockNote.hidden = hasImageUpload;
    els.imageProcessLockNote.textContent = "\u5148\u5BFC\u5165\u56FE\u7247\uFF0C\u518D\u914D\u7F6E\u62A0\u56FE\u53C2\u6570\u3002";
  }
  if (els.processPanel) {
    els.processPanel.hidden = !hasExtractSelection;
  }
  if (els.imageProcessPanel) {
    els.imageProcessPanel.hidden = false;
  }
  requestWorkflowNavigationRefresh();
  els.extractSelectAllButton.disabled = !hasExtractJob;
  els.extractSelectNoneButton.disabled = !hasExtractJob;
  els.extractSelectOddButton.disabled = !hasExtractJob;
  els.extractSelectEvenButton.disabled = !hasExtractJob;
  els.extractInvertSelectionButton.disabled = !hasExtractJob;
  els.extractOrderedSelectionInput.disabled = !hasExtractJob;
  if (els.extractAnalyzeSimilarityButton) {
    els.extractAnalyzeSimilarityButton.disabled = !hasExtractJob || state.extractSimilarityInFlight;
  }
  if (els.extractSimilarityIgnoreNearInput) {
    els.extractSimilarityIgnoreNearInput.disabled = !hasExtractJob || state.extractSimilarityInFlight;
  }
  if (els.extractSimilarityThresholdInput) {
    els.extractSimilarityThresholdInput.disabled = !hasExtractJob || state.extractSimilarityInFlight;
  }
  const hasExtractSimilarity = hasExtractJob && Boolean(state.extractSimilarity?.entries?.length);
  if (els.extractSimilarityKeepFirstButton) {
    els.extractSimilarityKeepFirstButton.disabled = !hasExtractSimilarity || state.extractSimilarityInFlight;
  }
  if (els.extractSimilarityDropSimilarButton) {
    els.extractSimilarityDropSimilarButton.disabled = !hasExtractSimilarity || state.extractSimilarityInFlight;
  }
  els.openProcessedButton.disabled = !hasJob || !state.job?.processed_dir;
  els.exportButton.disabled = !hasSelection;
  els.magicButton.disabled = !hasSelection || state.magicInFlight;
  els.selectAllButton.disabled = !hasJob;
  els.selectNoneButton.disabled = !hasJob;
  els.selectOddButton.disabled = !hasJob;
  els.selectEvenButton.disabled = !hasJob;
  els.invertSelectionButton.disabled = !hasJob;
  els.orderedSelectionInput.disabled = !hasJob;
}

function resetExtractFramesState() {
  stopExtractPreviewTimer();
  state.extractJob = null;
  state.extractSelected = new Set();
  state.extractSelectionTouched = false;
  state.extractSelectionOrder = [];
  state.extractOrderedSelectionMode = false;
  state.extractSimilarity = null;
  state.extractSimilarityInFlight = false;
  state.extractPreview.currentIndex = 0;
  state.extractPreview.isPlaying = true;
  state.extractPreview.renderToken += 1;
  if (els.extractOrderedSelectionInput) {
    els.extractOrderedSelectionInput.checked = false;
  }
  if (els.extractFrameGrid) {
    els.extractFrameGrid.innerHTML = "";
  }
  if (els.extractJobSummary) {
    els.extractJobSummary.innerHTML = "";
  }
  if (els.extractResultPanel) {
    els.extractResultPanel.hidden = true;
  }
}

function clearFinalJobState() {
  stopPreviewTimer();
  state.job = null;
  state.exportResult = null;
  state.selected = new Set();
  state.selectionOrder = [];
  setOrderedSelectionMode(false);
  clearMagicPreview();
  els.jobSummary.innerHTML = "";
  els.frameGrid.innerHTML = "";
  els.exportResult.hidden = true;
  els.exportResult.innerHTML = "";
  els.resultPanel.hidden = true;
  renderSelectionCount();
  drawPreviewPlaceholder();
  updatePreviewControls(0);
}

function resetSizingControlsForNewUpload() {
  els.outputScaleInput.value = String(OUTPUT_SCALE_DEFAULT_PERCENT);
  els.reducePxInput.value = "0";
}

function applyUpload(upload, { resetSizing = true } = {}) {
  resetPreviewState();
  resetExtractFramesState();
  state.upload = upload;
  clearFinalJobState();
  state.processPreview = null;
  if (resetSizing) {
    resetSizingControlsForNewUpload();
  }

  const info = currentUploadInfo(upload);
  const mediaType = uploadMediaType(upload);
  const isSequence = mediaType === "image_sequence";
  state.segment.start = 0;
  state.segment.startFrame = 1;
  state.segment.endFrame = mediaType === "video" || isSequence ? getSegmentFrameCount(upload) : 1;
  state.segment.end = mediaType === "video" ? segmentFrameToTime(getSegmentFrameCount(upload), "end", upload) : 0;
  state.segment.confirmed = true;
  normalizeSegment("end");

  els.videoName.textContent = upload.display_name || (mediaType === "image" ? "\u672a\u547d\u540d\u56fe\u7247" : isSequence ? "\u672a\u547d\u540d\u56fe\u7247\u5e8f\u5217" : "\u672a\u547d\u540d\u89c6\u9891");
  els.videoSize.textContent = info.width && info.height ? `${info.width} \u00d7 ${info.height}` : "-";
  els.videoFps.textContent = mediaType === "image" ? "\u5355\u5e27\u56fe\u7247" : isSequence ? `${getSegmentFrameCount(upload)} \u5f20\u56fe\u7247` : (info.fps ? `${Number(info.fps).toFixed(2)} fps` : "-");
  els.videoDuration.textContent = mediaType === "image" ? "\u5355\u5f20\u56fe\u7247" : isSequence ? "\u6309\u6587\u4ef6\u540d\u6392\u5217" : (Number(info.duration || 0) > 0 ? formatSeconds(info.duration) : "-");

  els.previewPanel.hidden = false;
  els.extractPanel.hidden = false;
  els.extractResultPanel.hidden = true;
  els.processPanel.hidden = true;
  els.resultPanel.hidden = true;
  els.exportResult.hidden = true;
  els.exportResult.innerHTML = "";
  els.extractFrameGrid.innerHTML = "";
  els.extractJobSummary.innerHTML = "";
  els.frameGrid.innerHTML = "";
  els.jobSummary.innerHTML = "";
  resetProcessPreview("video");
  showExtractWorkbench();
  showAnimationWorkbench();
  syncAnimationPreview();

  const mediaUrl = upload.media_url || upload.video_url;
  if (mediaType === "image" || isSequence) {
    els.videoPreview.pause();
    els.videoPreview.hidden = true;
    els.videoPreview.removeAttribute("src");
    els.videoPreview.load();
    els.mediaPreviewImage.src = mediaUrl;
    els.mediaPreviewImage.hidden = false;
  } else {
    els.mediaPreviewImage.hidden = true;
    els.mediaPreviewImage.removeAttribute("src");
    els.videoPreview.hidden = false;
    muteVideoPreview();
    els.videoPreview.src = mediaUrl;
    els.videoPreview.load();
  }
  syncSegmentBounds();
  renderSegmentControls();
  updateSegmentConfirmationUI();
  renderVideoProcessModule();
  persistSession();
}

function videoProcessAssets() {
  const assets = Array.isArray(state.videoProcess.library) ? state.videoProcess.library.filter((item) => item?.upload_id) : [];
  if (state.videoProcess.upload?.upload_id && !assets.some((item) => item.upload_id === state.videoProcess.upload.upload_id)) {
    assets.unshift(state.videoProcess.upload);
  }
  state.videoProcess.library = assets;
  return assets;
}

function upsertVideoProcessAsset(upload) {
  if (!upload?.upload_id) {
    return;
  }
  const assets = videoProcessAssets();
  const index = assets.findIndex((item) => item.upload_id === upload.upload_id);
  if (index >= 0) {
    assets[index] = upload;
  } else {
    assets.push(upload);
  }
  state.videoProcess.library = assets;
}

function selectedVideoProcessAsset() {
  const assets = videoProcessAssets();
  const selectedId = state.videoProcess.selectedUploadId || state.videoProcess.upload?.upload_id || "";
  return assets.find((item) => item.upload_id === selectedId) || state.videoProcess.upload || assets[0] || null;
}

function selectVideoProcessAsset(uploadId, { render = true } = {}) {
  const asset = videoProcessAssets().find((item) => item.upload_id === uploadId);
  if (!asset) {
    return;
  }
  state.videoProcess.upload = asset;
  state.videoProcess.selectedUploadId = asset.upload_id;
  resetVideoProcessEditSettingsForUpload(asset, { preserveTimeline: true });
  if (render) {
    renderVideoProcessModule();
  }
  persistSession();
}

function removeVideoProcessAsset(uploadId) {
  const assets = videoProcessAssets().filter((item) => item.upload_id !== uploadId);
  state.videoProcess.library = assets;
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.segments = normalizedVideoProcessSegments().filter((clip) => clip.uploadId !== uploadId);
  state.videoProcess.result = null;
  if (state.videoProcess.selectedUploadId === uploadId || state.videoProcess.upload?.upload_id === uploadId) {
    const next = assets[0] || null;
    state.videoProcess.upload = next;
    state.videoProcess.selectedUploadId = next?.upload_id || "";
  }
  renderVideoProcessModule();
  persistSession();
}

function handleVideoProcessAssetListClick(event) {
  const selectButton = event.target?.closest?.("[data-select-video-asset]");
  if (selectButton) {
    selectVideoProcessAsset(selectButton.dataset.selectVideoAsset);
    return;
  }
  const addButton = event.target?.closest?.("[data-add-video-asset-full]");
  if (addButton) {
    selectVideoProcessAsset(addButton.dataset.addVideoAssetFull, { render: false });
    addCurrentVideoProcessFullClip();
    return;
  }
  const removeButton = event.target?.closest?.("[data-remove-video-asset]");
  if (removeButton) {
    removeVideoProcessAsset(removeButton.dataset.removeVideoAsset);
  }
}

function videoProcessAssetLabel(upload) {
  return upload?.display_name || "\u672A\u547D\u540D\u89C6\u9891";
}

function videoProcessAssetDuration(upload = selectedVideoProcessAsset()) {
  return getVideoProcessDuration(currentUploadInfo(upload));
}

function normalizedVideoProcessSegments() {
  const settings = state.videoProcess.settings || {};
  const fallbackUpload = selectedVideoProcessAsset();
  return (Array.isArray(settings.segments) ? settings.segments : [])
    .map((item) => ({
      uploadId: item.uploadId || item.upload_id || fallbackUpload?.upload_id || "",
      sourceName: item.sourceName || item.source_name || videoProcessAssetLabel(fallbackUpload),
      start: Math.max(0, Number(item.start || 0)),
      end: Math.max(0, Number(item.end || 0)),
    }))
    .filter((item) => item.uploadId && item.end > item.start);
}

function normalizedVideoProcessSubtitles() {
  const settings = state.videoProcess.settings || {};
  const legacyText = String(settings.subtitleText || "").trim();
  const legacyCue = legacyText
    ? [{
        text: legacyText,
        start: Number(settings.subtitleStart || 0),
        end: Number(settings.subtitleEnd || videoProcessTimelineDuration() || 0),
        size: settings.subtitleSize || 32,
        position: settings.subtitlePosition || "bottom",
        color: settings.subtitleColor || "#ffffff",
        box: settings.subtitleBox || "boxed",
      }]
    : [];
  const source = Array.isArray(settings.subtitles) && settings.subtitles.length ? settings.subtitles : legacyCue;
  return source
    .map((item) => ({
      text: String(item.text || "").trim(),
      start: Math.max(0, Number(item.start || 0)),
      end: Math.max(0, Number(item.end || 0)),
      size: Number(item.size || settings.subtitleSize || 32),
      position: item.position || settings.subtitlePosition || "bottom",
      color: item.color || settings.subtitleColor || "#ffffff",
      box: item.box || settings.subtitleBox || "boxed",
    }))
    .filter((item) => item.text);
}

function videoProcessTimelineDuration() {
  const segments = normalizedVideoProcessSegments();
  if (segments.length) {
    return segments.reduce((total, item) => total + Math.max(0, Number(item.end || 0) - Number(item.start || 0)), 0);
  }
  const trimStart = Math.max(0, Number(state.videoProcess.settings?.trimStart || 0));
  const trimEnd = Math.max(0, Number(state.videoProcess.settings?.trimEnd || videoProcessAssetDuration() || 0));
  return trimEnd > trimStart ? trimEnd - trimStart : videoProcessAssetDuration();
}

function videoProcessSettingsFromInputs() {
  const existing = state.videoProcess.settings || {};
  const selectedAsset = selectedVideoProcessAsset();
  return {
    format: els.videoProcessFormatInput?.value || "mp4",
    quality: els.videoProcessQualityInput?.value || "balanced",
    width: els.videoProcessWidthInput?.value || "",
    height: els.videoProcessHeightInput?.value || "",
    fps: els.videoProcessFpsInput?.value || "",
    name: els.videoProcessNameInput?.value || "",
    mute: Boolean(els.videoProcessMuteInput?.checked),
    trimStart: els.videoProcessTrimStartInput?.value || "",
    trimEnd: els.videoProcessTrimEndInput?.value || "",
    segments: normalizedVideoProcessSegments(),
    selectedUploadId: els.videoProcessSourceSelect?.value || selectedAsset?.upload_id || "",
    subtitles: Array.isArray(existing.subtitles) ? existing.subtitles : [],
    subtitleText: els.videoProcessSubtitleTextInput?.value || "",
    subtitleStart: els.videoProcessSubtitleStartInput?.value || "",
    subtitleEnd: els.videoProcessSubtitleEndInput?.value || "",
    subtitleSize: els.videoProcessSubtitleSizeInput?.value || 32,
    subtitlePosition: els.videoProcessSubtitlePositionInput?.value || "bottom",
    subtitleColor: els.videoProcessSubtitleColorInput?.value || "#ffffff",
    subtitleBox: els.videoProcessSubtitleBoxInput?.value || "boxed",
  };
}

function applyVideoProcessSettingsToInputs() {
  const settings = state.videoProcess.settings || {};
  if (els.videoProcessSourceSelect) els.videoProcessSourceSelect.value = state.videoProcess.selectedUploadId || state.videoProcess.upload?.upload_id || "";
  if (els.videoProcessFormatInput) els.videoProcessFormatInput.value = settings.format || "mp4";
  if (els.videoProcessQualityInput) els.videoProcessQualityInput.value = settings.quality || "balanced";
  if (els.videoProcessWidthInput) els.videoProcessWidthInput.value = settings.width || "";
  if (els.videoProcessHeightInput) els.videoProcessHeightInput.value = settings.height || "";
  if (els.videoProcessFpsInput) els.videoProcessFpsInput.value = settings.fps || "";
  if (els.videoProcessNameInput) els.videoProcessNameInput.value = settings.name || "";
  if (els.videoProcessMuteInput) els.videoProcessMuteInput.checked = Boolean(settings.mute);
  if (els.videoProcessTrimStartInput) els.videoProcessTrimStartInput.value = settings.trimStart || "";
  if (els.videoProcessTrimEndInput) els.videoProcessTrimEndInput.value = settings.trimEnd || "";
  if (els.videoProcessSubtitleTextInput) els.videoProcessSubtitleTextInput.value = settings.subtitleText || "";
  if (els.videoProcessSubtitleStartInput) els.videoProcessSubtitleStartInput.value = settings.subtitleStart || "";
  if (els.videoProcessSubtitleEndInput) els.videoProcessSubtitleEndInput.value = settings.subtitleEnd || "";
  if (els.videoProcessSubtitleSizeInput) els.videoProcessSubtitleSizeInput.value = settings.subtitleSize || 32;
  if (els.videoProcessSubtitlePositionInput) els.videoProcessSubtitlePositionInput.value = settings.subtitlePosition || "bottom";
  if (els.videoProcessSubtitleColorInput) els.videoProcessSubtitleColorInput.value = settings.subtitleColor || "#ffffff";
  if (els.videoProcessSubtitleBoxInput) els.videoProcessSubtitleBoxInput.value = settings.subtitleBox || "boxed";
}

function getVideoProcessDuration(info = currentUploadInfo(state.videoProcess.upload)) {
  const fromInfo = Number(info?.duration || 0);
  if (Number.isFinite(fromInfo) && fromInfo > 0) {
    return fromInfo;
  }
  const fromVideo = Number(els.videoProcessEditPreview?.duration || 0);
  return Number.isFinite(fromVideo) && fromVideo > 0 ? fromVideo : 0;
}

function formatVideoProcessTimeInput(value) {
  const safe = Math.max(0, Number(value || 0));
  return Number.isFinite(safe) ? safe.toFixed(2) : "0.00";
}

function clampVideoProcessTime(value, duration = getVideoProcessDuration()) {
  const numeric = Number(value || 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return duration > 0 ? clamp(safe, 0, duration) : Math.max(0, safe);
}

function updateVideoProcessTimePlaceholders(info = currentUploadInfo(state.videoProcess.upload)) {
  const duration = getVideoProcessDuration(info);
  const durationText = duration > 0 ? formatVideoProcessTimeInput(duration) : "";
  if (els.videoProcessTrimStartInput) els.videoProcessTrimStartInput.placeholder = "0.00";
  if (els.videoProcessTrimEndInput) els.videoProcessTrimEndInput.placeholder = durationText || "\u539F\u59CB";
  if (els.videoProcessSegmentStartInput) els.videoProcessSegmentStartInput.placeholder = "0.00";
  if (els.videoProcessSegmentEndInput) els.videoProcessSegmentEndInput.placeholder = durationText || "1.00";
  if (els.videoProcessSubtitleStartInput) els.videoProcessSubtitleStartInput.placeholder = "0.00";
  if (els.videoProcessSubtitleEndInput) els.videoProcessSubtitleEndInput.placeholder = durationText || "\u539F\u59CB";
}

function resetVideoProcessEditSettingsForUpload(upload, { preserveTimeline = false } = {}) {
  const duration = getVideoProcessDuration(currentUploadInfo(upload));
  const durationText = duration > 0 ? formatVideoProcessTimeInput(duration) : "";
  state.videoProcess.settings = {
    ...(state.videoProcess.settings || {}),
    trimStart: "0.00",
    trimEnd: durationText,
    segments: preserveTimeline ? normalizedVideoProcessSegments() : [],
    subtitles: preserveTimeline ? normalizedVideoProcessSubtitles() : [],
    subtitleText: preserveTimeline ? state.videoProcess.settings?.subtitleText || "" : "",
    subtitleStart: preserveTimeline ? state.videoProcess.settings?.subtitleStart || "" : "",
    subtitleEnd: preserveTimeline ? state.videoProcess.settings?.subtitleEnd || "" : "",
  };
  if (els.videoProcessSegmentStartInput) els.videoProcessSegmentStartInput.value = "0.00";
  if (els.videoProcessSegmentEndInput) els.videoProcessSegmentEndInput.value = durationText;
  updateVideoProcessTimePlaceholders(currentUploadInfo(upload));
}

function updateVideoProcessSettingsFromInputs() {
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  if (state.videoProcess.settings.selectedUploadId && state.videoProcess.settings.selectedUploadId !== state.videoProcess.selectedUploadId) {
    const asset = videoProcessAssets().find((item) => item.upload_id === state.videoProcess.settings.selectedUploadId);
    if (asset) {
      state.videoProcess.upload = asset;
      state.videoProcess.selectedUploadId = asset.upload_id;
    }
  }
  state.videoProcess.result = null;
  renderVideoProcessModule({ syncInputs: false });
  persistSession();
}

function addVideoProcessSegment() {
  const asset = selectedVideoProcessAsset();
  if (!asset?.upload_id) {
    setStatus("\u8BF7\u5148\u5BFC\u5165\u89C6\u9891\u7D20\u6750\u3002", "error");
    return;
  }
  const duration = videoProcessAssetDuration(asset);
  const start = clampVideoProcessTime(els.videoProcessSegmentStartInput?.value || 0, duration);
  const end = clampVideoProcessTime(els.videoProcessSegmentEndInput?.value || duration, duration);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    setStatus("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u7247\u6BB5\u5F00\u59CB\u548C\u7ED3\u675F\u65F6\u95F4\u3002", "error");
    return;
  }
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.segments = [
    ...(state.videoProcess.settings.segments || []),
    { uploadId: asset.upload_id, sourceName: videoProcessAssetLabel(asset), start, end },
  ];
  state.videoProcess.result = null;
  if (els.videoProcessSegmentStartInput) els.videoProcessSegmentStartInput.value = formatVideoProcessTimeInput(end);
  if (els.videoProcessSegmentEndInput) els.videoProcessSegmentEndInput.value = duration > end ? formatVideoProcessTimeInput(duration) : "";
  renderVideoProcessModule({ syncInputs: false });
  persistSession();
}

function addCurrentVideoProcessFullClip() {
  const asset = selectedVideoProcessAsset();
  const duration = videoProcessAssetDuration(asset);
  if (!asset?.upload_id || duration <= 0) {
    setStatus("\u8BF7\u5148\u5BFC\u5165\u6709\u6548\u89C6\u9891\u7D20\u6750\u3002", "error");
    return;
  }
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.segments = [
    ...(state.videoProcess.settings.segments || []),
    { uploadId: asset.upload_id, sourceName: videoProcessAssetLabel(asset), start: 0, end: duration },
  ];
  state.videoProcess.result = null;
  renderVideoProcessModule({ syncInputs: false });
  persistSession();
}

function splitCurrentVideoProcessSourceAtPlayhead() {
  const asset = selectedVideoProcessAsset();
  const duration = videoProcessAssetDuration(asset);
  const cut = clampVideoProcessTime(videoProcessCurrentTime(), duration);
  if (!asset?.upload_id || duration <= 0 || cut <= 0 || cut >= duration) {
    setStatus("\u8BF7\u628A\u64AD\u653E\u5934\u653E\u5728\u7D20\u6750\u4E2D\u95F4\u518D\u5206\u5272\u3002", "error");
    return;
  }
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.segments = [
    ...(state.videoProcess.settings.segments || []),
    { uploadId: asset.upload_id, sourceName: videoProcessAssetLabel(asset), start: 0, end: cut },
    { uploadId: asset.upload_id, sourceName: videoProcessAssetLabel(asset), start: cut, end: duration },
  ];
  state.videoProcess.result = null;
  renderVideoProcessModule({ syncInputs: false });
  persistSession();
  setStatus("\u5DF2\u6309\u5F53\u524D\u64AD\u653E\u5934\u5206\u5272\u5E76\u52A0\u5165\u65F6\u95F4\u7EBF\u3002", "success");
}

function removeVideoProcessSegment(index) {
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.segments = (state.videoProcess.settings.segments || []).filter((_, itemIndex) => itemIndex !== index);
  state.videoProcess.result = null;
  renderVideoProcessModule();
  persistSession();
}

function moveVideoProcessSegment(index, direction) {
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  const segments = [...(state.videoProcess.settings.segments || [])];
  const target = index + direction;
  if (index < 0 || target < 0 || index >= segments.length || target >= segments.length) {
    return;
  }
  [segments[index], segments[target]] = [segments[target], segments[index]];
  state.videoProcess.settings.segments = segments;
  state.videoProcess.result = null;
  renderVideoProcessModule();
  persistSession();
}

function clearVideoProcessSegments() {
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.segments = [];
  state.videoProcess.result = null;
  renderVideoProcessModule();
  persistSession();
}

function addVideoProcessSubtitle() {
  const text = String(els.videoProcessSubtitleTextInput?.value || "").trim();
  if (!text) {
    setStatus("\u8BF7\u5148\u8F93\u5165\u5B57\u5E55\u6587\u672C\u3002", "error");
    return;
  }
  const duration = videoProcessTimelineDuration() || videoProcessAssetDuration();
  const start = clampVideoProcessTime(els.videoProcessSubtitleStartInput?.value || 0, duration);
  const end = clampVideoProcessTime(els.videoProcessSubtitleEndInput?.value || duration, duration);
  if (duration > 0 && end <= start) {
    setStatus("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u5B57\u5E55\u5F00\u59CB\u548C\u7ED3\u675F\u65F6\u95F4\u3002", "error");
    return;
  }
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.subtitles = [
    ...(state.videoProcess.settings.subtitles || []),
    {
      text,
      start,
      end: end > start ? end : duration,
      size: Number(els.videoProcessSubtitleSizeInput?.value || 32),
      position: els.videoProcessSubtitlePositionInput?.value || "bottom",
      color: els.videoProcessSubtitleColorInput?.value || "#ffffff",
      box: els.videoProcessSubtitleBoxInput?.value || "boxed",
    },
  ];
  state.videoProcess.settings.subtitleText = "";
  state.videoProcess.settings.subtitleStart = "";
  state.videoProcess.settings.subtitleEnd = "";
  state.videoProcess.result = null;
  renderVideoProcessModule();
  persistSession();
}

function removeVideoProcessSubtitle(index) {
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.subtitles = (state.videoProcess.settings.subtitles || []).filter((_, itemIndex) => itemIndex !== index);
  state.videoProcess.result = null;
  renderVideoProcessModule();
  persistSession();
}

function useVideoProcessSubtitle(index) {
  const cue = normalizedVideoProcessSubtitles()[index];
  if (!cue) {
    return;
  }
  state.videoProcess.settings = {
    ...videoProcessSettingsFromInputs(),
    subtitleText: cue.text,
    subtitleStart: formatVideoProcessTimeInput(cue.start),
    subtitleEnd: formatVideoProcessTimeInput(cue.end),
    subtitleSize: cue.size,
    subtitlePosition: cue.position,
    subtitleColor: cue.color,
    subtitleBox: cue.box,
  };
  renderVideoProcessModule();
}

function clearVideoProcessSubtitles() {
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  state.videoProcess.settings.subtitles = [];
  state.videoProcess.settings.subtitleText = "";
  state.videoProcess.result = null;
  renderVideoProcessModule();
  persistSession();
}

function videoProcessSourceReady() {
  return Boolean(state.videoProcess.upload?.upload_id && isVideoUpload(state.videoProcess.upload));
}

function renderVideoProcessModule({ syncInputs = true } = {}) {
  if (!els.videoProcessModule) {
    return;
  }
  setActiveVideoProcessTool(state.videoProcess.activeTool || "import", { announce: false, render: false, scroll: false });
  const assets = videoProcessAssets();
  if (!state.videoProcess.upload && assets[0]) {
    state.videoProcess.upload = assets[0];
    state.videoProcess.selectedUploadId = assets[0].upload_id;
  }
  renderVideoProcessAssetPicker(assets);
  if (syncInputs) {
    applyVideoProcessSettingsToInputs();
  }
  const ready = videoProcessSourceReady();
  const upload = state.videoProcess.upload;
  const info = currentUploadInfo(upload);
  const mediaUrl = ready ? (upload.media_url || upload.video_url || "") : "";
  updateVideoProcessTimePlaceholders(info);
  syncVideoElement(els.videoProcessPreview, mediaUrl, ready);
  syncVideoElement(els.videoProcessEditPreview, mediaUrl, ready);
  const resultUrl = state.videoProcess.result?.url || "";
  syncVideoElement(els.videoProcessCompressPreview, resultUrl, Boolean(resultUrl));
  if (els.videoProcessEmpty) {
    els.videoProcessEmpty.hidden = ready;
  }
  if (els.videoProcessEditEmpty) {
    els.videoProcessEditEmpty.hidden = ready;
  }
  if (els.videoProcessCompressEmpty) {
    els.videoProcessCompressEmpty.hidden = Boolean(resultUrl);
  }
  if (els.videoProcessExportButton) {
    els.videoProcessExportButton.disabled = !ready || !state.videoProcess.result?.path;
  }
  if (els.videoProcessExportEditButton) {
    els.videoProcessExportEditButton.disabled = !ready || !state.videoProcess.result?.path;
  }
  if (els.videoProcessCompressButton) {
    els.videoProcessCompressButton.disabled = !ready;
  }
  if (els.videoProcessRenderEditButton) {
    els.videoProcessRenderEditButton.disabled = !ready;
  }
  if (els.videoProcessImportSummary) {
    els.videoProcessImportSummary.innerHTML = ready
      ? [
          summaryCard("\u7D20\u6750\u6570", `${assets.length} \u4E2A`),
          summaryCard("\u5F53\u524D\u7D20\u6750", escapeHtml(upload.display_name || "\u672A\u547D\u540D\u89C6\u9891")),
          summaryCard("\u5C3A\u5BF8", info.width && info.height ? `${info.width} x ${info.height}` : "-"),
          summaryCard("\u5927\u5C0F", info.bytes ? formatImageBytes(info.bytes) : "-"),
        ].join("")
      : `<div class="empty-state">\u672A\u5BFC\u5165\u89C6\u9891</div>`;
  }
  if (els.videoProcessSummary) {
    els.videoProcessSummary.innerHTML = [
      summaryCard("\u5F53\u524D\u7D20\u6750", ready ? escapeHtml(upload.display_name || "\u672A\u547D\u540D\u89C6\u9891") : "\u672A\u5BFC\u5165"),
      summaryCard("\u5C3A\u5BF8", ready && info.width && info.height ? `${info.width} x ${info.height}` : "-"),
      summaryCard("\u5927\u5C0F", ready && info.bytes ? formatImageBytes(info.bytes) : "-"),
      summaryCard("\u5E27\u7387", ready && info.fps ? `${Number(info.fps).toFixed(2)} fps` : "-"),
      summaryCard("\u65F6\u957F", ready && Number(info.duration || 0) > 0 ? formatSeconds(info.duration) : "-"),
    ].join("");
  }
  if (els.videoProcessCompressSummary) {
    els.videoProcessCompressSummary.innerHTML = [
      summaryCard("\u539F\u59CB\u5927\u5C0F", ready && info.bytes ? formatImageBytes(info.bytes) : "-"),
      summaryCard("\u539F\u59CB\u5C3A\u5BF8", ready && info.width && info.height ? `${info.width} x ${info.height}` : "-"),
      summaryCard("\u539F\u59CB\u65F6\u957F", ready && Number(info.duration || 0) > 0 ? formatSeconds(info.duration) : "-"),
    ].join("");
  }
  renderVideoProcessTimeline(info);
  renderVideoProcessResult();
  updateVideoProcessEditPlaybackUI();
}

function renderVideoProcessAssetPicker(assets = videoProcessAssets()) {
  const selectedId = state.videoProcess.selectedUploadId || state.videoProcess.upload?.upload_id || assets[0]?.upload_id || "";
  if (els.videoProcessSourceSelect) {
    els.videoProcessSourceSelect.innerHTML = assets.length
      ? assets.map((asset, index) => `<option value="${escapeHtml(asset.upload_id)}">${index + 1}. ${escapeHtml(videoProcessAssetLabel(asset))}</option>`).join("")
      : `<option value="">\u672A\u5BFC\u5165\u7D20\u6750</option>`;
    els.videoProcessSourceSelect.value = selectedId;
  }
  renderVideoProcessAssetList(els.videoProcessAssetList, assets, selectedId);
  renderVideoProcessAssetList(els.videoProcessEditAssetList, assets, selectedId);
}

function renderVideoProcessAssetList(container, assets, selectedId) {
  if (!container) {
    return;
  }
  container.innerHTML = assets.length
    ? assets.map((asset, index) => {
        const info = currentUploadInfo(asset);
        const active = asset.upload_id === selectedId ? " active" : "";
        return `
          <div class="video-asset-item${active}">
            <button type="button" data-select-video-asset="${escapeHtml(asset.upload_id)}">
              <strong>${index + 1}. ${escapeHtml(videoProcessAssetLabel(asset))}</strong>
              <span>${info.width && info.height ? `${info.width} x ${info.height}` : "-"} / ${info.duration ? formatSeconds(info.duration) : "-"}</span>
            </button>
            <button class="video-asset-add-button" type="button" data-add-video-asset-full="${escapeHtml(asset.upload_id)}">\u52A0\u5165</button>
            <button class="video-asset-remove-button" type="button" data-remove-video-asset="${escapeHtml(asset.upload_id)}">\u79FB\u9664</button>
          </div>
        `;
      }).join("")
    : `<div class="video-segment-empty">\u672A\u5BFC\u5165\u89C6\u9891\u7D20\u6750</div>`;
}

function syncVideoElement(video, url, shouldShow) {
  if (!video) {
    return;
  }
  if (shouldShow && url) {
    if (video.getAttribute("src") !== url) {
      video.src = url;
      video.load();
    }
    video.hidden = false;
  } else {
    video.pause?.();
    video.hidden = true;
    video.removeAttribute("src");
    video.load?.();
  }
}

function videoProcessCurrentTime() {
  return clampVideoProcessTime(els.videoProcessEditPreview?.currentTime || 0);
}

function seekVideoProcessEdit(time) {
  if (!videoProcessSourceReady() || !els.videoProcessEditPreview) {
    return;
  }
  const nextTime = clampVideoProcessTime(time);
  try {
    els.videoProcessEditPreview.currentTime = nextTime;
  } catch (error) {
    console.warn("video process seek failed", error);
  }
  updateVideoProcessEditPlaybackUI();
}

function seekVideoProcessEditFromRange() {
  const duration = getVideoProcessDuration();
  if (duration <= 0) {
    return;
  }
  const raw = Number(els.videoProcessEditSeekInput?.value || 0);
  seekVideoProcessEdit((clamp(raw, 0, 1000) / 1000) * duration);
}

function seekVideoProcessEditFromTrack(event) {
  const duration = getVideoProcessDuration();
  if (duration <= 0 || !event.currentTarget) {
    return;
  }
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width) {
    return;
  }
  const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  seekVideoProcessEdit(ratio * duration);
}

function videoProcessMarkInput(target) {
  return {
    trimStart: els.videoProcessTrimStartInput,
    trimEnd: els.videoProcessTrimEndInput,
    segmentStart: els.videoProcessSegmentStartInput,
    segmentEnd: els.videoProcessSegmentEndInput,
    subtitleStart: els.videoProcessSubtitleStartInput,
    subtitleEnd: els.videoProcessSubtitleEndInput,
  }[target] || null;
}

function markVideoProcessTime(target) {
  const input = videoProcessMarkInput(target);
  if (!input || !videoProcessSourceReady()) {
    return;
  }
  const time = videoProcessCurrentTime();
  input.value = formatVideoProcessTimeInput(time);
  updateVideoProcessSettingsFromInputs();
  setStatus("\u5DF2\u4F7F\u7528\u5F53\u524D\u64AD\u653E\u4F4D\u7F6E\u8BBE\u7F6E\u65F6\u95F4\u70B9\u3002", "success");
}

function renderVideoProcessPlayhead(duration) {
  return duration > 0 ? `<span class="video-track-playhead" data-video-process-playhead aria-hidden="true"></span>` : "";
}

function updateVideoProcessEditPlaybackUI() {
  const ready = videoProcessSourceReady();
  const duration = getVideoProcessDuration();
  const current = ready ? clampVideoProcessTime(els.videoProcessEditPreview?.currentTime || 0, duration) : 0;
  const percent = duration > 0 ? clamp((current / duration) * 100, 0, 100) : 0;
  if (els.videoProcessEditControls) {
    els.videoProcessEditControls.hidden = !ready;
  }
  if (els.videoProcessEditCurrentTime) {
    els.videoProcessEditCurrentTime.textContent = `${formatVideoProcessTimeInput(current)}s`;
  }
  if (els.videoProcessEditDuration) {
    els.videoProcessEditDuration.textContent = duration > 0 ? formatSeconds(duration) : "0.00s";
  }
  if (els.videoProcessEditSeekInput) {
    els.videoProcessEditSeekInput.disabled = !ready || duration <= 0;
    els.videoProcessEditSeekInput.value = String(Math.round((percent / 100) * 1000));
  }
  document.querySelectorAll("[data-video-process-playhead]").forEach((playhead) => {
    playhead.style.left = `${percent}%`;
  });
}

function timelinePercent(value, duration) {
  if (!duration) {
    return 0;
  }
  return clamp((Number(value || 0) / duration) * 100, 0, 100);
}

function renderTrackClip(start, end, duration, label, className = "") {
  const left = timelinePercent(start, duration);
  const right = timelinePercent(end, duration);
  const width = Math.max(2, right - left);
  return `<span class="video-track-clip ${className}" style="left:${left}%;width:${width}%;">${escapeHtml(label)}</span>`;
}

function renderVideoProcessTimeline(info = {}) {
  const sourceDuration = Math.max(0, Number(info.duration || 0));
  const segments = normalizedVideoProcessSegments();
  const timelineDuration = Math.max(0, videoProcessTimelineDuration() || sourceDuration);
  const settings = state.videoProcess.settings || {};
  const playhead = renderVideoProcessPlayhead(sourceDuration);
  if (els.videoProcessTimelineDuration) {
    els.videoProcessTimelineDuration.textContent = timelineDuration ? formatSeconds(timelineDuration) : "00:00";
  }
  const trimStart = Math.max(0, Number(settings.trimStart || 0));
  const trimEnd = Math.max(0, Number(settings.trimEnd || sourceDuration || 0));
  if (els.videoProcessTrimTrack) {
    els.videoProcessTrimTrack.innerHTML = sourceDuration
      ? renderTrackClip(trimStart, trimEnd > trimStart ? trimEnd : sourceDuration, sourceDuration, "\u88C1\u526A", "trim") + playhead
      : "";
  }
  if (els.videoProcessSegmentList) {
    els.videoProcessSegmentList.innerHTML = segments.length
      ? segments.map((segment, index) => `
        <div class="video-segment-chip">
          <span>${index + 1}. ${escapeHtml(segment.sourceName || "\u7D20\u6750")} / ${Number(segment.start || 0).toFixed(2)}s - ${Number(segment.end || 0).toFixed(2)}s</span>
          <div class="video-chip-actions">
            <button type="button" data-move-video-segment="${index}" data-direction="-1">\u4E0A\u79FB</button>
            <button type="button" data-move-video-segment="${index}" data-direction="1">\u4E0B\u79FB</button>
            <button type="button" data-remove-video-segment="${index}">\u79FB\u9664</button>
          </div>
        </div>
      `).join("")
      : `<span class="video-segment-empty">\u672A\u6DFB\u52A0\u62FC\u63A5\u7247\u6BB5</span>`;
  }
  if (els.videoProcessSegmentTrack) {
    let cursor = 0;
    els.videoProcessSegmentTrack.innerHTML = segments.length && timelineDuration
      ? segments.map((segment, index) => {
          const length = Math.max(0, Number(segment.end || 0) - Number(segment.start || 0));
          const html = renderTrackClip(cursor, cursor + length, timelineDuration, `${index + 1}`, "segment");
          cursor += length;
          return html;
        }).join("") + playhead
      : playhead;
  }
  const subtitles = normalizedVideoProcessSubtitles();
  if (els.videoProcessSubtitleTrack) {
    els.videoProcessSubtitleTrack.innerHTML = subtitles.length && timelineDuration
      ? subtitles.map((cue, index) => renderTrackClip(cue.start, cue.end > cue.start ? cue.end : timelineDuration, timelineDuration, cue.text || `${index + 1}`, "subtitle")).join("") + playhead
      : playhead;
  }
  if (els.videoProcessSubtitleList) {
    els.videoProcessSubtitleList.innerHTML = subtitles.length
      ? subtitles.map((cue, index) => `
        <div class="video-segment-chip subtitle-chip">
          <span>${index + 1}. ${Number(cue.start || 0).toFixed(2)}s - ${Number(cue.end || 0).toFixed(2)}s / ${escapeHtml(cue.text)}</span>
          <div class="video-chip-actions">
            <button type="button" data-use-video-subtitle="${index}">\u7F16\u8F91</button>
            <button type="button" data-remove-video-subtitle="${index}">\u79FB\u9664</button>
          </div>
        </div>
      `).join("")
      : `<span class="video-segment-empty">\u672A\u6DFB\u52A0\u5B57\u5E55</span>`;
  }
}

function renderVideoProcessResult() {
  if (!els.videoProcessResult) {
    return;
  }
  const result = state.videoProcess.result;
  if (!result) {
    els.videoProcessResult.hidden = true;
    els.videoProcessResult.innerHTML = "";
    return;
  }
  const before = formatImageBytes(result.source_bytes || 0);
  const after = formatImageBytes(result.output_bytes || 0);
  const ratio = result.source_bytes ? Math.max(0, Math.round((1 - Number(result.output_bytes || 0) / Number(result.source_bytes || 1)) * 100)) : 0;
  const exportedActions = result.exported_dir
    ? `<div class="button-row"><button class="ghost-button" type="button" data-open-video-process-output>\u6253\u5F00\u5BFC\u51FA\u6587\u4EF6\u5939</button></div>`
    : "";
  els.videoProcessResult.hidden = false;
  els.videoProcessResult.innerHTML = `
    <div class="result-card">
      <strong>${escapeHtml(result.name || "\u5904\u7406\u540E\u89C6\u9891")}</strong>
      <span>${escapeHtml(result.width || "-")} x ${escapeHtml(result.height || "-")} / ${escapeHtml(result.format || "-")} / ${escapeHtml(result.quality || "-")}</span>
      <span>${before} -> ${after}${ratio ? ` / -${ratio}%` : ""}</span>
      ${exportedActions}
    </div>
  `;
  els.videoProcessResult.querySelector("[data-open-video-process-output]")?.addEventListener("click", async () => {
    await openPath(result.exported_dir || result.output_dir);
  });
}

function videoProcessRequestBody(outputScope = "work") {
  const settings = state.videoProcess.settings || {};
  const assets = videoProcessAssets();
  const segments = normalizedVideoProcessSegments();
  const subtitles = normalizedVideoProcessSubtitles();
  const pendingSubtitleText = String(els.videoProcessSubtitleTextInput?.value || "").trim();
  if (pendingSubtitleText && subtitles.every((cue) => cue.text !== pendingSubtitleText)) {
    const duration = videoProcessTimelineDuration() || videoProcessAssetDuration();
    subtitles.push({
      text: pendingSubtitleText,
      start: clampVideoProcessTime(els.videoProcessSubtitleStartInput?.value || 0, duration),
      end: clampVideoProcessTime(els.videoProcessSubtitleEndInput?.value || duration, duration),
      size: Number(els.videoProcessSubtitleSizeInput?.value || 32),
      position: els.videoProcessSubtitlePositionInput?.value || "bottom",
      color: els.videoProcessSubtitleColorInput?.value || "#ffffff",
      box: els.videoProcessSubtitleBoxInput?.value || "boxed",
    });
  }
  return {
    upload_id: state.videoProcess.upload?.upload_id || "",
    upload_ids: assets.map((asset) => asset.upload_id),
    format: settings.format,
    quality: settings.quality,
    width: settings.width,
    height: settings.height,
    fps: settings.fps,
    name: settings.name,
    mute: settings.mute,
    output_scope: outputScope,
    trim_start: settings.trimStart,
    trim_end: settings.trimEnd,
    segments,
    clips: segments,
    subtitles,
    subtitle: {
      text: settings.subtitleText || "",
      start: settings.subtitleStart,
      end: settings.subtitleEnd,
      size: settings.subtitleSize,
      position: settings.subtitlePosition,
      color: settings.subtitleColor,
      box: settings.subtitleBox,
    },
    subtitle_style: {
      position: settings.subtitlePosition,
      color: settings.subtitleColor,
      box: settings.subtitleBox,
    },
  };
}

async function compressProcessedVideo() {
  if (!videoProcessSourceReady()) {
    setStatus("\u8BF7\u5148\u5728\u89C6\u9891\u8F6C\u5E8F\u5217\u5E27\u6A21\u5757\u5BFC\u5165\u4E00\u4E2A\u89C6\u9891\u3002", "error");
    return;
  }
  state.videoProcess.settings = videoProcessSettingsFromInputs();
  await withBusy(els.videoProcessCompressButton, async () => {
    setStatus("\u6B63\u5728\u4F7F\u7528 FFmpeg \u751F\u6210\u526A\u8F91\u89C6\u9891...");
    const data = await apiJson("/api/process-video-export", {
      method: "POST",
      body: videoProcessRequestBody("work"),
    });
    state.videoProcess.result = data.video || null;
    renderVideoProcessModule({ syncInputs: false });
    persistSession();
    setStatus("\u5DF2\u751F\u6210\u526A\u8F91\u9884\u89C8\uFF0C\u53EF\u4EE5\u786E\u8BA4\u540E\u5BFC\u51FA\u3002", "success");
  });
}

async function exportVideoProcessResult() {
  if (!state.videoProcess.result?.path) {
    setStatus("\u8BF7\u5148\u70B9\u51FB\u538B\u7F29\u89C6\u9891\u751F\u6210\u7ED3\u679C\u3002", "error");
    return;
  }
  await withBusy(els.videoProcessExportButton, async () => {
    setStatus("\u6B63\u5728\u5BFC\u51FA\u526A\u8F91\u89C6\u9891...");
    const data = await apiJson("/api/export-video-process-result", {
      method: "POST",
      body: {
        path: state.videoProcess.result.path,
        name: state.videoProcess.result.name,
      },
    });
    state.videoProcess.result = {
      ...state.videoProcess.result,
      exported_dir: data.video?.output_dir || "",
      exported_path: data.video?.path || "",
      exported_url: data.video?.url || "",
    };
    renderVideoProcessModule({ syncInputs: false });
    persistSession();
    setStatus("\u5DF2\u5BFC\u51FA\u89C6\u9891\u5230 " + (data.video?.output_dir || "\u8F93\u51FA\u6587\u4EF6\u5939") + "\u3002", "success");
  });
}

function resetProcessPreview(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  setProcessPreview(null, scope);
  resetProcessPreviewView("source", false, scope);
  resetProcessPreviewView("processed", false, scope);
  controls.previewSourceImage.hidden = true;
  controls.previewProcessedImage.hidden = true;
  controls.previewSourceImage.removeAttribute("src");
  controls.previewProcessedImage.removeAttribute("src");
  delete controls.previewSourceImage.dataset.caption;
  delete controls.previewProcessedImage.dataset.caption;
  setProcessPreviewStageActive("source", false, scope);
  setProcessPreviewStageActive("processed", false, scope);
  controls.previewSourceEmpty.hidden = false;
  controls.previewProcessedEmpty.hidden = false;
  controls.processPreviewTimeLabel.textContent = "\u53D6\u6837\u65F6\u95F4 -";
  controls.processPreviewKeyLabel.textContent = "\u53D6\u6837\u65B9\u5F0F - / \u62A0\u56FE -";
  updateSavePreviewButton(scope);
}

function renderProcessPreview(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const previewState = getProcessPreviewState(scope);
  const preview = previewState.preview;
  if (!preview) {
    resetProcessPreview(scope);
    return;
  }

  const sourceModeLabel = formatSourceModeLabel(
    preview.ffmpeg_accel,
    preview.source_media_type || uploadMediaType(scope === "image" ? state.imageUpload : state.upload)
  );
  const previewSourceType = String(preview.source_media_type || uploadMediaType(scope === "image" ? state.imageUpload : state.upload)).toLowerCase();
  resetProcessPreviewPan("source", false, scope);
  resetProcessPreviewPan("processed", false, scope);
  const hasProcessedPreview = Boolean(preview.processed_url);
  controls.previewSourceImage.src = preview.source_url;
  controls.previewSourceImage.dataset.caption = preview.source_name || "";
  if (hasProcessedPreview) {
    controls.previewProcessedImage.src = preview.processed_url;
    controls.previewProcessedImage.dataset.caption = preview.processed_name || "";
  } else {
    controls.previewProcessedImage.removeAttribute("src");
    delete controls.previewProcessedImage.dataset.caption;
  }
  controls.previewSourceImage.hidden = false;
  controls.previewProcessedImage.hidden = !hasProcessedPreview;
  setProcessPreviewStageActive("source", true, scope);
  setProcessPreviewStageActive("processed", hasProcessedPreview, scope);
  controls.previewSourceEmpty.hidden = true;
  controls.previewProcessedEmpty.hidden = hasProcessedPreview;
  const previewOptions = preview.options || {};
  const previewOutputSize = formatSizeLabel(previewOptions.output_width, previewOptions.output_height);
  const previewTimeLabel = previewSourceType === "image"
    ? "\u5355\u5F20\u56FE\u7247\u9884\u89C8"
    : previewSourceType === "image_sequence"
    ? `\u56FE\u7247\u5E8F\u5217\u7B2C ${preview.sample_frame || state.segment.startFrame || 1} \u5E27`
    : `\u53D6\u6837\u65F6\u95F4 ${formatSeconds(preview.sample_time || 0)}`;
  controls.processPreviewTimeLabel.textContent = previewOutputSize
    ? `${previewTimeLabel} / \u8F93\u51FA ${previewOutputSize}`
    : previewTimeLabel;
  const matte = preview.matte || { mode: preview.options?.matte_mode || "chroma" };
  const matteLabel = formatMatteModeLabel(matte);
  const matteDetail = formatMatteDetail(matte);
  const chromaDetail = matte.mode === "chroma" ? ` / \u80CC\u666F\u8272 ${preview.key_color || "-"}` : "";
  controls.processPreviewKeyLabel.textContent = `${sourceModeLabel} / ${matteLabel}${matteDetail ? ` / ${matteDetail}` : ""}${chromaDetail}`;
  updateSavePreviewButton(scope);
  persistSession();
}

function syncSegmentBounds() {
  if (isImageUpload()) {
    [els.startRange, els.endRange].forEach((element) => {
      element.step = "1";
      element.min = "1";
      element.max = "1";
    });
    [els.startInput, els.endInput].forEach((element) => {
      element.max = "1";
    });
    return;
  }
  const frameCount = getSegmentFrameCount();
  [els.startRange, els.endRange].forEach((element) => {
    element.step = "1";
    element.min = "1";
    element.max = String(frameCount);
  });
  [els.startInput, els.endInput].forEach((element) => {
    element.max = String(frameCount);
  });
}

function normalizeSegment(changedKey) {
  if (isImageUpload()) {
    state.segment.start = 0;
    state.segment.end = 0;
    state.segment.startFrame = 1;
    state.segment.endFrame = 1;
    return;
  }
  let startFrame = clampSegmentFrame(state.segment.startFrame);
  let endFrame = clampSegmentFrame(state.segment.endFrame);

  if (endFrame < startFrame) {
    if (changedKey === "start") {
      endFrame = startFrame;
    } else {
      startFrame = endFrame;
    }
  }

  state.segment.startFrame = startFrame;
  state.segment.endFrame = endFrame;
  syncSegmentTimesFromFrames();
}

function muteVideoPreview() {
  els.videoPreview.defaultMuted = true;
  els.videoPreview.muted = true;
  try {
    els.videoPreview.volume = 0;
  } catch (error) {}
}

function playVideoPreviewMuted() {
  muteVideoPreview();
  applySourcePreviewPlaybackRate();
  const playPromise = els.videoPreview.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
  startSegmentPlaybackMonitor();
  updateSourcePreviewPlaybackUI();
}

function pauseSourcePreviewPlayback() {
  els.videoPreview.pause();
  stopSegmentPlaybackMonitor();
  updateSourcePreviewPlaybackUI();
}

function toggleSourcePreviewPlayback() {
  if (!state.upload || !isVideoUpload()) {
    return;
  }
  if (els.videoPreview.paused || els.videoPreview.ended) {
    if (shouldLoopSegmentPlayback(els.videoPreview.currentTime || 0)) {
      restartSegmentPlayback({ autoplay: true });
    } else {
      playVideoPreviewMuted();
    }
  } else {
    pauseSourcePreviewPlayback();
  }
}

function updateSourcePreviewPlaybackUI() {
  if (!els.sourcePreviewPlayButton) {
    return;
  }
  const canPlay = Boolean(state.upload && isVideoUpload());
  const isPlaying = canPlay && !els.videoPreview.paused && !els.videoPreview.ended;
  if (els.sourcePlayerControls) {
    els.sourcePlayerControls.hidden = !canPlay;
  }
  if (els.sourceFrameControls) {
    els.sourceFrameControls.hidden = !canPlay;
  }
  els.sourcePreviewPlayButton.disabled = !canPlay;
  els.sourcePreviewRestartButton.disabled = !canPlay;
  els.sourcePreviewSeekRange.disabled = !canPlay;
  els.sourcePreviewSpeedSelect.disabled = !canPlay;
  [
    els.sourceGoFirstFrameButton,
    els.sourceSetStartFrameButton,
    els.sourcePreviousFrameButton,
    els.sourceNextFrameButton,
    els.sourceSetEndFrameButton,
    els.sourceGoLastFrameButton,
  ].forEach((button) => {
    if (button) {
      button.disabled = !canPlay;
    }
  });
  els.sourcePreviewPlayButton.textContent = isPlaying ? "暂停" : "播放";
  els.sourcePreviewPlayButton.setAttribute("aria-label", isPlaying ? "暂停预览" : "播放预览");
  els.sourcePreviewPlayButton.setAttribute("aria-pressed", isPlaying ? "true" : "false");
  els.sourcePreviewRestartButton.textContent = "重播";
  els.sourcePreviewRestartButton.setAttribute("aria-label", "重播预览");
  const previewTime = Number.isFinite(els.videoPreview.currentTime)
    ? els.videoPreview.currentTime
    : Number(state.segment.start || 0);
  updateSourcePreviewTimeUI(previewTime);
}

function applySourcePreviewPlaybackRate() {
  if (!els.sourcePreviewSpeedSelect) {
    return;
  }
  const rate = clamp(Number(els.sourcePreviewSpeedSelect.value || 1), 0.25, 2);
  els.videoPreview.playbackRate = rate;
}

function seekSourcePreviewFromControl() {
  if (!state.upload || !isVideoUpload()) {
    return;
  }
  const bounds = getSourcePreviewBounds();
  const percent = clamp(Number(els.sourcePreviewSeekRange.value || 0), 0, 1000) / 1000;
  const nextTime = bounds.start + bounds.length * percent;
  els.videoPreview.currentTime = clamp(nextTime, bounds.start, bounds.end);
  updateVideoProgress(els.videoPreview.currentTime || nextTime);
}

function getCurrentSourceFrame() {
  if (!state.upload || !isVideoUpload()) {
    return 1;
  }
  return sourceTimeToFrame(els.videoPreview.currentTime || 0);
}

function sourceTimeToFrame(time) {
  if (!state.upload || !isVideoUpload()) {
    return 1;
  }
  const frameStep = getSegmentFrameStep();
  const frameCount = getSegmentFrameCount();
  const duration = Math.max(Number(currentUploadInfo().duration || els.videoPreview.duration || 0), 0);
  const safeTime = clamp(Number(time || 0), 0, duration);
  return clamp(Math.floor((safeTime + 0.00001) / frameStep) + 1, 1, frameCount);
}

function sourceFrameToTime(frame) {
  if (!state.upload || !isVideoUpload()) {
    return 0;
  }
  const duration = Math.max(Number(currentUploadInfo().duration || els.videoPreview.duration || 0), 0);
  const frameStep = getSegmentFrameStep();
  const clampedFrame = clampSegmentFrame(frame);
  return clamp((clampedFrame - 1) * frameStep, 0, Math.max(0, duration));
}

function seekSourcePreviewToFrame(frame) {
  if (!state.upload || !isVideoUpload() || els.videoPreview.readyState < 1) {
    return;
  }
  pauseSourcePreviewPlayback();
  const nextFrame = clampSegmentFrame(frame);
  const nextTime = sourceFrameToTime(nextFrame);
  els.videoPreview.currentTime = nextTime;
  els.currentTimeLabel.textContent = `当前时间 ${formatSeconds(nextTime)}`;
  updateVideoProgress(nextTime);
  updateSourcePreviewTimeUI(nextTime);
}

function stepSourcePreviewFrame(delta) {
  const currentFrame = getCurrentSourceFrame();
  seekSourcePreviewToFrame(currentFrame + Number(delta || 0));
}

function setSegmentBoundaryFromCurrentFrame(boundary) {
  if (!state.upload || !isVideoUpload()) {
    return;
  }
  const frame = getCurrentSourceFrame();
  const key = boundary === "end" ? "end" : "start";
  state.segment[`${key}Frame`] = clampSegmentFrame(frame);
  normalizeSegment(key);
  renderSegmentControls();
  updateSegmentConfirmationUI();
  updateVideoProgress(els.videoPreview.currentTime || sourceFrameToTime(frame));
  persistSession();
}

function restartSegmentPlayback({ autoplay = true } = {}) {
  if (!state.upload || !isVideoUpload() || els.videoPreview.readyState < 1) {
    updateSourcePreviewPlaybackUI();
    return;
  }
  stopSegmentPlaybackMonitor();
  const segmentStart = getSegmentPlaybackStartTime();
  els.videoPreview.currentTime = segmentStart;
  els.currentTimeLabel.textContent = `\u5f53\u524d ${formatSeconds(segmentStart)}`;
  updateVideoProgress(segmentStart);
  if (autoplay) {
    playVideoPreviewMuted();
  } else {
    updateSourcePreviewPlaybackUI();
  }
}

function getSegmentPlaybackStartTime() {
  if (!state.upload || !isVideoUpload()) {
    return 0;
  }
  const duration = Math.max(Number(currentUploadInfo().duration || 0), 0);
  const segmentStart = clamp(Number(state.segment.start || 0), 0, duration);
  const segmentEnd = clamp(Number(state.segment.end || duration), segmentStart, duration);
  const guard = clamp(getSegmentFrameStep() * 0.1, 0.001, 0.006);
  return segmentEnd > segmentStart ? Math.min(segmentEnd, segmentStart + guard) : segmentStart;
}

function getSourcePreviewBounds() {
  const duration = Math.max(Number(currentUploadInfo().duration || els.videoPreview.duration || 0), 0);
  const segmentStart = clamp(Number(state.segment.start || 0), 0, duration);
  const fallbackEnd = duration || segmentStart;
  const segmentEnd = clamp(Number(state.segment.end || fallbackEnd), segmentStart, fallbackEnd);
  const length = Math.max(segmentEnd - segmentStart, 0.01);
  return { start: segmentStart, end: segmentEnd, length };
}

function getSegmentPlaybackEndTime() {
  if (!state.upload || !isVideoUpload()) {
    return 0;
  }
  const duration = Math.max(Number(currentUploadInfo().duration || 0), 0);
  const segmentStart = clamp(Number(state.segment.start || 0), 0, duration);
  const segmentEnd = clamp(Number(state.segment.end || duration), segmentStart, duration);
  const frameStep = getSegmentFrameStep();
  const guard = clamp(frameStep * 0.35, 0.004, 0.02);
  return Math.max(segmentStart, segmentEnd - guard);
}

function shouldLoopSegmentPlayback(currentTime = els.videoPreview.currentTime || 0) {
  return (
    state.upload &&
    isVideoUpload() &&
    state.segment.end > state.segment.start &&
    Number(currentTime || 0) >= getSegmentPlaybackEndTime()
  );
}

function startSegmentPlaybackMonitor() {
  stopSegmentPlaybackMonitor();
  if (!state.upload || !isVideoUpload()) {
    return;
  }
  const tick = () => {
    state.segmentPlaybackRafId = null;
    if (!state.upload || !isVideoUpload() || els.videoPreview.paused || els.videoPreview.ended) {
      return;
    }
    const current = els.videoPreview.currentTime || 0;
    els.currentTimeLabel.textContent = `\u5f53\u524d ${formatSeconds(current)}`;
    updateVideoProgress(current);
    if (shouldLoopSegmentPlayback(current)) {
      restartSegmentPlayback({ autoplay: true });
      return;
    }
    state.segmentPlaybackRafId = window.requestAnimationFrame(tick);
  };
  state.segmentPlaybackRafId = window.requestAnimationFrame(tick);
}

function stopSegmentPlaybackMonitor() {
  if (state.segmentPlaybackRafId != null) {
    window.cancelAnimationFrame(state.segmentPlaybackRafId);
    state.segmentPlaybackRafId = null;
  }
}

function updateVideoProgress(currentTime = 0) {
  if (!els.videoProgressFill) {
    return;
  }

  const setProgress = (percent) => {
    const progress = clamp(Number(percent || 0), 0, 100);
    els.videoProgressFill.style.setProperty("--progress", `${progress * 3.6}deg`);
    if (els.videoProgressLabel) {
      els.videoProgressLabel.textContent = `${Math.round(progress)}%`;
    }
    if (els.videoProgress) {
      els.videoProgress.setAttribute("aria-valuenow", String(Math.round(progress)));
    }
    if (els.sourcePreviewSeekRange) {
      els.sourcePreviewSeekRange.value = String(Math.round(progress * 10));
      els.sourcePreviewSeekRange.style.setProperty("--seek", `${progress}%`);
    }
  };

  if (!state.upload || !isVideoUpload()) {
    setProgress(0);
    updateSourcePreviewTimeUI(0);
    return;
  }

  const bounds = getSourcePreviewBounds();
  const normalizedCurrent = clamp(Number(currentTime || 0), bounds.start, bounds.end);
  const progress = ((normalizedCurrent - bounds.start) / bounds.length) * 100;
  setProgress(progress);
  updateSourcePreviewTimeUI(currentTime);
}

function updateSourcePreviewTimeUI(currentTime = 0) {
  if (!els.sourcePreviewCurrentTime || !els.sourcePreviewDurationLabel) {
    return;
  }
  if (!state.upload || !isVideoUpload()) {
    els.sourcePreviewCurrentTime.textContent = "0.00s";
    els.sourcePreviewDurationLabel.textContent = "0.00s";
    if (els.sourceCurrentFrameLabel) {
      els.sourceCurrentFrameLabel.textContent = "当前帧 #000";
    }
    return;
  }
  const bounds = getSourcePreviewBounds();
  const elapsed = clamp(Number(currentTime || 0), bounds.start, bounds.end) - bounds.start;
  els.sourcePreviewCurrentTime.textContent = formatSeconds(Math.max(0, elapsed));
  els.sourcePreviewDurationLabel.textContent = formatSeconds(bounds.length);
  if (els.sourceCurrentFrameLabel) {
    const currentFrame = sourceTimeToFrame(currentTime);
    const frameCount = getSegmentFrameCount();
    const padLength = Math.max(3, String(frameCount).length);
    els.sourceCurrentFrameLabel.textContent = `当前帧 #${String(currentFrame).padStart(padLength, "0")} / ${frameCount}`;
  }
}

function renderSegmentControls() {
  const startFrame = clampSegmentFrame(state.segment.startFrame);
  const endFrame = clampSegmentFrame(state.segment.endFrame);
  els.startRange.value = String(startFrame);
  els.startInput.value = String(startFrame);
  els.endRange.value = String(endFrame);
  els.endInput.value = String(endFrame);
  updateSegmentRangeVisual();
  els.segmentLength.textContent = `${Math.max(1, endFrame - startFrame + 1)} \u5E27`;
  const previewTime = Number.isFinite(els.videoPreview.currentTime)
    ? els.videoPreview.currentTime
    : Number(state.segment.start || 0);
  updateVideoProgress(isVideoUpload() ? previewTime : 0);
}

function updateSegmentConfirmationUI() {
  const hasUpload = Boolean(state.upload);
  const isImage = isImageUpload();
  const isSequence = isImageSequenceUpload();
  const startField = els.startRange.closest(".field");
  const endField = els.endRange.closest(".field");
  const segmentSummary = els.segmentLength.closest(".segment-summary");
  if (startField) startField.hidden = isImage;
  if (endField) endField.hidden = isImage;
  if (segmentSummary) segmentSummary.hidden = isImage;
  els.videoToolbar.hidden = !isVideoUpload() || !hasUpload;
  els.videoProgress.hidden = !isVideoUpload() || !hasUpload;
  updateSourcePreviewPlaybackUI();

  if (isImage) {
    state.segment.start = 0;
    state.segment.end = 0;
    state.segment.confirmed = true;
    els.segmentConfirmStatus.className = "segment-status image";
    els.segmentConfirmStatus.textContent = "\u5355\u5F20\u56FE\u7247\u6A21\u5F0F";
    els.segmentConfirmHint.textContent = "\u65E0\u9700\u8C03\u6574\u65F6\u95F4\u8303\u56F4\u3002\u5F53\u524D\u53C2\u6570\u4F1A\u76F4\u63A5\u4F5C\u7528\u4E8E\u8FD9 1 \u5E27\u3002";
    els.previewFrameButton.disabled = !hasUpload;
    els.extractButton.disabled = !hasUpload;
    els.processButton.disabled = !state.extractJob || state.extractSelected.size === 0;
    els.extractStepShell.classList.remove("locked");
    els.extractLockNote.hidden = true;
    els.processStepShell.classList.toggle("locked", !state.extractJob);
    els.processLockNote.hidden = Boolean(state.extractJob);
    updateVideoProgress(0);
    return;
  }

  if (isSequence) {
    state.segment.confirmed = true;
    state.segment.startFrame = clampSegmentFrame(state.segment.startFrame);
    state.segment.endFrame = clampSegmentFrame(state.segment.endFrame);
    els.segmentConfirmStatus.className = "segment-status confirmed";
    els.segmentConfirmStatus.textContent = `\u56FE\u7247\u5E8F\u5217 \u7B2C ${state.segment.startFrame} \u5E27 - \u7B2C ${state.segment.endFrame} \u5E27`;
    els.segmentConfirmHint.textContent = "\u5E8F\u5217\u4F1A\u6309\u6587\u4EF6\u540D\u987A\u5E8F\u5904\u7406\uFF0C\u53EF\u4EE5\u8C03\u6574\u8D77\u6B62\u5E27\u3002\u518D\u6B21\u62D6\u5165\u591A\u56FE\u4F1A\u66FF\u6362\u5F53\u524D\u8F93\u5165\uFF0C\u4E0D\u4F1A\u8FFD\u52A0\u3002";
    els.previewFrameButton.disabled = !hasUpload;
    els.extractButton.disabled = !hasUpload;
    els.processButton.disabled = !state.extractJob || state.extractSelected.size === 0;
    els.extractStepShell.classList.remove("locked");
    els.extractLockNote.hidden = true;
    els.processStepShell.classList.toggle("locked", !state.extractJob);
    els.processLockNote.hidden = Boolean(state.extractJob);
    updateVideoProgress(0);
    return;
  }

  if (!hasUpload) {
    state.segment.confirmed = false;
    els.segmentConfirmStatus.className = "segment-status";
    els.segmentConfirmStatus.textContent = "\u5148\u5BFC\u5165\u7D20\u6750";
    els.segmentConfirmHint.textContent = "\u8F7D\u5165\u89C6\u9891\u540E\uFF0C\u8FD9\u91CC\u4F1A\u5B9E\u65F6\u9884\u89C8\u5E76\u5FAA\u73AF\u5F53\u524D\u9009\u533A\u3002";
    els.previewFrameButton.disabled = true;
    els.extractButton.disabled = true;
    els.processButton.disabled = true;
    els.extractStepShell.classList.add("locked");
    els.extractLockNote.hidden = false;
    els.processStepShell.classList.add("locked");
    els.processLockNote.hidden = false;
    updateVideoProgress(0);
    return;
  }

  state.segment.confirmed = true;
  els.segmentConfirmStatus.className = "segment-status confirmed";
  els.segmentConfirmStatus.textContent = `\u5F53\u524D\u9009\u533A \u7B2C ${state.segment.startFrame} \u5E27 - \u7B2C ${state.segment.endFrame} \u5E27`;
  els.segmentConfirmHint.textContent = "\u62D6\u52A8\u8D77\u70B9\u6216\u7EC8\u70B9\u540E\uFF0C\u5DE6\u4FA7\u89C6\u9891\u4F1A\u7ACB\u5373\u8DF3\u56DE\u65B0\u8D77\u70B9\u5E76\u9759\u97F3\u5FAA\u73AF\u3002";
  els.previewFrameButton.disabled = false;
  els.extractButton.disabled = false;
  els.processButton.disabled = !state.extractJob || state.extractSelected.size === 0;
  els.extractStepShell.classList.remove("locked");
  els.extractLockNote.hidden = true;
  els.processStepShell.classList.toggle("locked", !state.extractJob);
  els.processLockNote.hidden = Boolean(state.extractJob);
  updateVideoProgress(els.videoPreview.currentTime || state.segment.start || 0);
}

async function extractFrames() {
  if (!state.upload) {
    setStatus("请先导入素材，再提取帧。", "error");
    return;
  }

  const progressId = makeProcessProgressId();
  const payload = {
    ...collectProcessingPayload("video"),
    chroma_enabled: false,
    matte_mode: "none",
    key_mode: "auto",
    batch_green_to_black: false,
    batch_green_desaturate: false,
    batch_semitransparent_to_black: false,
    batch_semitransparent_to_opaque: false,
    progress_id: progressId,
  };

  const progressTarget = "extract";
  await withBusy(els.extractButton, async () => {
    stopExtractPreviewTimer();
    startProcessProgress(progressId, estimateProcessingFrameCount(), progressTarget);
    setStatus(isImageUpload() ? "正在准备图片..." : isImageSequenceUpload() ? "正在提取图片序列..." : "正在提取帧...");
    try {
      const data = await apiJson("/api/process", {
        method: "POST",
        body: payload,
      });
      state.extractJob = data.job;
      state.extractSelected = new Set();
      state.extractSelectionTouched = false;
      state.extractSelectionOrder = [];
      setExtractOrderedSelectionMode(false);
      state.extractSimilarity = null;
      state.extractSimilarityInFlight = false;
      state.extractPreview.currentIndex = 0;
      clearFinalJobState();
      renderExtractJob();
      showAnimationWorkbench();
      window.requestAnimationFrame(() => scrollToWorkflowTarget("extractResultPanel"));
      updateProcessProgress(data.job.frame_count, data.job.frame_count);
      setStatus(`提取完成，共 ${data.job.frame_count} 帧。`, "success");
    } finally {
      stopProcessProgressPolling();
      window.setTimeout(() => hideProcessProgress(progressTarget), 900);
    }
  });
}

async function processSelectedFrames() {
  if (!state.extractJob) {
    setStatus("请先在提取结果中选择帧。", "error");
    return;
  }

  const selectedFrames = getSelectedExtractFrames();
  if (selectedFrames.length === 0) {
    setStatus("请先确认选区并选择需要处理的帧。", "error");
    return;
  }

  const progressId = makeProcessProgressId();
  const payload = {
    ...collectProcessingPayload("video"),
    job_id: state.extractJob.job_id,
    selected_indices: selectedFrames.map((frame) => frame.index),
    progress_id: progressId,
  };
  const progressTarget = "process";

  await withBusy(els.processButton, async () => {
    stopPreviewTimer();
    startProcessProgress(progressId, selectedFrames.length, progressTarget);
    setStatus(`正在使用 ${formatMatteModeLabel(currentMatteMode("video"))} 抠图 ${selectedFrames.length} 帧...`);
    try {
      const data = await apiJson("/api/matte-selected-frames", {
        method: "POST",
        body: payload,
      });
      state.job = data.job;
      state.exportResult = null;
      clearMagicPreview();
      state.selected = new Set(data.job.frames.map((frame) => frame.index));
      state.selectionOrder = data.job.frames.map((frame) => frame.index);
      setOrderedSelectionMode(false);
      state.preview.currentIndex = 0;
      renderJob();
      window.requestAnimationFrame(() => scrollToWorkflowTarget("resultPanel"));
      updateProcessProgress(data.job.frame_count, data.job.frame_count);
      setStatus(`抠图完成，共生成 ${data.job.frame_count} 帧。`, "success");
    } finally {
      stopProcessProgressPolling();
      window.setTimeout(() => hideProcessProgress(progressTarget), 900);
    }
  });
}

function makeProcessProgressId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function estimateProcessingFrameCount() {
  if (isImageUpload()) {
    return 1;
  }
  const startFrame = clampSegmentFrame(state.segment.startFrame);
  const endFrame = clampSegmentFrame(state.segment.endFrame);
  const keepEvery = Math.max(1, Number(els.keepEveryInput.value || 1));
  return Math.max(1, Math.floor(Math.max(0, endFrame - startFrame) / keepEvery) + 1);
}

function processProgressElements(target = state.processProgressTarget) {
  if (target === "extract") {
    return {
      root: els.extractProgress,
      fill: els.extractProgressFill,
      label: els.extractProgressLabel,
    };
  }
  if (target === "image") {
    return {
      root: els.imageProcessProgress,
      fill: els.imageProcessProgressFill,
      label: els.imageProcessProgressLabel,
    };
  }
  return {
    root: els.processProgress,
    fill: els.processProgressFill,
    label: els.processProgressLabel,
  };
}

function startProcessProgress(progressId, estimatedTotal, target = "process") {
  stopProcessProgressPolling();
  state.processProgressTarget = target;
  updateProcessProgress(0, estimatedTotal);
  state.processProgressTimerId = window.setInterval(async () => {
    try {
      const data = await apiJson(`/api/process-progress?id=${encodeURIComponent(progressId)}`);
      const progress = data.progress || {};
      updateProcessProgress(progress.current, progress.total || estimatedTotal);
      if (progress.done || progress.error) {
        stopProcessProgressPolling();
      }
    } catch (error) {
      console.warn("process progress polling failed", error);
    }
  }, 400);
}

function stopProcessProgressPolling() {
  if (state.processProgressTimerId != null) {
    window.clearInterval(state.processProgressTimerId);
    state.processProgressTimerId = null;
  }
}

function updateProcessProgress(current, total) {
  const progressEls = processProgressElements();
  const safeTotal = Math.max(1, Math.round(Number(total || 1)));
  const safeCurrent = clamp(Math.round(Number(current || 0)), 0, safeTotal);
  const percent = (safeCurrent / safeTotal) * 100;
  progressEls.root.hidden = false;
  progressEls.fill.style.width = `${percent}%`;
  progressEls.label.textContent = `\u5904\u7406\u4E2D ${safeCurrent}/${safeTotal}`;
  progressEls.root.setAttribute("aria-valuenow", String(Math.round(percent)));
}

function hideProcessProgress(target = state.processProgressTarget) {
  const progressEls = processProgressElements(target);
  progressEls.root.hidden = true;
  progressEls.fill.style.width = "0%";
  progressEls.label.textContent = "\u5904\u7406\u4E2D 0/0";
  progressEls.root.setAttribute("aria-valuenow", "0");
}

async function previewCurrentImage() {
  if (!state.imageUpload) {
    setStatus("\u8BF7\u5148\u5BFC\u5165\u56FE\u7247\u540E\u518D\u9884\u89C8\u3002", "error");
    return;
  }

  const sampleFrame = 1;
  const payload = {
    ...collectImageProcessingPayload(""),
    sample_time: 0,
    sample_frame: sampleFrame,
  };

  await withBusy(els.imagePreviewFrameButton, async () => {
    const matteMode = currentMatteMode("image");
    const matteLabel = formatMatteModeLabel(matteMode);
    setStatus(matteMode !== "none" ? "Previewing " + matteLabel + " matte..." : "Previewing current frame...");
    const data = await apiJson("/api/preview-frame", {
      method: "POST",
      body: payload,
    });
    setProcessPreview(data.preview, "image");
    renderProcessPreview("image");
    const mediaType = uploadMediaType(state.imageUpload);
    setStatus("\u56FE\u7247\u9884\u89C8\u5DF2\u66F4\u65B0\u3002", "success");
  });
}

async function previewCurrentFrame() {
  if (!state.upload) {
    setStatus("\u5148\u5BFC\u5165\u89C6\u9891\u3001\u56FE\u7247\u6216\u591A\u56FE\u5E8F\u5217\uFF0C\u518D\u9884\u89C8\u53C2\u6570\u6548\u679C\u3002", "error");
    return;
  }

  const duration = Number(currentUploadInfo().duration || 0);
  const sampleFrame = isImageSequenceUpload() ? clampSegmentFrame(state.segment.startFrame) : 1;
  const rawCurrentTime = isImageUpload() || isImageSequenceUpload() ? 0 : Number(els.videoPreview.currentTime || state.segment.start || 0);
  const segmentStart = isImageUpload() || isImageSequenceUpload() ? 0 : getSegmentPlaybackStartTime();
  const segmentEnd = isImageUpload() || isImageSequenceUpload() ? 0 : getSegmentPlaybackEndTime();
  const sampleTime = isImageUpload() || isImageSequenceUpload()
    ? 0
    : clamp(rawCurrentTime, segmentStart, Math.max(segmentStart, segmentEnd));
  const payload = {
    ...collectProcessingPayload("video"),
    sample_time: sampleTime,
    sample_frame: sampleFrame,
  };

  await withBusy(els.previewFrameButton, async () => {
    const matteMode = currentMatteMode("video");
    const matteLabel = formatMatteModeLabel(matteMode);
    setStatus(
      matteMode !== "none"
        ? `\u6B63\u5728\u9884\u89C8 ${matteLabel} \u62A0\u56FE\u3002`
        : isImageUpload()
        ? "\u6B63\u5728\u5957\u7528\u53C2\u6570\u9884\u89C8\u5355\u5F20\u56FE\u7247..."
        : isImageSequenceUpload()
        ? `\u6B63\u5728\u9884\u89C8\u56FE\u7247\u5E8F\u5217\u7B2C ${sampleFrame} \u5E27...`
        : "\u6b63\u5728\u62BD\u53D6\u5F53\u524D\u5E27\u5E76\u5957\u7528\u53C2\u6570..."
    );
    const data = await apiJson("/api/preview-frame", {
      method: "POST",
      body: payload,
    });
    setProcessPreview(data.preview, "video");
    renderProcessPreview("video");
    setStatus(
      isImageUpload()
        ? `\u5355\u5F20\u56FE\u7247\u9884\u89C8\u5DF2\u66F4\u65B0\uFF0C${formatSourceModeLabel(data.preview.ffmpeg_accel, data.preview.source_media_type)}\u3002`
        : isImageSequenceUpload()
        ? `\u56FE\u7247\u5E8F\u5217\u7B2C ${data.preview.sample_frame || sampleFrame} \u5E27\u9884\u89C8\u5DF2\u66F4\u65B0\uFF0C${formatSourceModeLabel(data.preview.ffmpeg_accel, data.preview.source_media_type)}\u3002`
        : `\u5355\u5E27\u9884\u89C8\u5DF2\u66F4\u65B0\uFF0C\u53D6\u6837\u65F6\u95F4 ${formatSeconds(sampleTime)}\uFF0C${formatSourceModeLabel(data.preview.ffmpeg_accel, data.preview.source_media_type)}\u3002`,
      "success"
    );
  });
}

async function downloadProcessPreviewResult(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const previewState = getProcessPreviewState(scope);
  const preview = previewState.preview;
  if (!preview?.processed_url) {
    setStatus("\u5148\u9884\u89C8\u5F53\u524D\u5E27\uFF0C\u518D\u4E0B\u8F7D\u9884\u89C8\u56FE\u3002", "error");
    return;
  }
  if (!preview?.preview_id) {
    setStatus("\u8FD9\u5F20\u9884\u89C8\u56FE\u7F3A\u5C11\u6807\u8BC6\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u4E00\u6B21\u3002", "error");
    return;
  }

  await withBusy(controls.savePreviewButton, async () => {
    const filename = buildPreviewDownloadFilename(scope);
    triggerFileDownload(preview.processed_url, filename);
    setStatus(`\u5DF2\u5F00\u59CB\u4E0B\u8F7D\u9884\u89C8\u56FE\uFF1A${filename}`, "success");
  });
}

async function applyGreenToBlackPreview(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const previewState = getProcessPreviewState(scope);
  const preview = previewState.preview;
  if (!preview?.preview_id) {
    setStatus("\u5148\u9884\u89C8\u5F53\u524D\u5E27\uFF0C\u518D\u5904\u7406\u6B8B\u7559\u7EFF\u8272\u3002", "error");
    return;
  }

  await withBusy(controls.greenToBlackButton, async () => {
    setStatus("\u6B63\u5728\u628A\u9884\u89C8\u56FE\u91CC\u7684\u6B8B\u7559\u7EFF\u8272\u6D82\u9ED1...");
    const data = await apiJson("/api/preview-green-to-black", {
      method: "POST",
      body: {
        preview_id: preview.preview_id,
        threshold: 42,
        dominance: 24,
      },
    });
    setProcessPreview(data.preview, scope);
    renderProcessPreview(scope);
    const changed = Number(data.preview?.postprocess?.green_to_black?.changed_pixels || 0);
    setStatus(`\u6B8B\u7EFF\u6D82\u9ED1\u5B8C\u6210\uFF0C\u5904\u7406\u4E86 ${changed.toLocaleString()} \u4E2A\u50CF\u7D20\u3002`, "success");
  });
}

async function applyGreenDesaturatePreview(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const previewState = getProcessPreviewState(scope);
  const preview = previewState.preview;
  if (!preview?.preview_id) {
    setStatus("\u5148\u9884\u89C8\u5F53\u524D\u5E27\uFF0C\u518D\u5904\u7406\u6B8B\u7559\u7EFF\u8272\u3002", "error");
    return;
  }

  await withBusy(controls.greenDesaturateButton, async () => {
    setStatus("\u6B63\u5728\u628A\u9884\u89C8\u56FE\u91CC\u7684\u6B8B\u7559\u7EFF\u8272\u53BB\u9971\u548C...");
    const data = await apiJson("/api/preview-green-desaturate", {
      method: "POST",
      body: {
        preview_id: preview.preview_id,
        threshold: 42,
        dominance: 24,
      },
    });
    setProcessPreview(data.preview, scope);
    renderProcessPreview(scope);
    const changed = Number(data.preview?.postprocess?.green_desaturate?.changed_pixels || 0);
    setStatus(`\u6B8B\u7EFF\u53BB\u9971\u548C\u5B8C\u6210\uFF0C\u5904\u7406\u4E86 ${changed.toLocaleString()} \u4E2A\u50CF\u7D20\u3002`, "success");
  });
}

async function applySemiTransparentToBlackPreview(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const previewState = getProcessPreviewState(scope);
  const preview = previewState.preview;
  if (!preview?.preview_id) {
    setStatus("\u5148\u9884\u89C8\u5F53\u524D\u5E27\uFF0C\u518D\u5904\u7406\u534A\u900F\u660E\u50CF\u7D20\u3002", "error");
    return;
  }

  await withBusy(controls.semiTransparentToBlackButton, async () => {
    setStatus("\u6B63\u5728\u628A\u9884\u89C8\u56FE\u91CC\u7684\u534A\u900F\u660E\u50CF\u7D20\u6D82\u9ED1...");
    const data = await apiJson("/api/preview-semitransparent-to-black", {
      method: "POST",
      body: {
        preview_id: preview.preview_id,
        alpha_min: 1,
        alpha_max: 254,
      },
    });
    setProcessPreview(data.preview, scope);
    renderProcessPreview(scope);
    const changed = Number(data.preview?.postprocess?.semitransparent_to_black?.changed_pixels || 0);
    setStatus(`\u534A\u900F\u6D82\u9ED1\u5B8C\u6210\uFF0C\u5904\u7406\u4E86 ${changed.toLocaleString()} \u4E2A\u50CF\u7D20\u3002`, "success");
  });
}

async function applySemiTransparentToOpaquePreview(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const previewState = getProcessPreviewState(scope);
  const preview = previewState.preview;
  if (!preview?.preview_id) {
    setStatus("\u5148\u9884\u89C8\u5F53\u524D\u5E27\uFF0C\u518D\u628A\u534A\u900F\u660E\u50CF\u7D20\u53D8\u6210\u4E0D\u900F\u660E\u3002", "error");
    return;
  }

  await withBusy(controls.semiTransparentToOpaqueButton, async () => {
    setStatus("\u6B63\u5728\u4FDD\u7559\u534A\u900F\u50CF\u7D20\u989C\u8272\uFF0C\u5E76\u628A alpha \u63D0\u5230\u4E0D\u900F\u660E...");
    const data = await apiJson("/api/preview-semitransparent-to-opaque", {
      method: "POST",
      body: {
        preview_id: preview.preview_id,
        alpha_min: 1,
        alpha_max: 254,
      },
    });
    setProcessPreview(data.preview, scope);
    renderProcessPreview(scope);
    const changed = Number(data.preview?.postprocess?.semitransparent_to_opaque?.changed_pixels || 0);
    setStatus(`\u534A\u900F\u53D8\u4E0D\u900F\u660E\u5B8C\u6210\uFF0C\u5904\u7406\u4E86 ${changed.toLocaleString()} \u4E2A\u50CF\u7D20\u3002`, "success");
  });
}

function buildPreviewDownloadFilename(scope = activeMatteScope()) {
  const previewState = getProcessPreviewState(scope);
  const upload = scope === "image" ? state.imageUpload : state.upload;
  const sourceName = stripFileExtension(upload?.display_name || "");
  const safeSourceName = sanitizeDownloadFilenamePart(sourceName, "sprite-preview");
  const safePreviewId = sanitizeDownloadFilenamePart(previewState.preview?.preview_id || localTimestamp(), localTimestamp());
  return `${safeSourceName}-preview-${safePreviewId}.png`;
}

function stripFileExtension(name) {
  return String(name || "").replace(/\.[^./\\]+$/, "");
}

function sanitizeDownloadFilenamePart(value, fallback) {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/[.\- ]+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

function localTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function triggerFileDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function setImageLightboxZoom(zoom) {
  if (!els.imageLightboxImage) {
    return;
  }
  const normalized = clamp(Number(zoom) || 1, IMAGE_LIGHTBOX_ZOOM_MIN, IMAGE_LIGHTBOX_ZOOM_MAX);
  els.imageLightboxImage.dataset.zoom = String(normalized);
  els.imageLightboxImage.style.setProperty("--lightbox-zoom", String(normalized));
  els.imageLightbox?.classList.toggle("is-zoomed", normalized > 1.01);
}

function normalizeLightboxBackgroundColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff";
}

function setImageLightboxBackground(mode = state.imageLightboxBackground.mode, color = state.imageLightboxBackground.color) {
  const normalizedMode = mode === "transparent" ? "transparent" : "opaque";
  const normalizedColor = normalizeLightboxBackgroundColor(color);
  state.imageLightboxBackground.mode = normalizedMode;
  state.imageLightboxBackground.color = normalizedColor;
  if (els.imageLightboxColorInput) {
    els.imageLightboxColorInput.value = normalizedColor;
    els.imageLightboxColorInput.disabled = normalizedMode === "transparent";
  }
  els.imageLightboxColorField?.classList.toggle("is-disabled", normalizedMode === "transparent");
  els.imageLightboxTransparentButton?.classList.toggle("active", normalizedMode === "transparent");
  els.imageLightboxOpaqueButton?.classList.toggle("active", normalizedMode === "opaque");
  els.imageLightbox?.classList.toggle("is-transparent-bg", normalizedMode === "transparent");
  els.imageLightbox?.classList.toggle("is-opaque-bg", normalizedMode === "opaque");
  els.imageLightbox?.style.setProperty("--lightbox-bg-color", normalizedColor);
  if (imageNineSliceEditorState) {
    renderImageNineSliceEditor();
  }
}

function handleImageLightboxWheel(event) {
  if (!els.imageLightbox || els.imageLightbox.hidden || !els.imageLightboxImage?.currentSrc) {
    return;
  }
  if (event.target?.closest?.(".image-nine-slice-editor")) {
    return;
  }
  event.preventDefault();
  const current = Number(els.imageLightboxImage.dataset.zoom || 1);
  const direction = event.deltaY > 0 ? -1 : 1;
  const factor = direction > 0 ? 1.12 : 1 / 1.12;
  setImageLightboxZoom(current * factor);
}

function openImageLightbox(url, caption = "", options = {}) {
  if (!url || !els.imageLightbox || !els.imageLightboxImage) {
    return;
  }
  imageLightboxEditContext = options.namingItemKey
    ? {
        itemKey: options.namingItemKey,
        sourceImage: options.sourceImage || null,
        aspectLocked: true,
        aspectRatio: null,
      }
    : null;
  els.imageLightboxImage.src = url;
  els.imageLightboxCaption.textContent = caption || "";
  imageNineSliceEditorState = null;
  if (els.imageNineSliceEditor) {
    els.imageNineSliceEditor.hidden = true;
  }
  els.imageLightbox.classList.remove("has-nine-slice-editor");
  setImageLightboxZoom(1);
  setImageLightboxBackground();
  renderImageLightboxNamingEditor();
  els.imageLightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function closeImageLightbox() {
  if (!els.imageLightbox || !els.imageLightboxImage) {
    return;
  }
  els.imageLightbox.hidden = true;
  els.imageLightboxImage.removeAttribute("src");
  els.imageLightboxImage.removeAttribute("style");
  delete els.imageLightboxImage.dataset.zoom;
  els.imageLightbox.classList.remove("is-zoomed", "has-naming-editor", "has-nine-slice-editor");
  els.imageLightboxCaption.textContent = "";
  if (els.imageLightboxNamingEditor) {
    els.imageLightboxNamingEditor.hidden = true;
  }
  if (els.imageLightboxNineSliceButton) {
    els.imageLightboxNineSliceButton.hidden = true;
  }
  if (els.imageNineSliceEditor) {
    els.imageNineSliceEditor.hidden = true;
  }
  imageLightboxEditContext = null;
  imageNineSliceEditorState = null;
  document.body.classList.remove("lightbox-open");
}

function updateSavePreviewButton(scope = activeMatteScope()) {
  const controls = {
    savePreviewButton: getDirectMatteElement("savePreviewButton", scope),
    greenToBlackButton: getDirectMatteElement("greenToBlackButton", scope),
    greenDesaturateButton: getDirectMatteElement("greenDesaturateButton", scope),
    semiTransparentToBlackButton: getDirectMatteElement("semiTransparentToBlackButton", scope),
    semiTransparentToOpaqueButton: getDirectMatteElement("semiTransparentToOpaqueButton", scope),
  };
  if (!controls.savePreviewButton || !controls.greenToBlackButton || !controls.greenDesaturateButton || !controls.semiTransparentToBlackButton || !controls.semiTransparentToOpaqueButton) {
    return;
  }

  const previewState = getProcessPreviewState(scope);
  const preview = previewState.preview;
  const upload = scope === "image" ? state.imageUpload : state.upload;
  const isSameUpload = !preview?.upload_id || preview.upload_id === upload?.upload_id;
  const canDownload = Boolean(upload && isSameUpload && preview?.preview_id && preview?.processed_url);
  const canPostprocess = Boolean(upload && isSameUpload && preview?.preview_id);
  controls.greenToBlackButton.hidden = !upload;
  controls.greenToBlackButton.disabled = !canPostprocess;
  controls.greenDesaturateButton.hidden = !upload;
  controls.greenDesaturateButton.disabled = !canPostprocess;
  controls.semiTransparentToBlackButton.hidden = !upload;
  controls.semiTransparentToBlackButton.disabled = !canPostprocess;
  controls.semiTransparentToOpaqueButton.hidden = !upload;
  controls.semiTransparentToOpaqueButton.disabled = !canPostprocess;
  controls.savePreviewButton.hidden = !upload;
  controls.savePreviewButton.disabled = !canDownload;
}

function normalizeExtractSimilarityThresholdInput(writeValue = true) {
  const raw = Number(els.extractSimilarityThresholdInput?.value || EXTRACT_SIMILARITY_DEFAULT_THRESHOLD);
  const threshold = clamp(Math.round(raw / 5) * 5, 50, 100);
  if (writeValue && els.extractSimilarityThresholdInput) {
    els.extractSimilarityThresholdInput.value = String(threshold);
  }
  return threshold;
}

function extractSimilarityOptions() {
  return {
    ignoreNear: Boolean(els.extractSimilarityIgnoreNearInput?.checked),
    ignoreNearCount: EXTRACT_SIMILARITY_NEAR_FRAME_COUNT,
    threshold: normalizeExtractSimilarityThresholdInput(),
  };
}

function setExtractSimilarityStatus(message) {
  if (els.extractSimilarityStatus) {
    els.extractSimilarityStatus.textContent = message;
  }
}

function serializableExtractSimilarity() {
  if (!state.extractSimilarity?.entries?.length) {
    return null;
  }
  return {
    jobId: state.extractSimilarity.jobId,
    options: state.extractSimilarity.options,
    summary: state.extractSimilarity.summary,
    entries: state.extractSimilarity.entries.map((entry) => ({
      index: entry.index,
      bestIndex: entry.bestIndex,
      bestDiff: entry.bestDiff,
      relativeScore: entry.relativeScore,
      displayScore: entry.displayScore,
      groupId: entry.groupId,
      groupColor: entry.groupColor,
      isGrouped: entry.isGrouped,
      duplicate: entry.duplicate,
    })),
  };
}

function restoreExtractSimilarity(snapshot) {
  if (!snapshot?.entries?.length || !state.extractJob?.job_id || snapshot.jobId !== state.extractJob.job_id) {
    state.extractSimilarity = null;
    return;
  }
  state.extractSimilarity = {
    jobId: snapshot.jobId,
    options: snapshot.options || extractSimilarityOptions(),
    summary: snapshot.summary || null,
    entries: snapshot.entries,
  };
  refreshExtractSimilarityGroups(false);
}

function invalidateExtractSimilarity(message = "相似帧分析已清空。") {
  state.extractSimilarity = null;
  setExtractSimilarityStatus(message);
  renderExtractFrames();
}

function extractSimilarityMap() {
  return new Map((state.extractSimilarity?.entries || []).map((entry) => [entry.index, entry]));
}

function relativeScoreToDisplayScore(relativeScore) {
  const bucket = relativeScore >= 99.995 ? 100 : Math.floor(clamp(relativeScore, 90, 100));
  return clamp((bucket - 80) * 5, 50, 100);
}

function compareExtractSimilarityFeatures(a, b) {
  let tone = 0;
  let edge = 0;
  for (let index = 0; index < a.tone.length; index += 1) {
    tone += Math.abs(a.tone[index] - b.tone[index]);
    edge += Math.abs(a.edge[index] - b.edge[index]);
  }
  const count = Math.max(a.tone.length, 1);
  return (tone / count) * 0.76 + (edge / count) * 0.24;
}

function normalizeFeatureVector(values) {
  const count = Math.max(values.length, 1);
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const centered = values.map((value) => value - mean);
  const variance = centered.reduce((sum, value) => sum + value * value, 0) / count;
  const deviation = Math.sqrt(variance) || 1;
  return centered.map((value) => value / deviation);
}

async function extractSimilarityFeature(frame) {
  const image = await loadPreviewImage(frame.thumb_url || frame.url);
  const size = EXTRACT_SIMILARITY_THUMB_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data;
  const gray = [];
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3] / 255;
    const red = pixels[offset] * alpha + 255 * (1 - alpha);
    const green = pixels[offset + 1] * alpha + 255 * (1 - alpha);
    const blue = pixels[offset + 2] * alpha + 255 * (1 - alpha);
    gray.push((0.299 * red + 0.587 * green + 0.114 * blue) / 255);
  }
  const tone = normalizeFeatureVector(gray);
  const edgeRaw = tone.map((value, index) => {
    const x = index % size;
    const y = Math.floor(index / size);
    const right = x < size - 1 ? tone[index + 1] : value;
    const down = y < size - 1 ? tone[index + size] : value;
    return Math.abs(right - value) + Math.abs(down - value);
  });
  return {
    index: frame.index,
    tone,
    edge: normalizeFeatureVector(edgeRaw),
  };
}

function buildExtractSimilarityEntries(frames, features, options) {
  const entries = frames.map((frame, framePosition) => {
    const feature = features[framePosition];
    const allCandidates = features.filter((candidate) => candidate.index !== frame.index);
    let candidates = allCandidates;
    if (options.ignoreNear) {
      candidates = allCandidates.filter((candidate) => Math.abs(candidate.index - frame.index) > options.ignoreNearCount);
      if (!candidates.length) {
        candidates = allCandidates;
      }
    }

    let bestIndex = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    candidates.forEach((candidate) => {
      const diff = compareExtractSimilarityFeatures(feature, candidate);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = candidate.index;
      }
    });

    return {
      index: frame.index,
      bestIndex,
      bestDiff: Number.isFinite(bestDiff) ? bestDiff : 0,
      relativeScore: 100,
      displayScore: 100,
      groupId: null,
      groupColor: null,
      isGrouped: false,
      duplicate: false,
    };
  });

  const finiteDiffs = entries.map((entry) => entry.bestDiff).filter(Number.isFinite);
  const minDiff = Math.min(...finiteDiffs);
  const maxDiff = Math.max(...finiteDiffs);
  const span = Math.max(maxDiff - minDiff, 0);
  entries.forEach((entry) => {
    const relativeScore = span <= 0 ? 100 : 90 + ((maxDiff - entry.bestDiff) / span) * 10;
    entry.relativeScore = Number(relativeScore.toFixed(2));
    entry.displayScore = relativeScoreToDisplayScore(relativeScore);
  });
  return entries;
}

function applyExtractSimilarityGroups(analysis, threshold = normalizeExtractSimilarityThresholdInput()) {
  if (!analysis?.entries?.length) {
    return analysis;
  }
  const indices = analysis.entries.map((entry) => entry.index);
  const parent = new Map(indices.map((index) => [index, index]));
  const find = (index) => {
    let root = parent.get(index);
    while (root !== parent.get(root)) {
      root = parent.get(root);
    }
    let cursor = index;
    while (cursor !== root) {
      const next = parent.get(cursor);
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  const union = (a, b) => {
    if (!parent.has(a) || !parent.has(b)) return;
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent.set(rootB, rootA);
    }
  };

  analysis.entries.forEach((entry) => {
    if (entry.bestIndex != null && entry.displayScore >= threshold) {
      union(entry.index, entry.bestIndex);
    }
  });

  const components = new Map();
  indices.forEach((index) => {
    const root = find(index);
    if (!components.has(root)) {
      components.set(root, []);
    }
    components.get(root).push(index);
  });

  const groupByIndex = new Map();
  let groupNumber = 0;
  [...components.values()]
    .filter((members) => members.length > 1)
    .sort((a, b) => Math.min(...a) - Math.min(...b))
    .forEach((members) => {
      groupNumber += 1;
      const firstIndex = Math.min(...members);
      const color = EXTRACT_SIMILARITY_GROUP_COLORS[(groupNumber - 1) % EXTRACT_SIMILARITY_GROUP_COLORS.length];
      members.forEach((index) => groupByIndex.set(index, { groupId: groupNumber, color, firstIndex, size: members.length }));
    });

  analysis.entries.forEach((entry) => {
    const group = groupByIndex.get(entry.index);
    entry.groupId = group?.groupId || null;
    entry.groupColor = group?.color || null;
    entry.isGrouped = Boolean(group);
    entry.duplicate = Boolean(group && entry.index !== group.firstIndex);
  });

  const groupedFrameCount = analysis.entries.filter((entry) => entry.isGrouped).length;
  analysis.summary = {
    frameCount: analysis.entries.length,
    groupCount: groupNumber,
    groupedFrameCount,
    threshold,
    ignoreNear: Boolean(analysis.options?.ignoreNear),
    ignoreNearCount: analysis.options?.ignoreNearCount || EXTRACT_SIMILARITY_NEAR_FRAME_COUNT,
  };
  return analysis;
}

function renderExtractSimilarityStatus() {
  if (state.extractSimilarityInFlight) {
    setExtractSimilarityStatus("正在等待相似帧分析。");
    return;
  }
  const summary = state.extractSimilarity?.summary;
  if (!summary) {
    setExtractSimilarityStatus("尚未进行相似帧分析。");
    return;
  }
  const ignoreLabel = summary.ignoreNear ? `已忽略相邻 ${summary.ignoreNearCount} 帧` : "包含相邻帧";
  setExtractSimilarityStatus(
    `总帧数 ${summary.frameCount} / 相似组 ${summary.groupCount} / 已归组 ${summary.groupedFrameCount} / ${ignoreLabel}`
  );
}

function refreshExtractSimilarityGroups(shouldRender = true) {
  if (!state.extractSimilarity?.entries?.length) {
    renderExtractSimilarityStatus();
    syncResultActions();
    return;
  }
  applyExtractSimilarityGroups(state.extractSimilarity);
  renderExtractSimilarityStatus();
  if (shouldRender) {
    renderExtractFrames();
  }
  persistSession();
}

async function analyzeExtractSimilarity() {
  if (!state.extractJob?.frames?.length) {
    setStatus("请先提取帧，再分析相似帧。", "error");
    return;
  }
  const frames = state.extractJob.frames;
  if (frames.length < 2) {
    setStatus("至少需要 2 帧才能分析相似度。", "error");
    return;
  }

  const options = extractSimilarityOptions();
  state.extractSimilarityInFlight = true;
  state.extractSimilarity = null;
  syncResultActions();
  setExtractSimilarityStatus(`正在分析 ${frames.length} 帧...`);

  try {
    const features = [];
    for (let index = 0; index < frames.length; index += 1) {
      features.push(await extractSimilarityFeature(frames[index]));
      if (index % 8 === 0 || index === frames.length - 1) {
        setExtractSimilarityStatus(`正在分析 ${index + 1}/${frames.length}`);
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
      }
    }

    setExtractSimilarityStatus("相似帧分析完成。");
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    const entries = buildExtractSimilarityEntries(frames, features, options);
    state.extractSimilarity = applyExtractSimilarityGroups({
      jobId: state.extractJob.job_id,
      options,
      entries,
      summary: null,
    }, options.threshold);
    renderExtractFrames();
    setStatus("相似帧分析完成。", "success");
  } catch (error) {
    state.extractSimilarity = null;
    setExtractSimilarityStatus("相似帧分析失败。");
    setStatus(error.message || String(error), "error");
  } finally {
    state.extractSimilarityInFlight = false;
    syncResultActions();
    renderExtractSimilarityStatus();
    persistSession();
  }
}

function applyExtractSimilarityKeepFirst() {
  if (!state.extractJob || !state.extractSimilarity?.entries?.length) {
    return;
  }
  const entryMap = extractSimilarityMap();
  state.extractSelected = new Set(
    state.extractJob.frames
      .filter((frame) => {
        const entry = entryMap.get(frame.index);
        return !entry?.duplicate;
      })
      .map((frame) => frame.index)
  );
  state.extractSelectionOrder = state.extractJob.frames.filter((frame) => state.extractSelected.has(frame.index)).map((frame) => frame.index);
  state.extractPreview.currentIndex = 0;
  state.extractSelectionTouched = true;
  renderExtractFrames();
  setStatus("已保留每组相似帧中的第一帧。", "success");
}

function applyExtractSimilarityDropSimilar() {
  if (!state.extractJob || !state.extractSimilarity?.entries?.length) {
    return;
  }
  const entryMap = extractSimilarityMap();
  state.extractSelected = new Set(
    [...state.extractSelected].filter((index) => {
      const entry = entryMap.get(index);
      return !entry?.duplicate;
    })
  );
  state.extractSelectionOrder = state.extractSelectionOrder.filter((index) => state.extractSelected.has(index));
  state.extractPreview.currentIndex = 0;
  state.extractSelectionTouched = true;
  renderExtractFrames();
  setStatus("已移除相似帧。", "success");
}

function renderExtractJob() {
  if (!state.extractJob) {
    showExtractWorkbench();
    return;
  }

  const options = state.extractJob.options || {};
  const sourceMediaType = state.extractJob.source_media_type || uploadMediaType();
  const outputWidth = options.output_width || options.target_size || "-";
  const outputHeight = options.output_height || options.target_size || "-";
  const sourceHeight = Number(state.extractJob.video_info?.height || 0);
  const legacyOutputScale = sourceHeight && options.target_size ? Number(options.target_size) / sourceHeight : 0;
  const outputScaleLabel = formatOutputScaleLabel(options.output_scale || legacyOutputScale);
  els.extractResultPanel.hidden = false;
  els.extractJobSummary.innerHTML = [
    summaryCard("任务 ID", escapeHtml(state.extractJob.job_id)),
    summaryCard("帧数", `${state.extractJob.frame_count} 帧`),
    summaryCard("来源", escapeHtml(formatSourceModeLabel(state.extractJob.ffmpeg_accel, sourceMediaType))),
    summaryCard("输出比例", escapeHtml(outputScaleLabel)),
    summaryCard("输出尺寸", `${outputWidth} x ${outputHeight}`),
    summaryCard("画布", escapeHtml(formatCanvasModeLabel(options.canvas_mode))),
    summaryCard("采样", sourceMediaType === "image" ? "单张图片" : sourceMediaType === "image_sequence" ? "图片序列" : `每 ${options.keep_every || 1} 帧保留 1 帧`),
  ].join("");
  renderExtractFrames();
  syncResultActions();
  persistSession();
}

function renderExtractFrames() {
  if (!state.extractJob) {
    els.extractFrameGrid.innerHTML = "";
    renderExtractSelectionCount();
    syncExtractAnimationPreview();
    return;
  }

  const orderMap = state.extractOrderedSelectionMode ? getExtractSelectionOrderMap() : new Map();
  const similarityMap = extractSimilarityMap();
  els.extractFrameGrid.innerHTML = state.extractJob.frames
    .map((frame) => {
      const checked = state.extractSelected.has(frame.index);
      const frameNumber = String(frame.index + 1).padStart(3, "0");
      const orderNumber = orderMap.get(frame.index);
      const similarity = similarityMap.get(frame.index);
      const similarFrameNumber = similarity?.bestIndex != null ? String(similarity.bestIndex + 1).padStart(3, "0") : "";
      const similarityClasses = similarity
        ? `has-similarity ${similarity.isGrouped ? "similarity-grouped" : "similarity-single"}`
        : "";
      const similarityStyle = similarity?.groupColor ? ` style="--similarity-color: ${similarity.groupColor};"` : "";
      const similarityBadge = similarity
        ? `<span class="similarity-badge" title="相似度 ${similarity.relativeScore} / #${similarFrameNumber}">${similarity.displayScore}%</span>`
        : "";
      const similarityMeta = similarity
        ? `<span class="similarity-match">#${similarFrameNumber}${similarity.groupId ? ` / G${similarity.groupId}` : ""}</span>`
        : "";
      return `
        <label class="frame-card ${checked ? "selected" : ""} ${similarityClasses}" data-index="${frame.index}"${similarityStyle}>
          ${similarityBadge}
          <div class="frame-check ${orderNumber ? "ordered" : ""}">
            <input type="checkbox" data-index="${frame.index}" ${checked ? "checked" : ""}>
            ${orderNumber ? `<span class="frame-order-number">${orderNumber}</span>` : ""}
          </div>
          <img src="${frame.thumb_url}" alt="第 ${frameNumber} 帧">
          <div class="frame-meta">
            <span>#${frameNumber}</span>
            ${similarityMeta}
            <span>${escapeHtml(displayFrameName(frame, frameNumber))}</span>
          </div>
        </label>
      `;
    })
    .join("");
  renderExtractSelectionCount();
  syncExtractAnimationPreview();
  syncResultActions();
  renderExtractSimilarityStatus();
  persistSession();
}

function renderExtractSelectionCount() {
  const total = state.extractJob?.frame_count || 0;
  els.extractSelectionCount.textContent = `已选择 ${state.extractSelected.size} / ${total} 帧`;
  syncResultActions();
}

function refreshExtractCardSelection(index, checked) {
  const card = els.extractFrameGrid.querySelector(`.frame-card[data-index="${index}"]`);
  if (card) {
    card.classList.toggle("selected", checked);
  }
}

function setExtractOrderedSelectionMode(enabled) {
  state.extractOrderedSelectionMode = Boolean(enabled);
  if (els.extractOrderedSelectionInput) {
    els.extractOrderedSelectionInput.checked = state.extractOrderedSelectionMode;
  }
}

function setExtractFrameSelected(index, checked) {
  if (!state.extractJob) {
    return;
  }
  if (checked) {
    state.extractSelected.add(index);
    state.extractSelectionOrder = state.extractSelectionOrder.filter((item) => item !== index);
    state.extractSelectionOrder.push(index);
  } else {
    state.extractSelected.delete(index);
    state.extractSelectionOrder = state.extractSelectionOrder.filter((item) => item !== index);
  }
  state.extractSelectionTouched = true;
  normalizeExtractSelectionOrder();
}

function normalizeExtractSelectionOrder() {
  if (!state.extractJob) {
    state.extractSelectionOrder = [];
    return state.extractSelectionOrder;
  }

  const available = new Set(state.extractJob.frames.map((frame) => frame.index));
  const validSelection = new Set();
  state.extractSelected.forEach((index) => {
    if (available.has(index)) {
      validSelection.add(index);
    }
  });
  state.extractSelected = validSelection;

  const seen = new Set();
  const ordered = [];
  state.extractSelectionOrder.forEach((index) => {
    if (validSelection.has(index) && !seen.has(index)) {
      ordered.push(index);
      seen.add(index);
    }
  });
  state.extractJob.frames.forEach((frame) => {
    if (validSelection.has(frame.index) && !seen.has(frame.index)) {
      ordered.push(frame.index);
      seen.add(frame.index);
    }
  });
  state.extractSelectionOrder = ordered;
  return state.extractSelectionOrder;
}

function getExtractSelectionOrderMap() {
  return new Map(normalizeExtractSelectionOrder().map((index, order) => [index, order + 1]));
}

function selectExtractFrames(predicate) {
  if (!state.extractJob) return;
  state.extractSelected = new Set(state.extractJob.frames.filter(predicate).map((frame) => frame.index));
  state.extractSelectionTouched = true;
  state.extractSelectionOrder = state.extractJob.frames.filter((frame) => state.extractSelected.has(frame.index)).map((frame) => frame.index);
  state.extractPreview.currentIndex = 0;
  renderExtractFrames();
}

function getSelectedExtractFrames() {
  if (!state.extractJob) {
    return [];
  }
  const frameMap = new Map(state.extractJob.frames.map((frame) => [frame.index, frame]));
  const frames = state.extractOrderedSelectionMode
    ? normalizeExtractSelectionOrder()
        .map((index) => frameMap.get(index))
        .filter(Boolean)
    : state.extractJob.frames.filter((frame) => state.extractSelected.has(frame.index));
  return state.extractPreview.isReversed ? frames.reverse() : frames;
}

function clearExtractFrames() {
  resetExtractFramesState();
  clearFinalJobState();
  showExtractWorkbench();
  showAnimationWorkbench();
  persistSession();
  setStatus("已更新选帧顺序。", "success");
}

function renderJob() {
  if (!state.job) {
    showAnimationWorkbench();
    return;
  }

  const options = state.job.options || {};
  const keyColor = options.key_color || "#000000";
  const matte = options.matte || { mode: options.matte_mode || (options.chroma_enabled ? "chroma" : "none") };
  const matteDetail = formatMatteDetail(matte);
  const sourceMediaType = state.job.source_media_type || uploadMediaType();
  const outputWidth = options.output_width || options.target_size || "-";
  const outputHeight = options.output_height || options.target_size || "-";
  const sourceHeight = Number(state.job.video_info?.height || 0);
  const legacyOutputScale = sourceHeight && options.target_size ? Number(options.target_size) / sourceHeight : 0;
  const outputScaleLabel = formatOutputScaleLabel(options.output_scale || legacyOutputScale);
  const isCustomAnimation = sourceMediaType === "animation";
  const isImageSequence = sourceMediaType === "image_sequence";
  const segmentLabel = isCustomAnimation
    ? "\u81EA\u5B9A\u4E49\u52A8\u753B\u5E27\u5E8F\u5217"
    : isImageSequence
    ? `\u56FE\u7247\u5E8F\u5217\uFF1A\u7B2C ${options.start_frame || 1} - ${options.end_frame || state.job.frame_count} \u5E27`
    : sourceMediaType === "image"
    ? "\u5355\u5F20\u56FE\u7247\u8F93\u5165"
    : `${formatSeconds(options.start_time || 0)} - ${formatSeconds(options.end_time || 0)}`;
  els.resultPanel.hidden = false;
  els.exportResult.hidden = true;
  const summaryCards = [
    summaryCard("\u4efb\u52a1 ID", escapeHtml(state.job.job_id)),
    summaryCard("\u8f93\u51fa\u5e27\u6570", `${state.job.frame_count} \u5e27`),
    summaryCard("\u53D6\u6837\u65B9\u5F0F", escapeHtml(formatSourceModeLabel(state.job.ffmpeg_accel, sourceMediaType))),
    summaryCard("\u62A0\u56FE\u6A21\u5F0F", escapeHtml(`${formatMatteModeLabel(matte)}${matteDetail ? ` / ${matteDetail}` : ""}`)),
    summaryCard("\u8F93\u51FA\u500D\u6570", escapeHtml(outputScaleLabel)),
    summaryCard("\u8F93\u51FA\u753B\u5E03", `${outputWidth} \u00d7 ${outputHeight}`),
    summaryCard("\u753B\u5E03\u5E03\u5C40", escapeHtml(formatCanvasModeLabel(options.canvas_mode))),
    summaryCard("\u62BD\u5E27\u95F4\u9694", isCustomAnimation || isImageSequence ? "\u6309\u6587\u4EF6\u540D\u987A\u5E8F" : sourceMediaType === "image" ? "\u5355\u5F20\u56FE\u7247" : `\u6BCF ${options.keep_every || 1} \u5E27\u4FDD\u7559\u4E00\u5F20`),
    summaryCard("\u8F93\u5165\u533A\u95F4", segmentLabel),
  ];
  if (matte.mode === "chroma") {
    summaryCards.push(`
      <div class="summary-card">
        <span class="meta-label">\u8bc6\u522b\u5230\u7684\u80cc\u666f\u8272</span>
        <strong class="swatch-row">
          <span class="swatch" style="background:${keyColor}"></span>
          <span>${escapeHtml(keyColor)}</span>
        </strong>
      </div>
    `);
  }
  els.jobSummary.innerHTML = summaryCards.join("");
  renderFrames();
  syncResultActions();
  persistSession();
}

function renderFrames() {
  if (!state.job) {
    els.frameGrid.innerHTML = "";
    renderSelectionCount();
    syncAnimationPreview();
    return;
  }

  const orderMap = state.orderedSelectionMode ? getSelectionOrderMap() : new Map();
  els.frameGrid.innerHTML = state.job.frames
    .map((frame) => {
      const checked = state.selected.has(frame.index);
      const frameNumber = String(frame.index + 1).padStart(3, "0");
      const orderNumber = orderMap.get(frame.index);
      return `
        <label class="frame-card ${checked ? "selected" : ""}" data-index="${frame.index}">
          <div class="frame-check ${orderNumber ? "ordered" : ""}">
            <input type="checkbox" data-index="${frame.index}" ${checked ? "checked" : ""}>
            ${orderNumber ? `<span class="frame-order-number">${orderNumber}</span>` : ""}
          </div>
          <img src="${frame.thumb_url}" alt="第 ${frameNumber} 帧">
          <div class="frame-meta">
            <span>#${frameNumber}</span>
            <span>${escapeHtml(displayFrameName(frame, frameNumber))}</span>
          </div>
        </label>
      `;
    })
    .join("");
  renderSelectionCount();
  syncAnimationPreview();
  syncResultActions();
  persistSession();
}

function renderSelectionCount() {
  const total = state.job?.frame_count || 0;
  els.selectionCount.textContent = `\u5df2\u9009 ${state.selected.size} / ${total} \u5e27`;
  syncResultActions();
}

function refreshCardSelection(index, checked) {
  const card = els.frameGrid.querySelector(`.frame-card[data-index="${index}"]`);
  if (card) {
    card.classList.toggle("selected", checked);
  }
}

function setOrderedSelectionMode(enabled) {
  state.orderedSelectionMode = Boolean(enabled);
  if (els.orderedSelectionInput) {
    els.orderedSelectionInput.checked = state.orderedSelectionMode;
  }
}

function setFrameSelected(index, checked) {
  if (!state.job) {
    return;
  }
  if (checked) {
    state.selected.add(index);
    state.selectionOrder = state.selectionOrder.filter((item) => item !== index);
    state.selectionOrder.push(index);
  } else {
    state.selected.delete(index);
    state.selectionOrder = state.selectionOrder.filter((item) => item !== index);
  }
  normalizeSelectionOrder();
}

function normalizeSelectionOrder() {
  if (!state.job) {
    state.selectionOrder = [];
    return state.selectionOrder;
  }

  const available = new Set(state.job.frames.map((frame) => frame.index));
  const validSelection = new Set();
  state.selected.forEach((index) => {
    if (available.has(index)) {
      validSelection.add(index);
    }
  });
  state.selected = validSelection;

  const seen = new Set();
  const ordered = [];
  state.selectionOrder.forEach((index) => {
    if (validSelection.has(index) && !seen.has(index)) {
      ordered.push(index);
      seen.add(index);
    }
  });
  state.job.frames.forEach((frame) => {
    if (validSelection.has(frame.index) && !seen.has(frame.index)) {
      ordered.push(frame.index);
      seen.add(frame.index);
    }
  });
  state.selectionOrder = ordered;
  return state.selectionOrder;
}

function getSelectionOrderMap() {
  return new Map(normalizeSelectionOrder().map((index, order) => [index, order + 1]));
}

function selectFrames(predicate) {
  if (!state.job) return;
  state.selected = new Set(state.job.frames.filter(predicate).map((frame) => frame.index));
  state.selectionOrder = state.job.frames.filter((frame) => state.selected.has(frame.index)).map((frame) => frame.index);
  state.preview.currentIndex = 0;
  clearMagicPreview();
  renderFrames();
}

function getSelectedFrames() {
  if (!state.job) {
    return [];
  }
  const frameMap = new Map(state.job.frames.map((frame) => [frame.index, frame]));
  const frames = state.orderedSelectionMode
    ? normalizeSelectionOrder()
        .map((index) => frameMap.get(index))
        .filter(Boolean)
    : state.job.frames.filter((frame) => state.selected.has(frame.index));
  return state.preview.isReversed ? frames.reverse() : frames;
}

function getSegmentFrameRate(upload = state.upload) {
  const fps = Number(currentUploadInfo(upload).fps || 0);
  return Number.isFinite(fps) && fps > 0 ? fps : 0;
}

function getSegmentFrameStep(upload = state.upload) {
  const fps = getSegmentFrameRate(upload);
  return fps > 0 ? 1 / fps : 0.01;
}

function getSegmentFrameCount(upload = state.upload) {
  if (isImageUpload(upload)) {
    return 1;
  }
  if (isImageSequenceUpload(upload)) {
    return Math.max(1, Math.round(Number(currentUploadInfo(upload).frame_count || 1)));
  }

  const fps = getSegmentFrameRate(upload);
  const duration = Math.max(Number(currentUploadInfo(upload).duration || 0), 0);
  if (fps <= 0 || duration <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(duration * fps));
}

function clampSegmentFrame(frame, upload = state.upload) {
  return clamp(Math.round(Number(frame || 1)), 1, getSegmentFrameCount(upload));
}

function syncSegmentFramesFromTimes(upload = state.upload) {
  if (isImageUpload(upload)) {
    state.segment.startFrame = 1;
    state.segment.endFrame = 1;
    return;
  }
  if (isImageSequenceUpload(upload)) {
    state.segment.startFrame = clampSegmentFrame(state.segment.startFrame, upload);
    state.segment.endFrame = clampSegmentFrame(state.segment.endFrame, upload);
    return;
  }

  state.segment.startFrame = timeToSegmentFrame(state.segment.start, "start", upload);
  state.segment.endFrame = timeToSegmentFrame(state.segment.end, "end", upload);
}

function syncSegmentTimesFromFrames(upload = state.upload) {
  if (isImageUpload(upload)) {
    state.segment.start = 0;
    state.segment.end = 0;
    state.segment.startFrame = 1;
    state.segment.endFrame = 1;
    return;
  }
  if (isImageSequenceUpload(upload)) {
    state.segment.start = 0;
    state.segment.end = 0;
    state.segment.startFrame = clampSegmentFrame(state.segment.startFrame, upload);
    state.segment.endFrame = clampSegmentFrame(state.segment.endFrame, upload);
    return;
  }

  state.segment.startFrame = clampSegmentFrame(state.segment.startFrame, upload);
  state.segment.endFrame = clampSegmentFrame(state.segment.endFrame, upload);
  state.segment.start = segmentFrameToTime(state.segment.startFrame, "start", upload);
  state.segment.end = segmentFrameToTime(state.segment.endFrame, "end", upload);
}

function timeToSegmentFrame(value, key, upload = state.upload) {
  if (isImageUpload(upload)) {
    return 1;
  }
  if (isImageSequenceUpload(upload)) {
    return clampSegmentFrame(key === "start" ? state.segment.startFrame : state.segment.endFrame, upload);
  }

  const step = getSegmentFrameStep(upload);
  const snapped = snapSegmentTime(value, key === "start" ? "floor" : "ceil", upload);
  const rawFrame = key === "start" ? Math.round(snapped / step) + 1 : Math.round(snapped / step);
  return clampSegmentFrame(rawFrame, upload);
}

function segmentFrameToTime(frame, key, upload = state.upload) {
  if (isImageUpload(upload)) {
    return 0;
  }
  if (isImageSequenceUpload(upload)) {
    return 0;
  }

  const clampedFrame = clampSegmentFrame(frame, upload);
  const step = getSegmentFrameStep(upload);
  const rawTime = key === "start" ? (clampedFrame - 1) * step : clampedFrame * step;
  return snapSegmentTime(rawTime, key === "start" ? "floor" : "ceil", upload);
}

function getSegmentFrameValue(key, upload = state.upload) {
  if (isImageSequenceUpload(upload)) {
    return clampSegmentFrame(key === "start" ? state.segment.startFrame : state.segment.endFrame, upload);
  }
  return timeToSegmentFrame(key === "start" ? state.segment.start : state.segment.end, key, upload);
}

function getSelectedSegmentFrameCount(upload = state.upload) {
  if (isImageUpload(upload)) {
    return 1;
  }
  if (isImageSequenceUpload(upload)) {
    const startFrame = clampSegmentFrame(state.segment.startFrame, upload);
    const endFrame = clampSegmentFrame(state.segment.endFrame, upload);
    return Math.max(1, endFrame - startFrame + 1);
  }
  const startFrame = getSegmentFrameValue("start", upload);
  const endFrame = getSegmentFrameValue("end", upload);
  return Math.max(1, endFrame - startFrame + 1);
}

function formatSegmentStep(upload = state.upload) {
  return getSegmentFrameStep(upload).toFixed(8).replace(/0+$/u, "").replace(/\.$/u, "");
}

function snapSegmentTime(value, mode = "round", upload = state.upload) {
  if (isImageUpload(upload) || isImageSequenceUpload(upload)) {
    return 0;
  }

  const duration = Math.max(Number(currentUploadInfo(upload).duration || 0), 0);
  const step = Math.max(getSegmentFrameStep(upload), 1e-6);
  const clampedValue = clamp(Number(value || 0), 0, duration);
  const framePosition = clampedValue / step;

  let frameIndex = Math.round(framePosition);
  if (mode === "floor") {
    frameIndex = Math.floor(framePosition + 1e-9);
  } else if (mode === "ceil") {
    frameIndex = Math.ceil(framePosition - 1e-9);
  }

  const snapped = clamp(frameIndex * step, 0, duration);
  return Number(snapped.toFixed(8));
}

function normalizePreviewInterval() {
  const value = Number(els.previewIntervalInput.value || 100);
  const normalized = clamp(Math.round(value), 20, 5000);
  els.previewIntervalInput.value = String(normalized);
  return normalized;
}

function normalizeExtractPreviewInterval() {
  const value = Number(els.extractPreviewIntervalInput.value || 100);
  const normalized = clamp(Math.round(value), 20, 5000);
  els.extractPreviewIntervalInput.value = String(normalized);
  return normalized;
}

function normalizeHexColor(value, fallback = "#F6FBF6") {
  const raw = String(value || "").trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(raw)) {
    return raw;
  }
  return fallback;
}

function normalizeProcessPreviewBackgroundMode(value) {
  return value === "color" ? "color" : "checkerboard";
}

function bindProcessPreviewBackgroundControl(scope) {
  const toggle = getDirectMatteElement("processPreviewBackgroundToggleButton", scope);
  const checkerboardButton = getDirectMatteElement("processPreviewBackgroundCheckerboardButton", scope);
  const colorButton = getDirectMatteElement("processPreviewBackgroundColorButton", scope);
  const colorInput = getDirectMatteElement("processPreviewBackgroundInput", scope);
  if (!toggle || !checkerboardButton || !colorButton || !colorInput) {
    return;
  }
  checkerboardButton.addEventListener("click", () => {
    updateProcessPreviewBackground("checkerboard", getProcessPreviewState(scope).background.color, true, scope);
    setProcessPreviewBackgroundPopoverOpen(false, scope);
  });
  colorButton.addEventListener("click", () => {
    updateProcessPreviewBackground("color", getProcessPreviewState(scope).background.color, true, scope);
  });
  colorInput.addEventListener("input", () => {
    updateProcessPreviewBackground("color", colorInput.value, true, scope);
  });
}

function setProcessPreviewBackgroundPopoverOpen(isOpen, scope) {
  const toggle = getDirectMatteElement("processPreviewBackgroundToggleButton", scope);
  const control = toggle?.closest(".preview-background-control");
  if (!control) {
    return;
  }
  control.open = Boolean(isOpen);
}

function updateProcessPreviewBackground(mode, color, shouldPersist = false, scope = activeMatteScope()) {
  const previewState = getProcessPreviewState(scope);
  const normalizedMode = normalizeProcessPreviewBackgroundMode(mode);
  const normalizedColor = normalizeHexColor(color, previewState.background.color);
  previewState.background.mode = normalizedMode;
  previewState.background.color = normalizedColor;

  const colorInput = getDirectMatteElement("processPreviewBackgroundInput", scope);
  const colorLabel = getDirectMatteElement("processPreviewBackgroundLabel", scope);
  const colorRow = getDirectMatteElement("processPreviewBackgroundColorRow", scope);
  const previewProcessedStage = getDirectMatteElement("previewProcessedStage", scope);
  const toggle = getDirectMatteElement("processPreviewBackgroundToggleButton", scope);
  const checkerboardButton = getDirectMatteElement("processPreviewBackgroundCheckerboardButton", scope);
  const colorButton = getDirectMatteElement("processPreviewBackgroundColorButton", scope);

  if (colorInput) colorInput.value = normalizedColor;
  if (colorLabel) colorLabel.textContent = normalizedColor;
  if (colorRow) colorRow.classList.toggle("is-visible", normalizedMode === "color");
  if (toggle) toggle.classList.toggle("is-color", normalizedMode === "color");
  if (checkerboardButton) checkerboardButton.setAttribute("aria-checked", String(normalizedMode === "checkerboard"));
  if (colorButton) colorButton.setAttribute("aria-checked", String(normalizedMode === "color"));

  if (previewProcessedStage) {
    previewProcessedStage.style.setProperty("--process-preview-bg-color", normalizedColor);
    previewProcessedStage.classList.toggle("checkerboard-stage", normalizedMode === "checkerboard");
    previewProcessedStage.classList.toggle("solid-preview-stage", normalizedMode === "color");
  }

  if (shouldPersist) {
    persistSession();
  }
}

function setPreviewStageBackground(color) {
  const normalized = normalizeHexColor(color, state.preview.background);
  [
    els.animationPreviewCanvas,
    ...MAGIC_VARIANT_CONFIGS.map((config) => els[config.canvasId]),
  ].forEach((canvas) => {
    const stage = canvas?.closest(".animation-stage");
    if (!stage) {
      return;
    }
    stage.style.setProperty("--preview-bg-color", normalized);
  });
}

function updatePreviewBackground(color, shouldPersist = false) {
  const normalized = normalizeHexColor(color);
  state.preview.background = normalized;
  els.previewBackgroundInput.value = normalized;
  els.previewBackgroundLabel.textContent = normalized;
  setPreviewStageBackground(normalized);
  if (shouldPersist) {
    persistSession();
  }
}

function setExtractPreviewStageBackground(color) {
  const normalized = normalizeHexColor(color);
  const stage = els.extractPreviewCanvas?.closest(".animation-stage");
  if (stage) {
    stage.style.setProperty("--preview-bg-color", normalized);
  }
}

function updateExtractPreviewBackground(color, shouldPersist = false) {
  const normalized = normalizeHexColor(color);
  state.extractPreview.background = normalized;
  els.extractPreviewBackgroundInput.value = normalized;
  els.extractPreviewBackgroundLabel.textContent = normalized;
  setExtractPreviewStageBackground(normalized);
  if (shouldPersist) {
    persistSession();
  }
}

function resetPreviewState() {
  stopPreviewTimer();
  state.preview.currentIndex = 0;
  state.preview.isPlaying = true;
  state.preview.renderToken += 1;
  state.preview.imageCache.clear();
}

function stopExtractPreviewTimer() {
  state.extractPreview.warmupToken += 1;
  if (state.extractPreview.rafId !== null) {
    window.cancelAnimationFrame(state.extractPreview.rafId);
    state.extractPreview.rafId = null;
  }
}

function restartExtractPreviewTimer() {
  stopExtractPreviewTimer();
  const selectedFrames = getSelectedExtractFrames();
  if (!state.extractPreview.isPlaying || selectedFrames.length <= 1) {
    updateExtractPreviewControls(selectedFrames.length);
    return;
  }

  const warmupToken = state.extractPreview.warmupToken;
  const startLoop = () => {
    if (warmupToken !== state.extractPreview.warmupToken || !state.extractPreview.isPlaying) {
      return;
    }

    let lastAdvanceAt = performance.now();
    const tick = (now) => {
      if (warmupToken !== state.extractPreview.warmupToken) {
        return;
      }

      const frames = getSelectedExtractFrames();
      const frameCount = frames.length;
      if (!state.extractPreview.isPlaying || frameCount <= 1) {
        stopExtractPreviewTimer();
        updateExtractPreviewControls(frameCount);
        return;
      }

      if (state.extractPreview.currentIndex >= frameCount) {
        state.extractPreview.currentIndex = 0;
        drawExtractPreviewFrameFromCache(frames[0], frameCount);
      }

      const intervalMs = normalizeExtractPreviewInterval();
      const elapsed = now - lastAdvanceAt;
      if (elapsed >= intervalMs) {
        const steps = Math.max(1, Math.floor(elapsed / intervalMs));
        lastAdvanceAt += steps * intervalMs;
        state.extractPreview.currentIndex = (state.extractPreview.currentIndex + steps) % frameCount;
        drawExtractPreviewFrameFromCache(frames[state.extractPreview.currentIndex], frameCount);
      }

      state.extractPreview.rafId = window.requestAnimationFrame(tick);
    };

    state.extractPreview.rafId = window.requestAnimationFrame(tick);
  };

  if (selectedFrames.every((frame) => getCachedPreviewImage(frame.url))) {
    startLoop();
    updateExtractPreviewControls(selectedFrames.length);
    return;
  }

  warmPreviewFrames(selectedFrames)
    .then(() => {
      startLoop();
    })
    .catch((error) => {
      if (warmupToken !== state.extractPreview.warmupToken) {
        return;
      }
      setStatus(error.message || String(error), "error");
    });
  updateExtractPreviewControls(selectedFrames.length);
}

function stopPreviewTimer() {
  state.preview.warmupToken += 1;
  if (state.preview.rafId !== null) {
    window.cancelAnimationFrame(state.preview.rafId);
    state.preview.rafId = null;
  }
}

function restartPreviewTimer() {
  stopPreviewTimer();
  const selectedFrames = getSelectedFrames();
  if (!state.preview.isPlaying || selectedFrames.length <= 1) {
    updatePreviewControls(selectedFrames.length);
    return;
  }

  const warmupToken = state.preview.warmupToken;
  const startLoop = () => {
    if (warmupToken !== state.preview.warmupToken || !state.preview.isPlaying) {
      return;
    }

    let lastAdvanceAt = performance.now();
    const tick = (now) => {
      if (warmupToken !== state.preview.warmupToken) {
        return;
      }

      const frames = getSelectedFrames();
      const frameCount = frames.length;
      if (!state.preview.isPlaying || frameCount <= 1) {
        stopPreviewTimer();
        updatePreviewControls(frameCount);
        return;
      }

      if (state.preview.currentIndex >= frameCount) {
        state.preview.currentIndex = 0;
        drawPreviewFrameFromCache(frames[0], frameCount);
      }

      const intervalMs = normalizePreviewInterval();
      const elapsed = now - lastAdvanceAt;
      if (elapsed >= intervalMs) {
        const steps = Math.max(1, Math.floor(elapsed / intervalMs));
        lastAdvanceAt += steps * intervalMs;
        state.preview.currentIndex = (state.preview.currentIndex + steps) % frameCount;
        drawPreviewFrameFromCache(frames[state.preview.currentIndex], frameCount);
      }

      state.preview.rafId = window.requestAnimationFrame(tick);
    };

    state.preview.rafId = window.requestAnimationFrame(tick);
  };

  if (selectedFrames.every((frame) => getCachedPreviewImage(frame.url))) {
    startLoop();
    updatePreviewControls(selectedFrames.length);
    return;
  }

  warmPreviewFrames(selectedFrames)
    .then(() => {
      startLoop();
    })
    .catch((error) => {
      if (warmupToken !== state.preview.warmupToken) {
        return;
      }
      setStatus(error.message || String(error), "error");
    });
  updatePreviewControls(selectedFrames.length);
}

function togglePreviewPlayback() {
  const selectedFrames = getSelectedFrames();
  if (selectedFrames.length === 0) {
    return;
  }
  state.preview.isPlaying = !state.preview.isPlaying;
  if (state.preview.isPlaying) {
    restartPreviewTimer();
  } else {
    stopPreviewTimer();
    updatePreviewControls(selectedFrames.length);
  }
  persistSession();
}

function restartPreviewPlayback() {
  state.preview.currentIndex = 0;
  syncAnimationPreview();
  persistSession();
}

function updatePreviewControls(selectedCount) {
  const hasFrames = selectedCount > 0;
  const canAnimate = selectedCount > 1;
  const currentIndex = hasFrames ? Math.min(state.preview.currentIndex, selectedCount - 1) : 0;
  const progressPercent = hasFrames ? ((currentIndex + 1) / selectedCount) * 100 : 0;
  els.previewPlayPauseButton.disabled = !canAnimate;
  els.previewRestartButton.disabled = !hasFrames;
  els.previewReverseInput.disabled = !hasFrames;
  els.previewProgressFill.style.width = `${progressPercent}%`;
  els.previewProgressLabel.textContent = hasFrames
    ? `${currentIndex + 1} / ${selectedCount}`
    : "0 / 0";
  els.previewPlayPauseButton.textContent = canAnimate
    ? (state.preview.isPlaying ? "\u6682\u505c\u9884\u89c8" : "\u64ad\u653e\u9884\u89c8")
    : "\u5355\u5E27\u9884\u89C8";
  els.previewSelectedCount.textContent = `\u5df2\u52a0\u8f7d ${selectedCount} \u5e27`;
}

function toggleExtractPreviewPlayback() {
  const selectedFrames = getSelectedExtractFrames();
  if (selectedFrames.length === 0) {
    return;
  }
  state.extractPreview.isPlaying = !state.extractPreview.isPlaying;
  if (state.extractPreview.isPlaying) {
    restartExtractPreviewTimer();
  } else {
    stopExtractPreviewTimer();
    updateExtractPreviewControls(selectedFrames.length);
  }
  persistSession();
}

function restartExtractPreviewPlayback() {
  state.extractPreview.currentIndex = 0;
  syncExtractAnimationPreview();
  persistSession();
}

function updateExtractPreviewControls(selectedCount) {
  const hasFrames = selectedCount > 0;
  const canAnimate = selectedCount > 1;
  const currentIndex = hasFrames ? Math.min(state.extractPreview.currentIndex, selectedCount - 1) : 0;
  const progressPercent = hasFrames ? ((currentIndex + 1) / selectedCount) * 100 : 0;
  els.extractPreviewPlayPauseButton.disabled = !canAnimate;
  els.extractPreviewRestartButton.disabled = !hasFrames;
  els.extractPreviewReverseInput.disabled = !hasFrames;
  els.extractPreviewProgressFill.style.width = `${progressPercent}%`;
  els.extractPreviewProgressLabel.textContent = hasFrames
    ? `${currentIndex + 1} / ${selectedCount}`
    : "0 / 0";
  els.extractPreviewPlayPauseButton.textContent = canAnimate
    ? (state.extractPreview.isPlaying ? "暂停预览" : "播放预览")
    : "单帧";
  els.extractPreviewSelectedCount.textContent = `已加载 ${selectedCount} 帧`;
}

async function loadPreviewImage(url) {
  const cached = state.preview.imageCache.get(url);
  if (cached) {
    return cached instanceof HTMLImageElement ? Promise.resolve(cached) : cached;
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      state.preview.imageCache.set(url, image);
      resolve(image);
    };
    image.onerror = () => {
      state.preview.imageCache.delete(url);
      reject(new Error(`\u9884\u89c8\u5E27\u52A0\u8F7D\u5931\u8D25: ${url}`));
    };
    image.src = url;
  });

  state.preview.imageCache.set(url, promise);
  return promise;
}

function getCachedPreviewImage(url) {
  const cached = state.preview.imageCache.get(url);
  return cached instanceof HTMLImageElement ? cached : null;
}

function warmPreviewFrames(frames) {
  return Promise.all(frames.map((frame) => loadPreviewImage(frame.url)));
}

function paintFrameOnCanvas(canvas, image, background = state.preview.background) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const baseScale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const scale = baseScale;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = Math.round((canvas.width - drawWidth) / 2);
  const drawY = Math.round((canvas.height - drawHeight) / 2);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawPreviewPlaceholder() {
  const canvas = els.animationPreviewCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = state.preview.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  els.previewEmptyState.hidden = false;
  els.previewFrameLabel.textContent = "\u5F53\u524D -";
  if (state.magicPreview) {
    drawMagicPlaceholder();
  }
}

function drawExtractPreviewPlaceholder() {
  const canvas = els.extractPreviewCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = state.extractPreview.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  els.extractPreviewEmptyState.hidden = false;
  els.extractPreviewFrameLabel.textContent = "当前帧 -";
}

function renderExtractPreviewFrameImage(image, frame, selectedCount) {
  paintFrameOnCanvas(els.extractPreviewCanvas, image, state.extractPreview.background);
  els.extractPreviewEmptyState.hidden = true;
  els.extractPreviewFrameLabel.textContent = `当前帧 #${String(frame.index + 1).padStart(3, "0")}`;
  updateExtractPreviewControls(selectedCount);
}

async function drawExtractPreviewFrame(frame, selectedCount) {
  if (!frame) {
    drawExtractPreviewPlaceholder();
    updateExtractPreviewControls(selectedCount);
    return;
  }

  const token = ++state.extractPreview.renderToken;
  try {
    const image = await loadPreviewImage(frame.url);
    if (token !== state.extractPreview.renderToken) {
      return;
    }
    renderExtractPreviewFrameImage(image, frame, selectedCount);
  } catch (error) {
    drawExtractPreviewPlaceholder();
    setStatus(error.message || String(error), "error");
  }
}

function drawExtractPreviewFrameFromCache(frame, selectedCount) {
  if (!frame) {
    drawExtractPreviewPlaceholder();
    updateExtractPreviewControls(selectedCount);
    return;
  }

  state.extractPreview.renderToken += 1;
  const image = getCachedPreviewImage(frame.url);
  if (!image) {
    void drawExtractPreviewFrame(frame, selectedCount);
    return;
  }

  renderExtractPreviewFrameImage(image, frame, selectedCount);
}

function syncExtractAnimationPreview(shouldRestartTimer = true) {
  const selectedFrames = getSelectedExtractFrames();
  const selectedCount = selectedFrames.length;

  if (selectedCount === 0) {
    stopExtractPreviewTimer();
    state.extractPreview.currentIndex = 0;
    updateExtractPreviewControls(0);
    drawExtractPreviewPlaceholder();
    return;
  }

  if (state.extractPreview.currentIndex >= selectedCount) {
    state.extractPreview.currentIndex = 0;
  }

  const currentFrame = selectedFrames[state.extractPreview.currentIndex];
  drawExtractPreviewFrameFromCache(currentFrame, selectedCount);
  void warmPreviewFrames(selectedFrames);
  if (shouldRestartTimer) {
    restartExtractPreviewTimer();
  }
}

function renderPreviewFrameImage(image, frame, selectedCount) {
  const canvas = els.animationPreviewCanvas;
  paintFrameOnCanvas(canvas, image);
  els.previewEmptyState.hidden = true;
  els.previewFrameLabel.textContent = `\u5F53\u524D #${String(frame.index + 1).padStart(3, "0")}`;
  updatePreviewControls(selectedCount);
  syncMagicPreviewFrame(frame, selectedCount);
}

function magicVariantElements(config) {
  return {
    panel: els[config.panelId],
    canvas: els[config.canvasId],
    empty: els[config.emptyId],
    frameLabel: els[config.frameLabelId],
    count: els[config.countId],
    progressFill: els[config.progressFillId],
    progressLabel: els[config.progressLabelId],
    sizeLabel: els[config.sizeLabelId],
    exportButton: els[config.exportButtonId],
  };
}

function magicVariantData(key) {
  if (!state.magicPreview) {
    return null;
  }
  if (state.magicPreview.variants?.[key]) {
    return state.magicPreview.variants[key];
  }
  return key === "half" ? state.magicPreview : null;
}

function drawMagicVariantPlaceholder(config, message = "\u7B49\u5F85 MAGIC") {
  const ui = magicVariantElements(config);
  if (!ui.canvas) {
    return;
  }
  const variant = magicVariantData(config.key);
  const canvas = ui.canvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = state.preview.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ui.empty.textContent = message;
  ui.empty.hidden = false;
  ui.frameLabel.textContent = `${config.label} -`;
  ui.count.textContent = variant
    ? `\u5DF2\u751F\u6210 ${variant.frame_count || 0} \u5E27`
    : "\u5DF2\u751F\u6210 0 \u5E27";
  ui.progressFill.style.width = "0%";
  ui.progressLabel.textContent = "0 / 0";
  ui.sizeLabel.textContent = formatMagicOutputSize(variant);
  ui.exportButton.disabled = !variant?.frames?.length;
}

function drawMagicPlaceholder(message = "\u7B49\u5F85 MAGIC") {
  MAGIC_VARIANT_CONFIGS.forEach((config) => drawMagicVariantPlaceholder(config, message));
}

function updateMagicVariantControls(config, selectedCount) {
  const ui = magicVariantElements(config);
  const variant = magicVariantData(config.key);
  const hasFrames = selectedCount > 0;
  const currentIndex = hasFrames ? Math.min(state.preview.currentIndex, selectedCount - 1) : 0;
  const progressPercent = hasFrames ? ((currentIndex + 1) / selectedCount) * 100 : 0;
  ui.progressFill.style.width = `${progressPercent}%`;
  ui.progressLabel.textContent = hasFrames
    ? `${currentIndex + 1} / ${selectedCount}`
    : "0 / 0";
  ui.count.textContent = `\u5DF2\u751F\u6210 ${variant?.frame_count || 0} \u5E27`;
  ui.sizeLabel.textContent = formatMagicOutputSize(variant);
  ui.exportButton.disabled = !variant?.frames?.length;
}

function updateMagicPreviewControls(selectedCount) {
  MAGIC_VARIANT_CONFIGS.forEach((config) => updateMagicVariantControls(config, selectedCount));
}

function formatMagicOutputSize(magicPreview) {
  const width = Number(magicPreview?.max_width || magicPreview?.frames?.[0]?.width || 0);
  const height = Number(magicPreview?.max_height || magicPreview?.frames?.[0]?.height || 0);
  return width > 0 && height > 0 ? `${width} \u00d7 ${height}` : "-";
}

function magicFrameForSourceFrame(sourceFrame, variantKey = "half") {
  const variant = magicVariantData(variantKey);
  if (!variant?.frames || !sourceFrame) {
    return null;
  }
  return variant.frames.find((frame) => Number(frame.source_index) === Number(sourceFrame.index)) || null;
}

function renderMagicPreviewFrameImage(config, image, magicFrame, selectedCount) {
  const ui = magicVariantElements(config);
  paintFrameOnCanvas(ui.canvas, image);
  ui.empty.hidden = true;
  ui.frameLabel.textContent = `${config.label} #${String(Number(magicFrame.source_index || 0) + 1).padStart(3, "0")}`;
  updateMagicVariantControls(config, selectedCount);
}

async function syncMagicVariantPreviewFrame(config, sourceFrame, selectedCount) {
  const ui = magicVariantElements(config);
  const variant = magicVariantData(config.key);
  if (!variant?.frames?.length || !ui.panel || ui.panel.hidden) {
    return;
  }

  const magicFrame = magicFrameForSourceFrame(sourceFrame, config.key);
  if (!magicFrame) {
    drawMagicVariantPlaceholder(config, "\u8FD9\u4E00\u5E27\u9700\u8981\u91CD\u65B0 MAGIC");
    updateMagicVariantControls(config, selectedCount);
    return;
  }

  state.magicPreview.renderTokens = state.magicPreview.renderTokens || {};
  const token = Number(state.magicPreview.renderTokens[config.key] || 0) + 1;
  state.magicPreview.renderTokens[config.key] = token;
  const cached = getCachedPreviewImage(magicFrame.url);
  if (cached) {
    renderMagicPreviewFrameImage(config, cached, magicFrame, selectedCount);
    return;
  }

  try {
    const image = await loadPreviewImage(magicFrame.url);
    if (token !== state.magicPreview?.renderTokens?.[config.key]) {
      return;
    }
    renderMagicPreviewFrameImage(config, image, magicFrame, selectedCount);
  } catch (error) {
    drawMagicVariantPlaceholder(config, "\u52A0\u8F7D MAGIC \u5931\u8D25");
    setStatus(error.message || String(error), "error");
  }
}

function syncMagicPreviewFrame(sourceFrame, selectedCount) {
  MAGIC_VARIANT_CONFIGS.forEach((config) => {
    void syncMagicVariantPreviewFrame(config, sourceFrame, selectedCount);
  });
}

function showMagicPreview() {
  if (!state.magicPreview?.frames?.length && !state.magicPreview?.variants?.half?.frames?.length) {
    clearMagicPreview();
    return;
  }
  MAGIC_VARIANT_CONFIGS.forEach((config) => {
    const ui = magicVariantElements(config);
    const variant = magicVariantData(config.key);
    ui.panel.hidden = !variant?.frames?.length;
    drawMagicVariantPlaceholder(config);
    updateMagicVariantControls(config, getSelectedFrames().length);
    if (variant?.frames?.length) {
      void warmPreviewFrames(variant.frames);
    }
  });
  syncAnimationPreview(false);
}

function clearMagicPreview() {
  state.magicPreview = null;
  MAGIC_VARIANT_CONFIGS.forEach((config) => {
    const ui = magicVariantElements(config);
    if (ui.panel) {
      ui.panel.hidden = true;
    }
  });
  drawMagicPlaceholder();
}

async function drawPreviewFrame(frame, selectedCount) {
  if (!frame) {
    drawPreviewPlaceholder();
    updatePreviewControls(selectedCount);
    return;
  }

  const token = ++state.preview.renderToken;
  try {
    const image = await loadPreviewImage(frame.url);
    if (token !== state.preview.renderToken) {
      return;
    }
    renderPreviewFrameImage(image, frame, selectedCount);
  } catch (error) {
    drawPreviewPlaceholder();
    setStatus(error.message || String(error), "error");
  }
}

function drawPreviewFrameFromCache(frame, selectedCount) {
  if (!frame) {
    drawPreviewPlaceholder();
    updatePreviewControls(selectedCount);
    return;
  }

  state.preview.renderToken += 1;
  const image = getCachedPreviewImage(frame.url);
  if (!image) {
    void drawPreviewFrame(frame, selectedCount);
    return;
  }

  renderPreviewFrameImage(image, frame, selectedCount);
}

function syncAnimationPreview(shouldRestartTimer = true) {
  const selectedFrames = getSelectedFrames();
  const selectedCount = selectedFrames.length;

  if (selectedCount === 0) {
    stopPreviewTimer();
    state.preview.currentIndex = 0;
    updatePreviewControls(0);
    drawPreviewPlaceholder();
    return;
  }

  if (state.preview.currentIndex >= selectedCount) {
    state.preview.currentIndex = 0;
  }

  const currentFrame = selectedFrames[state.preview.currentIndex];
  drawPreviewFrameFromCache(currentFrame, selectedCount);
  void warmPreviewFrames(selectedFrames);
  if (shouldRestartTimer) {
    restartPreviewTimer();
  }
}

async function runMagicPreview() {
  if (state.magicInFlight) {
    setStatus("MAGIC \u6B63\u5728\u5904\u7406\uFF0C\u5148\u7B49\u5F53\u524D\u8FD9\u8F6E\u7ED3\u675F\u3002");
    return;
  }
  if (!state.job) {
    setStatus("\u8FD8\u6CA1\u6709\u53EF\u4EE5 MAGIC \u7684\u5904\u7406\u7ED3\u679C\u3002", "error");
    return;
  }
  if (state.selected.size === 0) {
    setStatus("\u81F3\u5C11\u9009\u4E00\u5E27\u518D\u70B9 MAGIC\u3002", "error");
    syncResultActions();
    return;
  }

  state.magicInFlight = true;
  syncResultActions();
  try {
    await withBusy(els.magicButton, async () => {
      const selectedFrames = getSelectedFrames();
      const resizeMode = normalizeMagicResizeMode(state.magicResizeMode);
      const resizeModeLabel = magicResizeModeLabel(resizeMode);
      clearMagicPreview();
      setStatus(`MAGIC \u6B63\u5728\u5904\u7406 ${selectedFrames.length} \u5E27\uFF1AReal-ESRGAN \u8D85\u5206\u540E${resizeModeLabel}\u7F29\u5C0F\u5230 1/2\u30011/4\u30011/8...`);
      const data = await apiJson("/api/magic-preview", {
        method: "POST",
        body: {
          job_id: state.job.job_id,
          selected_indices: selectedFrames.map((frame) => frame.index),
          resize_mode: resizeMode,
        },
      });
      state.magicPreview = data.magic;
      showMagicPreview();
      const generatedCount = Number(data.magic.generated_count || 0);
      const reusedCount = Number(data.magic.reused_count || 0);
      const cacheLabel = reusedCount > 0
        ? generatedCount > 0
          ? `\uFF0C\u672C\u6B21\u65B0\u751F\u6210 ${generatedCount} \u5E27\uFF0C\u590D\u7528\u7F13\u5B58 ${reusedCount} \u5E27`
          : `\uFF0C\u672C\u6B21\u5168\u90E8\u590D\u7528\u7F13\u5B58\uFF0C\u6CA1\u6709\u91CD\u65B0\u751F\u6210`
        : "";
      setStatus(`MAGIC \u5B8C\u6210\uFF0C${data.magic.resize_mode_label || resizeModeLabel}\u7F29\u5C0F\uFF0C\u5DF2\u751F\u6210 ${data.magic.frame_count} \u5E27 1/2\u30011/4\u30011/8 \u5C3A\u5BF8\u5BF9\u6BD4\u9884\u89C8${cacheLabel}\u3002`, "success");
    });
  } finally {
    state.magicInFlight = false;
    syncResultActions();
  }
}

async function exportMagicFrames(variantKey = "half", button = els.exportMagicFramesButton) {
  if (!state.magicPreview?.magic_id) {
    setStatus("\u5148\u70B9 MAGIC \u751F\u6210\u5904\u7406\u540E\u5E27\uFF0C\u518D\u5BFC\u51FA\u3002", "error");
    return;
  }
  const config = MAGIC_VARIANT_CONFIGS.find((item) => item.key === variantKey) || MAGIC_VARIANT_CONFIGS[0];
  const variant = magicVariantData(config.key);
  if (!variant?.frames?.length) {
    setStatus(`${config.label} \u8FD8\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u5E27\u3002`, "error");
    return;
  }

  await withBusy(button, async () => {
    setStatus(`\u6B63\u5728\u5BFC\u51FA ${config.label} \u5904\u7406\u540E\u5E27...`);
    const data = await apiJson("/api/export-magic-frames", {
      method: "POST",
      body: {
        magic_id: state.magicPreview.magic_id,
        variant_key: config.key,
        video_duration_ms: Number(els.previewIntervalInput.value || 100),
      },
    });
    state.exportResult = data.export;
    renderExportResult();
    const frameCount = Number(data.export?.frame_count || 0);
    const outputSize = formatMagicOutputSize(data.export);
    setStatus(`${config.label} \u5904\u7406\u540E\u5E27\u5DF2\u5BFC\u51FA\uFF1A${frameCount} \u5E27\uFF0CMOV \u786C\u8FB9\u7F18\u653E\u5927\u56DE ${outputSize}\uFF0C\u5DF2\u751F\u6210\u900F\u660E MOV\u3001GIF \u548C\u7CBE\u7075\u8868\u3002`, "success");
  });
}

async function exportFrames() {
  if (!state.job) {
    setStatus("\u8fd8\u6ca1\u6709\u53ef\u5bfc\u51fa\u7684\u5904\u7406\u7ed3\u679c\u3002", "error");
    return;
  }
  if (state.selected.size === 0) {
    setStatus("\u81f3\u5c11\u9009\u4e00\u5e27\u518d\u5bfc\u51fa\u3002", "error");
    syncResultActions();
    return;
  }

  await withBusy(els.exportButton, async () => {
    setStatus(state.preview.isReversed ? "\u6b63\u5728\u5012\u5e8f\u5bfc\u51fa\u9009\u4e2d\u5e27..." : "\u6b63\u5728\u5bfc\u51fa\u9009\u4e2d\u5e27...");
    const selectedFrames = getSelectedFrames();
    const data = await apiJson("/api/export", {
      method: "POST",
      body: {
        job_id: state.job.job_id,
        selected_indices: selectedFrames.map((frame) => frame.index),
        video_duration_ms: Number(els.previewIntervalInput.value || 100),
      },
    });
    state.exportResult = data.export;
    renderExportResult();
    setStatus("\u5bfc\u51fa\u5b8c\u6210\uff0c\u7ed3\u679c\u5df2\u5199\u5165\u672c\u5730\u5bfc\u51fa\u76ee\u5f55\u3002", "success");
  });
}

function renderExportResult() {
  if (!state.exportResult) {
    els.exportResult.hidden = true;
    els.exportResult.innerHTML = "";
    return;
  }

  els.exportResult.hidden = false;
  const mediaLinks = [
    ["MOV", state.exportResult.mov_url || state.exportResult.video_url, state.exportResult.mov_name || state.exportResult.video_name],
    ["GIF", state.exportResult.gif_url, state.exportResult.gif_name],
  ]
    .filter(([, url]) => Boolean(url))
    .map(([label, url, name]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}: ${escapeHtml(name || url)}</a>`)
    .join("");
  const sheetButton = state.exportResult.sheet_dir
    ? `<button id="openSheetDirButton" class="ghost-button" type="button">\u6253\u5F00\u7CBE\u7075\u8868 + JSON</button>`
    : "";

  els.exportResult.innerHTML = `
    <div class="result-summary">
      ${summaryCard("\u5bfc\u51fa\u5e27\u6570", `${state.exportResult.frame_count} \u5e27`)}
      ${summaryCard("\u5bfc\u51fa\u5185\u5bb9", "\u5e27\u6587\u4ef6\u5939 / \u900f\u660e MOV / GIF / \u7cbe\u7075\u8868 + JSON")}
    </div>
    <div class="link-list">
      <button id="openFramesDirButton" class="ghost-button" type="button">\u6253\u5f00\u5e27\u6587\u4ef6\u5939</button>
      ${sheetButton}
      ${mediaLinks}
    </div>
  `;

  const openFramesDirButton = document.getElementById("openFramesDirButton");
  if (openFramesDirButton) {
    openFramesDirButton.addEventListener("click", async () => {
      await openPath(state.exportResult.frames_dir || state.exportResult.output_dir);
    });
  }
  const openSheetDirButton = document.getElementById("openSheetDirButton");
  if (openSheetDirButton) {
    openSheetDirButton.addEventListener("click", async () => {
      await openPath(state.exportResult.sheet_dir);
    });
  }
  persistSession();
}

function summaryCard(label, value) {
  return `
    <div class="summary-card">
      <span class="meta-label">${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function formatFfmpegAccelLabel(ffmpegAccel) {
  if (!ffmpegAccel || typeof ffmpegAccel !== "object") {
    return "CPU";
  }

  const usedMode = String(ffmpegAccel.used_mode || "cpu").toLowerCase();
  const selectedMode = ffmpegAccel.selected_mode ? String(ffmpegAccel.selected_mode).toLowerCase() : "";
  const requestedMode = String(ffmpegAccel.requested_mode || "auto").toLowerCase();

  if (usedMode !== "cpu") {
    return `GPU (${usedMode})`;
  }
  if (ffmpegAccel.fallback_to_cpu && selectedMode) {
    return `CPU (${selectedMode} fallback)`;
  }
  if (requestedMode === "cpu") {
    return "CPU (manual)";
  }
  return "CPU";
}

function updateChromaVisibility(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  const root = scope === "image" ? els.imageProcessPanel : els.processPanel;
  const matteMode = currentMatteMode(scope);
  const chromaEnabled = matteMode !== "none";
  const isChroma = chromaEnabled && matteModeUsesChromaSeed(matteMode);
  const isAi = chromaEnabled && matteModeUsesBiRefNet(matteMode);
  const isLuma = chromaEnabled && matteModeUsesLuma(matteMode);
  const isCorridor = chromaEnabled && matteModeUsesCorridorKey(matteMode);
  const usesSpillControls = chromaEnabled;
  const usesKeyColorControls = chromaEnabled && matteModeUsesChromaSeed(matteMode);
  const isManual = controls.keyModeInput.value === "manual";
  controls.corridorEnabledInput.checked = isCorridor;
  controls.matteModeInput.disabled = !controls.chromaEnabledInput.checked;
  controls.keyModeInput.closest(".field").style.display = usesKeyColorControls ? "" : "none";
  controls.manualColorField.style.display = usesKeyColorControls && isManual ? "" : "none";
  root.querySelectorAll(".chroma-only").forEach((node) => {
    node.style.display = isChroma ? "" : "none";
  });
  root.querySelectorAll(".spill-matte-only").forEach((node) => {
    node.style.display = usesSpillControls ? "" : "none";
  });
  root.querySelectorAll(".ai-matte-only").forEach((node) => {
    node.style.display = isAi ? "" : "none";
  });
  root.querySelectorAll(".luma-matte-only").forEach((node) => {
    node.style.display = isLuma ? "" : "none";
  });
  root.querySelectorAll(".corridor-capable-only").forEach((node) => {
    node.style.display = "none";
  });
  root.querySelectorAll(".corridor-key-only").forEach((node) => {
    node.style.display = isCorridor ? "" : "none";
  });
  refreshMatteDependencyOptions(scope);
}

function syncManualColorLabel(scope = activeMatteScope()) {
  const controls = getMatteEls(scope);
  controls.manualKeyLabel.textContent = (controls.manualKeyInput.value || "#00ff00").toUpperCase();
}

function profileInitial(name = state.localProfile?.name) {
  return Array.from(String(name || "游客").trim() || "游客")[0] || "游";
}

function renderLocalProfile() {
  const profile = state.localProfile || {};
  const name = String(profile.name || "游客");
  const avatarUrl = String(profile.avatar_url || "");
  const mcp = profile.mcp || {};
  els.accountName.textContent = name;
  els.localProfileAvatarFallback.textContent = profileInitial(name);
  if (avatarUrl) {
    els.localProfileAvatar.src = `${avatarUrl}?ts=${Date.now()}`;
    els.localProfileAvatar.hidden = false;
    els.localProfileAvatarFallback.hidden = true;
  } else {
    els.localProfileAvatar.removeAttribute("src");
    els.localProfileAvatar.hidden = true;
    els.localProfileAvatarFallback.hidden = false;
  }
  els.localProfileMcpStatus.textContent = mcp.validated
    ? `MCP 可用 · ${Number(mcp.model_count || 0)} 模型`
    : mcp.configured
      ? "MCP 待验证"
      : "MCP 未配置";
  els.localProfileMcpStatus.classList.toggle("ready", Boolean(mcp.validated));
  renderAiConnectionState();
}

async function loadLocalProfile() {
  try {
    window.localStorage.removeItem("sprite-video-lab-auth-v1");
    const data = await apiJson(`/api/local-profile?ts=${Date.now()}`);
    state.localProfile = data.profile || state.localProfile;
    renderLocalProfile();
    if (state.activeModule === "aiCreation" && state.localProfile.mcp?.configured) {
      await ensureAiCreationLoaded({ force: true });
    }
  } catch (error) {
    setStatus(`读取本地资料失败：${error.message}`, "error");
  }
}

function openLocalProfileDialog() {
  const profile = state.localProfile || {};
  els.localProfileNameInput.value = profile.name || "游客";
  els.localProfileTokenInput.value = "";
  state.localProfileAvatarDataUrl = "";
  const avatarUrl = String(profile.avatar_url || "");
  if (avatarUrl) {
    els.localProfileAvatarPreview.src = `${avatarUrl}?ts=${Date.now()}`;
    els.localProfileAvatarPreview.hidden = false;
    els.localProfileAvatarPreviewFallback.hidden = true;
  } else {
    els.localProfileAvatarPreview.removeAttribute("src");
    els.localProfileAvatarPreview.hidden = true;
    els.localProfileAvatarPreviewFallback.hidden = false;
    els.localProfileAvatarPreviewFallback.textContent = profileInitial(profile.name);
  }
  const mcp = profile.mcp || {};
  els.localProfileConnectionStatus.textContent = mcp.validated
    ? `连接正常，可用图片模型 ${Number(mcp.model_count || 0)} 个`
    : mcp.last_error || (mcp.configured ? "Token 已配置，尚未验证" : "尚未配置 Token");
  els.localProfileClearTokenButton.disabled = !mcp.configured;
  els.localProfileDialog.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => els.localProfileNameInput.focus(), 0);
}

function closeLocalProfileDialog() {
  els.localProfileDialog.hidden = true;
  els.localProfileTokenInput.value = "";
  els.localProfileAvatarInput.value = "";
  state.localProfileAvatarDataUrl = "";
  document.body.classList.remove("modal-open");
}

function openModelManagerFromLocalProfile() {
  closeLocalProfileDialog();
  setActiveModule("model");
  void refreshModelManager({ announce: true });
}

function handleLocalProfileAvatarChange() {
  const file = els.localProfileAvatarInput.files?.[0];
  if (!file) {
    state.localProfileAvatarDataUrl = "";
    return;
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    els.localProfileAvatarInput.value = "";
    setStatus("头像仅支持 5 MB 内的 PNG、JPEG 或 WebP。", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.localProfileAvatarDataUrl = String(reader.result || "");
    els.localProfileAvatarPreview.src = state.localProfileAvatarDataUrl;
    els.localProfileAvatarPreview.hidden = false;
    els.localProfileAvatarPreviewFallback.hidden = true;
  };
  reader.onerror = () => setStatus("头像读取失败。", "error");
  reader.readAsDataURL(file);
}

async function saveLocalProfile() {
  await withBusy(els.localProfileSaveButton, async () => {
    try {
      const profileData = await apiJson("/api/local-profile", {
        method: "POST",
        body: {
          name: els.localProfileNameInput.value.trim() || "游客",
          avatar_data_url: state.localProfileAvatarDataUrl || "",
        },
      });
      state.localProfile = profileData.profile || state.localProfile;
      const token = els.localProfileTokenInput.value.trim();
      if (token) {
        const tokenData = await apiJson("/api/v1/generation/provider-token", { method: "POST", body: { token } });
        state.localProfile = tokenData.profile || state.localProfile;
      }
      renderLocalProfile();
      closeLocalProfileDialog();
      setStatus("本地资料已保存。", "success");
      if (state.activeModule === "aiCreation") {
        await ensureAiCreationLoaded({ force: true });
      }
    } catch (error) {
      setStatus(`保存本地资料失败：${error.message}`, "error");
    }
  });
}

async function testGenerationProviderConnection() {
  await withBusy(els.localProfileTestButton, async () => {
    try {
      const token = els.localProfileTokenInput.value.trim();
      if (token) {
        const tokenData = await apiJson("/api/v1/generation/provider-token", { method: "POST", body: { token } });
        state.localProfile = tokenData.profile || state.localProfile;
        els.localProfileTokenInput.value = "";
      }
      els.localProfileConnectionStatus.textContent = "正在连接生成服务...";
      const data = await apiJson("/api/v1/generation/provider-test", { method: "POST" });
      state.localProfile = data.profile || state.localProfile;
      renderLocalProfile();
      els.localProfileConnectionStatus.textContent = `连接正常，可用图片模型 ${Number(state.localProfile.mcp?.model_count || 0)} 个`;
      els.localProfileClearTokenButton.disabled = false;
      setStatus("生成服务连接正常。", "success");
      state.aiCreation.loaded = false;
      if (state.activeModule === "aiCreation") {
        await ensureAiCreationLoaded({ force: true });
      }
    } catch (error) {
      await loadLocalProfile();
      els.localProfileConnectionStatus.textContent = state.localProfile.mcp?.last_error || error.message;
      setStatus(`生成服务连接失败：${error.message}`, "error");
    }
  });
}

async function clearGenerationProviderToken() {
  if (!window.confirm("清除本机保存的生成服务 MCP Token？")) {
    return;
  }
  await withBusy(els.localProfileClearTokenButton, async () => {
    try {
      const data = await apiJson("/api/v1/generation/provider-token", { method: "DELETE" });
      state.localProfile = data.profile || state.localProfile;
      state.aiCreation.models = [];
      state.aiCreation.loaded = false;
      renderLocalProfile();
      els.localProfileConnectionStatus.textContent = "Token 已清除";
      els.localProfileClearTokenButton.disabled = true;
      setStatus("生成服务 MCP Token 已从本机清除。", "success");
    } catch (error) {
      setStatus(`清除 Token 失败：${error.message}`, "error");
    }
  });
}

function renderAiConnectionState() {
  if (!els.aiConnectionBadge) {
    return;
  }
  const mcp = state.localProfile?.mcp || {};
  els.aiConnectionBadge.className = `ai-state-chip ${mcp.validated ? "ready" : "warning"}`;
  els.aiConnectionBadge.textContent = mcp.validated ? "MCP 可用" : mcp.configured ? "待验证" : "未配置";
  els.aiTokenNotice.hidden = Boolean(mcp.validated);
  const noticeText = els.aiTokenNotice.querySelector("span");
  if (noticeText) {
    noticeText.textContent = mcp.configured
      ? "请先在本地资料中测试生成服务连接。"
      : "配置生成服务 MCP Token 后可开始生成。";
  }
  updateAiGenerateAvailability();
}

function aiAssetNodeById(nodeId) {
  return state.aiCreation.assetTree.find((node) => node.id === nodeId) || null;
}

function selectedAiAssetNode() {
  return aiAssetNodeById(state.aiCreation.selectedAssetNodeId);
}

function aiAssetChildren(parentId) {
  return state.aiCreation.assetTree
    .filter((node) => String(node.parent_id || "") === String(parentId || ""))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
}

function aiAssetDescendantIds(nodeId) {
  const ids = new Set([nodeId]);
  const queue = [nodeId];
  while (queue.length) {
    const parentId = queue.shift();
    aiAssetChildren(parentId).forEach((child) => {
      if (ids.has(child.id)) return;
      ids.add(child.id);
      queue.push(child.id);
    });
  }
  return ids;
}

function aiRecordsForAssetNode(nodeId, { includeDescendants = true } = {}) {
  if (!nodeId) return state.aiCreation.history;
  const nodeIds = includeDescendants ? aiAssetDescendantIds(nodeId) : new Set([nodeId]);
  return state.aiCreation.history.filter((record) => nodeIds.has(record.asset_node_id));
}

function aiAssetNodeCountLabel(node) {
  const generated = aiRecordsForAssetNode(node.id).length;
  const target = Math.max(0, Number(node.target_count || 0));
  return target ? `${generated} / ${target}` : String(generated);
}

function aiAssetTreeNodeMarkup(node, depth = 0) {
  const children = aiAssetChildren(node.id);
  const expanded = state.aiCreation.expandedNodeIds.has(node.id);
  const selected = node.id === state.aiCreation.selectedAssetNodeId;
  const query = state.aiCreation.assetTreeQuery;
  const selfMatches = !query || String(node.name || "").toLowerCase().includes(query);
  const childMarkup = children.map((child) => aiAssetTreeNodeMarkup(child, depth + 1)).join("");
  if (!selfMatches && !childMarkup) return "";
  return `
    <div class="ai-tree-node-wrap" style="--tree-depth:${Math.min(depth, 4)}">
      ${children.length ? `<button class="ai-tree-expander" type="button" data-ai-tree-toggle="${escapeHtml(node.id)}" aria-label="${expanded ? "折叠" : "展开"}${escapeHtml(node.name || "节点")}" aria-expanded="${expanded}">${expanded ? "−" : "+"}</button>` : '<span class="ai-tree-expander-spacer"></span>'}
      <button class="ai-tree-node ${selected ? "selected" : ""} ${node.type === "category" ? "category" : ""}" type="button" data-ai-asset-node="${escapeHtml(node.id)}" role="treeitem" aria-selected="${String(selected)}">
        <span class="ai-tree-node-icon" aria-hidden="true">${node.type === "category" ? "◆" : node.type === "group" ? "▣" : "●"}</span>
        <strong title="${escapeHtml(node.name || "")}">${escapeHtml(node.name || "未命名")}</strong>
        <small>${escapeHtml(aiAssetNodeCountLabel(node))}</small>
      </button>
      ${childMarkup && expanded ? `<div class="ai-tree-children" role="group">${childMarkup}</div>` : ""}
    </div>`;
}

function renderAiAssetTree() {
  if (!els.aiAssetTree) return;
  const roots = aiAssetChildren("");
  const markup = roots.map((node) => aiAssetTreeNodeMarkup(node)).join("");
  els.aiAssetTree.innerHTML = markup || '<div class="ai-empty-state compact">没有匹配的资产节点</div>';
  if (els.aiAssetTreeCount) {
    els.aiAssetTreeCount.textContent = `${state.aiCreation.assetTree.length} 个节点`;
  }
  const selected = selectedAiAssetNode();
  const canEdit = Boolean(selected && selected.type !== "category");
  if (els.aiAssetNodeRenameButton) els.aiAssetNodeRenameButton.disabled = !canEdit;
  if (els.aiAssetNodeDeleteButton) els.aiAssetNodeDeleteButton.disabled = !canEdit;
}

function renderAiAssetContext() {
  const selected = selectedAiAssetNode();
  const children = selected ? aiAssetChildren(selected.id) : [];
  if (els.aiCurrentNodeTitle) els.aiCurrentNodeTitle.textContent = selected?.name || "资产节点";
  if (els.aiCurrentNodeMeta) els.aiCurrentNodeMeta.textContent = `${children.length} 个子节点`;
  if (els.aiCurrentAssetInput) els.aiCurrentAssetInput.value = selected?.name || "未选择";
  if (els.aiProjectStyleInput) {
    const confirmed = state.projectAssets.styles.find((item) => item.id === activeProject()?.current_style_direction_id);
    els.aiProjectStyleInput.value = confirmed?.name || "尚未确认";
  }
  if (!els.aiChildAssetGrid) return;
  els.aiChildAssetGrid.innerHTML = children.length
    ? children.map((node) => {
        const records = aiRecordsForAssetNode(node.id);
        const preview = records.find((record) => record.status === "succeeded" && record.local_url);
        const selectedCount = records.filter((record) => ["selected", "confirmed", "in_library"].includes(record.lifecycle_status)).length;
        const status = selectedCount ? "已选" : records.length ? "已生成" : "未生成";
        return `
          <button class="ai-child-asset-card ${node.id === state.aiCreation.selectedAssetNodeId ? "selected" : ""}" type="button" data-ai-asset-node="${escapeHtml(node.id)}">
            <span class="ai-child-asset-preview">${preview ? `<img src="${escapeHtml(preview.local_url)}" alt="">` : `<b>${node.type === "group" ? "组" : "资"}</b>`}</span>
            <strong title="${escapeHtml(node.name || "")}">${escapeHtml(node.name || "未命名")}</strong>
            <small>${records.length} 已生成 · ${selectedCount} 已选 · ${status}</small>
          </button>`;
      }).join("")
    : '<div class="ai-empty-state compact">当前节点没有子资产，可直接生成或新建节点</div>';
}

async function loadAiAssetTree() {
  const projectId = activeProjectId();
  if (!projectId) return;
  try {
    const data = await apiJson(`/api/v1/projects/${encodeURIComponent(projectId)}/asset-tree?ts=${Date.now()}`);
    state.aiCreation.assetTree = Array.isArray(data.asset_tree?.nodes) ? data.asset_tree.nodes : [];
    if (!aiAssetNodeById(state.aiCreation.selectedAssetNodeId)) {
      state.aiCreation.selectedAssetNodeId = aiAssetNodeById("category-character")?.id || state.aiCreation.assetTree[0]?.id || "";
    }
    renderAiAssetTree();
    renderAiAssetContext();
  } catch (error) {
    state.aiCreation.assetTree = [];
    setStatus(`读取资产结构失败：${error.message}`, "error");
  }
}

function selectAiAssetNode(nodeId) {
  if (!aiAssetNodeById(nodeId)) return;
  state.aiCreation.selectedAssetNodeId = nodeId;
  renderAiCreation();
}

function handleAiAssetNodeClick(event) {
  const toggle = event.target.closest?.("[data-ai-tree-toggle]");
  if (toggle) {
    const id = toggle.dataset.aiTreeToggle;
    if (state.aiCreation.expandedNodeIds.has(id)) state.aiCreation.expandedNodeIds.delete(id);
    else state.aiCreation.expandedNodeIds.add(id);
    renderAiAssetTree();
    return;
  }
  const button = event.target.closest?.("[data-ai-asset-node]");
  if (!button) return;
  selectAiAssetNode(button.dataset.aiAssetNode || "");
}

async function createAiAssetNode(nodeType = "asset") {
  const selected = selectedAiAssetNode();
  if (!selected) return;
  const parentId = selected.type === "asset" ? selected.parent_id : selected.id;
  const name = await askText(nodeType === "group" ? "新分组名称" : "新资产节点名称", "");
  if (name === null || !name.trim()) return;
  try {
    const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/asset-nodes`, {
      method: "POST",
      body: { parent_id: parentId, name: name.trim(), type: nodeType, actor: "user" },
    });
    await loadAiAssetTree();
    state.aiCreation.expandedNodeIds.add(parentId);
    selectAiAssetNode(data.node.id);
    setStatus(`已创建${nodeType === "group" ? "分组" : "资产节点"}：${data.node.name}`, "success");
  } catch (error) {
    setStatus(`创建资产节点失败：${error.message}`, "error");
  }
}

async function renameSelectedAiAssetNode() {
  const selected = selectedAiAssetNode();
  if (!selected || selected.type === "category") return;
  const name = await askText("修改资产节点名称", selected.name || "");
  if (name === null || !name.trim() || name.trim() === selected.name) return;
  try {
    await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/asset-nodes/${encodeURIComponent(selected.id)}`, {
      method: "PATCH",
      body: { name: name.trim(), actor: "user" },
    });
    await loadAiAssetTree();
    setStatus("资产节点已重命名。", "success");
  } catch (error) {
    setStatus(`重命名失败：${error.message}`, "error");
  }
}

async function deleteSelectedAiAssetNode() {
  const selected = selectedAiAssetNode();
  if (!selected || selected.type === "category") return;
  if (!window.confirm(`将资产节点“${selected.name}”移入回收站？仅空节点可以删除。`)) return;
  try {
    await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/asset-nodes/${encodeURIComponent(selected.id)}`, {
      method: "DELETE",
    });
    state.aiCreation.selectedAssetNodeId = selected.parent_id || "category-other";
    await loadAiAssetTree();
    setStatus("资产节点已移入回收站。", "success");
  } catch (error) {
    setStatus(`删除资产节点失败：${error.message}`, "error");
  }
}

async function ensureAiCreationLoaded({ force = false } = {}) {
  if (!activeProjectId()) {
    return;
  }
  if (state.aiCreation.loading || (state.aiCreation.loaded && !force)) {
    renderAiCreation();
    return;
  }
  state.aiCreation.loading = true;
  renderAiCreation();
  try {
    await Promise.all([loadAiHistory(), loadAiAssetTree(), loadProductionStyles()]);
    if (state.localProfile?.mcp?.configured) {
      await loadGenerationModels();
    }
    state.aiCreation.loaded = true;
  } finally {
    state.aiCreation.loading = false;
    renderAiCreation();
  }
}

async function loadProductionStyles() {
  const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/styles?ts=${Date.now()}`);
  state.projectAssets.styles = data.styles || [];
}

function setAiCreationView(view) {
  state.aiCreation.view = view === "history" ? "history" : "image";
  renderAiCreation();
}

function renderAiCreation() {
  if (!els.aiCreationModule) {
    return;
  }
  const isHistory = state.aiCreation.view === "history";
  const isCanvas = !isHistory && state.projectAssets.activeView.production === "canvas";
  const isActiveModule = state.activeModule === "aiCreation";
  els.aiImageViewButton.classList.toggle("active", isActiveModule && !isHistory);
  els.aiImageViewButton.setAttribute("aria-pressed", String(isActiveModule && !isHistory));
  els.aiHistoryViewButton.classList.toggle("active", isActiveModule && isHistory);
  els.aiHistoryViewButton.setAttribute("aria-pressed", String(isActiveModule && isHistory));
  els.aiCreatePanel.hidden = isHistory;
  els.aiImageWorkspace.hidden = isHistory || isCanvas;
  if (els.aiProductionCanvasWorkspace) els.aiProductionCanvasWorkspace.hidden = isHistory || !isCanvas;
  els.aiHistoryWorkspace.hidden = !isHistory;
  els.aiCreationModule.classList.toggle("history-active", isHistory);
  renderAiConnectionState();
  renderAiAssetTree();
  renderAiAssetContext();
  renderAiResultGrid();
  renderAiTaskQueue();
  renderAiHistory();
  if (isCanvas && els.aiProductionCanvasHost && state.projectAssets.canvasType !== "production") {
    void renderProjectCanvasModule("production", productionCanvasItems(), els.aiProductionCanvasHost);
  }
}

async function loadGenerationModels() {
  try {
    const data = await apiJson(`/api/v1/generation/models?ts=${Date.now()}`);
    state.aiCreation.models = Array.isArray(data.models) ? data.models : [];
    const existing = state.aiCreation.models.some((model) => model.id === state.aiCreation.selectedModel);
    if (!existing) {
      state.aiCreation.selectedModel = state.aiCreation.models.find((model) => /low/i.test(model.id))?.id || state.aiCreation.models[0]?.id || "";
    }
    renderGenerationModelOptions();
  } catch (error) {
    state.aiCreation.models = [];
    renderGenerationModelOptions();
    setStatus(`读取图片模型失败：${error.message}`, "error");
  }
}

function renderGenerationModelOptions() {
  const models = state.aiCreation.models;
  els.aiModelSelect.innerHTML = models.length
    ? models.map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.display_name || model.id)}</option>`).join("")
    : '<option value="">暂无可用模型</option>';
  els.aiModelSelect.disabled = !models.length;
  els.aiModelSelect.value = state.aiCreation.selectedModel;
  renderGenerationCapabilityControls();
}

function selectedGenerationModel() {
  return state.aiCreation.models.find((model) => model.id === state.aiCreation.selectedModel) || null;
}

function normalizedCapabilityOptions(value, fallback) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (value && typeof value === "object") {
    return Object.keys(value);
  }
  return [...fallback];
}

function fillAiSelect(select, values, preferred) {
  const options = Array.from(new Set(values));
  select.innerHTML = options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  select.value = options.includes(preferred) ? preferred : options[0] || "";
  select.disabled = !options.length;
}

function renderGenerationCapabilityControls() {
  const model = selectedGenerationModel();
  const currentAspect = els.aiAspectRatioSelect.value || "1:1";
  const currentResolution = els.aiResolutionSelect.value || "1K";
  const ratios = normalizedCapabilityOptions(model?.supported_aspect_ratios, ["1:1"]);
  const resolutions = normalizedCapabilityOptions(model?.supported_resolutions, ["1K"]);
  fillAiSelect(els.aiAspectRatioSelect, ratios, currentAspect);
  fillAiSelect(els.aiResolutionSelect, resolutions, currentResolution);
  if (els.aiResultRatioFilter) {
    const currentFilter = state.aiCreation.resultFilters.ratio;
    const historyRatios = state.aiCreation.history.map((item) => item.params?.aspect_ratio || item.aspect_ratio).filter(Boolean);
    const filterRatios = Array.from(new Set([...ratios, ...historyRatios]));
    els.aiResultRatioFilter.innerHTML = `<option value="all">全部比例</option>${filterRatios.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    els.aiResultRatioFilter.value = filterRatios.includes(currentFilter) ? currentFilter : "all";
  }
  const pricing = model?.pricing;
  const pricingText = pricing && typeof pricing === "object"
    ? Object.entries(pricing).map(([key, value]) => `${key}: ${value}`).join(" · ")
    : String(pricing || "");
  els.aiModelMeta.textContent = model ? `${model.display_name || model.id}${pricingText ? ` · ${pricingText}` : ""}` : "选择模型后显示可用参数";
  updateAiGenerateAvailability();
}

function updateAiGenerateAvailability() {
  if (!els.aiGenerateButton) {
    return;
  }
  els.aiGenerateButton.disabled = !state.localProfile?.mcp?.validated || !state.aiCreation.selectedModel || !els.aiPromptInput.value.trim() || state.aiCreation.loading;
}

async function submitAiImageGeneration(record = null) {
  const projectId = activeProjectId();
  const prompt = record?.prompt || els.aiPromptInput.value.trim();
  const model = record?.model || state.aiCreation.selectedModel;
  let params = record?.params || null;
  if (!projectId || !prompt || !model) {
    setStatus("请填写提示词并选择模型。", "error");
    return;
  }
  await withBusy(els.aiGenerateButton, async () => {
    try {
      if (!params) {
        const references = await uploadProjectReferenceImages(projectId, Array.from(els.aiReferenceImageInput?.files || []), "generation-reference");
        params = {
          aspect_ratio: els.aiAspectRatioSelect.value,
          resolution: els.aiResolutionSelect.value,
          background: els.aiBackgroundSelect?.value || "transparent",
          asset_description: els.aiAssetDescriptionInput?.value.trim() || "",
          negative_prompt: els.aiNegativePromptInput?.value.trim() || "",
          project_style_direction_id: activeProject()?.current_style_direction_id || "",
          reference_images: references.map((item) => item.relative_path),
        };
      }
      const count = record ? 1 : Math.max(1, Math.min(8, Number(els.aiCountSelect?.value || 1)));
      const records = [];
      for (let index = 0; index < count; index += 1) {
        const data = await apiJson("/api/v1/generation/tasks", {
          method: "POST",
          body: {
            project_id: projectId,
            asset_node_id: state.aiCreation.selectedAssetNodeId || "category-other",
            prompt,
            model,
            params,
            actor: "user",
          },
        });
        upsertAiHistoryRecord(data.record);
        pollAiGenerationRecord(data.record.id);
        records.push(data.record);
      }
      renderAiCreation();
      setStatus(`${records.length} 个图片生成任务已提交。`, "success");
    } catch (error) {
      await loadAiHistory();
      setStatus(`图片生成失败：${error.message}`, "error");
    }
  });
}

function upsertAiHistoryRecord(record) {
  if (!record?.id) {
    return;
  }
  const index = state.aiCreation.history.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    state.aiCreation.history[index] = record;
  } else {
    state.aiCreation.history.unshift(record);
  }
}

async function loadAiHistory({ refreshRemote = false } = {}) {
  const projectId = activeProjectId();
  if (!projectId) return;
  try {
    if (refreshRemote) {
      await apiJson("/api/v1/generation/history/refresh", {
        method: "POST",
        body: { project_id: projectId },
      });
    }
    const data = await apiJson(`/api/v1/generation/history?project_id=${encodeURIComponent(projectId)}&ts=${Date.now()}`);
    state.aiCreation.history = Array.isArray(data.history) ? data.history : [];
    const availableIds = new Set(state.aiCreation.history.map((record) => record.id));
    state.aiCreation.selectedIds = new Set(Array.from(state.aiCreation.selectedIds).filter((id) => availableIds.has(id)));
    state.aiCreation.history.filter(isActiveAiRecord).forEach((record) => pollAiGenerationRecord(record.id));
    renderAiCreation();
  } catch (error) {
    setStatus(`读取生成历史失败：${error.message}`, "error");
  }
}

function isActiveAiRecord(record) {
  return ["submitting", "queued", "running"].includes(String(record?.status || ""));
}

function pollAiGenerationRecord(recordId, delay = 2000) {
  if (!recordId || state.aiCreation.pollingIds.has(recordId)) {
    return;
  }
  state.aiCreation.pollingIds.add(recordId);
  const run = async () => {
    try {
      const projectId = activeProjectId();
      if (!projectId) return;
      const data = await apiJson(`/api/v1/generation/task?id=${encodeURIComponent(recordId)}&project_id=${encodeURIComponent(projectId)}&ts=${Date.now()}`);
      upsertAiHistoryRecord(data.record);
      renderAiCreation();
      if (isActiveAiRecord(data.record)) {
        state.aiCreation.pollTimers.set(recordId, window.setTimeout(run, 2000));
      } else {
        state.aiCreation.pollingIds.delete(recordId);
        state.aiCreation.pollTimers.delete(recordId);
      }
    } catch (error) {
      state.aiCreation.pollTimers.set(recordId, window.setTimeout(run, 5000));
    }
  };
  state.aiCreation.pollTimers.set(recordId, window.setTimeout(run, delay));
}

function stopAiPollingRecord(recordId) {
  const timerId = state.aiCreation.pollTimers.get(recordId);
  if (timerId) window.clearTimeout(timerId);
  state.aiCreation.pollTimers.delete(recordId);
  state.aiCreation.pollingIds.delete(recordId);
}

function aiStatusLabel(record) {
  const labels = {
    submitting: "提交中",
    queued: "等待中",
    running: "生成中",
    succeeded: "已完成",
    failed: "失败",
    canceled: "已取消",
    download_failed: "下载失败",
  };
  return labels[record?.status] || record?.status || "未知";
}

function aiStatusTone(record) {
  if (record?.status === "succeeded") return "success";
  if (["failed", "canceled", "download_failed"].includes(record?.status)) return "error";
  return "running";
}

function aiRecordDate(record) {
  const date = new Date(record?.created_at || "");
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("zh-CN", { hour12: false });
}

function aiRecordCard(record, { selectable = false } = {}) {
  const succeeded = record.status === "succeeded" && record.local_url;
  const selected = state.aiCreation.selectedIds.has(record.id);
  const lifecycle = record.lifecycle_status || "normal";
  const params = record.params || {};
  const thumb = succeeded
    ? `<button class="ai-card-preview" type="button" data-ai-action="preview" data-ai-id="${escapeHtml(record.id)}" aria-label="预览生成图片"><img src="${escapeHtml(record.local_url)}" alt="${escapeHtml(record.prompt || "生成图片")}"></button>`
    : `<div class="ai-card-placeholder"><span>${escapeHtml(aiStatusLabel(record))}</span><b>${Math.max(0, Number(record.progress || 0))}%</b></div>`;
  const select = selectable && succeeded
    ? `<button class="ai-card-select ${selected ? "selected" : ""}" type="button" data-ai-action="select" data-ai-id="${escapeHtml(record.id)}" aria-pressed="${String(selected)}">${selected ? "✓" : ""}</button>`
    : "";
  const primaryAction = succeeded
    ? `<button class="primary-button tiny ai-card-primary-action" type="button" data-ai-action="process" data-ai-id="${escapeHtml(record.id)}">加入图片处理</button>`
    : record.status === "download_failed"
    ? `<button class="ghost-button tiny ai-card-primary-action" type="button" data-ai-action="retry-download" data-ai-id="${escapeHtml(record.id)}">重试下载</button>`
    : ["failed", "canceled"].includes(record.status)
      ? `<button class="ghost-button tiny ai-card-primary-action" type="button" data-ai-action="regenerate" data-ai-id="${escapeHtml(record.id)}">重新生成</button>`
      : "";
  const stateAction = succeeded && lifecycle !== "in_library"
    ? `<button class="ghost-button tiny ai-card-state-action" type="button" data-ai-action="lifecycle" data-lifecycle="${lifecycle === "selected" ? "normal" : "selected"}" data-ai-id="${escapeHtml(record.id)}">${lifecycle === "selected" ? "取消已选" : "设为已选"}</button>`
    : "";
  const secondaryActions = [
    succeeded && !["confirmed", "in_library"].includes(lifecycle)
      ? `<button class="ghost-button tiny" type="button" data-ai-action="lifecycle" data-lifecycle="confirmed" data-ai-id="${escapeHtml(record.id)}">确认</button>`
      : "",
    succeeded && lifecycle !== "in_library"
      ? `<button class="ghost-button tiny" type="button" data-ai-action="library" data-ai-id="${escapeHtml(record.id)}">加入资产管理</button>`
      : "",
    succeeded
      ? `<button class="ghost-button tiny" type="button" data-ai-action="similar" data-ai-id="${escapeHtml(record.id)}">生成相似图</button>`
      : "",
    succeeded
      ? `<a class="ghost-button tiny" href="${escapeHtml(record.local_url)}" download data-ai-action="download" data-ai-id="${escapeHtml(record.id)}">下载</a>`
      : "",
    record.local_path
      ? `<button class="ghost-button tiny" type="button" data-ai-action="open" data-ai-id="${escapeHtml(record.id)}">打开位置</button>`
      : "",
    lifecycle !== "trashed"
      ? `<button class="ghost-button tiny danger" type="button" data-ai-action="delete" data-ai-id="${escapeHtml(record.id)}">移入回收站</button>`
      : "",
  ].filter(Boolean).join("");
  const moreActions = secondaryActions
    ? `<details class="ai-card-more"><summary class="ai-card-more-toggle" title="更多操作" aria-label="更多操作"><span aria-hidden="true">...</span></summary><div class="ai-card-more-menu">${secondaryActions}</div></details>`
    : "";
  return `
    <article class="ai-result-card ${selected ? "selected" : ""} lifecycle-${escapeHtml(lifecycle)}">
      <div class="ai-card-media">${thumb}${select}<span class="ai-card-status ${aiStatusTone(record)}">${escapeHtml(aiStatusLabel(record))}</span></div>
      <div class="ai-card-body">
        <strong title="${escapeHtml(record.prompt || "")}">${escapeHtml(record.prompt || "未命名任务")}</strong>
        <small>${escapeHtml(record.model || "-")} · ${escapeHtml(aiRecordDate(record))}</small>
        <small>${escapeHtml(params.aspect_ratio || record.aspect_ratio || "-")} · ${escapeHtml(params.background || record.background || "transparent")} · ${escapeHtml(String(record.file_format || PathExtensionFallback(record.local_path || "png")).toUpperCase())} · ${escapeHtml(record.task_id || "本地任务")}</small>
        <span class="lifecycle-chip ${escapeHtml(lifecycle)}">${escapeHtml({ normal: "普通", selected: "已选", confirmed: "已确认", in_library: "已入库", archived: "已归档", trashed: "回收站" }[lifecycle] || lifecycle)}</span>
        ${record.error ? `<p title="${escapeHtml(record.error)}">${escapeHtml(record.error)}</p>` : ""}
        <div class="ai-card-actions">
          ${primaryAction}
          ${stateAction}
          ${moreActions}
        </div>
      </div>
    </article>`;
}

function renderAiResultGrid() {
  if (!els.aiResultGrid) return;
  const node = selectedAiAssetNode();
  const filters = state.aiCreation.resultFilters;
  const now = Date.now();
  const records = aiRecordsForAssetNode(node?.id || "").filter((record) => {
    if (record.lifecycle_status === "trashed") return false;
    if (filters.status === "active" && !isActiveAiRecord(record)) return false;
    if (filters.status === "failed" && !["failed", "canceled", "download_failed"].includes(record.status)) return false;
    if (["normal", "selected", "in_library"].includes(filters.status) && (record.lifecycle_status || "normal") !== filters.status) return false;
    const fileType = String(record.file_format || PathExtensionFallback(record.local_path || "png")).toLowerCase().replace("jpeg", "jpg");
    if (filters.type !== "all" && fileType !== filters.type) return false;
    if (filters.ratio !== "all" && (record.params?.aspect_ratio || record.aspect_ratio) !== filters.ratio) return false;
    if (filters.background !== "all" && (record.params?.background || record.background || "transparent") !== filters.background) return false;
    if (filters.time !== "all") {
      const created = new Date(record.created_at || 0).getTime();
      const age = now - created;
      if (!Number.isFinite(created) || created <= 0) return false;
      if (filters.time === "today") {
        const today = new Date();
        const date = new Date(created);
        if (date.getFullYear() !== today.getFullYear() || date.getMonth() !== today.getMonth() || date.getDate() !== today.getDate()) return false;
      }
      if (filters.time === "7d" && age > 7 * 24 * 60 * 60 * 1000) return false;
      if (filters.time === "30d" && age > 30 * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  }).sort((left, right) => {
    const delta = new Date(right.created_at || 0) - new Date(left.created_at || 0);
    return filters.sort === "oldest" ? -delta : delta;
  }).slice(0, 60);
  els.aiResultSummary.textContent = records.length ? `${records.length} 个结果` : "暂无结果";
  els.aiResultGrid.innerHTML = records.length
    ? records.map((record) => aiRecordCard(record)).join("")
    : '<div class="ai-empty-state">当前资产节点还没有生成结果</div>';
}

function syncAiResultFilters() {
  state.aiCreation.resultFilters = {
    status: els.aiResultStatusFilter?.value || "all",
    type: els.aiResultTypeFilter?.value || "all",
    ratio: els.aiResultRatioFilter?.value || "all",
    background: els.aiResultBackgroundFilter?.value || "all",
    time: els.aiResultTimeFilter?.value || "all",
    sort: els.aiResultSortSelect?.value || "newest",
  };
  renderAiResultGrid();
}

function renderAiTaskQueue() {
  if (!els.aiTaskList) return;
  const records = state.aiCreation.history.filter((record) => isActiveAiRecord(record) || ["download_failed", "failed"].includes(record.status)).slice(0, 12);
  els.aiTaskCount.textContent = String(records.length);
  els.aiTaskList.innerHTML = records.length
    ? records.map((record) => `
      <button class="ai-task-item" type="button" data-ai-action="focus" data-ai-id="${escapeHtml(record.id)}">
        <span><strong>${escapeHtml(record.prompt || "生成任务")}</strong><small>${escapeHtml(record.model || "-")}</small></span>
        <em class="${aiStatusTone(record)}">${escapeHtml(aiStatusLabel(record))}</em>
      </button>`).join("")
    : '<div class="ai-empty-state compact">暂无任务</div>';
  els.aiTaskList.querySelectorAll("[data-ai-action]").forEach((button) => button.addEventListener("click", handleAiCardAction));
}

function syncAiHistoryFilters() {
  state.aiCreation.filters.media = els.aiHistoryMediaFilter.value;
  state.aiCreation.filters.status = els.aiHistoryStatusFilter.value;
  state.aiCreation.filters.query = els.aiHistorySearchInput.value.trim().toLowerCase();
  renderAiHistory();
}

function filteredAiHistory() {
  const filters = state.aiCreation.filters;
  return state.aiCreation.history.filter((record) => {
    if (filters.media !== "all" && record.media_type !== filters.media) return false;
    if (filters.status === "active" && !isActiveAiRecord(record)) return false;
    if (filters.status === "succeeded" && record.status !== "succeeded") return false;
    if (filters.status === "failed" && !["failed", "canceled", "download_failed"].includes(record.status)) return false;
    if (["normal", "selected", "in_library", "trashed", "confirmed", "archived"].includes(filters.status) && (record.lifecycle_status || "normal") !== filters.status) return false;
    if (filters.status === "all" && record.lifecycle_status === "trashed") return false;
    if (filters.query && !`${record.prompt || ""} ${record.model || ""}`.toLowerCase().includes(filters.query)) return false;
    return true;
  });
}

function renderAiHistory() {
  if (!els.aiHistoryGrid) return;
  const records = filteredAiHistory();
  els.aiHistoryGrid.innerHTML = records.length
    ? records.map((record) => aiRecordCard(record, { selectable: true })).join("")
    : '<div class="ai-empty-state">没有符合筛选条件的历史</div>';
  const selectedCount = state.aiCreation.selectedIds.size;
  els.aiHistorySelectionBar.hidden = selectedCount === 0;
  els.aiHistorySelectionCount.textContent = `已选 ${selectedCount} 项`;
}

function selectVisibleAiHistory() {
  filteredAiHistory().filter((record) => record.status === "succeeded" && record.local_url).forEach((record) => state.aiCreation.selectedIds.add(record.id));
  renderAiHistory();
}

function clearAiHistorySelection() {
  state.aiCreation.selectedIds.clear();
  renderAiHistory();
}

function aiRecordById(recordId) {
  return state.aiCreation.history.find((record) => record.id === recordId) || null;
}

function handleAiCardAction(event) {
  const moreToggle = event.target?.closest?.(".ai-card-more-toggle");
  if (moreToggle) {
    const currentMenu = moreToggle.closest(".ai-card-more");
    window.requestAnimationFrame(() => {
      document.querySelectorAll(".ai-card-more[open]").forEach((menu) => {
        if (menu !== currentMenu) menu.removeAttribute("open");
      });
      if (!currentMenu?.open) return;
      const card = currentMenu.closest(".ai-result-card");
      const grid = card?.closest(".ai-result-grid, .ai-history-grid");
      if (card && grid) {
        const cardRect = card.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        grid.scrollTop += cardRect.bottom - gridRect.bottom + 4;
      }
    });
    return;
  }
  const target = event.currentTarget?.dataset?.aiAction ? event.currentTarget : event.target?.closest?.("[data-ai-action]");
  const action = target?.dataset?.aiAction;
  const record = aiRecordById(target?.dataset?.aiId || "");
  if (!action || !record) return;
  target.closest?.(".ai-card-more")?.removeAttribute("open");
  if (action === "select") {
    if (state.aiCreation.selectedIds.has(record.id)) state.aiCreation.selectedIds.delete(record.id);
    else state.aiCreation.selectedIds.add(record.id);
    renderAiHistory();
  } else if (action === "preview" && record.local_url) {
    openAiPreviewDialog(record);
  } else if (action === "process") {
    void addAiRecordsToImageProcessing([record.id]);
  } else if (action === "open" && record.local_path) {
    void openPath(record.local_path);
  } else if (action === "delete") {
    void setAiRecordLifecycle([record.id], "trashed");
  } else if (action === "lifecycle") {
    void setAiRecordLifecycle([record.id], target.dataset.lifecycle || "normal");
  } else if (action === "library") {
    void addAiRecordsToLibrary([record.id]);
  } else if (action === "regenerate") {
    void submitAiImageGeneration(record);
  } else if (action === "similar") {
    els.aiPromptInput.value = record.prompt || "";
    setAiCreationView("image");
    void submitAiImageGeneration(record);
  } else if (action === "retry-download") {
    pollAiGenerationRecord(record.id, 0);
  } else if (action === "focus") {
    setAiCreationView("history");
    els.aiHistorySearchInput.value = record.prompt || "";
    syncAiHistoryFilters();
  }
}

async function setAiRecordLifecycle(recordIds, lifecycleStatus) {
  if (!recordIds.length) return;
  try {
    const data = await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/generation-results/lifecycle`, { method: "POST", body: { record_ids: recordIds, status: lifecycleStatus } });
    (data.results || []).forEach(upsertAiHistoryRecord);
    if (lifecycleStatus === "trashed") recordIds.forEach((id) => state.aiCreation.selectedIds.delete(id));
    renderAiCreation();
    await loadProjectDashboard();
    setStatus(lifecycleStatus === "trashed" ? "生成结果已移入项目回收站。" : "生成结果状态已更新。", "success");
  } catch (error) {
    setStatus(`更新生成结果失败：${error.message}`, "error");
  }
}

async function addAiRecordsToLibrary(recordIds) {
  try {
    await apiJson(`/api/v1/projects/${encodeURIComponent(activeProjectId())}/library/ingest`, { method: "POST", body: { record_ids: recordIds } });
    await loadAiHistory();
    await loadProjectDashboard();
    setStatus(`${recordIds.length} 个结果已复制到资产管理。`, "success");
  } catch (error) {
    setStatus(`加入资产管理失败：${error.message}`, "error");
  }
}

function openAiPreviewDialog(record) {
  els.aiPreviewImage.src = record.local_url;
  els.aiPreviewDialogTitle.textContent = record.prompt || "生成结果";
  els.aiPreviewCaption.textContent = `${record.model || "-"} · ${record.width || "-"} x ${record.height || "-"}`;
  els.aiPreviewDialog.hidden = false;
  document.body.classList.add("modal-open");
}

function closeAiPreviewDialog() {
  els.aiPreviewDialog.hidden = true;
  els.aiPreviewImage.removeAttribute("src");
  document.body.classList.remove("modal-open");
}

async function addSelectedAiRecordsToImageProcessing() {
  await addAiRecordsToImageProcessing(Array.from(state.aiCreation.selectedIds));
}

async function addAiRecordsToImageProcessing(recordIds) {
  const records = recordIds.map(aiRecordById).filter((record) => record?.status === "succeeded" && record.local_url);
  if (!records.length) {
    setStatus("所选记录没有可加入处理的本地图片。", "error");
    return;
  }
  try {
    const intakeData = await apiJson(
      `/api/v1/projects/${encodeURIComponent(activeProjectId())}/processing-intakes`,
      {
        method: "POST",
        body: {
          record_ids: records.map((record) => record.id),
          actor: "user",
          idempotency_key: `ui-${Date.now()}-${records.map((record) => record.id).sort().join("-")}`,
        },
      }
    );
    const intake = intakeData.processing_intake;
    const sources = Array.isArray(intake?.sources) ? intake.sources : [];
    if (sources.length !== records.length) {
      throw new Error("项目处理接收单与所选结果数量不一致");
    }
    const files = await Promise.all(sources.map(async (source, index) => {
      const response = await fetch(source.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`无法读取第 ${index + 1} 张生成图片`);
      const blob = await response.blob();
      const extension = PathExtensionFallback(source.file_name || source.working_relative_path);
      const name = imageImportFileName(source.file_name || `generated_${index + 1}.${extension}`, extension);
      return new File([blob], name, { type: blob.type || `image/${extension}` });
    }));
    await uploadImageFiles(files);
    records.forEach((record) => state.aiCreation.selectedIds.delete(record.id));
    setActiveModule("image", { announce: false });
    setActiveImagePage("full", { announce: false, persist: false });
    setActiveImageTool("import", { announce: false });
    renderImageWorkflow();
    setStatus(`已创建项目处理接收单，并将 ${files.length} 张生成图片追加到图片处理。`, "success");
  } catch (error) {
    setStatus(`加入图片处理失败：${error.message}`, "error");
  }
}

function openAiDeleteDialog(recordIds) {
  state.aiCreation.deleteIds = Array.from(new Set(recordIds)).filter((id) => aiRecordById(id));
  if (!state.aiCreation.deleteIds.length) return;
  els.aiDeleteSummary.textContent = `将删除 ${state.aiCreation.deleteIds.length} 条生成历史。`;
  hideAiDeleteFileConfirmation();
  els.aiDeleteDialog.hidden = false;
  document.body.classList.add("modal-open");
}

function closeAiDeleteDialog() {
  els.aiDeleteDialog.hidden = true;
  state.aiCreation.deleteIds = [];
  document.body.classList.remove("modal-open");
}

function showAiDeleteFileConfirmation() {
  els.aiDeleteInitialActions.hidden = true;
  els.aiDeleteConfirmFiles.hidden = false;
}

function hideAiDeleteFileConfirmation() {
  els.aiDeleteInitialActions.hidden = false;
  els.aiDeleteConfirmFiles.hidden = true;
}

async function deleteAiHistoryRecords(deleteFiles) {
  const ids = [...state.aiCreation.deleteIds];
  const button = deleteFiles ? els.aiDeleteConfirmFilesButton : els.aiDeleteRecordOnlyButton;
  await withBusy(button, async () => {
    try {
      const data = await apiJson("/api/v1/generation/history/delete", {
        method: "POST",
        body: { project_id: activeProjectId(), ids, delete_files: deleteFiles },
      });
      const deletedIds = new Set(data.result?.deleted_ids || ids);
      state.aiCreation.history = state.aiCreation.history.filter((record) => !deletedIds.has(record.id));
      deletedIds.forEach((id) => {
        state.aiCreation.selectedIds.delete(id);
        stopAiPollingRecord(id);
      });
      closeAiDeleteDialog();
      renderAiCreation();
      setStatus(deleteFiles ? "历史记录和本地文件已删除。" : "历史记录已删除，本地文件已保留。", "success");
    } catch (error) {
      setStatus(`删除生成历史失败：${error.message}`, "error");
    }
  });
}

function runtimeCheckReady(runtime, key) {
  return Boolean(runtime?.checks?.[key]?.ready);
}

function summarizeRuntimeReadiness(runtime) {
  const missing = [];
  if (!runtimeCheckReady(runtime, "basic")) {
    missing.push("ffmpeg/ffprobe");
  }
  if (!runtimeCheckReady(runtime, "ai_dependencies")) {
    missing.push("AI \u4F9D\u8D56");
  } else if (!runtime?.checks?.default_birefnet_model?.ready) {
    missing.push("\u9ED8\u8BA4 BiRefNet \u6A21\u578B");
  }
  if (!runtimeCheckReady(runtime, "corridorkey")) {
    missing.push("CorridorKey");
  }
  if (!runtimeCheckReady(runtime, "realesrgan")) {
    missing.push("Real-ESRGAN");
  }
  return missing;
}

async function checkRuntimeReadiness({ promptDownload = true } = {}) {
  try {
    const data = await apiJson(`/api/runtime-info?ts=${Date.now()}`);
    const runtime = data.runtime || {};
    const missing = summarizeRuntimeReadiness(runtime);
    if (!missing.length) {
      setStatus("\u8FD0\u884C\u65F6\u68C0\u67E5\u901A\u8FC7\uFF1A\u57FA\u7840\u5DE5\u5177\u3001AI \u6A21\u578B\u548C\u6269\u5C55\u5904\u7406\u80FD\u529B\u5DF2\u5C31\u7EEA\u3002", "success");
      return runtime;
    }

    const tone = runtimeCheckReady(runtime, "basic") ? "warning" : "error";
    const setupScript = runtime?.actions?.setup_script || "setup_ai_runtime.bat";
    setStatus(`\u8FD0\u884C\u65F6\u68C0\u67E5\uFF1A${missing.join("\u3001")}\u672A\u5C31\u7EEA\u3002\u53EF\u8FD0\u884C ${setupScript} \u6216\u6309\u63D0\u793A\u4E0B\u8F7D\u3002`, tone);

    const shouldPromptModel =
      promptDownload &&
      runtime?.actions?.download_default_birefnet &&
      !runtime?.checks?.default_birefnet_model?.ready &&
      !window.localStorage.getItem(RUNTIME_MODEL_PROMPT_KEY);
    if (shouldPromptModel) {
      window.localStorage.setItem(RUNTIME_MODEL_PROMPT_KEY, String(Date.now()));
      const confirmed = window.confirm("\u68C0\u6D4B\u5230\u9ED8\u8BA4 BiRefNet \u6A21\u578B\u8FD8\u6CA1\u6709\u7F13\u5B58\u3002\u662F\u5426\u73B0\u5728\u4E0B\u8F7D\uFF1F\u53D6\u6D88\u540E\u57FA\u7840\u529F\u80FD\u4ECD\u53EF\u4F7F\u7528\uFF0CAI \u62A0\u56FE\u9996\u6B21\u4F7F\u7528\u65F6\u4E5F\u4F1A\u5C1D\u8BD5\u4E0B\u8F7D\u3002");
      if (confirmed) {
        await downloadDefaultBirefnetModel();
      }
    }
    return runtime;
  } catch (error) {
    setStatus(`\u8FD0\u884C\u65F6\u68C0\u67E5\u5931\u8D25\uFF1A${error.message || String(error)}`, "error");
    return null;
  }
}

async function downloadDefaultBirefnetModel() {
  const modelKey = "birefnet-hr-matting";
  setStatus("\u6B63\u5728\u4E0B\u8F7D\u9ED8\u8BA4 BiRefNet \u6A21\u578B\uFF0C\u8FD9\u53EF\u80FD\u9700\u8981\u51E0\u5206\u949F...");
  try {
    const data = await apiJson("/api/model-download-start", {
      method: "POST",
      body: { key: modelKey },
    });
    state.modelManager.progressByKey[modelKey] = data.progress || {
      id: data.progress_id,
      current: 0,
      total: 100,
      phase: "queued",
      detail: "\u7B49\u5F85\u4E0B\u8F7D\u4EFB\u52A1\u542F\u52A8",
      done: false,
      error: "",
    };
    pollModelDownloadProgress(modelKey, data.progress_id);
  } catch (error) {
    setStatus(`\u9ED8\u8BA4 BiRefNet \u6A21\u578B\u4E0B\u8F7D\u5931\u8D25\uFF1A${error.message || String(error)}`, "error");
  }
}

async function openPath(path) {
  try {
    await apiJson("/api/open-path", {
      method: "POST",
      body: { path },
    });
  } catch (error) {
    setStatus(`\u6253\u5f00\u76ee\u5f55\u5931\u8d25\uff1a${error.message}`, "error");
  }
}

async function apiJson(url, options = {}) {
  const fetchOptions = { ...options };
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.headers = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers || {}),
    };
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    throw new Error(`\u8BF7\u6C42\u5931\u8D25\uFF1A${error.message || String(error)}\u3002\u8BF7\u786E\u8BA4 ${PRODUCT_TITLE} \u540E\u7AEF\u6B63\u5728\u8FD0\u884C\uFF0C\u5E76\u5DF2\u91CD\u542F\u5230\u6700\u65B0\u7248\u672C\u3002`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(`\u63A5\u53E3\u672A\u8FD4\u56DE JSON\uFF08HTTP ${response.status}\uFF09\u3002\u8BF7\u91CD\u542F ${PRODUCT_TITLE} \u540E\u7AEF\u540E\u518D\u8BD5\u3002${detail ? ` ${detail}` : ""}`);
  }

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

async function withBusy(button, task) {
  button.disabled = true;
  try {
    await task();
  } catch (error) {
    setStatus(error.message || String(error), "error");
  } finally {
    button.disabled = false;
  }
}

function setStatus(message, tone = "") {
  els.appStatus.textContent = message;
  els.appStatus.className = `status-message${tone ? ` ${tone}` : ""}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function looksLikeBrokenText(value) {
  const text = String(value || "");
  if (!text) {
    return false;
  }
  return /�|<\/?span|閻|闂|绋|鍛|櫠|灚|熸|粎|澧|幐/.test(text);
}

function displayFrameName(frame, frameNumber = "") {
  const raw = String(frame?.original_name || frame?.name || "").trim();
  if (!raw || looksLikeBrokenText(raw)) {
    return frameNumber ? `第 ${frameNumber} 帧` : "当前帧";
  }
  return raw;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(value) {
  return `${Number(value || 0).toFixed(2)}s`;
}
