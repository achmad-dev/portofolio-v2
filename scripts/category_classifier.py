"""Shared, ordered category rules; no external classification services."""
import json
import re
from pathlib import Path
RULES = json.loads((Path(__file__).resolve().parents[1] / 'client/src/blog/categories.json').read_text())
def normalize(value):
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', value.casefold()).split())
def classify(tags, override=None):
    if override is not None:
        if override not in RULES:
            raise ValueError('Invalid category override')
        return override
    tags = [normalize(tag) for tag in tags]
    for exact in (True, False):
        for category, words in RULES.items():
            for word in map(normalize, words):
                if any(tag == word if exact else f' {word} ' in f' {tag} ' for tag in tags):
                    return category
    return 'Engineering'
