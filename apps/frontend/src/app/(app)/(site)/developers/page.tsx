import { BRAND_NAME } from '@gitroom/helpers/utils/brand';
import { DevelopersComponent } from '@gitroom/frontend/components/connect/developers.component';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: `${BRAND_NAME} Developers`,
  description: '',
};

export default async function Page() {
  return <DevelopersComponent />;
}
