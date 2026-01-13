import type { ExcalElement, Camera, ToolType, InteractionState } from '$lib/types/elements';
import { history, type Snapshot } from '$lib/utils/history';

/**
 * Scene state using Svelte 5 runes
 * This is the central state for the entire drawing application
 */
class Scene {
	// All elements on the canvas
	elements = $state<ExcalElement[]>([]);

	// Currently selected element IDs
	selectedIds = $state<Set<string>>(new Set());

	// Camera (pan/zoom)
	camera = $state<Camera>({ x: 0, y: 0, zoom: 1 });

	// Currently active tool
	activeTool = $state<ToolType>('select');

	// Current interaction state
	interaction = $state<InteractionState>({ mode: 'idle' });

	// Style defaults for new elements
	currentStyle = $state({
		stroke: '#000000',
		fill: undefined as string | undefined,
		strokeWidth: 2,
		roughness: 1
	});

	// --- Element Operations ---

	addElement(element: ExcalElement): void {
		this.elements.push(element);
	}

	updateElement(id: string, updates: Partial<ExcalElement>): void {
		const index = this.elements.findIndex((el) => el.id === id);
		if (index !== -1) {
			this.elements[index] = { ...this.elements[index], ...updates, version: this.elements[index].version + 1 };
		}
	}

	deleteElement(id: string): void {
		this.elements = this.elements.filter((el) => el.id !== id);
		this.selectedIds.delete(id);
	}

	deleteSelected(): void {
		this.elements = this.elements.filter((el) => !this.selectedIds.has(el.id));
		this.selectedIds.clear();
	}

	getElementById(id: string): ExcalElement | undefined {
		return this.elements.find((el) => el.id === id);
	}

	// --- Selection Operations ---

	select(id: string, additive = false): void {
		if (!additive) {
			this.selectedIds.clear();
		}
		this.selectedIds.add(id);
	}

	deselect(id: string): void {
		this.selectedIds.delete(id);
	}

	clearSelection(): void {
		this.selectedIds.clear();
	}

	isSelected(id: string): boolean {
		return this.selectedIds.has(id);
	}

	getSelectedElements(): ExcalElement[] {
		return this.elements.filter((el) => this.selectedIds.has(el.id));
	}

	// --- History Operations ---

	private cloneElements(elements: ExcalElement[]): ExcalElement[] {
		return elements.map((el) => ({
			...el,
			points: el.points ? el.points.map((p) => ({ ...p })) : undefined
		}));
	}

	private getSnapshot(): Snapshot {
		return {
			elements: this.cloneElements(this.elements),
			camera: { ...this.camera }
		};
	}

	private applySnapshot(snapshot: Snapshot): void {
		this.elements = snapshot.elements;
		this.camera = snapshot.camera;
		this.selectedIds.clear();
	}

	pushHistory(): void {
		history.push(this.getSnapshot());
	}

	undo(): void {
		const snapshot = history.undo(this.getSnapshot());
		if (snapshot) {
			this.applySnapshot(snapshot);
		}
	}

	redo(): void {
		const snapshot = history.redo(this.getSnapshot());
		if (snapshot) {
			this.applySnapshot(snapshot);
		}
	}

	canUndo(): boolean {
		return history.canUndo();
	}

	canRedo(): boolean {
		return history.canRedo();
	}

	// --- Camera Operations ---

	pan(dx: number, dy: number): void {
		this.camera = {
			...this.camera,
			x: this.camera.x + dx,
			y: this.camera.y + dy
		};
	}

	setZoom(zoom: number): void {
		this.camera = { ...this.camera, zoom: Math.max(0.1, Math.min(10, zoom)) };
	}

	resetCamera(): void {
		this.camera = { x: 0, y: 0, zoom: 1 };
	}

	// --- Tool Operations ---

	setTool(tool: ToolType): void {
		this.activeTool = tool;
		this.interaction = { mode: 'idle' };
	}

	// --- Serialization ---

	toJSON(): string {
		return JSON.stringify({
			elements: this.elements,
			camera: this.camera
		});
	}

	fromJSON(json: string): void {
		try {
			const data = JSON.parse(json);
			if (data.elements) {
				this.elements = data.elements;
			}
			if (data.camera) {
				this.camera = data.camera;
			}
			this.selectedIds.clear();
			history.clear();
		} catch (e) {
			console.error('Failed to parse scene JSON:', e);
		}
	}

	clear(): void {
		this.pushHistory();
		this.elements = [];
		this.selectedIds.clear();
		this.resetCamera();
	}
}

// Export singleton instance
export const scene = new Scene();
