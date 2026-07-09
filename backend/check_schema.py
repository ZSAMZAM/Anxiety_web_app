import sys
sys.path.insert(0, 'c:\\Users\\HP\\Downloads\\panel\\panel\\backend')
from app import app, mysql

with app.app_context():
    cur = mysql.connection.cursor()
    
    # Check users table
    cur.execute('DESCRIBE users')
    print('USERS TABLE:')
    for row in cur.fetchall():
        print(f'  {row[0]} {row[1]}')
    
    # Check doctors table
    cur.execute('DESCRIBE doctors')
    print('\nDOCTORS TABLE:')
    for row in cur.fetchall():
        print(f'  {row[0]} {row[1]}')
    
    cur.close()
