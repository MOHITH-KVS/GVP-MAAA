import hashlib
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

# Bcrypt context for SHA256 pre-hashed passwords (new method)
# Old bcrypt hashes are supported via deprecated schemes
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

def hash_password(password: str) -> str:
    """Hash password using SHA256 + bcrypt (new secure method).
    
    Steps:
    1. Hash plain password with SHA256 first
    2. Then hash the SHA256 result with bcrypt
    
    This prevents password length limits and provides two layers of hashing.
    """
    print("🔍 PASSWORD RECEIVED LENGTH:", len(password))
    # Step 1: SHA256 hash
    sha_password = hashlib.sha256(password.encode("utf-8")).hexdigest()
    # Step 2: bcrypt hash
    return pwd_context.hash(sha_password)

def verify_password(plain_password: str, hashed_password: str) -> bool | str:
    """Verify password with backward compatibility for old hashes.
    
    Returns:
        True: Password valid with current method
        "upgrade": Password valid with OLD method (needs rehashing)
        False: Password invalid
    
    Supports both:
    - NEW METHOD: SHA256 + bcrypt
    - OLD METHOD: Direct bcrypt (auto-upgrades on successful login)
    """
    print(f"[*] Verifying password (length: {len(plain_password)})")
    
    # TRY NEW METHOD FIRST: SHA256 + bcrypt
    try:
        sha_password = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        if pwd_context.verify(sha_password, hashed_password):
            print("[✓] Password verified with NEW method (SHA256+bcrypt)")
            return True
    except Exception as e:
        print(f"[!] New method verification error: {type(e).__name__}")
        pass
    
    # FALLBACK TO OLD METHOD: Direct bcrypt (for backward compatibility)
    try:
        if pwd_context.verify(plain_password, hashed_password):
            print("[⚠] Password verified with OLD method (direct bcrypt) - UPGRADE NEEDED")
            return "upgrade"
    except UnknownHashError:
        print(f"[!] Unknown hash format")
        return False
    except Exception as e:
        print(f"[!] Old method verification error: {type(e).__name__}: {e}")
        return False
    
    print("[✗] Password verification failed - invalid credentials")
    return False

