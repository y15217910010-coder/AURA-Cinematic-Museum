/**
 * AURA | Cinematic Emotion Museum 
 * 完整整合版 - 严格校对函数定义顺序
 */

// --- 1. 全局变量 ---
let myRadarChart = null;
let myGlobalChart = null;
let myCosmosChart = null;
let allMovies = [];
let currentQ = 0;
let userProfile = { joy: 0.5, sadness: 0.5, fear: 0.5, surprise: 0.5, anger: 0.5 };
let finalMovieResult = null;
let curatorTimer = null; 
let myCellsChart = null; // 新增这一行
let cachedCosmosData = null; // 全局缓存
let globeInitialized = false;

// main.js 顶部
const GENRE_COLORS = {
    "Drama": "#3498db", "Action": "#f1c40f", "Comedy": "#2ecc71",
    "Sci-Fi": "#9b59b6", "Horror": "#e74c3c", "Thriller": "#1abc9c",
    "Animation": "#e67e22", "Romance": "#fd79a8", "Crime": "#636e72",
    "Adventure": "#e67e22", "Fantasy": "#fd79a8", "Mystery": "#9b59b6"
};

const EMO_COLORS = {
    "JOY": "#f1c40f", "SADNESS": "#3498db", "FEAR": "#8e44ad", 
    "ANGER": "#c0392b", "SURPRISE": "#16a085", "UNKNOWN": "#555"
};

// 艺术馆风格配色方案
const ART_PIGMENTS = {
    "Drama": "#5d8aa8", "Action": "#e34234", "Comedy": "#ffbf00",
    "Sci-Fi": "#9966cc", "Horror": "#3b3b3b", "Thriller": "#006666",
    "Animation": "#ff7e00", "Romance": "#f4c2c2", "Crime": "#4b3621",
    "Adventure": "#708238", "Fantasy": "#ff00af", "Mystery": "#4a0404"
};

const EMOTION_PIGMENTS = {
    "JOY": "#fbc02d", "SADNESS": "#1976d2", "FEAR": "#7b1fa2", 
    "ANGER": "#d32f2f", "SURPRISE": "#00897b", "UNKNOWN": "#9e9e9e"
};

const COSMOS_LAYOUT = {
    unit: { left: '3%', width: '8%' },      // 俄罗斯方块区
    top3: { left: '13%', width: '18%' },    // 年度文字区
    matrix: { left: '33%', width: '52%' },  // 核心气泡区
    volume: { left: '88%', width: '9%' }    // 产量折线区
};

const L_START = {
    units: 3,    // GENRE UNITS 起始百分比
    master: 15,  // ANNUAL MASTERPIECES 起始百分比
    matrix: 33,  // CINEMATIC CHRONICLE MATRIX 起始百分比
    volume: 90   // VOLUME 起始百分比
};

// --- 2. 页面加载初始化 ---
// --- 筛选器初始化与逻辑 ---

// 1. 页面加载时执行
window.onload = () => {
    // 1. 获取电影数据并初始化列表和 3D 球
    fetch('/api/movies')
        .then(res => res.json())
        .then(data => {
            allMovies = data;
            renderMovieList(allMovies);
            if (allMovies.length > 0 && !globeInitialized) {
                console.log("Data loaded, initializing DNA Helix...");
                initMovieGlobe(allMovies);
                globeInitialized = true;
            }
        });

    // 2. 【关键修复】：初始化流派下拉框 (之前这部分丢了)
    fetch('/api/genres')
        .then(res => res.json())
        .then(genres => {
            const s = document.getElementById('genreFilter');
            if(s) {
                s.innerHTML = '<option value="All">All Genres</option>';
                genres.sort().forEach(g => {
                    const o = document.createElement('option'); 
                    o.value = g; 
                    o.innerText = g; 
                    s.appendChild(o);
                });
            }
        });

    // 3. 初始化年份下拉框
    const ys = document.getElementById('yearFilter');
    if(ys) {
        ys.innerHTML = '<option value="All">All Years</option>';
        for (let y = 2024; y >= 1920; y--) {
            const o = document.createElement('option'); 
            o.value = y; 
            o.innerText = y; 
            ys.appendChild(o);
        }
    }
};

// 2. 核心筛选函数
function triggerFilter() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const yearFilter = document.getElementById('yearFilter');
    const ratingFilter = document.getElementById('ratingFilter');
    
    const q = searchInput ? searchInput.value : "";
    const g = genreFilter ? genreFilter.value : "All";
    const y = yearFilter ? yearFilter.value : "All";
    const r = ratingFilter ? ratingFilter.value : 0;
    
    // 动态构建 API URL
    let url = `/api/movies?rating=${r}`;
    if (g !== 'All') url += `&genre=${encodeURIComponent(g)}`; // 只有不是 All 时才过滤流派
    if (y !== 'All') url += `&year=${y}`; // 只有不是 All 时才过滤年份
    
    fetch(url).then(res => res.json()).then(data => {
        // 前端过滤关键词
        if (q) {
            data = data.filter(m => m.title.toLowerCase().includes(q.toLowerCase()));
        }
        allMovies = data;
        renderMovieList(allMovies);
    }).catch(err => console.error("Filter error:", err));
}

// 别忘了把这个也挂载到 window，否则 HTML 里的 oninput 找不到
window.triggerFilter = triggerFilter;

