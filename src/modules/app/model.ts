import {CustomError, RedirectError} from "common/Errors";
import {unserializeUrlQuery} from "common/request";
import {emptyModule} from "common/routers";
import {checkFastRedirect} from "common/routers";
import {ProjectConfig, StartupStep} from "entity/global";
import {CurUser} from "entity/session";
import {ModuleGetter, RootState} from "modules";
import {ModuleNames} from "modules/names";
import {Actions, BaseModuleHandlers, BaseModuleState, effect, ERROR, exportModel, GetModule, LoadingState, loadModel, LOCATION_CHANGE, reducer, RouterState} from "react-coat";
import {matchPath} from "react-router";
import * as sessionService from "./api/session";
import * as settingsService from "./api/settings";

// 定义本模块的State类型
export interface State extends BaseModuleState {
  query: {[moduleName: string]: {[key: string]: any}};
  projectConfig: ProjectConfig | null;
  curUser: CurUser | null;
  startupStep: StartupStep;
  loading: {
    global: LoadingState;
    login: LoadingState;
  };
}

// 定义本模块的Handlers
class ModuleHandlers extends BaseModuleHandlers<State, RootState> {
  constructor() {
    // 定义本模块State的初始值
    const initState: State = {
      query: {},
      projectConfig: null,
      curUser: null,
      startupStep: StartupStep.init,
      loading: {
        global: LoadingState.Stop,
        login: LoadingState.Stop,
      },
    };
    super(initState);
  }

  @reducer
  public putStartup(startupStep: StartupStep): State {
    return {...this.state, startupStep};
  }
  @reducer
  public putQuery(query: any): State {
    return {...this.state, query};
  }
  @effect("login") // 使用自定义loading状态
  public async login(payload: {username: string; password: string}) {
    const loginResult = await sessionService.api.login(payload);
    if (!loginResult.error) {
      this.dispatch(this.callThisAction(this.putCurUser, loginResult.data));
    } else {
      alert(loginResult.error.message);
    }
  }

  @reducer
  protected putCurUser(curUser: CurUser): State {
    return {...this.state, curUser};
  }
  private parseQuery(search: string): {[moduleName: string]: {[key: string]: any}} {
    return search.split(/[&?]/).reduce((pre, cur) => {
      const [key, val] = cur.split("=");
      if (key) {
        const arr = key.split("-");
        const moduleName = arr.shift();
        const moduleKey = arr.join("-");
        if (moduleName && moduleKey) {
          if (!pre[moduleName]) {
            pre[moduleName] = {};
          }
          pre[moduleName][moduleKey] = unserializeUrlQuery(val);
        }
      }
      return pre;
    }, {});
  }

  @effect(null)
  protected async [LOCATION_CHANGE](router: RouterState) {
    const redirect = checkFastRedirect(router.location.pathname);
    if (redirect) {
      this.dispatch(this.routerActions.replace(redirect.url));
    }
    // 集中解析url query参数
    const query = this.parseQuery(router.location.search);
    this.dispatch(this.callThisAction(this.putQuery, query));
  }

  // 兼听全局错误的Action，并发送给后台
  // 兼听外部模块的Action，不需要手动触发，所以请使用protected或private
  @effect(null) // 不需要loading，设置为null
  protected async [ERROR](error: CustomError) {
    if (error.code === "301" || error.code === "302") {
      const url = error.detail as string;
      if (url.endsWith("404.html")) {
        window.location.href = error.detail;
      } else {
        this.dispatch(this.routerActions.replace(url));
      }
    } else {
      await settingsService.api.reportError(error);
    }
  }

  // 兼听自已的INIT Action，做一些异步数据请求，不需要手动触发，所以请使用protected或private
  @effect()
  protected async [ModuleNames.app + "/INIT"]() {
    const router = this.rootState.router;
    const query = this.parseQuery(router.location.search);
    const [projectConfig, curUser] = await Promise.all([settingsService.api.getSettings(), sessionService.api.getCurUser()]);
    this.dispatch(
      this.callThisAction(this.UPDATE, {
        ...this.state,
        query,
        projectConfig,
        curUser,
        startupStep: StartupStep.configLoaded,
      })
    );
    const routes: Array<{path?: string; exact?: boolean; module: GetModule}> = [
      {
        path: "/my",
        exact: true,
        module: () => {
          if (!curUser.hasLogin) {
            throw new RedirectError("301", "/login");
          } else {
            return ModuleGetter.photos();
          }
        },
      },
      {
        path: "/login",
        exact: true,
        module: () => {
          if (curUser.hasLogin) {
            throw new RedirectError("301", "/");
          } else {
            return emptyModule;
          }
        },
      },
      {path: "/photos", exact: true, module: ModuleGetter.photos},
      {path: "/videos", exact: true, module: ModuleGetter.videos},
    ];
    const matchs = routes.filter(route => matchPath(router.location.pathname, route));
    if (!matchs.length) {
      matchs.push({
        module: () => {
          throw new RedirectError("301", `${InitEnv.clientPublicPath}404.html`);
        },
      });
    }
    await Promise.all(matchs.map(route => loadModel(route.module).then(subModel => subModel(this.store))));
  }
}

// 导出本模块的Actions
export type ModuleActions = Actions<ModuleHandlers>;

export default exportModel(ModuleNames.app, ModuleHandlers);