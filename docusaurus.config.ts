import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Smistx‘s Blog',
  tagline: 'Spaces and cat are cool',
  favicon: 'img/favicon.png',

  future: {
    v4: true,
  },

  url: 'https://smistx.github.io/',
  baseUrl: '/blog/',

  organizationName: 'smistx',
  projectName: 'blog',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: false, // Disable docs
        blog: {
          showReadingTime: true,
          routeBasePath: '/', // Set blog as homepage
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/smistx/blog/tree/main/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Smistx‘s Blog',
      logo: {
        alt: 'My Site Logo',
        src: 'img/favicon.svg',
      },
      /*
      items: [
        {
          href: 'https://github.com/smistx/blog',
          label: 'GitHub',
          position: 'right',
        },
      ],
      */
    },
    footer: {
      style: 'dark',
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} Smistx. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
