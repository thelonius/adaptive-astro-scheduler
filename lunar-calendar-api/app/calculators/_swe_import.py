"""
Swiss Ephemeris import helper.
Tries `swisseph` (local venv) first, then `pyswisseph` (Docker/CI build).
Both expose identical APIs, pyswisseph just needs to be compiled from source.
"""
try:
    import swisseph as _swe
except ImportError:
    try:
        import pyswisseph as _swe  # type: ignore
    except ImportError:
        _swe = None  # type: ignore

swe = _swe
HAS_SWE = _swe is not None
