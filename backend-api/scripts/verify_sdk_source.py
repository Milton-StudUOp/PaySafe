
import sys
import os
import portalsdk
import portalsdk.api

print(f"PYTHONPATH: {sys.path}")
print(f"portalsdk location: {os.path.dirname(portalsdk.__file__)}")
print(f"portalsdk.api location: {portalsdk.api.__file__}")
