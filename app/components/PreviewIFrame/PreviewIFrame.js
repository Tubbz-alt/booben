'use strict';

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import './PreviewIFrame.scss';

const propTypes = {
  url: PropTypes.string.isRequired,
  store: PropTypes.any,
  interactive: PropTypes.bool,
  containerStyle: PropTypes.string,
};

const defaultProps = {
  store: {},
  interactive: false,
  containerStyle: '',
};

const EVENTS_FOR_PARENT_FRAME = [
  'mousemove',
  'mouseup',
  'mousedown',
  'mouseover',
  'mouseout',
  'click',
];

export class PreviewIFrame extends PureComponent {
  constructor(props) {
    super(props);

    this._iframe = null;

    this._saveIFrameRef = this._saveIFrameRef.bind(this);
  }

  componentDidMount() {
    const { store, interactive, containerStyle } = this.props;
  
    const contentWindow = this._iframe.contentWindow;

    // Re-dispatch events from iframe to parent frame
    EVENTS_FOR_PARENT_FRAME.forEach(eventName => {
      contentWindow.addEventListener(eventName, event => {
        const boundingClientRect = this._iframe.getBoundingClientRect();

        //noinspection JSCheckFunctionSignatures
        const evt = new CustomEvent(eventName, {
          bubbles: true,
          cancelable: false,
        });

        evt.clientX = event.clientX + boundingClientRect.left;
        evt.clientY = event.clientY + boundingClientRect.top;
        evt.pageX = event.pageX + boundingClientRect.left;
        evt.pageY = event.pageY + boundingClientRect.top;
        evt.screenX = event.screenX;
        evt.screenY = event.screenY;
        evt._originalTarget = event.target;

        this._iframe.dispatchEvent(evt);
      });
    });

    contentWindow.addEventListener('DOMContentLoaded', () => {
      contentWindow.JSSY.initPreview({ store, interactive, containerStyle });
    });
  }

  componentWillUnmount() {
    this._iframe.contentWindow.JSSY.cleanup();
  }

  _saveIFrameRef(ref) {
    this._iframe = ref;
  }

  render() {
    return (
      <section className="preview-iframe-wrapper">
        <iframe
          ref={this._saveIFrameRef}
          src={this.props.url}
          className="preview-iframe"
        />
      </section>
    );
  }
}

PreviewIFrame.propTypes = propTypes;
PreviewIFrame.defaultProps = defaultProps;
PreviewIFrame.displayName = 'PreviewIFrame';
