import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


DARK_BG = colors.HexColor("#151515")
DARK_ROW_ALT = colors.HexColor("#1A1A1A")
DARK_BORDER = colors.HexColor("#242424")
TEXT_PRIMARY = colors.HexColor("#F2F2F2")
TEXT_SECONDARY = colors.HexColor("#B8B8B8")
ACCENT_GREEN = colors.HexColor("#5F8F6B")


def _header_footer(canvas, doc):
    canvas.saveState()

    # Header
    canvas.setFillColor(DARK_BG)
    canvas.rect(0, A4[1] - 50, A4[0], 50, fill=1, stroke=0)
    canvas.setFillColor(TEXT_PRIMARY)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawString(30, A4[1] - 35, "NavDashboard")
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(TEXT_SECONDARY)
    canvas.drawRightString(A4[0] - 30, A4[1] - 35, datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))

    # Footer
    canvas.setFillColor(DARK_BG)
    canvas.rect(0, 0, A4[0], 30, fill=1, stroke=0)
    canvas.setFillColor(TEXT_SECONDARY)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(30, 10, "NavDashboard — LiFi Device Management System")
    canvas.drawRightString(A4[0] - 30, 10, f"Page {doc.page}")

    canvas.restoreState()


def create_pdf_template(title: str, subtitle: str = "") -> tuple:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=70,
        bottomMargin=50,
    )

    elements = []

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#1A1A1A"),
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#555555"),
        spaceAfter=20,
    )

    elements.append(Paragraph(title, title_style))
    if subtitle:
        elements.append(Paragraph(subtitle, subtitle_style))
    elements.append(Spacer(1, 12))

    return doc, elements


def add_table_to_pdf(elements: list, headers: list[str], rows: list[list], title: str = ""):
    styles = getSampleStyleSheet()

    if title:
        section_style = ParagraphStyle(
            "SectionTitle",
            parent=styles["Heading2"],
            fontSize=14,
            textColor=colors.HexColor("#1A1A1A"),
            spaceBefore=20,
            spaceAfter=10,
        )
        elements.append(Paragraph(title, section_style))

    if not rows:
        elements.append(Paragraph("No data available.", styles["Normal"]))
        elements.append(Spacer(1, 12))
        return

    table_data = [headers] + rows

    col_count = len(headers)
    available_width = A4[0] - 60
    col_width = available_width / col_count
    col_widths = [col_width] * col_count

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    style_commands = [
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_PRIMARY),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),

        # Body
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 7),
        ("ALIGN", (0, 1), (-1, -1), "LEFT"),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("TOPPADDING", (0, 1), (-1, -1), 5),

        # Grid
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]

    # Alternating row colors
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            style_commands.append(
                ("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F5F5F5"))
            )

    table.setStyle(TableStyle(style_commands))

    elements.append(table)
    elements.append(Spacer(1, 16))


def add_summary_section(elements: list, stats: dict):
    styles = getSampleStyleSheet()

    section_style = ParagraphStyle(
        "SummaryTitle",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#1A1A1A"),
        spaceBefore=10,
        spaceAfter=10,
    )
    elements.append(Paragraph("Summary", section_style))

    table_data = [[k, v] for k, v in stats.items()]
    table = Table(table_data, colWidths=[200, 200])
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1A1A1A")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 20))


def finalize_pdf(doc: SimpleDocTemplate, elements: list) -> bytes:
    doc.build(elements, onFirstPage=_header_footer, onLaterPages=_header_footer)
    doc.filename.seek(0)
    return doc.filename.read()