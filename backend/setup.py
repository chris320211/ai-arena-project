#!/usr/bin/env python3
"""
Setup script for AI Arena Chess Project Backend
Creates and configures a virtual environment with all required dependencies.
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, shell=True):
    """Run a command and return the result."""
    try:
        result = subprocess.run(command, shell=shell, check=True, capture_output=True, text=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def main():
    """Main setup function."""
    print("🚀 Setting up AI Arena Chess Project Backend...")
    
    # Check if we're already in the backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    print(f"📁 Working in directory: {backend_dir}")
    
    # Check Python version
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print("❌ Error: Python 3.8+ is required")
        sys.exit(1)
    
    print(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro} detected")
    
    # Create virtual environment
    venv_path = backend_dir / "venv"
    if venv_path.exists():
        print("📦 Virtual environment already exists")
        overwrite = input("Do you want to recreate it? (y/N): ").lower().strip()
        if overwrite == 'y':
            print("🗑️  Removing existing virtual environment...")
            import shutil
            shutil.rmtree(venv_path)
        else:
            print("⏭️  Skipping virtual environment creation")
            return
    
    print("🔧 Creating virtual environment...")
    success, output = run_command(f"{sys.executable} -m venv venv")
    if not success:
        print(f"❌ Failed to create virtual environment: {output}")
        sys.exit(1)
    
    # Determine activation command based on OS
    if sys.platform == "win32":
        activate_cmd = "venv\\Scripts\\activate"
        pip_cmd = "venv\\Scripts\\pip"
    else:
        activate_cmd = "source venv/bin/activate"
        pip_cmd = "venv/bin/pip"
    
    print("📦 Installing dependencies...")
    success, output = run_command(f"{pip_cmd} install --upgrade pip")
    if not success:
        print(f"❌ Failed to upgrade pip: {output}")
        sys.exit(1)
    
    success, output = run_command(f"{pip_cmd} install -r requirements.txt")
    if not success:
        print(f"❌ Failed to install dependencies: {output}")
        sys.exit(1)
    
    print("✅ Setup completed successfully!")
    print("\n📋 Next steps:")
    print(f"1. Activate the virtual environment:")
    if sys.platform == "win32":
        print("   venv\\Scripts\\activate")
    else:
        print("   source venv/bin/activate")
    print("2. Start the server:")
    print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("\n🌐 The API will be available at http://localhost:8000")

if __name__ == "__main__":
    main()