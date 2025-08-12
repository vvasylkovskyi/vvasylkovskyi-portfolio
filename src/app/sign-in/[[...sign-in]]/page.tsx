import { AuthLayoutWrapper } from '@/components/layout/auth-layout-wrapper';
import { SignIn } from '@clerk/nextjs'

export default function Page() {
    return <AuthLayoutWrapper><SignIn /></AuthLayoutWrapper>;
}