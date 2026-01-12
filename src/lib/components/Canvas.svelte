<script lang="ts">
	import { onMount } from 'svelte';
	import { scene } from '$lib/stores/scene.svelte';
	import { screenToWorld, applyCameraTransform, resetTransform } from '$lib/utils/coordinates';
	import { getElementAtPoint, getElementBounds, getResizeHandles } from '$lib/utils/hitTest';
	import { createElement, type ExcalElement, type Point } from '$lib/types/elements';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let roughCanvas: any; // Will be rough.canvas instance

	// Track if rough.js is loaded
	let roughLoaded = false;

	onMount(async () => {
		ctx = canvas.getContext('2d')!;

		// Dynamically import rough.js
		try {
			const rough = await import('roughjs');
			roughCanvas = rough.default.canvas(canvas);
			roughLoaded = true;
		} catch (e) {
			console.warn('Rough.js not available, using plain rendering');
		}

		// Handle canvas resize
		const resizeObserver = new ResizeObserver(() => {
			const dpr = window.devicePixelRatio || 1;
			canvas.width = canvas.clientWidth * dpr;
			canvas.height = canvas.clientHeight * dpr;
			render();
		});
		resizeObserver.observe(canvas);

		// Start render loop
		let frameId: number;
		const loop = () => {
			render();
			frameId = requestAnimationFrame(loop);
		};
		frameId = requestAnimationFrame(loop);

		return () => {
			resizeObserver.disconnect();
			cancelAnimationFrame(frameId);
		};
	});

	function render() {
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;

		// Clear canvas
		resetTransform(ctx);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Apply DPR scaling
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// Apply camera transform
		applyCameraTransform(ctx, scene.camera);

		// Draw all elements
		for (const element of scene.elements) {
			drawElement(element);
		}

		// Draw selection UI
		drawSelectionUI();
	}

	function drawElement(element: ExcalElement) {
		if (roughLoaded && roughCanvas) {
			drawRoughElement(element);
		} else {
			drawPlainElement(element);
		}
	}

	function drawRoughElement(element: ExcalElement) {
		const options = {
			seed: element.seed,
			roughness: element.roughness,
			stroke: element.stroke,
			strokeWidth: element.strokeWidth,
			fill: element.fill,
			fillStyle: element.fill ? 'solid' : undefined
		};

		switch (element.type) {
			case 'rect':
				roughCanvas.rectangle(element.x, element.y, element.w, element.h, options);
				break;

			case 'ellipse': {
				const cx = element.x + element.w / 2;
				const cy = element.y + element.h / 2;
				roughCanvas.ellipse(cx, cy, Math.abs(element.w), Math.abs(element.h), options);
				break;
			}

			case 'line':
			case 'arrow': {
				if (element.points && element.points.length >= 2) {
					const p1 = element.points[0];
					const p2 = element.points[element.points.length - 1];
					roughCanvas.line(
						element.x + p1.x,
						element.y + p1.y,
						element.x + p2.x,
						element.y + p2.y,
						options
					);

					// Draw arrowhead for arrows
					if (element.type === 'arrow' && element.points.length >= 2) {
						drawArrowhead(element.x + p2.x, element.y + p2.y, p1, p2, element);
					}
				}
				break;
			}

			case 'freehand': {
				if (element.points && element.points.length >= 2) {
					const points = element.points.map((p) => [element.x + p.x, element.y + p.y] as [number, number]);
					roughCanvas.curve(points, options);
				}
				break;
			}
		}
	}

	function drawPlainElement(element: ExcalElement) {
		ctx.strokeStyle = element.stroke;
		ctx.lineWidth = element.strokeWidth;
		if (element.fill) {
			ctx.fillStyle = element.fill;
		}

		switch (element.type) {
			case 'rect':
				ctx.beginPath();
				ctx.rect(element.x, element.y, element.w, element.h);
				if (element.fill) ctx.fill();
				ctx.stroke();
				break;

			case 'ellipse': {
				const cx = element.x + element.w / 2;
				const cy = element.y + element.h / 2;
				ctx.beginPath();
				ctx.ellipse(cx, cy, Math.abs(element.w) / 2, Math.abs(element.h) / 2, 0, 0, Math.PI * 2);
				if (element.fill) ctx.fill();
				ctx.stroke();
				break;
			}

			case 'line':
			case 'arrow': {
				if (element.points && element.points.length >= 2) {
					ctx.beginPath();
					const p1 = element.points[0];
					ctx.moveTo(element.x + p1.x, element.y + p1.y);
					for (let i = 1; i < element.points.length; i++) {
						const p = element.points[i];
						ctx.lineTo(element.x + p.x, element.y + p.y);
					}
					ctx.stroke();

					if (element.type === 'arrow' && element.points.length >= 2) {
						const p2 = element.points[element.points.length - 1];
						drawArrowhead(element.x + p2.x, element.y + p2.y, p1, p2, element);
					}
				}
				break;
			}

			case 'freehand': {
				if (element.points && element.points.length >= 2) {
					ctx.beginPath();
					const p1 = element.points[0];
					ctx.moveTo(element.x + p1.x, element.y + p1.y);
					for (let i = 1; i < element.points.length; i++) {
						const p = element.points[i];
						ctx.lineTo(element.x + p.x, element.y + p.y);
					}
					ctx.stroke();
				}
				break;
			}
		}
	}

	function drawArrowhead(tipX: number, tipY: number, from: Point, to: Point, element: ExcalElement) {
		const angle = Math.atan2(to.y - from.y, to.x - from.x);
		const headLength = 15;

		ctx.strokeStyle = element.stroke;
		ctx.lineWidth = element.strokeWidth;
		ctx.beginPath();
		ctx.moveTo(tipX, tipY);
		ctx.lineTo(
			tipX - headLength * Math.cos(angle - Math.PI / 6),
			tipY - headLength * Math.sin(angle - Math.PI / 6)
		);
		ctx.moveTo(tipX, tipY);
		ctx.lineTo(
			tipX - headLength * Math.cos(angle + Math.PI / 6),
			tipY - headLength * Math.sin(angle + Math.PI / 6)
		);
		ctx.stroke();
	}

	function drawSelectionUI() {
		const selectedElements = scene.getSelectedElements();
		if (selectedElements.length === 0) return;

		ctx.strokeStyle = '#0066ff';
		ctx.lineWidth = 1 / scene.camera.zoom;
		ctx.setLineDash([5 / scene.camera.zoom, 5 / scene.camera.zoom]);

		for (const element of selectedElements) {
			const bounds = getElementBounds(element);

			// Draw selection rectangle
			ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

			// Draw resize handles
			ctx.setLineDash([]);
			ctx.fillStyle = '#ffffff';
			const handleSize = 8 / scene.camera.zoom;
			const handles = getResizeHandles(bounds);

			for (const pos of Object.values(handles)) {
				ctx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
				ctx.strokeRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
			}
		}

		ctx.setLineDash([]);
	}

	// --- Event Handlers ---

	function handlePointerDown(e: PointerEvent) {
		const rect = canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		const world = screenToWorld(screenX, screenY, scene.camera);

		// Middle mouse or space+click for panning
		if (e.button === 1 || (e.button === 0 && e.altKey)) {
			scene.interaction = {
				mode: 'panning',
				start: { x: screenX, y: screenY },
				initialCamera: { x: scene.camera.x, y: scene.camera.y }
			};
			canvas.setPointerCapture(e.pointerId);
			return;
		}

		if (e.button !== 0) return;

		if (scene.activeTool === 'select') {
			const hitElement = getElementAtPoint(scene.elements, world.x, world.y, scene.camera.zoom);

			if (hitElement) {
				if (!scene.isSelected(hitElement.id)) {
					scene.select(hitElement.id, e.shiftKey);
				}

				// Start dragging
				const initial = new Map<string, Point>();
				for (const el of scene.getSelectedElements()) {
					initial.set(el.id, { x: el.x, y: el.y });
				}

				scene.interaction = {
					mode: 'dragging',
					start: world,
					initial
				};
			} else {
				scene.clearSelection();
				scene.interaction = { mode: 'idle' };
			}
		} else {
			// Drawing tool
			scene.pushHistory();

			const newElement = createElement(scene.activeTool, world.x, world.y, {
				stroke: scene.currentStyle.stroke,
				fill: scene.currentStyle.fill,
				strokeWidth: scene.currentStyle.strokeWidth,
				roughness: scene.currentStyle.roughness,
				points: scene.activeTool === 'line' || scene.activeTool === 'arrow' || scene.activeTool === 'freehand'
					? [{ x: 0, y: 0 }]
					: undefined
			});

			scene.addElement(newElement);
			scene.interaction = {
				mode: 'drawing',
				id: newElement.id,
				origin: world
			};
		}

		canvas.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		const rect = canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		const world = screenToWorld(screenX, screenY, scene.camera);

		const interaction = scene.interaction;

		if (interaction.mode === 'panning') {
			const dx = screenX - interaction.start.x;
			const dy = screenY - interaction.start.y;
			scene.camera = {
				...scene.camera,
				x: interaction.initialCamera.x + dx,
				y: interaction.initialCamera.y + dy
			};
		} else if (interaction.mode === 'drawing') {
			const element = scene.getElementById(interaction.id);
			if (!element) return;

			if (element.type === 'freehand') {
				// Add point to freehand path
				const points = element.points ? [...element.points] : [];
				points.push({
					x: world.x - element.x,
					y: world.y - element.y
				});
				scene.updateElement(element.id, { points });
			} else if (element.type === 'line' || element.type === 'arrow') {
				// Update endpoint
				scene.updateElement(element.id, {
					points: [
						{ x: 0, y: 0 },
						{ x: world.x - interaction.origin.x, y: world.y - interaction.origin.y }
					]
				});
			} else {
				// Update width/height for shapes
				scene.updateElement(element.id, {
					w: world.x - interaction.origin.x,
					h: world.y - interaction.origin.y
				});
			}
		} else if (interaction.mode === 'dragging') {
			const dx = world.x - interaction.start.x;
			const dy = world.y - interaction.start.y;

			for (const [id, initialPos] of interaction.initial) {
				scene.updateElement(id, {
					x: initialPos.x + dx,
					y: initialPos.y + dy
				});
			}
		}
	}

	function handlePointerUp(e: PointerEvent) {
		const interaction = scene.interaction;

		if (interaction.mode === 'drawing') {
			const element = scene.getElementById(interaction.id);
			if (element) {
				// Normalize negative dimensions
				if (element.w < 0) {
					scene.updateElement(element.id, {
						x: element.x + element.w,
						w: -element.w
					});
				}
				if (element.h < 0) {
					scene.updateElement(element.id, {
						y: element.y + element.h,
						h: -element.h
					});
				}
			}
		} else if (interaction.mode === 'dragging') {
			scene.pushHistory();
		}

		scene.interaction = { mode: 'idle' };
		canvas.releasePointerCapture(e.pointerId);
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();

		const rect = canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;

		if (e.ctrlKey || e.metaKey) {
			// Zoom
			const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
			const newZoom = Math.max(0.1, Math.min(10, scene.camera.zoom * zoomFactor));

			// Zoom towards cursor
			const worldX = (screenX - scene.camera.x) / scene.camera.zoom;
			const worldY = (screenY - scene.camera.y) / scene.camera.zoom;

			scene.camera = {
				x: screenX - worldX * newZoom,
				y: screenY - worldY * newZoom,
				zoom: newZoom
			};
		} else {
			// Pan
			scene.pan(-e.deltaX, -e.deltaY);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (scene.selectedIds.size > 0) {
				scene.pushHistory();
				scene.deleteSelected();
			}
		} else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
			if (e.shiftKey) {
				scene.redo();
			} else {
				scene.undo();
			}
			e.preventDefault();
		} else if (e.key === 'Escape') {
			scene.clearSelection();
			scene.setTool('select');
		}
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<canvas
	bind:this={canvas}
	class="canvas"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onwheel={handleWheel}
></canvas>

<style>
	.canvas {
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		cursor: crosshair;
	}
</style>
