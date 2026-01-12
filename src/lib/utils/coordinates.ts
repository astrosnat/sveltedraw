import type { Camera, Point } from '$lib/types/elements';

/**
 * Convert screen coordinates (mouse position) to world coordinates (canvas space)
 */
export function screenToWorld(sx: number, sy: number, camera: Camera): Point {
	return {
		x: (sx - camera.x) / camera.zoom,
		y: (sy - camera.y) / camera.zoom
	};
}

/**
 * Convert world coordinates (canvas space) to screen coordinates (display position)
 */
export function worldToScreen(wx: number, wy: number, camera: Camera): Point {
	return {
		x: wx * camera.zoom + camera.x,
		y: wy * camera.zoom + camera.y
	};
}

/**
 * Apply camera transform to canvas context
 */
export function applyCameraTransform(ctx: CanvasRenderingContext2D, camera: Camera): void {
	ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);
}

/**
 * Reset canvas transform to identity
 */
export function resetTransform(ctx: CanvasRenderingContext2D): void {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Calculate the zoom level that keeps a point stable under the cursor
 * Used for zoom-to-cursor behavior
 */
export function zoomAtPoint(
	camera: Camera,
	cursorX: number,
	cursorY: number,
	newZoom: number
): Camera {
	// Point in world space before zoom
	const worldX = (cursorX - camera.x) / camera.zoom;
	const worldY = (cursorY - camera.y) / camera.zoom;

	// Adjust camera so the same world point stays under cursor
	return {
		x: cursorX - worldX * newZoom,
		y: cursorY - worldY * newZoom,
		zoom: newZoom
	};
}

/**
 * Clamp zoom level to reasonable bounds
 */
export function clampZoom(zoom: number, min = 0.1, max = 10): number {
	return Math.max(min, Math.min(max, zoom));
}
