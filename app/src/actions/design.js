/**
 * @author Dmitriy Bizyaev
 */

export const DESIGN_TREE_EXPAND_ITEM =
  'DESIGN_TREE_EXPAND_ITEM';
export const DESIGN_TREE_COLLAPSE_ITEM =
  'DESIGN_TREE_COLLAPSE_ITEM';

export const expandTreeItem = componentId => ({
  type: DESIGN_TREE_EXPAND_ITEM,
  componentId,
});

export const collapseTreeItem = componentId => ({
  type: DESIGN_TREE_COLLAPSE_ITEM,
  componentId,
});
