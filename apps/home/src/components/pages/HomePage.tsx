import { PageWrapper } from '@/components/templates/index.ts';
import {
  Header,
  Hero,
  DocumentationSection,
  ResourceCardsSection,
  CommunityGallerySection,
  GitHubReposSection,
  PlayCtaSection,
  Footer,
} from '@/components/organisms/index.ts';

export function HomePage() {
  return (
    <PageWrapper>
      <Header isHomePage />
      <main>
        <Hero />
        <div className="px-4 sm:px-6 lg:px-8">
          <DocumentationSection />
          <ResourceCardsSection />
          <CommunityGallerySection />
          <GitHubReposSection />
          <PlayCtaSection />
        </div>
      </main>
      <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
        <Footer />
      </div>
    </PageWrapper>
  );
}
