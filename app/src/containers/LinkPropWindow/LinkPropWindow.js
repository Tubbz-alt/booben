import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { Map, List } from 'immutable';
import Portal from 'react-portal-minimal';

import {
  BackdropBreadcrumbs,
} from '../../components/BackdropBreadcrumbs/BackdropBreadcrumbs';

import {
  LinkSourceSelection,
} from './LinkSourceSelection/LinkSourceSelection';

import {
  OwnerComponentPropSelection,
} from './OwnerComponentPropSelection/OwnerComponentPropSelection';

import { DataSelection } from './DataSelection/DataSelection';
import { FunctionSelection } from './FunctionSelection/FunctionSelection';
import { RouteParamSelection } from './RouteParamSelection/RouteParamSelection';
import { ActionArgSelection } from './ActionArgSelection/ActionArgSelection';
import { DataWindow } from '../../components/DataWindow/DataWindow';

import {
  topNestedConstructorSelector,
  topNestedConstructorComponentSelector,
  availableDataContextsSelector,
  getLocalizedTextFromState,
  currentComponentsSelector,
} from '../../selectors';

import { createFunction, pickComponentData } from '../../actions/project';
import ProjectComponentRecord from '../../models/ProjectComponent';
import ProjectRecord from '../../models/Project';

import BoobenValue, {
  SourceDataFunction,
  SourceDataOwnerProp,
  SourceDataRouteParams,
  SourceDataData,
  QueryPathStep,
  SourceDataActionArg,
  SourceDataState,
} from '../../models/BoobenValue';

import { NestedConstructor } from '../../reducers/project';
import { getStateSlotPickerFns } from '../../actions/helpers/component-picker';
import { getComponentMeta, isValidSourceForValue } from '../../lib/meta';
import { noop } from '../../utils/misc';
import * as BoobenPropTypes from '../../constants/common-prop-types';
import { INVALID_ID } from '../../constants/misc';

const propTypes = {
  meta: PropTypes.object.isRequired,
  schema: PropTypes.object.isRequired,
  project: PropTypes.instanceOf(ProjectRecord).isRequired,
  components: BoobenPropTypes.components.isRequired,
  projectFunctions: ImmutablePropTypes.map.isRequired,
  builtinFunctions: ImmutablePropTypes.map.isRequired,
  valueDef: PropTypes.object,
  userTypedefs: PropTypes.object,
  actionArgsMeta: PropTypes.arrayOf(PropTypes.object),
  actionComponentMeta: PropTypes.object,
  name: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(PropTypes.string),
  availableDataContexts: PropTypes.arrayOf(PropTypes.shape({
    dataContext: PropTypes.arrayOf(PropTypes.string),
    typeName: PropTypes.string,
  })).isRequired,
  topNestedConstructor: PropTypes.instanceOf(NestedConstructor),
  topNestedConstructorComponent: PropTypes.instanceOf(
    ProjectComponentRecord,
  ),
  currentRouteId: PropTypes.number.isRequired,
  language: PropTypes.string.isRequired,
  pickingComponent: PropTypes.bool.isRequired,
  pickingComponentData: PropTypes.bool.isRequired,
  pickedComponentId: PropTypes.number.isRequired, // eslint-disable-line react/no-unused-prop-types
  pickedComponentData: PropTypes.string, // eslint-disable-line react/no-unused-prop-types
  getLocalizedText: PropTypes.func.isRequired,
  onLink: PropTypes.func,
  onCreateFunction: PropTypes.func.isRequired,
  onPickComponentData: PropTypes.func.isRequired,
};

const defaultProps = {
  topNestedConstructor: null,
  topNestedConstructorComponent: null,
  valueDef: null,
  userTypedefs: null,
  actionArgsMeta: null,
  actionComponentMeta: null,
  name: '',
  breadcrumbs: [],
  pickedComponentData: null,
  onLink: noop,
};

