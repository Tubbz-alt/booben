/**
 * @author Dmitriy Bizyaev
 */

'use strict';

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import ProjectRoute from '../../../models/ProjectRoute';

import {
  BlockContent,
  BlockContentBox,
  BlockContentBoxItem,
  BlockContentNavigation,
  BlockBreadcrumbs,
} from '../../../components/BlockContent/BlockContent';

import { DataList, DataItem } from '../../../components/DataList/DataList';
import { noop, returnArg } from '../../../utils/misc';

const propTypes = {
  routes: ImmutablePropTypes.mapOf(
    PropTypes.instanceOf(ProjectRoute),
    PropTypes.number,
  ).isRequired,
  currentRouteId: PropTypes.number.isRequired,
  getLocalizedText: PropTypes.func,
  onSelect: PropTypes.func,
  onReturn: PropTypes.func,
};

const defaultProps = {
  getLocalizedText: returnArg,
  onSelect: noop,
  onReturn: noop,
};

export class RouteParamSelection extends PureComponent {
  constructor(props) {
    super(props);
    
    this._handleSelect = this._handleSelect.bind(this);
    this._handleBreadcrumbsClick = this._handleBreadcrumbsClick.bind(this);
  }
  
  /**
   *
   * @param {{ routeId: number, paramName: string }} data
   * @private
   */
  _handleSelect({ data }) {
    const { onSelect } = this.props;
    onSelect(data);
  }
  
  /**
   *
   * @param {number} index
   * @private
   */
  _handleBreadcrumbsClick({ index }) {
    const { onReturn } = this.props;
    if (index === 0) onReturn();
  }
  
  /**
   *
   * @return {{ title: string }[]}
   * @private
   */
  _getBreadcrumbsItems() {
    const { getLocalizedText } = this.props;
  
    return [{
      title: getLocalizedText('linkDialog.sources'),
    }, {
      title: getLocalizedText('linkDialog.source.routeParams'),
    }];
  }
  
  /**
   *
   * @return {ReactElement[]}
   * @private
   */
  _renderItems() {
    const { routes, currentRouteId } = this.props;
    
    const ret = [];
    let routeId = currentRouteId;
    
    const handleParam = (_, paramName) => {
      const id = `${routeId}/${paramName}`;
      const data = { routeId, paramName };
  
      ret.push(
        <DataItem
          key={id}
          id={id}
          data={data}
          title={paramName}
          onSelect={this._handleSelect}
        />,
      );
    };
    
    while (routeId !== -1) {
      const route = routes.get(routeId);
      route.paramValues.forEach(handleParam);
      routeId = route.parentId;
    }
    
    return ret;
  }
  
  render() {
    const items = this._renderItems();
    const breadcrumbsItems = this._getBreadcrumbsItems();
    
    return (
      <BlockContent>
        <BlockContentNavigation>
          <BlockBreadcrumbs
            items={breadcrumbsItems}
            mode="dark"
            overflow
            onItemClick={this._handleBreadcrumbsClick}
          />
        </BlockContentNavigation>
    
        <BlockContentBox isBordered flex>
          <BlockContentBoxItem>
            <DataList>
              {items}
            </DataList>
          </BlockContentBoxItem>
        </BlockContentBox>
      </BlockContent>
    );
  }
}

RouteParamSelection.propTypes = propTypes;
RouteParamSelection.defaultProps = defaultProps;
RouteParamSelection.displayName = 'RouteParamSelection';