"""One export engine, for every module that has a table to hand someone.

The rendering used to live inside `finance/service.py`, which meant Finance
could produce an itemised PDF and a workbook and nobody else could produce
anything. Projects and Inventory had no export at all — not because the work
was hard, but because it was in the wrong file.

What is generic and what is not
-------------------------------
Generic: a title, some columns, some rows, an optional total. That covers
every export in the app.

Not generic, and deliberately left in Finance: fetching receipt images out of
object storage, normalising them through PIL, and appending them as pages. A
receipt is not a column, and pretending otherwise would put MinIO in the
signature of every export in the system. `pdf_elements()` exists precisely so
Finance can take the generic title-and-table and add its own pages after it.

Formats
-------
`xlsx` for anyone who will do further sums, `csv` for anyone piping it
somewhere, `pdf` for anyone printing it or sending it to a customer.
"""
from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Mapping, Optional, Sequence

MEDIA_TYPES = {
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "csv": "text/csv",
    "pdf": "application/pdf",
}

FORMATS = tuple(MEDIA_TYPES)


@dataclass(frozen=True)
class Column:
    """One column, and how its values should be shown.

    `kind` decides formatting, not storage: a money column holds a number, so
    the spreadsheet can total it. Pre-formatting a number into a string to make
    it look right is how a workbook ends up with a column nobody can sum.
    """

    header: str
    key: str
    kind: str = "text"  # text | number | money | date
    width: Optional[int] = None  # spreadsheet character width
    pdf_width_mm: Optional[float] = None
    truncate: Optional[int] = None  # cap the cell, which on a page has no room to wrap
    date_format: str = "%Y-%m-%d"
    empty: str = ""  # what an absent value reads as
    # The row key holding this row's currency. Per row, not per table: totalling
    # across currencies is already meaningless, and inventing a table-wide one
    # would hide that rather than show it.
    prefix_key: Optional[str] = None
    # Which formats show this column. A page has a fixed width and a spreadsheet
    # does not, so a register with nine useful columns can print the seven that
    # fit and still hand over all nine in a workbook.
    formats: tuple[str, ...] = ("xlsx", "csv", "pdf")


@dataclass
class Table:
    """What to export. Rows are mappings keyed by `Column.key`."""

    title: str
    columns: Sequence[Column]
    rows: Sequence[Mapping[str, Any]]
    sheet_name: str = "Sheet1"
    filename_stem: str = "export"
    # Which column to total. Omitted means no total row anywhere.
    total_key: Optional[str] = None
    # What the PDF prints for that total. Money carries a currency the number
    # itself does not, and only the caller knows which one.
    total_display: Optional[str] = None
    subtitle: Optional[str] = None

    @property
    def total(self) -> float:
        if not self.total_key:
            return 0.0
        return float(sum(float(r.get(self.total_key) or 0) for r in self.rows))

    def columns_for(self, fmt: str) -> list[Column]:
        return [c for c in self.columns if fmt in c.formats]


def _index_of(columns: Sequence[Column], key: str) -> int:
    for i, c in enumerate(columns):
        if c.key == key:
            return i
    raise KeyError(f"No column keyed {key!r}")


def _cell(row: Mapping[str, Any], column: Column) -> str:
    """A cell as a human reads it. `None` is an empty cell, never "None"."""
    value = row.get(column.key)
    if value is None or value == "":
        return column.empty
    if column.kind == "date":
        if isinstance(value, (datetime, date)):
            return value.strftime(column.date_format)
        return str(value)
    if column.kind == "money":
        shown = f"{float(value):,.2f}"
        prefix = row.get(column.prefix_key) if column.prefix_key else None
        return f"{prefix} {shown}" if prefix else shown
    if column.kind == "number":
        return str(value)
    out = str(value)
    if column.truncate:
        out = out[: column.truncate]
    return out


# --- xlsx -------------------------------------------------------------------