function fetchMovies() {
    fetch('/api/movies').then(res => res.json()).then(data => {
        allMovies = data;
        renderMovieList(allMovies);
    });
}

function renderMovieList(list) {
    const container = document.getElementById('movieList');
    if (!container) return;
    container.innerHTML = '';
    list.slice(0, 100).forEach(m => {
        const d = document.createElement('div');
        d.className = 'movie-item';
        d.innerText = m.title;
        d.onclick = () => loadSoloMovie(m.title);
        container.appendChild(d);
    });
}

// --- 3. 博物馆入口与导航 ---
function enterMuseum() {
    const landing = document.getElementById('landing-container');
    const museum = document.getElementById('museum-container');
    if (!landing || !museum) return;
    landing.style.display = 'none';
    museum.style.display = 'block'; 
    setTimeout(() => { 
        museum.style.opacity = '1'; 
        initCharts(); 
        if(allMovies.length > 0) loadSoloMovie(allMovies[0].title);
    }, 50);
}

function initCharts() {
    const radarDom = document.getElementById('radar-art');
    const archiveDom = document.getElementById('global-map');
    const cosmosDom = document.getElementById('cosmos-map');
    const cellsDom = document.getElementById('cosmos-cells-chart'); // 新增

    if (radarDom) myRadarChart = echarts.init(radarDom);
    if (archiveDom) myGlobalChart = echarts.init(archiveDom);
    if (cosmosDom) myCosmosChart = echarts.init(cosmosDom);
    if (cellsDom) myCellsChart = echarts.init(cellsDom); // 新增
}

function switchTab(tabId) {
    console.log("切换至展厅:", tabId);
    
    // 1. 清理所有导航高亮
    document.querySelectorAll('.nav-links span').forEach(el => {
        el.classList.remove('active');
    });
    // 高亮当前点击的按钮 (ID 必须对应: tab-solo-btn, tab-cosmos-btn 等)
    const activeBtn = document.getElementById(`tab-${tabId}-btn`);
    if (activeBtn) activeBtn.classList.add('active');

    // 2. 切换展厅面板 (显隐)
    document.querySelectorAll('.tab-pane').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });

    const targetPane = document.getElementById(`view-${tabId}`);
    if (targetPane) {
        // Solo 页面使用 flex 保持布局，其他使用 block
        targetPane.style.display = (tabId === 'solo') ? 'flex' : 'block';
        targetPane.classList.add('active');
    }

    // 3. 核心修复：延迟 Resize 图表
    setTimeout(() => {
        // 强制所有已初始化的图表重绘，防止压扁
        if (myRadarChart) myRadarChart.resize();
        if (myGlobalChart) myGlobalChart.resize();
        if (myCosmosChart) myCosmosChart.resize();
        if (myCellsChart) myCellsChart.resize();

        // 加载数据
        if (tabId === 'cosmos') {
            loadCosmos(); 
            loadCells(); // 确保 Dimension 02 也会被加载
        } else if (tabId === 'archive') {
            loadArchive();
        } else if (tabId === 'gallery') {
            loadGallery();
        }
        
        // 每次切换强制回到顶部
        const panes = document.querySelectorAll('.tab-pane');
        panes.forEach(p => p.scrollTop = 0);
    }, 300);
}

// --- 4. 特展厅 (Solo View) 逻辑 ---
async function loadSoloMovie(title) {
    if (!title) return;
    
    const mainContent = document.querySelector('.solo-main');
    const posterImg = document.getElementById('solo-poster');
    
    // 1. 动画开始：变淡
    if (mainContent) {
        mainContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        mainContent.style.opacity = '0.2';
        mainContent.style.transform = 'translateY(5px)';
    }

    try {
        const res = await fetch(`/api/movie_detail?title=${encodeURIComponent(title)}`);
        const mData = await res.json();
        
        if (mData.error) {
            console.error("Movie not found");
            return;
        }

        // 2. 确保在数据返回后替换内容
        document.getElementById('displayTitle').innerText = mData.title;
        document.getElementById('displaySubtitle').innerText = `${mData.year} / RATING ${mData.rating}`;
        document.getElementById('displayOverview').innerText = mData.overview;
        document.getElementById('displayTagline').innerText = mData.tagline !== "Unknown" ? mData.tagline : "";
        
        if (posterImg) {
            posterImg.src = mData.poster;
            posterImg.style.display = 'block';
        }

        // 背景颜色联动
        const themeColor = mData.main_color || '#c0392b';
        const bd = document.getElementById('global-backdrop');
        if (bd) {
            bd.style.background = `radial-gradient(circle at 50% 50%, ${themeColor}33 0%, var(--bg-paper) 90%)`;
            bd.style.opacity = '1';
        }

        // 渲染图表和相似推荐
        if (typeof renderRadar === 'function') renderRadar(mData.top_emotions, themeColor);
        if (typeof loadSimilarMovies === 'function') loadSimilarMovies(mData.title);

        // 3. 动画结束：恢复显示
        if (mainContent) {
            setTimeout(() => {
                mainContent.style.opacity = '1';
                mainContent.style.transform = 'translateY(0)';
            }, 50);
        }

    } catch (e) {
        console.error("Load movie detail failed:", e);
        // 如果出错，强制恢复显示，防止页面全白
        if (mainContent) mainContent.style.opacity = '1';
    }
}

