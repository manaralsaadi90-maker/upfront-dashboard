const comparisonFoods = [
  { name: "Egg", protein_g: 6.3, sugar_g: 0, calories_kcal: 72, image: "egg.jpg" },
  { name: "Milk", protein_g: 8, sugar_g: 12, calories_kcal: 150, image: "milk.jpg" },
  { name: "Banana", protein_g: 1.3, sugar_g: 14, calories_kcal: 105, image: "banana.jpg" },
  { name: "Apple", protein_g: 1, sugar_g: 19, calories_kcal: 95, image: "apple.jpg" }
];
let comparisonChartInstance = null;
let nutritionChart;
let allData = [];
const FILTER_STATE_KEY = "upfrontDashboardFilters";

// Load CSV when page opens
loadCSVData();

async function loadCSVData() {
  try {
    const response = await fetch("data.csv");
    const csvText = await response.text();

    const data = parseCSV(csvText);
    allData = data;

    setupMetricFilter();

    console.log("Loaded data:", data);
  } catch (error) {
    console.error("Error loading CSV:", error);
  }
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(header => header.trim());
  const rows = lines.slice(1);

  return rows.map((row) => {
    const values = row.split(",").map(value => value.trim());
    const item = {};

    headers.forEach((header, index) => {
      item[header] = values[index];
    });

    item.protein_g = Number(item.protein_g);
    item.sugar_g = Number(item.sugar_g);
    item.calories_kcal = Number(item.calories_kcal);
    item.weight_g = Number(item.weight_g);

    return item;
  });
}

/** Bar fill: lighter = lower value, darker = higher (same hue as dashboard orange). */
function barFillColor(value, minValue, maxValue) {
  const t = maxValue === minValue ? 1 : (value - minValue) / (maxValue - minValue);
  const lightness = 88 - t * 73;
  return "hsl(32, 92%, " + lightness + "%)";
}

function barBorderColor(value, minValue, maxValue) {
  const t = maxValue === minValue ? 1 : (value - minValue) / (maxValue - minValue);
  const lightness = 76 - t * 64;
  return "hsl(32, 88%, " + lightness + "%)";
}

function formatMetricValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function updateChartColorLegend(metric, labelMap, minValue, maxValue) {
  const legendEl = document.getElementById("chartColorLegend");
  if (!legendEl) {
    return;
  }

  const unit = labelMap[metric] || "";
  legendEl.innerHTML =
    '<div class="chart-legend-scale">' +
    '<span class="chart-legend-label">Lower ' + unit + "</span>" +
    '<div class="chart-legend-gradient" style="background: linear-gradient(90deg, hsl(32, 92%, 88%), hsl(32, 92%, 15%));" role="img" aria-label="Color scale from light to dark"></div>' +
    '<span class="chart-legend-label">Higher ' + unit + "</span>" +
    "</div>" +
    '<p class="chart-legend-caption">' +
    "Each bar is colored by its value in the current view: <strong>lighter = lower</strong>, <strong>darker = higher</strong>. " +
    "Range shown: " +
    formatMetricValue(minValue) +
    " → " +
    formatMetricValue(maxValue) +
    " " +
    unit +
    "." +
    "</p>";
}

function createChart(data, metric) {
  const labelMap = {
    protein_g: "Protein (g)",
    sugar_g: "Sugar (g)",
    calories_kcal: "Calories (kcal)"
  };

  const labels = data.map(item => item.flavor);
  const values = data.map(item => item[metric]);

  if (!values.length) {
    const legendEl = document.getElementById("chartColorLegend");
    if (legendEl) {
      legendEl.innerHTML = "";
    }
    const topText = document.getElementById("topProduct");
    if (topText) {
      topText.innerText = "";
    }
    if (nutritionChart) {
      nutritionChart.destroy();
      nutritionChart = null;
    }
    return;
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const topIndex = values.indexOf(maxValue);
  const topItem = data[topIndex];

  const backgroundColors = values.map(value => barFillColor(value, minValue, maxValue));
  const borderColors = values.map(value => barBorderColor(value, minValue, maxValue));

  updateChartColorLegend(metric, labelMap, minValue, maxValue);

  const topText = document.getElementById("topProduct");
  if (topText && topItem) {
    topText.innerText =
      "Top product: " + topItem.flavor + " — " + maxValue + " " + labelMap[metric];
  }

  const ctx = document.getElementById("nutritionChart").getContext("2d");

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1100,
      easing: "easeOutQuart"
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          afterLabel: function(context) {
            const series = context.chart.data.datasets[context.datasetIndex].data;
            const maxVal = Math.max.apply(null, series);
            const value = context.parsed.y !== undefined ? context.parsed.y : context.raw;
            const lines = ["Darker color = higher value in this view"];
            if (value === maxVal) {
              lines.push("Highest in current view");
            }
            return lines.join("\n");
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: labelMap[metric],
          color: "#333",
          font: { size: 12, weight: "600" }
        },
        grid: {
          color: "#eeeeee"
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  if (nutritionChart) {
    nutritionChart.data.labels = labels;
    nutritionChart.data.datasets[0].label = labelMap[metric];
    nutritionChart.data.datasets[0].data = values;
    nutritionChart.data.datasets[0].backgroundColor = backgroundColors;
    nutritionChart.data.datasets[0].borderColor = borderColors;
    nutritionChart.options.scales.y.title.text = labelMap[metric];
    nutritionChart.update();
    return;
  }

  nutritionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: labelMap[metric],
          data: values,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 8
        }
      ]
    },
    options: chartOptions
  });
}

