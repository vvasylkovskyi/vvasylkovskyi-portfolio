# Full-stack JWT Authentication with Clerk, NextJS, FastAPI and Terraform

In this notes we will walk about how to achieve end-to-end authentication handling with Clerk authentication provider and backend JWT validation. We will use `Nextjs` for frontend, and FastAPI python for backend. 

The goals of this notes are showing how to achieve the key security requirements: 

  - Protect web pages that require user authentication
  - Protect backend routes with JWT validation


## Adding Clerk Provider to frontend

You can follow the quick setup to get your Clerk up and running here https://clerk.com/docs/quickstarts/setup-clerk. Essentially you need to provide the following snippets: 

```tsx
import {
  ClerkProvider, 
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

    <ClerkProvider>
    <html>
        <SignedOut>
            <SignInButton><Button size="sm" variant="secondary">Sign In</Button></SignInButton>
            <SignUpButton>
            <Button size="sm" variant="default">Sign Up</Button>
            </SignUpButton>
        </SignedOut>
        <SignedIn>
            <UserButton />
        </SignedIn>
      // ... rest of your app
    </html>
    </ClerkProvider>
```

The above will wrap your app in clerk provider that allows you to add clerk components such as sign-in and sign-up buttons. 

## Adding protected routes

Some routes may only be available if the user is authenticated. Clerk allows validating that using `middleware.ts` in nextjs. `middleware.ts` sits next to your `/app` folder, and it contains code that runs on every request. Let's add protected routes:  

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isRestrictedRoute = createRouteMatcher(['/my-protected-route(.*)'])

