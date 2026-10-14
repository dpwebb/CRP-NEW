"""Build a marketing-led CRP identity concept and realistic product-context board.

Outputs are outlined SVG, so they do not depend on the viewer having Manrope.
The report example is fictional and labelled as an illustration.
"""

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

import fitz

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "competition-entry-2026-10-11"))
import build_logo as base

FONTS = HERE / "assets"
FOREST = "#17332F"
DEEP = "#102923"
MID = "#3C6256"
MUTED = "#61766B"
LIME = "#D7ED94"
CREAM = "#F7F8F0"
PALE = "#EEF3E7"
PAPER = "#FFFFFF"
BORDER = "#D7E1D6"
AMBER = "#B47D38"

_weight = None


def text(value, x, baseline, size, weight=600, color=FOREST, tracking=0):
    global _weight
    if weight != _weight:
        path = FONTS / f"Manrope-{weight}.ttf"
        base.FONT_PATH = path
        base.FONT = base.TTFont(path)
        base.GLYPHS = base.FONT.getGlyphSet()
        base.CMAP = base.FONT.getBestCmap()
        base.UNITS = base.FONT["head"].unitsPerEm
        _weight = weight
    return base.glyphs(value, x, baseline, size, color, tracking)


def t(value, x, baseline, size, weight=600, color=FOREST, tracking=0):
    return text(value, x, baseline, size, weight, color, tracking)[0]


def rect(x, y, w, h, fill, radius=0, stroke=None, sw=1):
    stroke_attr = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"{stroke_attr}/>'


def line(x1, y1, x2, y2, color, sw=1):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"/>'


def circle(cx, cy, r, fill, stroke=None, sw=1):
    stroke_attr = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{stroke_attr}/>'


def centered(value, x, y, width, size, weight, color):
    _, advance = text(value, 0, 0, size, weight, color)
    return t(value, x + (width - advance) / 2, y, size, weight, color)


def wordmark(x, baseline, size, reverse=False):
    main = CREAM if reverse else FOREST
    a, aw = text("Credit Regulator", x, baseline, size, 800, main, tracking=-1.1)
    b = t(" Pro", x + aw - 1.2, baseline, size, 800, main, tracking=-1.1)
    return a + b


def report_mark(x, y, size, reverse=False, monochrome=False):
    """A report page with one selected source row extending into action."""
    ink = CREAM if reverse else FOREST
    highlight = ink if monochrome else LIME
    selected_ink = DEEP
    s = size / 120
    if monochrome:
        row = (f'<path d="M27 77H117V100H27Z '
               'M36 83H47V94H36Z M55 85H102V92H55Z" '
               f'fill="{highlight}" fill-rule="evenodd"/>')
    else:
        row = (f'<rect x="27" y="77" width="90" height="23" rx="3" fill="{highlight}"/>'
               f'<rect x="36" y="83" width="11" height="11" rx="1" fill="{selected_ink}"/>'
               f'<rect x="55" y="85" width="47" height="7" rx="2" fill="{selected_ink}"/>')
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<path d="M17 10H76L96 30V108H17Z" fill="none" '
            f'stroke="{ink}" stroke-width="8" stroke-linejoin="round"/>'
            f'<path d="M76 11V30H95" fill="none" stroke="{ink}" '
            f'stroke-width="7" stroke-linejoin="round"/>'
            f'<path d="M34 43H68M34 60H62" fill="none" stroke="{ink}" '
            f'stroke-width="8" stroke-linecap="round"/>'
            f'{row}'
            '</g>')


def lockup(x, y, mark_size, font_size, reverse=False, monochrome=False):
    mark = report_mark(x, y, mark_size, reverse, monochrome)
    return mark + wordmark(x + mark_size + font_size * .27,
                           y + mark_size * .76, font_size, reverse)


def save(name, width, height, body, description, scale=1.5, alpha=False):
    svg = base.svg(width, height, body, description)
    svg_path = HERE / f"{name}.svg"
    png_path = HERE / f"{name}.png"
    svg_path.write_text(svg, encoding="utf-8")
    ET.fromstring(svg)
    doc = fitz.open(svg_path)
    doc[0].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=alpha).save(png_path)
    return svg_path, png_path


