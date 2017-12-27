/**
 * @author Dmitriy Bizyaev
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Dialog } from '@reactackle/reactackle';
import { getLocalizedTextFromState } from '../../selectors';
import { getComponentMeta, getString } from '../../lib/meta';

import {
  ComponentLayoutSelection,
  ComponentLayoutSelectionItem,
} from '../../components/ComponentLayoutSelection/ComponentLayoutSelection';

import defaultComponentLayoutIcon from '../../../assets/layout_default.svg';
import * as JssyPropTypes from '../../constants/common-prop-types';

const propTypes = {
  meta: PropTypes.object.isRequired, // state
  selectingComponentLayout: PropTypes.bool.isRequired, // state
  draggedComponents: JssyPropTypes.components, // state
  language: PropTypes.string.isRequired, // state
  getLocalizedText: PropTypes.func.isRequired, // state
};

const defaultProps = {
  draggedComponents: null,
};

const mapStateToProps = state => ({
  meta: state.project.meta,
  selectingComponentLayout: state.project.selectingComponentLayout,
  draggedComponents: state.project.draggedComponents,
  language: state.project.languageForComponentProps,
  getLocalizedText: getLocalizedTextFromState(state),
});

const wrap = connect(mapStateToProps);

class _LayoutSelectionDialog extends PureComponent {
  render() {
    const {
      meta,
      language,
      selectingComponentLayout,
      draggedComponents,
      getLocalizedText,
    } = this.props;

    if (!selectingComponentLayout) {
      return null;
    }

    const draggedComponent = draggedComponents.get(0);
    const draggedComponentMeta = getComponentMeta(draggedComponent.name, meta);

    const items = draggedComponentMeta.layouts.map((layout, idx) => {
      const icon = layout.icon || defaultComponentLayoutIcon;
      const title = getString(
        draggedComponentMeta.strings,
        layout.textKey,
        language,
      );

      const subtitle = getString(
        draggedComponentMeta.strings,
        layout.descriptionTextKey,
        language,
      );

      return (
        <ComponentLayoutSelectionItem
          key={String(idx)}
          layoutIdx={idx}
          image={icon}
          title={title}
          subtitle={subtitle}
          onSelect={this._handleLayoutSelection}
        />
      );
    });

    return (
      <Dialog
        title={getLocalizedText('design.selectLayout')}
        backdrop
        minWidth={400}
        open={selectingComponentLayout}
      >
        <ComponentLayoutSelection>
          {items}
        </ComponentLayoutSelection>
      </Dialog>
    );
  }
}

_LayoutSelectionDialog.propTypes = propTypes;
_LayoutSelectionDialog.defaultProps = defaultProps;
_LayoutSelectionDialog.displayName = 'LayoutSelectionDialog';

export const LayoutSelectionDialog = wrap(_LayoutSelectionDialog);