import mysql.connector
from config import DB_CONFIG

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def fetch_all(query, params=()):
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(query, params)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

def fetch_one(query, params=()):
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(query, params)
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()

def execute(query, params=()):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(query, params)
        conn.commit()
        return cur.lastrowid, cur.rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