function setupMetricFilter() {
  const metricSelect = document.getElementById("metricSelect");
  const categorySelect = document.getElementById("categorySelect");
  const sortSelect = document.getElementById("sortSelect");

  if (!metricSelect || !categorySelect || !sortSelect) return;

  function readStoredFilterState() {
    const defaultState = {
      metric: "protein_g",
      category: "all",
      sortOrder: "default"
    };

    try {
      const raw = localStorage.getItem(FILTER_STATE_KEY);
      if (!raw) return defaultState;
      const parsed = JSON.parse(raw);

      return {
        metric: parsed.metric || defaultState.metric,
        category: parsed.category || defaultState.category,
        sortOrder: parsed.sortOrder || defaultState.sortOrder
      };
    } catch (error) {
      return defaultState;
    }
  }

  function storeFilterState(state) {
    localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(state));
  }

  const savedState = readStoredFilterState();
  metricSelect.value = savedState.metric;
  categorySelect.value = savedState.category;
  sortSelect.value = savedState.sortOrder;

  function updateView() {
    const metric = metricSelect.value;
    const category = categorySelect.value;
    const sortOrder = sortSelect.value;

    let filteredData = [...allData];

    if (category !== "all") {
      filteredData = filteredData.filter(function (item) {
        return item.category === category;
      });
    }

    if (sortOrder === "highToLow") {
      filteredData.sort(function (a, b) {
        return b[metric] - a[metric];
      });
    } else if (sortOrder === "lowToHigh") {
      filteredData.sort(function (a, b) {
        return a[metric] - b[metric];
      });
    }

    createChart(filteredData, metric);
    createGallery(filteredData);

    storeFilterState({
      metric: metric,
      category: category,
      sortOrder: sortOrder
    });
  }

  metricSelect.addEventListener("change", updateView);
  categorySelect.addEventListener("change", updateView);
  sortSelect.addEventListener("change", updateView);

  updateView();
}

