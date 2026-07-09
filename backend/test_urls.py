import requests

# Test different URLs
urls = [
    'http://127.0.0.1:5000/',
    'http://127.0.0.1:5000/api',
    'http://127.0.0.1:5000/api/health',
    'http://127.0.0.1:5000/api/doctors',
]

for url in urls:
    try:
        response = requests.get(url)
        print(f"{url}: {response.status_code}")
        print(f"  Response: {response.text[:100]}")
    except Exception as e:
        print(f"{url}: ERROR - {e}")