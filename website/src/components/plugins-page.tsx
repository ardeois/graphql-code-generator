import { useMemo } from 'react';
import { useSSG } from 'nextra/ssg';
import { compareDesc } from 'date-fns';
import { MarketplaceSearch } from '@theguild/components';
import { CategoryToPackages } from '@/category-to-packages.mjs';
import { PACKAGES, ALL_TAGS, Icon, icons } from '@/lib/plugins';
import { fetchNpmInfo } from '@/lib/fetch-npm-info';

type Plugin = {
  title: string;
  readme: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  linkHref: string;
  weeklyNPMDownloads: number;
  icon: Icon | string;
  tags: string[];
};

export const getStaticProps = async () => {
  const categoryEntries = Object.entries(CategoryToPackages);
  const plugins: Plugin[] = await Promise.all(
    Object.entries(PACKAGES).map(async ([identifier, { npmPackage, title, icon, tags }]) => {
      const { readme, createdAt, updatedAt, description, weeklyNPMDownloads = 0 } = await fetchNpmInfo(npmPackage);
      const [category] = categoryEntries.find(([, pluginName]) => pluginName.includes(identifier)) || [];

      return {
        title,
        readme,
        createdAt,
        updatedAt,
        description,
        linkHref: `/plugins/${category}/${identifier}`,
        weeklyNPMDownloads,
        icon,
        tags,
      };
    })
  );
  return {
    props: {
      // We add an `ssg` field to the page props,
      // which will be provided to the Nextra's `useSSG` hook.
      ssg: plugins,
    },
    // Revalidate at most once every 1 hour
    revalidate: 60 * 60,
  };
};

export function PluginsPage() {
  const plugins = useSSG() as Plugin[];

  const marketplaceItems = useMemo(
    () =>
      plugins.map(plugin => {
        const icon = icons[plugin.icon as Icon];
        return {
          title: plugin.title,
          description: plugin.description,
          tags: plugin.tags,
          link: {
            href: plugin.linkHref,
            title: `${plugin.title} plugin details`,
          },
          update: plugin.updatedAt,
          image: {
            ...(icon || { src: plugin.icon }),
            placeholder: 'empty' as const,
            loading: 'eager' as const,
            alt: plugin.title,
          },
          weeklyNPMDownloads: plugin.weeklyNPMDownloads,
        };
      }),
    [plugins]
  );

  const recentlyUpdatedItems = useMemo(
    () => [...marketplaceItems].sort((a, b) => compareDesc(new Date(a.update), new Date(b.update))),
    [marketplaceItems]
  );

  const trendingItems = useMemo(
    () =>
      marketplaceItems
        .filter(i => i.weeklyNPMDownloads)
        .sort((a, b) => {
          const aMonthlyDownloads = a.weeklyNPMDownloads || 0;
          const bMonthlyDownloads = b.weeklyNPMDownloads || 0;

          return bMonthlyDownloads - aMonthlyDownloads;
        }),
    [marketplaceItems]
  );

  return (
    <MarketplaceSearch
      title="Explore Plugins"
      tagsFilter={ALL_TAGS}
      placeholder="Find plugins..."
      primaryList={{
        title: 'Trending',
        items: trendingItems,
        placeholder: '0 items',
        pagination: 10,
      }}
      secondaryList={{
        title: 'Recently Updated',
        items: recentlyUpdatedItems,
        placeholder: '0 items',
        pagination: 10,
      }}
      queryList={{
        title: 'Search Results',
        items: marketplaceItems,
        placeholder: 'No results for {query}',
        pagination: 10,
      }}
    />
  );
}
