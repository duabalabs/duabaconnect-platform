import { BRAND_NAME } from '@gitroom/helpers/utils/brand';
import { AdminAutomationsComponent } from '@gitroom/frontend/components/connect/admin-automations.component';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: `${BRAND_NAME} — Manage automations`,
  description: '',
};

export default async function Page() {
  return <AdminAutomationsComponent />;
}
