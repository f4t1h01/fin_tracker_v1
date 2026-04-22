import argparse
import json
import os
import sys
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
except Exception:
    register_heif_opener = None


MAX_DIMENSION = 2000


def ensure_heif_support() -> None:
    if register_heif_opener is not None:
        register_heif_opener()


def resize_max_dim(image: np.ndarray, max_dim: int = MAX_DIMENSION) -> np.ndarray:
    height, width = image.shape[:2]
    largest = max(height, width)
    if largest <= max_dim:
        return image

    scale = max_dim / float(largest)
    next_width = max(1, int(round(width * scale)))
    next_height = max(1, int(round(height * scale)))
    return cv2.resize(image, (next_width, next_height), interpolation=cv2.INTER_AREA)


def pil_to_bgr(image: Image.Image) -> np.ndarray:
    rgb_image = image.convert("RGB")
    rgb_array = np.array(rgb_image)
    return cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)


def order_points(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    sums = points.sum(axis=1)
    rect[0] = points[np.argmin(sums)]
    rect[2] = points[np.argmax(sums)]

    diffs = np.diff(points, axis=1)
    rect[1] = points[np.argmin(diffs)]
    rect[3] = points[np.argmax(diffs)]
    return rect


def four_point_transform(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    rect = order_points(points)
    top_left, top_right, bottom_right, bottom_left = rect

    width_a = np.linalg.norm(bottom_right - bottom_left)
    width_b = np.linalg.norm(top_right - top_left)
    max_width = max(int(round(width_a)), int(round(width_b)), 1)

    height_a = np.linalg.norm(top_right - bottom_right)
    height_b = np.linalg.norm(top_left - bottom_left)
    max_height = max(int(round(height_a)), int(round(height_b)), 1)

    destination = np.array(
        [
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(rect, destination)
    return cv2.warpPerspective(image, matrix, (max_width, max_height))


def detect_document(image: np.ndarray) -> tuple[np.ndarray, bool, bool]:
    height, width = image.shape[:2]
    area_total = float(height * width)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)
    edges = cv2.Canny(denoised, 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:12]

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < area_total * 0.18:
            continue

        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) != 4:
            continue

        points = approx.reshape(4, 2).astype("float32")
        xs = points[:, 0]
        ys = points[:, 1]
        margin_x = max(10.0, width * 0.02)
        margin_y = max(10.0, height * 0.02)
        touches_border = bool(
            np.min(xs) <= margin_x
            or np.min(ys) <= margin_y
            or np.max(xs) >= width - margin_x
            or np.max(ys) >= height - margin_y
        )

        warped = four_point_transform(image, points)
        warped = resize_max_dim(warped)
        return warped, True, touches_border

    return image, False, False


def sharpen(image: np.ndarray) -> np.ndarray:
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    return cv2.filter2D(image, -1, kernel)


def compute_quality_issues(gray: np.ndarray, cropped: bool) -> list[str]:
    issues: list[str] = []
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    contrast_score = float(gray.std())
    glare_ratio = float((gray >= 245).sum()) / float(gray.size)

    if blur_score < 70:
        issues.append("BLUR")
    if contrast_score < 35:
        issues.append("LOW_CONTRAST")
    if glare_ratio > 0.06:
        issues.append("GLARE")
    if cropped:
        issues.append("CROPPED")

    return issues


def save_bgr_image(path: str, image: np.ndarray, mime_type: str) -> None:
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb)

    if mime_type == "image/png":
        pil_image.save(path, format="PNG", optimize=True)
        return

    pil_image.save(path, format="JPEG", quality=90, optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--result-path", required=True)
    args = parser.parse_args()

    ensure_heif_support()
    os.makedirs(args.output_dir, exist_ok=True)

    image = Image.open(args.input)
    image = ImageOps.exif_transpose(image)
    original_bgr = resize_max_dim(pil_to_bgr(image))
    preprocessing_applied = ["decode_image", "exif_autoorient", "resize_max_dimension"]

    original_path = os.path.join(args.output_dir, "original.jpg")
    save_bgr_image(original_path, original_bgr, "image/jpeg")

    document_image, document_detected, cropped = detect_document(original_bgr)
    if document_detected:
        preprocessing_applied.extend(["document_detected", "safe_document_crop", "perspective_correction"])

    cleaned_color = cv2.bilateralFilter(document_image, 7, 60, 60)
    preprocessing_applied.append("bilateral_denoise")

    gray = cv2.cvtColor(cleaned_color, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(gray)
    preprocessing_applied.extend(["grayscale", "clahe_contrast"])

    local_quality_issues = compute_quality_issues(enhanced_gray, cropped)
    text_enhanced = enhanced_gray

    if "LOW_CONTRAST" in local_quality_issues or "BLUR" in local_quality_issues:
        median = cv2.medianBlur(enhanced_gray, 3)
        text_enhanced = cv2.adaptiveThreshold(
            median,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            15,
        )
        cleaned_color = sharpen(cleaned_color)
        preprocessing_applied.extend(["median_denoise", "adaptive_threshold", "mild_sharpen"])

    cleaned_path = os.path.join(args.output_dir, "cleaned.jpg")
    save_bgr_image(cleaned_path, cleaned_color, "image/jpeg")

    text_path = os.path.join(args.output_dir, "text_enhanced.png")
    Image.fromarray(text_enhanced).save(text_path, format="PNG", optimize=True)

    should_include_secondary = (not document_detected) or bool(local_quality_issues)
    primary_path = cleaned_path if document_detected else original_path

    result: dict[str, Any] = {
        "primaryImagePath": primary_path,
        "primaryImageMimeType": "image/jpeg",
        "secondaryImagePath": text_path if should_include_secondary else None,
        "secondaryImageMimeType": "image/png" if should_include_secondary else None,
        "preprocessingApplied": preprocessing_applied,
        "localQualityIssues": local_quality_issues,
        "previewImages": {
            "original": {
                "path": original_path,
                "mimeType": "image/jpeg",
            },
            "cleaned": {
                "path": cleaned_path,
                "mimeType": "image/jpeg",
            },
            "textEnhanced": {
                "path": text_path,
                "mimeType": "image/png",
            },
        },
    }

    with open(args.result_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise
