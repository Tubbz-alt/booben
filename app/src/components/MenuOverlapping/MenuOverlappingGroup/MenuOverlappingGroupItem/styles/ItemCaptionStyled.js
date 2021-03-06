import styled from 'styled-components';

import {
  baseModule,
  fontSizeXSmall,
  textColorMedium,
} from '../../../../../styles/themeSelectors';

const disabled = ({ disabled }) => disabled ? 'opacity: 0.75;' : '';

export const ItemCaptionStyled = styled.div`
  font-size: ${fontSizeXSmall}px;
  color: ${textColorMedium};
  line-height: 1.15;
  margin-right: 0.3em;
  margin-bottom: ${baseModule(0.25)}px;
  word-break: break-all;
  ${disabled}
`;

ItemCaptionStyled.displayName = 'ItemCaptionStyled';
