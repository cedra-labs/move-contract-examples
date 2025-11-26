import { DAO } from '../types/dao';

interface MetaTagConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

export const updateMetaTags = (config: MetaTagConfig) => {
  // Update title
  document.title = config.title;
  
  // Update meta tags
  const metaTags = [
    { name: 'title', content: config.title },
    { name: 'description', content: config.description },
    { property: 'og:title', content: config.title },
    { property: 'og:description', content: config.description },
    { property: 'og:url', content: config.url || window.location.href },
    { property: 'twitter:title', content: config.title },
    { property: 'twitter:description', content: config.description },
    { property: 'twitter:url', content: config.url || window.location.href },
  ];

  // Add image tags if provided
  if (config.image) {
    metaTags.push(
      { property: 'og:image', content: config.image },
      { property: 'twitter:image', content: config.image }
    );
  }

  metaTags.forEach(({ name, property, content }) => {
    const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
    let meta = document.querySelector(selector) as HTMLMetaElement;
    
    if (!meta) {
      meta = document.createElement('meta');
      if (name) meta.name = name;
      if (property) meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    
    meta.content = content;
  });
};

export const generateDAOMetaTags = (dao: DAO): MetaTagConfig => {
  const title = `${dao.name} | MoveDAO`;
  const description = `${dao.description} • ${dao.members} members • ${dao.proposals} proposals • Join the ${dao.name} DAO on Cedra Network.`;
  
  return {
    title,
    description,
    image: dao.image || undefined, // Use DAO image if available
    url: window.location.href
  };
};

export const resetToDefaultMetaTags = () => {
  updateMetaTags({
    title: 'MoveDAO | The Cedra Community',
    description: 'Discover and participate in DAOs on Cedra Network. Create proposals, vote, and govern decentralized communities with on-chain transparency.',
    url: ''
  });
};