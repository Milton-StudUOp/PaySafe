from app.config import settings
from portalsdk.api import APIContext, APIRequest, APIMethodType
import json
import logging
from pprint import pprint

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.api_key = settings.PORTAL_API_KEY
        self.public_key = settings.PORTAL_PUBLIC_KEY
        self.address = settings.PORTAL_ADDRESS
        self.port = settings.PORTAL_PORT
        self.ssl = settings.PORTAL_SSL

    def _create_context(self, method_type: APIMethodType, path: str, parameters: dict) -> APIContext:
        return APIContext(
            api_key=self.api_key,
            public_key=self.public_key,
            ssl=self.ssl,
            method_type=method_type,
            address=self.address,
            port=self.port,
            path=path,
            headers={'Origin': '*'},
            parameters=parameters
        )

    def process_c2b_payment(self, amount: float, reference: str, customer_msisdn: str, third_party_reference: str) -> dict:
        """
        Process a C2B payment request (Push USSD to customer)
        Standard M-Pesa C2B Single Stage
        """
        payload = {
            "input_Amount": f"{int(amount)}" if amount.is_integer() else f"{amount:.2f}",
            "input_CustomerMSISDN": f"258{customer_msisdn}" if not customer_msisdn.startswith("258") else customer_msisdn,
            "input_ServiceProviderCode": settings.PORTAL_SHORTCODE if hasattr(settings, 'PORTAL_SHORTCODE') else "171717",
            "input_TransactionReference": reference,
            "input_ThirdPartyReference": third_party_reference
        }
        
        # Determine path - typically /ipg/v1x/c2bPayment/singleStage/
        # Adjust based on specific gateway documentation provided or assumed
        path = '/ipg/v1x/c2bPayment/singleStage/' 

        context = self._create_context(
            method_type=APIMethodType.POST,
            path=path,
            parameters=payload
        )
        
        request = APIRequest(context)
        
        try:
            response = request.execute()
            
            if response:
                print("\n--- DEBUG: PORTAL RESPONSE ---")
                pprint(response.status_code)
                pprint(response.headers)
                pprint(response.body)
                print("------------------------------\n")
                
                result = {
                    "status_code": response.status_code,
                    "body": response.body,
                    "success": 200 <= response.status_code < 300 or response.status_code == 201
                }
                
                # Extract detailed error from M-Pesa body regardless of HTTP status
                if 'output_ResponseCode' in response.body:
                    response_code = response.body['output_ResponseCode']
                    response_desc = response.body.get('output_ResponseDesc', 'Unknown M-Pesa Error')
                    
                    # If INS code is not 0, it's a failure (logic or system)
                    if response_code != 'INS-0':
                         result['success'] = False
                         result['error'] = response_desc
                elif not result['success']:
                     # HTTP Error without M-Pesa body
                     result['error'] = f"Gateway Error {response.status_code}"
                
                return result
            
            return {"success": False, "error": "No response from Payment Gateway"}
            
        except Exception as e:
            logger.error(f"Payment Processing Error: {str(e)}")
            return {"success": False, "error": f"Internal Error: {str(e)}"}

    def check_transaction_status(self, transaction_ref: str, service_provider_code: str = None) -> dict:
        """
        Check status of a transaction
        """
        path = f'/ipg/v1x/queryTransactionStatus/'
        
        payload = {
             "input_QueryReference": transaction_ref,
             "input_ServiceProviderCode": service_provider_code or (settings.PORTAL_SHORTCODE if hasattr(settings, 'PORTAL_SHORTCODE') else "171717"),
             "input_ThirdPartyReference": transaction_ref # Sometimes required
        }

        context = self._create_context(
            method_type=APIMethodType.GET, # Or POST depending on API
            path=path,
            parameters=payload
        )
        
        try:
            request = APIRequest(context)
            response = request.execute()
            
            if response:
                 return {
                    "status_code": response.status_code,
                    "body": response.body,
                    "success": 200 <= response.status_code < 300
                }
            return {"success": False, "error": "No response"}
        except Exception as e:
             return {"success": False, "error": str(e)}
