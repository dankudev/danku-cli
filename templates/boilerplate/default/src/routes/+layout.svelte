<script lang="ts">
	import faviconSvg from "$lib/assets/favicon.svg";
	import faviconIco from "$lib/assets/favicon.ico";
	import "../app.css";
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={faviconSvg} type="image/svg+xml" />
	<link rel="icon" href={faviconIco} sizes="32x32" />
</svelte:head>

{@render children?.()}
