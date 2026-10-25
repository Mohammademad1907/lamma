"""Minimal Lamma logo: a white plate split like a pie chart, one slice pulled out. Writes SVG variants."""
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))
ACCENT = '#E8552D'

def pt(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)

def wedge(cx, cy, r, a1, a2):
    x1, y1 = pt(cx, cy, r, a1)
    x2, y2 = pt(cx, cy, r, a2)
    large = 1 if (a2 - a1) % 360 > 180 else 0
    return f'M{cx:.1f},{cy:.1f} L{x1:.1f},{y1:.1f} A{r},{r} 0 {large} 1 {x2:.1f},{y2:.1f} Z'

def art(scale, color='#FFFFFF'):
    cx = cy = 256
    R = 140
    cx, cy = 246, 266                                 # nudge so the pulled slice stays balanced
    big = wedge(cx, cy, R, 0 + 4, 270 - 4)              # 3/4 of the plate
    dx, dy = pt(0, 0, 26, -45)                        # top-right slice pulled out
    small = wedge(cx + dx, cy + dy, R, -90 + 4, 0 - 4)
    t = f'translate(256,256) scale({scale}) translate(-256,-256)'
    return f'<g transform="{t}" fill="{color}"><path d="{big}"/><path d="{small}"/></g>'

def svg(kind):
    head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
    if kind == 'bg':
        return head + f'<rect width="512" height="512" fill="{ACCENT}"/></svg>'
    if kind == 'fg':
        return head + art(0.62) + '</svg>'
    if kind == 'mark':  # accent mark on transparent, for use inside the app
        return head + art(1.0, ACCENT) + '</svg>'
    shape = '<circle cx="256" cy="256" r="256"' if kind == 'round' else '<rect width="512" height="512" rx="116"'
    return head + f'{shape} fill="{ACCENT}"/>' + art(0.80) + '</svg>'

for kind in ['full', 'round', 'bg', 'fg', 'mark']:
    open(os.path.join(OUT, f'logo2_{kind}.svg'), 'w').write(svg(kind))
print('ok')
