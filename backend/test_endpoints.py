import requests

# Test the doctors endpoint
try:
    response = requests.get('http://127.0.0.1:5000/api/doctors')
    print("Doctors endpoint status:", response.status_code)
    print("Doctors data:", response.json())
except Exception as e:
    print("Error testing doctors endpoint:", e)

# Test the dashboard stats endpoint
try:
    response = requests.get('http://127.0.0.1:5000/api/dashboard-stats')
    print("\nDashboard stats endpoint status:", response.status_code)
    print("Dashboard stats data:", response.json())
except Exception as e:
    print("Error testing dashboard stats endpoint:", e)