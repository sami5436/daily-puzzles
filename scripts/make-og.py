"""Draws the link preview card. Run: python3 scripts/make-og.py"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG, TEXT, MUTED, RULE = "#faf9f7", "#191817", "#75726d", "#d2cec6"
P1, P2 = "#2f6b4f", "#a2542b"

SF = "/System/Library/Fonts/SFNS.ttf"
FALLBACK = "/System/Library/Fonts/HelveticaNeue.ttc"


def font(size, weight="Regular"):
    try:
        f = ImageFont.truetype(SF, size)
        try:
            f.set_variation_by_name(weight)
        except Exception:
            pass
        return f
    except Exception:
        return ImageFont.truetype(FALLBACK, size)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

M = 88
d.text((M, 112), "Daily Puzzles", font=font(78, "Semibold"), fill=TEXT)
d.text((M, 214), "Wordle, Strands and the LinkedIn puzzles.",
       font=font(34), fill=MUTED)
d.text((M, 260), "Two players, one scoreboard.", font=font(34), fill=MUTED)

d.line([(M, 352), (W - M, 352)], fill=RULE, width=2)

# A few sample rows so the card reads as a scoreboard at a glance.
rows = [("Wordle", "4/6", "3/6", P2), ("Queens", "0:42", "1:05", P1), ("Zip", "0:31", "0:28", P2)]
label_f, score_f = font(34), font(34, "Semibold")
y = 400
for name, a, b, winner in rows:
    d.text((M, y), name, font=label_f, fill=TEXT)
    ca = P1 if winner == P1 else MUTED
    cb = P2 if winner == P2 else MUTED
    d.text((W - M - 320, y), a, font=score_f, fill=ca, anchor="la")
    d.text((W - M, y), b, font=score_f, fill=cb, anchor="ra")
    y += 62

img.save("public/og.png", optimize=True)

# Home screen icon: the same four square mark as the favicon.
S = 180
icon = Image.new("RGB", (S, S), BG)
di = ImageDraw.Draw(icon)
q, g = 52, 14
ox = oy = (S - (q * 2 + g)) // 2
for i, colour in enumerate((TEXT, P1, P2, TEXT)):
    x = ox + (i % 2) * (q + g)
    y = oy + (i // 2) * (q + g)
    di.rectangle([x, y, x + q, y + q], fill=colour)
icon.save("public/icon.png", optimize=True)

print("wrote public/og.png and public/icon.png")
