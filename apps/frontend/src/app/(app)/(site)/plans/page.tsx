import { BRAND_NAME } from '@gitroom/helpers/utils/brand';
import { PlansComponent } from '@gitroom/frontend/components/connect/plans.component';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: `${BRAND_NAME} Plans`,
  description: '',
};

export default async function Page() {
  return <PlansComponent />;
}
