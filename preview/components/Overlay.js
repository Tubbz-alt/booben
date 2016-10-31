'use strict';

//noinspection JSUnresolvedVariable
import React, { Component, PropTypes } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { Set } from 'immutable';
import { connect } from 'react-redux';

/**
 *
 * @type {?HTMLElement}
 */
let container = null;

/**
 *
 * @return {HTMLElement}
 */
const getContainer = () =>
    container || (container = document.getElementById('container'));

class Overlay extends Component {
    /**
     *
     * @param {number} id
     * @return {HTMLElement}
     * @private
     */
    _getDOMElementByComponentId(id) {
        return getContainer().querySelector(`[data-jssy-id="${id}"]`);
    }

    /**
     *
     * @param {number} componentId
     * @param {string} color
     * @param {number} zIndex
     * @return {ReactElement}
     * @private
     */
    _renderBoundingBox(componentId, color, zIndex) {
        const el = this._getDOMElementByComponentId(componentId);
        if (!el) return null;

        let {
            left,
            top,
            width,
            height
        } = el.getBoundingClientRect();

        const syntheticPadding = -2,
            scrollTop = window.pageYOffset;

        width = width + syntheticPadding;
        height = height + syntheticPadding;
        left = Math.round(left - syntheticPadding / 2);
        top = Math.round(top - syntheticPadding / 2 + scrollTop);

        const border = `2px solid ${color}`;

        const style = {
            height: '1px',
            width: '1px',
            position: 'absolute',
            zIndex: String(zIndex),
            left: `${left}px`,
            top: `${top}px`
        };

        const topBorderStyle = {
            height: '0',
            width: `${width}px`,
            left: '0',
            top: '0',
            borderTop: border,
            position: 'absolute',
            opacity: '.5'
        };

        const bottomLeftStyle = {
            height: `${height}px`,
            width: '0',
            left: '0',
            top: '0',
            borderLeft: border,
            position: 'absolute',
            opacity: '.5'
        };

        const bottomBottomStyle = {
            height: '0',
            width: `${width}px`,
            left: '0',
            bottom: `${-height}px`,
            borderBottom: border,
            position: 'absolute',
            opacity: '.5'
        };

        const bottomRightStyle = {
            height: height,
            width: '0',
            right: `${-width}px`,
            top: '0',
            borderRight: border,
            position: 'absolute',
            opacity: '.5'
        };

        const key = `bbox-${componentId}-color`;

        //noinspection JSValidateTypes
        return (
            <div key={key} style={style}>
                <div style={topBorderStyle}></div>
                <div style={bottomLeftStyle}></div>
                <div style={bottomBottomStyle}></div>
                <div style={bottomRightStyle}></div>
            </div>
        );
    }

    /**
     *
     * @param {Immutable.List<number>} componentIds
     * @param {string} color
     * @param {number} [zIndex=1000]
     * @return {Immutable.List<ReactElement>}
     * @private
     */
    _renderBoundingBoxes(componentIds, color, zIndex = 1000) {
        //noinspection JSValidateTypes
        return componentIds.map(id => this._renderBoundingBox(id, color, zIndex));
    }

    render() {
        const overlayStyle = {
            height: '1px',
            width: '1px',
            left: '0',
            top: '0',
            position: 'absolute',
            zIndex: '999',
        };

        const highlightBoxes = this.props.highlightingEnabled
            ? this._renderBoundingBoxes(this.props.highlightedComponentIds, 'yellow')
            : null;

        const selectBoxes =
            this._renderBoundingBoxes(this.props.selectedComponentIds, 'green');

        const rootComponentBox = this.props.boundaryComponentId !== null
            ? this._renderBoundingBoxes(Set([this.props.boundaryComponentId]), 'red')
            : null;

        return (
            <div style={overlayStyle}>
                {highlightBoxes}
                {selectBoxes}
                {rootComponentBox}
            </div>
        );
    }
}

Overlay.propTypes = {
    selectedComponentIds: ImmutablePropTypes.set,
    highlightedComponentIds: ImmutablePropTypes.set,
    boundaryComponentId: PropTypes.any,
    highlightingEnabled: PropTypes.bool
};

const mapStateToProps = state => ({
    selectedComponentIds: state.project.selectedItems,
    highlightedComponentIds: state.project.highlightedItems,
    boundaryComponentId: state.project.boundaryComponentId,
    highlightingEnabled: state.project.highlightingEnabled
});

export default connect(
    mapStateToProps
)(Overlay);
