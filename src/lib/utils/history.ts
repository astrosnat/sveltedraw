import type { ExcalElement, Camera } from '$lib/types/elements';

export type Snapshot = {
	elements: ExcalElement[];
	camera: Camera;
};

/**
 * History manager using snapshot-based undo/redo
 * Simple and effective for most use cases
 */
export class HistoryManager {
	private undoStack: Snapshot[] = [];
	private redoStack: Snapshot[] = [];
	private maxSize: number;

	constructor(maxSize = 100) {
		this.maxSize = maxSize;
	}

	/**
	 * Push a new snapshot onto the history stack
	 * Clears the redo stack since we've branched
	 */
	push(snapshot: Snapshot): void {
		this.undoStack.push(structuredClone(snapshot));
		this.redoStack = [];

		// Trim if we exceed max size
		if (this.undoStack.length > this.maxSize) {
			this.undoStack.shift();
		}
	}

	/**
	 * Undo: pop from undo stack, push current to redo, return previous state
	 */
	undo(currentSnapshot: Snapshot): Snapshot | null {
		if (this.undoStack.length === 0) return null;

		const previous = this.undoStack.pop()!;
		this.redoStack.push(structuredClone(currentSnapshot));

		return previous;
	}

	/**
	 * Redo: pop from redo stack, push current to undo, return next state
	 */
	redo(currentSnapshot: Snapshot): Snapshot | null {
		if (this.redoStack.length === 0) return null;

		const next = this.redoStack.pop()!;
		this.undoStack.push(structuredClone(currentSnapshot));

		return next;
	}

	/**
	 * Check if undo is available
	 */
	canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	/**
	 * Check if redo is available
	 */
	canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	/**
	 * Clear all history
	 */
	clear(): void {
		this.undoStack = [];
		this.redoStack = [];
	}

	/**
	 * Get current stack sizes (for debugging/UI)
	 */
	getStackSizes(): { undo: number; redo: number } {
		return {
			undo: this.undoStack.length,
			redo: this.redoStack.length
		};
	}
}

// Singleton instance for the app
export const history = new HistoryManager();
