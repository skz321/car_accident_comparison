// UK Car Accidents Analysis Dashboard
// Comprehensive analysis including hot spots, trends, correlation, and descriptive statistics

let ukData = [];
let ukFolderData = []; // Data from UK/Accidents0515.csv for 5-year visualizations
let localAuthorityMap = new Map(); // Map for Local Authority Highway codes to names
let processedData = null;

// Color scheme
const colors = {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#f093fb',
    success: '#4facfe',
    warning: '#f093fb',
    danger: '#fa709a'
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadLocalAuthorityMap(); // Load Local Authority Highway mapping
        await loadUKFolderData(); // Load UK folder data first (needed for severity enhancement)
        await loadData(); // Load main data (can now enhance with severity from UK folder data)
        processData();
        renderDescriptiveStats();
        renderHotSpotAnalysis();
        renderTrendAnalysis();
        renderMonthlyChart();
        renderCorrelationMatrix();
        renderRegionChart();
        renderWeatherChart();
        renderFiveYearTrend();
        renderFiveYearWeather();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        document.body.innerHTML = '<div class="loading">Error loading data. Please check the console.</div>';
    }
});

// Load Local Authority Highway mapping
async function loadLocalAuthorityMap() {
    return new Promise((resolve, reject) => {
        d3.csv('UK/contextCSVs/Local_Authority_Highway.csv').then(data => {
            data.forEach(d => {
                localAuthorityMap.set(d.Code, d.Label);
            });
            resolve();
        }).catch(reject);
    });
}

// Load CSV data
async function loadData() {
    return new Promise((resolve, reject) => {
        d3.csv('uk_accidents_cleaned.csv').then(data => {
            // Create a lookup map for severity from ukFolderData (only if we have data and need it)
            const severityLookup = new Map();
            if (ukFolderData.length > 0) {
                // Create a grid-based lookup for faster matching (round to 0.001 precision)
                ukFolderData.forEach(orig => {
                    if (orig.Accident_Severity && orig.Latitude && orig.Longitude) {
                        const latKey = Math.round(orig.Latitude * 1000) / 1000;
                        const lonKey = Math.round(orig.Longitude * 1000) / 1000;
                        const key = `${latKey}_${lonKey}`;
                        if (!severityLookup.has(key)) {
                            severityLookup.set(key, orig.Accident_Severity);
                        }
                    }
                });
            }
            
            ukData = data.map(d => {
                // Try to preserve severity - check if Severity field exists, otherwise use SeverityNumeric
                let severityValue = parseFloat(d.SeverityNumeric) || 0;
                let severityLabel = d.Severity || 'Unknown';
                
                // If severity is unknown or 0, try to get it from lookup map
                if ((severityValue === 0 || severityLabel === 'Unknown') && severityLookup.size > 0) {
                    const lat = parseFloat(d.Latitude);
                    const lon = parseFloat(d.Longitude);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        const latKey = Math.round(lat * 1000) / 1000;
                        const lonKey = Math.round(lon * 1000) / 1000;
                        const key = `${latKey}_${lonKey}`;
                        const foundSeverity = severityLookup.get(key);
                        if (foundSeverity) {
                            severityValue = foundSeverity;
                            // Map severity code to label: 1=Fatal, 2=Serious, 3=Slight
                            const severityMap = { 1: 'Fatal', 2: 'Serious', 3: 'Slight' };
                            severityLabel = severityMap[severityValue] || 'Unknown';
                        }
                    }
                }
                
                return {
                    ...d,
                    Latitude: parseFloat(d.Latitude),
                    Longitude: parseFloat(d.Longitude),
                    SeverityNumeric: severityValue,
                    Severity: severityLabel,
                    Year: parseInt(d.Year),
                    Month: parseInt(d.Month),
                    Hour: parseInt(d.Hour),
                    NumberOfVehicles: parseInt(d.NumberOfVehicles) || 0,
                    NumberOfCasualties: parseInt(d.NumberOfCasualties) || 0,
                    SpeedLimit: parseFloat(d.SpeedLimit) || 0,
                    CasualtyRate: parseFloat(d.CasualtyRate) || 0,
                    IsRushHour: d.IsRushHour === 'True',
                    IsWeekend: d.IsWeekend === 'True',
                    IsUrban: d.IsUrban === 'True',
                    HasRain: d.HasRain === 'True',
                    HasSnow: d.HasSnow === 'True',
                    HasFog: d.HasFog === 'True',
                    IsClear: d.IsClear === 'True',
                    IsFatal: d.IsFatal === 'True',
                    IsSerious: d.IsSerious === 'True',
                    IsMultiVehicle: d.IsMultiVehicle === 'True',
                    HasCasualties: d.HasCasualties === 'True',
                    Date: new Date(d.Date)
                };
            });
            resolve();
        }).catch(reject);
    });
}

