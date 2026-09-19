import { LandingLayout } from '@eve-frontier-space/ui';
import { PageWrapper } from '@/components/templates/index.ts';
import {
  Hero,
  DocumentationSection,
  ResourceCardsSection,
  VideoGallerySection,
  CommunityGallerySection,
  GitHubReposSection,
  PlayCtaSection,
  Footer,
  HeaderActions,
} from '@/components/organisms/index.ts';

export function HomePage() {
  return (
    <PageWrapper>
      <LandingLayout
        headerRight={<HeaderActions />}
        footer={
          <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
            <Footer />
          </div>
        }
      >
        <main>
          <Hero />
          <div className="px-4 sm:px-6 lg:px-8">
            <DocumentationSection />
            <ResourceCardsSection />
            <VideoGallerySection />
            <CommunityGallerySection />
            <GitHubReposSection />
            <PlayCtaSection />
          </div>
        </main>
      </LandingLayout>
    </PageWrapper>
  );
}