function renderRadar(emotions, color) {
    if(!myRadarChart) return;
    myRadarChart.setOption({
        radar: {
            indicator: emotions.map(e => ({ name: e.name, max: 100 })),
            shape: 'circle', radius: '65%',
            axisName: { color: '#aaa', fontStyle: 'italic', fontSize: 10 }
        },
        series: [{
            type: 'radar', symbol: 'none',
            data: [{
                value: emotions.map(e => e.norm_value),
                areaStyle: {
                    color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                        { color: color + '99', offset: 0 }, { color: color + '11', offset: 1 }
                    ])
                },
                lineStyle: { color: color, width: 2 }
            }]
        }]
    }, true);
}

async function loadSimilarMovies(title) {
    const c = document.getElementById('similar-movies-container');
    if (!c) return;
    const res = await fetch(`/api/similar_movies?title=${encodeURIComponent(title)}`);
    const similar = await res.json();
    c.innerHTML = '';
    similar.forEach(m => {
        const d = document.createElement('div');
        d.className = 'similar-card';
        d.onclick = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); loadSoloMovie(m.title); };
        d.innerHTML = `<img src="${m.poster}"><div style="font-size:9px;margin-top:8px;color:#999;text-align:center;">${m.title}</div>`;
        c.appendChild(d);
    });
}

// --- 5. 情绪宇宙 (The Cosmos) 逻辑 ---
// 在函数开始前，增加图例渲染（只需执行一次）
function renderCosmosLegend() {
    const gContainer = document.getElementById('genre-dots');
    const eContainer = document.getElementById('emo-dots');
    if (!gContainer || gContainer.innerHTML !== "") return;

    Object.keys(GENRE_COLORS).slice(0, 8).forEach(g => {
        gContainer.innerHTML += `<span class="legend-dot"><i class="dot-sample" style="background:${GENRE_COLORS[g]}"></i>${g}</span>`;
    });
    Object.keys(EMO_COLORS).forEach(e => {
        eContainer.innerHTML += `<span class="legend-dot"><i class="dot-sample" style="border:1.5px solid ${EMO_COLORS[e]}"></i>${e}</span>`;
    });
}


// 2. Cosmos 核心渲染函数
/**
 * 情绪宇宙 (The Cosmos) - 最终艺术增强版
 * 布局：[流派点阵] | [年度Top 3文字] | [气泡矩阵坐标] | [年度产量折线]
 */
