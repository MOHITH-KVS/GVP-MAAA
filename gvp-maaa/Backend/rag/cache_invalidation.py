"""
Shared cache invalidation helpers for retriever and response caches.
This module does not change cache structures; it only clears keys by prefix.
"""


def invalidate_cache(prefix: str):
    try:
        from rag import retriever
        cache = getattr(retriever, "_CACHE", None)
        if not isinstance(cache, dict):
            return

        keys_to_delete = [k for k in list(cache.keys()) if str(k).startswith(prefix)]
        for key in keys_to_delete:
            del cache[key]
        print(f"[CACHE INVALIDATED] {prefix}")
    except Exception as exc:
        print(f"[CACHE INVALIDATE ERROR] {exc}")


def invalidate_response_cache(prefix: str):
    try:
        from rag import generator
        cache = getattr(generator, "_RESPONSE_CACHE", None)
        if not isinstance(cache, dict):
            return

        keys_to_delete = [k for k in list(cache.keys()) if str(k).startswith(prefix)]
        for key in keys_to_delete:
            del cache[key]
        print(f"[RESPONSE CACHE INVALIDATED] {prefix}")
    except Exception as exc:
        print(f"[RESPONSE CACHE INVALIDATE ERROR] {exc}")
