export enum OS {
  Windows = 'windows',
  Linux = 'linux',
  Darwin = 'darwin',
}

export enum WindowStartState {
  Normal = 0,
  Minimised = 2,
}

export enum WebviewGpuPolicy {
  Always = 0,
  OnDemand = 1,
  Never = 2,
}

export enum Theme {
  Auto = 'auto',
  Light = 'light',
  Dark = 'dark',
}

export enum Lang {
  EN = 'en',
  ZH = 'zh',
}

export enum View {
  Grid = 'grid',
  List = 'list',
}

export enum ControllerCloseMode {
  All = 'all',
  Button = 'button',
}

export enum Color {
  Default = 'default',
  Green = 'green',
  Purple = 'purple',
  Custom = 'custom',
}

export enum Branch {
  Main = 'main',
  Alpha = 'alpha',
}

export enum RequestProxyMode {
  Global = 'global',
  None = 'none',
  System = 'system',
  Kernel = 'kernel',
  Custom = 'custom',
}

export enum RequestMethod {
  Get = 'GET',
  Post = 'POST',
  Delete = 'DELETE',
  Put = 'PUT',
  Head = 'HEAD',
  Patch = 'PATCH',
}