const mapStateToProps = state => ({
  meta: state.project.meta,
  schema: state.project.schema,
  project: state.project.data,
  components: currentComponentsSelector(state),
  projectFunctions: state.project.data.functions,
  builtinFunctions: Map(), // TODO: Pass built-in functions here
  availableDataContexts: availableDataContextsSelector(state),
  topNestedConstructor: topNestedConstructorSelector(state),
  topNestedConstructorComponent: topNestedConstructorComponentSelector(state),
  currentRouteId: state.project.currentRouteId,
  language: state.project.languageForComponentProps,
  pickingComponent: state.project.pickingComponent,
  pickingComponentData: state.project.pickingComponentData,
  pickedComponentId: state.project.pickedComponentId,
  pickedComponentData: state.project.pickedComponentData,
  getLocalizedText: getLocalizedTextFromState(state),
});

const mapDispatchToProps = dispatch => ({
  onCreateFunction: ({
    name,
    title,
    description,
    args,
    returnType,
    code,
    spreadLastArg,
  }) =>
    void dispatch(createFunction(
      name,
      title,
      description,
      args,
      returnType,
      code,
      spreadLastArg,
    )),

  onPickComponentData: (filter, dataGetter) =>
    void dispatch(pickComponentData(filter, dataGetter)),
});

const wrap = connect(mapStateToProps, mapDispatchToProps);

class LinkPropWindowComponent extends PureComponent {
  constructor(props, context) {
    super(props, context);

    this.state = {
      selectedSourceId: '',
      selectedSourceData: null,
      haveNestedWindow: false,
      nestedWindowOnLink: null,
      nestedWindowValueDef: null,
      nestedWindowUserTypedefs: null,
      nestedWindowLinkName: '',
    };

    this._handleSelectSource = this._handleSelectSource.bind(this);
    this._handleReturn = this._handleReturn.bind(this);
    this._handleLinkWithOwnerProp = this._handleLinkWithOwnerProp.bind(this);
    this._handleLinkWithData = this._handleLinkWithData.bind(this);
    this._handleLinkWithFunction = this._handleLinkWithFunction.bind(this);
    this._handleCreateFunction = this._handleCreateFunction.bind(this);
    this._handleLinkWithRouteParam = this._handleLinkWithRouteParam.bind(this);
    this._handleLinkWithActionArg = this._handleLinkWithActionArg.bind(this);
    this._handleNestedLink = this._handleNestedLink.bind(this);
    this._handleNestedLinkDone = this._handleNestedLinkDone.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { pickingComponentData } = this.props;

    if (pickingComponentData && !nextProps.pickingComponentData) {
      if (
        nextProps.pickedComponentId !== INVALID_ID &&
        nextProps.pickedComponentData !== null
      ) {
        this._handlePickApply({
          componentId: nextProps.pickedComponentId,
          stateSlot: nextProps.pickedComponentData,
        });
      }
    }
  }

  /**
   *
   * @param {number} componentId
   * @param {string} stateSlot
   * @private
   */
  _handlePickApply({ componentId, stateSlot }) {
    const { onLink } = this.props;

    const newValue = new BoobenValue({
      source: 'state',
      sourceData: new SourceDataState({ componentId, stateSlot }),
    });

    onLink({ newValue });
  }

