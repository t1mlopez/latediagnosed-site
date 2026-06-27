import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const articles = await getCollection('articles');

	const publishedArticles = articles
		.filter((article) => article.data.status === 'published')
		.sort((a, b) => {
			const aDate = a.data.publishDate ? new Date(a.data.publishDate).getTime() : 0;
			const bDate = b.data.publishDate ? new Date(b.data.publishDate).getTime() : 0;

			return bDate - aDate;
		});

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: publishedArticles.map((article) => ({
			title: article.data.title,
			description: article.data.description,
			pubDate: article.data.publishDate,
			link: `/articles/${article.id}/`,
		})),
	});
}
