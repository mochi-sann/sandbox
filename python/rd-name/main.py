import uuid # uuid is used to generate a random number
import base64 # base64 is used to encode the random number
import re



# base64 encode function
def base64Encode(value):
    return base64.b64encode(value.encode()).decode()

for i in range(0, 100):
    hogeUUID = str( uuid.uuid4() )
    hogebase = base64Encode(hogeUUID)
    print(re.sub('\d+', '', re.sub('-', '', hogebase)).lower())
