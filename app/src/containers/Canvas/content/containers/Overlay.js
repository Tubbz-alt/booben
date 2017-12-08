import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Set } from 'immutable';
import { connect } from 'react-redux';

import {
  selectedComponentIdsSelector,
  highlightedComponentIdsSelector,
  disabledComponentIdsSelector,
  currentRootComponentIdSelector,
  currentComponentsSelector,
  isCanvasClearSelector,
  getLocalizedTextFromState,
} from '../../../../selectors';

import { OverlayContainer } from '../components/OverlayContainer';
import { OverlayBoundingBox } from '../components/OverlayBoundingBox';
import { CanvasPlaceholder } from '../components/CanvasPlaceholder';
import { formatComponentTitle } from '../../../../lib/components';
import { mapListToArray } from '../../../../utils/misc';
import { CANVAS_CONTAINER_ID } from '../constants';
import { INVALID_ID } from '../../../../constants/misc';
import * as JssyPropTypes from '../../../../constants/common-prop-types';

const propTypes = {
  components: JssyPropTypes.components.isRequired,
  selectedComponentIds: JssyPropTypes.setOfIds.isRequired,
  highlightedComponentIds: JssyPropTypes.setOfIds.isRequired,
  disabledComponentIds: JssyPropTypes.setOfIds.isRequired,
  boundaryComponentId: PropTypes.number.isRequired,
  highlightingEnabled: PropTypes.bool.isRequired,
  draggingComponent: PropTypes.bool.isRequired,
  pickingComponent: PropTypes.bool.isRequired,
  pickingComponentData: PropTypes.bool.isRequired,
  isCanvasClear: PropTypes.bool.isRequired,
  getLocalizedText: PropTypes.func.isRequired,
};

const contextTypes = {
  document: PropTypes.object.isRequired,
};

const mapStateToProps = state => ({
  components: currentComponentsSelector(state),
  selectedComponentIds: selectedComponentIdsSelector(state),
  highlightedComponentIds: highlightedComponentIdsSelector(state),
  disabledComponentIds: disabledComponentIdsSelector(state),
  boundaryComponentId: currentRootComponentIdSelector(state),
  highlightingEnabled: state.project.highlightingEnabled,
  draggingComponent: state.project.draggingComponent,
  pickingComponent: state.project.pickingComponent,
  pickingComponentData: state.project.pickingComponentData,
  isCanvasClear: isCanvasClearSelector(state),
  getLocalizedText: getLocalizedTextFromState(state),
});

const wrap = connect(mapStateToProps);

const HIGHLIGHT_COLOR = 'rgba(0, 113, 216, 0.7)';
const HIGHLIGHT_STYLE = 'dashed';
const DISABLE_COLOR = '#ECEFF7';
const DISABLE_STYLE = 'solid';
const SELECT_COLOR = 'rgba(0, 113, 216, 1)';
const SELECT_STYLE = 'solid';
const BOUNDARY_COLOR = 'red';
const BOUNDARY_STYLE = 'solid';

class Overlay extends PureComponent {
  constructor(props, context) {
    super(props, context);
    
    this._container = null;
  }
  
  /**
   *
   * @return {HTMLElement}
   * @private
   */
  _getContainer() {
    const { document } = this.context;
    
    if (this._container) return this._container;
    this._container = document.getElementById(CANVAS_CONTAINER_ID);
    return this._container;
  }
  
  /**
   *
   * @param {number} id
   * @return {?HTMLElement}
   * @private
   */
  _getDOMElementByComponentId(id) {
    const container = this._getContainer();
    return container.querySelector(`[data-jssy-id="${id}"]`) || null;
  }
  
  /**
   *
   * @param {Immutable.List<number>} componentIds
   * @param {string} color
   * @param {string} borderStyle
   * @param {boolean} [showTitle=false]
   * @param {number} [additionalOverlayLevel=0]
   * @param {boolean} [showOverlay=false]
   * @return {Array<ReactElement>}
   * @private
   */
  _renderBoundingBoxes(
    componentIds,
    color,
    borderStyle,
    showTitle = false,
    additionalOverlayLevel = 0,
    showOverlay = false,
  ) {
    const { components } = this.props;
    
    return mapListToArray(componentIds, id => {
      const element = this._getDOMElementByComponentId(id);
      const key = `${id}-${color}`;
      let title = '';
      
      if (showTitle) {
        const component = components.get(id);
        if (component) {
          title = formatComponentTitle(component);
        }
      }

      return (
        <OverlayBoundingBox
          key={key}
          element={element}
          color={color}
          borderStyle={borderStyle}
          title={title}
          showTitle={showTitle}
          showOverlay={showOverlay}
          additionalOverlayLevel={additionalOverlayLevel}
        />
      );
    });
  }

  render() {
    const {
      draggingComponent,
      pickingComponent,
      pickingComponentData,
      highlightingEnabled,
      highlightedComponentIds,
      disabledComponentIds,
      selectedComponentIds,
      boundaryComponentId,
      isCanvasClear,
      getLocalizedText,
    } = this.props;

    const disabledBoxes = disabledComponentIds.isEmpty()
      ? null
      : this._renderBoundingBoxes(
        disabledComponentIds,
        DISABLE_COLOR,
        DISABLE_STYLE,
        false,
        0,
        true,
      );

    const highlightBoxes = highlightingEnabled
      ? this._renderBoundingBoxes(
        highlightedComponentIds,
        HIGHLIGHT_COLOR,
        HIGHLIGHT_STYLE,
        true,
        1,
      )
      : null;

    const selectBoxes = pickingComponent || pickingComponentData
      ? null
      : this._renderBoundingBoxes(
        selectedComponentIds,
        SELECT_COLOR,
        SELECT_STYLE,
        true,
      );
    
    const willRenderBoundaryBox =
      boundaryComponentId !== INVALID_ID && (
        pickingComponent ||
        pickingComponentData ||
        draggingComponent
      );
  
    const rootComponentBox = willRenderBoundaryBox
      ? this._renderBoundingBoxes(
        Set([boundaryComponentId]),
        BOUNDARY_COLOR,
        BOUNDARY_STYLE,
      )
      : null;
    
    let canvasPlaceholder = null;
    if (isCanvasClear && !draggingComponent) {
      canvasPlaceholder = (
        <CanvasPlaceholder
          key="canvas_placeholder"
          text={getLocalizedText('design.canvas.placeholder')}
        />
      );
    }

    return (
      <OverlayContainer>
        {disabledBoxes}
        {highlightBoxes}
        {selectBoxes}
        {rootComponentBox}
        {canvasPlaceholder}
      </OverlayContainer>
    );
  }
}

Overlay.propTypes = propTypes;
Overlay.contextTypes = contextTypes;
Overlay.displayName = 'Overlay';

export default wrap(Overlay);
