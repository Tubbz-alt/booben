import PropTypes from 'prop-types';
import { TypeNames } from 'booben-types';

/**
 * @typedef {Object} PropsItemPropTypeOption
 * @property {*} value
 * @property {string} text
 * @property {boolean} disabled
 */

/**
 * @typedef {Object} PropsItemPropType
 * @property {string} label
 * @property {string} secondaryLabel
 * @property {number} view
 * @property {string} image
 * @property {string} tooltip
 * @property {boolean} linkable
 * @property {boolean} pickable
 * @property {boolean} checkable
 * @property {boolean} required
 * @property {PropsItemPropTypeOption[]} [options]
 * @property {Object<string, PropsItemPropType>} [fields]
 * @property {PropsItemPropType} [ofType]
 * @property {Function} [transformValue]
 * @property {Function} [formatItemLabel]
 */

/**
 * @typedef {Object} PropsItemValue
 * @property {*} value
 * @property {boolean} linked
 * @property {string} [linkedWith]
 * @property {boolean} [checked]
 * @property {string} [message]
 * @property {boolean} [requirementFulfilled]
 */

/**
 *
 * @type {Object<string, number>}
 */
export const PropViews = {
  EMPTY: 0,
  INPUT: 1,
  TEXTAREA: 2,
  LIST: 3,
  TOGGLE: 4,
  COMPONENT: 5,
  SHAPE: 6,
  OBJECT: 7,
  ARRAY: 8,
  ACTION: 9,
};

/**
 *
 * @type {Object<string, number>}
 * @const
 */
const BOOBEN_TYPE_TO_VIEW = {
  [TypeNames.STRING]: PropViews.INPUT,
  [TypeNames.BOOL]: PropViews.TOGGLE,
  [TypeNames.INT]: PropViews.INPUT,
  [TypeNames.FLOAT]: PropViews.INPUT,
  [TypeNames.SCALAR]: PropViews.EMPTY,
  [TypeNames.ONE_OF]: PropViews.LIST,
  [TypeNames.COMPONENT]: PropViews.COMPONENT,
  [TypeNames.SHAPE]: PropViews.SHAPE,
  [TypeNames.OBJECT_OF]: PropViews.OBJECT,
  [TypeNames.ARRAY_OF]: PropViews.ARRAY,
  [TypeNames.OBJECT]: PropViews.EMPTY,
  [TypeNames.ARRAY]: PropViews.EMPTY,
  [TypeNames.FUNC]: PropViews.ACTION,
  [TypeNames.ANY]: PropViews.EMPTY,
};

/**
 *
 * @param {string} boobenType
 * @return {number}
 */
export const boobenTypeToView = boobenType =>
  BOOBEN_TYPE_TO_VIEW[boobenType] || PropViews.EMPTY;

export const ValueShape = PropTypes.shape({
  value: PropTypes.any,
  linked: PropTypes.bool,
  linkedWith: PropTypes.string,
  checked: PropTypes.bool,
  message: PropTypes.string,
  requirementFulfilled: PropTypes.bool,
});

const propTypeShapeFields = {
  label: PropTypes.string,
  secondaryLabel: PropTypes.string,
  view: PropTypes.oneOf(Object.keys(PropViews).map(key => PropViews[key])),
  image: PropTypes.string,
  tooltip: PropTypes.string,
  linkable: PropTypes.bool,
  pickable: PropTypes.bool,
  checkable: PropTypes.bool,
  required: PropTypes.bool,
  transformValue: PropTypes.func,

  // For 'object' and 'array' views
  formatItemLabel: PropTypes.func,

  // Options for 'list' view
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.any,
    text: PropTypes.string,
    disabled: PropTypes.bool,
  })),
};

// Fields for 'shape' view
propTypeShapeFields.fields =
  PropTypes.objectOf(PropTypes.shape(propTypeShapeFields));

// Type for 'array' and 'object' views
propTypeShapeFields.ofType = PropTypes.shape(propTypeShapeFields);

export const PropTypeShape = PropTypes.shape(propTypeShapeFields);

/**
 *
 * @type {Set}
 */
const complexViews = new Set([
  PropViews.SHAPE,
  PropViews.OBJECT,
  PropViews.ARRAY,
]);

/**
 *
 * @param {string} view
 * @return {boolean}
 */
export const isComplexView = view => complexViews.has(view);