  /**
   *
   * @return {LinkSourceItem[]}
   * @private
   */
  _getAvailableSources() {
    const {
      project,
      currentRouteId,
      topNestedConstructor,
      availableDataContexts,
      valueDef,
      getLocalizedText,
    } = this.props;

    const items = [];

    if (isValidSourceForValue(valueDef, 'static') && topNestedConstructor) {
      items.push({
        id: 'owner',
        title: getLocalizedText('linkDialog.source.owner'),
      });
    }

    if (isValidSourceForValue(valueDef, 'data')) {
      items.push({
        id: 'query',
        title: getLocalizedText('linkDialog.source.data'),
      });

      availableDataContexts.forEach(({ dataContext, typeName }, idx) => {
        items.push({
          id: `context-${idx}`,
          title: getLocalizedText('linkDialog.source.dataContext', {
            context: typeName,
          }),
          data: {
            dataContext,
            rootTypeName: typeName,
          },
        });
      });
    }

    if (isValidSourceForValue(valueDef, 'routeParams')) {
      let routeId = currentRouteId;
      let haveRouteParams = false;

      while (routeId !== INVALID_ID) {
        const route = project.routes.get(routeId);
        if (route.paramValues.size) {
          haveRouteParams = true;
          break;
        }

        routeId = route.parentId;
      }

      if (haveRouteParams) {
        items.push({
          id: 'routeParams',
          title: getLocalizedText('linkDialog.source.routeParams'),
        });
      }
    }

    if (isValidSourceForValue(valueDef, 'actionArg')) {
      items.push({
        id: 'actionArg',
        title: getLocalizedText('linkDialog.source.actionArgs'),
      });
    }

    items.push({
      id: 'function',
      title: getLocalizedText('linkDialog.source.function'),
    });

    if (isValidSourceForValue(valueDef, 'state')) {
      items.push({
        id: 'otherComponent',
        title: getLocalizedText('linkDialog.source.otherComponent'),
        withoutConnection: true,
      });
    }

    return items;
  }

  /**
   *
   * @param {string} id
   * @param {*} data
   * @private
   */
  _handleSelectSource({ id, data }) {
    const {
      meta,
      components,
      valueDef,
      userTypedefs,
      language,
      onPickComponentData,
    } = this.props;

    if (id === 'otherComponent') {
      const { filter, dataGetter } = getStateSlotPickerFns(
        valueDef,
        userTypedefs,
        components,
        meta,
        language,
      );

      onPickComponentData(filter, dataGetter);
    } else {
      this.setState({
        selectedSourceId: id,
        selectedSourceData: data,
      });
    }
  }

  /**
   *
   * @private
   */
  _handleReturn() {
    this.setState({
      selectedSourceId: '',
      selectedSourceData: null,
    });
  }

  /**
   *
   * @param {string} propName
   * @private
   */
  _handleLinkWithOwnerProp({ propName }) {
    const { onLink } = this.props;

    const newValue = new BoobenValue({
      source: BoobenValue.Source.OWNER_PROP,
      sourceData: new SourceDataOwnerProp({
        ownerPropName: propName,
      }),
    });

    onLink({ newValue });
  }

  /**
   *
   * @param {string[]} dataContext
   * @param {string[]} path
   * @param {Immutable.Map<string, Object>} args
   * @private
   */
  _handleLinkWithData({ dataContext, path, args }) {
    const { onLink } = this.props;

    const newValue = new BoobenValue({
      source: BoobenValue.Source.DATA,
      sourceData: new SourceDataData({
        dataContext: List(dataContext),
        queryPath: List(path.map(field => new QueryPathStep({ field }))),
        queryArgs: args,
      }),
    });

    onLink({ newValue });
  }

  /**
   *
   * @param {string} source
   * @param {string} name
   * @param {Immutable.Map<string, Object>} argValues
   * @private
   */
  _handleLinkWithFunction({ source, name, argValues }) {
    const { onLink } = this.props;

    const newValue = new BoobenValue({
      source: BoobenValue.Source.FUNCTION,
      sourceData: new SourceDataFunction({
        functionSource: source,
        function: name,
        args: argValues,
      }),
    });

    onLink({ newValue });
  }

  /**
   *
   * @param {string} name
   * @param {string} title
   * @param {string} description
   * @param {Object[]} args
   * @param {string} returnType
   * @param {string} code
   * @private
   */
  _handleCreateFunction({
    name,
    title,
    description,
    args,
    returnType,
    code,
    spreadLastArg,
  }) {
    this.props.onCreateFunction({
      name,
      title,
      description,
      args,
      returnType,
      code,
      spreadLastArg,
    });
  }

  /**
   *
   * @param {number} routeId
   * @param {string} paramName
   * @private
   */
  _handleLinkWithRouteParam({ routeId, paramName }) {
    const { onLink } = this.props;

    const newValue = new BoobenValue({
      source: BoobenValue.Source.ROUTE_PARAMS,
      sourceData: new SourceDataRouteParams({ routeId, paramName }),
    });

    onLink({ newValue });
  }

