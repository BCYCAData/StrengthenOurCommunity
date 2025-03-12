import vercel from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// default options are shown
		adapter: vercel(),
		alias: {
			$components: 'src/components',
			$stores: './src/stores'
		}
	},
	vitePlugin: {
		experimental: {
			inspector: true
		}
	}
};

export default config;
