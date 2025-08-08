# 📈 Industry Data Visualizer - Frontend

This project provides an interactive data visualization dashboard developed for **ARGA Investment Management, LP.** The platform is designed to empower analysts by visualizing both historical and forecasted data from **internal company sources** and the **Federal Reserve Economic Data (FRED) API.** The dashboard supports the analysis of various time series, allowing for the plotting of multiple datasets in a single, unified view. Key features include highly customizable filtering options, enabling analysts to efficiently compare and analyze data for in-depth market analysis and strategic planning.

<img width="1917" height="1163" alt="Screenshot 2025-08-08 150134" src="https://github.com/user-attachments/assets/99bf079e-c23c-4ed9-9729-1e7516a2b2ab" />
<img width="1871" height="1099" alt="Screenshot 2025-08-08 150333" src="https://github.com/user-attachments/assets/8bc9ef1c-e719-47c1-8106-62b55402dd87" />
<img width="1913" height="1125" alt="Screenshot 2025-08-08 150314" src="https://github.com/user-attachments/assets/60ddb277-aa67-40c9-bcb0-0df892626ea6" />

---

## 📄 Data Sources

This dashboard is designed to connect with two primary data sources:
1.  **Internal Company Data:** A custom backend service pulls proprietary historical and forecasted data from **ARGA Investment Management, LP's** internal systems for industry analysis.
2.  **External Economic Data:** The application integrates directly with the **Federal Reserve Economic Data (FRED) API** to retrieve a comprehensive range of macroeconomic indicators.

---

## 🦾 Tech Stack
- Python
- Javascript
- Apache ECharts
- HTML & CSS

---

## 📁 Project Structure:
```
industry-data-visualizer/
├── static/
│   ├── css/
│   │   └── style.css
│   ├── html/
│   │   ├── sector_page.html
│   │   ├── series_details_popup.html
│   │   └── series_viewer.html
│   └── js/
│       ├── sector_page/
│       │   └── sectorPageLogic.js
│       ├── series_viewer/
│       │   ├── chartManager.js
│       │   ├── colorManager.js
│       │   ├── popupManager.js
│       │   ├── searchManager.js
│       │   ├── seriesViewerLogic.js
│       │   └── sidebarManager.js
│       ├── dataFetch.js
│       ├── main.js
│       └── state.js
├── LICENSE
├── README.md
└── index.html

```

---

## 🧪 Running the App

### 1. Install Python

If you do not have Python installed, you can download it from the official website: [https://www.python.org/downloads/](https://www.python.org/downloads/)

### 2. Start server

At the root of the directory, run:

```bash
py -m http.server 9080
```

This will open the app in the browser at:
```
http://localhost:9080
```

### Placeholder & Planned Features

As part of the project's design phase, several features were included as visual placeholders to support future development. These features were not implemented but were designed to be part of the final product:

- **Industry Model Dropdown:** A component for selecting different industry models.
- **Data Management Buttons:** Save, Save as, Share, and Download (Data) buttons.
- **Global Search:** "Search All" dropdown in "Edit Chart" sidebar - a feature that will search for specific data series across all industry models and fred sectors. 

---
## 🧾 License
This project is licensed under the [MIT License](LICENSE).

---

## 🙋‍♂️ Maintainer

Drae Angela Vizcarra
GitHub: [@draeangela](https://github.com/draeangela)



