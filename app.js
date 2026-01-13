// 全局状态
const state = {
    videoFile: null,
    frames: [], // 存储4帧的数据
    currentFrameIndex: 0, // 当前正在标注的帧索引
    annotations: [], // 每帧的标注数据 [{floor, obstacle, background}, ...]
    currentAnnotationType: null,
    isDrawing: false,
    startPoint: null,
    results: null,
    boxWidth: 25, // 预设标注框宽度
    boxHeight: 25, // 预设标注框高度
    previewBox: null // 鼠标悬停时的预览框
};

// DOM 元素
const elements = {
    videoInput: document.getElementById('video-input'),
    videoPlayer: document.getElementById('video-player'),
    btnCaptureFrame: document.getElementById('btn-capture-frame'),
    btnStartAnnotation: document.getElementById('btn-start-annotation'),
    frameCount: document.getElementById('frame-count'),
    frameCountDisplay: document.getElementById('frame-count-display'),
    framesPreview: document.getElementById('frames-preview'),
    framesGrid: document.getElementById('frames-grid'),
    btnFloor: document.getElementById('btn-floor'),
    btnObstacle: document.getElementById('btn-obstacle'),
    btnBackground: document.getElementById('btn-background'),
    btnClear: document.getElementById('btn-clear'),
    btnPrevFrame: document.getElementById('btn-prev-frame'),
    btnNextFrame: document.getElementById('btn-next-frame'),
    btnStartAnalysis: document.getElementById('btn-start-analysis'),
    btnRestart: document.getElementById('btn-restart'),
    currentFrameNumber: document.getElementById('current-frame-number'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    boxWidth: document.getElementById('box-width'),
    boxHeight: document.getElementById('box-height'),
    boxWidthDisplay: document.getElementById('box-width-display'),
    boxHeightDisplay: document.getElementById('box-height-display'),
    sections: {
        upload: document.getElementById('upload-section'),
        select: document.getElementById('select-section'),
        annotation: document.getElementById('annotation-section'),
        analysis: document.getElementById('analysis-section'),
        result: document.getElementById('result-section')
    }
};

// 初始化
function init() {
    setupEventListeners();
}

// 设置事件监听器
function setupEventListeners() {
    // 视频上传
    elements.videoInput.addEventListener('change', handleVideoUpload);

    // 捕获帧
    elements.btnCaptureFrame.addEventListener('click', captureCurrentFrame);

    // 开始标注
    elements.btnStartAnnotation.addEventListener('click', startAnnotation);

    // 标注按钮
    elements.btnFloor.addEventListener('click', () => setAnnotationType('floor'));
    elements.btnObstacle.addEventListener('click', () => setAnnotationType('obstacle'));
    elements.btnBackground.addEventListener('click', () => setAnnotationType('background'));
    elements.btnClear.addEventListener('click', clearCurrentFrameAnnotations);

    // 帧导航
    elements.btnPrevFrame.addEventListener('click', () => switchFrame(state.currentFrameIndex - 1));
    elements.btnNextFrame.addEventListener('click', () => switchFrame(state.currentFrameIndex + 1));

    // 分析按钮
    elements.btnStartAnalysis.addEventListener('click', startAnalysis);

    // 重新开始
    elements.btnRestart.addEventListener('click', restart);

    // 标注框大小调节
    elements.boxWidth.addEventListener('input', (e) => {
        state.boxWidth = parseInt(e.target.value);
        elements.boxWidthDisplay.textContent = state.boxWidth;
    });

    elements.boxHeight.addEventListener('input', (e) => {
        state.boxHeight = parseInt(e.target.value);
        elements.boxHeightDisplay.textContent = state.boxHeight;
    });

    // 滚动监听 - 为标注按钮栏添加滚动效果
    setupScrollListener();
}

// 设置滚动监听器
function setupScrollListener() {
    window.addEventListener('scroll', () => {
        const controls = document.querySelector('.annotation-controls');
        if (controls && elements.sections.annotation.classList.contains('active')) {
            // 当滚动超过50px时添加scrolled类，增强视觉效果
            if (window.scrollY > 50) {
                controls.classList.add('scrolled');
            } else {
                controls.classList.remove('scrolled');
            }
        }
    });
}

// 处理视频上传
function handleVideoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    state.videoFile = file;
    const url = URL.createObjectURL(file);

    elements.videoPlayer.src = url;
    elements.videoPlayer.load();

    // 重置状态
    state.frames = [];
    state.annotations = [];
    updateFrameCount();
    updateFramesPreview();

    // 切换到选帧界面
    showSection('select');
}

