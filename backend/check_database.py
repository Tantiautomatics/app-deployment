"""
Database diagnostic script to check tables and columns
Run this to verify database state
"""
import sqlite3
import os

DATABASE_PATH = "./tanti.db"

def check_database():
    """Check database tables and columns"""
    if not os.path.exists(DATABASE_PATH):
        print(f"❌ Database file {DATABASE_PATH} not found!")
        print("The database will be created when you start the server.")
        return
    
    print(f"✅ Database file found: {DATABASE_PATH}\n")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print("📊 Tables in database:")
        if tables:
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("  (No tables found)")
        print()
        
        # Check milestone_grid table specifically
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='milestone_grid'")
        if cursor.fetchone():
            print("✅ milestone_grid table exists")
            
            # Get columns
            cursor.execute("PRAGMA table_info(milestone_grid)")
            columns = cursor.fetchall()
            
            print(f"\n📋 Columns in milestone_grid table ({len(columns)} total):")
            column_names = []
            for col in columns:
                col_name = col[1]
                col_type = col[2]
                nullable = "NULL" if col[3] == 0 else "NOT NULL"
                column_names.append(col_name)
                print(f"  - {col_name}: {col_type} ({nullable})")
            
            # Check for tracker_type
            if 'tracker_type' in column_names:
                print("\n✅ tracker_type column exists")
                
                # Check data
                cursor.execute("SELECT COUNT(*) FROM milestone_grid")
                count = cursor.fetchone()[0]
                print(f"📊 Total rows: {count}")
                
                if count > 0:
                    cursor.execute("SELECT DISTINCT tracker_type FROM milestone_grid")
                    types = cursor.fetchall()
                    print(f"📊 Tracker types in use: {[t[0] for t in types]}")
            else:
                print("\n❌ tracker_type column does NOT exist")
                print("   Run: python migrate_add_tracker_type.py")
        else:
            print("❌ milestone_grid table does NOT exist")
            print("   The table will be created when you start the server.")
        
        # Check projects table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
        if cursor.fetchone():
            print("\n✅ projects table exists")
            cursor.execute("SELECT COUNT(*) FROM projects")
            count = cursor.fetchone()[0]
            print(f"📊 Total projects: {count}")
        else:
            print("\n❌ projects table does NOT exist")
            print("   The table will be created when you start the server.")
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_database()

