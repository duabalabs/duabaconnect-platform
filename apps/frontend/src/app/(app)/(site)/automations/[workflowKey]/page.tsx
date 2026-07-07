import { BRAND_NAME } from '@gitroom/helpers/utils/brand';
import { AutomationDetailComponent } from '@gitroom/frontend/components/connect/automation-detail.component';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: `${BRAND_NAME} Automation`,
  description: '',
};

export default async function Page(props: {
  params: Promise<{ workflowKey: string }>;
}) {
  const { workflowKey } = await props.params;
  return <AutomationDetailComponent workflowKey={workflowKey} />;
}
