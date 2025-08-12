import { AuthLayoutWrapper } from '@/components/layout/auth-layout-wrapper'
import { SignUp } from '@clerk/nextjs'

export default function Page() {
    return <AuthLayoutWrapper><SignUp /></AuthLayoutWrapper>
}