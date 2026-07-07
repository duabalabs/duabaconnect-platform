import { BRAND_NAME } from '@gitroom/helpers/utils/brand';
import { PlansComponent } from '@gitroom/frontend/components/connect/plans.component';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: `${BRAND_NAME} Plans`,
  description: '',
};

export default async function Page() {
  return (
    <div className="flex-1 p-[20px] md:p-[28px] max-w-[1100px] mx-auto w-full">
      <PlansComponent />
    </div>
  );
}
