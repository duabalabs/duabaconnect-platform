import { BRAND_NAME } from '@gitroom/helpers/utils/brand';
import { AutomationsComponent } from '@gitroom/frontend/components/connect/automations.component';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: `${BRAND_NAME} Automations`,
  description: '',
};

export default async function Page() {
  return (
    <div className="flex-1 p-[20px] md:p-[28px] max-w-[1100px] mx-auto w-full">
      <AutomationsComponent />
    </div>
  );
}
