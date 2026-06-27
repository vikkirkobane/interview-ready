declare module 'tabler-icons-react-native/icons-js/*' {
  import { SvgProps } from 'react-native-svg';
  import { ComponentType } from 'react';
  const content: ComponentType<SvgProps & { size?: number; color?: string; stroke?: number }>;
  export default content;
}