async function loadCosmos() {
    const chartDom = document.getElementById('cosmos-master-chart');
    if (!chartDom) return;

    // 1. 初始化 ECharts 实例
    const existInstance = echarts.getInstanceByDom(chartDom);
    if (existInstance) existInstance.dispose();
    
    // 强制使用 Canvas 渲染，开启分片加载，设置固定超长高度 7500px
    const myChart = echarts.init(chartDom, null, { 
        renderer: 'canvas', 
        height: 7500,
        useDirtyRect: true 
    });

    // 2. 性能优化：检查全局缓存
    if (!cachedCosmosData) {
        myChart.showLoading({ 
            text: '正在编织时空图谱...', 
            color: '#c0392b', 
            maskColor: 'rgba(253, 252, 240, 0.8)',
            textColor: '#1a1a1a'
        });
        try {
            const res = await fetch('/api/stats/cosmos');
            cachedCosmosData = await res.json();
            myChart.hideLoading();
        } catch (e) {
            console.error("Cosmos Data Load Error:", e);
            myChart.hideLoading();
            return;
        }
    }

    const data = cachedCosmosData;
    const genresList = ["Drama", "Comedy", "Action", "Thriller", "Sci-Fi", "Horror", "Animation", "Adventure", "Romance", "Crime"];
    
    // 3. 数据加工
    const bubbleData = [];        // 中间主气泡
    const unitChartData = [];     // 左侧流派方块
    const top3TextData = [];      // 年度Top 3文字
    const volumeLineData = [];    // 右侧产量折线
    const yearStats = {};

    data.forEach((m) => {
        const y = parseInt(m.year);
        if (isNaN(y)) return;

        // 统计年度流派与数量
        if (!yearStats[y]) yearStats[y] = { count: 0, movies: [], genreCounts: {} };
        yearStats[y].movies.push(m);
        yearStats[y].count++;

        const gArray = m.genres ? m.genres.split(',').map(g => g.trim()) : [];
        const primary = gArray.find(g => genresList.includes(g)) || "Drama";
        yearStats[y].genreCounts[primary] = (yearStats[y].genreCounts[primary] || 0) + 1;

        // 准备气泡数据 [流派索引, 年份, 评分, 标题, 情绪, 主流派]
        const emo = (m.main_emotion || "UNKNOWN").toUpperCase();
        bubbleData.push([genresList.indexOf(primary), y, m.rating, m.name, emo, primary]);
    });

    // 处理年度关联统计
    Object.keys(yearStats).sort().forEach(year => {
        const yr = parseInt(year);
        const sorted = yearStats[year].movies.sort((a, b) => b.rating - a.rating);
        
        // 年度 Top 3：颜色与主导情绪对齐
        sorted.slice(0, 3).forEach((m, idx) => {
            const emo = (m.main_emotion || "UNKNOWN").toUpperCase();
            top3TextData.push({
                value: [0, yr + (idx * 0.22)], // 纵向微调偏移防止重叠
                name: m.name,
                label: { 
                    show: true,
                    color: EMOTION_PIGMENTS[emo] || "#999", 
                    fontSize: 10,
                    fontFamily: 'serif',
                    fontStyle: 'italic'
                }
            });
        });

        // 俄罗斯方块点阵 (左侧)
        let dotX = -1; 
        genresList.forEach(g => {
            const count = yearStats[year].genreCounts[g] || 0;
            for (let i = 0; i < count; i++) {
                unitChartData.push([dotX, yr, g]);
                dotX -= 0.15; // 向左堆叠
            }
        });

        // 右侧产量折线
        volumeLineData.push([yearStats[year].count, yr]);
    });

    // 4. ECharts 配置项
    const option = {
        backgroundColor: 'transparent',
        // 顶部叙事标注
        graphic: [
        {
            type: 'group', left: L_START.units + '%', top: 30,
            children: [
                { type: 'text', style: { text: 'GENRE UNITS', fill: '#888', font: 'bold 14px "Playfair Display"' } },
                { type: 'text', top: 20, style: { text: '流派产量分布', fill: '#bbb', font: '11px sans-serif' } }
            ]
        },
        {
            type: 'group', left: L_START.master + '%', top: 30,
            children: [
                { type: 'text', style: { text: 'ANNUAL MASTERPIECES', fill: '#888', font: 'bold 14px "Playfair Display"' } },
                { type: 'text', top: 20, style: { text: '年度评分 Top 3', fill: '#bbb', font: '11px sans-serif' } }
            ]
        },
        {
            type: 'group', left: L_START.matrix + '%', top: 30,
            children: [
                { type: 'text', style: { text: 'CINEMATIC CHRONICLE MATRIX', fill: '#888', font: 'bold 14px "Playfair Display"' } },
                { type: 'text', top: 20, style: { text: '气泡大小: 评分 | 颜色: 流派 | 描边: 情绪', fill: '#bbb', font: '11px sans-serif' } }
            ]
        },
        {
            type: 'group', left: L_START.volume + '%', top: 30,
            children: [
                { type: 'text', style: { text: 'VOLUME', fill: '#888', font: 'bold 14px "Playfair Display"' } },
                { type: 'text', top: 20, style: { text: '产出趋势', fill: '#bbb', font: '11px sans-serif' } }
            ]
        }
    ],

    // 2. 网格布局：确保内容容器与标题起始点完全对齐
    grid: [
        { top: 120, bottom: 100, left: L_START.units + '%', width: '8%' },    // Units
        { top: 120, bottom: 100, left: L_START.master + '%', width: '15%' },  // Masterpieces
        { top: 120, bottom: 100, left: (L_START.matrix + 0.5) + '%', width: '53%' }, // Matrix (加0.5%微调)
        { top: 120, bottom: 100, left: L_START.volume + '%', width: '8%' }    // Volume
    ],
        xAxis: [
        // Grid 0: 修正方块点阵的坐标轴范围，使其贴近左侧
        { gridIndex: 0, show: false, min: -4, max: 0 }, 
        
        // Grid 1: 修正年度文字起始点
        { gridIndex: 1, show: false, min: 0, max: 1 }, 
        
        // Grid 2: 气泡矩阵 - 核心修正
        { 
            gridIndex: 2, 
            type: 'category', 
            data: genresList, 
            position: 'top', 
            boundaryGap: true, // 保持为 true，使气泡居中于列
            axisLabel: { 
                color: '#999', 
                fontSize: 11, 
                margin: 30, 
                fontWeight: 'bold',
                align: 'center' // 强制标签居中
            },
            axisLine: { show: false }, 
            axisTick: { show: false } 
        },
        { gridIndex: 3, show: false }
    ],
        yAxis: [
            { gridIndex: 0, type: 'value', inverse: true, min: 1928, max: 2026, show: false },
            { gridIndex: 1, type: 'value', inverse: true, min: 1928, max: 2026, show: false },
            { 
                gridIndex: 2, type: 'value', inverse: true, min: 1928, max: 2026, interval: 1, 
                axisLabel: { color: '#ddd', fontSize: 10 },
                splitLine: { lineStyle: { color: '#f5f4eb' } } // 纸质质感线条
            },
            { gridIndex: 3, type: 'value', inverse: true, min: 1928, max: 2026, show: false }
        ],
        series: [
            // 1. 核心气泡矩阵
            {
                name: 'MainBubbles',
                xAxisIndex: 2, yAxisIndex: 2, type: 'scatter', data: bubbleData,
                progressive: 2000, 
                symbolSize: (val) => {
                    let r = val[2] <= 10 ? val[2] * 10 : val[2]; // 兼容 10 分制
                    return Math.pow(Math.max(0, r - 55), 1.6) * 0.22;
                },
                itemStyle: {
                    color: (p) => ART_PIGMENTS[p.data[5]], // 填充：流派
                    borderColor: (p) => EMOTION_PIGMENTS[p.data[4]], // 描边：情绪
                    borderWidth: 2, opacity: 0.6
                },
                emphasis: { 
                    label: { 
                        show: true, formatter: '{b}', position: 'right', 
                        backgroundColor: '#fff', padding: [4, 8], color: '#333', borderRadius: 2
                    } 
                }
            },
            // 2. 左侧俄罗斯方块
            {
            xAxisIndex: 0, yAxisIndex: 0, type: 'scatter', 
            data: unitChartData.map(d => [d[0] - 0.2, d[1], d[2]]), // 向左微调0.2个单位
            symbol: 'rect', symbolSize: [5, 2.5],
            itemStyle: { color: (p) => ART_PIGMENTS[p.data[2]], opacity: 0.7 },
            silent: true
            },
            // 3. 年度文字 (Top 3)
            {
            xAxisIndex: 1, yAxisIndex: 1, type: 'scatter', data: top3TextData,
            symbolSize: 0, 
            label: { 
                show: true, 
                position: 'right', // 文字在点的右侧
                distance: 0,      // 间距设为0，紧贴起始线
                align: 'left',    // 文字内部左对齐
                formatter: (p) => p.data.name 
                }
            },
            // 4. 右侧产量曲线
            {
                xAxisIndex: 3, yAxisIndex: 3, type: 'line', data: volumeLineData,
                smooth: true, symbol: 'none',
                lineStyle: { color: '#e34234', width: 1.5, opacity: 0.4 },
                areaStyle: { color: 'rgba(227, 66, 52, 0.05)' }
            }
        ]
    };

    myChart.setOption(option);

    // 5. 交互：点击跳转至 Solo 展示位
    myChart.off('click');
    myChart.on('click', (params) => {
        if (params.data && params.data[3]) {
            console.log("Navigating to:", params.data[3]);
            switchTab('solo'); // 切换到详情 Tab
            loadSoloMovie(params.data[3]); // 加载电影详情
        }
    });

    console.log("--- Cosmos Art Matrix Rendered ---");
}