def campaign_board():
    body = rect(0, 0, 1800, 1460, "#E9EFE9")
    body += t("CREDIT REGULATOR PRO / MARKETING DIRECTION", 70, 79, 19, 800, MID, tracking=1.8)
    body += t("Make the customer's next move feel possible.", 70, 151, 50, 800, FOREST, tracking=-1.8)
    body += t("Lead with clear evidence, visible choice and a reason to return.", 72, 200, 24, 500, MUTED)

    # A realistic landing page, not a proposed runtime edit.
    body += rect(68, 254, 1664, 1047, PAPER, 25, BORDER, 2)
    body += rect(69, 255, 1662, 1045, CREAM, 24)
    body += line(69, 356, 1731, 356, BORDER, 2)
    body += lockup(125, 274, 58, 31)
    body += t("How it works", 1190, 319, 20, 600, FOREST)
    body += t("What you get", 1363, 319, 20, 600, FOREST)
    body += rect(1534, 281, 139, 49, FOREST, 24)
    body += centered("Start here", 1534, 313, 139, 18, 700, CREAM)

    # Consumer-facing promise.
    body += t("Your report.", 130, 489, 84, 800, FOREST, tracking=-3.3)
    body += t("Your next move.", 130, 583, 84, 800, FOREST, tracking=-3.3)
    body += rect(130, 602, 470, 10, LIME, 4)
    body += t("We check key details in your credit report.", 135, 684, 27, 600, FOREST)
    body += t("See supported issues, choose what to challenge,", 135, 727, 25, 500, MID)
    body += t("then approve and download a packet to send.", 135, 762, 25, 500, MID)
    body += rect(135, 811, 389, 71, FOREST, 10)
    body += centered("Review my credit report", 135, 855, 389, 24, 700, CREAM)
    body += t("You choose what goes into the packet you send.", 135, 921, 21, 600, MUTED)

    # Product evidence: fictional facts, possible issue, explicit user decision.
    body += rect(933, 402, 725, 631, "#DBE5DA", 25)
    body += rect(925, 393, 725, 631, PAPER, 25, BORDER, 2)
    body += t("ILLUSTRATIVE REPORT REVIEW", 963, 442, 17, 800, MUTED, tracking=1.4)
    step_x = (983, 1204, 1412)
    for i, (x, label) in enumerate(zip(step_x, ("REVIEW", "CHOOSE", "APPROVE")), 1):
        body += circle(x, 489, 20, FOREST if i < 3 else PAPER, FOREST, 2)
        body += centered(str(i), x - 20, 496, 40, 17, 800, CREAM if i < 3 else FOREST)
        body += t(label, x + 34, 496, 16, 800, FOREST if i < 3 else MUTED, tracking=1.2)
    body += line(1093, 489, 1154, 489, BORDER, 3)
    body += line(1317, 489, 1360, 489, BORDER, 3)

    body += rect(963, 538, 651, 211, CREAM, 15, BORDER, 1.5)
    body += t("FROM YOUR REPORT", 987, 570, 16, 800, MUTED, tracking=1.2)
    body += t("Account status", 987, 615, 21, 600, FOREST)
    body += t("Open", 1487, 615, 21, 800, FOREST)
    body += line(987, 633, 1589, 633, BORDER, 1.4)
    body += t("Closed date", 987, 673, 21, 600, FOREST)
    body += t("May 2025", 1469, 673, 21, 800, FOREST)
    body += rect(987, 697, 143, 30, PAPER, 15, BORDER, 1)
    body += centered("View page 3", 987, 718, 143, 14, 700, MUTED)

    body += rect(963, 770, 651, 130, PALE, 15)
    body += rect(963, 770, 9, 130, LIME, 3)
    body += t("VIOLATION", 991, 806, 17, 800, FOREST, tracking=1.1)
    body += t("Open status conflicts with a listed closed date.", 991, 847, 20, 700, FOREST)
    body += t("Account status consistency / Report page 3", 991, 877, 16, 500, MUTED)

    body += rect(963, 924, 319, 68, FOREST, 9)
    body += rect(985, 945, 23, 23, FOREST, 5, LIME, 2)
    body += '<path d="M990 956l5 5 9-11" fill="none" stroke="' + LIME + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    body += t("Include in my packet", 1024, 967, 19, 700, CREAM)
    body += t("Approve, download", 1320, 956, 18, 700, FOREST)
    body += t("and send yourself", 1320, 983, 18, 500, MUTED)

    # Continuity is the subscriber benefit, distinct from the first packet.
    body += rect(130, 1087, 1540, 167, FOREST, 17)
    body += rect(153, 1110, 10, 120, LIME, 5)
    body += t("Come back with your next report.", 188, 1154, 36, 800, CREAM, tracking=-0.8)
    body += t("With a subscription, save report history and compare later reports.", 190, 1199, 21, 500, CREAM)
    body += rect(1240, 1120, 186, 99, "#2D4F45", 10)
    body += t("EARLIER", 1262, 1152, 15, 700, LIME, tracking=1)
    body += t("Report A", 1262, 1193, 23, 700, CREAM)
    body += line(1436, 1170, 1480, 1170, LIME, 3)
    body += '<path d="M1468 1158l13 12-13 12" fill="none" stroke="' + LIME + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    body += rect(1490, 1120, 160, 99, "#2D4F45", 10)
    body += t("LATER", 1512, 1152, 15, 700, LIME, tracking=1)
    body += t("Report B", 1512, 1193, 23, 700, CREAM)

    body += t("THE MARKETING LOGIC", 71, 1364, 17, 800, MID, tracking=1.7)
    body += t("Understand  /  Choose  /  Compare again", 71, 1410, 32, 800, FOREST)
    body += t("Fictional example for concept review", 1304, 1410, 16, 500, MUTED)
    return save("marketing-direction-board", 1800, 1460, body,
                "Credit Regulator Pro marketing-led identity shown in an illustrative landing page")


