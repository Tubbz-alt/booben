/**
 * @author Dmitriy Bizyaev
 */

'use strict';

import React from 'react';
import patchComponent from '../hocs/patchComponent';

const style = {
  width: 'calc(100% - 48px)',
  margin: '24px',
  minHeight: '200px',
  backgroundColor: '#ebf3fa',
  borderRadius: '2px',
  boxSizing: 'border-box',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '40px',
  outline: '2px solid white',
  outlineOffset: '-16px',
};

const outletContentStyle = {
  maxWidth: '20em',
  fontSize: '24px',
  lineHeight: '1.5',
  color: '#BAC0CB',
  textAlign: 'center',
  margin: 'auto',
};

const _Outlet = () => (
  <div style={style}>
    <div style={outletContentStyle}>
      Outlet
    </div>
  </div>
);

_Outlet.displayName = 'Outlet';

export const Outlet = patchComponent(_Outlet);