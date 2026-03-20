from sqlalchemy import cast, String


def build_ilike_conditions(model_class, columns: list[str], search_term: str) -> list:
    """
    Build a list of SQLAlchemy ILIKE conditions for OR combination.
    Works with any PostgreSQL setup — no extensions required.
    """
    conditions = []
    pattern = f"%{search_term}%"
    for col_name in columns:
        col = getattr(model_class, col_name, None)
        if col is not None:
            conditions.append(col.ilike(pattern))
    return conditions


def calculate_relevance(match_text: str, search_term: str) -> float:
    """
    Simple relevance scoring:
      - exact match (case-insensitive) = 1.0
      - starts with search term         = 0.8
      - contains search term             = 0.5
      - no match                         = 0.0
    """
    if not match_text or not search_term:
        return 0.0

    lower_text = match_text.lower()
    lower_term = search_term.lower()

    if lower_text == lower_term:
        return 1.0
    if lower_text.startswith(lower_term):
        return 0.8
    if lower_term in lower_text:
        return 0.5
    return 0.0