// Load UK folder data for 5-year visualizations
async function loadUKFolderData() {
    return new Promise((resolve, reject) => {
        d3.csv('UK/Accidents0515.csv').then(data => {
            ukFolderData = data.map(d => {
                // Parse date from DD/MM/YYYY format
                const dateParts = d.Date ? d.Date.split('/') : [];
                const year = dateParts.length === 3 ? parseInt(dateParts[2]) : null;
                const month = dateParts.length === 3 ? parseInt(dateParts[1]) : null;
                const day = dateParts.length === 3 ? parseInt(dateParts[0]) : null;
                
                // Parse time from HH:MM format
                const timeParts = d.Time ? d.Time.split(':') : [];
                const hour = timeParts.length >= 1 ? parseInt(timeParts[0]) : null;
                
                return {
                    ...d,
                    Latitude: parseFloat(d.Latitude) || 0,
                    Longitude: parseFloat(d.Longitude) || 0,
                    Year: year,
                    Month: month,
                    Day: day,
                    Hour: hour,
                    NumberOfVehicles: parseInt(d.Number_of_Vehicles) || 0,
                    NumberOfCasualties: parseInt(d.Number_of_Casualties) || 0,
                    SpeedLimit: parseFloat(d.Speed_limit) || 0,
                    Accident_Severity: parseInt(d.Accident_Severity) || 0,
                    Weather_Conditions: d.Weather_Conditions || 'Unknown',
                    Local_Authority_Highway: d['Local_Authority_(Highway)'] || '',
                    Date: dateParts.length === 3 ? new Date(year, month - 1, day) : null
                };
            }).filter(d => d.Year !== null && d.Year >= 2010 && d.Year <= 2015); // Filter valid years (2010-2015)
            resolve();
        }).catch(reject);
    });
}

// Process data for analysis
function processData() {
    processedData = {
        total: ukData.length,
        years: [...new Set(ukData.map(d => d.Year))].sort(),
        months: [...new Set(ukData.map(d => d.Month))].sort(),
        regions: [...new Set(ukData.map(d => d.Region))],
        severities: [...new Set(ukData.map(d => d.Severity))],
        weather: [...new Set(ukData.map(d => d.Weather))]
    };
}

