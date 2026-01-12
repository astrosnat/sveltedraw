export type ElementType = 'rect' | 'ellipse' | 'line' | 'arrow' | 'freehand';

export type Point = {
	x: number;
	y: number;
};

export type ExcalElement = {
	id: string;
	type: ElementType;
	x: number;
	y: number;
	w: number;
	h: number;
	points?: Point[]; // for line/arrow/freehand in local coords
	angle?: number;

	// Style
	stroke: string;
	fill?: string;
	strokeWidth: number;
	roughness: number;

	// Rough.js seed - keeps the hand-drawn look stable across redraws
	seed: number;

	// Versioning for cache invalidation
	version: number;
};

export type Camera = {
	x: number;
	y: number;
	zoom: number;
};

export type ToolType = 'select' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'freehand';

export type InteractionState =
	| { mode: 'idle' }
	| { mode: 'drawing'; id: string; origin: Point }
	| { mode: 'dragging'; start: Point; initial: Map<string, Point> }
	| { mode: 'resizing'; id: string; handle: ResizeHandle; origin: Point; initialBounds: Bounds }
	| { mode: 'panning'; start: Point; initialCamera: Point };

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type Bounds = {
	x: number;
	y: number;
	w: number;
	h: number;
};

// Factory function to create new elements
export function createElement(
	type: ElementType,
	x: number,
	y: number,
	options: Partial<ExcalElement> = {}
): ExcalElement {
	return {
		id: crypto.randomUUID(),
		type,
		x,
		y,
		w: 0,
		h: 0,
		stroke: '#000000',
		strokeWidth: 2,
		roughness: 1,
		seed: Math.floor(Math.random() * 2 ** 31),
		version: 0,
		...options
	};
}