// 捕获当前帧
function captureCurrentFrame() {
    if (state.frames.length >= 4) {
        alert('已经选择了4帧，如需重新选择请先删除已有的帧');
        return;
    }

    const video = elements.videoPlayer;

    // 自动暂停视频
    if (!video.paused && !video.ended) {
        video.pause();
    }

    // 创建 canvas 捕获当前帧
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 保存帧数据
    state.frames.push({
        index: state.frames.length,
        time: video.currentTime,
        imageData: imageData
    });

    // 初始化该帧的标注数据
    state.annotations.push({
        floor: null,
        obstacle: null,
        background: null
    });

    // 更新UI
    updateFrameCount();
    updateFramesPreview();

    // 如果已选择4帧，启用开始标注按钮
    if (state.frames.length === 4) {
        elements.btnStartAnnotation.disabled = false;
    }
}

// 更新帧计数
function updateFrameCount() {
    const count = state.frames.length;
    elements.frameCount.textContent = count;
    elements.frameCountDisplay.textContent = count;
    elements.btnCaptureFrame.disabled = count >= 4;
}

// 更新帧预览
function updateFramesPreview() {
    if (state.frames.length === 0) {
        elements.framesPreview.innerHTML = '<p class="empty-hint">还未选择任何帧</p>';
        return;
    }

    elements.framesPreview.innerHTML = '';

    state.frames.forEach((frame, index) => {
        const item = document.createElement('div');
        item.className = 'frame-preview-item';

        // 创建预览 canvas
        const canvas = document.createElement('canvas');
        canvas.width = frame.imageData.width;
        canvas.height = frame.imageData.height;

        const ctx = canvas.getContext('2d');
        ctx.putImageData(frame.imageData, 0, 0);

        // 创建信息栏
        const info = document.createElement('div');
        info.className = 'frame-preview-info';
        info.textContent = `帧 ${index + 1} - ${formatTime(frame.time)}`;

        // 创建删除按钮
        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn-remove';
        btnRemove.textContent = '×';
        btnRemove.title = '删除此帧';
        btnRemove.addEventListener('click', () => removeFrame(index));

        item.appendChild(canvas);
        item.appendChild(info);
        item.appendChild(btnRemove);

        elements.framesPreview.appendChild(item);
    });
}

// 删除帧
function removeFrame(index) {
    state.frames.splice(index, 1);
    state.annotations.splice(index, 1);

    // 重新索引
    state.frames.forEach((frame, i) => {
        frame.index = i;
    });

    // 更新UI
    updateFrameCount();
    updateFramesPreview();

    // 更新按钮状态
    elements.btnStartAnnotation.disabled = state.frames.length < 4;
}

// 开始标注
function startAnnotation() {
    if (state.frames.length < 4) {
        alert('请先选择4帧');
        return;
    }

    // 切换到标注界面
    showSection('annotation');

    // 显示4帧
    displayFrames();
}

// 格式化时间显示
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

