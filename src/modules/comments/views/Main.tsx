import {toUrl} from "common/routers";
import {RootState} from "modules";
import {ModuleNames} from "modules/names";
import * as React from "react";
import {connect} from "react-redux";
import {Route, Switch} from "react-router-dom";
import DetailsView from "./Details";
import Editor from "./Editor";
import ListView from "./List";
import "./Main.less";

class Component extends React.PureComponent {
  public render() {
    return (
      <div className={`${ModuleNames.comments}`}>
        <div className="wrap">
          <Switch>
            <Route exact={false} path={toUrl(ModuleNames.comments, "List")} component={ListView} />
            <Route exact={false} path={toUrl(ModuleNames.comments, "Details")} component={DetailsView} />
          </Switch>
        </div>
        <Editor />
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    pathname: state.router.location.pathname,
  };
};

export default connect(mapStateToProps)(Component);
