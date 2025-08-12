import { FC } from "react";

type AuthLayoutWrapperProps = {
    children: React.ReactNode;
}

export const AuthLayoutWrapper: FC<AuthLayoutWrapperProps> = ({ children }) => {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{children}</div>
}