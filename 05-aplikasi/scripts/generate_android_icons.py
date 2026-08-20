"""Generate ANTARQ launcher icons from the official PNG mark."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "03-backend-lokal" / "public" / "logo-antarq-light.png"
APPS = [
    ROOT / "customer-android",
    ROOT / "kurir-android",
    ROOT / "outlet-android",
]

GREEN = (0x22, 0xC5, 0x5E, 255)

LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def extract_mark() -> Image.Image:
    im = Image.open(SOURCE).convert("RGBA")
    # Official wordmark: mark is left of the 32px gap before the text.
    crop = im.crop((16, 16, 278, 210))
    arr = np.array(crop)
    lum = arr[:, :, :3].max(axis=2)
    mask = lum > 28
    arr[..., 0] = 255
    arr[..., 1] = 255
    arr[..., 2] = 255
    arr[..., 3] = np.where(mask, 255, 0).astype(np.uint8)
    mark = Image.fromarray(arr, "RGBA")
    a = arr[:, :, 3]
    ys, xs = np.where(a > 16)
    mark = mark.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    side = max(mark.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(mark, dest=((side - mark.width) // 2, (side - mark.height) // 2))
    return square


def place(logo: Image.Image, canvas: Image.Image, fill: float) -> Image.Image:
    side = int(round(min(canvas.size) * fill))
    fitted = logo.resize((side, side), Image.Resampling.LANCZOS)
    x = (canvas.width - side) // 2
    y = (canvas.height - side) // 2
    canvas.alpha_composite(fitted, dest=(x, y))
    return canvas


def make_legacy(logo: Image.Image, size: int) -> Image.Image:
    hi = Image.new("RGBA", (size * 4, size * 4), GREEN)
    place(logo, hi, 0.62)
    return hi.resize((size, size), Image.Resampling.LANCZOS).convert("RGB")


def make_foreground(logo: Image.Image, size: int) -> Image.Image:
    hi = Image.new("RGBA", (size * 4, size * 4), (0, 0, 0, 0))
    place(logo, hi, 0.48)
    return hi.resize((size, size), Image.Resampling.LANCZOS)


def write_adaptive_xml(res: Path) -> None:
    anydpi = res / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"""
    (anydpi / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (anydpi / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")


def ensure_colors(res: Path) -> None:
    values = res / "values"
    values.mkdir(parents=True, exist_ok=True)
    colors_path = values / "colors.xml"
    if colors_path.exists():
        text = colors_path.read_text(encoding="utf-8")
        if "ic_launcher_background" not in text:
            text = text.replace(
                "</resources>",
                '    <color name="ic_launcher_background">#22C55E</color>\n</resources>',
            )
            colors_path.write_text(text, encoding="utf-8")
    else:
        colors_path.write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            "<resources>\n"
            '    <color name="ic_launcher_background">#22C55E</color>\n'
            "</resources>\n",
            encoding="utf-8",
        )


def generate_for_app(app_dir: Path, logo: Image.Image) -> None:
    res = app_dir / "android" / "app" / "src" / "main" / "res"
    ensure_colors(res)
    write_adaptive_xml(res)

    broken_vector = res / "drawable" / "ic_launcher_foreground.xml"
    if broken_vector.exists():
        broken_vector.unlink()

    for folder, size in LEGACY_SIZES.items():
        out_dir = res / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        legacy = make_legacy(logo, size)
        legacy.save(out_dir / "ic_launcher.png")
        legacy.save(out_dir / "ic_launcher_round.png")

    for folder, size in FOREGROUND_SIZES.items():
        out_dir = res / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        make_foreground(logo, size).save(out_dir / "ic_launcher_foreground.png")

    print(f"OK {app_dir.name}")


def main() -> None:
    mark = extract_mark()
    make_legacy(mark, 512).save(Path(__file__).with_name("icon-preview.png"))
    for app in APPS:
        generate_for_app(app, mark)


if __name__ == "__main__":
    main()
