import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import Base
from app.config import settings

# Import models
import app.models


def debug_alembic():
    """Debug what Alembic can see"""
    print("=== Alembic Debug Information ===")
    print(f"Database URL: {settings.DATABASE_URL}")
    print(f"Base metadata: {Base.metadata}")
    print(f"Number of tables in metadata: {len(Base.metadata.tables)}")

    print("\n=== Tables in Base.metadata ===")
    for table_name, table in Base.metadata.tables.items():
        print(f"- {table_name}")
        for column in table.columns:
            print(f"  └── {column.name}: {column.type}")

    print("\n=== Imported modules ===")
    models_module = app.models
    print(f"Models module: {models_module}")
    print(f"Models module file: {models_module.__file__}")

    # Check if models are properly defined
    print("\n=== Model classes ===")
    for name in dir(models_module):
        obj = getattr(models_module, name)
        if hasattr(obj, "__tablename__"):
            print(f"- {name} -> {obj.__tablename__}")


if __name__ == "__main__":
    debug_alembic()
