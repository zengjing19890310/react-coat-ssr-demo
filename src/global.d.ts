declare function getInitEnv(global: any, isDev: boolean): void;
declare const InitEnv: {
  clientPublicPath: string;
  apiServer: {[key: string]: string};
};