function startCuratorInsights() {
    const insightBox = document.getElementById('insight-text');
    if (!insightBox) return;
    const insights = [
        "In this star map, Anger (Red) forms the backbone of cinematic conflict.",
        "Amusement is the rarest frequency, often shimmering within the shadows of Sadness.",
        "Physical distance here represents 'Soul Similarity'.",
        "Many comedies linger near the blue abyss of Sadness.",
        "The clusters at the heart represent the collective subconscious."
    ];
    let index = 0;
    if (curatorTimer) clearInterval(curatorTimer);
    insightBox.innerText = insights[0];
    curatorTimer = setInterval(() => {
        const currentBox = document.getElementById('insight-text');
        if (!currentBox) { clearInterval(curatorTimer); return; }
        currentBox.style.opacity = 0;
        setTimeout(() => {
            index = (index + 1) % insights.length;
            currentBox.innerText = insights[index];
            currentBox.style.opacity = 1;
        }, 800);
    }, 6000);
}

// --- 6. 画廊厅 (Gallery View) ---
async function loadGallery() {
    const container = document.getElementById('galleryContent');
    if (!container) return;
    
    // 如果已经加载过，且里面有内容，就不重复拉取
    if (container.children.length > 0) return;

    const res = await fetch('/api/gallery');
    const data = await res.json();
    
    container.innerHTML = ''; // 清空加载提示

    for (let hallName in data) {
        // 创建展厅容器
        const hallDiv = document.createElement('div');
        hallDiv.className = 'gallery-hall';
        
        // 拼接标题与轨道
        let html = `
            <h2 class="hall-title">${hallName}</h2>
            <div class="carousel-container">
                <button class="carousel-btn prev" onclick="scrollGallery(this, -1)"> < </button>
                <div class="carousel-track">
        `;
        
        data[hallName].forEach(movie => {
            const poster = movie.poster_path !== "Unknown" 
                ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` 
                : 'https://via.placeholder.com/200x300';
            
            html += `
                <div class="gallery-card" onclick="switchTab('solo'); loadSoloMovie('${movie.title.replace(/'/g, "\\'")}');">
                    <img src="${poster}">
                    <div class="card-label">${movie.title}</div>
                </div>`;
        });
        
        html += `</div><button class="carousel-btn next" onclick="scrollGallery(this, 1)"> > </button></div>`;
        hallDiv.innerHTML = html;
        container.appendChild(hallDiv);
    }
}

function scrollGallery(btn, direction) {
    const track = btn.parentElement.querySelector('.carousel-track');
    if (track) track.scrollBy({ left: track.clientWidth * 0.8 * direction, behavior: 'smooth' });
}

// --- 7. 全球档案馆 (Archive View) ---
// --- 7. 全球档案馆 (Archive View) - 交互增强版 ---
async function loadArchive() {
    
    if(!myGlobalChart) return;
    
    // 显示加载状态
    myGlobalChart.showLoading({ text: '正在绘制全球电影情感图谱...', color: '#c0392b' });
    
    const res = await fetch('/api/stats/global');
    const data = await res.json();
    
    const schema = [
        { name: 'JOY', index: 0 }, 
        { name: 'SAD', index: 1 }, 
        { name: 'FEAR', index: 2 }, 
        { name: 'SURP', index: 3 }, 
        { name: 'ANGR', index: 4 }
    ];
    
    const option = {
        backgroundColor: 'transparent',
        // 【找回功能 1】全局提示框配置
        tooltip: {
            padding: 10,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: '#eee',
            borderWidth: 1,
            formatter: (p) => {
                const movie = data[p.dataIndex];
                const posterUrl = movie.poster !== "Unknown" ? `https://image.tmdb.org/t/p/w200${movie.poster}` : '';
                return `
                    <div style="text-align:center;">
                        ${posterUrl ? `<img src="${posterUrl}" style="width:80px;height:120px;object-fit:cover;margin-bottom:8px;border-radius:2px;box-shadow:0 4px 10px rgba(0,0,0,0.1);">` : ''}
                        <br/><b style="color:#1a1a1a; font-size:14px;">${movie.title}</b>
                        <br/><span style="color:#888; font-size:11px;">点击线条进入展位</span>
                    </div>
                `;
            }
        },
        parallelAxis: schema.map(s => ({ 
            dim: s.index, 
            name: s.name, 
            max: 100,
            nameTextStyle: { color: '#888', fontSize: 12, fontWeight: 'bold' }
        })),
        parallel: {
            left: '10%',
            right: '15%',
            top: '18%',
            bottom: '10%',
            axisExpandable: true,
            parallelAxisDefault: {
                type: 'value',
                nameLocation: 'end',
                nameGap: 20,
                splitLine: { show: false }
            }
        },
        series: {
            type: 'parallel',
            // 【找回功能 2】允许线条触发事件
            triggerLineEvent: true, 
            lineStyle: {
                width: 1.2,
                opacity: 0.1, // 平时很淡，形成烟雾感
                color: '#c0392b'
            },
            // 【找回功能 3】高亮样式：鼠标悬停时线条变黑变粗
            emphasis: {
                lineStyle: {
                    width: 4,
                    opacity: 1,
                    color: '#1a1a1a', // 选中时变成深色，非常明显
                    shadowBlur: 10,
                    shadowColor: 'rgba(0,0,0,0.3)'
                }
            },
            // 映射数据
            data: data.map(d => [d.JOY, d.SAD, d.FEAR, d.SURP, d.ANGR])
        }
    };
    
    myGlobalChart.hideLoading();
    myGlobalChart.setOption(option, true);
    // 点击跳转逻辑保持不变
    myGlobalChart.off('click');
    myGlobalChart.on('click', (p) => { 
        switchTab('solo'); 
        loadSoloMovie(data[p.dataIndex].title); 
    });
}

