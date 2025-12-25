import sys
import os
# Add python-portal-sdk to path to import it directly
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), '../python-portal-sdk')))

from portalsdk.api import APIContext, APIRequest
from dotenv import load_dotenv

# Load env from backend-api/.env
load_dotenv(os.path.join(os.getcwd(), '.env'))

def test_keys():
    api_key = os.getenv('PORTAL_API_KEY')
    public_key = os.getenv('PORTAL_PUBLIC_KEY')
    
    print(f"Testing keys from .env...")
    print(f"API Key: {api_key[:5]}...")
    print(f"Public Key (len={len(public_key)}): {public_key[:10]}...{public_key[-10:]}")
    
    context = APIContext()
    context.api_key = api_key
    context.public_key = public_key
    
    req = APIRequest(context)
    
    try:
        token = req.create_bearer_token()
        print("SUCCESS: Token created successfully with original SDK!")
        print(f"Token length: {len(token)}")
    except Exception as e:
        print(f"FAILURE: Failed to create token with original SDK.")
        print(f"Error: {e}")

if __name__ == "__main__":
    test_keys()
