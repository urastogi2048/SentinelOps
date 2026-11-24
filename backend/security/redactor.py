"""
Role-Scoped PII & Secret Redactor for SentinelOps AI.
"""
import re
from typing import Any, Dict, Tuple, List, Union

EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
JWT_TOKEN_REGEX = re.compile(r"(Bearer\s+)?(eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})", re.IGNORECASE)
GENERIC_BEARER_REGEX = re.compile(r"\bBearer\s+([a-zA-Z0-9_\-\.]{24,})\b", re.IGNORECASE)
API_KEY_REGEX = re.compile(r"\b(mock_key_(?:live|test)_[0-9a-zA-Z]{16,}|sec_[0-9a-zA-Z]{20,}|api_key[=:\s]+['\"]?[0-9a-zA-Z_-]{16,}['\"]?)\b", re.IGNORECASE)
CARD_ID_REGEX = re.compile(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|acc_[a-zA-Z0-9]{8,}|card_[a-zA-Z0-9]{8,})\b")


class RedactionMetrics:
    def __init__(self):
        self.email_count = 0
        self.token_count = 0
        self.api_key_count = 0
        self.id_count = 0
        self.total = 0

    def to_dict(self) -> Dict[str, int]:
        return {
            "email_count": self.email_count,
            "token_count": self.token_count,
            "api_key_count": self.api_key_count,
            "id_count": self.id_count,
            "total": self.total,
        }


def redact_text(text: str) -> Tuple[str, RedactionMetrics]:
    metrics = RedactionMetrics()

    def replace_email(match):
        metrics.email_count += 1
        metrics.total += 1
        return "[REDACTED_EMAIL]"

    def replace_jwt(match):
        metrics.token_count += 1
        metrics.total += 1
        return "[REDACTED_TOKEN]"

    def replace_bearer(match):
        metrics.token_count += 1
        metrics.total += 1
        return "Bearer [REDACTED_TOKEN]"

    def replace_api_key(match):
        metrics.api_key_count += 1
        metrics.total += 1
        return "[REDACTED_API_KEY]"

    def replace_card(match):
        metrics.id_count += 1
        metrics.total += 1
        return "[REDACTED_ID]"

    cleaned = API_KEY_REGEX.sub(replace_api_key, text)
    cleaned = JWT_TOKEN_REGEX.sub(replace_jwt, cleaned)
    cleaned = GENERIC_BEARER_REGEX.sub(replace_bearer, cleaned)
    cleaned = EMAIL_REGEX.sub(replace_email, cleaned)
    cleaned = CARD_ID_REGEX.sub(replace_card, cleaned)

    return cleaned, metrics


def redact_payload(data: Any, requires_masking: bool = True) -> Tuple[Any, Dict[str, int]]:
    total_metrics = RedactionMetrics()

    if not requires_masking:
        return data, total_metrics.to_dict()

    def _process(item: Any) -> Any:
        if isinstance(item, str):
            res, m = redact_text(item)
            total_metrics.email_count += m.email_count
            total_metrics.token_count += m.token_count
            total_metrics.api_key_count += m.api_key_count
            total_metrics.id_count += m.id_count
            total_metrics.total += m.total
            return res
        elif isinstance(item, dict):
            return {k: _process(v) for k, v in item.items()}
        elif isinstance(item, list):
            return [_process(elem) for elem in item]
        return item

    processed_data = _process(data)
    return processed_data, total_metrics.to_dict()
