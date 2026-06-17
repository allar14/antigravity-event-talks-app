from flask import Flask, jsonify, request, render_template
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import time
import re

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for feed data
_cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_TTL = 300  # 5 minutes cache default

def parse_release_notes(xml_content):
    try:
        root = ET.fromstring(xml_content.encode('utf-8'))
    except Exception as e:
        print(f"XML Parsing Error: {e}")
        return []

    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    updates = []

    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        date_str = title.text.strip() if title is not None else "Unknown Date"
        
        link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse the HTML content to find separate updates
        soup = BeautifulSoup(content_html, 'html.parser')
        headings = soup.find_all('h3')
        
        # If there are no <h3> headings, treat the entire block as a single general update
        if not headings:
            clean_text = clean_html_to_text(content_html)
            updates.append({
                "date": date_str,
                "type": "Update",
                "html": content_html.strip(),
                "text": clean_text,
                "link": link,
                "tweet_draft": generate_tweet_draft("Update", date_str, clean_text, link)
            })
        else:
            for h3 in headings:
                update_type = h3.get_text().strip()
                
                # Gather all siblings until the next h3
                sibling_content = []
                curr = h3.next_sibling
                while curr and curr.name != 'h3':
                    sibling_content.append(str(curr))
                    curr = curr.next_sibling
                
                update_html = "".join(sibling_content).strip()
                clean_text = clean_html_to_text(update_html)
                
                updates.append({
                    "date": date_str,
                    "type": update_type,
                    "html": update_html,
                    "text": clean_text,
                    "link": link,
                    "tweet_draft": generate_tweet_draft(update_type, date_str, clean_text, link)
                })
                
    return updates

def clean_html_to_text(html_content):
    """Converts HTML content to clean, readable plain text for Twitter/X sharing."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Replace anchor tags with text [link] format or just text
    for a in soup.find_all('a'):
        a.replace_with(f"{a.get_text()} ")
        
    text = soup.get_text()
    
    # Remove redundant whitespace and newlines
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def generate_tweet_draft(update_type, date_str, text, link):
    """Generates a nicely formatted tweet draft fitting within the 280-char limit."""
    emoji_map = {
        "Feature": "🚀",
        "Announcement": "📢",
        "Issue": "⚠️",
        "Deprecation": "🛑",
        "Update": "📝",
        "General": "📝"
    }
    emoji = emoji_map.get(update_type, "⚡")
    
    prefix = f"{emoji} BigQuery {update_type} ({date_str}):\n"
    suffix = f"\n\nRead more: {link}"
    
    # Character limit details
    # We want to make sure it fits within 280 characters. 
    # Twitter parses URLs as 23 characters, but we can budget conservatively.
    available_char_len = 280 - len(prefix) - 25  # ~25 chars reserved for URL and spacing
    
    if len(text) > available_char_len:
        truncated_text = text[:available_char_len - 3].strip() + "..."
    else:
        truncated_text = text
        
    return f"{prefix}{truncated_text}{suffix}"

def get_feed(force_refresh=False):
    global _cache
    now = time.time()
    
    if force_refresh or not _cache["data"] or (now - _cache["last_fetched"] > CACHE_TTL):
        try:
            print("Fetching feed from source...")
            headers = {'User-Agent': 'BigQueryReleaseRadar/1.0'}
            response = requests.get(FEED_URL, headers=headers, timeout=10)
            response.raise_for_status()
            
            # Parse the fresh feed
            updates = parse_release_notes(response.text)
            
            _cache["data"] = updates
            _cache["last_fetched"] = now
        except Exception as e:
            print(f"Error fetching feed: {e}")
            # If fetch fails, fallback to cache if available
            if _cache["data"] is None:
                return {"error": f"Failed to retrieve feed: {str(e)}", "updates": []}
                
    return {"error": None, "updates": _cache["data"]}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    result = get_feed(force_refresh=force_refresh)
    if result["error"]:
        return jsonify(result), 500
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
