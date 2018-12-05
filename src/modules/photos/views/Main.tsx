import {extendSearch} from "common/routers";
import Icon, {IconClass} from "components/Icon";
import Pagination from "components/Pagination";
import {ListData} from "entity/photo";
import {RootState, RouteData} from "modules";
import {ModuleNames} from "modules/names";
import thisModule from "modules/photos/facade";
import * as React from "react";
import {connect, DispatchProp} from "react-redux";
import "./index.less";

interface Props extends DispatchProp {
  routeState: RouteData;
  listData: ListData;
}

class Component extends React.PureComponent<Props> {
  private onPageChange = (page: number) => {
    this.props.dispatch(thisModule.actions.openList({options: {page}, extend: "CURRENT"}));
  };
  public render() {
    const {
      routeState,
      listData: {items, summary, search},
    } = this.props;
    return items ? (
      <div className={`${ModuleNames.photos} g-pic-list`}>
        <div className="list-items">
          {items.map(item => (
            <div key={item.id} className="g-pre-img">
              <a href="#" style={{backgroundImage: `url(${item.coverUrl})`}}>
                <h5 className="title">{item.title}</h5>
                <div className="listImg" />
                <div className="props">
                  <Icon type={IconClass.LOCATION} /> {item.departure}
                  <Icon type={IconClass.HEART} /> {item.type}
                </div>
                <div className="desc">
                  <span className="hot">
                    人气(<strong>{item.hot}</strong>)
                  </span>
                  <em className="price">
                    <span className="unit">￥</span>
                    {item.price}
                  </em>
                </div>
              </a>
            </div>
          ))}
        </div>
        {summary && (
          <div className="pagination">
            <Pagination baseUrl={extendSearch(ModuleNames.photos, routeState, {...search, page: NaN})} page={summary.page} totalPages={summary.totalPages} onChange={this.onPageChange} />
          </div>
        )}
      </div>
    ) : null;
  }
}

const mapStateToProps = (state: RootState) => {
  const model = state.photos;
  return {
    routeState: state.router.data,
    listData: model.listData,
  };
};

export default connect(mapStateToProps)(Component);