function createGallery(data) {
  const gallery = document.getElementById("productGallery");
  gallery.innerHTML = "";

  data.forEach((item) => {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <img src="images/${item.image}" alt="${item.flavor}">
      <h3>${item.flavor}</h3>
      <p><strong>Category:</strong> ${item.category}</p>
      <p><strong>Protein:</strong> ${item.protein_g} g</p>
      <p><strong>Sugar:</strong> ${item.sugar_g} g</p>
      <p><strong>Calories:</strong> ${item.calories_kcal} kcal</p>
    `;
    card.addEventListener("click", () => {
      showComparison(item);
    });

    gallery.appendChild(card);
  });
}
function destroyComparisonChart() {
  if (comparisonChartInstance) {
    comparisonChartInstance.destroy();
    comparisonChartInstance = null;
  }
}

function closeComparisonModal() {
  const modal = document.getElementById("comparisonModal");
  if (modal) {
    modal.classList.remove("show");
  }
  destroyComparisonChart();
}

function initComparisonModal() {
  const modal = document.getElementById("comparisonModal");
  const closeBtn = document.getElementById("closeComparisonModal");
  if (!modal || !closeBtn || initComparisonModal.done) {
    return;
  }
  initComparisonModal.done = true;
  closeBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closeComparisonModal();
  });
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeComparisonModal();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initComparisonModal);
} else {
  initComparisonModal();
}

function showComparison(product) {
  const modal = document.getElementById("comparisonModal");
  const modalBody = document.getElementById("comparisonModalBody");

  destroyComparisonChart();

  const proteinSeries = comparisonFoods.map((food) =>
    food.protein_g > 0 ? product.protein_g / food.protein_g : null
  );
  const sugarSeries = comparisonFoods.map((food) =>
    food.sugar_g > 0 ? product.sugar_g / food.sugar_g : null
  );
  const caloriesSeries = comparisonFoods.map((food) =>
    food.calories_kcal > 0 ? product.calories_kcal / food.calories_kcal : null
  );

  let comparisonHTML = `
    <div class="comparison-layout">
      <div class="comparison-intro">
        <span class="comparison-badge">Benchmark</span>
        <h2 class="comparison-title">Real food comparison</h2>
        <p class="comparison-lead">One bar vs common whole foods — multipliers show how many portions match the bar for each nutrient.</p>
      </div>

      <div class="selected-product-box selected-product-box--modal">
        <div class="selected-product-box__media">
          <img src="images/${product.image}" alt="${product.flavor}">
        </div>
        <div class="selected-product-box__meta">
          <h3>${product.flavor}</h3>
          <p class="selected-product-box__category">${product.category}</p>
          <ul class="selected-product-nutrients">
            <li><span>Protein</span><strong>${product.protein_g} g</strong></li>
            <li><span>Sugar</span><strong>${product.sugar_g} g</strong></li>
            <li><span>Calories</span><strong>${product.calories_kcal} kcal</strong></li>
          </ul>
        </div>
      </div>

      <div class="comparison-chart-section">
        <h3 class="comparison-chart-heading">Multiplier by food</h3>
        <p class="comparison-chart-hint">Grouped bars: protein (dark), sugar (orange), calories (amber). Higher = more portions of that food to match one bar.</p>
        <div class="comparison-chart-box">
          <canvas id="comparisonChartCanvas" height="240"></canvas>
        </div>
      </div>

      <h3 class="comparison-cards-heading">At a glance</h3>
      <div class="comparison-grid">
  `;

  comparisonFoods.forEach((food) => {
    const proteinRatio = food.protein_g > 0 ? (product.protein_g / food.protein_g).toFixed(1) : "—";
    const sugarRatio = food.sugar_g > 0 ? (product.sugar_g / food.sugar_g).toFixed(1) : "—";
    const caloriesRatio = food.calories_kcal > 0 ? (product.calories_kcal / food.calories_kcal).toFixed(1) : "—";

    comparisonHTML += `
      <div class="compare-card">
        <div class="compare-card__img-wrap">
          <img src="images/${food.image}" alt="${food.name}">
        </div>
        <h4>${food.name}</h4>
        <ul class="compare-card__stats">
          <li><span>Protein</span><strong>${proteinRatio}×</strong></li>
          <li><span>Sugar</span><strong>${sugarRatio}×</strong></li>
          <li><span>Calories</span><strong>${caloriesRatio}×</strong></li>
        </ul>
      </div>
    `;
  });

  comparisonHTML += `
      </div>
    </div>
  `;

  modalBody.innerHTML = comparisonHTML;
  modal.classList.add("show");

  const canvas = document.getElementById("comparisonChartCanvas");
  if (canvas && typeof Chart !== "undefined") {
    const labels = comparisonFoods.map((f) => f.name);
    comparisonChartInstance = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Protein (×)",
            data: proteinSeries,
            backgroundColor: "rgba(17, 17, 17, 0.88)",
            borderColor: "#000",
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.85,
            categoryPercentage: 0.65
          },
          {
            label: "Sugar (×)",
            data: sugarSeries,
            backgroundColor: "rgba(244, 166, 64, 0.92)",
            borderColor: "#d8891e",
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.85,
            categoryPercentage: 0.65
          },
          {
            label: "Calories (×)",
            data: caloriesSeries,
            backgroundColor: "rgba(232, 126, 34, 0.85)",
            borderColor: "#c86b1a",
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.85,
            categoryPercentage: 0.65
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 950,
          easing: "easeOutQuart"
        },
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { size: 12, weight: "600" }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const v = ctx.raw;
                if (v === null || v === undefined || Number.isNaN(v)) {
                  return ctx.dataset.label + ": n/a";
                }
                return ctx.dataset.label + ": " + Number(v).toFixed(2) + "×";
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Multiplier (×) vs one portion of each food",
              font: { size: 12, weight: "600" }
            },
            grid: { color: "rgba(0,0,0,0.06)" }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }
}
