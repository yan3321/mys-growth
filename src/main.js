const ctx_line = document.getElementById('lineChart').getContext('2d');

function createGradient(ctx, x) {
    let gradient = ctx.createLinearGradient(0, 0, x, 0);
    gradient.addColorStop(0, '#109341');
    gradient.addColorStop(1, '#00B342');
    return gradient;
}

// Bar chart

const lineChartData = {
    labels: [],
    datasets: [{
        label: 'Member count',
        // backgroundColor: createGradient(ctx_line, 1920),
        backgroundColor: 'rgba(0, 100, 200, .7)',
        borderWidth: 2,
        data: []
    }]
}

const lineChart = new Chart(ctx_line, {
    type: 'line',
    data: lineChartData,
    options: {
        scales: {
            xAxes: [{
                type: 'time',
                distribution: 'linear',
                time: {
                    unit: 'month',
                    tooltipFormat: 'DD MMM YYYY'
                },
                ticks: {
                    source: 'auto',
                },
                gridLines: {
                    zeroLineColor: 'rgba(0, 0, 0, 0.1)',
                }
            }],
            yAxes: [{
                type: 'linear',
            }]

        },
        maintainAspectRatio: false,
        onResize: (chart, size) => {
            // lineChartData.datasets[0].backgroundColor = createGradient(ctx_line, size.width);
        }
    }
});

lineChart.canvas.parentNode.style.height = '64vh';

let autoUpdate = false;
let currentMode = 'full';

// Modes
let cachedData = false;

function updateView(viewMode = currentMode, data = cachedData) {

    let month_array = [];

    // Bar chart
    const array_labels = [];
    const array_memberCount = [];

    let lastMonth = false;
    let currentYear = false;

    data.forEach((snapshot, index) => {
        const isoTimestamp = snapshot[0];
        const memberCount = snapshot[1];

        const timestampDate = new Date(isoTimestamp);
        const timeLabel = timestampDate.toDateString();

        const thisMonth = timestampDate.getMonth();
        const thisYear = timestampDate.getFullYear();

        if ((lastMonth != 0 && !lastMonth) || (lastMonth != thisMonth)) {
            lastMonth = thisMonth;
            month_array.push({ date: timestampDate, year: thisYear, month: thisMonth, members: memberCount });
        }

        if (viewMode == 'full') {
            const sampleObject = {
                t: timestampDate,
                y: memberCount
            }
            array_memberCount.push(sampleObject);
            lineChartData.datasets[0].data = array_memberCount;

            // array_labels.push(timeLabel);
            // lineChartData.labels = array_labels;
        }
    });

    // Calculate average monthly growth
    let averageMonthlyGrowth = 0;
    let sumMonthlyGrowth = 0;
    let validMonths = 0;
    month_array.forEach((currentMonth, index) => {
        month_array[index].monthlyGrowth = false;
        // month_array[index].growthSinceLastMonth = false;
        const previousMonthIndex = index - 1;
        if (previousMonthIndex in month_array) {
            const previousMonth = month_array[previousMonthIndex];
            const monthlyGrowth = currentMonth.members - previousMonth.members;
            month_array[previousMonthIndex].monthlyGrowth = monthlyGrowth;
            // month_array[index].growthSinceLastMonth = monthlyGrowth;
            if (validMonths <= 6) {
                sumMonthlyGrowth += monthlyGrowth;
                validMonths++;
            }
        }

        if (viewMode == 'month') {
            const sampleObject = {
                t: currentMonth.date,
                y: currentMonth.members
            }
            array_memberCount.push(sampleObject);
            lineChartData.datasets[0].data = array_memberCount;

            // array_labels.push(currentMonth.date.toDateString());
            // lineChartData.labels = array_labels;
        }
    });

    // console.log(month_array);
    // console.log(getHighestGrowthMonth());

    const latestMembers = data[data.length - 1][1];

    averageMonthlyGrowth = sumMonthlyGrowth / validMonths;

    document.getElementById('averageMonthlyGrowth').innerHTML = Math.round(averageMonthlyGrowth) + ' members';
    document.getElementById('averageMonthlyGrowthValue').innerHTML = `(+${((averageMonthlyGrowth / latestMembers) * 100).toFixed(2)}%)`;

    // Average daily growth

    let averageDailyGrowth = 0;
    let sumDailyGrowth = 0;
    let validDays = 0;

    for (let index = data.length - 1; index > data.length - 7; index--) {
        let previousDay = data[index - 1];
        if (previousDay) {
            const day = data[index];
            const dailyGrowth = day[1] - previousDay[1];
            sumDailyGrowth += dailyGrowth;
            validDays++;
        }
    }

    averageDailyGrowth = sumDailyGrowth / validDays;

    document.getElementById('averageDailyGrowth').innerHTML = Math.round(averageDailyGrowth) + ' members';
    document.getElementById('averageDailyGrowthValue').innerHTML = `(+${((averageDailyGrowth / latestMembers) * 100).toFixed(2)}%)`;

    // Highest growth month

    function getHighestGrowthMonth() {
        let highestIndex = 0;
        let currentTotal = 0;
        month_array.forEach((currentMonth, index) => {
            const monthlyGrowth = currentMonth.monthlyGrowth;
            if (monthlyGrowth) {
                if (monthlyGrowth > currentTotal) {
                    currentTotal = currentMonth.monthlyGrowth;
                    highestIndex = index;
                }
            }
        });
        return month_array[highestIndex];
    }

    document.getElementById('highestGrowthMonth').innerHTML = getHighestGrowthMonth().date.toLocaleString('default', { month: 'short', year: 'numeric' });
    document.getElementById('highestGrowthValue').innerHTML = `(+${getHighestGrowthMonth().monthlyGrowth})`;

    lineChart.update();
}