// 显示4帧
function displayFrames() {
    elements.framesGrid.innerHTML = '';

    state.frames.forEach((frame, index) => {
        const frameItem = document.createElement('div');
        frameItem.className = 'frame-item';
        if (index === 0) frameItem.classList.add('active');
        frameItem.dataset.index = index;

        // 创建显示canvas
        const displayCanvas = document.createElement('canvas');
        displayCanvas.width = frame.imageData.width;
        displayCanvas.height = frame.imageData.height;
        displayCanvas.className = 'frame-display';

        const ctx = displayCanvas.getContext('2d');
        ctx.putImageData(frame.imageData, 0, 0);

        // 创建覆盖层canvas（用于标注）
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = frame.imageData.width;
        overlayCanvas.height = frame.imageData.height;
        overlayCanvas.className = 'frame-overlay';
        overlayCanvas.dataset.index = index;

        // 添加标签
        const label = document.createElement('div');
        label.className = 'frame-label';
        label.textContent = `帧 ${index + 1}`;

        frameItem.appendChild(displayCanvas);
        frameItem.appendChild(overlayCanvas);
        frameItem.appendChild(label);

        // 点击切换到该帧
        frameItem.addEventListener('click', () => switchFrame(index));

        // 添加点击式标注事件
        overlayCanvas.addEventListener('click', handleClick);
        overlayCanvas.addEventListener('mousemove', handleMouseMove);
        overlayCanvas.addEventListener('mouseleave', handleMouseLeave);

        elements.framesGrid.appendChild(frameItem);
    });

    // 初始化第一帧
    state.currentFrameIndex = 0;
    updateCurrentFrameUI();
}

// 切换界面
function showSection(sectionName) {
    Object.values(elements.sections).forEach(section => {
        section.classList.remove('active');
    });
    elements.sections[sectionName].classList.add('active');
}

// 切换帧
function switchFrame(index) {
    if (index < 0 || index >= 4) return;

    state.currentFrameIndex = index;

    // 更新UI
    updateCurrentFrameUI();
}

