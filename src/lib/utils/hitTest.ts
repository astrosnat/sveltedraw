import type { ExcalElement, Point, Bounds, ResizeHandle } from '$lib/types/elements';

/**
 * Distance from a point to a line segment
 * Used for hit testing lines and arrows
 */
export function distanceToSegment(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number
): number {
	const abx = bx - ax;
	const aby = by - ay;
	const apx = px - ax;
	const apy = py - ay;
	const ab2 = abx * abx + aby * aby;

	if (ab2 === 0) {
		// Segment is a point
		return Math.sqrt(apx * apx + apy * apy);
	}

	const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
	const cx = ax + t * abx;
	const cy = ay + t * aby;
	const dx = px - cx;
	const dy = py - cy;

	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a point is inside a rectangle's bounding box
 */
export function pointInRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
	const minX = Math.min(x, x + w);
	const maxX = Math.max(x, x + w);
	const minY = Math.min(y, y + h);
	const maxY = Math.max(y, y + h);

	return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

/**
 * Check if a point is inside an ellipse
 */
export function pointInEllipse(
	px: number,
	py: number,
	cx: number,
	cy: number,
	rx: number,
	ry: number
): boolean {
	if (rx === 0 || ry === 0) return false;
	const dx = px - cx;
	const dy = py - cy;
	return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

/**
 * Hit test an element at a given world coordinate
 * Returns true if the point hits the element
 */
export function hitTestElement(element: ExcalElement, px: number, py: number, tolerance: number): boolean {
	switch (element.type) {
		case 'rect':
			return pointInRect(px, py, element.x, element.y, element.w, element.h);

		case 'ellipse': {
			const cx = element.x + element.w / 2;
			const cy = element.y + element.h / 2;
			const rx = Math.abs(element.w) / 2;
			const ry = Math.abs(element.h) / 2;
			return pointInEllipse(px, py, cx, cy, rx, ry);
		}

		case 'line':
		case 'arrow': {
			if (!element.points || element.points.length < 2) return false;
			// Check distance to each segment
			for (let i = 0; i < element.points.length - 1; i++) {
				const p1 = element.points[i];
				const p2 = element.points[i + 1];
				const dist = distanceToSegment(
					px,
					py,
					element.x + p1.x,
					element.y + p1.y,
					element.x + p2.x,
					element.y + p2.y
				);
				if (dist <= tolerance) return true;
			}
			return false;
		}

		case 'freehand': {
			if (!element.points || element.points.length < 2) return false;
			for (let i = 0; i < element.points.length - 1; i++) {
				const p1 = element.points[i];
				const p2 = element.points[i + 1];
				const dist = distanceToSegment(
					px,
					py,
					element.x + p1.x,
					element.y + p1.y,
					element.x + p2.x,
					element.y + p2.y
				);
				if (dist <= tolerance) return true;
			}
			return false;
		}

		default:
			return false;
	}
}

/**
 * Find the topmost element at a given point
 * Elements later in the array are considered "on top"
 */
export function getElementAtPoint(
	elements: ExcalElement[],
	px: number,
	py: number,
	zoom: number
): ExcalElement | null {
	const tolerance = 8 / zoom; // Scale tolerance with zoom

	// Iterate in reverse to find topmost element first
	for (let i = elements.length - 1; i >= 0; i--) {
		if (hitTestElement(elements[i], px, py, tolerance)) {
			return elements[i];
		}
	}
	return null;
}

/**
 * Get the bounding box of an element
 */
export function getElementBounds(element: ExcalElement): Bounds {
	const minX = Math.min(element.x, element.x + element.w);
	const minY = Math.min(element.y, element.y + element.h);
	const maxX = Math.max(element.x, element.x + element.w);
	const maxY = Math.max(element.y, element.y + element.h);

	return {
		x: minX,
		y: minY,
		w: maxX - minX,
		h: maxY - minY
	};
}

/**
 * Get resize handle positions for an element
 */
export function getResizeHandles(bounds: Bounds): Record<ResizeHandle, Point> {
	const { x, y, w, h } = bounds;
	return {
		nw: { x, y },
		n: { x: x + w / 2, y },
		ne: { x: x + w, y },
		e: { x: x + w, y: y + h / 2 },
		se: { x: x + w, y: y + h },
		s: { x: x + w / 2, y: y + h },
		sw: { x, y: y + h },
		w: { x, y: y + h / 2 }
	};
}

/**
 * Check if a point hits a resize handle
 */
export function getHandleAtPoint(
	bounds: Bounds,
	px: number,
	py: number,
	handleSize: number
): ResizeHandle | null {
	const handles = getResizeHandles(bounds);
	const halfSize = handleSize / 2;

	for (const [handle, pos] of Object.entries(handles) as [ResizeHandle, Point][]) {
		if (
			px >= pos.x - halfSize &&
			px <= pos.x + halfSize &&
			py >= pos.y - halfSize &&
			py <= pos.y + halfSize
		) {
			return handle;
		}
	}
	return null;
}
