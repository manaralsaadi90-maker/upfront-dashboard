const comparisonFoods = [
  { name: "Egg", protein_g: 6.3, sugar_g: 0, calories_kcal: 72, image: "egg.jpg" },
  { name: "Milk", protein_g: 8, sugar_g: 12, calories_kcal: 150, image: "milk.jpg" },
  { name: "Banana", protein_g: 1.3, sugar_g: 14, calories_kcal: 105, image: "banana.jpg" },
  { name: "Apple", protein_g: 1, sugar_g: 19, calories_kcal: 95, image: "apple.jpg" }
];
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

function createChart(data, metric) {
  const labelMap = {
    protein_g: "Protein (g)",
    sugar_g: "Sugar (g)",
    calories_kcal: "Calories (kcal)"
  };

  const labels = data.map(item => item.flavor);
  const values = data.map(item => item[metric]);

  const maxValue = Math.max(...values);
  const topIndex = values.indexOf(maxValue);
  const topItem = data[topIndex];

  const backgroundColors = values.map(value =>
    value === maxValue ? "#111111" : "#f4a640"
  );

  const borderColors = values.map(value =>
    value === maxValue ? "#000000" : "#d8891e"
  );

  const topText = document.getElementById("topProduct");
  if (topText && topItem) {
    topText.innerText =
      "Top product: " + topItem.flavor + " — " + maxValue + " " + labelMap[metric];
  }

  const ctx = document.getElementById("nutritionChart").getContext("2d");

  if (nutritionChart) {
    nutritionChart.destroy();
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
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              if (context.raw === maxValue) {
                return "Top value in current view";
              }
              return "";
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
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
    }
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
function showComparison(product) {
  const modal = document.getElementById("comparisonModal");
  const modalBody = document.getElementById("comparisonModalBody");

  let comparisonHTML = `
    <h2 class="comparison-title">Real Food Comparison</h2>

    <div class="selected-product-box">
      <img src="images/${product.image}" alt="${product.flavor}">
      <div>
        <h3>${product.flavor}</h3>
        <p><strong>Category:</strong> ${product.category}</p>
        <p><strong>Protein:</strong> ${product.protein_g} g</p>
        <p><strong>Sugar:</strong> ${product.sugar_g} g</p>
        <p><strong>Calories:</strong> ${product.calories_kcal} kcal</p>
      </div>
    </div>

    <div class="comparison-grid">
  `;

  comparisonFoods.forEach(food => {
    const proteinRatio = food.protein_g > 0 ? (product.protein_g / food.protein_g).toFixed(1) : "-";
    const sugarRatio = food.sugar_g > 0 ? (product.sugar_g / food.sugar_g).toFixed(1) : "-";
    const caloriesRatio = food.calories_kcal > 0 ? (product.calories_kcal / food.calories_kcal).toFixed(1) : "-";

    comparisonHTML += `
      <div class="compare-card show">
        <img src="images/${food.image}" alt="${food.name}">
        <h4>${food.name}</h4>
        <p><strong>Protein:</strong> ${proteinRatio}x</p>
        <p><strong>Sugar:</strong> ${sugarRatio}x</p>
        <p><strong>Calories:</strong> ${caloriesRatio}x</p>
      </div>
    `;
  });
  const comparisonModal = document.getElementById("comparisonModal");
  const closeComparisonModal = document.getElementById("closeComparisonModal");
  
  closeComparisonModal.addEventListener("click", function () {
    comparisonModal.classList.remove("show");
  });
  
  comparisonModal.addEventListener("click", function (event) {
    if (event.target === comparisonModal) {
      comparisonModal.classList.remove("show");
    }
  });
  comparisonHTML += `</div>`;

  modalBody.innerHTML = comparisonHTML;
  modal.classList.add("show");
}
