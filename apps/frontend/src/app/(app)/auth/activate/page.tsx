export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Activate } from '@gitroom/frontend/components/auth/activate';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { BRAND_NAME } from '@gitroom/helpers/utils/brand';
export const metadata: Metadata = {
  title: `${
    BRAND_NAME
  } - Activate your account`,
  description: '',
};
export default async function Auth() {
  return <Activate />;
}