// Calculate descriptive statistics
function calculateDescriptiveStats() {
    const numericFields = {
        'SeverityNumeric': ukData.map(d => d.SeverityNumeric),
        'NumberOfVehicles': ukData.map(d => d.NumberOfVehicles),
        'NumberOfCasualties': ukData.map(d => d.NumberOfCasualties),
        'SpeedLimit': ukData.map(d => d.SpeedLimit).filter(v => v > 0),
        'CasualtyRate': ukData.map(d => d.CasualtyRate).filter(v => v > 0),
        'Hour': ukData.map(d => d.Hour)
    };

    const stats = {};
    for (const [field, values] of Object.entries(numericFields)) {
        if (values.length === 0) continue;
        const sorted = [...values].sort((a, b) => a - b);
        stats[field] = {
            mean: d3.mean(values),
            median: d3.median(values),
            min: d3.min(values),
            max: d3.max(values),
            stdDev: calculateStdDev(values),
            q1: d3.quantile(sorted, 0.25),
            q3: d3.quantile(sorted, 0.75)
        };
    }

    // Additional categorical stats
    stats.categorical = {
        totalAccidents: ukData.length,
        uniqueRegions: processedData.regions.length,
        uniqueSeverities: processedData.severities.length,
        rushHourAccidents: ukData.filter(d => d.IsRushHour).length,
        weekendAccidents: ukData.filter(d => d.IsWeekend).length,
        urbanAccidents: ukData.filter(d => d.IsUrban).length,
        fatalAccidents: ukData.filter(d => d.IsFatal).length,
        seriousAccidents: ukData.filter(d => d.IsSerious).length,
        multiVehicleAccidents: ukData.filter(d => d.IsMultiVehicle).length
    };

    return stats;
}

function calculateStdDev(values) {
    const mean = d3.mean(values);
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(d3.mean(squaredDiffs));
}