async function updateData() {
    fetch('https://mys-growth-api.yan3321.workers.dev/')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            return Promise.reject('Error occured getting API data');
        })
        .then(responseData => {
            // Last updated text
            document.getElementById('textLastUpdated').innerHTML = `Data last updated ${new Date().toString()}`;
            // Update charts and etc.
            updateView(undefined, responseData);
            cachedData = responseData;
        })
        .catch(error => console.error(error));
}

updateData();
const updateInterval = 30000;
let updateIntervalRunner = false;
if (autoUpdate) {
    updateIntervalRunner = setInterval(updateData, updateInterval);
}

// const autoUpdateButton = document.getElementById('autoUpdateButton');

// function updateAutoUpdateButtonState() {
//     if (autoUpdate) {
//         autoUpdate = false;
//         clearInterval(updateIntervalRunner);
//         autoUpdateButton.innerHTML = 'Auto-Update OFF';
//         autoUpdateButton.classList.add("btn-danger");
//         autoUpdateButton.classList.remove("btn-primary");
//     } else {
//         autoUpdate = true;
//         updateData();
//         updateIntervalRunner = setInterval(updateData, updateInterval);
//         autoUpdateButton.innerHTML = 'Auto-Update ON';
//         autoUpdateButton.classList.add("btn-primary");
//         autoUpdateButton.classList.remove("btn-danger");
//     }
// }

// autoUpdateButton.addEventListener('click', updateAutoUpdateButtonState);

const toggleViewButton = document.getElementById('viewToggleButton');

function updateToggleViewButtonState() {
    if (currentMode == 'full') {
        currentMode = 'month';
        updateView(currentMode);
        toggleViewButton.innerHTML = 'Full View';
        toggleViewButton.classList.add("btn-secondary");
        toggleViewButton.classList.remove("btn-primary");
    } else {
        currentMode = 'full';
        updateView(currentMode);
        toggleViewButton.innerHTML = 'Monthly View';
        toggleViewButton.classList.add("btn-primary");
        toggleViewButton.classList.remove("btn-secondary");
    }
    // console.log("yeeetdsadsa")
}

toggleViewButton.addEventListener('click', updateToggleViewButtonState);