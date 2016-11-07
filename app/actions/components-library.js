/**
 * @author Dmitriy Bizyaev
 */

'use strict';

/**
 *
 * @type {string}
 * @const
 */
export const LIBRARY_EXPANDED_GROUPS = 'LIBRARY_EXPANDED_GROUPS';

/**
 *
 * @param {Immutable.Set<string>} groups
 * @return {Object}
 */
export const setExpandedGroups = groups => ({
    type: LIBRARY_EXPANDED_GROUPS,
    groups
});

/**
 *
 * @type {string}
 * @const
 */
export const LIBRARY_SHOW_ALL_COMPONENTS = 'LIBRARY_SHOW_ALL_COMPONENTS';

/**
 *
 * @return {Object}
 */
export const showAllComponents = () => ({
    type: LIBRARY_SHOW_ALL_COMPONENTS
});
