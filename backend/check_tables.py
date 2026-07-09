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
    cur.execute('SHOW TABLES')
    tables = [row[0] for row in cur.fetchall()]
    print('TABLES:', tables)

    for table in tables:
        cur.execute(f'SHOW CREATE TABLE {table}')
        create_stmt = cur.fetchone()
        print(f'\n{table.upper()} TABLE:')
        print(create_stmt[1])

    cur.close()