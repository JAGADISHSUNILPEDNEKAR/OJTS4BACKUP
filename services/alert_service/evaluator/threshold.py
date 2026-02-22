async def evaluate(score: float) -> bool:
    # Future enhancement: dynamically query `alert_thresholds` table
    # For now, flag alerts if score exceeds 0.8
    return score > 0.8
