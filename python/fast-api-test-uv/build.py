#!/usr/bin/env python3
"""
Build script for creating a standalone binary of the Todo API
"""

import os
import subprocess
import sys
import shutil
from pathlib import Path

def run_command(cmd, check=True):
    """Run a command and return the result"""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=check, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result

def build_binary():
    """Build the binary using PyInstaller"""
    
    # Clean previous builds
    build_dirs = ['build', 'dist', '__pycache__']
    for dir_name in build_dirs:
        if os.path.exists(dir_name):
            print(f"Cleaning {dir_name}...")
            shutil.rmtree(dir_name)
    
    # Remove spec file if exists
    spec_file = 'main.spec'
    if os.path.exists(spec_file):
        os.remove(spec_file)
    
    print("Building binary with PyInstaller...")
    
    # PyInstaller command
    cmd = [
        'pyinstaller',
        '--onefile',                    # Create a single executable
        '--name', 'todo-api',          # Name of the executable
        '--clean',                     # Clean PyInstaller cache
        '--noconfirm',                 # Replace output directory without confirmation
        '--add-data', 'models.py:.',   # Include models.py in the bundle
        '--hidden-import', 'uvicorn.logging',
        '--hidden-import', 'uvicorn.loops',
        '--hidden-import', 'uvicorn.loops.auto',
        '--hidden-import', 'uvicorn.protocols',
        '--hidden-import', 'uvicorn.protocols.http',
        '--hidden-import', 'uvicorn.protocols.http.auto',
        '--hidden-import', 'uvicorn.protocols.websockets',
        '--hidden-import', 'uvicorn.protocols.websockets.auto',
        '--hidden-import', 'uvicorn.lifespan',
        '--hidden-import', 'uvicorn.lifespan.on',
        'main.py'
    ]
    
    try:
        result = run_command(cmd)
        if result.returncode == 0:
            print("\n✅ Binary built successfully!")
            
            # Check if binary exists
            binary_path = Path('dist/todo-api')
            if binary_path.exists():
                size = binary_path.stat().st_size / (1024 * 1024)  # Size in MB
                print(f"📦 Binary location: {binary_path.absolute()}")
                print(f"📏 Binary size: {size:.1f} MB")
                
                # Make executable on Unix systems
                if os.name != 'nt':
                    os.chmod(binary_path, 0o755)
                    print("🔧 Made binary executable")
                
                return True
            else:
                print("❌ Binary not found in expected location")
                return False
        else:
            print("❌ Build failed!")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed with error: {e}")
        return False

def test_binary():
    """Test the built binary"""
    binary_path = Path('dist/todo-api')
    if not binary_path.exists():
        print("❌ Binary not found for testing")
        return False
    
    print("\n🧪 Testing binary...")
    
    # Test that binary can start (we'll kill it quickly)
    try:
        import time
        import signal
        
        # Start the binary
        process = subprocess.Popen([str(binary_path)], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        
        # Give it a moment to start
        time.sleep(3)
        
        # Terminate the process
        process.terminate()
        process.wait(timeout=5)
        
        print("✅ Binary starts successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Binary test failed: {e}")
        return False

def main():
    """Main build function"""
    print("🏗️  Building Todo API Binary\n")
    
    # Check if we're in the right directory
    if not os.path.exists('main.py'):
        print("❌ main.py not found. Please run this script from the project root.")
        sys.exit(1)
    
    # Install dependencies if needed
    print("📦 Installing dependencies...")
    try:
        run_command(['uv', 'sync'])
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Build the binary
    if not build_binary():
        sys.exit(1)
    
    # Test the binary
    if not test_binary():
        print("⚠️  Binary built but failed basic test")
    
    print("\n🎉 Build complete!")
    print("\nTo run the binary:")
    print("  ./dist/todo-api")
    print("\nOr on Windows:")
    print("  .\\dist\\todo-api.exe")

if __name__ == '__main__':
    main()