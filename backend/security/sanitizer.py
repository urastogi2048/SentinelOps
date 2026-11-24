"""
Indirect Prompt-Injection Defense and Data Sanitizer for SentinelOps AI.
"""
import re
from typing import Dict, Any, Tuple, List, Optional

INJECTION_PATTERNS = [
    re.compile(r"IGNORE\s+(?:ALL\s+)?PREVIOUS\s+INSTRUCTIONS", re.IGNORECASE),
    re.compile(r"SYSTEM\s+OVERRIDE", re.IGNORECASE),
    re.compile(r"ADMIN\s+MODE\s+ACTIVATED", re.IGNORECASE),
    re.compile(r"DISREGARD\s+(?:ALL\s+)?PRIOR\s+(?:RULES|CONSTRAINTS)", re.IGNORECASE),
    re.compile(r"YOU\s+ARE\s+NOW\s+IN\s+DEVELOPER\s+MODE", re.IGNORECASE),
    re.compile(r"EXECUTE[_\s]+ROLLBACK[_\s]+DIRECTIVE", re.IGNORECASE),
    re.compile(r"GRANT\s+SUPERUSER\s+ACCESS", re.IGNORECASE),
    re.compile(r"DAN\s+MODE\s+ACTIVE", re.IGNORECASE),
    re.compile(r"EMERGENCY\s+BYPASS\s+AUTH", re.IGNORECASE),
]


class InjectionScanResult:
    def __init__(self, detected: bool = False, matches: Optional[List[str]] = None, neutralized_text: str = ""):
        self.detected = detected
        self.matches = matches or []
        self.neutralized_text = neutralized_text

    def to_dict(self) -> Dict[str, Any]:
        return {
            "injection_detected": self.detected,
            "patterns_matched": self.matches,
            "status": "INJECTION_ATTEMPT_NEUTRALIZED" if self.detected else "CLEAN",
        }


def scan_and_neutralize_prompt_injection(content: str) -> Tuple[str, InjectionScanResult]:
    detected_patterns = []
    sanitized = content

    for pat in INJECTION_PATTERNS:
        matches = pat.findall(sanitized)
        if matches:
            detected_patterns.extend(matches)
            sanitized = pat.sub(
                "[INJECTION_ATTEMPT_NEUTRALIZED: Malicious Prompt Directive Stripped by SentinelOps Security Guard]",
                sanitized,
            )

    is_detected = len(detected_patterns) > 0
    return sanitized, InjectionScanResult(
        detected=is_detected,
        matches=detected_patterns,
        neutralized_text=sanitized,
    )


def wrap_untrusted_log(log_text: str, log_id: Optional[str] = None) -> Tuple[str, InjectionScanResult]:
    sanitized_text, scan_result = scan_and_neutralize_prompt_injection(log_text)
    header = f'<untrusted_log_data log_id="{log_id or "unknown"}">'
    footer = "</untrusted_log_data>"
    wrapped = f"{header}\n{sanitized_text}\n{footer}"
    return wrapped, scan_result


def sanitize_agent_input_data(logs: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    sanitized_logs = []
    total_injections = 0
    injection_reports = []

    for log in logs:
        raw_msg = log.get("message", "")
        log_id = log.get("id", "log-unknown")
        wrapped_msg, scan_res = wrap_untrusted_log(raw_msg, log_id=log_id)

        clean_log = dict(log)
        clean_log["raw_message"] = raw_msg
        clean_log["message"] = wrapped_msg
        clean_log["injection_detected"] = scan_res.detected

        if scan_res.detected:
            total_injections += 1
            injection_reports.append({
                "log_id": log_id,
                "matches": scan_res.matches,
                "timestamp": log.get("timestamp"),
            })

        sanitized_logs.append(clean_log)

    defense_summary = {
        "injections_neutralized_count": total_injections,
        "is_safe": total_injections == 0,
        "reports": injection_reports,
    }
    return sanitized_logs, defense_summary
