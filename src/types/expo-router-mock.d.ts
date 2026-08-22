import 'expo-router';

declare module 'expo-router' {
  export const router: {
    push: (href: any, options?: any) => void;
    replace: (href: any, options?: any) => void;
    back: () => void;
    canGoBack: () => boolean;
    navigate: (href: any, options?: any) => void;
    setParams: (params?: any) => any;
    dismiss: (count?: number) => void;
    dismissTo: (href: any, options?: any) => void;
    dismissAll: () => void;
    canDismiss: () => boolean;
    __resetMockRouter: () => void;
    __setMockParams: (params: Record<string, any>) => void;
    __getMockState: () => any;
    [key: string]: any;
  };
}
