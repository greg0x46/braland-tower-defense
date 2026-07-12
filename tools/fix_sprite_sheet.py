#!/usr/bin/env python3
"""Normalize an uneven AI-generated sprite sheet into a fixed grid."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path
from typing import Sequence

try:
    from PIL import Image, ImageChops, ImageDraw
except ImportError as exc:
    raise SystemExit(
        "Missing Pillow. Install it with: python3 -m pip install Pillow"
    ) from exc


Resampling = Image.Resampling


Component = dict[str, object]


def parse_spacing(values: Sequence[int], name: str) -> tuple[int, int, int, int]:
    if len(values) == 1:
        top = right = bottom = left = values[0]
    elif len(values) == 2:
        top = bottom = values[0]
        right = left = values[1]
    elif len(values) == 4:
        top, right, bottom, left = values
    else:
        raise argparse.ArgumentTypeError(
            f"{name} accepts 1, 2, or 4 integers: all | vertical horizontal | top right bottom left"
        )

    if min(top, right, bottom, left) < 0:
        raise argparse.ArgumentTypeError(f"{name} cannot contain negative values")

    return top, right, bottom, left


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def non_negative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be zero or greater")
    return parsed


def trim_alpha(image: Image.Image, threshold: int) -> Image.Image:
    alpha = image.getchannel("A")
    if threshold > 0:
        alpha = alpha.point(lambda pixel: 255 if pixel > threshold else 0)

    bbox = alpha.getbbox()
    if bbox is None:
        return image
    return image.crop(bbox)


def trim_solid_background(image: Image.Image, tolerance: int) -> Image.Image:
    corners = [
        image.getpixel((0, 0)),
        image.getpixel((image.width - 1, 0)),
        image.getpixel((0, image.height - 1)),
        image.getpixel((image.width - 1, image.height - 1)),
    ]
    background = max(set(corners), key=corners.count)
    background_image = Image.new(image.mode, image.size, background)
    diff = ImageChops.difference(image, background_image)

    if tolerance > 0:
        diff = diff.point(lambda pixel: 0 if pixel <= tolerance else 255)

    bbox = diff.getbbox()
    if bbox is None:
        return image
    return image.crop(bbox)


def is_checkerboard_background_pixel(
    pixel: tuple[int, int, int, int],
    min_channel: int,
    tolerance: int,
) -> bool:
    red, green, blue, alpha = pixel
    if alpha == 0:
        return True
    return min(red, green, blue) >= min_channel and max(red, green, blue) - min(
        red,
        green,
        blue,
    ) <= tolerance


def remove_connected_checkerboard_background(
    image: Image.Image,
    min_channel: int,
    tolerance: int,
) -> Image.Image:
    """Turn edge-connected light gray checkerboard pixels transparent."""

    output = image.copy()
    pixels = output.load()
    width, height = output.size
    seen = bytearray(width * height)
    stack: list[tuple[int, int]] = []

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if seen[index]:
            return
        seen[index] = 1
        if is_checkerboard_background_pixel(pixels[x, y], min_channel, tolerance):
            stack.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(1, height - 1):
        enqueue(0, y)
        enqueue(width - 1, y)

    while stack:
        x, y = stack.pop()
        red, green, blue, _alpha = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or nx >= width or ny < 0 or ny >= height:
                continue
            index = ny * width + nx
            if seen[index]:
                continue
            seen[index] = 1
            if is_checkerboard_background_pixel(pixels[nx, ny], min_channel, tolerance):
                stack.append((nx, ny))

    return output


def alpha_components(
    alpha: Image.Image,
    origin: tuple[int, int],
    threshold: int,
    min_pixels: int,
) -> list[Component]:
    pixels = alpha.load()
    width, height = alpha.size
    seen = bytearray(width * height)
    components: list[Component] = []
    origin_x, origin_y = origin

    for y in range(height):
        for x in range(width):
            start_index = y * width + x
            if seen[start_index] or pixels[x, y] <= threshold:
                continue

            stack = [(x, y)]
            seen[start_index] = 1
            points: list[tuple[int, int]] = []
            sum_x = 0
            sum_y = 0

            while stack:
                px, py = stack.pop()
                world_x = px + origin_x
                world_y = py + origin_y
                points.append((world_x, world_y))
                sum_x += world_x
                sum_y += world_y

                for nx in (px - 1, px, px + 1):
                    for ny in (py - 1, py, py + 1):
                        if nx < 0 or nx >= width or ny < 0 or ny >= height:
                            continue
                        index = ny * width + nx
                        if seen[index] or pixels[nx, ny] <= threshold:
                            continue
                        seen[index] = 1
                        stack.append((nx, ny))

            if len(points) < min_pixels:
                continue

            xs = [point[0] for point in points]
            ys = [point[1] for point in points]
            components.append(
                {
                    "count": len(points),
                    "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1),
                    "centroid": (sum_x / len(points), sum_y / len(points)),
                    "points": points,
                }
            )

    return components


def isolate_component(
    image: Image.Image,
    alpha: Image.Image,
    component: Component,
    threshold: int,
) -> tuple[Image.Image, tuple[float, float]]:
    left, top, right, bottom = component["bbox"]  # type: ignore[misc]
    crop = image.crop((left, top, right, bottom))
    mask = Image.new("L", crop.size, 0)
    mask_pixels = mask.load()
    alpha_pixels = alpha.load()

    for x, y in component["points"]:  # type: ignore[union-attr]
        mask_pixels[x - left, y - top] = alpha_pixels[x, y] if alpha_pixels[x, y] > threshold else 0

    isolated = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    isolated.alpha_composite(crop)
    isolated.putalpha(mask)

    centroid_x, centroid_y = component["centroid"]  # type: ignore[misc]
    return isolated, (centroid_x - left, centroid_y - top)


def resize_frame(
    image: Image.Image,
    frame_size: tuple[int, int],
    fit: str,
    resample: int,
) -> Image.Image:
    frame_width, frame_height = frame_size

    if fit == "stretch":
        return image.resize(frame_size, resample=resample)

    scale_x = frame_width / image.width
    scale_y = frame_height / image.height
    scale = max(scale_x, scale_y) if fit == "cover" else min(scale_x, scale_y)
    resized_size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    resized = image.resize(resized_size, resample=resample)

    if fit == "cover":
        left = max(0, (resized.width - frame_width) // 2)
        top = max(0, (resized.height - frame_height) // 2)
        return resized.crop((left, top, left + frame_width, top + frame_height))

    canvas = Image.new("RGBA", frame_size, (0, 0, 0, 0))
    left = (frame_width - resized.width) // 2
    top = (frame_height - resized.height) // 2
    canvas.alpha_composite(resized, (left, top))
    return canvas


def resize_frame_with_anchor(
    image: Image.Image,
    frame_size: tuple[int, int],
    scale: float,
    source_anchor: tuple[float, float],
    target_anchor: tuple[float, float],
    padding: int,
    resample: int,
) -> Image.Image:
    frame_width, frame_height = frame_size
    resized_size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    resized = image.resize(resized_size, resample=resample)
    anchor_x, anchor_y = source_anchor
    target_x, target_y = target_anchor
    left = round(target_x - anchor_x * scale)
    top = round(target_y - anchor_y * scale)
    left = max(padding, min(left, frame_width - padding - resized.width))
    top = max(padding, min(top, frame_height - padding - resized.height))

    canvas = Image.new("RGBA", frame_size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (left, top))
    return canvas


def source_cell_box(
    image_size: tuple[int, int],
    cols: int,
    rows: int,
    col: int,
    row: int,
    margin: tuple[int, int, int, int],
    gap_x: int,
    gap_y: int,
) -> tuple[int, int, int, int]:
    width, height = image_size
    margin_top, margin_right, margin_bottom, margin_left = margin
    usable_width = width - margin_left - margin_right - gap_x * (cols - 1)
    usable_height = height - margin_top - margin_bottom - gap_y * (rows - 1)

    if usable_width <= 0 or usable_height <= 0:
        raise ValueError("Source margins/gaps leave no usable image area")

    cell_width = usable_width / cols
    cell_height = usable_height / rows
    left = round(margin_left + col * (cell_width + gap_x))
    top = round(margin_top + row * (cell_height + gap_y))
    right = round(left + cell_width)
    bottom = round(top + cell_height)
    return left, top, right, bottom


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Convert an uneven sprite sheet into a clean fixed-size sprite sheet.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Source sprite sheet image")
    parser.add_argument("output", type=Path, help="Output sprite sheet image")
    parser.add_argument("--source-cols", type=positive_int, required=True)
    parser.add_argument("--source-rows", type=positive_int, required=True)
    parser.add_argument("--frame-width", type=positive_int, default=256)
    parser.add_argument("--frame-height", type=positive_int, default=256)
    parser.add_argument("--output-cols", type=positive_int)
    parser.add_argument("--frame-count", type=positive_int)
    parser.add_argument(
        "--source-margin",
        type=non_negative_int,
        nargs="+",
        default=[0],
        metavar="PX",
        help="Source margin: all | vertical horizontal | top right bottom left",
    )
    parser.add_argument("--source-gap-x", type=non_negative_int, default=0)
    parser.add_argument("--source-gap-y", type=non_negative_int, default=0)
    parser.add_argument("--padding", type=non_negative_int, default=0)
    parser.add_argument("--sheet-margin", type=non_negative_int, default=0)
    parser.add_argument(
        "--extract-mode",
        choices=("grid", "main-component"),
        default="grid",
        help=(
            "grid crops each source cell directly; main-component extracts the "
            "largest connected alpha component around each cell to remove leaked neighboring frames"
        ),
    )
    parser.add_argument(
        "--component-expand-x",
        type=non_negative_int,
        default=96,
        help="Horizontal pixels to inspect beyond each source cell in main-component mode",
    )
    parser.add_argument(
        "--component-alpha-threshold",
        type=non_negative_int,
        default=16,
        help="Alpha threshold for connected component extraction and edge validation",
    )
    parser.add_argument(
        "--component-min-pixels",
        type=positive_int,
        default=500,
        help="Minimum connected component size considered a frame subject",
    )
    parser.add_argument(
        "--component-frame-padding",
        type=non_negative_int,
        default=20,
        help="Transparent margin kept inside each frame in main-component mode",
    )
    parser.add_argument(
        "--anchor-x",
        type=float,
        default=0.5,
        help="Horizontal target anchor inside each output frame for main-component mode",
    )
    parser.add_argument(
        "--anchor-y",
        type=float,
        default=0.55,
        help="Vertical target anchor inside each output frame for main-component mode",
    )
    parser.add_argument(
        "--edge-margin",
        type=non_negative_int,
        default=1,
        help="Minimum transparent margin required when validating output frame edges",
    )
    parser.add_argument(
        "--validate-frame-edges",
        action="store_true",
        help="Fail if any output frame alpha touches the configured edge margin",
    )
    parser.add_argument(
        "--preview-grid",
        type=Path,
        help="Optional PNG preview with red frame grid over the generated sheet",
    )
    parser.add_argument(
        "--fit",
        choices=("contain", "cover", "stretch"),
        default="contain",
        help="How each source cell is resized into the target frame",
    )
    parser.add_argument(
        "--filter",
        choices=("lanczos", "nearest"),
        default="lanczos",
        help="Use nearest for pixel art; lanczos for painted/generated art",
    )
    parser.add_argument(
        "--trim-alpha",
        type=non_negative_int,
        metavar="THRESHOLD",
        help="Trim transparent edges inside each source cell before resizing",
    )
    parser.add_argument(
        "--trim-bg",
        type=non_negative_int,
        metavar="TOLERANCE",
        help="Trim a solid corner background inside each source cell before resizing",
    )
    parser.add_argument(
        "--transparent-checkerboard",
        action="store_true",
        help=(
            "Turn edge-connected light gray/white checkerboard background pixels "
            "transparent before extracting frames"
        ),
    )
    parser.add_argument(
        "--checkerboard-min-channel",
        type=non_negative_int,
        default=205,
        help="Minimum RGB channel value treated as checkerboard background",
    )
    parser.add_argument(
        "--checkerboard-tolerance",
        type=non_negative_int,
        default=28,
        help="Maximum RGB channel spread treated as checkerboard background",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the calculated layout without writing the output image",
    )
    return parser


def validate_frame_edges(
    sheet: Image.Image,
    cols: int,
    frame_width: int,
    frame_height: int,
    frame_count: int,
    alpha_threshold: int,
    edge_margin: int,
) -> list[tuple[int, tuple[int, int, int, int]]]:
    alpha = sheet.getchannel("A")
    failures: list[tuple[int, tuple[int, int, int, int]]] = []

    for index in range(frame_count):
        output_col = index % cols
        output_row = index // cols
        frame_alpha = alpha.crop(
            (
                output_col * frame_width,
                output_row * frame_height,
                (output_col + 1) * frame_width,
                (output_row + 1) * frame_height,
            )
        )
        if alpha_threshold > 0:
            frame_alpha = frame_alpha.point(lambda pixel: 255 if pixel > alpha_threshold else 0)
        bbox = frame_alpha.getbbox()
        if bbox is None:
            continue
        left, top, right, bottom = bbox
        if (
            left < edge_margin
            or top < edge_margin
            or right > frame_width - edge_margin
            or bottom > frame_height - edge_margin
        ):
            failures.append((index, bbox))

    return failures


def save_grid_preview(
    sheet: Image.Image,
    path: Path,
    frame_width: int,
    frame_height: int,
) -> None:
    preview = sheet.copy()
    draw = ImageDraw.Draw(preview)
    for x in range(0, sheet.width + 1, frame_width):
        draw.line([(x, 0), (x, sheet.height)], fill=(255, 0, 0, 255), width=3)
    for y in range(0, sheet.height + 1, frame_height):
        draw.line([(0, y), (sheet.width, y)], fill=(255, 0, 0, 255), width=3)
    path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(path)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    source_margin = parse_spacing(args.source_margin, "--source-margin")

    image = Image.open(args.input).convert("RGBA")
    if args.transparent_checkerboard:
        image = remove_connected_checkerboard_background(
            image,
            args.checkerboard_min_channel,
            args.checkerboard_tolerance,
        )
    total_source_frames = args.source_cols * args.source_rows
    frame_count = args.frame_count or total_source_frames
    if frame_count > total_source_frames:
        parser.error("--frame-count cannot exceed source-cols * source-rows")

    output_cols = args.output_cols or args.source_cols
    output_rows = math.ceil(frame_count / output_cols)
    frame_size = (args.frame_width, args.frame_height)
    output_size = (
        args.sheet_margin * 2
        + output_cols * args.frame_width
        + (output_cols - 1) * args.padding,
        args.sheet_margin * 2
        + output_rows * args.frame_height
        + (output_rows - 1) * args.padding,
    )
    resample = Resampling.NEAREST if args.filter == "nearest" else Resampling.LANCZOS

    print(
        f"source: {args.input} ({image.width}x{image.height}) "
        f"{args.source_cols}x{args.source_rows}"
    )
    print(
        f"output: {args.output} ({output_size[0]}x{output_size[1]}) "
        f"{output_cols}x{output_rows}, frame {args.frame_width}x{args.frame_height}"
    )

    if args.dry_run:
        return 0

    sheet = Image.new("RGBA", output_size, (0, 0, 0, 0))
    extracted_frames: list[tuple[Image.Image, tuple[float, float]] | None] = []
    scale = 1.0

    if args.extract_mode == "main-component":
        max_width = 0
        max_height = 0
        source_alpha = image.getchannel("A")
        for index in range(frame_count):
            source_col = index % args.source_cols
            source_row = index // args.source_cols
            cell_box = source_cell_box(
                image.size,
                args.source_cols,
                args.source_rows,
                source_col,
                source_row,
                source_margin,
                args.source_gap_x,
                args.source_gap_y,
            )
            left, top, right, bottom = cell_box
            expanded_box = (
                max(0, left - args.component_expand_x),
                top,
                min(image.width, right + args.component_expand_x),
                bottom,
            )
            expanded_alpha = source_alpha.crop(expanded_box)
            components = alpha_components(
                expanded_alpha,
                (expanded_box[0], expanded_box[1]),
                args.component_alpha_threshold,
                args.component_min_pixels,
            )
            if not components:
                parser.error(f"no alpha component found for frame {index}")

            component = max(components, key=lambda value: value["count"])  # type: ignore[index]
            isolated, source_anchor = isolate_component(
                image,
                source_alpha,
                component,
                args.component_alpha_threshold,
            )
            extracted_frames.append((isolated, source_anchor))
            max_width = max(max_width, isolated.width)
            max_height = max(max_height, isolated.height)

        scale = min(
            (args.frame_width - 2 * args.component_frame_padding) / max_width,
            (args.frame_height - 2 * args.component_frame_padding) / max_height,
            1.0,
        )
        print(f"main-component scale: {scale:.4f}")

    for index in range(frame_count):
        source_col = index % args.source_cols
        source_row = index // args.source_cols
        if args.extract_mode == "main-component":
            extracted = extracted_frames[index]
            if extracted is None:
                parser.error(f"missing extracted frame {index}")
            raw_frame, source_anchor = extracted
            frame = resize_frame_with_anchor(
                raw_frame,
                frame_size,
                scale,
                source_anchor,
                (args.frame_width * args.anchor_x, args.frame_height * args.anchor_y),
                args.component_frame_padding,
                resample,
            )
        else:
            box = source_cell_box(
                image.size,
                args.source_cols,
                args.source_rows,
                source_col,
                source_row,
                source_margin,
                args.source_gap_x,
                args.source_gap_y,
            )
            frame = image.crop(box)

            if args.trim_alpha is not None:
                frame = trim_alpha(frame, args.trim_alpha)
            if args.trim_bg is not None:
                frame = trim_solid_background(frame, args.trim_bg)

            frame = resize_frame(frame, frame_size, args.fit, resample)

        output_col = index % output_cols
        output_row = index // output_cols
        left = args.sheet_margin + output_col * (args.frame_width + args.padding)
        top = args.sheet_margin + output_row * (args.frame_height + args.padding)
        sheet.alpha_composite(frame, (left, top))

    if args.validate_frame_edges:
        if args.sheet_margin != 0 or args.padding != 0:
            parser.error("--validate-frame-edges currently expects --sheet-margin 0 and --padding 0")
        failures = validate_frame_edges(
            sheet,
            output_cols,
            args.frame_width,
            args.frame_height,
            frame_count,
            args.component_alpha_threshold,
            args.edge_margin,
        )
        if failures:
            formatted = ", ".join(f"{index}:{bbox}" for index, bbox in failures)
            parser.error(f"output frame alpha touches cut edge: {formatted}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    if args.preview_grid:
        save_grid_preview(sheet, args.preview_grid, args.frame_width, args.frame_height)
        print(f"wrote preview {args.preview_grid}")
    print(f"wrote {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