def graphic_campaign_board():
    """The compact logo mark expanded into a visual of evidence and choice."""
    body = rect(0, 0, 1800, 1280, CREAM)
    body += t("MARKETING CONCEPT / SELECTED EVIDENCE", 82, 80, 18, 800, MID, tracking=1.6)
    body += lockup(79, 100, 71, 38)
    body += line(80, 193, 1720, 193, BORDER, 2)

    body += t("Your report.", 80, 371, 86, 800, FOREST, tracking=-3.2)
    body += t("Your next move.", 80, 471, 86, 800, FOREST, tracking=-3.2)
    body += rect(85, 491, 470, 11, LIME, 5)
    body += t("See the facts behind a reporting issue.", 84, 579, 29, 600, FOREST)
    body += t("Choose what to challenge. Approve and", 84, 626, 27, 500, MID)
    body += t("download a packet you can send.", 84, 665, 27, 500, MID)
    body += rect(84, 720, 396, 75, FOREST, 11)
    body += centered("Review my credit report", 84, 768, 396, 24, 700, CREAM)
    body += t("Your decision stays at the center.", 84, 841, 22, 600, MUTED)

    # A bold illustration of the same selected report row used in the logo.
    body += rect(860, 229, 860, 708, DEEP, 28)
    body += t("REPORT DETAIL", 905, 282, 18, 800, LIME, tracking=1.5)
    body += t("YOUR APPROVED LETTER", 1363, 282, 18, 800, LIME, tracking=1.3)
    body += rect(916, 339, 347, 502, "#335248", 16)
    body += rect(904, 327, 347, 502, PAPER, 16)
    body += rect(1379, 376, 299, 453, "#335248", 16)
    body += rect(1367, 364, 299, 453, PAPER, 16)

    # The chosen band sits directly behind the conflicting closed-date fact
    # and the first line of the consumer's request.
    body += rect(929, 500, 702, 44, LIME, 6)
    body += rect(1272, 490, 61, 61, DEEP, 8, LIME, 3)
    body += '<path d="M1288 519l11 11 20-23" fill="none" stroke="' + LIME + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
    body += rect(1229, 575, 143, 38, DEEP, 19, LIME, 2)
    body += centered("YOU CHOOSE", 1229, 601, 143, 15, 800, LIME)

    body += t("CREDIT REPORT", 934, 374, 18, 800, FOREST, tracking=1.1)
    body += line(934, 392, 1218, 392, BORDER, 2)
    body += t("Account status", 934, 453, 21, 600, MUTED)
    body += t("Open", 1155, 453, 21, 800, FOREST)
    body += line(934, 472, 1218, 472, BORDER, 1.5)
    body += t("Closed date", 934, 530, 21, 700, FOREST)
    body += t("May 2025", 1100, 530, 21, 800, FOREST)
    body += rect(934, 582, 180, 37, PALE, 18)
    body += centered("VIEW PAGE 3", 934, 608, 180, 15, 800, MID)
    body += line(934, 676, 1196, 676, BORDER, 5)
    body += line(934, 704, 1168, 704, BORDER, 5)
    body += line(934, 732, 1190, 732, BORDER, 5)

    body += t("YOUR LETTER", 1397, 411, 18, 800, FOREST, tracking=1.1)
    body += line(1397, 430, 1634, 430, BORDER, 2)
    body += t("To the credit bureau", 1397, 486, 19, 600, FOREST)
    body += t("Please verify whether", 1397, 531, 18, 700, FOREST)
    body += t("this account is open or", 1397, 587, 18, 600, FOREST)
    body += t("closed. My report lists", 1397, 619, 18, 600, FOREST)
    body += t("both an Open status and", 1397, 651, 18, 600, FOREST)
    body += t("a closed date.", 1397, 683, 18, 600, FOREST)
    body += t("Report page 3 enclosed", 1397, 761, 17, 700, MID)
    body += t("A report detail becomes part of the packet only when you select it.",
              913, 893, 21, 500, CREAM)

    body += rect(80, 1014, 1640, 178, FOREST, 19)
    body += rect(110, 1043, 11, 119, LIME, 5)
    body += t("A reason to return: see what changed.", 151, 1090, 38, 800, CREAM)
    body += t("With a subscription, save report history and compare later reports.",
              152, 1140, 23, 500, CREAM)
    body += rect(1320, 1050, 151, 105, "#335248", 10)
    body += rect(1507, 1050, 151, 105, "#335248", 10)
    body += t("EARLIER", 1343, 1083, 15, 800, LIME, tracking=1)
    body += t("Report", 1343, 1128, 24, 700, CREAM)
    body += t("LATER", 1530, 1083, 15, 800, LIME, tracking=1)
    body += t("Report", 1530, 1128, 24, 700, CREAM)
    body += line(1471, 1103, 1503, 1103, LIME, 3)
    body += '<path d="M1492 1092l12 11-12 11" fill="none" stroke="' + LIME + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    body += t("Illustrative graphic; report facts and letter are fictional", 82, 1242, 17, 500, MUTED)
    return save("graphic-led-campaign", 1800, 1280, body,
                "Credit Regulator Pro graphic-led campaign showing report evidence chosen for a consumer-approved letter")