// Render descriptive statistics
function renderDescriptiveStats() {
    const stats = calculateDescriptiveStats();
    const container = document.getElementById('descriptive-stats');
    
    let html = '';
    
    // Categorical stats
    html += `
        <div class="stat-card">
            <h3>Total Accidents</h3>
            <div class="value">${stats.categorical.totalAccidents.toLocaleString()}</div>
            <div class="label">Records in dataset</div>
        </div>
        <div class="stat-card">
            <h3>Average Vehicles</h3>
            <div class="value">${stats.NumberOfVehicles.mean.toFixed(2)}</div>
            <div class="label">Per accident</div>
        </div>
        <div class="stat-card">
            <h3>Average Casualty Rate</h3>
            <div class="value">${stats.CasualtyRate.mean.toFixed(2)}</div>
            <div class="label">Per accident</div>
        </div>
        <div class="stat-card">
            <h3>Rush Hour Accidents</h3>
            <div class="value">${stats.categorical.rushHourAccidents.toLocaleString()}</div>
            <div class="label">${((stats.categorical.rushHourAccidents / stats.categorical.totalAccidents) * 100).toFixed(1)}% of total</div>
        </div>
        <div class="stat-card">
            <h3>Weekend Accidents</h3>
            <div class="value">${stats.categorical.weekendAccidents.toLocaleString()}</div>
            <div class="label">${((stats.categorical.weekendAccidents / stats.categorical.totalAccidents) * 100).toFixed(1)}% of total</div>
        </div>
        <div class="stat-card">
            <h3>Multi-Vehicle</h3>
            <div class="value">${stats.categorical.multiVehicleAccidents.toLocaleString()}</div>
            <div class="label">${((stats.categorical.multiVehicleAccidents / stats.categorical.totalAccidents) * 100).toFixed(1)}% of total</div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Hot Spot Analysis: Identify geographic clusters and calculate average severity
function identifyHotSpots() {
    // Use grid-based clustering for hot spots
    const gridSize = 0.01; // Approximately 1km grid
    const hotSpots = new Map();
    
    ukData.forEach(accident => {
        const latGrid = Math.floor(accident.Latitude / gridSize);
        const lonGrid = Math.floor(accident.Longitude / gridSize);
        const key = `${latGrid}_${lonGrid}`;
        
        if (!hotSpots.has(key)) {
            hotSpots.set(key, {
                lat: accident.Latitude,
                lon: accident.Longitude,
                accidents: [],
                count: 0,
                totalSeverity: 0
            });
        }
        
        const spot = hotSpots.get(key);
        spot.accidents.push(accident);
        spot.count++;
        spot.totalSeverity += accident.SeverityNumeric;
    });
    
    // Convert to array and calculate averages
    const hotSpotArray = Array.from(hotSpots.values())
        .filter(spot => spot.count >= 5) // Minimum 5 accidents to be a hot spot
        .map(spot => {
            const avgLat = d3.mean(spot.accidents.map(a => a.Latitude));
            const avgLon = d3.mean(spot.accidents.map(a => a.Longitude));
            // Get Local Authority name from the first accident in the cluster
            const sampleAccident = spot.accidents[0];
            const localAuthorityName = getLocalAuthorityName(sampleAccident);
            
            return {
                ...spot,
                avgSeverity: spot.totalSeverity / spot.count,
                avgVehicles: d3.mean(spot.accidents.map(a => a.NumberOfVehicles)),
                avgCasualties: d3.mean(spot.accidents.map(a => a.NumberOfCasualties)),
                lat: avgLat,
                lon: avgLon,
                localAuthorityName: localAuthorityName
            };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // Top 50 hot spots for heat map
    
    return hotSpotArray;
}

// Function to get Local Authority Highway name from accident data
function getLocalAuthorityName(accident) {
    // Try to get from ukFolderData if available (has Local_Authority_Highway field)
    if (accident.Local_Authority_Highway) {
        const code = accident.Local_Authority_Highway;
        const name = localAuthorityMap.get(code);
        if (name) return name;
    }
    
    // Fallback: try to find matching accident in ukFolderData by coordinates
    const matchingAccident = ukFolderData.find(d => 
        Math.abs(d.Latitude - accident.Latitude) < 0.001 && 
        Math.abs(d.Longitude - accident.Longitude) < 0.001
    );
    
    if (matchingAccident && matchingAccident.Local_Authority_Highway) {
        const code = matchingAccident.Local_Authority_Highway;
        const name = localAuthorityMap.get(code);
        if (name) return name;
    }
    
    // Final fallback: return coordinates
    return `${accident.Latitude.toFixed(3)}, ${accident.Longitude.toFixed(3)}`;
}

function renderHotSpotAnalysis() {
    const hotSpots = identifyHotSpots();
    
    const ctx = document.getElementById('hotspot-chart').getContext('2d');
    
    // Find min/max for normalization
    const maxCount = d3.max(hotSpots.map(s => s.count));
    const minCount = d3.min(hotSpots.map(s => s.count));
    const countRange = maxCount - minCount;
    
    // Create heat map data - use bubble chart to show intensity
    const heatMapData = hotSpots.map(spot => ({
        x: spot.lon,
        y: spot.lat,
        r: 5 + (15 * (spot.count - minCount) / countRange), // Bubble size based on count
        count: spot.count,
        name: spot.localAuthorityName,
        avgSeverity: spot.avgSeverity
    }));
    
    new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Accident Hot Spots',
                data: heatMapData,
                backgroundColor: (ctx) => {
                    const point = ctx.raw;
                    const intensity = (point.count - minCount) / countRange;
                    // Bigger bubbles are more transparent - use lighter pink color for better overlap visibility
                    const alpha = 0.2 + ((1 - intensity) * 0.25); // Range from 0.2 to 0.45 (more transparent for bigger)
                    return `rgba(255, 150, 180, ${alpha})`; // Lighter pink color
                },
                borderColor: (ctx) => {
                    const point = ctx.raw;
                    const intensity = (point.count - minCount) / countRange;
                    // Bigger bubbles have more transparent borders too - lighter color
                    const alpha = 0.4 + ((1 - intensity) * 0.25); // Range from 0.4 to 0.65
                    return `rgba(255, 150, 180, ${alpha})`; // Lighter pink color
                },
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Accident Hot Spots Heat Map (Bubble size = Accident count)'
                },
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `Location: ${point.name}`,
                                `Accidents: ${point.count}`,
                                `Avg Severity: ${point.avgSeverity.toFixed(2)}`,
                                `Coordinates: (${point.y.toFixed(4)}, ${point.x.toFixed(4)})`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Longitude'
                    }
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Latitude'
                    }
                }
            }
        }
    });
    
    // Display hot spot details
    const detailsContainer = document.getElementById('hotspot-details');
    const topSpots = hotSpots.slice(0, 10);
    let detailsHtml = '<h3>Top 10 Hot Spot Details</h3><ul>';
    
    topSpots.forEach((spot, i) => {
        detailsHtml += `
            <li>
                <strong>${spot.localAuthorityName}:</strong> 
                ${spot.count} accidents, 
                Avg Vehicles: ${spot.avgVehicles.toFixed(2)}, 
                Avg Casualty Rate: ${spot.avgCasualties.toFixed(2)}
                <br>
                <small>Coordinates: (${spot.lat.toFixed(4)}, ${spot.lon.toFixed(4)})</small>
            </li>
        `;
    });
    
    detailsHtml += '</ul>';
    detailsHtml += `<div class="insight">
        <strong>Key Insight:</strong> The most active hot spot is in ${hotSpots[0].localAuthorityName} 
        with ${hotSpots[0].count} accidents.
    </div>`;
    
    detailsContainer.innerHTML = detailsHtml;
}

// Time Trend Analysis
function analyzeTimeTrends() {
    // Monthly trends
    const monthlyData = d3.rollup(
        ukData,
        v => ({
            count: v.length,
            avgSeverity: d3.mean(v.map(d => d.SeverityNumeric)),
            totalCasualties: d3.sum(v.map(d => d.NumberOfCasualties))
        }),
        d => d.Month
    );
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthlyTrend = months.map((month, idx) => {
        const monthNum = idx + 1;
        const data = monthlyData.get(monthNum) || { count: 0, avgSeverity: 0, totalCasualties: 0 };
        return {
            month: month,
            monthNum: monthNum,
            ...data
        };
    });
    
    // Yearly trend (if multiple years exist)
    const yearlyData = d3.rollup(
        ukData,
        v => v.length,
        d => d.Year
    );
    
    const yearlyTrend = Array.from(yearlyData.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);
    
    return { monthlyTrend, yearlyTrend };
}

function renderTrendAnalysis() {
    const trends = analyzeTimeTrends();
    
    const ctx = document.getElementById('trend-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trends.monthlyTrend.map(t => t.month),
            datasets: [
                {
                    label: 'Number of Accidents',
                    data: trends.monthlyTrend.map(t => t.count),
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '20',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Average Severity',
                    data: trends.monthlyTrend.map(t => t.avgSeverity),
                    borderColor: colors.danger,
                    backgroundColor: colors.danger + '20',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Accident Trends Over Time'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Number of Accidents'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Average Severity'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
    
    // Calculate trend analysis
    const analysisContainer = document.getElementById('trend-analysis');
    const counts = trends.monthlyTrend.map(t => t.count);
    const firstHalf = counts.slice(0, 6);
    const secondHalf = counts.slice(6);
    const firstHalfAvg = d3.mean(firstHalf);
    const secondHalfAvg = d3.mean(secondHalf);
    const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    let analysisHtml = '<h3>Trend Analysis</h3>';
    analysisHtml += `<div class="insight">`;
    
    if (trends.yearlyTrend.length > 1) {
        const yearChange = ((trends.yearlyTrend[trends.yearlyTrend.length - 1].count - 
                           trends.yearlyTrend[0].count) / trends.yearlyTrend[0].count) * 100;
        analysisHtml += `<strong>Year-over-Year Change:</strong> ${yearChange > 0 ? '+' : ''}${yearChange.toFixed(2)}%`;
    } else {
        analysisHtml += `<strong>Note:</strong> This trend is only ${trends.yearlyTrend[0].year}. `;
    }
    
    analysisHtml += `<br><strong>First Half vs Second Half of Year:</strong> `;
    analysisHtml += `First 6 months average: ${firstHalfAvg.toFixed(0)} accidents/month, `;
    analysisHtml += `Last 6 months average: ${secondHalfAvg.toFixed(0)} accidents/month. `;
    analysisHtml += `Change: ${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
    analysisHtml += `</div>`;
    
    analysisContainer.innerHTML = analysisHtml;
}

// 5-Year Trend Analysis - Uses UK folder data
function renderFiveYearTrend() {
    // Use UK folder data for 5-year analysis
    const yearlyData = d3.rollup(
        ukFolderData,
        v => ({
            count: v.length,
            avgSeverity: d3.mean(v.map(d => d.Accident_Severity)),
            totalCasualties: d3.sum(v.map(d => d.NumberOfCasualties))
        }),
        d => d.Year
    );
    
    const years = Array.from(yearlyData.entries())
        .map(([year, data]) => ({ year, ...data }))
        .sort((a, b) => a.year - b.year);
    
    // Get years from 2010 onwards (last 5 years from 2010-2015)
    const displayYears = years.filter(y => y.year >= 2010).slice(0, 6);
    
    const ctx = document.getElementById('five-year-trend-chart');
    if (!ctx) return; // Chart container might not exist
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: displayYears.map(y => y.year),
            datasets: [
                {
                    label: 'Number of Accidents',
                    data: displayYears.map(y => y.count),
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '20',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Total Casualties',
                    data: displayYears.map(y => y.totalCasualties),
                    borderColor: colors.danger,
                    backgroundColor: colors.danger + '20',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `5-Year Accident Trend Analysis (${displayYears.length > 0 ? displayYears[0].year : ''} - ${displayYears.length > 0 ? displayYears[displayYears.length - 1].year : ''})`
                },
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Number of Accidents'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Total Casualties'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function renderMonthlyChart() {
    const trends = analyzeTimeTrends();
    
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: trends.monthlyTrend.map(t => t.month),
            datasets: [{
                label: 'Accidents per Month',
                data: trends.monthlyTrend.map(t => t.count),
                backgroundColor: trends.monthlyTrend.map((t, i) => 
                    `hsl(${220 + i * 10}, 70%, ${60 + (i % 3) * 5}%)`
                )
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Accident Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Accidents'
                    }
                }
            }
        }
    });
}