// --- 8. 馆长的仪式 (The Ritual) ---
const ritualQuestions = [
    { q: "如果把你此刻的意识比作一个空间，那里的光线是？", opts: [{ t: "穿透云层的晨曦，温和而轻快。", scores: { joy: 0.9, sadness: 0.1 } }, { t: "漫长极夜后的微光，深沉而静谧。", scores: { joy: 0.1, sadness: 0.9 } }] },
    { q: "面对一段未知的、充满迷雾的旅程，你下意识的行为是？", opts: [{ t: "谨慎地止步，试图听清迷雾中的声响。", scores: { fear: 0.8, surprise: 0.2 } }, { t: "毫不犹豫地踏入，好奇多过顾虑。", scores: { fear: 0.2, surprise: 0.7 } }] },
    { q: "当原本有序的计划突然被打破，你的第一感受更接近？", opts: [{ t: "一种突如其来的、被现实击中的震颤。", scores: { surprise: 0.9, anger: 0.2 } }, { t: "果然如此，生活本就是由意外构成的。", scores: { surprise: 0.2, sadness: 0.3 } }] },
    { q: "看到不公的现象或被误解时，你内心的波动更像是？", opts: [{ t: "滚烫的岩浆，寻找喷发的出口。", scores: { anger: 0.9, joy: 0.1 } }, { t: "沉入湖底的石子，激起涟漪后归于寂静。", scores: { anger: 0.2, sadness: 0.5 } }] },
    { q: "你现在更希望电影带给你什么样的力量？", opts: [{ t: "彻底的释放，逃离现实的喧嚣。", scores: { joy: 0.6, fear: 0.4, anger: 0.3 } }, { t: "审视内心，寻找灵魂的共鸣。", scores: { sadness: 0.7, surprise: 0.3 } }] }
];

function openSurvey() {
    currentQ = 0; userProfile = { joy: 0.5, sadness: 0.5, fear: 0.5, surprise: 0.5, anger: 0.5 };
    document.getElementById('question-view').style.display = 'block';
    document.getElementById('analysis-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'none';
    document.getElementById('survey-overlay').style.display = 'flex';
    setTimeout(() => { document.getElementById('survey-overlay').style.opacity = '1'; }, 50);
    showQuestion();
}

function showQuestion() {
    if (currentQ >= ritualQuestions.length) { processAnalysis(); return; }
    const q = ritualQuestions[currentQ];
    document.getElementById('q-text').innerText = q.q;
    const oc = document.getElementById('answer-options'); oc.innerHTML = '';
    q.opts.forEach(o => {
        const b = document.createElement('button'); b.className = 'opt-btn'; b.innerText = o.t;
        b.onclick = () => { for (let e in o.scores) userProfile[e] = o.scores[e]; currentQ++; showQuestion(); };
        oc.appendChild(b);
    });
}

async function processAnalysis() {
    document.getElementById('question-view').style.display = 'none';
    const analysisView = document.getElementById('analysis-view');
    analysisView.style.display = 'block';
    
    // 发送请求获取推荐
    try {
        const res = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile)
        });
        finalMovieResult = await res.json();
    } catch (e) { console.error("Recommend error:", e); }
    
    // 找回主导情绪并显示光环
    const dominant = Object.keys(userProfile).reduce((a, b) => userProfile[a] > userProfile[b] ? a : b);
    const moodAura = document.getElementById('mood-aura');
    if (moodAura) {
        moodAura.className = 'mood-aura-ring aura-' + dominant; // 这里对应 CSS 里的 .aura-joy, .aura-sadness 等
    }
    
    const titles = { joy: "阳光收集者", sadness: "深海潜行者", fear: "迷雾漫游者", anger: "烈焰逐行者", surprise: "奇迹发现家" };
    document.getElementById('user-title').innerText = titles[dominant] || "灵魂探索者";
    document.getElementById('user-desc').innerText = "基于你此刻的情绪指纹，系统正在匹配对应的光影灵魂。";
}

