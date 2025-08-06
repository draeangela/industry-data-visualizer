# 📈 Industry Data Visualizer - Frontend

## 📁 Project Structure:
```
IDV_frontend/
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
└── index.html

```

## 🧪 Running the App

### 1. Start server

At the root of the directory, run:

```bash
py -m http.server 9080
```

This will open the app in the browser at:

```
http://localhost:9080
```