// Correlation Matrix
function calculateCorrelationMatrix() {
    const numericFields = [
        'SeverityNumeric',
        'NumberOfVehicles',
        'NumberOfCasualties',
        'SpeedLimit',
        'Hour',
        'CasualtyRate'
    ];
    
    const matrix = [];
    const labels = [];
    
    numericFields.forEach(field1 => {
        const row = [];
        const values1 = ukData.map(d => d[field1]).filter(v => !isNaN(v) && v !== null);
        
        if (values1.length === 0) return;
        
        labels.push(field1);
        
        numericFields.forEach(field2 => {
            const values2 = ukData.map(d => d[field2]).filter(v => !isNaN(v) && v !== null);
            
            if (values2.length === 0 || values1.length !== values2.length) {
                row.push(0);
                return;
            }
            
            // Calculate correlation
            const correlation = calculatePearsonCorrelation(values1, values2);
            row.push(correlation);
        });
        
        matrix.push(row);
    });
    
    return { matrix, labels };
}

function calculatePearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;
    
    const meanX = d3.mean(x);
    const meanY = d3.mean(y);
    
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;
    
    for (let i = 0; i < n; i++) {
        const diffX = x[i] - meanX;
        const diffY = y[i] - meanY;
        numerator += diffX * diffY;
        sumSqX += diffX * diffX;
        sumSqY += diffY * diffY;
    }
    
    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
}

