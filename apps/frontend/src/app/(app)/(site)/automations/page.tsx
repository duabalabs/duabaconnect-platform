import { BRAND_NAME } from '@gitroom/helpers/utils/brand';
import { AutomationsComponent } from '@gitroom/frontend/components/connect/automations.component';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: `${BRAND_NAME} Automations`,
  description: '',
};

export default async function Page() {
  return <AutomationsComponent />;
}