// 更新当前帧UI
function updateCurrentFrameUI() {
    // 更新帧选中状态
    document.querySelectorAll('.frame-item').forEach((item, index) => {
        if (index === state.currentFrameIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 更新当前帧号
    elements.currentFrameNumber.textContent = state.currentFrameIndex + 1;

    // 更新标注状态
    updateAnnotationStatus();

    // 重绘当前帧的标注
    drawCurrentFrameAnnotations();

    // 更新导航按钮状态
    elements.btnPrevFrame.disabled = state.currentFrameIndex === 0;
    elements.btnNextFrame.disabled = state.currentFrameIndex === 3;

    // 检查是否所有帧都标注完成
    checkAllAnnotationsComplete();
}

// 设置标注类型
function setAnnotationType(type) {
    state.currentAnnotationType = type;

    // 更新按钮状态
    [elements.btnFloor, elements.btnObstacle, elements.btnBackground].forEach(btn => {
        btn.classList.remove('active');
    });

    if (type === 'floor') elements.btnFloor.classList.add('active');
    if (type === 'obstacle') elements.btnObstacle.classList.add('active');
    if (type === 'background') elements.btnBackground.classList.add('active');

    // 重置标注框大小为默认值
    state.boxWidth = 25;
    state.boxHeight = 25;
    elements.boxWidth.value = 25;
    elements.boxHeight.value = 25;
    elements.boxWidthDisplay.textContent = '25';
    elements.boxHeightDisplay.textContent = '25';

    // 启用当前帧的绘制
    const currentOverlay = document.querySelector(`.frame-overlay[data-index="${state.currentFrameIndex}"]`);
    if (currentOverlay) {
        currentOverlay.classList.add('drawing');
    }
}

// 清除当前帧的标注
function clearCurrentFrameAnnotations() {
    state.annotations[state.currentFrameIndex] = {
        floor: null,
        obstacle: null,
        background: null
    };

    drawCurrentFrameAnnotations();
    updateAnnotationStatus();
    checkAllAnnotationsComplete();
}

// 更新标注状态显示
function updateAnnotationStatus() {
    const currentAnnotation = state.annotations[state.currentFrameIndex];

    document.getElementById('floor-status').textContent =
        currentAnnotation.floor ? '✅ 已标注' : '未标注';
    document.getElementById('obstacle-status').textContent =
        currentAnnotation.obstacle ? '✅ 已标注' : '未标注';
    document.getElementById('background-status').textContent =
        currentAnnotation.background ? '✅ 已标注' : '未标注';

    // 更新每帧的完成状态
    state.annotations.forEach((annotation, index) => {
        const isComplete = annotation.floor && annotation.obstacle && annotation.background;
        const progressEl = document.getElementById(`frame-${index}-progress`);
        const frameProgressEl = progressEl.parentElement;

        if (isComplete) {
            progressEl.textContent = '✅ 已完成';
            frameProgressEl.classList.add('complete');
        } else {
            progressEl.textContent = '未完成';
            frameProgressEl.classList.remove('complete');
        }
    });
}

// 检查是否所有帧都标注完成
function checkAllAnnotationsComplete() {
    const allComplete = state.annotations.every(annotation =>
        annotation.floor && annotation.obstacle && annotation.background
    );

    elements.btnStartAnalysis.disabled = !allComplete;
}

// 鼠标事件处理 - 点击式标注
function handleMouseDown(e) {
    // 不再使用拖动方式
}

function handleMouseMove(e) {
    if (!state.currentAnnotationType) return;

    const canvas = e.target;
    const frameIndex = parseInt(canvas.dataset.index);

    // 只在当前帧显示预览
    if (frameIndex !== state.currentFrameIndex) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 计算鼠标位置（Canvas坐标）
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // 保存预览框信息
    state.previewBox = {
        centerX: mouseX,
        centerY: mouseY,
        width: state.boxWidth,
        height: state.boxHeight
    };

    // 重绘当前帧（包含预览框）
    drawCurrentFrameAnnotations();
}

function handleMouseUp(e) {
    // 不再使用拖动方式
}

// 点击事件处理 - 在点击位置创建标注框
function handleClick(e) {
    if (!state.currentAnnotationType) return;

    const canvas = e.target;
    const frameIndex = parseInt(canvas.dataset.index);

    // 只能在当前选中的帧上标注
    if (frameIndex !== state.currentFrameIndex) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 计算点击位置（Canvas坐标）
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 计算标注框位置（以点击位置为中心）
    const annotation = {
        x: Math.max(0, clickX - state.boxWidth / 2),
        y: Math.max(0, clickY - state.boxHeight / 2),
        width: state.boxWidth,
        height: state.boxHeight
    };

    // 确保标注框不超出画布边界
    if (annotation.x + annotation.width > canvas.width) {
        annotation.x = canvas.width - annotation.width;
    }
    if (annotation.y + annotation.height > canvas.height) {
        annotation.y = canvas.height - annotation.height;
    }

    console.log(`🖱️ 点击位置: (${Math.round(clickX)}, ${Math.round(clickY)})`);
    console.log(`📦 标注框: x=${Math.round(annotation.x)}, y=${Math.round(annotation.y)}, w=${annotation.width}, h=${annotation.height}`);

    // 保存标注
    state.annotations[state.currentFrameIndex][state.currentAnnotationType] = annotation;
    console.log(`✅ 保存标注 [${state.currentAnnotationType}]: ${annotation.width}x${annotation.height} 像素`);

    // 取消按钮激活状态
    [elements.btnFloor, elements.btnObstacle, elements.btnBackground].forEach(btn => {
        btn.classList.remove('active');
    });
    canvas.classList.remove('drawing');
    state.currentAnnotationType = null;
    state.previewBox = null;

    // 重绘所有标注
    drawCurrentFrameAnnotations();

    // 更新状态显示
    updateAnnotationStatus();
    checkAllAnnotationsComplete();
}

// 鼠标离开Canvas时清除预览
function handleMouseLeave(e) {
    state.previewBox = null;
    drawCurrentFrameAnnotations();
}

// 绘制当前帧的标注
function drawCurrentFrameAnnotations() {
    const overlayCanvas = document.querySelector(`.frame-overlay[data-index="${state.currentFrameIndex}"]`);
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    const annotation = state.annotations[state.currentFrameIndex];

    // 绘制已保存的标注
    if (annotation.floor) {
        drawRect(ctx, annotation.floor, null, 'floor', false);
    }
    if (annotation.obstacle) {
        drawRect(ctx, annotation.obstacle, null, 'obstacle', false);
    }
    if (annotation.background) {
        drawRect(ctx, annotation.background, null, 'background', false);
    }

    // 绘制预览框（鼠标悬停时）
    if (state.previewBox && state.currentAnnotationType) {
        const previewAnnotation = {
            x: state.previewBox.centerX - state.previewBox.width / 2,
            y: state.previewBox.centerY - state.previewBox.height / 2,
            width: state.previewBox.width,
            height: state.previewBox.height
        };
        drawRect(ctx, previewAnnotation, null, state.currentAnnotationType, true);
    }
}

// 绘制所有帧的标注
function drawAllFrameAnnotations() {
    state.frames.forEach((frame, index) => {
        const overlayCanvas = document.querySelector(`.frame-overlay[data-index="${index}"]`);
        if (!overlayCanvas) return;

        const ctx = overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        const annotation = state.annotations[index];

        if (annotation.floor) {
            drawRect(ctx, annotation.floor, null, 'floor', false);
        }
        if (annotation.obstacle) {
            drawRect(ctx, annotation.obstacle, null, 'obstacle', false);
        }
        if (annotation.background) {
            drawRect(ctx, annotation.background, null, 'background', false);
        }
    });
}

// 绘制矩形
function drawRect(ctx, start, end, type, isTemp) {
    const colors = {
        floor: '#10b981',
        obstacle: '#f59e0b',
        background: '#3b82f6'
    };

    const labels = {
        floor: '地板',
        obstacle: '障碍',
        background: '背景'
    };

    let x, y, width, height;

    if (end) {
        // 绘制临时矩形（拖动中）
        x = Math.min(start.x, end.x);
        y = Math.min(start.y, end.y);
        width = Math.abs(end.x - start.x);
        height = Math.abs(end.y - start.y);
    } else {
        // 绘制已保存的矩形
        x = start.x;
        y = start.y;
        width = start.width;
        height = start.height;
    }

    ctx.strokeStyle = colors[type];
    ctx.lineWidth = 3;
    ctx.setLineDash(isTemp ? [5, 5] : []);
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = colors[type] + '33';
    ctx.fillRect(x, y, width, height);

    // 绘制标签
    ctx.fillStyle = colors[type];
    ctx.font = 'bold 20px Arial';
    ctx.fillText(labels[type], x + 5, y + 25);
}

// 开始分析
async function startAnalysis() {
    showSection('analysis');

    try {
        // 分析4帧
        await analyzeFrames();

        // 显示结果
        showResults();

    } catch (error) {
        console.error('分析错误:', error);
        alert('分析过程中出现错误: ' + error.message);
    }
}

// 分析4帧
async function analyzeFrames() {
    const results = [];

    updateProgress(0, '开始分析...');

    for (let i = 0; i < state.frames.length; i++) {
        const frame = state.frames[i];
        const annotation = state.annotations[i];

        console.log(`\n=== 分析第 ${i + 1} 帧 ===`);
        console.log('标注数据:', annotation);

        // 计算每个区域的明度
        console.log('计算地板明度...');
        const floorValue = calculateRegionBrightness(frame.imageData, annotation.floor);
        console.log('计算障碍明度...');
        const obstacleValue = calculateRegionBrightness(frame.imageData, annotation.obstacle);
        console.log('计算背景明度...');
        const backgroundValue = calculateRegionBrightness(frame.imageData, annotation.background);

        console.log(`明度值: 地板=${floorValue.toFixed(2)}, 障碍=${obstacleValue.toFixed(2)}, 背景=${backgroundValue.toFixed(2)}`);

        // 计算明度差
        const obstacleFlorDiff = Math.abs(obstacleValue - floorValue) / 255 * 100;
        const floorBackgroundDiff = Math.abs(floorValue - backgroundValue) / 255 * 100;

        console.log(`明度差: 障碍↔地板=${obstacleFlorDiff.toFixed(2)}%, 地板↔背景=${floorBackgroundDiff.toFixed(2)}%`);

        // 判定是否合格（增加1%容差）
        // 障碍↔地板：要求≥10%，容差后≥9%即可
        // 地板↔背景：要求≥20%，容差后≥19%即可
        const obstacleFloorPass = obstacleFlorDiff >= 9;
        const floorBackgroundPass = floorBackgroundDiff >= 19;

        results.push({
            frameIndex: i,
            time: frame.time,
            floorValue,
            obstacleValue,
            backgroundValue,
            obstacleFlorDiff,
            floorBackgroundDiff,
            obstacleFloorPass,
            floorBackgroundPass,
            overallPass: obstacleFloorPass && floorBackgroundPass
        });

        updateProgress((i + 1) / state.frames.length * 100,
            `分析中 ${i + 1}/${state.frames.length} 帧`);

        // 添加小延迟以显示进度
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    state.results = results;
}

// 更新进度
function updateProgress(percent, text) {
    elements.progressFill.style.width = percent + '%';
    elements.progressText.textContent = text;
}

// 计算区域明度
function calculateRegionBrightness(imageData, region) {
    console.log('区域数据:', JSON.stringify(region));
    console.log('图像尺寸:', imageData.width, 'x', imageData.height);

    // 检查区域是否有效
    if (!region) {
        console.error('区域为 null 或 undefined');
        return 0;
    }

    if (region.width === 0 || region.height === 0) {
        console.error('区域宽度或高度为0:', region);
        return 0;
    }

    const values = [];

    const startX = Math.floor(region.x);
    const startY = Math.floor(region.y);
    const endX = Math.floor(region.x + region.width);
    const endY = Math.floor(region.y + region.height);

    console.log(`区域范围: x[${startX}, ${endX}], y[${startY}, ${endY}]`);

    // 边界检查
    if (startX < 0 || startY < 0 || endX > imageData.width || endY > imageData.height) {
        console.error('区域超出图像边界!');
    }

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const index = (y * imageData.width + x) * 4;
            const r = imageData.data[index];
            const g = imageData.data[index + 1];
            const b = imageData.data[index + 2];

            // 使用感知亮度公式
            const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            values.push(value);
        }
    }

    const medianValue = median(values);
    console.log(`区域明度计算: 像素数=${values.length}, 中位数=${medianValue.toFixed(2)}`);

    // 返回中位数
    return medianValue;
}

// 计算中位数
function median(values) {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        return sorted[mid];
    }
}

// 显示结果
function showResults() {
    showSection('result');

    // 找出最差帧（明度差最小的帧）
    let worstFrame = state.results[0];
    let worstScore = Math.min(worstFrame.obstacleFlorDiff, worstFrame.floorBackgroundDiff);

    for (const result of state.results) {
        const score = Math.min(result.obstacleFlorDiff, result.floorBackgroundDiff);
        if (score < worstScore) {
            worstScore = score;
            worstFrame = result;
        }
    }

    // 计算平均值（用于显示）
    const avgFloor = average(state.results.map(r => r.floorValue));
    const avgObstacle = average(state.results.map(r => r.obstacleValue));
    const avgBackground = average(state.results.map(r => r.backgroundValue));

    // 使用最差帧的数据
    const obstacleFloorDiff = worstFrame.obstacleFlorDiff;
    const floorBackgroundDiff = worstFrame.floorBackgroundDiff;
    const obstacleFloorPass = worstFrame.obstacleFloorPass;
    const floorBackgroundPass = worstFrame.floorBackgroundPass;
    const overallPass = worstFrame.overallPass;

    // 更新总体状态
    const overallStatusEl = document.getElementById('overall-status');
    overallStatusEl.textContent = overallPass ? '✅ 合格' : '❌ 不合格';
    overallStatusEl.className = 'status-badge ' + (overallPass ? 'pass' : 'fail');

    // 更新明度值
    document.getElementById('floor-value').textContent = avgFloor.toFixed(2);
    document.getElementById('obstacle-value').textContent = avgObstacle.toFixed(2);
    document.getElementById('background-value').textContent = avgBackground.toFixed(2);

    // 更新明度差
    document.getElementById('obstacle-floor-diff').textContent = obstacleFloorDiff.toFixed(2) + '%';
    document.getElementById('obstacle-floor-status').innerHTML =
        obstacleFloorPass ? '<span class="status-pass">✅ 合格 (≥9%, 含1%容差)</span>' :
                           '<span class="status-fail">❌ 不合格 (<9%)</span>';

    document.getElementById('floor-background-diff').textContent = floorBackgroundDiff.toFixed(2) + '%';
    document.getElementById('floor-background-status').innerHTML =
        floorBackgroundPass ? '<span class="status-pass">✅ 合格 (≥19%, 含1%容差)</span>' :
                             '<span class="status-fail">❌ 不合格 (<19%)</span>';

    // 填充所有帧结果表格
    const tbody = document.getElementById('frames-results-tbody');
    tbody.innerHTML = '';

    state.results.forEach((result, index) => {
        const row = document.createElement('tr');

        // 标记最差帧
        if (result === worstFrame) {
            row.className = 'frame-worst';
        }

        const isPass = result.overallPass;
        const statusText = isPass ? '✅ 合格' : '❌ 不合格';
        const statusClass = isPass ? 'status-pass' : 'status-fail';

        row.innerHTML = `
            <td>第 ${result.frameIndex + 1} 帧</td>
            <td>${formatTime(result.time)}</td>
            <td>${result.floorValue.toFixed(2)}</td>
            <td>${result.obstacleValue.toFixed(2)}</td>
            <td>${result.backgroundValue.toFixed(2)}</td>
            <td>${result.obstacleFlorDiff.toFixed(2)}%</td>
            <td>${result.floorBackgroundDiff.toFixed(2)}%</td>
            <td class="${statusClass}">${statusText}</td>
        `;

        tbody.appendChild(row);
    });

    // 显示最差帧
    const worstFrameData = state.frames[worstFrame.frameIndex];
    const worstAnnotation = state.annotations[worstFrame.frameIndex];

    document.getElementById('worst-timestamp').textContent =
        formatTime(worstFrame.time) + ` (第 ${worstFrame.frameIndex + 1} 帧)`;

    // 绘制最差帧的可视化
    drawWorstFrame(worstFrameData.imageData, worstAnnotation);
}

// 绘制最差帧可视化
function drawWorstFrame(imageData, annotation) {
    const canvas = document.getElementById('worst-frame-canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');

    // 创建灰度图像
    const grayImageData = ctx.createImageData(imageData.width, imageData.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        // 使用感知亮度公式
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        grayImageData.data[i] = gray;
        grayImageData.data[i + 1] = gray;
        grayImageData.data[i + 2] = gray;
        grayImageData.data[i + 3] = 255;
    }

    ctx.putImageData(grayImageData, 0, 0);

    // 绘制标注区域
    if (annotation.floor) drawRect(ctx, annotation.floor, null, 'floor', false);
    if (annotation.obstacle) drawRect(ctx, annotation.obstacle, null, 'obstacle', false);
    if (annotation.background) drawRect(ctx, annotation.background, null, 'background', false);

    // 调整显示尺寸
    const maxWidth = 800;
    if (canvas.width > maxWidth) {
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (canvas.height * maxWidth / canvas.width) + 'px';
    }
}

// 计算平均值
function average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// 格式化时间
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
}

// 重新开始
function restart() {
    // 只重置标注和结果相关的状态，保留视频和已选择的帧
    state.currentFrameIndex = 0;
    state.annotations = [];
    state.currentAnnotationType = null;
    state.isDrawing = false;
    state.startPoint = null;
    state.results = null;
    state.previewBox = null;

    // 重新初始化标注数据（保留帧数据）
    state.frames.forEach(() => {
        state.annotations.push({
            floor: null,
            obstacle: null,
            background: null
        });
    });

    // 清空帧网格
    elements.framesGrid.innerHTML = '';

    // 重置进度
    updateProgress(0, '准备中...');

    // 如果有4帧，直接回到选帧界面；否则回到上传界面
    if (state.frames.length === 4) {
        // 返回选帧界面，可以重新选择帧
        showSection('select');
        // 更新帧预览
        updateFramesPreview();
        // 启用开始标注按钮
        elements.btnStartAnnotation.disabled = false;
    } else {
        // 完全重置
        state.videoFile = null;
        state.frames = [];
        elements.videoInput.value = '';
        updateFrameCount();
        updateFramesPreview();
        showSection('upload');
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);