function renderCorrelationMatrix() {
    const { matrix, labels } = calculateCorrelationMatrix();
    
    const ctx = document.getElementById('correlation-chart').getContext('2d');
    
    // Create a better correlation visualization using scatter/bubble chart approach
    // We'll show correlations as a matrix visualization
    const datasets = [];
    
    labels.forEach((label1, i) => {
        labels.forEach((label2, j) => {
            if (i <= j) { // Only show upper triangle to avoid duplication
                const corr = matrix[i][j];
                datasets.push({
                    label: `${label1} vs ${label2}`,
                    data: [{
                        x: j,
                        y: i,
                        v: corr
                    }],
                    backgroundColor: corr > 0 ? 
                        `rgba(102, 126, 234, ${Math.abs(corr)})` : 
                        `rgba(250, 112, 154, ${Math.abs(corr)})`,
                    pointRadius: Math.abs(corr) * 15 + 5
                });
            }
        });
    });
    
    // Alternative: Create a table-like visualization using bar chart
    const correlationPairs = [];
    const correlationValues = [];
    const correlationColors = [];
    
    for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
            correlationPairs.push(`${labels[i]} ↔ ${labels[j]}`);
            const corr = matrix[i][j];
            correlationValues.push(corr);
            correlationColors.push(corr > 0 ? 
                `rgba(102, 126, 234, ${0.6 + Math.abs(corr) * 0.4})` : 
                `rgba(250, 112, 154, ${0.6 + Math.abs(corr) * 0.4})`);
        }
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: correlationPairs,
            datasets: [{
                label: 'Correlation Coefficient',
                data: correlationValues,
                backgroundColor: correlationColors,
                borderColor: correlationColors.map(c => c.replace('0.', '1.')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Correlation Matrix Between Key Variables'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    min: -1,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Correlation Coefficient (-1 to 1)'
                    },
                    grid: {
                        color: (context) => {
                            if (context.tick.value === 0) return 'rgba(0, 0, 0, 0.3)';
                            return 'rgba(0, 0, 0, 0.1)';
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
    
    // Display correlation insights
    const insightsContainer = document.getElementById('correlation-insights');
    let insightsHtml = '<h3>Key Correlations</h3><ul>';
    
    for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
            const corr = matrix[i][j];
            if (Math.abs(corr) > 0.3) {
                const strength = Math.abs(corr) > 0.7 ? 'Strong' : 
                               Math.abs(corr) > 0.5 ? 'Moderate' : 'Weak';
                insightsHtml += `<li><strong>${labels[i]} vs ${labels[j]}:</strong> 
                    ${corr.toFixed(3)} (${strength} ${corr > 0 ? 'positive' : 'negative'} correlation)</li>`;
            }
        }
    }
    
    insightsHtml += '</ul>';
    insightsContainer.innerHTML = insightsHtml;
}

function renderRegionChart() {
    // Group accidents by hour
    const hourCounts = d3.rollup(
        ukData.filter(d => d.Hour !== null && !isNaN(d.Hour)),
        v => ({
            count: v.length,
            avgSeverity: d3.mean(v.map(d => d.SeverityNumeric))
        }),
        d => d.Hour
    );
    
    const hours = Array.from(hourCounts.entries())
        .map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
        .sort((a, b) => a.hour - b.hour);
    
    const ctx = document.getElementById('region-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours.map(h => `${h.hour}:00`),
            datasets: [
                {
                    label: 'Number of Accidents',
                    data: hours.map(h => h.count),
                    backgroundColor: colors.primary
                },
                {
                    label: 'Average Severity',
                    data: hours.map(h => h.avgSeverity),
                    backgroundColor: colors.danger,
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Accidents by Hour of Day'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Accidents'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Average Severity'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Map weather codes to actual weather names
function getWeatherName(weatherCode) {
    const weatherMap = {
        '1': 'Fine',
        '2': 'Raining',
        '3': 'Snowing',
        '4': 'Fine + Wind',
        '5': 'Raining + Wind',
        '6': 'Snowing + Wind',
        '7': 'Fog/Mist',
        '8': 'Other',
        '9': 'Unknown'
    };
    
    const code = String(weatherCode).trim();
    return weatherMap[code] || `Weather ${code}`;
}

// Check if weather should be excluded
function shouldExcludeWeather(weatherCode) {
    const code = String(weatherCode).trim();
    // Exclude: Other (8), Fog/Mist (7), Snowing (3), Snowing + Wind (6)
    return code === '8' || code === '7' || code === '3' || code === '6';
}

function renderWeatherChart() {
    // Filter out unknown weather conditions, excluded types, and map codes to names
    const weatherCounts = d3.rollup(
        ukData.filter(d => {
            const weatherCode = String(d.Weather).trim();
            return weatherCode !== '9' && weatherCode !== 'Unknown' && weatherCode !== '' && !shouldExcludeWeather(weatherCode);
        }),
        v => ({
            count: v.length,
            avgSeverity: d3.mean(v.map(d => d.SeverityNumeric))
        }),
        d => d.Weather
    );
    
    const weather = Array.from(weatherCounts.entries())
        .map(([weatherCode, data]) => ({ 
            weatherCode, 
            weatherName: getWeatherName(weatherCode),
            ...data 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 weather conditions
    
    const ctx = document.getElementById('weather-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weather.map(w => w.weatherName),
            datasets: [{
                label: 'Number of Accidents',
                data: weather.map(w => w.count),
                backgroundColor: weather.map((w, i) => 
                    `hsl(${200 + i * 20}, 70%, ${50 + (i % 3) * 10}%)`
                )
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Accidents by Weather Condition (Top 10)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Accidents'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// 5-Year Weather Trend Analysis - Uses UK folder data
function renderFiveYearWeather() {
    // Use UK folder data for 5-year weather analysis
    // Filter out unknown weather conditions and excluded weather types
    const filteredData = ukFolderData.filter(d => {
        const weatherCode = String(d.Weather_Conditions).trim();
        return weatherCode !== '9' && weatherCode !== 'Unknown' && weatherCode !== '' && weatherCode !== '-1' && !shouldExcludeWeather(weatherCode);
    });
    
    // Group by year and weather condition
    const yearWeatherData = d3.rollup(
        filteredData,
        v => v.length,
        d => d.Year,
        d => d.Weather_Conditions
    );
    
    const years = Array.from(yearWeatherData.keys()).sort();
    
    // Get top weather conditions overall
    const weatherCounts = d3.rollup(
        filteredData,
        v => v.length,
        d => d.Weather_Conditions
    );
    
    // Get specific weather conditions: Fine, Raining, Fine + Wind, Raining + Wind
    const selectedWeatherCodes = ['1', '2', '4', '5']; // Fine, Raining, Fine + Wind, Raining + Wind
    const topWeather = Array.from(weatherCounts.entries())
        .map(([code, count]) => ({ code, count, name: getWeatherName(code) }))
        .filter(w => selectedWeatherCodes.includes(w.code))
        .sort((a, b) => {
            // Custom sort: Fine, Raining, Fine + Wind, Raining + Wind
            const order = { '1': 1, '2': 2, '4': 3, '5': 4 };
            return (order[a.code] || 999) - (order[b.code] || 999);
        });
    
    // Get years from 2010 onwards (last 5 years from 2010-2015)
    const displayYears = years.filter(y => y >= 2010).slice(0, 6);
    
    const ctx = document.getElementById('five-year-weather-chart');
    if (!ctx) return; // Chart container might not exist
    
    const datasets = topWeather.map((weather, i) => {
        const data = displayYears.map(year => {
            const yearData = yearWeatherData.get(year);
            return yearData ? (yearData.get(weather.code) || 0) : 0;
        });
        
        return {
            label: weather.name,
            data: data,
            borderColor: `hsl(${200 + i * 40}, 70%, 50%)`,
            backgroundColor: `hsla(${200 + i * 40}, 70%, 50%, 0.2)`,
            tension: 0.4,
            fill: false
        };
    });
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: displayYears.map(y => y),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `5-Year Weather Trend Analysis (${displayYears.length > 0 ? displayYears[0] : ''} - ${displayYears.length > 0 ? displayYears[displayYears.length - 1] : ''})`
                },
                legend: {
                    display: true,
                    position: 'right'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Accidents'
                    }
                }
            }
        }
    });
}