  /**
   *
   * @param {number} argIdx
   * @private
   */
  _handleLinkWithActionArg({ argIdx }) {
    const { onLink } = this.props;

    const newValue = new BoobenValue({
      source: BoobenValue.Source.ACTION_ARG,
      sourceData: new SourceDataActionArg({
        arg: argIdx,
      }),
    });

    onLink({ newValue });
  }

  /**
   *
   * @param {string} name
   * @param {BoobenValueDefinition} valueDef
   * @param {?Object<string, BoobenTypeDefinition>} userTypedefs
   * @param {Function} onLink
   * @private
   */
  _handleNestedLink({ name, valueDef, userTypedefs, onLink }) {
    this.setState({
      haveNestedWindow: true,
      nestedWindowOnLink: onLink,
      nestedWindowValueDef: valueDef,
      nestedWindowUserTypedefs: userTypedefs,
      nestedWindowLinkName: name,
    });
  }

  /**
   *
   * @param {Object} newValue - BoobenValue record
   * @private
   */
  _handleNestedLinkDone({ newValue }) {
    const { nestedWindowOnLink } = this.state;

    this.setState({
      haveNestedWindow: false,
      nestedWindowOnLink: null,
      nestedWindowValueDef: null,
      nestedWindowUserTypedefs: null,
      nestedWindowLinkName: '',
    });

    nestedWindowOnLink({ newValue });
  }

  _renderFloatingBreadcrumbs() {
    const {
      name,
      breadcrumbs,
      pickingComponent,
      pickingComponentData,
    } = this.props;

    const { haveNestedWindow } = this.state;

    if (haveNestedWindow || pickingComponent || pickingComponentData) {
      return null;
    }

    const items = [...breadcrumbs, name].map(str => ({ title: str }));
    if (!items.length) return null;

    return (
      <Portal>
        <BackdropBreadcrumbs items={items} />
      </Portal>
    );
  }

  /**
   *
   * @return {ReactElement}
   * @private
   */
  _renderSourceSelection() {
    const sourceItems = this._getAvailableSources();

    return (
      <LinkSourceSelection
        items={sourceItems}
        onSelect={this._handleSelectSource}
      />
    );
  }

  /**
   *
   * @return {ReactElement}
   * @private
   */
  _renderOwnerPropSelection() {
    const {
      meta,
      valueDef,
      userTypedefs,
      topNestedConstructor,
      topNestedConstructorComponent,
      language,
      getLocalizedText,
    } = this.props;

    const ownerMeta = getComponentMeta(
      topNestedConstructorComponent.name,
      meta,
    );

    const ownerPropMeta = topNestedConstructor.valueInfo.valueDef;

    return (
      <OwnerComponentPropSelection
        ownerComponentMeta={ownerMeta}
        ownerPropMeta={ownerPropMeta}
        linkTargetValueDef={valueDef}
        userTypedefs={userTypedefs}
        language={language}
        getLocalizedText={getLocalizedText}
        onSelect={this._handleLinkWithOwnerProp}
        onReturn={this._handleReturn}
      />
    );
  }

  /**
   *
   * @param {string[]} dataContext
   * @param {string} rootTypeName
   * @return {ReactElement}
   * @private
   */
  _renderDataSelection(dataContext, rootTypeName) {
    const {
      schema,
      valueDef,
      userTypedefs,
      getLocalizedText,
    } = this.props;

    return (
      <DataSelection
        dataContext={dataContext}
        schema={schema}
        rootTypeName={rootTypeName}
        linkTargetValueDef={valueDef}
        userTypedefs={userTypedefs}
        getLocalizedText={getLocalizedText}
        onSelect={this._handleLinkWithData}
        onReturn={this._handleReturn}
        onNestedLink={this._handleNestedLink}
      />
    );
  }

