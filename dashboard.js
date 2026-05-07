let dashboardData = [];
let trendChartInstance = null;
let pie7Instance = null;
let pie8Instance = null;
let pie21Instance = null;
let currentSort = { key: 'name', ascending: true };

const colors = {
    minjoo: '#2563eb', // Solid Blue
    minjooBg: 'rgba(37, 99, 235, 0.15)',
    opposing: '#ef4444', // Red
    opposingBg: 'rgba(239, 68, 68, 0.15)',
    neutral: '#94a3b8',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    gridColor: 'rgba(0, 0, 0, 0.06)'
};

Chart.defaults.color = colors.textSecondary;
Chart.defaults.font.family = "'Noto Sans KR', sans-serif";

async function init() {
    console.log("Initializing Dashboard...");
    try {
        const response = await fetch('election_data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        console.log("Data loaded successfully:", data);
        dashboardData = data.regions;

        populateSelect();

        // Initial render with '전체' or first item
        const initialRegion = dashboardData.find(r => r.name.includes('전체')) || dashboardData[0];
        document.getElementById('region-select').value = initialRegion.name;
        renderDashboard(initialRegion.name);

        document.getElementById('region-select').addEventListener('change', (e) => {
            renderDashboard(e.target.value);
        });

        // Setup View Switchers (Tabs)
        setupTabs();
        
        // Setup Table Sorting
        setupTableSorting();

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function populateSelect() {
    const select = document.getElementById('region-select');
    dashboardData.forEach(region => {
        const option = document.createElement('option');
        option.value = region.name;
        option.textContent = region.name;
        select.appendChild(option);
    });
}

function renderDashboard(regionName) {
    const region = dashboardData.find(r => r.name === regionName);
    if (!region) return;

    // Update Header Info
    document.getElementById('active-region-name').textContent = region.name;

    renderTrendChart(region);
    renderGapStats(region);
    renderPieCharts(region);
}

function renderTrendChart(region) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['7회 지선', '8회 지선', '21대 대선'],
            datasets: [{
                label: '민주당 득표율',
                data: [region.elec7.choi, region.elec8.lee_gj, region.pres21.lee_jm],
                borderColor: colors.minjoo,
                backgroundColor: colors.minjooBg,
                borderWidth: 2,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: colors.minjoo,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#0f172a',
                    bodyColor: '#475569',
                    borderColor: 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 14 },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    suggestedMin: 30,
                    suggestedMax: 70,
                    grid: { color: colors.gridColor },
                    ticks: {
                        color: colors.textSecondary,
                        font: { size: 12 },
                        callback: value => value + '%'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: colors.textPrimary,
                        font: { size: 14, weight: '500' }
                    }
                }
            }
        }
    });
}

function renderGapStats(region) {
    const container = document.getElementById('gapStats');

    const stats = [
        { title: '7회 지선 격차', gap: region.elec7.gap },
        { title: '8회 지선 격차', gap: region.elec8.gap },
        { title: '21대 대선 격차', gap: region.pres21.gap }
    ];

    container.innerHTML = stats.map(stat => {
        const isPositive = stat.gap > 0;
        const gapClass = isPositive ? 'gap-positive' : 'gap-negative';
        const sign = isPositive ? '+' : '';
        const gapText = `${sign}${stat.gap.toFixed(1)}%p`;
        const label = isPositive ? '우세' : '열세';

        return `
            <div class="stat-item">
                <div class="stat-title">${stat.title}</div>
                <div class="stat-value">
                    <span class="stat-gap ${gapClass}">${gapText}</span>
                    <span class="stat-label ${gapClass}">${label}</span>
                </div>
            </div>
        `;
    }).join('');
}

function createPieChart(canvasId, title, minjooData, opposingData, minjooLabel, opposingLabel) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    let others = 100 - (minjooData + opposingData);
    if (others < 0) others = 0;

    const hasOthers = others > 0.5;
    const data = hasOthers ? [minjooData, opposingData, others] : [minjooData, opposingData];
    const labels = hasOthers ? [minjooLabel, opposingLabel, '기타'] : [minjooLabel, opposingLabel];
    const bgColors = hasOthers ? [colors.minjoo, colors.opposing, colors.neutral] : [colors.minjoo, colors.opposing];

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.textSecondary,
                        padding: 15,
                        font: { size: 11 },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: true,
                    text: title,
                    color: colors.textPrimary,
                    font: { size: 12, weight: 'bold' },
                    padding: { bottom: 5 }
                }
            }
        }
    });
}

function renderPieCharts(region) {
    if (pie7Instance) pie7Instance.destroy();
    if (pie8Instance) pie8Instance.destroy();
    if (pie21Instance) pie21Instance.destroy();

    pie7Instance = createPieChart('pieChart7', '7회 지선', region.elec7.choi, region.elec7.jung, '최문순', '정창수');
    pie8Instance = createPieChart('pieChart8', '8회 지선', region.elec8.lee_gj, region.elec8.kim_jt, '이광재', '김진태');
    pie21Instance = createPieChart('pieChart21', '21대 대선', region.pres21.lee_jm, region.pres21.kim_ms, '이재명', '김문수');
}

// --- Navigation & Interactive Logic ---

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const viewId = btn.getAttribute('data-view');
            switchView(viewId);
            
            // Update active tab styling
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'view-table') {
        renderDataTable();
    }
}

function setupTableSorting() {
    document.querySelectorAll('#dataTable th').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort');
            if (currentSort.key === key) {
                currentSort.ascending = !currentSort.ascending;
            } else {
                currentSort.key = key;
                currentSort.ascending = true;
            }
            renderDataTable();
        });
    });
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((prev, curr) => prev ? prev[curr] : null, obj);
}

function renderDataTable() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';

    const sortedData = [...dashboardData].sort((a, b) => {
        let valA = getNestedValue(a, currentSort.key);
        let valB = getNestedValue(b, currentSort.key);
        
        // Handle nulls
        if (valA === null) return 1;
        if (valB === null) return -1;
        
        if (typeof valA === 'string') {
            return currentSort.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return currentSort.ascending ? valA - valB : valB - valA;
    });

    sortedData.forEach(r => {
        const tr = document.createElement('tr');
        
        const formatGap = (val) => {
            const isPos = val > 0;
            const cls = isPos ? 'positive-cell' : 'negative-cell';
            const sign = isPos ? '+' : '';
            return `<span class="${cls}">${sign}${val.toFixed(2)}%p</span>`;
        };

        tr.innerHTML = `
            <td><strong>${r.name}</strong></td>
            <td>${formatGap(r.elec7.gap)}</td>
            <td>${formatGap(r.elec8.gap)}</td>
            <td>${formatGap(r.pres21.gap)}</td>
            <td>${(r.avg_index ? r.avg_index.toFixed(2) + '%' : '-')}</td>
            <td>${(r.priority ? r.priority.toFixed(3) : '-')}</td>
        `;
        
        // Add click interaction: Jump to Dashboard for this region
        tr.addEventListener('click', () => {
            document.getElementById('region-select').value = r.name;
            renderDashboard(r.name);
            document.getElementById('tab-main').click(); // Switch to dashboard tab
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        tbody.appendChild(tr);
    });
}

window.addEventListener('DOMContentLoaded', init);
