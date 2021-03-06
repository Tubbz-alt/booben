import React from 'react';
import PropTypes from 'prop-types';
import _pick from 'lodash.pick';
import { Button } from 'reactackle-button';
import { PropBase } from '../PropBase/PropBase';
import { noop, returnArg } from '../../../utils/misc';
import { ButtonRowStyled } from './styles/ButtonRowStyled';

const propTypes = {
  ...PropBase.propTypes,
  disabled: PropTypes.bool,
  getLocalizedText: PropTypes.func,
  onPickComponent: PropTypes.func,
};

const defaultProps = {
  ...PropBase.defaultProps,
  disabled: false,
  getLocalizedText: returnArg,
  onPickComponent: noop,
};

const baseProps = Object.keys(PropBase.propTypes);

export const PropComponentPicker = props => {
  const { disabled, getLocalizedText, onPickComponent } = props;

  const propsForBase = _pick(props, baseProps);

  return (
    <PropBase
      {...propsForBase}
      content={
        <ButtonRowStyled>
          <Button
            size="small"
            colorScheme="primary"
            text={getLocalizedText('valueEditor.componentPicker.pickComponent')}
            disabled={disabled}
            onPress={onPickComponent}
            outlined
          />
        </ButtonRowStyled>
      }
    />
  );
};

PropComponentPicker.propTypes = propTypes;
PropComponentPicker.defaultProps = defaultProps;
PropComponentPicker.displayName = 'PropComponentPicker';
