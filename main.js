let nutritionChart;
let allData = [];

// Load CSV when page opens
loadCSVData();

async function loadCSVData() {
  try {
    const response = await fetch("data.csv");
    const csvText = await response.text();

    const data = parseCSV(csvText);
    allData = data;

    createChart(data, "protein_g");
    createGallery(data);
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
  }

  metricSelect.addEventListener("change", updateView);
  categorySelect.addEventListener("change", updateView);
  sortSelect.addEventListener("change", updateView);
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

    gallery.appendChild(card);
  });
}