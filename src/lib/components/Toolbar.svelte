<script lang="ts">
	import { scene } from '$lib/stores/scene.svelte';
	import type { ToolType } from '$lib/types/elements';

	const tools: { id: ToolType; label: string; shortcut: string }[] = [
		{ id: 'select', label: 'Select', shortcut: 'V' },
		{ id: 'rect', label: 'Rectangle', shortcut: 'R' },
		{ id: 'ellipse', label: 'Ellipse', shortcut: 'O' },
		{ id: 'line', label: 'Line', shortcut: 'L' },
		{ id: 'arrow', label: 'Arrow', shortcut: 'A' },
		{ id: 'freehand', label: 'Draw', shortcut: 'P' }
	];

	function handleKeyDown(e: KeyboardEvent) {
		// Don't trigger shortcuts when typing in inputs
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		const key = e.key.toUpperCase();
		const tool = tools.find((t) => t.shortcut === key);
		if (tool) {
			scene.setTool(tool.id);
		}
	}

	function handleSave() {
		const json = scene.toJSON();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'drawing.excalidraw.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleLoad() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (file) {
				const text = await file.text();
				scene.fromJSON(text);
			}
		};
		input.click();
	}

	function handleClear() {
		if (confirm('Clear the canvas? This cannot be undone.')) {
			scene.clear();
		}
	}

	function handleExportPNG() {
		const canvas = document.querySelector('canvas');
		if (!canvas) return;

		const url = canvas.toDataURL('image/png');
		const a = document.createElement('a');
		a.href = url;
		a.download = 'drawing.png';
		a.click();
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="toolbar">
	<div class="tool-group">
		{#each tools as tool}
			<button
				class="tool-button"
				class:active={scene.activeTool === tool.id}
				onclick={() => scene.setTool(tool.id)}
				title="{tool.label} ({tool.shortcut})"
			>
				{tool.label}
			</button>
		{/each}
	</div>

	<div class="separator"></div>

	<div class="tool-group">
		<button
			class="tool-button"
			onclick={() => scene.undo()}
			disabled={!scene.canUndo()}
			title="Undo (Ctrl+Z)"
		>
			Undo
		</button>
		<button
			class="tool-button"
			onclick={() => scene.redo()}
			disabled={!scene.canRedo()}
			title="Redo (Ctrl+Shift+Z)"
		>
			Redo
		</button>
	</div>

	<div class="separator"></div>

	<div class="tool-group">
		<label class="color-picker">
			<span>Stroke</span>
			<input
				type="color"
				bind:value={scene.currentStyle.stroke}
			/>
		</label>
	</div>

	<div class="separator"></div>

	<div class="tool-group">
		<button class="tool-button" onclick={handleSave} title="Save">
			Save
		</button>
		<button class="tool-button" onclick={handleLoad} title="Load">
			Load
		</button>
		<button class="tool-button" onclick={handleExportPNG} title="Export PNG">
			PNG
		</button>
		<button class="tool-button danger" onclick={handleClear} title="Clear">
			Clear
		</button>
	</div>

	<div class="spacer"></div>

	<div class="zoom-display">
		{Math.round(scene.camera.zoom * 100)}%
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: #f5f5f5;
		border-bottom: 1px solid #ddd;
		flex-wrap: wrap;
	}

	.tool-group {
		display: flex;
		gap: 4px;
	}

	.tool-button {
		padding: 8px 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.15s ease;
	}

	.tool-button:hover {
		background: #e8e8e8;
	}

	.tool-button.active {
		background: #0066ff;
		color: white;
		border-color: #0066ff;
	}

	.tool-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tool-button.danger {
		color: #cc0000;
	}

	.tool-button.danger:hover {
		background: #ffeeee;
	}

	.separator {
		width: 1px;
		height: 24px;
		background: #ddd;
	}

	.color-picker {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
	}

	.color-picker input {
		width: 32px;
		height: 32px;
		padding: 0;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
	}

	.spacer {
		flex: 1;
	}

	.zoom-display {
		font-size: 14px;
		color: #666;
		padding: 8px;
	}
</style>
