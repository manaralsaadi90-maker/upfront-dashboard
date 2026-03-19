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
  
    const labels = data.map(function(item) {
      return item.flavor;
    });
  
    const values = data.map(function(item) {
      return item[metric];
    });
  
    const maxValue = Math.max(...values);

    const topIndex = values.indexOf(maxValue);
const topItem = data[topIndex];

document.getElementById("topProduct").innerText =
  "Top product: " + topItem.flavor + " (" + maxValue + ")";
  
    const backgroundColors = values.map(function(value) {
      if (value === maxValue) {
        return "#2c3e50";
      } else {
        return "#f4a640";
      }
    });
  
    const borderColors = values.map(function(value) {
      if (value === maxValue) {
        return "#1a252f";
      } else {
        return "#d8891e";
      }
    });
  
    const canvas = document.getElementById("nutritionChart");
    const ctx = canvas.getContext("2d");
  
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
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            beginAtZero: true
          }
        }
      }
    });
  }

function setupMetricFilter() {
    const metricSelect = document.getElementById("metricSelect");
    const categorySelect = document.getElementById("categorySelect");
    const sortSelect = document.getElementById("sortSelect");
  
    function updateChart() {
      const metric = metricSelect.value;
      const category = categorySelect.value;
      const sortOrder = sortSelect.value;
  
      let filteredData = [...allData];
  
      if (category !== "all") {
        filteredData = filteredData.filter(function(item) {
          return item.category === category;
        });
      }
  
      if (sortOrder === "highToLow") {
        filteredData.sort(function(a, b) {
          return b[metric] - a[metric];
        });
      } else if (sortOrder === "lowToHigh") {
        filteredData.sort(function(a, b) {
          return a[metric] - b[metric];
        });
      }
  
      createChart(filteredData, metric);
      createGallery(filteredData);
    }
  
    metricSelect.addEventListener("change", updateChart);
    categorySelect.addEventListener("change", updateChart);
    sortSelect.addEventListener("change", updateChart);
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