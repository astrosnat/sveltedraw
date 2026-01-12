<script lang="ts">
	import Canvas from '$lib/components/Canvas.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
</script>

<svelte:head>
	<title>SvelteDraw</title>
</svelte:head>

<div class="app">
	<Toolbar />
	<div class="canvas-container">
		<Canvas />
	</div>
</div>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
	}

	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
	}

	.canvas-container {
		flex: 1;
		overflow: hidden;
		background: #fafafa;
	}
</style>