def to_xlsx(table: Table) -> bytes:
    """A workbook: title, a blank line, headers, rows, total.

    The blank line is not decoration — it is what lets someone select the
    header row and the data under it without dragging the title in.
    """
    import xlsxwriter

    columns = table.columns_for("xlsx")
    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})
    sheet = workbook.add_worksheet(table.sheet_name)
    bold = workbook.add_format({"bold": True})
    money = workbook.add_format({"num_format": "#,##0.00"})

    sheet.write(0, 0, table.title, bold)
    for col, column in enumerate(columns):
        sheet.write(2, col, column.header, bold)

    for row_index, row in enumerate(table.rows, start=3):
        for col, column in enumerate(columns):
            value = row.get(column.key)
            if column.kind == "money":
                sheet.write_number(row_index, col, float(value or 0), money)
            elif column.kind == "number" and isinstance(value, (int, float, Decimal)):
                sheet.write_number(row_index, col, float(value))
            else:
                sheet.write(row_index, col, _cell(row, column))

    if table.total_key:
        last = len(table.rows) + 3
        total_col = _index_of(columns, table.total_key)
        sheet.write(last, total_col - 1, "Total", bold)
        sheet.write_number(last, total_col, table.total, money)

    for col, column in enumerate(columns):
        if column.width:
            sheet.set_column(col, col, column.width)

    workbook.close()
    return buffer.getvalue()


# --- csv --------------------------------------------------------------------


def to_csv(table: Table) -> bytes:
    columns = table.columns_for("csv")
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([c.header for c in columns])
    for row in table.rows:
        writer.writerow([
            float(row.get(c.key) or 0) if c.kind == "money" else _cell(row, c)
            for c in columns
        ])
    if table.total_key:
        total_col = _index_of(columns, table.total_key)
        line: list[Any] = [""] * len(columns)
        line[total_col - 1] = "Total"
        line[total_col] = table.total
        writer.writerow(line)
    return out.getvalue().encode("utf-8")


# --- pdf --------------------------------------------------------------------


def pdf_elements(table: Table) -> list:
    """The title and the table as reportlab flowables.

    Returned rather than built into a document so a caller with more to say —
    Finance appending receipt images, say — can add pages after it instead of
    reimplementing the header it wants to match.
    """
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, Spacer, Table as RLTable, TableStyle

    columns = table.columns_for("pdf")
    styles = getSampleStyleSheet()
    elements = [Paragraph(table.title, styles["Title"])]
    if table.subtitle:
        elements.append(Paragraph(table.subtitle, styles["Normal"]))
    elements.append(Spacer(1, 8 * mm))

    data = [[c.header for c in columns]]
    for row in table.rows:
        data.append([_cell(row, c) for c in columns])
    if table.total_key:
        total_col = _index_of(columns, table.total_key)
        line = [""] * len(columns)
        line[total_col - 1] = "Total"
        line[total_col] = table.total_display or f"{table.total:,.2f}"
        data.append(line)

    widths = [c.pdf_width_mm * mm if c.pdf_width_mm else None for c in columns]
    rl = RLTable(data, colWidths=widths if all(widths) else None)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
    ]
    if table.total_key:
        style.append(("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"))
    rl.setStyle(TableStyle(style))
    elements.append(rl)
    return elements


def build_pdf(elements: list) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    doc.build(elements)
    return buffer.getvalue()


def to_pdf(table: Table) -> bytes:
    return build_pdf(pdf_elements(table))


# --- the one entry point most callers want ---------------------------------


def render(table: Table, fmt: str) -> tuple[bytes, str, str]:
    """(payload, media type, filename). Raises on an unknown format."""
    if fmt not in MEDIA_TYPES:
        from core.exceptions import BadRequestException

        raise BadRequestException("format must be one of: " + ", ".join(FORMATS))
    payload = {"xlsx": to_xlsx, "csv": to_csv, "pdf": to_pdf}[fmt](table)
    return payload, MEDIA_TYPES[fmt], f"{table.filename_stem}.{fmt}"