function showFinalResult() {
    document.getElementById('analysis-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';
    document.getElementById('rec-movie-title').innerText = `《${finalMovieResult.title}》`;
}

function goToRecommended() {
    document.getElementById('survey-overlay').style.display = 'none';
    switchTab('solo'); loadSoloMovie(finalMovieResult.title);
}

function triggerFilter() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const yearFilter = document.getElementById('yearFilter'); // 确保抓到这个ID
    const ratingFilter = document.getElementById('ratingFilter');
    
    const q = searchInput ? searchInput.value : "";
    const g = genreFilter ? genreFilter.value : "All";
    const y = yearFilter ? yearFilter.value : "All"; // 获取年份
    const r = ratingFilter ? ratingFilter.value : 0;
    
    // 构建 API URL
    let url = `/api/movies?rating=${r}`;
    if (g !== 'All') url += `&genre=${encodeURIComponent(g)}`;
    if (y !== 'All') url += `&year=${y}`; // 将年份拼接到 API 请求中
    
    fetch(url).then(res => res.json()).then(data => {
        // 前端过滤关键词
        if (q) {
            data = data.filter(m => m.title.toLowerCase().includes(q.toLowerCase()));
        }
        allMovies = data;
        renderMovieList(allMovies);
    }).catch(err => console.error("Filter error:", err));
}

function updateRatingLabel(v) { 
    const label = document.getElementById('ratingVal');
    if(label) label.innerText = v; 
}

window.onresize = () => { [myRadarChart, myGlobalChart, myCosmosChart].forEach(c => c && c.resize()); };

// --- 7. 全球档案馆重置逻辑 ---
function resetArchiveFilters() {
    if (myGlobalChart) {
        // 方案 A: 使用 ECharts 自带的 restore 动作
        myGlobalChart.dispatchAction({
            type: 'restore'
        });
        
        // 方案 B: 重新拉取数据以确保完全重置
        loadArchive(); 
        
        console.log("Archive chart reset.");
    }
}

// 在 main.js 底部添加
async function loadCells() {
    if (!myCellsChart) return;
    myCellsChart.showLoading({ text: '正在培养情感细胞...', color: '#c0392b' });

    const res = await fetch('/api/stats/cosmos');
    const allData = await res.json();
    
    // 按主导情绪分组
    const emoGroups = {};
    allData.forEach(m => {
        const cat = m.main_emotion || 'UNKNOWN';
        if (!emoGroups[cat]) emoGroups[cat] = [];
        emoGroups[cat].push({
            name: m.name,
            value: 1, 
            itemStyle: { color: m.color, opacity: 0.8 }
        });
    });

    const sunburstData = Object.keys(emoGroups).map(key => ({
        name: key,
        children: emoGroups[key].slice(0, 30) // 取前30部
    }));

    myCellsChart.setOption({
        series: {
            type: 'sunburst',
            data: sunburstData,
            radius: ['10%', '90%'],
            levels: [{}, { r0: '0%', r: '35%', label: { rotate: 'tangential' } }, { r0: '38%', r: '85%', label: { show: false } }]
        }
    });
    myCellsChart.hideLoading();
}

// --- 2. 完整的 switchTab 函数 ---
window.switchTab = (tabId) => {
    console.log("--- 切换展厅至: " + tabId + " ---");
    const panes = document.querySelectorAll('.tab-pane');
    const target = document.getElementById(`view-${tabId}`);
    if (!target) return;

    panes.forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });

    // Solo 用 flex，其他用 block
    target.style.display = (tabId === 'solo' ? 'flex' : 'block');
    target.classList.add('active');
    target.scrollTop = 0; 

    document.querySelectorAll('.nav-links span').forEach(el => el.classList.remove('active'));
    const btn = document.getElementById(`tab-${tabId}-btn`);
    if (btn) btn.classList.add('active');

    // 针对性触发渲染与重绘
    if (tabId === 'cosmos') {
        setTimeout(loadCosmos, 50);
    } 
    else if (tabId === 'gallery') {
        setTimeout(loadGallery, 50);
    } 
    else if (tabId === 'archive') {
        // 关键：确保档案馆容器显示后立即初始化并 resize
        setTimeout(() => {
            if (!myGlobalChart) {
                myGlobalChart = echarts.init(document.getElementById('global-map'));
            }
            myGlobalChart.resize(); 
            loadArchive(); // 重新加载数据
        }, 100);
    }
    else if (tabId === 'solo') {
        // 关键：回到 Solo 页面时，重绘雷达图防止它变小
        setTimeout(() => {
            if (myRadarChart) myRadarChart.resize();
        }, 100);
    }
};