def logo_board():
    body = rect(0, 0, 1600, 1020, CREAM)
    body += t("CREDIT REGULATOR PRO / IDENTITY", 75, 88, 19, 800, MID, tracking=1.8)
    body += t("A report detail becomes a customer's choice.", 75, 159, 47, 800, FOREST, tracking=-1.4)
    body += line(75, 207, 1525, 207, BORDER, 2)
    body += t("PRIMARY", 75, 270, 18, 800, MUTED, tracking=1.6)
    body += rect(75, 298, 1450, 236, PAPER, 15)
    body += lockup(116, 322, 132, 73)
    body += t("Your report. Your next move.", 281, 479, 30, 600, FOREST)
    body += t("REVERSE", 75, 594, 18, 800, MUTED, tracking=1.6)
    body += rect(75, 621, 1450, 226, FOREST, 15)
    body += lockup(116, 645, 132, 73, reverse=True)
    body += t("Your report. Your next move.", 281, 798, 30, 600, CREAM)
    body += t("The selected row is the graphic signature across the logo and campaign.", 75, 933, 25, 600, FOREST)
    body += t("Use the full name in first-contact marketing.", 75, 972, 19, 500, MUTED)
    return save("wordmark-and-message", 1600, 1020, body,
                "Credit Regulator Pro wordmark and marketing message on light and dark backgrounds")


def export_logo():
    body = wordmark(16, 70, 62)
    save("credit-regulator-pro-wordmark", 650, 94, body,
         "Credit Regulator Pro wordmark", scale=2.5, alpha=True)
    reverse = wordmark(16, 70, 62, reverse=True)
    save("credit-regulator-pro-wordmark-reverse", 650, 94, reverse,
         "Credit Regulator Pro reverse wordmark", scale=2.5, alpha=True)
    mono = wordmark(16, 70, 62)
    save("credit-regulator-pro-wordmark-one-color", 650, 94, mono,
         "Credit Regulator Pro one-color wordmark", scale=2.5, alpha=True)
    save("credit-regulator-pro-logo", 765, 110,
         lockup(8, 8, 88, 62),
         "Credit Regulator Pro report-row logo", scale=2.5, alpha=True)
    save("credit-regulator-pro-logo-reverse", 765, 110,
         lockup(8, 8, 88, 62, reverse=True),
         "Credit Regulator Pro reverse report-row logo", scale=2.5, alpha=True)
    save("credit-regulator-pro-logo-one-color", 765, 110,
         lockup(8, 8, 88, 62, monochrome=True),
         "Credit Regulator Pro one-color report-row logo", scale=2.5, alpha=True)
    save("credit-regulator-pro-symbol", 120, 120,
         report_mark(0, 0, 120),
         "Credit Regulator Pro selected report-row symbol", scale=4, alpha=True)
    save("credit-regulator-pro-symbol-one-color", 120, 120,
         report_mark(0, 0, 120, monochrome=True),
         "Credit Regulator Pro one-color selected report-row symbol", scale=4, alpha=True)


if __name__ == "__main__":
    campaign_board()
    graphic_campaign_board()
    logo_board()
    export_logo()
