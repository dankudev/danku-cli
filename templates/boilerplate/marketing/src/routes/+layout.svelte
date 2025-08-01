<script lang="ts">
	import { PUBLIC_BASE_URL } from "$env/static/public";
	import faviconSvg from "$lib/assets/favicon.svg";
	import faviconIco from "$lib/assets/favicon.ico";
	import { page } from "$app/state";
	import "../app.css";
	
	let { children } = $props();
</script>

<svelte:head>
	<meta property="og:url" content={PUBLIC_BASE_URL + page.url.pathname} />
	<link rel="canonical" href={PUBLIC_BASE_URL + page.url.pathname} />
	<meta property="og:description" content={page.data.description} />
	<meta property="og:image" content={PUBLIC_BASE_URL + "/og.png"} />
	<meta name="description" content={page.data.description} />
	<link rel="icon" href={faviconSvg} type="image/svg+xml" />
	<meta property="og:title" content={page.data.title} />
	<link rel="icon" href={faviconIco} sizes="32x32" />
	<meta property="og:type" content="website" />
	<title>{page.data.title}</title>
</svelte:head>

{@render children?.()}
