import os
from flask import Flask
from flask_mysqldb import MySQL

app = Flask(__name__)
app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', '')
app.config['MYSQL_DB'] = os.getenv('MYSQL_DB', 'anxiety_prediction_system')
app.config['MYSQL_PORT'] = int(os.getenv('MYSQL_PORT', 3306))

mysql = MySQL(app)

with app.app_context():
    cur = mysql.connection.cursor()

    # Check if doctors table has data
    cur.execute("SELECT COUNT(*) FROM doctors")
    count = cur.fetchone()[0]

    if count == 0:
        # Insert sample doctors
        doctors_data = [
            ("Dr. Ahmed Hassan", "Psychiatry", "15 years", 4.8, "Active", "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face"),
            ("Dr. Fatima Ali", "Clinical Psychology", "12 years", 4.9, "Active", "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"),
            ("Dr. Mohamed Abdi", "Counseling Psychology", "10 years", 4.7, "Active", "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?w=150&h=150&fit=crop&crop=face"),
            ("Dr. Amina Hussein", "Child Psychology", "8 years", 4.6, "Active", "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face"),
            ("Dr. Hassan Omar", "Neuropsychology", "20 years", 4.9, "Active", "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&h=150&fit=crop&crop=face"),
            ("Dr. Layla Mohamed", "Behavioral Therapy", "14 years", 4.8, "Active", "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?w=150&h=150&fit=crop&crop=face"),
        ]

        for doctor in doctors_data:
            cur.execute("""
                INSERT INTO doctors (name, specialization, experience, rating, status, photo)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, doctor)

        mysql.connection.commit()
        print("✅ Sample doctors inserted")
    else:
        print(f"✅ Doctors table already has {count} records")

    cur.close()