window.enterMuseum = () => {
    const landing = document.getElementById('landing-container');
    const museum = document.getElementById('museum-container');
    
    if (landing && museum) {
        landing.style.display = 'none';
        museum.style.display = 'block';
        
        // 初始化 ECharts
        if (document.getElementById('radar-art')) {
            myRadarChart = echarts.init(document.getElementById('radar-art'));
        }
        
        // 关键：如果 allMovies 还没加载完，等待一会再加载详情
        if (allMovies && allMovies.length > 0) {
            loadSoloMovie(allMovies[0].title);
        } else {
            // 如果数据还没回来，就先去获取电影
            fetchMovies().then(() => {
                if (allMovies.length > 0) loadSoloMovie(allMovies[0].title);
            });
        }
    }
};

// main.js 新增 3D 逻辑

let scene, camera, renderer, globeGroup;
const postersCount = 100; // 海报数量
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * AURA | DNA 双螺旋结构渲染器
 * 核心逻辑：将海报分布在两条交织的螺旋线上，中心留白以保证文字可读性
 */
/**
 * AURA | DNA 双螺旋结构渲染器 (全平台适配版)
 * 自动识别手机/电脑端并调整螺旋形态
 */
function initMovieGlobe(movieData) {
    const container = document.getElementById('three-canvas-container');
    if (!container) return;

    // --- 1. 环境检测与响应式参数 ---
    const isMobile = window.innerWidth < 768;
    
    // 手机端参数：更窄的半径(160)，更大的垂直间距(25)，更少的海报(60)
    // 电脑端参数：原本的半径(420)，垂直间距(12)，海报(120)
    const settings = {
        radius: isMobile ? 160 : 420,
        heightStep: isMobile ? 25 : 12,
        postersCount: isMobile ? 60 : 120,
        cameraZ: isMobile ? 800 : 700, // 手机端相机拉远一点
        fov: isMobile ? 70 : 55        // 手机端视角调广一点
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = settings.cameraZ;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 清除旧的 canvas（防止重复初始化）
    container.innerHTML = ''; 
    container.appendChild(renderer.domElement);

    const dnaGroup = new THREE.Group();
    scene.add(dnaGroup);

    // 过滤并选择电影
    const validMovies = movieData.filter(m => m.poster_path && m.poster_path !== "Unknown");
    const selectedMovies = validMovies.sort(() => 0.5 - Math.random()).slice(0, settings.postersCount);

    const loader = new THREE.TextureLoader();

    selectedMovies.forEach((movie, i) => {
        // --- 2. DNA 螺旋核心算法 ---
        const strand = i % 2;           
        const angle = i * 0.25;         
        
        // 使用 settings 中的响应式数值
        const x = settings.radius * Math.cos(angle + (strand * Math.PI));
        const y = (i * settings.heightStep) - (selectedMovies.length * settings.heightStep / 2);
        const z = settings.radius * Math.sin(angle + (strand * Math.PI));

        // 手机上海报尺寸稍微调大一点点方便点击
        const posterW = isMobile ? 45 : 38;
        const posterH = isMobile ? 66 : 56;

        const geometry = new THREE.PlaneGeometry(posterW, posterH);
        const material = new THREE.MeshBasicMaterial({ 
            map: loader.load(`https://image.tmdb.org/t/p/w200${movie.poster_path}`),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.rotation.y = -angle - (strand * Math.PI);
        mesh.userData = { title: movie.title };
        dnaGroup.add(mesh);
    });

    container.style.pointerEvents = "auto";

    // --- 3. 动画循环 ---
    function animate() {
        requestAnimationFrame(animate);
        dnaGroup.rotation.y += 0.003;
        dnaGroup.position.y = Math.sin(Date.now() * 0.0005) * 15;

        dnaGroup.children.forEach(child => {
            const worldVector = new THREE.Vector3();
            child.getWorldPosition(worldVector);
            let dist = worldVector.z / 300; 
            child.material.opacity = Math.max(0.1, Math.min(0.9, 0.5 + dist));
        });

        renderer.render(scene, camera);
    }
    animate();

    // --- 4. 交互逻辑 ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.onclick = (event) => {
        // 适配手机端的点击位置计算
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(dnaGroup.children);

        if (intersects.length > 0) {
            const title = intersects[0].object.userData.title;
            enterMuseum();  
            switchTab('solo'); 
            loadSoloMovie(title); 
        }
    };

    // --- 5. 窗口缩放适配 ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function onDocumentMouseDown(event) {
    // 坐标归一化
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(globeGroup.children);

    if (intersects.length > 0) {
        const movieTitle = intersects[0].object.userData.title;
        console.log("点击了电影:", movieTitle);
        
        // 触发网站原有的跳转逻辑
        enterMuseum(); // 进入博物馆模式
        switchTab('solo'); // 切换到详情
        loadSoloMovie(movieTitle); // 加载详情
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 修改原有的 fetchMovies 回调
// 在 fetchMovies().then(data => { ... }) 里调用 initMovieGlobe(allMovies);