export default clerkMiddleware(async (auth, req) => {
    if (isRestrictedRoute(req)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
```

## Sending JWT to the backend

Once the user is authenticated, we can send the token to backend as follows: 

```typescript
import { useAuth } from '@clerk/nextjs';

export const MyComponent = () => {
    const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
        
    const sendRequestToBackend = async () => {
        const token = await getToken();
        const response = await fetch('/api/my-post-request', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
    }
}
```

## Adding custom sign-in and sign-up pages

There are two very good tutorials about how to add custom pages:

  - Sign-in - https://clerk.com/docs/references/nextjs/custom-sign-in-or-up-page
  - Sign-up - https://clerk.com/docs/references/nextjs/custom-sign-up-page

## Validating JWT on backend, Symmetric vs Asymetric JWT

Now we are going to move to the Python backend where we receive the request and we will verify whether user is authenticated. We will assume that all routes below are protected routes. 

First things first, we will create the `auth/dependencies.py`. The dependencies are the fastAPI abstraction that can be hooked to the endpoints. Once the endpoint has a dependency, it will only proceed if the dependency if fulfilled. In our case this means that there is a `Authorization: Bearer <token>` header. 

### Symmetric JWT

JWT is a signed token, that can be signed either using symetric or asymetric encryption. Symetric are the HMAC family (HS256, HS384, HS512). Naturally in symetric encryption there is only one secret that is shared between two parties, which then can verify tokens using the secret key. The advantage of this approach is simplicity, since there is no need for complex key distribution infrastructure as in public/private encrpytion. This comes at the price of lower security though, since anyone who gets the secret can now forge tokens. 

#### Pseudo-code

Example of pseudo-code of how this can be done: 

```python
jwt.encode(payload, secret, algorithm="HS256")
jwt.decode(token, secret, algorithms=["HS256"])
```

#### Backend Production Example 

And the real-use case for the service verifying tokens in python (note we are using `PyJWT`):

```python
import os
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

SECRET_KEY = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

The `get_current_user` contains dependecies security where the token is extracted from `Authorization: Bearer <token>`. Now, assuming both the signer (frontend) and the verifier (backend) know the algorithm used, which we hardcoded as `HS256` algorithm, and they both have secret key, the token then can be decoded.


### Asymmetric JWT

Family of algorithms RSA/ECDSA such as RS256 and ES256 use assymetric encryption. In this scenario the signer uses private key to sign the token, and the receiver can then verify the token using public key. For example, `Clerk` authentication provider uses asymmetric encryption. Consequently, our backend service will have to retrieve the public key first, and then verify the token. The advantage here is that public key can be shared with no risk, and the sender is authenticated and non-repudiated (only clerk can have private key). Since the auth providers like `Clerk` handle the complex infrastructure of keys distribution, they provide better security. 

#### Pseudo-code 

In pseudo-code this would look like follows: 

```python
jwt.encode(payload, private_key, algorithm="RS256")
jwt.decode(token, public_key, algorithms=["RS256"])
```

#### Backend Production Example

From the backend side, we still receive a request header: `Authorization: Bearer <token>`, but the approach to decode that token is slightly different. `Clerk` uses `RSA256` by default, so we can hardcode the algorithm. Further, the public key will be extracted from Cleark's public JWKS (JSON Web Key Set) URL - which is essentially a document containing one or more public keys in standard format. 

First I am going to fetch the Clerk JWKS URL from my dashboard https://dashboard.clerk.com/apps/app_310hsBfCVoMVW6Wx5wfjvpmPcKe/instances/ins_310hs9enVKHUrUcm1CL82HoTPUE/api-keys

Let's say it is 

```sh
CLERK_JWKS_URL = "https://<your-clerk-domain>/.well-known/jwks.json"
```

In my case, there is only one public key, which looks like this: 

```json
{
   "keys":[
      {
         "use":"sig",
         "kty":"RSA",
         "kid":"ins_random-key-id",
         "alg":"RS256",
         "n":"random-long-string",
         "e":"AQAB"
      }
   ]
}
```

Where each field has a meaning: 

| Field                       | Meaning                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `"use":"sig"`               | This key is for **signing** verification.                                                   |
| `"kty":"RSA"`               | The key type is RSA (asymmetric).                                                           |
| `"kid":"ins_random-key-id"` | The **Key ID** — matches the `"kid"` field in the JWT header so you know which key to pick. |
| `"alg":"RS256"`             | Signed using RS256 (RSA + SHA-256).                                                         |
| `"n"`                       | The RSA modulus, Base64URL encoded.                                                         |
| `"e":"AQAB"`                | The RSA exponent, Base64URL encoded (AQAB = 65537 in decimal).                              |


So having this key, we can match the `kid` with the `kid` field in JWT, and then use the key to decode token. Note the `n` and `e` fields are pieces to building a public key, which we will write code how to do: 

##### Fetch JWKS 

Let's begin with some boiler plate code to fetch these keys from remote: 

```python
import requests

CLERK_JWKS_URL = "https://<your-clerk-domain>/.well-known/jwks.json"
# Cache JWKS to avoid fetching on every request
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        resp = requests.get(CLERK_JWKS_URL)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache
```

##### Convert JWK to PEM

PEM is the standard format for the secret keys in assymetric encryption. Here we will use the `n` and `e` fields of the key to build the `.pem` which is in practice our public key: 

```python
import base64
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

def jwk_to_pem(jwk):
    """Convert a single JWK entry to PEM format"""
    n = int.from_bytes(base64.urlsafe_b64decode(jwk['n'] + '=='), 'big')
    e = int.from_bytes(base64.urlsafe_b64decode(jwk['e'] + '=='), 'big')
    public_key = rsa.RSAPublicNumbers(e, n).public_key(default_backend())
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return pem
```

Note, we are using `cryptography` package from Pypi https://pypi.org/project/cryptography/, and `cryptography.hazmat` stands for "hazardous materials" - low level cryptographic primitives. Since we know what we are doing we proceed. We are using `hazmat` to create RSA public key from numbers (`n` and `e`) as per RFC (https://datatracker.ietf.org/doc/html/rfc8017).

##### Finding the right kid by extracting from JWT

We could have many public keys, but JWT bears only one key id. In any case, we need to cross-match the kid so that we know which key id is to retrieve from array of JWKS. Here is a sample python code to do that: 

```python
from fastapi import HTTPException

def get_public_key_for_kid(kid):
    jwks = get_jwks()
    for key in jwks["keys"]:
        if key["kid"] == kid:
            return jwk_to_pem(key)
    raise HTTPException(status_code=401, detail="Public key not found")
```

##### Decoding the JWT

Finally, we can bundle it all together. The last steps is to extract JWT from the header and decode it using the public key above. Here is a python sample to do that: 


```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        unverified_header = jwt.get_unverified_header(token)
        public_key = get_public_key_for_kid(unverified_header["kid"])

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
        )
        return payload["sub"]  # Clerk stores user ID in `sub`
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/protected")
def protected_route(user_id: str = Depends(get_current_user)):
    return {"message": f"Hello, user {user_id}"}
```

Finally, bringing it all together: 

```python
import base64
import os

import jwt
import requests
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from shared.logger.logger import Logger

app = FastAPI()
security = HTTPBearer()
logger = Logger("authentication")

# Clerk settings
CLERK_JWKS_URL = "https://<your-clerk-domain>/.well-known/jwks.json"

# Cache JWKS to avoid fetching on every request
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        resp = requests.get(CLERK_JWKS_URL)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache

def jwk_to_pem(jwk):
    """Convert a single JWK entry to PEM format"""
    n = int.from_bytes(base64.urlsafe_b64decode(jwk['n'] + '=='), 'big')
    e = int.from_bytes(base64.urlsafe_b64decode(jwk['e'] + '=='), 'big')
    public_key = rsa.RSAPublicNumbers(e, n).public_key(default_backend())
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return pem

def get_public_key_for_kid(kid):
    jwks = get_jwks()
    for key in jwks["keys"]:
        if key["kid"] == kid:
            return jwk_to_pem(key)
    raise HTTPException(status_code=401, detail="Public key not found")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        unverified_header = jwt.get_unverified_header(token)
        public_key = get_public_key_for_kid(unverified_header["kid"])

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
        )
        return payload["sub"]  # Clerk stores user ID in `sub`
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

## Moving to Production

To use our Clerk auth provider in production, we need to accomplish the [production requirements as prescribed by Clerk team](https://clerk.com/docs/deployments/overview?_gl=1*9s214t*_gcl_au*MTA2OTUzNDc4MS4xNzUxOTA4MTY2*_ga*ODA0OTMyMzc5LjE3NTE5MDgxNjY.*_ga_1WMF5X234K*czE3NTUwMDExNzkkbzEwJGcxJHQxNzU1MDAxMTg1JGo1NCRsMCRoMA..): 

  - Add API Keys
  - Setup social connection credentials
  - Connect domains

### Add API Keys

Production API keys differ from development, so we need to make sure to push the new keys to production. More infromation on this can be found on [Clerk API Keys docs](https://dashboard.clerk.com/apps/app_310hsBfCVoMVW6Wx5wfjvpmPcKe/instances/ins_311IHCJFRpRiJV782iWzBUjsfl7/api-keys).

### Setup Social Connection Credentials

In development, clerk provides us with a set of shared OAuth credentials which are not secure for production. We are going to configure OAuth for Google SSO, as it is quite common OAuth provider and [has documentation on Clerk](https://clerk.com/docs/authentication/social-connections/google?_gl=1*1kdf4ay*_gcl_au*MTA2OTUzNDc4MS4xNzUxOTA4MTY2*_ga*ODA0OTMyMzc5LjE3NTE5MDgxNjY.*_ga_1WMF5X234K*czE3NTUwMDExNzkkbzEwJGcxJHQxNzU1MDAzMjg0JGo1NiRsMCRoMA..). Follow the documentation step by step to ensure that your credentials are set. 

The goal of the exercise is to fetch OAuth Credentials which are ClientID and Secret from Google, and set those into Clerk to ensure secure SSO.

### Connect domains

We are going to provision new DNS records as requested by Clerk for production use. Following the best practices of infrastructure as code (IaC), this will be done using terraform. 

#### Pre-requisites

To easier understand the next steps, I encourage you to read my tutorial on seting up IaC using terraform - starting here:

- [Deploying EC2 instance on AWS with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform)
- [Provision DNS records with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-dns-records-with-terraform)

#### Adding CNAMEs for Clerk

Next, we are going to provision new DNS records using terraform for: 

- Frontend API
- Accounts API
- 3 DNS records for email API

In my case the records are as follows: 

```hcl
variable "clerk_cname_records" {
  type = map(string)
  default = {
    clerk          = "frontend-api.clerk.services"
    accounts       = "accounts.clerk.services"
    clkmail        = "mail.6dzf3jivhtew.clerk.services"
    "clk._domainkey"  = "dkim1.6dzf3jivhtew.clerk.services"
    "clk2._domainkey" = "dkim2.6dzf3jivhtew.clerk.services"
  }
}

resource "aws_route53_record" "clerk_cname" {
  for_each = var.clerk_cname_records

  zone_id = var.route53_zone_id
  name    = each.key
  type    = "CNAME"
  ttl     = 300
  records = [each.value]
}
```

Run `terraform init && terraform apply --auto-approve`. Once the infrastructure is updated and DNS is propagated, on the Clerk Dashboard, at DNS configuration - click "Verify Configuration". Once finished, you will see on UI that Frontend API and Account Portals issues SSL certificates. Having this step done, you we are finished with the DNS requirement.

## Conclusion

In this notes we have checked how to ensure secure authentication with `Clerk` using Python and Nextjs. This provides extra security layer to our apps, and secure resources that can only be accessed by authorized users. 