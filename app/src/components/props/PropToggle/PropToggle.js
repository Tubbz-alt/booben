import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _pick from 'lodash.pick';
import { ToggleButton } from 'reactackle-toggle-button';
import { PropBase } from '../PropBase/PropBase';
import { noop } from '../../../utils/misc';
import { ToggleBoxStyled } from './styles/ToggleBoxStyled';

const propTypes = {
  ...PropBase.propTypes,
  value: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
};

const defaultProps = {
  ...PropBase.defaultProps,
  value: false,
  disabled: false,
  onChange: noop,
};

const baseProps = Object.keys(PropBase.propTypes);

export class PropToggle extends Component {
  constructor(props, context) {
    super(props, context);
    this._handleChange = this._handleChange.bind(this);
  }
  
  /**
   *
   * @param {boolean} value
   * @private
   */
  _handleChange({ value }) {
    const { onChange } = this.props;
    onChange({ value });
  }

  render() {
    const {
      linked,
      checkable,
      checked,
      value,
      disabled,
      additionalActions,
    } = this.props;

    const propsForBase = _pick(this.props, baseProps);

    let actualAdditionalActions = additionalActions;
    if (!linked && (!checkable || checked)) {
      actualAdditionalActions = [
        <ToggleBoxStyled key="toggle">
          <ToggleButton
            checked={value}
            disabled={disabled}
            onChange={this._handleChange}
          />
        </ToggleBoxStyled>,
        ...additionalActions,
      ];
    }

    return (
      <PropBase
        {...propsForBase}
        additionalActions={actualAdditionalActions}
        content={null}
      />
    );
  }
}

PropToggle.propTypes = propTypes;
PropToggle.defaultProps = defaultProps;
PropToggle.displayName = 'PropToggle';
