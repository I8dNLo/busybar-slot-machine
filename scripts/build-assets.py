"""Rebuild original C artwork/audio using the official firmware asset encoder."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MASKS = [
    [6, 15, 30, 31, 15, 6, 0], [3, 6, 12, 10, 21, 21, 10],
    [14, 17, 21, 21, 21, 17, 14], [0, 10, 31, 31, 14, 4, 0],
    [4, 14, 31, 31, 14, 4, 0], [4, 14, 4, 21, 31, 4, 14],
    [4, 14, 31, 31, 4, 4, 14],
]
COLORS = [(255, 225, 0), (255, 35, 48), (255, 175, 0), (255, 35, 48),
          (255, 35, 48), (235, 240, 255), (235, 240, 255)]

def frame(symbol, offset=0, moving=False, flash=False):
    image = Image.new('RGB', (22, 16))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 21, 15), outline=(0, 210, 255) if moving else (255, 205, 0) if flash else 'white')
    def paint(value, y):
        for row, mask in enumerate(MASKS[value]):
            for col in range(5):
                if mask & (1 << (4-col)):
                    color = COLORS[value]
                    if (value == 0 and row == 0) or (value == 1 and row < 3): color = (20, 235, 80)
                    if value == 2 and row == 2 and col == 2: color = (255, 255, 255)
                    draw.rectangle((6+col*2, y+row*2, 7+col*2, y+row*2+1), fill=color)
    paint(symbol, 1+offset)
    if moving:
        paint((symbol+1)%7, 1+offset-16)
        for y in range(2, 15, 4):
            draw.point((3,y), fill=(55,60,70))
            draw.point((18,y+1), fill=(55,60,70))
    return image

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--firmware', type=Path, required=True, help='Official firmware checkout at 1.3.1-rc or newer')
    parser.add_argument('--legacy', type=Path, default=ROOT.parent/'busybar-projects-legacy')
    args = parser.parse_args()
    sys.path.insert(0, str(args.firmware/'scripts'))
    from seq2anim import BSBAnimConverter, PixelEncoding
    if not hasattr(PixelEncoding, 'QOI_LIKE'):
        raise SystemExit('Use the animation converter from firmware 1.3.1-rc or newer')
    dest = ROOT/'src'
    for folder in ('animations', 'sounds', 'appmeta'): (dest/folder).mkdir(parents=True, exist_ok=True)
    # Retire the seven section-based files emitted by the first generator.
    for symbol in range(7): (dest/'animations'/f'reel-{symbol}.anim').unlink(missing_ok=True)
    for symbol in range(7):
        # 40 fps with three identical frames per step = the C app's 75 ms tick.
        sequences = {'still':[frame(symbol)], 'spin':[], 'win':[]}
        for tick in range(28):
            sequences['spin'].extend([frame((symbol+tick//4)%7, (tick%4)*4, True)]*3)
        for tick in range(1,25):
            sequences['win'].extend([frame(symbol, flash=(tick//2)%2 == 0)]*3)
        for kind, frames in sequences.items():
            meta = {'fps': 40, 'color_mode': 'rgb888', 'sections': []}
            with tempfile.TemporaryDirectory() as temp:
                paths = []
                for i, image in enumerate(frames):
                    path = Path(temp)/f'frame_{i}.png'
                    image.save(path)
                    paths.append(path)
                with (dest/'animations'/f'{kind}-{symbol}.anim').open('wb') as output:
                    BSBAnimConverter()._do_convert(meta, paths, output)
    for name in ('spin', 'coins', 'lose'):
        subprocess.run([sys.executable, str(args.firmware/'scripts/audio.py'),
                        str(args.legacy/f'assets/sounds/slot_machine/{name}.wav'),
                        str(dest/f'sounds/{name}.snd')], check=True)
    for side, size in [('front','8x8'), ('back','11x11')]:
        shutil.copyfile(args.legacy/f'assets/images/external/apps_menu/slot_{side}_{size}.png', dest/f'appmeta/icon_{side}_{size}.png')
    preview = Image.new('RGB', (72,16))
    for i, symbol in enumerate([0,1,2]): preview.paste(frame(symbol), (1+24*i,0))
    (ROOT/'artifacts').mkdir(exist_ok=True)
    preview.resize((720,160), Image.Resampling.NEAREST).save(ROOT/'artifacts/slot-preview.png')
    print('Built 21 native reel animations, three original sounds and two menu icons.')

if __name__ == '__main__': main()