  _renderFunctionSelection() {
    const {
      valueDef,
      userTypedefs,
      projectFunctions,
      builtinFunctions,
      getLocalizedText,
    } = this.props;

    return (
      <FunctionSelection
        valueDef={valueDef}
        userTypedefs={userTypedefs}
        projectFunctions={projectFunctions}
        builtinFunctions={builtinFunctions}
        getLocalizedText={getLocalizedText}
        onSelect={this._handleLinkWithFunction}
        onCreateFunction={this._handleCreateFunction}
        onReturn={this._handleReturn}
        onNestedLink={this._handleNestedLink}
      />
    );
  }

  _renderRouteParamsSelection() {
    const { project, currentRouteId, getLocalizedText } = this.props;

    return (
      <RouteParamSelection
        routes={project.routes}
        currentRouteId={currentRouteId}
        getLocalizedText={getLocalizedText}
        onSelect={this._handleLinkWithRouteParam}
        onReturn={this._handleReturn}
      />
    );
  }

  _renderActionArgSelection() {
    const {
      valueDef,
      userTypedefs,
      language,
      actionArgsMeta,
      actionComponentMeta,
      getLocalizedText,
    } = this.props;

    return (
      <ActionArgSelection
        linkTargetValueDef={valueDef}
        userTypedefs={userTypedefs}
        language={language}
        actionArgsMeta={actionArgsMeta}
        actionComponentMeta={actionComponentMeta}
        getLocalizedText={getLocalizedText}
        onSelect={this._handleLinkWithActionArg}
        onReturn={this._handleReturn}
      />
    );
  }

  _renderNestedWindow() {
    const { name, breadcrumbs } = this.props;
    const {
      haveNestedWindow,
      nestedWindowValueDef,
      nestedWindowUserTypedefs,
      nestedWindowLinkName,
    } = this.state;

    if (!haveNestedWindow) return null;

    const nestedWindowBreadcrumbs = [...breadcrumbs, name];

    return (
      <LinkPropWindow
        name={nestedWindowLinkName}
        breadcrumbs={nestedWindowBreadcrumbs}
        valueDef={nestedWindowValueDef}
        userTypedefs={nestedWindowUserTypedefs}
        onLink={this._handleNestedLinkDone}
      />
    );
  }

  _renderMainWindow() {
    const {
      schema,
      valueDef,
      pickingComponent,
      pickingComponentData,
    } = this.props;

    const {
      selectedSourceId,
      selectedSourceData,
      haveNestedWindow,
    } = this.state;

    if (!valueDef) return null;

    let content = null;

    if (!selectedSourceId) {
      content = this._renderSourceSelection();
    } else if (selectedSourceId === 'owner') {
      content = this._renderOwnerPropSelection();
    } else if (selectedSourceId === 'query') {
      content = this._renderDataSelection([], schema.queryTypeName);
    } else if (selectedSourceId === 'function') {
      content = this._renderFunctionSelection();
    } else if (selectedSourceId === 'routeParams') {
      content = this._renderRouteParamsSelection();
    } else if (selectedSourceId === 'actionArg') {
      content = this._renderActionArgSelection();
    } else if (selectedSourceId.startsWith('context')) {
      content = this._renderDataSelection(
        selectedSourceData.dataContext,
        selectedSourceData.rootTypeName,
      );
    }

    const hidden = haveNestedWindow || pickingComponent || pickingComponentData;

    return (
      <DataWindow hidden={hidden}>
        {content}
      </DataWindow>
    );
  }

  render() {
    const mainWindow = this._renderMainWindow();
    const nestedWindow = this._renderNestedWindow();
    const breadcrumbs = this._renderFloatingBreadcrumbs();

    return (
      <Fragment>
        {mainWindow}
        {nestedWindow}
        {breadcrumbs}
      </Fragment>
    );
  }
}

LinkPropWindowComponent.propTypes = propTypes;
LinkPropWindowComponent.defaultProps = defaultProps;
LinkPropWindowComponent.displayName = 'LinkPropWindow';

export const LinkPropWindow = wrap(LinkPropWindowComponent);
