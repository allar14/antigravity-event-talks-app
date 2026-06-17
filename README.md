# BQ Release Radar 🚀

BQ Release Radar is a sleek, modern Python Flask web application that parses the Google Cloud BigQuery RSS Release Notes feed and presents them in a beautiful, interactive dashboard. It allows users to quickly search, filter, and share individual release updates directly to Twitter/X via custom formatted drafts.

---

## 🌟 Key Features

* **Real-time RSS Aggregation**: Parses the raw BigQuery Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
* **H3-Based Parsing**: Automatically breaks down daily consolidated entries into individual, granular cards (separating features, announcements, deprecations, and issues).
* **Caching (5-Min TTL)**: Includes in-memory caching to optimize response speeds and prevent Google rate limits, with a manual refresh force override.
* **Premium Glassmorphic UI**: Beautiful dark interface with floating radial gradient blobs, transition animations, and responsive layouts.
* **Interactive Statistics Widgets**: Dashboard count widgets that show total counts for Features, Announcements, and Issues. Clicking a widget filters the grid.
* **Fuzzy Search & Filters**: Clean client-side search by date, type, or update description.
* **Smart Tweet Composer Modal**: Pre-calculates character count limits (counting URLs as exactly 23 characters matching Twitter's `t.co` shortener specification) and redirects to X's Web Intent composer.

---

## 🛠 Tech Stack

* **Backend**: Python, Flask, BeautifulSoup4, Requests
* **Frontend**: HTML5, Vanilla CSS3, Javascript (ES6), Lucide Icons

---

## 📁 Project Structure

```text
bigquery_release_notes/
├── app.py                  # Main Flask application & parser logic
├── static/
│   ├── css/
│   │   └── styles.css      # Vanilla CSS styles and keyframe animations
│   └── js/
│       └── app.js          # Main client controller and DOM handlers
├── templates/
│   └── index.html          # Core dashboard layout structure
├── .gitignore              # Configured Git exclusion patterns
└── venv/                   # Local Python virtual environment
```

---

## 🚀 Quick Start Guide

### 1. Activate the Virtual Environment
Navigate to the project directory and activate the pre-configured virtual environment:
```bash
cd /Users/abannikova/agy-cli-projects/bigquery_release_notes
source venv/bin/activate
```

### 2. Start the Server
Launch the Flask application:
```bash
python app.py
```

### 3. Open the App
Open your web browser and navigate to:
[http://127.0.0.1:5001](http://127.0.0.1:5001)

---

## 📬 GitHub Repository
This project is configured and linked with the remote repository:
[https://github.com/allar14/antigravity-event-talks-app](https://github.com/allar14/antigravity-event-talks-app)

Push updates from your terminal using:
```bash
git push -u origin main
```
