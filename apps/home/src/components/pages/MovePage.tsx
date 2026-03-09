import { PageWrapper } from '@/components/templates/index.ts';
import { Header, Footer } from '@/components/organisms/index.ts';
import { ComingSoon } from './ComingSoon';

export function MovePage() {
  return (
    <PageWrapper>
      <Header />
      <main>
        <ComingSoon />
      </main>
      <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
        <Footer />
      </div>
    </PageWrapper>
  );
}
